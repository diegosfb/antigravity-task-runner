"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AntigravityViewProvider = exports.NodeItem = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process_1 = require("child_process");
const util_1 = require("util");
const utils_1 = require("./utils");
const git_1 = require("./git");
const terminal_1 = require("./terminal");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
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
            agents.iconPath = new vscode.ThemeIcon("organization", new vscode.ThemeColor("charts.purple"));
            const skills = new NodeItem({ kind: "category", label: "Skills" }, vscode.TreeItemCollapsibleState.Collapsed);
            skills.iconPath = new vscode.ThemeIcon("symbol-method", new vscode.ThemeColor("charts.purple"));
            const workflows = new NodeItem({ kind: "category", label: "Workflows" }, vscode.TreeItemCollapsibleState.Collapsed);
            workflows.iconPath = new vscode.ThemeIcon("run-all", new vscode.ThemeColor("charts.purple"));
            const linkedFolderItems = getLinkedFolderItems();
            const claudePluginsPath = path.join(os.homedir(), ".claude", "plugins");
            const claudePlugins = new NodeItem({ kind: "folder", label: "Claude Plugins", filePath: claudePluginsPath }, vscode.TreeItemCollapsibleState.Collapsed);
            claudePlugins.iconPath = new vscode.ThemeIcon("extensions", new vscode.ThemeColor("charts.purple"));
            claudePlugins.tooltip = claudePluginsPath;
            claudePlugins.contextValue = "antigravityFolderItem";
            return [
                ...claudeItems,
                claudeSeparator,
                antigravityItem,
                ...linkedFolderItems,
                actionSeparator,
                ...actionItems,
                separatorItem,
                claudePlugins,
                agents,
                skills,
                workflows
            ];
        }
        if (element.kind === "category" && element.label === "Agents") {
            return this.getAgentItems();
        }
        if (element.kind === "category" && element.label === "Skills") {
            return this.getSkillItems();
        }
        if (element.kind === "category" && element.label === "Workflows") {
            return this.getWorkflowItems();
        }
        if (element.kind === "folder" && element.label === "Claude Plugins") {
            return this.getClaudePluginItems();
        }
        if (element.kind === "folder") {
            if (!element.filePath)
                return [];
            return this.getFolderItems(element.filePath);
        }
        return [];
    }
    async getClaudePluginItems() {
        try {
            const { stdout, stderr } = await execAsync("claude plugin list 2>&1", { timeout: 8000 });
            const plugins = parsePluginListOutput(stdout || stderr || "");
            if (plugins.length === 0) {
                return [emptyItem("No plugins found")];
            }
            return plugins.map(({ name, enabled }) => {
                const displayName = name.split("@")[0];
                const item = new NodeItem({ kind: "plugin", label: displayName, filePath: name }, // filePath = full "name@marketplace"
                vscode.TreeItemCollapsibleState.None);
                item.contextValue = enabled ? "claudePluginEnabled" : "claudePluginDisabled";
                item.iconPath = new vscode.ThemeIcon("extensions", new vscode.ThemeColor(enabled ? "terminal.ansiGreen" : "disabledForeground"));
                item.description = enabled ? "enabled" : "disabled";
                return item;
            });
        }
        catch {
            return [emptyItem("Failed to list plugins")];
        }
    }
    async getAgentItems() {
        try {
            const rootPath = (0, utils_1.getRootPath)();
            const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : undefined;
            const opts = repoRoot ? { timeout: 8000, cwd: repoRoot } : { timeout: 8000 };
            const { stdout, stderr } = await execAsync("claude agents 2>&1", opts);
            const agents = parseAgentsOutput(stdout || stderr || "");
            if (agents.length === 0) {
                return [emptyItem("No agents found")];
            }
            const SECTION_ICON = {
                user: "account",
                plugin: "extensions",
                "built-in": "robot",
                project: "account"
            };
            return agents.map(({ name, model, section }) => {
                const sectionKey = section.toLowerCase();
                const item = new NodeItem({ kind: "agent", label: name, filePath: name }, vscode.TreeItemCollapsibleState.None);
                item.contextValue = "antigravityClaudeAgent";
                item.description = model;
                item.tooltip = `${section} agent · ${model}`;
                item.iconPath = new vscode.ThemeIcon(SECTION_ICON[sectionKey] ?? "robot", terminal_1.CLAUDE_ACTION_COLOR);
                item.command = {
                    command: "antigravity.runClaudeAgent",
                    title: `Run ${name}`,
                    arguments: [name]
                };
                return item;
            });
        }
        catch {
            return [emptyItem("Failed to list agents")];
        }
    }
    async getSkillItems() {
        const rootPath = (0, utils_1.getRootPath)();
        const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : undefined;
        const allSkills = [];
        // Project skills: <workspaceProjectPath>/.agent/skills/ and <repoRoot>/.claude/skills/ (deduped)
        if (repoRoot) {
            const projectBase = (0, utils_1.getWorkspaceProjectPath)(repoRoot);
            const seenProjectSkills = new Set();
            for (const s of readSkillsDir(path.join(projectBase, ".agent", "skills"))) {
                seenProjectSkills.add(s.name);
                allSkills.push({ ...s, section: "Project" });
            }
            // .claude/skills is often a symlink to .agent/skills — only add extras
            for (const s of readSkillsDir(path.join(repoRoot, ".claude", "skills"))) {
                if (!seenProjectSkills.has(s.name)) {
                    allSkills.push({ ...s, section: "Project" });
                }
            }
        }
        // User skills: ~/.claude/skills/<name>/SKILL.md
        const userSkillsDir = path.join(os.homedir(), ".claude", "skills");
        for (const s of readSkillsDir(userSkillsDir)) {
            allSkills.push({ ...s, section: "User" });
        }
        // Plugin skills: enabled plugins → cache → skills
        for (const s of await readEnabledPluginSkills()) {
            allSkills.push({ ...s, section: "Plugin" });
        }
        if (allSkills.length === 0) {
            return [emptyItem("No skills found")];
        }
        return allSkills.map(({ name, filePath, source, section }) => {
            const item = new NodeItem({ kind: "skill", label: name, filePath }, vscode.TreeItemCollapsibleState.None);
            item.contextValue = "antigravitySkillItem";
            item.description = source;
            item.tooltip = `${section} skill · ${source}`;
            item.iconPath = new vscode.ThemeIcon("symbol-keyword", terminal_1.CLAUDE_ACTION_COLOR);
            item.command = {
                command: "antigravity.openAgent",
                title: "Open Skill",
                arguments: [filePath]
            };
            return item;
        });
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
            if (isDirectory) {
                item.contextValue = fs.existsSync(path.join(entryPath, "SKILL.md"))
                    ? "antigravityFolderItemSkillFolder"
                    : fs.existsSync(path.join(entryPath, "AGENT.md"))
                        ? "antigravityFolderItemAgentFolder"
                        : "antigravityFolderItem";
            }
            else {
                if (entry.name === "SKILL.md") {
                    item.contextValue = "antigravityFolderItemSkillFile";
                }
                else if (entry.name.endsWith(".md")) {
                    item.contextValue = "antigravityFolderItemAgentFile";
                }
                else {
                    item.contextValue = "antigravityFolderItem";
                }
            }
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
    { label: "codex", path: path.join(os.homedir(), ".codex") }
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
function readSkillsDir(dir) {
    if (!fs.existsSync(dir))
        return [];
    try {
        return fs.readdirSync(dir, { withFileTypes: true })
            .filter((e) => {
            // isDirectory() returns false for symlinks — follow them explicitly
            if (e.isDirectory())
                return true;
            if (e.isSymbolicLink()) {
                try {
                    return fs.statSync(path.join(dir, e.name)).isDirectory();
                }
                catch {
                    return false;
                }
            }
            return false;
        })
            .map((e) => ({ name: e.name, filePath: path.join(dir, e.name, "SKILL.md"), source: path.basename(dir) }))
            .filter((s) => fs.existsSync(s.filePath));
    }
    catch {
        return [];
    }
}
async function readEnabledPluginSkills() {
    try {
        const { stdout, stderr } = await execAsync("claude plugin list 2>&1", { timeout: 8000 });
        const clean = (stdout || stderr || "").replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
        const skills = [];
        let pluginName = "";
        let marketplace = "";
        let version = "";
        for (const rawLine of clean.split("\n")) {
            const line = rawLine.trim();
            const headerMatch = line.match(/^❯\s+([a-zA-Z0-9_.-]+)@([a-zA-Z0-9_.-]+)/);
            if (headerMatch) {
                pluginName = headerMatch[1];
                marketplace = headerMatch[2];
                version = "";
                continue;
            }
            const versionMatch = line.match(/^Version:\s+(\S+)/);
            if (versionMatch) {
                version = versionMatch[1];
                continue;
            }
            const statusMatch = line.match(/^Status:\s*[✔✘✗]\s*(enabled|disabled)/i);
            if (statusMatch && statusMatch[1].toLowerCase() === "enabled" && pluginName && version) {
                const skillsDir = path.join(os.homedir(), ".claude", "plugins", "cache", marketplace, pluginName, version, "skills");
                for (const s of readSkillsDir(skillsDir)) {
                    skills.push({ name: s.name, filePath: s.filePath, source: pluginName });
                }
            }
        }
        return skills;
    }
    catch {
        return [];
    }
}
function parseAgentsOutput(output) {
    const agents = [];
    let currentSection = "";
    for (const rawLine of output.split("\n")) {
        const line = rawLine.trim();
        if (!line)
            continue;
        // Section header: "User agents:", "Plugin agents:", "Built-in agents:"
        const sectionMatch = line.match(/^(.+?)\s+agents:\s*$/i);
        if (sectionMatch) {
            currentSection = sectionMatch[1].trim();
            continue;
        }
        // Agent line: "ai-advisor · inherit · user memory"
        const agentMatch = line.match(/^([a-zA-Z0-9_:.-]+)\s+·\s+(.+)/);
        if (agentMatch && currentSection) {
            const name = agentMatch[1];
            const model = agentMatch[2].split(" · ")[0].trim();
            agents.push({ name, model, section: currentSection });
        }
    }
    return agents;
}
function parsePluginListOutput(output) {
    // Strip ANSI escape codes
    const clean = output.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").replace(/\x1b\][^\x07]*\x07/g, "");
    // Try JSON first
    const trimmed = clean.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        try {
            const data = JSON.parse(trimmed);
            const arr = Array.isArray(data) ? data : [data];
            return arr
                .map((item) => {
                const obj = item;
                return {
                    name: String(obj["name"] ?? obj["id"] ?? ""),
                    enabled: obj["enabled"] !== false && obj["status"] !== "disabled"
                };
            })
                .filter((p) => p.name);
        }
        catch { /* fall through */ }
    }
    // Primary format — multi-line blocks:
    //   ❯ frontend-design@claude-plugins-official
    //     Version: 6223f4d740e7
    //     Scope: user
    //     Status: ✔ enabled
    const plugins = [];
    let pendingName = null;
    for (const rawLine of clean.split("\n")) {
        const line = rawLine.trim();
        if (!line)
            continue;
        // Plugin header: "❯ frontend-design@source" — capture full id including @source
        const headerMatch = line.match(/^❯\s+([a-zA-Z0-9_.-]+(?:@\S+)?)/);
        if (headerMatch) {
            pendingName = headerMatch[1];
            continue;
        }
        // Status line: "Status: ✔ enabled" / "Status: ✘ disabled"
        const statusMatch = line.match(/^Status:\s*[✔✘✗☐△]\s*(enabled|disabled)/i);
        if (statusMatch && pendingName) {
            plugins.push({ name: pendingName, enabled: statusMatch[1].toLowerCase() === "enabled" });
            pendingName = null;
        }
    }
    return plugins;
}
function getLinkedFolderItems() {
    const folders = [...TOP_LEVEL_LINKED_FOLDERS];
    const rawAddons = vscode.workspace.getConfiguration("antigravity").get("customAgenticPlatformAddons") || "";
    const addonsPath = rawAddons.trim().replace(/^~/, os.homedir());
    if (addonsPath) {
        folders.push({ label: path.basename(addonsPath) || "addons", path: addonsPath, isAddons: true });
    }
    return folders.filter((linked) => fs.existsSync(linked.path)).map((linked) => {
        const item = new NodeItem({ kind: "folder", label: linked.label, filePath: linked.path }, vscode.TreeItemCollapsibleState.Collapsed);
        item.iconPath = new vscode.ThemeIcon("folder", linked.isAddons ? terminal_1.CLAUDE_ACTION_COLOR : WHITE_FOLDER_COLOR);
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
    const createRepoTagVersion = new NodeItem({ kind: "action", label: "Create Repo Release" }, vscode.TreeItemCollapsibleState.None);
    createRepoTagVersion.iconPath = new vscode.ThemeIcon("tag", QUICK_ACTION_COLOR);
    createRepoTagVersion.command = {
        command: "antigravity.createRepoTagVersion",
        title: "Create Repo Release"
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
    return [item, setClaudeModel, runLiteLLMOpenAI];
}
//# sourceMappingURL=treeProvider.js.map