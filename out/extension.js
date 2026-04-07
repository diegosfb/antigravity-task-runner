"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const https = require("https");
const os = require("os");
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
                ? vscode.TreeItemCollapsibleState.Collapsed
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
            const claudeItems = getClaudeActionItems();
            const actionSeparator = new NodeItem({ kind: "separator", label: "────────" }, vscode.TreeItemCollapsibleState.None);
            actionSeparator.tooltip = "";
            actionSeparator.contextValue = "antigravitySeparator";
            const claudeSeparator = new NodeItem({ kind: "separator", label: "────────" }, vscode.TreeItemCollapsibleState.None);
            claudeSeparator.tooltip = "";
            claudeSeparator.contextValue = "antigravitySeparator";
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
            const agents = new NodeItem({ kind: "category", label: "Agents" }, vscode.TreeItemCollapsibleState.Collapsed);
            agents.iconPath = new vscode.ThemeIcon("organization");
            const workflows = new NodeItem({ kind: "category", label: "Workflows" }, vscode.TreeItemCollapsibleState.Collapsed);
            workflows.iconPath = new vscode.ThemeIcon("run-all");
            return [
                ...claudeItems,
                claudeSeparator,
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
const CLAUDE_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiYellow");
const CLAUDE_MODEL_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiBlue");
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
    const initRepo = new NodeItem({ kind: "action", label: "Init Repository" }, vscode.TreeItemCollapsibleState.None);
    initRepo.iconPath = new vscode.ThemeIcon("repo", QUICK_ACTION_COLOR);
    if (hasRepo) {
        initRepo.label = "I̶n̶i̶t̶ ̶R̶e̶p̶o̶s̶i̶t̶o̶r̶y̶";
        initRepo.iconPath = new vscode.ThemeIcon("repo", new vscode.ThemeColor("disabledForeground"));
        initRepo.tooltip = "Repository already exists in this project.";
    }
    else {
        initRepo.command = {
            command: "antigravity.initRepository",
            title: "Init Repository"
        };
    }
    items.push(initRepo);
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
function getClaudeActionItems() {
    const item = new NodeItem({ kind: "action", label: "Claude Terminal" }, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR);
    item.command = {
        command: "antigravity.openClaudeTerminal",
        title: "Open Claude Terminal"
    };
    const setClaudeModel = new NodeItem({ kind: "action", label: "Set Claude Model" }, vscode.TreeItemCollapsibleState.None);
    setClaudeModel.iconPath = new vscode.ThemeIcon("repo", CLAUDE_MODEL_ACTION_COLOR);
    setClaudeModel.command = {
        command: "antigravity.setClaudeModel",
        title: "Set Claude Model"
    };
    return [item, setClaudeModel];
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
function getScriptFilePath(repoRoot, scriptFileName) {
    return path.join(repoRoot, "scripts", scriptFileName);
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
const SECONDARY_TERMINAL_COMMANDS = {
    create: "secondaryTerminal.createTerminal",
    focus: "secondaryTerminal.focusTerminal",
    send: "secondaryTerminal.sendToTerminal"
};
async function hasSecondaryTerminal() {
    const commands = await vscode.commands.getCommands(true);
    return (commands.includes(SECONDARY_TERMINAL_COMMANDS.create) &&
        commands.includes(SECONDARY_TERMINAL_COMMANDS.send));
}
async function runInSecondaryTerminal(lines) {
    const available = await hasSecondaryTerminal();
    if (!available) {
        const terminal = getOrCreateTerminal(getTerminalName());
        terminal.show();
        for (const line of lines) {
            terminal.sendText(line, true);
        }
        void vscode.window.showWarningMessage("Secondary Terminal extension not available. Ran the task in the default terminal instead.");
        return true;
    }
    try {
        await vscode.commands.executeCommand(SECONDARY_TERMINAL_COMMANDS.create);
        await vscode.commands.executeCommand(SECONDARY_TERMINAL_COMMANDS.focus);
        for (const line of lines) {
            await vscode.commands.executeCommand(SECONDARY_TERMINAL_COMMANDS.send, line);
        }
        return true;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        void vscode.window.showErrorMessage(`Failed to send commands to Secondary Terminal: ${message}`);
        return false;
    }
}
function getOrCreateTerminal(name) {
    const existing = vscode.window.terminals.find((terminal) => terminal.name === name);
    if (existing)
        return existing;
    return vscode.window.createTerminal({ name });
}
function runInNewTerminal(name, lines, options = {}) {
    const terminal = vscode.window.createTerminal({ name, ...options });
    terminal.show();
    for (const line of lines) {
        terminal.sendText(line, true);
    }
}
function quoteShellArg(value) {
    return `"${value.replace(/"/g, '\\"')}"`;
}
const SCRIPT_FALLBACK_BASE_URL = "https://raw.githubusercontent.com/diegosfb/antigravity-workspace";
function normalizeGithubRawUrl(url) {
    if (url.includes("github.com/") && !url.includes("raw.githubusercontent.com")) {
        return url
            .replace("https://github.com/", "https://raw.githubusercontent.com/")
            .replace("/blob/", "/");
    }
    return url.replace(/\/+$/, "");
}
function buildScriptFallbackUrls(baseUrl, scriptFileName) {
    const trimmed = normalizeGithubRawUrl(baseUrl);
    const urls = [];
    const add = (url) => {
        if (!urls.includes(url))
            urls.push(url);
    };
    const hasScriptsSuffix = trimmed.endsWith("/scripts");
    const baseWithoutScripts = hasScriptsSuffix ? trimmed.slice(0, -"/scripts".length) : trimmed;
    const hasBranch = /\/(main|master)(\/|$)/.test(baseWithoutScripts);
    if (hasBranch) {
        const primaryBase = hasScriptsSuffix ? trimmed : `${baseWithoutScripts}/scripts`;
        add(`${primaryBase}/${scriptFileName}`);
        if (baseWithoutScripts.includes("/main/")) {
            const swapped = baseWithoutScripts.replace("/main/", "/master/");
            add(`${swapped}/scripts/${scriptFileName}`);
        }
        else if (baseWithoutScripts.includes("/master/")) {
            const swapped = baseWithoutScripts.replace("/master/", "/main/");
            add(`${swapped}/scripts/${scriptFileName}`);
        }
    }
    else {
        add(`${baseWithoutScripts}/main/scripts/${scriptFileName}`);
        add(`${baseWithoutScripts}/master/scripts/${scriptFileName}`);
    }
    return urls;
}
function getScriptFallbackUrls(scriptFileName) {
    const config = vscode.workspace.getConfiguration("antigravity");
    const urls = [];
    const initRepoOverride = config.get("initRepoFallbackUrl");
    if (scriptFileName === "init-repo.sh" && initRepoOverride && initRepoOverride.trim()) {
        const normalized = normalizeGithubRawUrl(initRepoOverride.trim());
        if (normalized.endsWith(".sh")) {
            urls.push(normalized);
        }
        else {
            urls.push(...buildScriptFallbackUrls(normalized, scriptFileName));
        }
    }
    const baseUrl = config.get("scriptFallbackBaseUrl") || SCRIPT_FALLBACK_BASE_URL;
    urls.push(...buildScriptFallbackUrls(baseUrl, scriptFileName));
    return Array.from(new Set(urls));
}
function downloadFile(url, destination) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, (response) => {
            if (response.statusCode &&
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location) {
                response.resume();
                void downloadFile(response.headers.location, destination).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                const status = response.statusCode ?? "unknown";
                response.resume();
                reject(new Error(`Request failed with status ${status}`));
                return;
            }
            const fileStream = fs.createWriteStream(destination, { mode: 0o755 });
            response.pipe(fileStream);
            fileStream.on("finish", () => {
                fileStream.close((closeError) => {
                    if (closeError) {
                        reject(closeError);
                        return;
                    }
                    resolve();
                });
            });
            fileStream.on("error", (error) => {
                fileStream.close(() => reject(error));
            });
        });
        request.on("error", (error) => {
            reject(error);
        });
    });
}
function parseOptionalString(value) {
    return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
function normalizeStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.filter((item) => typeof item === "string" && item.trim().length > 0);
}
function getRouterSettings(config, router) {
    const key = `${router}-settings`;
    const raw = config[key];
    if (!raw || typeof raw !== "object")
        return undefined;
    const data = raw;
    return {
        baseurl: typeof data.baseurl === "string" ? data.baseurl : "",
        auth_token: typeof data.auth_token === "string" ? data.auth_token : "",
        apikey: typeof data.apikey === "string" ? data.apikey : "",
        models: normalizeStringArray(data.models),
        post_run: parseOptionalString(data.post_run)
    };
}
async function loadOpenRouterConfig() {
    const filePath = path.join(os.homedir(), ".claude", "routerconfig.json");
    if (!fs.existsSync(filePath)) {
        void vscode.window.showErrorMessage(`routerconfig.json not found at ${filePath}`);
        return null;
    }
    try {
        const raw = await fs.promises.readFile(filePath, "utf8");
        const data = JSON.parse(raw);
        return data;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        void vscode.window.showErrorMessage(`Failed to read routerconfig.json: ${message}`);
        return null;
    }
}
async function loadClaudeSettings() {
    const settingsPath = path.join(os.homedir(), ".claude", "settings.json");
    if (!fs.existsSync(settingsPath))
        return null;
    try {
        const raw = await fs.promises.readFile(settingsPath, "utf8");
        const data = JSON.parse(raw);
        const envRaw = typeof data.env === "object" && data.env ? data.env : {};
        const env = {
            ANTHROPIC_MODEL: parseOptionalString(envRaw.ANTHROPIC_MODEL),
            ANTHROPIC_BASE_URL: parseOptionalString(envRaw.ANTHROPIC_BASE_URL),
            ANTHROPIC_AUTH_TOKEN: parseOptionalString(envRaw.ANTHROPIC_AUTH_TOKEN),
            ANTHROPIC_API_KEY: parseOptionalString(envRaw.ANTHROPIC_API_KEY)
        };
        return {
            env,
            effortLevel: parseOptionalString(data.effortLevel),
            model: parseOptionalString(data.model)
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        void vscode.window.showErrorMessage(`Failed to read ~/.claude/settings.json: ${message}`);
        return null;
    }
}
function getNonce() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let nonce = "";
    for (let i = 0; i < 32; i += 1) {
        nonce += chars[Math.floor(Math.random() * chars.length)];
    }
    return nonce;
}
function renderClaudeModelConfigHtml(webview, config, claudeSettings) {
    const nonce = getNonce();
    const routers = normalizeStringArray(config.routers);
    const effortLevels = normalizeStringArray(config["claude-effort-levels"]);
    const internalBehaviours = normalizeStringArray(config["claude-internalbehaviour"]);
    const routerSettings = {};
    for (const router of routers) {
        const settings = getRouterSettings(config, router);
        if (settings) {
            routerSettings[router] = settings;
        }
    }
    const payload = {
        routers,
        effortLevels,
        internalBehaviours,
        routerSettings,
        initialValues: {
            model: claudeSettings?.env?.ANTHROPIC_MODEL,
            effortLevel: claudeSettings?.effortLevel,
            internalBehaviour: claudeSettings?.model,
            baseurl: claudeSettings?.env?.ANTHROPIC_BASE_URL,
            authToken: claudeSettings?.env?.ANTHROPIC_AUTH_TOKEN,
            apiKey: claudeSettings?.env?.ANTHROPIC_API_KEY
        }
    };
    const csp = `default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Set Claude Model</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--vscode-foreground);
        background: var(--vscode-editor-background);
        margin: 0;
        padding: 24px;
      }
      h1 {
        font-size: 18px;
        margin: 0 0 16px;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      label {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }
      select, input {
        padding: 8px 10px;
        border-radius: 6px;
        border: 1px solid var(--vscode-input-border);
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        font-size: 13px;
      }
      input[readonly] {
        color: var(--vscode-disabledForeground);
      }
      .actions {
        margin-top: 20px;
        display: flex;
        justify-content: flex-end;
      }
      button {
        padding: 8px 14px;
        border-radius: 6px;
        border: none;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .error {
        color: var(--vscode-errorForeground);
        font-size: 12px;
        margin-top: 8px;
      }
      .hidden {
        display: none;
      }
    </style>
  </head>
  <body>
    <h1>Set Claude Model</h1>
    <div class="grid">
      <div class="field">
        <label for="router">Select Model Router</label>
        <select id="router"></select>
      </div>
      <div class="field">
        <label for="model">Select Model</label>
        <select id="model"></select>
      </div>
      <div class="field">
        <label for="effort">Effort Level</label>
        <select id="effort"></select>
      </div>
      <div class="field hidden">
        <label for="internal">Claude Internal Behaviour</label>
        <select id="internal"></select>
      </div>
      <div class="field">
        <label for="baseurl">Base URL</label>
        <input id="baseurl" type="text" readonly />
      </div>
      <div class="field">
        <label for="authToken">Auth Token</label>
        <input id="authToken" type="password" readonly />
      </div>
      <div class="field">
        <label for="apiKey">API Key</label>
        <input id="apiKey" type="password" readonly />
      </div>
    </div>
    <div class="actions">
      <button id="apply">Apply</button>
    </div>
    <div class="error" id="error"></div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const data = ${JSON.stringify(payload)};
      const routerSelect = document.getElementById("router");
      const modelSelect = document.getElementById("model");
      const effortSelect = document.getElementById("effort");
      const internalSelect = document.getElementById("internal");
      const baseUrlInput = document.getElementById("baseurl");
      const authTokenInput = document.getElementById("authToken");
      const apiKeyInput = document.getElementById("apiKey");
      const errorEl = document.getElementById("error");
      const applyBtn = document.getElementById("apply");
      const initialValues = data.initialValues || {};

      function fillSelect(select, items, colorizer) {
        select.innerHTML = "";
        items.forEach((item) => {
          const option = document.createElement("option");
          option.value = item;
          option.textContent = item;
          if (colorizer) {
            const color = colorizer(item);
            if (color) option.style.color = color;
          }
          select.appendChild(option);
        });
      }

      function selectByValue(select, value) {
        if (!value) return false;
        const index = Array.from(select.options).findIndex((option) => option.value === value);
        if (index >= 0) {
          select.selectedIndex = index;
          return true;
        }
        return false;
      }

      function findInitialRouter() {
        const routers = Object.keys(data.routerSettings || {});
        if (initialValues.router && data.routerSettings[initialValues.router]) {
          return initialValues.router;
        }
        if (initialValues.baseurl) {
          const byBaseUrl = routers.find(
            (router) => data.routerSettings[router]?.baseurl === initialValues.baseurl
          );
          if (byBaseUrl) return byBaseUrl;
        }
        if (initialValues.model) {
          const byModel = routers.find((router) =>
            (data.routerSettings[router]?.models || []).includes(initialValues.model)
          );
          if (byModel) return byModel;
        }
        if (initialValues.authToken || initialValues.apiKey) {
          const byCreds = routers.find((router) => {
            const settings = data.routerSettings[router] || {};
            return (
              (initialValues.authToken && settings.auth_token === initialValues.authToken) ||
              (initialValues.apiKey && settings.apikey === initialValues.apiKey)
            );
          });
          if (byCreds) return byCreds;
        }
        return routers[0];
      }

      function updateRouterFields() {
        const router = routerSelect.value;
        const settings = data.routerSettings[router];
        if (!settings) {
          errorEl.textContent = \`Missing \${router}-settings in routerconfig.json\`;
          applyBtn.disabled = true;
          return;
        }
        errorEl.textContent = "";
        applyBtn.disabled = false;
        baseUrlInput.value = settings.baseurl || "";
        authTokenInput.value = settings.auth_token || "";
        apiKeyInput.value = settings.apikey || "";
        const routerLower = (router || "").toLowerCase();
        const modelColorizer =
          routerLower === "openrouter"
            ? (value) => (value.toLowerCase().includes("free") ? "#3fb950" : "#ffffff")
            : routerLower === "ollama"
              ? (value) => (value.toLowerCase().includes("cloud") ? "#3fb950" : "#58a6ff")
              : undefined;
        fillSelect(modelSelect, settings.models || [], modelColorizer);
      }

      fillSelect(routerSelect, data.routers || []);
      fillSelect(effortSelect, data.effortLevels || []);
      fillSelect(internalSelect, data.internalBehaviours || []);

      if (routerSelect.options.length > 0) {
        const initialRouter = findInitialRouter();
        if (initialRouter) {
          selectByValue(routerSelect, initialRouter);
        } else {
          routerSelect.selectedIndex = 0;
        }
        updateRouterFields();
        selectByValue(modelSelect, initialValues.model);
        selectByValue(effortSelect, initialValues.effortLevel);
        selectByValue(internalSelect, initialValues.internalBehaviour);
      } else {
        errorEl.textContent = "No routers found in routerconfig.json.";
        applyBtn.disabled = true;
      }

      routerSelect.addEventListener("change", updateRouterFields);

      applyBtn.addEventListener("click", () => {
        if (!routerSelect.value || !modelSelect.value || !effortSelect.value || !internalSelect.value) {
          errorEl.textContent = "All fields are required.";
          return;
        }
        vscode.postMessage({
          type: "applyClaudeModel",
          payload: {
            router: routerSelect.value,
            model: modelSelect.value,
            effortLevel: effortSelect.value,
            internalBehaviour: internalSelect.value
          }
        });
      });
    </script>
  </body>
</html>`;
}
async function downloadScript(scriptFileName, repoRoot) {
    const urls = getScriptFallbackUrls(scriptFileName);
    let lastError;
    try {
        const scriptsDir = path.join(repoRoot, "scripts");
        await fs.promises.mkdir(scriptsDir, { recursive: true });
        const destination = path.join(scriptsDir, scriptFileName);
        for (const url of urls) {
            try {
                await downloadFile(url, destination);
                await fs.promises.chmod(destination, 0o755);
                return destination;
            }
            catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                lastError = `${url} (${message})`;
                try {
                    await fs.promises.unlink(destination);
                }
                catch {
                    // ignore cleanup errors
                }
            }
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        lastError = message;
    }
    if (lastError) {
        void vscode.window.showErrorMessage(`Failed to download ${scriptFileName}. Last error: ${lastError}`);
    }
    else {
        void vscode.window.showErrorMessage(`Failed to download ${scriptFileName}.`);
    }
    return undefined;
}
async function ensureScriptFile(repoRoot, scriptFileName) {
    const scriptPath = getScriptFilePath(repoRoot, scriptFileName);
    if (fs.existsSync(scriptPath)) {
        return scriptPath;
    }
    return await downloadScript(scriptFileName, repoRoot);
}
async function runRepoScript(scriptName, args = [], options = {}) {
    const rootPath = getRootPath();
    if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
    }
    const repoRoot = getRepoRoot(rootPath);
    const workingDir = options.cwd || repoRoot;
    const scriptFileName = `${scriptName}.sh`;
    let scriptPath;
    scriptPath = await ensureScriptFile(repoRoot, scriptFileName);
    if (!scriptPath)
        return;
    const argString = args.map((arg) => quoteShellArg(arg)).join(" ");
    const command = argString ? `${quoteShellArg(scriptPath)} ${argString}` : quoteShellArg(scriptPath);
    await runInSecondaryTerminal([`cd "${workingDir}"`, command]);
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
        await runInSecondaryTerminal([
            `cd "${repoRoot}"`,
            `./scripts/${path.basename(scriptPath)}`
        ]);
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
    const safeAgentName = agentName.replace(/"/g, '\\"');
    const safeAgentFile = agentFile.replace(/"/g, '\\"');
    const platform = getAgenticPlatform();
    if (platform === "codex") {
        const command = getCodexExecutable();
        const args = interpolateAgentArgs(getCodexArgsTemplate(), safeAgentName, safeAgentFile).trim();
        await runInSecondaryTerminal([`cd "${repoRoot}"`, args ? `${command} ${args}` : command]);
        return;
    }
    if (platform === "ollama") {
        const command = getOllamaExecutable();
        const args = interpolateAgentArgs(getOllamaArgsTemplate(), safeAgentName, safeAgentFile).trim();
        await runInSecondaryTerminal([`cd "${repoRoot}"`, args ? `${command} ${args}` : command]);
        return;
    }
    if (platform === "antigravity") {
        const command = getAntigravityExecutable();
        const args = interpolateAgentArgs(getAntigravityArgsTemplate(), safeAgentName, safeAgentFile).trim();
        await runInSecondaryTerminal([`cd "${repoRoot}"`, args ? `${command} ${args}` : command]);
        return;
    }
    const command = getOpenClaudeExecutable();
    await runInSecondaryTerminal([`cd "${repoRoot}"`, `${command} --agent "${safeAgentName}"`]);
}
function activate(context) {
    const provider = new AntigravityViewProvider();
    const extensionRoot = context.extensionPath;
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
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openClaudeTerminal", async () => {
        const rootPath = getRootPath();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = getRepoRoot(rootPath);
        runInNewTerminal("Claude", [`cd "${repoRoot}"`, "claude"], {
            iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
            color: CLAUDE_ACTION_COLOR
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openOllamaClaudeTerminal", async () => {
        const rootPath = getRootPath();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = getRepoRoot(rootPath);
        runInNewTerminal("Ollama Claude", [`cd "${repoRoot}"`, "ollama launch claude"], {
            iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
            color: CLAUDE_ACTION_COLOR
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openOpenClaudeTerminal", async () => {
        const rootPath = getRootPath();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = getRepoRoot(rootPath);
        runInNewTerminal("OpenClaude", [`cd "${repoRoot}"`, getOpenClaudeExecutable()], {
            iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
            color: CLAUDE_ACTION_COLOR
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.setClaudeModel", async () => {
        const config = await loadOpenRouterConfig();
        if (!config)
            return;
        const routers = normalizeStringArray(config.routers);
        if (routers.length === 0) {
            void vscode.window.showErrorMessage("routerconfig.json is missing a routers array.");
            return;
        }
        const panel = vscode.window.createWebviewPanel("antigravitySetClaudeModel", "Set Claude Model", vscode.ViewColumn.Active, { enableScripts: true });
        const claudeSettings = await loadClaudeSettings();
        panel.webview.html = renderClaudeModelConfigHtml(panel.webview, config, claudeSettings);
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
            const settings = getRouterSettings(config, router);
            if (!settings) {
                void vscode.window.showErrorMessage(`routerconfig.json is missing ${router}-settings configuration.`);
                return;
            }
            const rootPath = getRootPath();
            if (!rootPath) {
                void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
                return;
            }
            const repoRoot = getRepoRoot(rootPath);
            const command = "/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/Switch-ClaudeCode-Model" +
                ` --model ${quoteShellArg(model)}` +
                ` --baseurl ${quoteShellArg(settings.baseurl)}` +
                ` --auth-token ${quoteShellArg(settings.auth_token)}` +
                ` --api-key ${quoteShellArg(settings.apikey)}` +
                ` --effort-level ${quoteShellArg(effortLevel)}` +
                ` --internal-model ${quoteShellArg(internalBehaviour)}`;
            const commands = [`cd "${repoRoot}"`, command];
            const postRun = settings.post_run?.trim();
            if (postRun) {
                commands.push(`nohup sh -c ${quoteShellArg(postRun)} >/dev/null 2>&1 &`);
            }
            await runInSecondaryTerminal(commands);
            panel.dispose();
        }, undefined, context.subscriptions);
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
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.initRepository", async () => {
        const rootPath = getRootPath();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = getRepoRoot(rootPath);
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
        await runRepoScript("init-repo", [repoName.trim()]);
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
        const scriptFile = "autocommit_changes.py";
        const scriptPath = await ensureScriptFile(repoRoot, scriptFile);
        if (!scriptPath)
            return;
        const action = isAutocommitRunning(repoRoot) ? "stop" : "start";
        await runInSecondaryTerminal([
            `cd "${repoRoot}"; ./scripts/${scriptFile} ${action}; ./scripts/${scriptFile} status`
        ]);
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
        const scriptCandidates = ["autocommit_revert", "autocommit_revert.sh"];
        let scriptFile;
        for (const candidate of scriptCandidates) {
            const ensured = await ensureScriptFile(repoRoot, candidate);
            if (ensured) {
                scriptFile = candidate;
                break;
            }
        }
        if (!scriptFile)
            return;
        await runInSecondaryTerminal([`cd "${repoRoot}" && ./scripts/${scriptFile}`]);
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