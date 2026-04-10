"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const os = require("os");
const treeProvider_1 = require("./treeProvider");
const git_1 = require("./git");
const terminal_1 = require("./terminal");
const settings_1 = require("./settings");
const scripts_1 = require("./scripts");
const utils_1 = require("./utils");
function activate(context) {
    const provider = new treeProvider_1.AntigravityViewProvider();
    const extensionRoot = context.extensionPath;
    void (0, git_1.appendAutocommitLogLine)("Extension loaded");
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
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.runAgent", async (agentName, filePath) => {
        if (!agentName) {
            void vscode.window.showErrorMessage("Agent name is missing.");
            return;
        }
        if (!filePath || !fs.existsSync(filePath)) {
            void vscode.window.showErrorMessage("Agent file not found.");
            return;
        }
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
            await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(filePath));
        }
        else {
            await (0, scripts_1.openFile)(filePath);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.runWorkflow", async (filePath) => {
        if (!filePath || !fs.existsSync(filePath)) {
            void vscode.window.showErrorMessage("Workflow file not found.");
            return;
        }
        await (0, scripts_1.runWorkflow)(filePath);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openClaudeTerminal", async () => {
        try {
            const rootPath = (0, utils_1.getRootPath)();
            if (!rootPath) {
                void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
                return;
            }
            const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
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
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const hasAgentFolder = fs.existsSync(path.join(repoRoot, ".agent"));
        if (hasAgentFolder) {
            const selection = await vscode.window.showWarningMessage("There is already a .agent at the project. Do you still want to run Workspace Setup?", { modal: true }, "Yes", "No");
            if (selection !== "Yes")
                return;
        }
        await (0, scripts_1.runRepoScript)("workspace-setup", ["--force"]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.initRepository", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        if (fs.existsSync(path.join(repoRoot, ".git"))) {
            void vscode.window.showWarningMessage("A Git repository already exists in this project.");
            return;
        }
        const repoName = await vscode.window.showInputBox({
            title: "Init Repository",
            prompt: "Enter the repository name",
            placeHolder: "my-repository"
        });
        if (!repoName || repoName.trim() === "")
            return;
        await (0, scripts_1.runRepoScript)("init-repo", [repoName.trim()]);
        provider.refresh();
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
        try {
            const rootPath = (0, utils_1.getRootPath)();
            if (!rootPath) {
                void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
                return;
            }
            const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
            await (0, git_1.appendAutocommitLogLine)("Create CLAUDE.md: running claude /init and follow-up update prompt");
            const guidelinesFile = path.join(extensionRoot, "Project Level CLAUDE.md Guidelines.txt");
            const prompt = fs.existsSync(guidelinesFile)
                ? fs.readFileSync(guidelinesFile, "utf8").trim()
                : "/init";
            await (0, terminal_1.runClaudeInitAndUpdateInNewTerminal)(repoRoot, prompt);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Create CLAUDE.md failed: ${message}`);
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
        const description = await vscode.window.showInputBox({
            title: "Create Repo Tag Version",
            prompt: "Add a tag description (optional)"
        });
        if (description === undefined)
            return;
        const trimmed = description.trim();
        await (0, scripts_1.runRepoScript)("commit-push-tag", trimmed ? [trimmed] : []);
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
        // Ensure both autocommit scripts are present, downloading from GitHub if missing.
        const scriptCandidates = ["autocommit_changes.sh", "autocommit_changes.py"];
        let scriptPath;
        for (const candidate of scriptCandidates) {
            scriptPath = await (0, scripts_1.ensureScriptFile)(repoRoot, candidate);
            if (scriptPath)
                break;
        }
        if (!scriptPath)
            return;
        await (0, scripts_1.ensureScriptFile)(repoRoot, "autocommit_revert.sh");
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
        const scriptPath = await (0, scripts_1.ensureScriptFile)(repoRoot, "autocommit_revert.sh");
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
        const scriptPath = await (0, scripts_1.ensureScriptFile)(repoRoot, "switch-env.sh");
        if (!scriptPath)
            return;
        // Offer to download missing config files from Config Fallback Base URL.
        const settingsFileName = `${selection.value.toLowerCase()}-settings.yaml`;
        await (0, scripts_1.downloadConfigFileIfMissing)(repoRoot, settingsFileName);
        await (0, scripts_1.downloadInfrastructureFileIfMissing)(repoRoot, settingsFileName);
        await (0, scripts_1.downloadConfigFileIfMissing)(repoRoot, ".env");
        await (0, terminal_1.runInSecondaryTerminal)([
            `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
            `${(0, utils_1.quoteShellArg)(scriptPath)} ${(0, utils_1.quoteShellArg)(selection.value)}`
        ]);
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map