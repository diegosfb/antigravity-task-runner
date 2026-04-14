"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process_1 = require("child_process");
const treeProvider_1 = require("./treeProvider");
const git_1 = require("./git");
const terminal_1 = require("./terminal");
const settings_1 = require("./settings");
const scripts_1 = require("./scripts");
const utils_1 = require("./utils");
const logger_1 = require("./logger");
function activate(context) {
    const outputChannel = vscode.window.createOutputChannel("Antigravity Task Runner");
    context.subscriptions.push(outputChannel);
    (0, logger_1.initLogger)(outputChannel);
    const provider = new treeProvider_1.AntigravityViewProvider();
    const extensionRoot = context.extensionPath;
    (0, logger_1.log)(`[activate] Extension root: ${extensionRoot}`);
    const launchClaudeInit = async (repoRoot, guidelinesFileName = "Project Level CLAUDE.md Guidelines.txt") => {
        (0, logger_1.log)(`[launchClaudeInit] repoRoot: ${repoRoot}`);
        const guidelineCandidates = [
            path.join(extensionRoot, guidelinesFileName)
        ];
        const guidelinesFile = guidelineCandidates.find((candidate) => fs.existsSync(candidate));
        (0, logger_1.log)(`[launchClaudeInit] guidelinesFile: ${guidelinesFile ?? "not found, using /init"}`);
        const prompt = guidelinesFile
            ? fs.readFileSync(guidelinesFile, "utf8").trim()
            : "/init";
        (0, logger_1.log)(`[launchClaudeInit] launching Claude init terminal`);
        await (0, terminal_1.runClaudeInitAndUpdateInNewTerminal)(repoRoot, prompt);
        (0, logger_1.log)(`[launchClaudeInit] done`);
    };
    const launchAgentInit = async (repoRoot) => {
        (0, logger_1.log)(`[launchAgentInit] repoRoot: ${repoRoot}`);
        const guidelinesFile = path.join(extensionRoot, "Project Level AGENT.md Guidelines.txt");
        (0, logger_1.log)(`[launchAgentInit] guidelinesFile: ${guidelinesFile} exists=${fs.existsSync(guidelinesFile)}`);
        const prompt = fs.existsSync(guidelinesFile)
            ? fs.readFileSync(guidelinesFile, "utf8").trim()
            : "/init";
        (0, logger_1.log)(`[launchAgentInit] launching Codex init terminal`);
        await (0, terminal_1.runCodexInitAndUpdateInNewTerminal)(repoRoot, prompt);
        (0, logger_1.log)(`[launchAgentInit] done`);
    };
    context.subscriptions.push(vscode.window.registerTreeDataProvider("antigravityView", provider));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openSettings", async () => {
        const panel = vscode.window.createWebviewPanel("antigravitySettings", "Antigravity Settings", vscode.ViewColumn.Active, { enableScripts: true });
        panel.webview.html = (0, settings_1.renderAntigravitySettingsHtml)(panel.webview);
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message || message.type !== "applySettings")
                return;
            const payload = message.payload || {};
            const values = payload.values || {};
            const target = payload.target === "workspace" && vscode.workspace.workspaceFolders
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
                }
                else {
                    await config.update(key, normalized, target);
                }
            }
            provider.refresh();
            void vscode.window.showInformationMessage("Antigravity settings updated.");
        }, undefined, context.subscriptions);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.runClaudeAgent", async (agentName) => {
        (0, logger_1.log)(`[runClaudeAgent] agentName: ${agentName}`);
        if (!agentName) {
            (0, logger_1.log)(`[runClaudeAgent] ERROR: agent name missing`);
            void vscode.window.showErrorMessage("Agent name is missing.");
            return;
        }
        const rootPath = (0, utils_1.getRootPath)();
        const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : process.cwd();
        (0, logger_1.log)(`[runClaudeAgent] repoRoot: ${repoRoot}`);
        (0, terminal_1.runInNewTerminal)(`Agent: ${agentName}`, [
            `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
            `claude --agent ${(0, utils_1.quoteShellArg)(agentName)}`
        ], {
            iconPath: new vscode.ThemeIcon("robot", terminal_1.CLAUDE_ACTION_COLOR),
            color: terminal_1.CLAUDE_ACTION_COLOR
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.runAgent", async (agentName, filePath) => {
        (0, logger_1.log)(`[runAgent] agentName: ${agentName}, filePath: ${filePath}`);
        if (!agentName) {
            (0, logger_1.log)(`[runAgent] ERROR: agent name missing`);
            void vscode.window.showErrorMessage("Agent name is missing.");
            return;
        }
        if (!filePath || !fs.existsSync(filePath)) {
            (0, logger_1.log)(`[runAgent] ERROR: agent file not found: ${filePath}`);
            void vscode.window.showErrorMessage("Agent file not found.");
            return;
        }
        (0, logger_1.log)(`[runAgent] running agent`);
        await (0, scripts_1.runAgent)(agentName, filePath);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openAgent", async (filePath) => {
        if (!filePath || !fs.existsSync(filePath)) {
            void vscode.window.showErrorMessage("Agent file not found.");
            return;
        }
        await (0, scripts_1.openFile)(filePath);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.copyPath", async (item) => {
        const filePath = item?.filePath;
        if (!filePath) {
            void vscode.window.showErrorMessage("No path available.");
            return;
        }
        await vscode.env.clipboard.writeText(filePath);
        void vscode.window.showInformationMessage(`Copied: ${filePath}`);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openPath", async (item) => {
        const filePath = item?.filePath;
        if (!filePath || !fs.existsSync(filePath)) {
            void vscode.window.showErrorMessage("Path not found.");
            return;
        }
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            await vscode.env.openExternal(vscode.Uri.file(filePath));
        }
        else {
            await (0, scripts_1.openFile)(filePath);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.addToProject", async (item) => {
        const filePath = item?.filePath;
        if (!filePath || !fs.existsSync(filePath)) {
            void vscode.window.showErrorMessage("Path not found.");
            return;
        }
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const projectRoot = (0, utils_1.getRepoRoot)(rootPath);
        const linkName = path.basename(filePath);
        const linkPath = path.join(projectRoot, linkName);
        let linkExists = false;
        try {
            fs.lstatSync(linkPath); // succeeds for regular files and symlinks (including broken)
            linkExists = true;
        }
        catch {
            // path doesn't exist at all
        }
        if (linkExists) {
            void vscode.window.showErrorMessage(`"${linkName}" already exists in the project root.`);
            return;
        }
        try {
            fs.symlinkSync(filePath, linkPath);
            void vscode.window.showInformationMessage(`Symlink created: ${linkName} → ${filePath}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Failed to create symlink: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.addToAgent", async (item) => {
        const filePath = item?.filePath;
        if (!filePath || !fs.existsSync(filePath)) {
            void vscode.window.showErrorMessage("Path not found.");
            return;
        }
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const projectRoot = (0, utils_1.getRepoRoot)(rootPath);
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
        }
        catch {
            // path doesn't exist at all
        }
        if (linkExists) {
            void vscode.window.showErrorMessage(`"${linkName}" already exists in .agent.`);
            return;
        }
        try {
            fs.symlinkSync(filePath, linkPath);
            void vscode.window.showInformationMessage(`Symlink created: .agent/${linkName} → ${filePath}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Failed to create symlink: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.addToCustomSkills", async (item) => {
        const filePath = item?.filePath;
        if (!filePath || !fs.existsSync(filePath)) {
            void vscode.window.showErrorMessage("Path not found.");
            return;
        }
        // If item is a SKILL.md file, symlink its parent folder; if it's a folder, symlink it directly
        const stat = fs.statSync(filePath);
        const skillSource = stat.isDirectory() ? filePath : path.dirname(filePath);
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const projectRoot = (0, utils_1.getRepoRoot)(rootPath);
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
        }
        catch {
            // path doesn't exist at all
        }
        if (linkExists) {
            void vscode.window.showErrorMessage(`"${linkName}" already exists in .agent/skills.`);
            return;
        }
        try {
            fs.symlinkSync(skillSource, linkPath);
            void vscode.window.showInformationMessage(`Symlink created: .agent/skills/${linkName} → ${skillSource}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Failed to create symlink: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.addToCustomAgents", async (item) => {
        const filePath = item?.filePath;
        if (!filePath || !fs.existsSync(filePath)) {
            void vscode.window.showErrorMessage("Path not found.");
            return;
        }
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const projectRoot = (0, utils_1.getRepoRoot)(rootPath);
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
        }
        catch {
            // path doesn't exist at all
        }
        if (linkExists) {
            void vscode.window.showErrorMessage(`"${linkName}" already exists in .agent/agents.`);
            return;
        }
        try {
            fs.symlinkSync(agentSource, linkPath);
            void vscode.window.showInformationMessage(`Symlink created: .agent/agents/${linkName} → ${agentSource}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Failed to create symlink: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.enablePlugin", async (item) => {
        const pluginName = item?.filePath;
        if (!pluginName)
            return;
        await (0, terminal_1.runInSecondaryTerminal)([`claude plugin enable ${(0, utils_1.quoteShellArg)(pluginName)}`]);
        setTimeout(() => provider.refresh(), 1500);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.disablePlugin", async (item) => {
        const pluginName = item?.filePath;
        if (!pluginName)
            return;
        await (0, terminal_1.runInSecondaryTerminal)([`claude plugin disable ${(0, utils_1.quoteShellArg)(pluginName)}`]);
        setTimeout(() => provider.refresh(), 1500);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.runWorkflow", async (filePath) => {
        (0, logger_1.log)(`[runWorkflow] filePath: ${filePath}`);
        if (!filePath || !fs.existsSync(filePath)) {
            (0, logger_1.log)(`[runWorkflow] ERROR: workflow file not found: ${filePath}`);
            void vscode.window.showErrorMessage("Workflow file not found.");
            return;
        }
        (0, logger_1.log)(`[runWorkflow] running workflow`);
        await (0, scripts_1.runWorkflow)(filePath);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openClaudeTerminal", async () => {
        (0, logger_1.log)(`[openClaudeTerminal] triggered`);
        try {
            const rootPath = (0, utils_1.getRootPath)();
            if (!rootPath) {
                (0, logger_1.log)(`[openClaudeTerminal] ERROR: rootPath not set`);
                void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
                return;
            }
            const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
            (0, logger_1.log)(`[openClaudeTerminal] repoRoot: ${repoRoot}`);
            const baseUrl = await (0, settings_1.readClaudeAnthropicBaseUrl)(repoRoot);
            if ((0, settings_1.isLocalLiteLLMBaseUrl)(baseUrl)) {
                await vscode.commands.executeCommand("antigravity.runLiteLLMOpenAI");
                const ready = await (0, utils_1.waitForUrlReady)(settings_1.LOCAL_LITELLM_READY_URL);
                if (!ready) {
                    void vscode.window.showErrorMessage(`liteLLM did not become ready at ${settings_1.LOCAL_LITELLM_READY_URL}.`);
                    return;
                }
            }
            (0, terminal_1.runInNewTerminal)("Claude", [`cd ${(0, utils_1.quoteShellArg)(repoRoot)}`, "claude"], {
                iconPath: new vscode.ThemeIcon("robot", terminal_1.CLAUDE_ACTION_COLOR),
                color: terminal_1.CLAUDE_ACTION_COLOR
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Claude Terminal failed: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openOllamaClaudeTerminal", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        (0, terminal_1.runInNewTerminal)("Ollama Claude", [`cd ${(0, utils_1.quoteShellArg)(repoRoot)}`, "ollama launch claude"], {
            iconPath: new vscode.ThemeIcon("robot", terminal_1.CLAUDE_ACTION_COLOR),
            color: terminal_1.CLAUDE_ACTION_COLOR
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openOpenClaudeTerminal", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        (0, terminal_1.runInNewTerminal)("OpenClaude", [`cd ${(0, utils_1.quoteShellArg)(repoRoot)}`, "openclaude"], {
            iconPath: new vscode.ThemeIcon("robot", terminal_1.CLAUDE_ACTION_COLOR),
            color: terminal_1.CLAUDE_ACTION_COLOR
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.setClaudeModel", async () => {
        const routerConfigPath = path.join(os.homedir(), ".claude", "routerconfig.json");
        if (!fs.existsSync(routerConfigPath)) {
            const rootPath = (0, utils_1.getRootPath)();
            const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : undefined;
            const repTemplatePath = repoRoot ? path.join(repoRoot, "routerconfig.example.json") : undefined;
            const templatePath = (repTemplatePath && fs.existsSync(repTemplatePath))
                ? repTemplatePath
                : path.join(extensionRoot, "routerconfig.example.json");
            if (fs.existsSync(templatePath)) {
                fs.mkdirSync(path.dirname(routerConfigPath), { recursive: true });
                fs.copyFileSync(templatePath, routerConfigPath);
                await vscode.window.showTextDocument(vscode.Uri.file(routerConfigPath));
            }
            else {
                void vscode.window.showErrorMessage("Could not create ~/.claude/routerconfig.json: template routerconfig.example.json not found.");
            }
            return;
        }
        const config = await (0, settings_1.loadOpenRouterConfig)();
        if (!config)
            return;
        const routers = (0, settings_1.normalizeStringArray)(config.routers);
        if (routers.length === 0) {
            void vscode.window.showErrorMessage("routerconfig.json is missing a routers array.");
            return;
        }
        const panel = vscode.window.createWebviewPanel("antigravitySetClaudeModel", "Set Claude Model", vscode.ViewColumn.Active, { enableScripts: true });
        const claudeSettings = await (0, settings_1.loadClaudeSettings)();
        panel.webview.html = (0, settings_1.renderClaudeModelConfigHtml)(panel.webview, config, claudeSettings);
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message || message.type !== "applyClaudeModel")
                return;
            const { router, model, effortLevel, internalBehaviour } = message.payload || {};
            if (typeof router !== "string" ||
                typeof model !== "string" ||
                typeof effortLevel !== "string" ||
                typeof internalBehaviour !== "string") {
                void vscode.window.showErrorMessage("Invalid Claude model selection.");
                return;
            }
            const baseSettings = (0, settings_1.getRouterSettings)(config, router);
            if (!baseSettings) {
                void vscode.window.showErrorMessage(`routerconfig.json is missing ${router}-settings configuration.`);
                return;
            }
            const settings = baseSettings;
            const missingKeys = [];
            const mandatory = new Set((settings.mandatory_params || []).map((value) => value.trim()));
            if (mandatory.has("api_key") && !settings.apikey)
                missingKeys.push("api_key");
            if (mandatory.has("auth_token") && !settings.auth_token)
                missingKeys.push("auth_token");
            if (missingKeys.length > 0) {
                void vscode.window.showErrorMessage(`Missing ${missingKeys.join(", ")} for ${router}. ` +
                    "Set it in ~/.claude/routerconfig.json.");
                return;
            }
            const rootPath = (0, utils_1.getRootPath)();
            if (!rootPath) {
                void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
                return;
            }
            const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
            const command = (0, utils_1.quoteShellArg)(path.join(extensionRoot, "src", "Switch-ClaudeCode-Model.sh")) +
                ` --model ${(0, utils_1.quoteShellArg)(model)}` +
                ` --baseurl ${(0, utils_1.quoteShellArg)(settings.baseurl)}` +
                ` --auth-token ${(0, utils_1.quoteShellArg)(settings.auth_token)}` +
                ` --api-key ${(0, utils_1.quoteShellArg)(settings.apikey)}` +
                ` --effort-level ${(0, utils_1.quoteShellArg)(effortLevel)}` +
                ` --internal-model ${(0, utils_1.quoteShellArg)(internalBehaviour)}`;
            const commands = [`cd ${(0, utils_1.quoteShellArg)(repoRoot)}`, command];
            const postRun = settings.post_run?.trim();
            const toolRunCommand = postRun ? (0, settings_1.getToolRunCommand)(config, postRun) : undefined;
            if (postRun && !toolRunCommand) {
                commands.push(`nohup sh -c ${(0, utils_1.quoteShellArg)(postRun)} >/dev/null 2>&1 &`);
            }
            await (0, terminal_1.runInSecondaryTerminal)(commands);
            if (toolRunCommand) {
                await (0, terminal_1.runInSecondaryTerminal)([`cd ${(0, utils_1.quoteShellArg)(repoRoot)}`, toolRunCommand]);
            }
            panel.dispose();
        }, undefined, context.subscriptions);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.workspaceSetup", async () => {
        (0, logger_1.showOutputChannel)();
        (0, logger_1.logAlways)("[Workspace Setup] Command triggered");
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            (0, logger_1.logAlways)("[Workspace Setup] ERROR: No workspace folder is open");
            void vscode.window.showErrorMessage("No workspace folder is open.");
            return;
        }
        (0, logger_1.logAlways)(`[Workspace Setup] workspaceRoot: ${workspaceRoot}`);
        const repoRoot = workspaceRoot;
        const workspaceDir = (0, utils_1.getWorkspaceProjectPath)(repoRoot);
        (0, logger_1.logAlways)(`[Workspace Setup] workspaceDir: ${workspaceDir}`);
        if (!fs.existsSync(workspaceDir)) {
            (0, logger_1.logAlways)(`[Workspace Setup] workspaceDir does not exist, creating: ${workspaceDir}`);
            fs.mkdirSync(path.join(workspaceDir, "scripts"), { recursive: true });
        }
        const scriptPath = path.join(extensionRoot, "src", "workspace-setup.sh");
        (0, logger_1.logAlways)(`[Workspace Setup] scriptPath: ${scriptPath}`);
        if (!fs.existsSync(scriptPath)) {
            (0, logger_1.logAlways)(`[Workspace Setup] ERROR: workspace-setup.sh not found at: ${scriptPath}`);
            void vscode.window.showErrorMessage(`workspace-setup.sh not found in extension at: ${scriptPath}`);
            return;
        }
        (0, logger_1.logAlways)(`[Workspace Setup] workspace-setup.sh found, making executable`);
        await fs.promises.chmod(scriptPath, 0o755).catch((e) => (0, logger_1.logAlways)(`[Workspace Setup] chmod failed: ${e}`));
        (0, logger_1.logAlways)(`[Workspace Setup] running workspace-setup.sh in: ${workspaceDir}`);
        const exitCode = await new Promise((resolve) => {
            const proc = (0, child_process_1.spawn)(scriptPath, ["--force"], { cwd: workspaceDir, shell: false });
            proc.stdout.on("data", (data) => {
                for (const line of data.toString().split("\n")) {
                    if (line.trim())
                        (0, logger_1.logAlways)(`[workspace-setup.sh] ${line}`);
                }
            });
            proc.stderr.on("data", (data) => {
                for (const line of data.toString().split("\n")) {
                    if (line.trim())
                        (0, logger_1.logAlways)(`[workspace-setup.sh STDERR] ${line}`);
                }
            });
            proc.on("close", (code) => resolve(code ?? 1));
            proc.on("error", (err) => {
                (0, logger_1.logAlways)(`[Workspace Setup] spawn error: ${err.message}`);
                resolve(1);
            });
        });
        (0, logger_1.logAlways)(`[Workspace Setup] workspace-setup.sh exited with code: ${exitCode}`);
        if (exitCode !== 0) {
            void vscode.window.showErrorMessage(`workspace-setup.sh failed (exit ${exitCode}). Check the Antigravity Task Runner output panel.`);
            return;
        }
        // logAlways(`[Workspace Setup] launching AGENTS.md init`);
        // await launchAgentInit(repoRoot);
        // await launchClaudeInit(repoRoot);
        // logAlways(`[Workspace Setup] AGENTS.md init launched`);
        (0, logger_1.logAlways)(`[Workspace Setup] Done`);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.initRepository", async () => {
        (0, logger_1.showOutputChannel)();
        (0, logger_1.logAlways)(`[initRepository] triggered`);
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            (0, logger_1.logAlways)(`[initRepository] ERROR: rootPath not set`);
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        (0, logger_1.logAlways)(`[initRepository] repoRoot: ${repoRoot}`);
        if (fs.existsSync(path.join(repoRoot, ".git"))) {
            (0, logger_1.logAlways)(`[initRepository] existing .git directory found at ${path.join(repoRoot, ".git")}`);
            void vscode.window.showWarningMessage("A Git repository already exists in this project.");
            return;
        }
        const repoName = await vscode.window.showInputBox({
            title: "Init Repository",
            prompt: "Enter the repository name",
            placeHolder: "my-repository"
        });
        if (!repoName || repoName.trim() === "") {
            (0, logger_1.logAlways)("[initRepository] cancelled before repository name was provided");
            return;
        }
        const trimmedRepoName = repoName.trim();
        (0, logger_1.logAlways)(`[initRepository] requested repoName: ${trimmedRepoName}`);
        const nestedGitFolders = (0, utils_1.findNestedGitFolders)(repoRoot);
        (0, logger_1.logAlways)(`[initRepository] nested .git folders found: ${nestedGitFolders.length}`);
        if (nestedGitFolders.length > 0) {
            const relPaths = nestedGitFolders.map((p) => path.relative(repoRoot, p));
            (0, logger_1.logAlways)(`[initRepository] nested .git relative paths: ${relPaths.join(", ")}`);
            const selection = await vscode.window.showWarningMessage(`Found ${nestedGitFolders.length} nested .git folder(s):\n${relPaths.join(", ")}\n\nRemove them and absorb into one repo?`, { modal: true }, "Yes", "No");
            (0, logger_1.logAlways)(`[initRepository] nested .git removal selection: ${selection ?? "dismissed"}`);
            if (selection !== "Yes") {
                (0, logger_1.logAlways)("[initRepository] cancelled because nested .git folders were not approved for removal");
                return;
            }
            for (const gitDir of nestedGitFolders) {
                (0, logger_1.logAlways)(`[initRepository] removing nested .git folder: ${gitDir}`);
                fs.rmSync(gitDir, { recursive: true, force: true });
            }
        }
        (0, logger_1.logAlways)(`[initRepository] invoking init-repo script from ${path.join(extensionRoot, "src")}`);
        await (0, scripts_1.runRepoScript)("init-repo", [trimmedRepoName], { scriptDir: path.join(extensionRoot, "src") });
        (0, logger_1.logAlways)("[initRepository] init-repo script invocation completed");
        provider.refresh();
        (0, logger_1.logAlways)("[initRepository] tree provider refreshed");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.buildVersion", async () => {
        await (0, scripts_1.runRepoScript)("build-version");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.runLiteLLMOpenAI", async () => {
        const config = await (0, settings_1.loadOpenRouterConfig)();
        if (!config)
            return;
        const command = (0, settings_1.getToolRunCommand)(config, "litellm-openai");
        if (!command) {
            void vscode.window.showErrorMessage('routerconfig.json is missing "tool-run.litellm-openai".');
            return;
        }
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        await (0, terminal_1.runInSecondaryTerminal)([`cd ${(0, utils_1.quoteShellArg)(repoRoot)}`, command]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.createClaudeMd", async () => {
        (0, logger_1.log)(`[createClaudeMd] triggered`);
        try {
            const rootPath = (0, utils_1.getRootPath)();
            const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!repoRoot) {
                (0, logger_1.log)(`[createClaudeMd] ERROR: no workspace folder or rootPath`);
                void vscode.window.showErrorMessage("No workspace folder is open.");
                return;
            }
            (0, logger_1.log)(`[createClaudeMd] repoRoot: ${repoRoot}`);
            await launchClaudeInit(repoRoot, "Project Level AGENT.md Guidelines.txt");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            (0, logger_1.log)(`[createClaudeMd] ERROR: ${message}`);
            void vscode.window.showErrorMessage(`Create CLAUDE.md failed: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.createAgentMd", async () => {
        (0, logger_1.log)(`[createAgentMd] triggered`);
        try {
            const rootPath = (0, utils_1.getRootPath)();
            const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!repoRoot) {
                (0, logger_1.log)(`[createAgentMd] ERROR: no workspace folder or rootPath`);
                void vscode.window.showErrorMessage("No workspace folder is open.");
                return;
            }
            (0, logger_1.log)(`[createAgentMd] repoRoot: ${repoRoot}`);
            await launchAgentInit(repoRoot);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            (0, logger_1.log)(`[createAgentMd] ERROR: ${message}`);
            void vscode.window.showErrorMessage(`Create AGENTS.md failed: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.createRepository", async () => {
        await (0, scripts_1.runRepoScript)("create-repo");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.createInfrastructure", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const infraFiles = await (0, utils_1.listInfrastructureYamlFiles)(repoRoot);
        if (infraFiles.length === 0) {
            void vscode.window.showErrorMessage(`No infrastructure YAML files found under ${path.join(repoRoot, "config", "Infrastructure")}.`);
            return;
        }
        const selection = await vscode.window.showQuickPick(infraFiles.map((filePath) => {
            const relativePath = path.relative(repoRoot, filePath);
            return { label: relativePath, value: relativePath };
        }), {
            title: "Create Infrastructure",
            placeHolder: "Select infra yaml path"
        });
        if (!selection)
            return;
        await (0, scripts_1.runRepoScript)("create-infra", [selection.value], { cwd: repoRoot });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.deploy", async () => {
        await (0, scripts_1.runRepoScript)("deploy");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.incrementMajorVersion", async () => {
        await (0, scripts_1.runRepoScript)("bump-version", ["major"]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.incrementMinorVersion", async () => {
        await (0, scripts_1.runRepoScript)("bump-version", ["minor"]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.incrementPatchVersion", async () => {
        await (0, scripts_1.runRepoScript)("bump-version", ["patch"]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.createRepoTagVersion", async () => {
        (0, logger_1.log)(`[createRepoTagVersion] triggered`);
        const description = await vscode.window.showInputBox({
            title: "Create Repo Tag Version",
            prompt: "Add a tag description (optional)"
        });
        if (description === undefined)
            return;
        const trimmed = description.trim();
        (0, logger_1.log)(`[createRepoTagVersion] description: "${trimmed}"`);
        await (0, scripts_1.runRepoScript)("commit-push-tag", trimmed ? [trimmed] : [], { scriptDir: path.join(extensionRoot, "src") });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.createRepoTag", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const tagName = await vscode.window.showInputBox({
            title: "Create Repo Tag",
            prompt: "Tag name (e.g. v1.0.0)"
        });
        if (!tagName?.trim())
            return;
        const tag = tagName.trim();
        const message = await vscode.window.showInputBox({
            title: "Create Repo Tag",
            prompt: "Tag message (optional)"
        });
        if (message === undefined)
            return;
        const msg = message.trim() || tag;
        (0, terminal_1.runInNewTerminal)("Antigravity", [
            `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
            `git tag -a ${(0, utils_1.quoteShellArg)(tag)} -m ${(0, utils_1.quoteShellArg)(msg)} && git push origin ${(0, utils_1.quoteShellArg)(tag)} && echo "[antigravity] tag ${tag} pushed"`,
        ]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.autocommitCheckpoint", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const action = (0, git_1.isAutocommitRunning)(repoRoot) ? "stop" : "start";
        if (action === "start") {
            const hasGithub = await (0, git_1.hasGitHubRemote)(repoRoot);
            if (!hasGithub) {
                void vscode.window.showErrorMessage("No GitHub remote found for this project. Set up a GitHub repository before starting autocommit.");
                return;
            }
        }
        // Ensure both autocommit scripts are present, using bundled src/ versions.
        const srcDir = path.join(extensionRoot, "src");
        const scriptPath = await (0, scripts_1.ensureScriptFile)(repoRoot, "autocommit_changes.sh", srcDir);
        if (!scriptPath)
            return;
        await (0, scripts_1.ensureScriptFile)(repoRoot, "autocommit_revert.sh", srcDir);
        await (0, terminal_1.runInSecondaryTerminal)([
            `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
            `${(0, utils_1.quoteShellArg)(scriptPath)} ${action}`
        ]);
        provider.refresh();
        setTimeout(() => {
            provider.refresh();
        }, 1000);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.autocommitRevert", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const scriptPath = await (0, scripts_1.ensureScriptFile)(repoRoot, "autocommit_revert.sh", path.join(extensionRoot, "src"));
        if (!scriptPath)
            return;
        await (0, terminal_1.runInSecondaryTerminal)([
            `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
            `${(0, utils_1.quoteShellArg)(scriptPath)}`
        ]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.switchEnvironment", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const workspaceDir = (0, utils_1.getWorkspaceProjectPath)(repoRoot);
        const selection = await vscode.window.showQuickPick([
            { label: "DEV", value: "DEV" },
            { label: "QA", value: "QA" },
            { label: "UAT", value: "UAT" },
            { label: "PROD", value: "PROD" }
        ], {
            title: "Switch Environment",
            placeHolder: "Select target environment"
        });
        if (!selection)
            return;
        // Ensure switch-env.sh is present, downloading from Script Fallback Base URL if missing.
        const scriptPath = await (0, scripts_1.ensureScriptFile)(repoRoot, "switch-env.sh", path.join(workspaceDir, "scripts"));
        if (!scriptPath)
            return;
        // Offer to download missing config files from Config Fallback Base URL.
        // Files live in workspace/config/ so pass workspaceDir as the root.
        const settingsFileName = `${selection.value.toLowerCase()}-settings.yaml`;
        await (0, scripts_1.downloadConfigFileIfMissing)(workspaceDir, settingsFileName);
        await (0, scripts_1.downloadInfrastructureFileIfMissing)(workspaceDir, settingsFileName);
        await (0, scripts_1.downloadConfigFileIfMissing)(workspaceDir, ".env");
        await (0, terminal_1.runInSecondaryTerminal)([
            `cd ${(0, utils_1.quoteShellArg)(workspaceDir)}`,
            `${(0, utils_1.quoteShellArg)(scriptPath)} ${(0, utils_1.quoteShellArg)(selection.value)}`
        ]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.updateAgenticWorkspace", async () => {
        const rawWorkspaceProjectDir = vscode.workspace.getConfiguration("antigravity").get("antigravityWorkspaceProject") || "~/antigravity-workspace";
        const workspaceProjectDir = rawWorkspaceProjectDir.replace(/^~/, os.homedir());
        await (0, scripts_1.runRepoScript)("update-agentic-workspace", [workspaceProjectDir], { scriptDir: path.join(extensionRoot, "src") });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.updateAgenticSetup", async () => {
        const config = vscode.workspace.getConfiguration("antigravity");
        const initialValues = {
            claudeGithub: config.get("claudeSetupGithub") || "",
            geminiGithub: config.get("geminiSetupGithub") || "",
            codexGithub: config.get("codexSetupGithub") || ""
        };
        const panel = vscode.window.createWebviewPanel("antigravityAgenticSetup", "Update Agentic Setup", vscode.ViewColumn.Active, { enableScripts: true });
        panel.webview.html = (0, settings_1.renderAgenticSetupHtml)(panel.webview, initialValues);
        panel.webview.onDidReceiveMessage(async (message) => {
            try {
                await (0, terminal_1.runInSecondaryTerminal)([`echo "[antigravity] message received: ${JSON.stringify(message)}"`]);
                if (!message || message.type !== "agenticSetupUpdate") {
                    await (0, terminal_1.runInSecondaryTerminal)([`echo "[antigravity] ignored message type: ${message?.type}"`]);
                    return;
                }
                const { tool, url, all } = message;
                await (0, terminal_1.runInSecondaryTerminal)([`echo "[antigravity] update triggered: tool=${tool} url=${url}"`]);
                // Save all three values every time any Update is clicked
                if (all.claudeGithub)
                    await config.update("claudeSetupGithub", all.claudeGithub, vscode.ConfigurationTarget.Global);
                if (all.geminiGithub)
                    await config.update("geminiSetupGithub", all.geminiGithub, vscode.ConfigurationTarget.Global);
                if (all.codexGithub)
                    await config.update("codexSetupGithub", all.codexGithub, vscode.ConfigurationTarget.Global);
                await (0, terminal_1.runInSecondaryTerminal)([`echo "[antigravity] config saved, running script..."`]);
                await (0, scripts_1.runRepoScript)("update-agent-setup", url ? [tool, url] : [tool], { scriptDir: path.join(extensionRoot, "src") });
            }
            catch (err) {
                await (0, terminal_1.runInSecondaryTerminal)([`echo "[antigravity] ERROR: ${String(err)}"`]);
            }
        }, undefined, context.subscriptions);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.backupCompress", async (uri) => {
        const targetPath = uri?.fsPath;
        if (!targetPath) {
            void vscode.window.showErrorMessage("No file or folder selected.");
            return;
        }
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        const dir = path.dirname(targetPath);
        const base = path.basename(targetPath);
        const zipName = `${base} [${timestamp}].zip`;
        const zipPath = path.join(dir, zipName);
        const isDir = fs.statSync(targetPath).isDirectory();
        const flag = isDir ? "-r" : "";
        const cmd = `zip ${flag} ${(0, utils_1.quoteShellArg)(zipPath)} ${(0, utils_1.quoteShellArg)(base)}`.trim();
        (0, child_process_1.exec)(cmd, { cwd: dir }, (error) => {
            if (error) {
                void vscode.window.showErrorMessage(`Backup-Compress failed: ${error.message}`);
            }
            else {
                void vscode.window.showInformationMessage(`Backup created: ${zipName}`);
            }
        });
    }));
    const runDiffMerge = async (uri, uris) => {
        const selectedUris = Array.isArray(uris) && uris.length > 0
            ? uris
            : uri
                ? [uri]
                : [];
        if (selectedUris.length === 0) {
            void vscode.window.showErrorMessage("No files selected.");
            return;
        }
        if (selectedUris.length > 3) {
            void vscode.window.showErrorMessage("DiffMerge supports selecting up to 3 files from the Explorer menu.");
            return;
        }
        const filePaths = selectedUris
            .map((item) => item.fsPath)
            .filter((item) => Boolean(item));
        const invalidPath = filePaths.find((filePath) => {
            try {
                return fs.statSync(filePath).isDirectory();
            }
            catch {
                return true;
            }
        });
        if (invalidPath) {
            void vscode.window.showErrorMessage("DiffMerge can only be launched with existing files.");
            return;
        }
        const proc = (0, child_process_1.spawn)("open", ["-a", "/Applications/DiffMerge.app", "--args", ...filePaths], { shell: false });
        proc.on("error", (error) => {
            void vscode.window.showErrorMessage(`DiffMerge failed: ${error.message}`);
        });
        proc.on("exit", (code) => {
            if (code && code !== 0) {
                void vscode.window.showErrorMessage(`DiffMerge exited with code ${code}.`);
            }
        });
    };
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.diffMergeSingle", runDiffMerge));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.diffMergeFiles", runDiffMerge));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map