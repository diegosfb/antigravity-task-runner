import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec, spawn } from "child_process";
import { AntigravityViewProvider } from "./treeProvider";
import {
  isAutocommitRunning,
  hasGitHubRemote
} from "./git";
import {
  runInSecondaryTerminal,
  runInNewTerminal,
  runClaudeInitAndUpdateInNewTerminal,
  runCodexInitAndUpdateInNewTerminal,
  CLAUDE_ACTION_COLOR
} from "./terminal";
import {
  renderAntigravitySettingsHtml,
  renderClaudeModelConfigHtml,
  renderAgenticSetupHtml,
  loadOpenRouterConfig,
  loadClaudeSettings,
  getRouterSettings,
  getToolRunCommand,
  normalizeStringArray,
  readClaudeAnthropicBaseUrl,
  isLocalLiteLLMBaseUrl,
  LOCAL_LITELLM_READY_URL
} from "./settings";
import { runRepoScript, runWorkflow, runAgent, openFile, ensureScriptFile, downloadConfigFileIfMissing, downloadInfrastructureFileIfMissing } from "./scripts";
import {
  getRootPath,
  getRepoRoot,
  getWorkspaceProjectPath,
  listInfrastructureYamlFiles,
  findNestedGitFolders,
  quoteShellArg,
  waitForUrlReady
} from "./utils";
import { initLogger, log, logAlways, showOutputChannel } from "./logger";

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Antigravity Task Runner");
  context.subscriptions.push(outputChannel);
  initLogger(outputChannel);

  const provider = new AntigravityViewProvider();
  const extensionRoot = context.extensionPath;
  log(`[activate] Extension root: ${extensionRoot}`);

  const launchClaudeInit = async (repoRoot: string): Promise<void> => {
    log(`[launchClaudeInit] repoRoot: ${repoRoot}`);
    const guidelineCandidates = [
      path.join(extensionRoot, "Project Level CLAUDE.md Guidelines.txt")
    ];
    const guidelinesFile = guidelineCandidates.find((candidate) => fs.existsSync(candidate));
    log(`[launchClaudeInit] guidelinesFile: ${guidelinesFile ?? "not found, using /init"}`);
    const prompt = guidelinesFile
      ? fs.readFileSync(guidelinesFile, "utf8").trim()
      : "/init";
    log(`[launchClaudeInit] launching Claude init terminal`);
    await runClaudeInitAndUpdateInNewTerminal(repoRoot, prompt);
    log(`[launchClaudeInit] done`);
  };

  const launchAgentInit = async (repoRoot: string): Promise<void> => {
    log(`[launchAgentInit] repoRoot: ${repoRoot}`);
    const guidelinesFile = path.join(
      extensionRoot,
      "Project Level AGENT.md Guidelines.txt"
    );
    log(`[launchAgentInit] guidelinesFile: ${guidelinesFile} exists=${fs.existsSync(guidelinesFile)}`);
    const prompt = fs.existsSync(guidelinesFile)
      ? fs.readFileSync(guidelinesFile, "utf8").trim()
      : "/init";
    log(`[launchAgentInit] launching Codex init terminal`);
    await runCodexInitAndUpdateInNewTerminal(repoRoot, prompt);
    log(`[launchAgentInit] done`);
  };

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("antigravityView", provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.openSettings", async () => {
      const panel = vscode.window.createWebviewPanel(
        "antigravitySettings",
        "Antigravity Settings",
        vscode.ViewColumn.Active,
        { enableScripts: true }
      );
      panel.webview.html = renderAntigravitySettingsHtml(panel.webview);
      panel.webview.onDidReceiveMessage(
        async (message) => {
          if (!message || message.type !== "applySettings") return;
          const payload = message.payload || {};
          const values = payload.values || {};
          const target =
            payload.target === "workspace" && vscode.workspace.workspaceFolders
              ? vscode.ConfigurationTarget.Workspace
              : vscode.ConfigurationTarget.Global;
          const config = vscode.workspace.getConfiguration("antigravity");
          for (const [key, rawValue] of Object.entries(values)) {
            if (typeof rawValue === "boolean") {
              await config.update(key, rawValue, target);
              continue;
            }
            const normalized = typeof rawValue === "string" ? rawValue.trim() : "";
            if (normalized === "") {
              await config.update(key, undefined, target);
            } else {
              await config.update(key, normalized, target);
            }
          }
          provider.refresh();
          void vscode.window.showInformationMessage("Antigravity settings updated.");
        },
        undefined,
        context.subscriptions
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.runClaudeAgent", async (agentName: string) => {
      log(`[runClaudeAgent] agentName: ${agentName}`);
      if (!agentName) {
        log(`[runClaudeAgent] ERROR: agent name missing`);
        void vscode.window.showErrorMessage("Agent name is missing.");
        return;
      }
      const rootPath = getRootPath();
      const repoRoot = rootPath ? getRepoRoot(rootPath) : process.cwd();
      log(`[runClaudeAgent] repoRoot: ${repoRoot}`);
      runInNewTerminal(`Agent: ${agentName}`, [
        `cd ${quoteShellArg(repoRoot)}`,
        `claude --agent ${quoteShellArg(agentName)}`
      ], {
        iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
        color: CLAUDE_ACTION_COLOR
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "antigravity.runAgent",
      async (agentName: string, filePath: string) => {
        log(`[runAgent] agentName: ${agentName}, filePath: ${filePath}`);
        if (!agentName) {
          log(`[runAgent] ERROR: agent name missing`);
          void vscode.window.showErrorMessage("Agent name is missing.");
          return;
        }
        if (!filePath || !fs.existsSync(filePath)) {
          log(`[runAgent] ERROR: agent file not found: ${filePath}`);
          void vscode.window.showErrorMessage("Agent file not found.");
          return;
        }
        log(`[runAgent] running agent`);
        await runAgent(agentName, filePath);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.openAgent", async (filePath: string) => {
      if (!filePath || !fs.existsSync(filePath)) {
        void vscode.window.showErrorMessage("Agent file not found.");
        return;
      }
      await openFile(filePath);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.copyPath", async (item: { filePath?: string }) => {
      const filePath = item?.filePath;
      if (!filePath) {
        void vscode.window.showErrorMessage("No path available.");
        return;
      }
      await vscode.env.clipboard.writeText(filePath);
      void vscode.window.showInformationMessage(`Copied: ${filePath}`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.openPath", async (item: { filePath?: string }) => {
      const filePath = item?.filePath;
      if (!filePath || !fs.existsSync(filePath)) {
        void vscode.window.showErrorMessage("Path not found.");
        return;
      }
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        await vscode.env.openExternal(vscode.Uri.file(filePath));
      } else {
        await openFile(filePath);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.addToProject", async (item: { filePath?: string }) => {
      const filePath = item?.filePath;
      if (!filePath || !fs.existsSync(filePath)) {
        void vscode.window.showErrorMessage("Path not found.");
        return;
      }
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const projectRoot = getRepoRoot(rootPath);
      const linkName = path.basename(filePath);
      const linkPath = path.join(projectRoot, linkName);
      let linkExists = false;
      try {
        fs.lstatSync(linkPath); // succeeds for regular files and symlinks (including broken)
        linkExists = true;
      } catch {
        // path doesn't exist at all
      }
      if (linkExists) {
        void vscode.window.showErrorMessage(`"${linkName}" already exists in the project root.`);
        return;
      }
      try {
        fs.symlinkSync(filePath, linkPath);
        void vscode.window.showInformationMessage(`Symlink created: ${linkName} → ${filePath}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to create symlink: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.addToAgent", async (item: { filePath?: string }) => {
      const filePath = item?.filePath;
      if (!filePath || !fs.existsSync(filePath)) {
        void vscode.window.showErrorMessage("Path not found.");
        return;
      }
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const projectRoot = getRepoRoot(rootPath);
      const agentDir = path.join(projectRoot, ".agent");
      if (!fs.existsSync(agentDir)) {
        fs.mkdirSync(agentDir, { recursive: true });
      }
      const linkName = path.basename(filePath);
      const linkPath = path.join(agentDir, linkName);
      let linkExists = false;
      try {
        fs.lstatSync(linkPath);
        linkExists = true;
      } catch {
        // path doesn't exist at all
      }
      if (linkExists) {
        void vscode.window.showErrorMessage(`"${linkName}" already exists in .agent.`);
        return;
      }
      try {
        fs.symlinkSync(filePath, linkPath);
        void vscode.window.showInformationMessage(`Symlink created: .agent/${linkName} → ${filePath}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to create symlink: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.addToCustomSkills", async (item: { filePath?: string }) => {
      const filePath = item?.filePath;
      if (!filePath || !fs.existsSync(filePath)) {
        void vscode.window.showErrorMessage("Path not found.");
        return;
      }
      // If item is a SKILL.md file, symlink its parent folder; if it's a folder, symlink it directly
      const stat = fs.statSync(filePath);
      const skillSource = stat.isDirectory() ? filePath : path.dirname(filePath);
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const projectRoot = getRepoRoot(rootPath);
      const skillsDir = path.join(projectRoot, ".agent", "skills");
      if (!fs.existsSync(skillsDir)) {
        fs.mkdirSync(skillsDir, { recursive: true });
      }
      const linkName = path.basename(skillSource);
      const linkPath = path.join(skillsDir, linkName);
      let linkExists = false;
      try {
        fs.lstatSync(linkPath);
        linkExists = true;
      } catch {
        // path doesn't exist at all
      }
      if (linkExists) {
        void vscode.window.showErrorMessage(`"${linkName}" already exists in .agent/skills.`);
        return;
      }
      try {
        fs.symlinkSync(skillSource, linkPath);
        void vscode.window.showInformationMessage(`Symlink created: .agent/skills/${linkName} → ${skillSource}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to create symlink: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.addToCustomAgents", async (item: { filePath?: string }) => {
      const filePath = item?.filePath;
      if (!filePath || !fs.existsSync(filePath)) {
        void vscode.window.showErrorMessage("Path not found.");
        return;
      }
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const projectRoot = getRepoRoot(rootPath);
      const agentsDir = path.join(projectRoot, ".agent", "agents");
      if (!fs.existsSync(agentsDir)) {
        fs.mkdirSync(agentsDir, { recursive: true });
      }
      // If the selected item is an AGENT.md file, symlink its parent folder instead.
      const stat = fs.statSync(filePath);
      const agentSource = (!stat.isDirectory() && path.basename(filePath) === "AGENT.md")
        ? path.dirname(filePath)
        : filePath;
      const linkName = path.basename(agentSource);
      const linkPath = path.join(agentsDir, linkName);
      let linkExists = false;
      try {
        fs.lstatSync(linkPath);
        linkExists = true;
      } catch {
        // path doesn't exist at all
      }
      if (linkExists) {
        void vscode.window.showErrorMessage(`"${linkName}" already exists in .agent/agents.`);
        return;
      }
      try {
        fs.symlinkSync(agentSource, linkPath);
        void vscode.window.showInformationMessage(`Symlink created: .agent/agents/${linkName} → ${agentSource}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to create symlink: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.enablePlugin", async (item: { filePath?: string }) => {
      const pluginName = item?.filePath;
      if (!pluginName) return;
      await runInSecondaryTerminal([`claude plugin enable ${quoteShellArg(pluginName)}`]);
      setTimeout(() => provider.refresh(), 1500);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.disablePlugin", async (item: { filePath?: string }) => {
      const pluginName = item?.filePath;
      if (!pluginName) return;
      await runInSecondaryTerminal([`claude plugin disable ${quoteShellArg(pluginName)}`]);
      setTimeout(() => provider.refresh(), 1500);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.runWorkflow", async (filePath: string) => {
      log(`[runWorkflow] filePath: ${filePath}`);
      if (!filePath || !fs.existsSync(filePath)) {
        log(`[runWorkflow] ERROR: workflow file not found: ${filePath}`);
        void vscode.window.showErrorMessage("Workflow file not found.");
        return;
      }
      log(`[runWorkflow] running workflow`);
      await runWorkflow(filePath);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.openClaudeTerminal", async () => {
      log(`[openClaudeTerminal] triggered`);
      try {
        const rootPath = getRootPath();
        if (!rootPath) {
          log(`[openClaudeTerminal] ERROR: rootPath not set`);
          void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
          return;
        }
        const repoRoot = getRepoRoot(rootPath);
        log(`[openClaudeTerminal] repoRoot: ${repoRoot}`);
        const baseUrl = await readClaudeAnthropicBaseUrl(repoRoot);
        if (isLocalLiteLLMBaseUrl(baseUrl)) {
          await vscode.commands.executeCommand("antigravity.runLiteLLMOpenAI");
          const ready = await waitForUrlReady(LOCAL_LITELLM_READY_URL);
          if (!ready) {
            void vscode.window.showErrorMessage(
              `liteLLM did not become ready at ${LOCAL_LITELLM_READY_URL}.`
            );
            return;
          }
        }
        runInNewTerminal("Claude", [`cd ${quoteShellArg(repoRoot)}`, "claude"], {
          iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
          color: CLAUDE_ACTION_COLOR
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Claude Terminal failed: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.openOllamaClaudeTerminal", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
      runInNewTerminal("Ollama Claude", [`cd ${quoteShellArg(repoRoot)}`, "ollama launch claude"], {
        iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
        color: CLAUDE_ACTION_COLOR
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.openOpenClaudeTerminal", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
      runInNewTerminal("OpenClaude", [`cd ${quoteShellArg(repoRoot)}`, "openclaude"], {
        iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
        color: CLAUDE_ACTION_COLOR
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.setClaudeModel", async () => {
      const routerConfigPath = path.join(os.homedir(), ".claude", "routerconfig.json");
      if (!fs.existsSync(routerConfigPath)) {
        const rootPath = getRootPath();
        const repoRoot = rootPath ? getRepoRoot(rootPath) : undefined;
        const repTemplatePath = repoRoot ? path.join(repoRoot, "routerconfig.example.json") : undefined;
        const templatePath = (repTemplatePath && fs.existsSync(repTemplatePath))
          ? repTemplatePath
          : path.join(extensionRoot, "routerconfig.example.json");
        if (fs.existsSync(templatePath)) {
          fs.mkdirSync(path.dirname(routerConfigPath), { recursive: true });
          fs.copyFileSync(templatePath, routerConfigPath);
          await vscode.window.showTextDocument(vscode.Uri.file(routerConfigPath));
        } else {
          void vscode.window.showErrorMessage(
            "Could not create ~/.claude/routerconfig.json: template routerconfig.example.json not found."
          );
        }
        return;
      }

      const config = await loadOpenRouterConfig();
      if (!config) return;

      const routers = normalizeStringArray(config.routers);
      if (routers.length === 0) {
        void vscode.window.showErrorMessage("routerconfig.json is missing a routers array.");
        return;
      }

      const panel = vscode.window.createWebviewPanel(
        "antigravitySetClaudeModel",
        "Set Claude Model",
        vscode.ViewColumn.Active,
        { enableScripts: true }
      );
      const claudeSettings = await loadClaudeSettings();
      panel.webview.html = renderClaudeModelConfigHtml(panel.webview, config, claudeSettings);
      panel.webview.onDidReceiveMessage(
        async (message) => {
          if (!message || message.type !== "applyClaudeModel") return;
          const { router, model, effortLevel, internalBehaviour } = message.payload || {};
          if (
            typeof router !== "string" ||
            typeof model !== "string" ||
            typeof effortLevel !== "string" ||
            typeof internalBehaviour !== "string"
          ) {
            void vscode.window.showErrorMessage("Invalid Claude model selection.");
            return;
          }

          const baseSettings = getRouterSettings(config, router);
          if (!baseSettings) {
            void vscode.window.showErrorMessage(
              `routerconfig.json is missing ${router}-settings configuration.`
            );
            return;
          }
          const settings = baseSettings;
          const missingKeys: string[] = [];
          const mandatory = new Set(
            (settings.mandatory_params || []).map((value) => value.trim())
          );
          if (mandatory.has("api_key") && !settings.apikey) missingKeys.push("api_key");
          if (mandatory.has("auth_token") && !settings.auth_token)
            missingKeys.push("auth_token");
          if (missingKeys.length > 0) {
            void vscode.window.showErrorMessage(
              `Missing ${missingKeys.join(", ")} for ${router}. ` +
              "Set it in ~/.claude/routerconfig.json."
            );
            return;
          }

          const rootPath = getRootPath();
          if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
          }
          const repoRoot = getRepoRoot(rootPath);
          const command =
            quoteShellArg(path.join(extensionRoot, "src", "Switch-ClaudeCode-Model.sh")) +
            ` --model ${quoteShellArg(model)}` +
            ` --baseurl ${quoteShellArg(settings.baseurl)}` +
            ` --auth-token ${quoteShellArg(settings.auth_token)}` +
            ` --api-key ${quoteShellArg(settings.apikey)}` +
            ` --effort-level ${quoteShellArg(effortLevel)}` +
            ` --internal-model ${quoteShellArg(internalBehaviour)}`;
          const commands = [`cd ${quoteShellArg(repoRoot)}`, command];
          const postRun = settings.post_run?.trim();
          const toolRunCommand = postRun ? getToolRunCommand(config, postRun) : undefined;
          if (postRun && !toolRunCommand) {
            commands.push(`nohup sh -c ${quoteShellArg(postRun)} >/dev/null 2>&1 &`);
          }
          await runInSecondaryTerminal(commands);
          if (toolRunCommand) {
            await runInSecondaryTerminal([`cd ${quoteShellArg(repoRoot)}`, toolRunCommand]);
          }
          panel.dispose();
        },
        undefined,
        context.subscriptions
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.workspaceSetup", async () => {
      showOutputChannel();
      logAlways("[Workspace Setup] Command triggered");
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        logAlways("[Workspace Setup] ERROR: No workspace folder is open");
        void vscode.window.showErrorMessage("No workspace folder is open.");
        return;
      }
      logAlways(`[Workspace Setup] workspaceRoot: ${workspaceRoot}`);
      const repoRoot = workspaceRoot;
      const workspaceDir = getWorkspaceProjectPath(repoRoot);
      logAlways(`[Workspace Setup] workspaceDir: ${workspaceDir}`);
      if (!fs.existsSync(workspaceDir)) {
        logAlways(`[Workspace Setup] workspaceDir does not exist, creating: ${workspaceDir}`);
        fs.mkdirSync(path.join(workspaceDir, "scripts"), { recursive: true });
      }
      const scriptPath = path.join(extensionRoot, "src", "workspace-setup.sh");
      logAlways(`[Workspace Setup] scriptPath: ${scriptPath}`);
      if (!fs.existsSync(scriptPath)) {
        logAlways(`[Workspace Setup] ERROR: workspace-setup.sh not found at: ${scriptPath}`);
        void vscode.window.showErrorMessage(`workspace-setup.sh not found in extension at: ${scriptPath}`);
        return;
      }
      logAlways(`[Workspace Setup] workspace-setup.sh found, making executable`);
      await fs.promises.chmod(scriptPath, 0o755).catch((e) => logAlways(`[Workspace Setup] chmod failed: ${e}`));

      logAlways(`[Workspace Setup] running workspace-setup.sh in: ${workspaceDir}`);
      const exitCode = await new Promise<number>((resolve) => {
        const proc = spawn(scriptPath, ["--force"], { cwd: workspaceDir, shell: false });
        proc.stdout.on("data", (data: Buffer) => {
          for (const line of data.toString().split("\n")) {
            if (line.trim()) logAlways(`[workspace-setup.sh] ${line}`);
          }
        });
        proc.stderr.on("data", (data: Buffer) => {
          for (const line of data.toString().split("\n")) {
            if (line.trim()) logAlways(`[workspace-setup.sh STDERR] ${line}`);
          }
        });
        proc.on("close", (code) => resolve(code ?? 1));
        proc.on("error", (err) => {
          logAlways(`[Workspace Setup] spawn error: ${err.message}`);
          resolve(1);
        });
      });
      logAlways(`[Workspace Setup] workspace-setup.sh exited with code: ${exitCode}`);

      if (exitCode !== 0) {
        void vscode.window.showErrorMessage(`workspace-setup.sh failed (exit ${exitCode}). Check the Antigravity Task Runner output panel.`);
        return;
      }

      logAlways(`[Workspace Setup] launching AGENTS.md init`);
      await launchAgentInit(repoRoot);
      // await launchClaudeInit(repoRoot);
      logAlways(`[Workspace Setup] AGENTS.md init launched`);
      logAlways(`[Workspace Setup] Done`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.initRepository", async () => {
      log(`[initRepository] triggered`);
      const rootPath = getRootPath();
      if (!rootPath) {
        log(`[initRepository] ERROR: rootPath not set`);
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
      log(`[initRepository] repoRoot: ${repoRoot}`);
      if (fs.existsSync(path.join(repoRoot, ".git"))) {
        void vscode.window.showWarningMessage(
          "A Git repository already exists in this project."
        );
        return;
      }
      const repoName = await vscode.window.showInputBox({
        title: "Init Repository",
        prompt: "Enter the repository name",
        placeHolder: "my-repository"
      });
      if (!repoName || repoName.trim() === "") return;
      const nestedGitFolders = findNestedGitFolders(repoRoot);
      if (nestedGitFolders.length > 0) {
        const relPaths = nestedGitFolders.map((p) => path.relative(repoRoot, p));
        const selection = await vscode.window.showWarningMessage(
          `Found ${nestedGitFolders.length} nested .git folder(s):\n${relPaths.join(", ")}\n\nRemove them and absorb into one repo?`,
          { modal: true },
          "Yes",
          "No"
        );
        if (selection !== "Yes") return;
        for (const gitDir of nestedGitFolders) {
          fs.rmSync(gitDir, { recursive: true, force: true });
        }
      }
      await runRepoScript("init-repo", [repoName.trim()], { scriptDir: path.join(extensionRoot, "src") });
      provider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.buildVersion", async () => {
      await runRepoScript("build-version");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.runLiteLLMOpenAI", async () => {
      const config = await loadOpenRouterConfig();
      if (!config) return;
      const command = getToolRunCommand(config, "litellm-openai");
      if (!command) {
        void vscode.window.showErrorMessage(
          'routerconfig.json is missing "tool-run.litellm-openai".'
        );
        return;
      }
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
      await runInSecondaryTerminal([`cd ${quoteShellArg(repoRoot)}`, command]);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.createClaudeMd", async () => {
      log(`[createClaudeMd] triggered`);
      try {
        const rootPath = getRootPath();
        if (!rootPath) {
          log(`[createClaudeMd] ERROR: rootPath not set`);
          void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
          return;
        }
        const repoRoot = getRepoRoot(rootPath);
        log(`[createClaudeMd] repoRoot: ${repoRoot}`);
        await launchClaudeInit(repoRoot);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log(`[createClaudeMd] ERROR: ${message}`);
        void vscode.window.showErrorMessage(`Create CLAUDE.md failed: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.createAgentMd", async () => {
      log(`[createAgentMd] triggered`);
      try {
        const rootPath = getRootPath();
        if (!rootPath) {
          log(`[createAgentMd] ERROR: rootPath not set`);
          void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
          return;
        }
        const repoRoot = getRepoRoot(rootPath);
        log(`[createAgentMd] repoRoot: ${repoRoot}`);
        await launchAgentInit(repoRoot);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log(`[createAgentMd] ERROR: ${message}`);
        void vscode.window.showErrorMessage(`Create AGENTS.md failed: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.createRepository", async () => {
      await runRepoScript("create-repo");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.createInfrastructure", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }

      const repoRoot = getRepoRoot(rootPath);
      const infraFiles = await listInfrastructureYamlFiles(repoRoot);
      if (infraFiles.length === 0) {
        void vscode.window.showErrorMessage(
          `No infrastructure YAML files found under ${path.join(repoRoot, "config", "Infrastructure")}.`
        );
        return;
      }

      const selection = await vscode.window.showQuickPick(
        infraFiles.map((filePath) => {
          const relativePath = path.relative(repoRoot, filePath);
          return { label: relativePath, value: relativePath };
        }),
        {
          title: "Create Infrastructure",
          placeHolder: "Select infra yaml path"
        }
      );

      if (!selection) return;

      await runRepoScript("create-infra", [selection.value], { cwd: repoRoot });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.deploy", async () => {
      await runRepoScript("deploy");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.incrementMajorVersion", async () => {
      await runRepoScript("bump-version", ["major"]);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.incrementMinorVersion", async () => {
      await runRepoScript("bump-version", ["minor"]);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.incrementPatchVersion", async () => {
      await runRepoScript("bump-version", ["patch"]);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.createRepoTagVersion", async () => {
      log(`[createRepoTagVersion] triggered`);
      const description = await vscode.window.showInputBox({
        title: "Create Repo Tag Version",
        prompt: "Add a tag description (optional)"
      });
      if (description === undefined) return;
      const trimmed = description.trim();
      log(`[createRepoTagVersion] description: "${trimmed}"`);
      await runRepoScript("commit-push-tag", trimmed ? [trimmed] : [], { scriptDir: path.join(extensionRoot, "src") });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.createRepoTag", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
      const tagName = await vscode.window.showInputBox({
        title: "Create Repo Tag",
        prompt: "Tag name (e.g. v1.0.0)"
      });
      if (!tagName?.trim()) return;
      const tag = tagName.trim();
      const message = await vscode.window.showInputBox({
        title: "Create Repo Tag",
        prompt: "Tag message (optional)"
      });
      if (message === undefined) return;
      const msg = message.trim() || tag;
      runInNewTerminal("Antigravity", [
        `cd ${quoteShellArg(repoRoot)}`,
        `git tag -a ${quoteShellArg(tag)} -m ${quoteShellArg(msg)} && git push origin ${quoteShellArg(tag)} && echo "[antigravity] tag ${tag} pushed"`,
      ]);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.autocommitCheckpoint", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }

      const repoRoot = getRepoRoot(rootPath);
      const action = isAutocommitRunning(repoRoot) ? "stop" : "start";
      if (action === "start") {
        const hasGithub = await hasGitHubRemote(repoRoot);
        if (!hasGithub) {
          void vscode.window.showErrorMessage(
            "No GitHub remote found for this project. Set up a GitHub repository before starting autocommit."
          );
          return;
        }
      }
      // Ensure both autocommit scripts are present, using bundled src/ versions.
      const srcDir = path.join(extensionRoot, "src");
      const scriptPath = await ensureScriptFile(repoRoot, "autocommit_changes.sh", srcDir);
      if (!scriptPath) return;
      await ensureScriptFile(repoRoot, "autocommit_revert.sh", srcDir);
      await runInSecondaryTerminal([
        `cd ${quoteShellArg(repoRoot)}`,
        `${quoteShellArg(scriptPath)} ${action}`
      ]);
      provider.refresh();
      setTimeout(() => {
        provider.refresh();
      }, 1000);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.autocommitRevert", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
      const scriptPath = await ensureScriptFile(repoRoot, "autocommit_revert.sh", path.join(extensionRoot, "src"));
      if (!scriptPath) return;
      await runInSecondaryTerminal([
        `cd ${quoteShellArg(repoRoot)}`,
        `${quoteShellArg(scriptPath)}`
      ]);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.switchEnvironment", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
      const workspaceDir = getWorkspaceProjectPath(repoRoot);

      const selection = await vscode.window.showQuickPick(
        [
          { label: "DEV", value: "DEV" },
          { label: "QA", value: "QA" },
          { label: "UAT", value: "UAT" },
          { label: "PROD", value: "PROD" }
        ],
        {
          title: "Switch Environment",
          placeHolder: "Select target environment"
        }
      );
      if (!selection) return;

      // Ensure switch-env.sh is present, downloading from Script Fallback Base URL if missing.
      const scriptPath = await ensureScriptFile(repoRoot, "switch-env.sh", path.join(workspaceDir, "scripts"));
      if (!scriptPath) return;

      // Offer to download missing config files from Config Fallback Base URL.
      // Files live in workspace/config/ so pass workspaceDir as the root.
      const settingsFileName = `${selection.value.toLowerCase()}-settings.yaml`;
      await downloadConfigFileIfMissing(workspaceDir, settingsFileName);
      await downloadInfrastructureFileIfMissing(workspaceDir, settingsFileName);
      await downloadConfigFileIfMissing(workspaceDir, ".env");

      await runInSecondaryTerminal([
        `cd ${quoteShellArg(workspaceDir)}`,
        `${quoteShellArg(scriptPath)} ${quoteShellArg(selection.value)}`
      ]);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.updateAgenticWorkspace", async () => {
      const rawWorkspaceProjectDir = vscode.workspace.getConfiguration("antigravity").get<string>("antigravityWorkspaceProject") || "~/antigravity-workspace";
      const workspaceProjectDir = rawWorkspaceProjectDir.replace(/^~/, os.homedir());
      await runRepoScript("update-agentic-workspace", [workspaceProjectDir], { scriptDir: path.join(extensionRoot, "src") });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.updateAgenticSetup", async () => {
      const config = vscode.workspace.getConfiguration("antigravity");
      const initialValues = {
        claudeGithub: config.get<string>("claudeSetupGithub") || "",
        geminiGithub: config.get<string>("geminiSetupGithub") || "",
        codexGithub: config.get<string>("codexSetupGithub") || ""
      };
      const panel = vscode.window.createWebviewPanel(
        "antigravityAgenticSetup",
        "Update Agentic Setup",
        vscode.ViewColumn.Active,
        { enableScripts: true }
      );
      panel.webview.html = renderAgenticSetupHtml(panel.webview, initialValues);
      panel.webview.onDidReceiveMessage(
        async (message) => {
          try {
            await runInSecondaryTerminal([`echo "[antigravity] message received: ${JSON.stringify(message)}"`]);
            if (!message || message.type !== "agenticSetupUpdate") {
              await runInSecondaryTerminal([`echo "[antigravity] ignored message type: ${message?.type}"`]);
              return;
            }
            const { tool, url, all } = message as { tool: string; url: string; all: Record<string, string> };
            await runInSecondaryTerminal([`echo "[antigravity] update triggered: tool=${tool} url=${url}"`]);
            // Save all three values every time any Update is clicked
            if (all.claudeGithub) await config.update("claudeSetupGithub", all.claudeGithub, vscode.ConfigurationTarget.Global);
            if (all.geminiGithub) await config.update("geminiSetupGithub", all.geminiGithub, vscode.ConfigurationTarget.Global);
            if (all.codexGithub) await config.update("codexSetupGithub", all.codexGithub, vscode.ConfigurationTarget.Global);
            await runInSecondaryTerminal([`echo "[antigravity] config saved, running script..."`]);
            await runRepoScript("update-agent-setup", url ? [tool, url] : [tool], { scriptDir: path.join(extensionRoot, "src") });
          } catch (err) {
            await runInSecondaryTerminal([`echo "[antigravity] ERROR: ${String(err)}"`]);
          }
        },
        undefined,
        context.subscriptions
      );
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.backupCompress", async (uri: vscode.Uri) => {
      const targetPath = uri?.fsPath;
      if (!targetPath) {
        void vscode.window.showErrorMessage("No file or folder selected.");
        return;
      }
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const dir = path.dirname(targetPath);
      const base = path.basename(targetPath);
      const zipName = `${base} [${timestamp}].zip`;
      const zipPath = path.join(dir, zipName);
      const isDir = fs.statSync(targetPath).isDirectory();
      const flag = isDir ? "-r" : "";
      const cmd = `zip ${flag} ${quoteShellArg(zipPath)} ${quoteShellArg(base)}`.trim();
      exec(cmd, { cwd: dir }, (error) => {
        if (error) {
          void vscode.window.showErrorMessage(`Backup-Compress failed: ${error.message}`);
        } else {
          void vscode.window.showInformationMessage(`Backup created: ${zipName}`);
        }
      });
    })
  );
}

export function deactivate() { }
