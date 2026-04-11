"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AntigravityViewProvider = exports.NodeItem = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const os = require("os");
const utils_1 = require("./utils");
const git_1 = require("./git");
const terminal_1 = require("./terminal");
class NodeItem extends vscode.TreeItem {
    constructor(payload, collapsibleState) {
        super(payload.label, collapsibleState);
        this.kind = payload.kind;
        this.filePath = payload.filePath;
        this.sortKey = (payload.sortKey ?? payload.label).toLowerCase();
    }
}
exports.NodeItem = NodeItem;
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
            const antigravityRoot = (0, utils_1.getAntigravityHomePath)();
            const antigravityLabel = antigravityRoot ? path.basename(antigravityRoot) : ".antigravity";
            const antigravityItem = new NodeItem({ kind: "folder", label: antigravityLabel, filePath: antigravityRoot }, antigravityRoot
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None);
            antigravityItem.iconPath = new vscode.ThemeIcon("folder");
            antigravityItem.contextValue = "antigravityFolderItem";
            if (!antigravityRoot) {
                antigravityItem.label = "Missing ~/.gemini/antigravity";
                antigravityItem.iconPath = new vscode.ThemeIcon("warning");
                antigravityItem.tooltip = `Expected ${path.join(os.homedir(), ".gemini", "antigravity")} to exist.`;
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
            const agents = new NodeItem({ kind: "category", label: "Agents" }, vscode.TreeItemCollapsibleState.Collapsed);
            agents.iconPath = new vscode.ThemeIcon("organization");
            const workflows = new NodeItem({ kind: "category", label: "Workflows" }, vscode.TreeItemCollapsibleState.Collapsed);
            workflows.iconPath = new vscode.ThemeIcon("run-all");
            const linkedFolderItems = getLinkedFolderItems();
            return [
                ...claudeItems,
                claudeSeparator,
                antigravityItem,
                ...linkedFolderItems,
                actionSeparator,
                ...actionItems,
                separatorItem,
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
        const rootPath = (0, utils_1.getAntigravityHomePath)();
        if (!rootPath) {
            return [missingRootItem()];
        }
        const agentsDir = path.join(rootPath, "agents");
        const entries = await (0, utils_1.safeReadDir)(agentsDir);
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
        const rootPath = (0, utils_1.getAntigravityHomePath)();
        if (!rootPath) {
            return [missingRootItem()];
        }
        const workflowsDir = path.join(rootPath, "workflows");
        const entries = await (0, utils_1.safeReadDir)(workflowsDir);
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
        const entries = (await (0, utils_1.safeReadDir)(dirPath)).filter((entry) => !shouldHideAntigravityEntry(dirPath, entry));
        const itemsWithKind = entries.map((entry) => {
            const entryPath = path.join(dirPath, entry.name);
            const isDirectory = entry.isDirectory();
            const item = new NodeItem({ kind: "folder", label: entry.name, filePath: entryPath }, isDirectory
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None);
            item.iconPath = new vscode.ThemeIcon(isDirectory ? "folder" : "file");
            item.contextValue = "antigravityFolderItem";
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
exports.AntigravityViewProvider = AntigravityViewProvider;
const QUICK_ACTION_COLOR = new vscode.ThemeColor("charts.green");
const CLAUDE_MODEL_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiBlue");
const WHITE_FOLDER_COLOR = new vscode.ThemeColor("terminal.ansiWhite");
const TOP_LEVEL_LINKED_FOLDERS = [
    { label: "claude", path: path.join(os.homedir(), ".claude") },
    { label: "codex", path: path.join(os.homedir(), ".codex") },
    { label: "opencode", path: path.join(os.homedir(), ".config", "opencode") }
];
const ANTIGRAVITY_ROOT_HIDDEN = new Set([
    "argv.json",
    ".gitignore",
    ".DS_Store",
    "antigravity",
    ".git"
]);
function shouldHideAntigravityEntry(dirPath, entry) {
    const antigravityRoot = (0, utils_1.getAntigravityHomePath)();
    if (!antigravityRoot)
        return false;
    if (path.resolve(dirPath) !== path.resolve(antigravityRoot))
        return false;
    return ANTIGRAVITY_ROOT_HIDDEN.has(entry.name);
}
function missingRootItem() {
    const item = new NodeItem({ kind: "category", label: "Missing ~/.antigravity" }, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon("warning");
    item.tooltip = `Expected ${path.join(os.homedir(), ".gemini", "antigravity")} to exist.`;
    return item;
}
function emptyItem(label) {
    const item = new NodeItem({ kind: "category", label }, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon("circle-slash");
    return item;
}
function getLinkedFolderItems() {
    return TOP_LEVEL_LINKED_FOLDERS.filter((linked) => fs.existsSync(linked.path)).map((linked) => {
        const item = new NodeItem({ kind: "folder", label: linked.label, filePath: linked.path }, vscode.TreeItemCollapsibleState.Collapsed);
        item.iconPath = new vscode.ThemeIcon("folder", WHITE_FOLDER_COLOR);
        item.tooltip = linked.path;
        item.contextValue = "antigravityFolderItem";
        return item;
    });
}
function getQuickActionItems() {
    const items = [];
    const rootPath = (0, utils_1.getRootPath)();
    const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : undefined;
    const hasRepo = repoRoot ? fs.existsSync(path.join(repoRoot, ".git")) : false;
    const autocommitRunning = repoRoot ? (0, git_1.isAutocommitRunning)(repoRoot) : false;
    const hasAgentFolder = repoRoot ? fs.existsSync(path.join((0, utils_1.getWorkspaceProjectPath)(repoRoot), ".agent")) : false;
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
    item.iconPath = new vscode.ThemeIcon("robot", terminal_1.CLAUDE_ACTION_COLOR);
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
    const runLiteLLMOpenAI = new NodeItem({ kind: "action", label: "Run liteLLM OpenAI" }, vscode.TreeItemCollapsibleState.None);
    runLiteLLMOpenAI.iconPath = new vscode.ThemeIcon("rocket", CLAUDE_MODEL_ACTION_COLOR);
    runLiteLLMOpenAI.command = {
        command: "antigravity.runLiteLLMOpenAI",
        title: "Run liteLLM OpenAI"
    };
    const createClaudeMd = new NodeItem({ kind: "action", label: "Create CLAUDE.md" }, vscode.TreeItemCollapsibleState.None);
    createClaudeMd.iconPath = new vscode.ThemeIcon("debug-start", terminal_1.CLAUDE_ACTION_COLOR);
    createClaudeMd.command = {
        command: "antigravity.createClaudeMd",
        title: "Create CLAUDE.md"
    };
    const updateAgenticWorkspace = new NodeItem({ kind: "action", label: "Update Agentic Workspace" }, vscode.TreeItemCollapsibleState.None);
    updateAgenticWorkspace.iconPath = new vscode.ThemeIcon("cloud-upload", terminal_1.CLAUDE_ACTION_COLOR);
    updateAgenticWorkspace.command = {
        command: "antigravity.updateAgenticWorkspace",
        title: "Update Agentic Workspace"
    };
    const updateAgenticSetup = new NodeItem({ kind: "action", label: "Update Agentic Setup" }, vscode.TreeItemCollapsibleState.None);
    updateAgenticSetup.iconPath = new vscode.ThemeIcon("cloud-upload", terminal_1.CLAUDE_ACTION_COLOR);
    updateAgenticSetup.command = {
        command: "antigravity.updateAgenticSetup",
        title: "Update Agentic Setup"
    };
    return [item, setClaudeModel, runLiteLLMOpenAI, createClaudeMd, updateAgenticSetup];
}
//# sourceMappingURL=treeProvider.js.map