import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { AntigravityViewProvider } from "./treeProvider";
import {
  appendAutocommitLogLine,
  isAutocommitRunning,
  hasGitHubRemote
} from "./git";
import {
  runInSecondaryTerminal,
  runInNewTerminal,
  runClaudeInitAndUpdateInNewTerminal,
  CLAUDE_ACTION_COLOR
} from "./terminal";
import {
  renderAntigravitySettingsHtml,
  renderClaudeModelConfigHtml,
  loadOpenRouterConfig,
  loadClaudeSettings,
  getRouterSettings,
  getToolRunCommand,
  normalizeStringArray,
  readClaudeAnthropicBaseUrl,
  isLocalLiteLLMBaseUrl,
  LOCAL_LITELLM_READY_URL
} from "./settings";
import { runRepoScript, runWorkflow, runAgent, openFile, ensureScriptFile } from "./scripts";
import {
  getRootPath,
  getRepoRoot,
  listInfrastructureYamlFiles,
  quoteShellArg,
  waitForUrlReady
} from "./utils";

export function activate(context: vscode.ExtensionContext) {
  const provider = new AntigravityViewProvider();
  const extensionRoot = context.extensionPath;

  void appendAutocommitLogLine("Extension loaded");

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
    vscode.commands.registerCommand(
      "antigravity.runAgent",
      async (agentName: string, filePath: string) => {
        if (!agentName) {
          void vscode.window.showErrorMessage("Agent name is missing.");
          return;
        }
        if (!filePath || !fs.existsSync(filePath)) {
          void vscode.window.showErrorMessage("Agent file not found.");
          return;
        }
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
        await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(filePath));
      } else {
        await openFile(filePath);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.runWorkflow", async (filePath: string) => {
      if (!filePath || !fs.existsSync(filePath)) {
        void vscode.window.showErrorMessage("Workflow file not found.");
        return;
      }
      await runWorkflow(filePath);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.openClaudeTerminal", async () => {
      try {
        const rootPath = getRootPath();
        if (!rootPath) {
          void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
          return;
        }
        const repoRoot = getRepoRoot(rootPath);
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
            quoteShellArg(path.join(extensionRoot, "Switch-ClaudeCode-Model")) +
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
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
      const hasAgentFolder = fs.existsSync(path.join(repoRoot, ".agent"));
      if (hasAgentFolder) {
        const selection = await vscode.window.showWarningMessage(
          "There is already a .agent at the project. Do you still want to run Workspace Setup?",
          { modal: true },
          "Yes",
          "No"
        );
        if (selection !== "Yes") return;
      }
      await runRepoScript("workspace-setup", ["--force"]);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.initRepository", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
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
      await runRepoScript("init-repo", [repoName.trim()]);
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
      try {
        const rootPath = getRootPath();
        if (!rootPath) {
          void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
          return;
        }
        const repoRoot = getRepoRoot(rootPath);
        await appendAutocommitLogLine(
          "Create CLAUDE.md: running claude /init and follow-up update prompt"
        );
        const guidelinesFile = path.join(
          extensionRoot,
          "Project Level CLAUDE.md Guidelines.txt"
        );
        const prompt = fs.existsSync(guidelinesFile)
          ? fs.readFileSync(guidelinesFile, "utf8").trim()
          : "/init";
        await runClaudeInitAndUpdateInNewTerminal(repoRoot, prompt);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Create CLAUDE.md failed: ${message}`);
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
      const description = await vscode.window.showInputBox({
        title: "Create Repo Tag Version",
        prompt: "Add a tag description (optional)"
      });
      if (description === undefined) return;
      const trimmed = description.trim();
      await runRepoScript("commit-push-tag", trimmed ? [trimmed] : []);
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
      // Ensure both autocommit scripts are present, downloading from GitHub if missing.
      const scriptCandidates = ["autocommit_changes.sh", "autocommit_changes.py"];
      let scriptPath: string | undefined;
      for (const candidate of scriptCandidates) {
        scriptPath = await ensureScriptFile(repoRoot, candidate);
        if (scriptPath) break;
      }
      if (!scriptPath) return;
      await ensureScriptFile(repoRoot, "autocommit_revert.sh");
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
      const scriptCandidates = ["autocommit_revert", "autocommit_revert.sh"];
      let scriptFile: string | undefined;
      for (const candidate of scriptCandidates) {
        const ensured = await ensureScriptFile(repoRoot, candidate);
        if (ensured) {
          scriptFile = candidate;
          break;
        }
      }
      if (!scriptFile) return;
      await runInSecondaryTerminal([
        `cd ${quoteShellArg(repoRoot)}`,
        `./scripts/${scriptFile}`
      ]);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.switchEnvironment", async () => {
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
      await runRepoScript("switch-env", [selection.value]);
    })
  );
}

export function deactivate() { }
