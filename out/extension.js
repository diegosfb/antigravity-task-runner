"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
class NodeItem extends vscode.TreeItem {
    constructor(payload, collapsibleState) {
        super(payload.label, collapsibleState);
        this.kind = payload.kind;
        this.filePath = payload.filePath;
        this.sortKey = (payload.sortKey ?? payload.label).toLowerCase();
    }
}
class AntigravityViewProvider {
    constructor() {
        this.emitter = new vscode.EventEmitter();
        this.onDidChangeTreeData = this.emitter.event;
    }
    refresh() {
        this.emitter.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            const antigravityRoot = getAntigravityHomePath();
            const antigravityLabel = antigravityRoot ? path.basename(antigravityRoot) : ".antigravity";
            const antigravityItem = new NodeItem({ kind: "folder", label: antigravityLabel, filePath: antigravityRoot }, antigravityRoot
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None);
            antigravityItem.iconPath = new vscode.ThemeIcon("folder");
            if (!antigravityRoot) {
                antigravityItem.label = "Missing ~/.antigravity";
                antigravityItem.iconPath = new vscode.ThemeIcon("warning");
                antigravityItem.tooltip = "Expected /Users/diego.brihuega/.antigravity to exist.";
            }
            const separatorItem = new NodeItem({ kind: "separator", label: "────────" }, vscode.TreeItemCollapsibleState.None);
            separatorItem.tooltip = "";
            separatorItem.contextValue = "antigravitySeparator";
            const actionItems = getQuickActionItems();
            const actionSeparator = new NodeItem({ kind: "separator", label: "────────" }, vscode.TreeItemCollapsibleState.None);
            actionSeparator.tooltip = "";
            actionSeparator.contextValue = "antigravitySeparator";
            const platform = getAgenticPlatform();
            const platformLabel = platform === "codex"
                ? "Codex"
                : platform === "ollama"
                    ? "Ollama"
                    : platform === "antigravity"
                        ? "Antigravity Agent"
                        : "OpenClaude";
            const platformItem = new NodeItem({ kind: "config", label: `Agentic Platform: ${platformLabel}` }, vscode.TreeItemCollapsibleState.None);
            platformItem.iconPath = new vscode.ThemeIcon("settings-gear");
            platformItem.command = {
                command: "antigravity.selectPlatform",
                title: "Select Agentic Platform"
            };
            const agents = new NodeItem({ kind: "category", label: "Agents" }, vscode.TreeItemCollapsibleState.Expanded);
            agents.iconPath = new vscode.ThemeIcon("organization");
            const workflows = new NodeItem({ kind: "category", label: "Workflows" }, vscode.TreeItemCollapsibleState.Expanded);
            workflows.iconPath = new vscode.ThemeIcon("run-all");
            return [
                antigravityItem,
                actionSeparator,
                ...actionItems,
                separatorItem,
                platformItem,
                agents,
                workflows
            ];
        }
        if (element.kind === "category" && element.label === "Agents") {
            return this.getAgentItems();
        }
        if (element.kind === "category" && element.label === "Workflows") {
            return this.getWorkflowItems();
        }
        if (element.kind === "folder") {
            if (!element.filePath)
                return [];
            return this.getFolderItems(element.filePath);
        }
        return [];
    }
    async getAgentItems() {
        const rootPath = getRootPath();
        if (!rootPath) {
            return [missingRootItem()];
        }
        const agentsDir = path.join(rootPath, "agents");
        const entries = await safeReadDir(agentsDir);
        const directories = entries.filter((entry) => entry.isDirectory());
        const items = directories
            .map((entry) => {
            const agentDir = path.join(agentsDir, entry.name);
            const agentFile = path.join(agentDir, "AGENT.md");
            const agentName = entry.name;
            const item = new NodeItem({ kind: "agent", label: agentName, filePath: agentFile }, vscode.TreeItemCollapsibleState.None);
            item.contextValue = "antigravityAgent";
            item.command = {
                command: "antigravity.runAgent",
                title: `Run ${agentName}`,
                arguments: [agentName, agentFile]
            };
            item.iconPath = new vscode.ThemeIcon("robot");
            return item;
        })
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        return items.length > 0 ? items : [emptyItem("No agents found")];
    }
    async getWorkflowItems() {
        const rootPath = getRootPath();
        if (!rootPath) {
            return [missingRootItem()];
        }
        const workflowsDir = path.join(rootPath, "workflows");
        const entries = await safeReadDir(workflowsDir);
        const markdownFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md");
        const items = markdownFiles
            .map((entry) => {
            const workflowFile = path.join(workflowsDir, entry.name);
            const item = new NodeItem({ kind: "workflow", label: entry.name.replace(/\.md$/, ""), filePath: workflowFile }, vscode.TreeItemCollapsibleState.None);
            item.command = {
                command: "antigravity.runWorkflow",
                title: `Run ${item.label}`,
                arguments: [workflowFile]
            };
            item.iconPath = new vscode.ThemeIcon("play");
            return item;
        })
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        return items.length > 0 ? items : [emptyItem("No workflows found")];
    }
    async getFolderItems(dirPath) {
        const entries = (await safeReadDir(dirPath)).filter((entry) => !shouldHideAntigravityEntry(dirPath, entry));
        const itemsWithKind = entries.map((entry) => {
            const entryPath = path.join(dirPath, entry.name);
            const isDirectory = entry.isDirectory();
            const item = new NodeItem({ kind: "folder", label: entry.name, filePath: entryPath }, isDirectory
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None);
            item.iconPath = new vscode.ThemeIcon(isDirectory ? "folder" : "file");
            if (!isDirectory) {
                item.command = {
                    command: "antigravity.openAgent",
                    title: "Open File",
                    arguments: [entryPath]
                };
            }
            return { item, isDirectory };
        });
        const items = itemsWithKind
            .sort((a, b) => {
            if (a.isDirectory !== b.isDirectory)
                return a.isDirectory ? -1 : 1;
            return a.item.sortKey.localeCompare(b.item.sortKey);
        })
            .map((entry) => entry.item);
        return items.length > 0 ? items : [emptyItem("Empty folder")];
    }
}
const QUICK_ACTION_COLOR = new vscode.ThemeColor("charts.green");
function getQuickActionItems() {
    const items = [];
    const rootPath = getRootPath();
    const repoRoot = rootPath ? getRepoRoot(rootPath) : undefined;
    const hasRepo = repoRoot ? fs.existsSync(path.join(repoRoot, ".git")) : false;
    const autocommitRunning = repoRoot ? isAutocommitRunning(repoRoot) : false;
    const hasAgentFolder = repoRoot ? fs.existsSync(path.join(repoRoot, ".agent")) : false;
    const workspaceSetup = new NodeItem({ kind: "action", label: "Workspace Setup" }, vscode.TreeItemCollapsibleState.None);
    workspaceSetup.iconPath = new vscode.ThemeIcon("run-all", QUICK_ACTION_COLOR);
    if (hasAgentFolder) {
        workspaceSetup.iconPath = new vscode.ThemeIcon("run-all", new vscode.ThemeColor("disabledForeground"));
        workspaceSetup.tooltip = "A .agent folder already exists in this project.";
    }
    workspaceSetup.command = {
        command: "antigravity.workspaceSetup",
        title: "Run Workspace Setup"
    };
    items.push(workspaceSetup);
    const buildVersion = new NodeItem({ kind: "action", label: "Build version" }, vscode.TreeItemCollapsibleState.None);
    buildVersion.iconPath = new vscode.ThemeIcon("tools", QUICK_ACTION_COLOR);
    buildVersion.command = {
        command: "antigravity.buildVersion",
        title: "Run Build Version"
    };
    items.push(buildVersion);
    const createRepository = new NodeItem({ kind: "action", label: "Create Repository" }, vscode.TreeItemCollapsibleState.None);
    createRepository.iconPath = new vscode.ThemeIcon("repo-create", QUICK_ACTION_COLOR);
    if (hasRepo) {
        createRepository.label = "C̶r̶e̶a̶t̶e̶ ̶R̶e̶p̶o̶s̶i̶t̶o̶r̶y̶";
        createRepository.iconPath = new vscode.ThemeIcon("repo-create", new vscode.ThemeColor("disabledForeground"));
        createRepository.tooltip = "Repository already exists in this project.";
    }
    else {
        createRepository.command = {
            command: "antigravity.createRepository",
            title: "Create Repository"
        };
    }
    items.push(createRepository);
    const createInfrastructure = new NodeItem({ kind: "action", label: "Create Infrastructure" }, vscode.TreeItemCollapsibleState.None);
    createInfrastructure.iconPath = new vscode.ThemeIcon("cloud", QUICK_ACTION_COLOR);
    createInfrastructure.command = {
        command: "antigravity.createInfrastructure",
        title: "Run Create Infrastructure"
    };
    items.push(createInfrastructure);
    const deploy = new NodeItem({ kind: "action", label: "Deploy" }, vscode.TreeItemCollapsibleState.None);
    deploy.iconPath = new vscode.ThemeIcon("cloud-upload", QUICK_ACTION_COLOR);
    deploy.command = {
        command: "antigravity.deploy",
        title: "Run Deploy"
    };
    items.push(deploy);
    const incrementMajor = new NodeItem({ kind: "action", label: "Increment Major Version" }, vscode.TreeItemCollapsibleState.None);
    incrementMajor.iconPath = new vscode.ThemeIcon("arrow-up", QUICK_ACTION_COLOR);
    incrementMajor.command = {
        command: "antigravity.incrementMajorVersion",
        title: "Increment Major Version"
    };
    items.push(incrementMajor);
    const incrementMinor = new NodeItem({ kind: "action", label: "Increment Minor Version" }, vscode.TreeItemCollapsibleState.None);
    incrementMinor.iconPath = new vscode.ThemeIcon("arrow-up", QUICK_ACTION_COLOR);
    incrementMinor.command = {
        command: "antigravity.incrementMinorVersion",
        title: "Increment Minor Version"
    };
    items.push(incrementMinor);
    const incrementPatch = new NodeItem({ kind: "action", label: "Increment Patch Version" }, vscode.TreeItemCollapsibleState.None);
    incrementPatch.iconPath = new vscode.ThemeIcon("arrow-up", QUICK_ACTION_COLOR);
    incrementPatch.command = {
        command: "antigravity.incrementPatchVersion",
        title: "Increment Patch Version"
    };
    items.push(incrementPatch);
    const createRepoTagVersion = new NodeItem({ kind: "action", label: "Create Repo Tag Version" }, vscode.TreeItemCollapsibleState.None);
    createRepoTagVersion.iconPath = new vscode.ThemeIcon("tag", QUICK_ACTION_COLOR);
    createRepoTagVersion.command = {
        command: "antigravity.createRepoTagVersion",
        title: "Create Repo Tag Version"
    };
    items.push(createRepoTagVersion);
    const autocommitCheckpoint = new NodeItem({ kind: "action", label: autocommitRunning ? "Autocommit Stop" : "Autocommit Start" }, vscode.TreeItemCollapsibleState.None);
    autocommitCheckpoint.iconPath = new vscode.ThemeIcon("save-all", QUICK_ACTION_COLOR);
    autocommitCheckpoint.command = {
        command: "antigravity.autocommitCheckpoint",
        title: "Autocommit Checkpoint"
    };
    items.push(autocommitCheckpoint);
    const revertChanges = new NodeItem({ kind: "action", label: "Revert Changes" }, vscode.TreeItemCollapsibleState.None);
    if (autocommitRunning) {
        revertChanges.iconPath = new vscode.ThemeIcon("discard", QUICK_ACTION_COLOR);
        revertChanges.command = {
            command: "antigravity.autocommitRevert",
            title: "Revert Changes"
        };
    }
    else {
        revertChanges.label = "R̶e̶v̶e̶r̶t̶ ̶C̶h̶a̶n̶g̶e̶s̶";
        revertChanges.iconPath = new vscode.ThemeIcon("discard", new vscode.ThemeColor("disabledForeground"));
        revertChanges.tooltip = "Autocommit is not running.";
    }
    items.push(revertChanges);
    const environmentSwitch = new NodeItem({ kind: "action", label: "Environment Switch" }, vscode.TreeItemCollapsibleState.None);
    environmentSwitch.iconPath = new vscode.ThemeIcon("sync", QUICK_ACTION_COLOR);
    environmentSwitch.command = {
        command: "antigravity.switchEnvironment",
        title: "Switch Environment"
    };
    items.push(environmentSwitch);
    return items;
}
const ANTIGRAVITY_ROOT_HIDDEN = new Set([
    "argv.json",
    ".gitignore",
    ".DS_Store",
    "antigravity",
    ".git"
]);
function shouldHideAntigravityEntry(dirPath, entry) {
    const antigravityRoot = getAntigravityHomePath();
    if (!antigravityRoot)
        return false;
    if (path.resolve(dirPath) !== path.resolve(antigravityRoot))
        return false;
    return ANTIGRAVITY_ROOT_HIDDEN.has(entry.name);
}
function getRootPath() {
    const rootPath = vscode.workspace.getConfiguration("antigravity").get("rootPath");
    if (rootPath && fs.existsSync(rootPath))
        return rootPath;
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot)
        return undefined;
    const antigravityRoot = path.join(workspaceRoot, ".agent", "antigravity");
    if (fs.existsSync(antigravityRoot))
        return antigravityRoot;
    if (fs.existsSync(workspaceRoot))
        return workspaceRoot;
    return undefined;
}
function getAntigravityHomePath() {
    const homePath = "/Users/diego.brihuega/.antigravity";
    if (!fs.existsSync(homePath))
        return undefined;
    return homePath;
}
function missingRootItem() {
    const item = new NodeItem({ kind: "category", label: "Set antigravity.rootPath" }, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon("warning");
    item.tooltip = "Update the Antigravity settings to point to the .agent/antigravity folder.";
    return item;
}
function emptyItem(label) {
    const item = new NodeItem({ kind: "category", label }, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon("circle-slash");
    return item;
}
async function safeReadDir(dirPath) {
    try {
        return await fs.promises.readdir(dirPath, { withFileTypes: true });
    }
    catch {
        return [];
    }
}
function parseEnvFile(filePath) {
    const values = {};
    if (!fs.existsSync(filePath))
        return values;
    let content = "";
    try {
        content = fs.readFileSync(filePath, "utf8");
    }
    catch {
        return values;
    }
    for (const rawLine of content.split(/\r?\n/)) {
        let line = rawLine.trim();
        if (!line || line.startsWith("#"))
            continue;
        if (line.startsWith("export ")) {
            line = line.slice("export ".length).trim();
        }
        const eqIndex = line.indexOf("=");
        if (eqIndex <= 0)
            continue;
        const key = line.slice(0, eqIndex).trim();
        let value = line.slice(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (key)
            values[key.toLowerCase()] = value;
    }
    return values;
}
function isTruthyEnvValue(value) {
    const normalized = value.trim().toLowerCase();
    return (normalized === "1" ||
        normalized === "true" ||
        normalized === "yes" ||
        normalized === "on" ||
        normalized === "running" ||
        normalized === "started" ||
        normalized === "start" ||
        normalized === "enabled");
}
function isFalsyEnvValue(value) {
    const normalized = value.trim().toLowerCase();
    return (normalized === "0" ||
        normalized === "false" ||
        normalized === "no" ||
        normalized === "off" ||
        normalized === "stopped" ||
        normalized === "stop" ||
        normalized === "disabled");
}
function isAutocommitRunning(repoRoot) {
    const envPath = path.join(repoRoot, ".env");
    const env = parseEnvFile(envPath);
    const keys = [
        "autocommit_running",
        "autocommit_enabled",
        "autocommit_active",
        "autocommit_status",
        "autocommit",
        "autocommiting",
        "autocommitting"
    ];
    for (const key of keys) {
        const value = env[key];
        if (value === undefined)
            continue;
        if (isFalsyEnvValue(value))
            return false;
        return isTruthyEnvValue(value);
    }
    const pid = env.autocommit_pid;
    if (pid && /^[0-9]+$/.test(pid.trim()))
        return true;
    return false;
}
async function listInfrastructureYamlFiles(repoRoot) {
    const infraRoot = path.join(repoRoot, "config", "Infrastructure");
    if (!fs.existsSync(infraRoot))
        return [];
    const results = [];
    const stack = [infraRoot];
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current)
            break;
        let entries;
        try {
            entries = await fs.promises.readdir(current, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(fullPath);
                continue;
            }
            if (!entry.isFile())
                continue;
            const ext = path.extname(entry.name).toLowerCase();
            if (ext === ".yaml" || ext === ".yml") {
                results.push(fullPath);
            }
        }
    }
    return results.sort((a, b) => a.localeCompare(b));
}
function getRepoRoot(rootPath) {
    const normalized = path.resolve(rootPath);
    const parts = normalized.split(path.sep);
    if (parts.length >= 2 && parts[parts.length - 2] === ".agent" && parts[parts.length - 1] === "antigravity") {
        return path.resolve(normalized, "..", "..");
    }
    return normalized;
}
function getWorkspaceRoot() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0)
        return undefined;
    return folders[0].uri.fsPath;
}
function getWorkflowScriptPath(rootPath, workflowFile) {
    const repoRoot = getRepoRoot(rootPath);
    const workspaceRoot = getWorkspaceRoot() || repoRoot;
    const workflowName = path.basename(workflowFile, ".md");
    return path.join(repoRoot, "scripts", `${workflowName}.sh`);
}
function getScriptPath(rootPath, scriptName) {
    const repoRoot = getRepoRoot(rootPath);
    return path.join(repoRoot, "scripts", `${scriptName}.sh`);
}
function getTerminalName() {
    return (vscode.workspace.getConfiguration("antigravity").get("terminalName") ||
        "Antigravity Workflow");
}
function getAgentTerminalName() {
    return (vscode.workspace.getConfiguration("antigravity").get("agentTerminalName") ||
        "Antigravity Agent");
}
function getAgenticPlatform() {
    const platform = vscode.workspace.getConfiguration("antigravity").get("agenticPlatform");
    if (platform === "codex")
        return "codex";
    if (platform === "ollama")
        return "ollama";
    if (platform === "antigravity")
        return "antigravity";
    return "openclaude";
}
async function selectAgenticPlatform() {
    const current = getAgenticPlatform();
    const selection = await vscode.window.showQuickPick([
        {
            label: "Antigravity Agent",
            value: "antigravity",
            description: "Run agents with the IDE-selected Antigravity model"
        },
        { label: "OpenClaude", value: "openclaude", description: "Run agents with OpenClaude" },
        { label: "Codex", value: "codex", description: "Run agents with OpenAI Codex" },
        { label: "Ollama", value: "ollama", description: "Run agents with Ollama" }
    ], {
        title: "Select Agentic Platform",
        placeHolder: "Choose how agents should run"
    });
    if (!selection || selection.value === current)
        return;
    const target = vscode.workspace.workspaceFolders
        ? vscode.ConfigurationTarget.Workspace
        : vscode.ConfigurationTarget.Global;
    await vscode.workspace
        .getConfiguration("antigravity")
        .update("agenticPlatform", selection.value, target);
}
function getOpenClaudeExecutable() {
    const antigravityConfig = vscode.workspace.getConfiguration("antigravity");
    const override = antigravityConfig.get("openClaudePath");
    if (override)
        return override;
    const openClaudeConfig = vscode.workspace.getConfiguration("openclaude");
    return openClaudeConfig.get("executablePath") || "openclaude";
}
function getAntigravityExecutable() {
    return (vscode.workspace.getConfiguration("antigravity").get("antigravityPath") ||
        "antigravity");
}
function getAntigravityArgsTemplate() {
    return (vscode.workspace.getConfiguration("antigravity").get("antigravityArgs") ||
        '--agent "{agent}"');
}
function getCodexExecutable() {
    return vscode.workspace.getConfiguration("antigravity").get("codexPath") || "codex";
}
function getCodexArgsTemplate() {
    return (vscode.workspace.getConfiguration("antigravity").get("codexArgs") ||
        'exec "@{agent} on this project" --skip-git-repo-check');
}
function getOllamaExecutable() {
    return vscode.workspace.getConfiguration("antigravity").get("ollamaPath") || "ollama";
}
function getOllamaArgsTemplate() {
    return vscode.workspace.getConfiguration("antigravity").get("ollamaArgs") || 'run "{agent}"';
}
function interpolateAgentArgs(template, agentName, agentFile) {
    return template.replace(/\{agent\}/g, agentName).replace(/\{agentFile\}/g, agentFile);
}
function getOrCreateTerminal(name) {
    const existing = vscode.window.terminals.find((terminal) => terminal.name === name);
    if (existing)
        return existing;
    return vscode.window.createTerminal({ name });
}
function quoteShellArg(value) {
    return `"${value.replace(/"/g, '\\"')}"`;
}
async function runRepoScript(scriptName, args = [], options = {}) {
    const rootPath = getRootPath();
    if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
    }
    const repoRoot = getRepoRoot(rootPath);
    const workspaceRoot = getWorkspaceRoot() || repoRoot;
    const workingDir = options.cwd || repoRoot;
    const homePath = getAntigravityHomePath();
    const homeScript = homePath ? path.join(homePath, "scripts", `${scriptName}.sh`) : undefined;
    const repoScript = getScriptPath(rootPath, scriptName);
    const scriptPath = (homeScript && fs.existsSync(homeScript) ? homeScript : undefined) ||
        (fs.existsSync(repoScript) ? repoScript : undefined);
    if (!scriptPath) {
        void vscode.window.showErrorMessage(`Script not found: ${homeScript ? " ~/.antigravity/scripts/" : ""}scripts/${scriptName}.sh`);
        return;
    }
    const terminal = getOrCreateTerminal(getTerminalName());
    terminal.show(true);
    terminal.sendText(`cd "${workingDir}"`);
    const argString = args.map((arg) => quoteShellArg(arg)).join(" ");
    const command = argString ? `${quoteShellArg(scriptPath)} ${argString}` : quoteShellArg(scriptPath);
    terminal.sendText(command);
}
async function openFile(filePath) {
    const uri = vscode.Uri.file(filePath);
    await vscode.window.showTextDocument(uri, { preview: false });
}
async function runWorkflow(workflowFile) {
    const rootPath = getRootPath();
    if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
    }
    const scriptPath = getWorkflowScriptPath(rootPath, workflowFile);
    if (fs.existsSync(scriptPath)) {
        const repoRoot = getRepoRoot(rootPath);
        const terminal = getOrCreateTerminal(getTerminalName());
        terminal.show(true);
        terminal.sendText(`cd "${repoRoot}"`);
        terminal.sendText(`./scripts/${path.basename(scriptPath)}`);
        return;
    }
    await openFile(workflowFile);
}
async function runAgent(agentName, agentFile) {
    const rootPath = getRootPath();
    if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
    }
    const repoRoot = getRepoRoot(rootPath);
    const terminal = getOrCreateTerminal(getAgentTerminalName());
    terminal.show(true);
    terminal.sendText(`cd "${repoRoot}"`);
    const safeAgentName = agentName.replace(/"/g, '\\"');
    const safeAgentFile = agentFile.replace(/"/g, '\\"');
    const platform = getAgenticPlatform();
    if (platform === "codex") {
        const command = getCodexExecutable();
        const args = interpolateAgentArgs(getCodexArgsTemplate(), safeAgentName, safeAgentFile).trim();
        terminal.sendText(args ? `${command} ${args}` : command);
        return;
    }
    if (platform === "ollama") {
        const command = getOllamaExecutable();
        const args = interpolateAgentArgs(getOllamaArgsTemplate(), safeAgentName, safeAgentFile).trim();
        terminal.sendText(args ? `${command} ${args}` : command);
        return;
    }
    if (platform === "antigravity") {
        const command = getAntigravityExecutable();
        const args = interpolateAgentArgs(getAntigravityArgsTemplate(), safeAgentName, safeAgentFile).trim();
        terminal.sendText(args ? `${command} ${args}` : command);
        return;
    }
    const command = getOpenClaudeExecutable();
    terminal.sendText(`${command} --agent "${safeAgentName}"`);
}
function activate(context) {
    const provider = new AntigravityViewProvider();
    context.subscriptions.push(vscode.window.registerTreeDataProvider("antigravityView", provider));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.refresh", () => provider.refresh()));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.selectPlatform", async () => {
        await selectAgenticPlatform();
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
        await runAgent(agentName, filePath);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openAgent", async (filePath) => {
        if (!filePath || !fs.existsSync(filePath)) {
            void vscode.window.showErrorMessage("Agent file not found.");
            return;
        }
        await openFile(filePath);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.runWorkflow", async (filePath) => {
        if (!filePath || !fs.existsSync(filePath)) {
            void vscode.window.showErrorMessage("Workflow file not found.");
            return;
        }
        await runWorkflow(filePath);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.workspaceSetup", async () => {
        const rootPath = getRootPath();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = getRepoRoot(rootPath);
        const hasAgentFolder = fs.existsSync(path.join(repoRoot, ".agent"));
        if (hasAgentFolder) {
            const selection = await vscode.window.showWarningMessage("There is already a .agent at the project. Do you still want to run Workspace Setup?", { modal: true }, "Yes", "No");
            if (selection !== "Yes")
                return;
        }
        await runRepoScript("workspace-setup", ["--force"]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.buildVersion", async () => {
        await runRepoScript("build-version");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.createRepository", async () => {
        await runRepoScript("create-repo");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.createInfrastructure", async () => {
        const rootPath = getRootPath();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = getRepoRoot(rootPath);
        const infraFiles = await listInfrastructureYamlFiles(repoRoot);
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
        await runRepoScript("create-infra", [selection.value], {
            cwd: repoRoot
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.deploy", async () => {
        await runRepoScript("deploy");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.incrementMajorVersion", async () => {
        await runRepoScript("bump-version", ["major"]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.incrementMinorVersion", async () => {
        await runRepoScript("bump-version", ["minor"]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.incrementPatchVersion", async () => {
        await runRepoScript("bump-version", ["patch"]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.createRepoTagVersion", async () => {
        const description = await vscode.window.showInputBox({
            title: "Create Repo Tag Version",
            prompt: "Add a tag description (optional)"
        });
        if (description === undefined)
            return;
        const trimmed = description.trim();
        await runRepoScript("commit-push-tag", trimmed ? [trimmed] : []);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.autocommitCheckpoint", async () => {
        const rootPath = getRootPath();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = getRepoRoot(rootPath);
        const scriptPath = path.join(repoRoot, "scripts", "autocommit_changes.py");
        if (!fs.existsSync(scriptPath)) {
            void vscode.window.showErrorMessage(`Script not found: ${scriptPath}`);
            return;
        }
        const action = isAutocommitRunning(repoRoot) ? "stop" : "start";
        const terminal = getOrCreateTerminal(getTerminalName());
        terminal.show(true);
        terminal.sendText(`cd "${repoRoot}"; ./scripts/autocommit_changes.py ${action}; ./scripts/autocommit_changes.py status`);
        void vscode.commands.executeCommand("antigravity.refresh");
        setTimeout(() => {
            void vscode.commands.executeCommand("antigravity.refresh");
        }, 1000);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.autocommitRevert", async () => {
        const rootPath = getRootPath();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = getRepoRoot(rootPath);
        const bareScript = path.join(repoRoot, "scripts", "autocommit_revert");
        const shScript = path.join(repoRoot, "scripts", "autocommit_revert.sh");
        const scriptPath = fs.existsSync(bareScript) ? bareScript : fs.existsSync(shScript) ? shScript : undefined;
        if (!scriptPath) {
            void vscode.window.showErrorMessage(`Script not found: ${path.join(repoRoot, "scripts", "autocommit_revert")}`);
            return;
        }
        const scriptCommand = scriptPath === bareScript ? "./scripts/autocommit_revert" : "./scripts/autocommit_revert.sh";
        const terminal = getOrCreateTerminal(getTerminalName());
        terminal.show(true);
        terminal.sendText(`cd "${repoRoot}" && ${scriptCommand}`);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.switchEnvironment", async () => {
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
        await runRepoScript("switch-env", [selection.value]);
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("antigravity.agenticPlatform")) {
            provider.refresh();
        }
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map