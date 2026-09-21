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
const cloudArchitectReview_1 = require("./cloudArchitectReview");
const adlcAgents_1 = require("./adlcAgents");
const HIDDEN_ADLC_AGENT_ITEM_IDS = new Set(["documentation", "spec-validation"]);
const ADLC_AGENT_ICON_COLOR = new vscode.ThemeColor("charts.red");
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
            const separatorItem = new NodeItem({ kind: "separator", label: "────────" }, vscode.TreeItemCollapsibleState.None);
            separatorItem.tooltip = "";
            separatorItem.contextValue = "antigravitySeparator";
            const actionItems = getQuickActionItems();
            const claudeItems = getClaudeActionItems();
            const actionSeparator = new NodeItem({ kind: "separator", label: "────────" }, vscode.TreeItemCollapsibleState.None);
            actionSeparator.tooltip = "";
            actionSeparator.contextValue = "antigravitySeparator";
            const agents = new NodeItem({ kind: "category", label: "Agents" }, vscode.TreeItemCollapsibleState.Collapsed);
            agents.iconPath = new vscode.ThemeIcon("organization", new vscode.ThemeColor("charts.purple"));
            const skills = new NodeItem({ kind: "category", label: "Skills" }, vscode.TreeItemCollapsibleState.Collapsed);
            skills.iconPath = new vscode.ThemeIcon("symbol-method", new vscode.ThemeColor("charts.purple"));
            const workflows = new NodeItem({ kind: "category", label: "Workflows" }, vscode.TreeItemCollapsibleState.Collapsed);
            workflows.iconPath = new vscode.ThemeIcon("run-all", new vscode.ThemeColor("charts.purple"));
            const agenticHarnessAndAddOns = new NodeItem({ kind: "category", label: "Agentic Harness and AddOns" }, vscode.TreeItemCollapsibleState.Collapsed);
            agenticHarnessAndAddOns.iconPath = new vscode.ThemeIcon("package", new vscode.ThemeColor("charts.purple"));
            const claudePluginsPath = path.join(os.homedir(), ".claude", "plugins");
            const claudePlugins = new NodeItem({ kind: "folder", label: "Claude Plugins", filePath: claudePluginsPath }, vscode.TreeItemCollapsibleState.Collapsed);
            claudePlugins.iconPath = new vscode.ThemeIcon("extensions", new vscode.ThemeColor("charts.purple"));
            claudePlugins.tooltip = claudePluginsPath;
            claudePlugins.contextValue = "antigravityFolderItem";
            return [
                ...claudeItems,
                actionSeparator,
                ...actionItems,
                separatorItem,
                agenticHarnessAndAddOns,
                claudePlugins,
                agents,
                skills,
                workflows
            ];
        }
        if (element.kind === "category" && element.label === "Install Agentic Libraries") {
            return getDeployAgenticLibrariesItems();
        }
        if (element.kind === "category" && element.label === "Backlog Management") {
            return getBacklogManagementItems();
        }
        if (element.kind === "category" && element.label === "Increment Versions") {
            return getIncrementVersionItems();
        }
        if (element.kind === "category" && element.label === "ADLC Agents") {
            return getAdlcAgentItems();
        }
        if (element.kind === "category" && element.label === "Auxiliary Agents and Skills") {
            return getAuxiliaryAgentAndSkillItems();
        }
        if (element.kind === "category" && element.label === "Repository Actions") {
            return getRepositoryActionItems();
        }
        if (element.kind === "category" && element.label === "Agentic Harness and AddOns") {
            return getAgenticHarnessAndAddOnsItems();
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
        if (element.kind === "category" && element.label === "Ollama Terminals") {
            return getOllamaTerminalItems();
        }
        if (element.kind === "category" && element.label === "Agent Monitor Terminals") {
            return getAgentMonitorTerminalItems();
        }
        if (element.kind === "category" && element.label === "PR Reviewer") {
            return getPrReviewerItems();
        }
        if (element.kind === "category" && element.label === "Update Project Config") {
            return getUpdateProjectConfigItems();
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
        const rootPath = (0, utils_1.getRootPath)();
        const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : undefined;
        const allAgents = [];
        const seenAgentPaths = new Set();
        const seenClaudeAgents = new Set();
        const addAgentsFromDir = (dir, source, section) => {
            for (const agent of readAgentsDir(dir)) {
                const agentKey = getAgentFileKey(agent.filePath);
                if (seenAgentPaths.has(agentKey))
                    continue;
                seenAgentPaths.add(agentKey);
                allAgents.push({ ...agent, source, section });
            }
        };
        // Project agents: shared .agents plus harness-specific project agent folders.
        if (repoRoot) {
            const projectBase = (0, utils_1.getWorkspaceProjectPath)(repoRoot);
            addAgentsFromDir(path.join(repoRoot, ".agents", "agents"), "Project .agents", "Project");
            addAgentsFromDir(path.join(projectBase, ".agent", "agents"), "Project .agent", "Project");
            addAgentsFromDir(path.join(repoRoot, ".claude", "agents"), "Project Claude", "Project");
            addAgentsFromDir(path.join(repoRoot, ".codex", "agents"), "Project Codex", "Project");
            addAgentsFromDir(path.join(repoRoot, ".gemini", "agents"), "Project Gemini", "Project");
            addAgentsFromDir(path.join(repoRoot, ".opencode", "agents"), "Project OpenCode", "Project");
        }
        // User agents: harness-specific global agent folders.
        addAgentsFromDir(path.join(os.homedir(), ".claude", "agents"), "User Claude", "User");
        addAgentsFromDir(path.join(os.homedir(), ".codex", "agents"), "User Codex", "User");
        addAgentsFromDir(path.join(os.homedir(), ".gemini", "agents"), "User Gemini", "User");
        addAgentsFromDir(path.join(os.homedir(), ".gemini", "antigravity", "agents"), "User Gemini Antigravity", "User");
        addAgentsFromDir(path.join(os.homedir(), ".opencode", "agents"), "User OpenCode", "User");
        addAgentsFromDir(path.join(os.homedir(), ".config", "opencode", "agents"), "User OpenCode config", "User");
        try {
            const opts = repoRoot ? { timeout: 8000, cwd: repoRoot } : { timeout: 8000 };
            const { stdout, stderr } = await execAsync("claude agents 2>&1", opts);
            const agents = parseAgentsOutput(stdout || stderr || "");
            for (const agent of agents) {
                const agentKey = `${agent.section.toLowerCase()}:${agent.name}`;
                if (seenClaudeAgents.has(agentKey))
                    continue;
                seenClaudeAgents.add(agentKey);
                allAgents.push({
                    ...agent,
                    source: "Claude CLI",
                    runnableClaude: true
                });
            }
        }
        catch {
            // File-backed agents remain useful even when the Claude CLI is unavailable.
        }
        if (allAgents.length === 0) {
            return [emptyItem("No agents found")];
        }
        const SECTION_ICON = {
            user: "account",
            plugin: "extensions",
            "built-in": "robot",
            project: "account"
        };
        return allAgents
            .sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source))
            .map(({ name, filePath, source, section, model, runnableClaude }) => {
            const sectionKey = section.toLowerCase();
            const item = new NodeItem({ kind: "agent", label: name, filePath: filePath ?? name }, vscode.TreeItemCollapsibleState.None);
            item.contextValue = runnableClaude ? "antigravityClaudeAgent" : "antigravityAgentItem";
            item.description = runnableClaude ? model : source;
            item.tooltip = runnableClaude
                ? `${section} agent · ${source} · ${model}`
                : `${section} agent · ${source}`;
            item.iconPath = new vscode.ThemeIcon(SECTION_ICON[sectionKey] ?? "robot", terminal_1.CLAUDE_ACTION_COLOR);
            item.command = {
                command: runnableClaude ? "antigravity.runClaudeAgent" : "antigravity.openAgent",
                title: runnableClaude ? `Run ${name}` : "Open Agent",
                arguments: [filePath ?? name]
            };
            return item;
        });
    }
    async getSkillItems() {
        const rootPath = (0, utils_1.getRootPath)();
        const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : undefined;
        const allSkills = [];
        const seenSkillPaths = new Set();
        const addSkillsFromDir = (dir, source, section) => {
            for (const skill of readSkillsDir(dir)) {
                const skillKey = getSkillFileKey(skill.filePath);
                if (seenSkillPaths.has(skillKey))
                    continue;
                seenSkillPaths.add(skillKey);
                allSkills.push({ ...skill, source, section });
            }
        };
        // Project skills: shared .agents plus harness-specific project skill folders.
        if (repoRoot) {
            const projectBase = (0, utils_1.getWorkspaceProjectPath)(repoRoot);
            addSkillsFromDir(path.join(repoRoot, ".agents", "skills"), "Project .agents", "Project");
            addSkillsFromDir(path.join(projectBase, ".agent", "skills"), "Project .agent", "Project");
            addSkillsFromDir(path.join(repoRoot, ".claude", "skills"), "Project Claude", "Project");
            addSkillsFromDir(path.join(repoRoot, ".codex", "skills"), "Project Codex", "Project");
            addSkillsFromDir(path.join(repoRoot, ".gemini", "skills"), "Project Gemini", "Project");
            addSkillsFromDir(path.join(repoRoot, ".opencode", "skills"), "Project OpenCode", "Project");
        }
        // User skills: harness-specific global skill folders.
        addSkillsFromDir(path.join(os.homedir(), ".claude", "skills"), "User Claude", "User");
        addSkillsFromDir(path.join(os.homedir(), ".codex", "skills"), "User Codex", "User");
        addSkillsFromDir(path.join(os.homedir(), ".codex", "skills", ".system"), "User Codex system", "User");
        addSkillsFromDir(path.join(os.homedir(), ".gemini", "skills"), "User Gemini", "User");
        addSkillsFromDir(path.join(os.homedir(), ".gemini", "antigravity", "skills"), "User Gemini Antigravity", "User");
        addSkillsFromDir(path.join(os.homedir(), ".opencode", "skills"), "User OpenCode", "User");
        addSkillsFromDir(path.join(os.homedir(), ".config", "opencode", "skills"), "User OpenCode config", "User");
        // Plugin skills: enabled plugins → cache → skills
        for (const s of await readEnabledPluginSkills()) {
            const skillKey = getSkillFileKey(s.filePath);
            if (seenSkillPaths.has(skillKey))
                continue;
            seenSkillPaths.add(skillKey);
            allSkills.push({ ...s, section: "Plugin" });
        }
        if (allSkills.length === 0) {
            return [emptyItem("No skills found")];
        }
        return allSkills
            .sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source))
            .map(({ name, filePath, source, section }) => {
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
        const rootPath = (0, utils_1.getRootPath)();
        const workflowDirs = [];
        if (rootPath) {
            workflowDirs.push(path.join((0, utils_1.getRepoRoot)(rootPath), ".agents", "workflows"));
        }
        const antigravityHomePath = (0, utils_1.getAntigravityHomePath)();
        if (antigravityHomePath) {
            workflowDirs.push(path.join(antigravityHomePath, "workflows"));
        }
        if (workflowDirs.length === 0) {
            return [missingRootItem()];
        }
        const items = [];
        for (const workflowsDir of workflowDirs) {
            const entries = await (0, utils_1.safeReadDir)(workflowsDir);
            const markdownFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md");
            items.push(...markdownFiles.map((entry) => {
                const workflowFile = path.join(workflowsDir, entry.name);
                const item = new NodeItem({ kind: "workflow", label: entry.name.replace(/\.md$/, ""), filePath: workflowFile }, vscode.TreeItemCollapsibleState.None);
                item.command = {
                    command: "antigravity.runWorkflow",
                    title: `Run ${item.label}`,
                    arguments: [workflowFile]
                };
                item.iconPath = new vscode.ThemeIcon("play");
                return item;
            }));
        }
        items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
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
const ORANGE_ACTION_COLOR = new vscode.ThemeColor("charts.orange");
const PULL_REMOTE_AND_MERGE_ACTION_COLOR = new vscode.ThemeColor("charts.yellow");
const CLAUDE_MODEL_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiBlue");
const JIRA_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiBlue");
const SOP_MANUAL_ACTION_COLOR = new vscode.ThemeColor("charts.yellow");
const WHITE_FOLDER_COLOR = new vscode.ThemeColor("terminal.ansiWhite");
const FEATURE_FLAG_ACTION_COLOR = new vscode.ThemeColor("charts.purple");
const MERGE_REVIEW_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiRed");
const FEATURE_ESTIMATOR_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiBrightBlue");
const UPDATE_PROJECT_CONFIG_ACTION_COLOR = new vscode.ThemeColor("charts.green");
const FEATURE_ESTIMATOR_ICON_PATH = vscode.Uri.file(path.resolve(__dirname, "..", "resources", "feature-estimator-red.svg"));
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
function readAgentsDir(dir) {
    if (!fs.existsSync(dir))
        return [];
    try {
        return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
            const entryPath = path.join(dir, entry.name);
            if (isDirectoryEntry(entryPath, entry)) {
                const filePath = findAgentDefinitionFile(entryPath, entry.name);
                return filePath ? [{ name: entry.name, filePath, source: path.basename(dir) }] : [];
            }
            if (isAgentDefinitionFile(entry.name) && isFileEntry(entryPath, entry)) {
                return [{
                        name: entry.name.replace(/\.(md|toml|ya?ml)$/i, ""),
                        filePath: entryPath,
                        source: path.basename(dir)
                    }];
            }
            return [];
        });
    }
    catch {
        return [];
    }
}
function findAgentDefinitionFile(agentDir, agentName) {
    const candidates = [
        `${agentName}.md`,
        "AGENT.md",
        "agent.md",
        `${agentName}.toml`,
        "AGENT.toml",
        "agent.toml",
        `${agentName}.yaml`,
        `${agentName}.yml`,
        "AGENT.yaml",
        "AGENT.yml"
    ].map((fileName) => path.join(agentDir, fileName));
    return candidates.find((filePath) => fs.existsSync(filePath));
}
function isAgentDefinitionFile(fileName) {
    return fileName !== "README.md" && /\.(md|toml|ya?ml)$/i.test(fileName);
}
function isDirectoryEntry(entryPath, entry) {
    if (entry.isDirectory())
        return true;
    if (!entry.isSymbolicLink())
        return false;
    try {
        return fs.statSync(entryPath).isDirectory();
    }
    catch {
        return false;
    }
}
function isFileEntry(entryPath, entry) {
    if (entry.isFile())
        return true;
    if (!entry.isSymbolicLink())
        return false;
    try {
        return fs.statSync(entryPath).isFile();
    }
    catch {
        return false;
    }
}
function getAgentFileKey(filePath) {
    try {
        return fs.realpathSync(filePath);
    }
    catch {
        return path.resolve(filePath);
    }
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
function getSkillFileKey(filePath) {
    try {
        return fs.realpathSync(filePath);
    }
    catch {
        return path.resolve(filePath);
    }
}
async function readEnabledPluginSkills() {
    try {
        const { stdout, stderr } = await execAsync("claude plugin list 2>&1", { timeout: 8000 });
        const clean = (stdout || stderr || "").replace(ANSI_CSI_PATTERN, "");
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
    const clean = output.replace(ANSI_CSI_PATTERN, "").replace(ANSI_OSC_PATTERN, "");
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
// eslint-disable-next-line no-control-regex
const ANSI_CSI_PATTERN = /\x1b\[[0-9;]*[A-Za-z]/g;
// eslint-disable-next-line no-control-regex
const ANSI_OSC_PATTERN = /\x1b\][^\x07]*\x07/g;
function buildAntigravityItem() {
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
    return antigravityItem;
}
function getAgenticHarnessAndAddOnsItems() {
    return [buildAntigravityItem(), ...getLinkedFolderItems()];
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
    const hasGitHub = repoRoot ? (0, git_1.hasGitHubRemoteSync)(repoRoot) : false;
    const setupWorkspace = new NodeItem({ kind: "action", label: "Setup Workspace" }, vscode.TreeItemCollapsibleState.None);
    setupWorkspace.iconPath = new vscode.ThemeIcon("debug-continue", QUICK_ACTION_COLOR);
    if (hasAgentFolder) {
        setupWorkspace.iconPath = new vscode.ThemeIcon("debug-continue", new vscode.ThemeColor("disabledForeground"));
        setupWorkspace.tooltip = "A .agent folder already exists in this project.";
    }
    setupWorkspace.contextValue = hasRepo ? "antigravitySetupWorkspaceActionWithRepo" : "antigravitySetupWorkspaceAction";
    setupWorkspace.command = {
        command: "antigravity.setupWorkspace",
        title: "Setup Workspace"
    };
    items.push(setupWorkspace);
    const deployAgenticLibraries = new NodeItem({ kind: "category", label: "Install Agentic Libraries" }, vscode.TreeItemCollapsibleState.Collapsed);
    deployAgenticLibraries.iconPath = new vscode.ThemeIcon("cloud-download", QUICK_ACTION_COLOR);
    deployAgenticLibraries.tooltip = "Install agentic libraries in the current workspace.";
    items.push(deployAgenticLibraries);
    const backlogManagement = new NodeItem({ kind: "category", label: "Backlog Management" }, vscode.TreeItemCollapsibleState.Collapsed);
    backlogManagement.iconPath = new vscode.ThemeIcon("checklist", JIRA_ACTION_COLOR);
    backlogManagement.tooltip = "Create, assign, take, and complete backlog items.";
    items.push(backlogManagement);
    if (!hasRepo) {
        const initRepo = new NodeItem({ kind: "action", label: "Init Repository" }, vscode.TreeItemCollapsibleState.None);
        initRepo.iconPath = new vscode.ThemeIcon("repo", ORANGE_ACTION_COLOR);
        initRepo.command = {
            command: "antigravity.initRepository",
            title: "Init Repository"
        };
        items.push(initRepo);
    }
    if (hasRepo) {
        const repositoryActions = new NodeItem({ kind: "category", label: "Repository Actions" }, vscode.TreeItemCollapsibleState.Collapsed);
        repositoryActions.iconPath = new vscode.ThemeIcon("github", ORANGE_ACTION_COLOR);
        items.push(repositoryActions);
    }
    const setFeatureFlag = new NodeItem({ kind: "action", label: "Set Feature Flag for changes" }, vscode.TreeItemCollapsibleState.None);
    setFeatureFlag.iconPath = new vscode.ThemeIcon("symbol-boolean", FEATURE_FLAG_ACTION_COLOR);
    setFeatureFlag.command = {
        command: "antigravity.setFeatureFlag",
        title: "Set Feature Flag for changes"
    };
    items.push(setFeatureFlag);
    const adlcAgents = new NodeItem({ kind: "category", label: "ADLC Agents" }, vscode.TreeItemCollapsibleState.Collapsed);
    adlcAgents.iconPath = new vscode.ThemeIcon("organization", ADLC_AGENT_ICON_COLOR);
    adlcAgents.tooltip = "Run an ADLC agent from .agents/agents with a chosen harness, model, and input artifacts.";
    items.push(adlcAgents);
    const auxiliaryAgentsAndSkills = new NodeItem({ kind: "category", label: "Auxiliary Agents and Skills" }, vscode.TreeItemCollapsibleState.Collapsed);
    auxiliaryAgentsAndSkills.iconPath = new vscode.ThemeIcon("tools", FEATURE_ESTIMATOR_ACTION_COLOR);
    auxiliaryAgentsAndSkills.tooltip = "Open or run supporting agents and skills outside the core ADLC sequence.";
    items.push(auxiliaryAgentsAndSkills);
    const incrementVersions = new NodeItem({ kind: "category", label: "Increment Versions" }, vscode.TreeItemCollapsibleState.Collapsed);
    incrementVersions.iconPath = new vscode.ThemeIcon("arrow-up", QUICK_ACTION_COLOR);
    incrementVersions.tooltip = "Increment the project major, minor, or patch version.";
    items.push(incrementVersions);
    const obsidianVaultVisualization = new NodeItem({ kind: "action", label: "Obsidian Vault Visualization" }, vscode.TreeItemCollapsibleState.None);
    obsidianVaultVisualization.iconPath = new vscode.ThemeIcon("graph", new vscode.ThemeColor("charts.purple"));
    obsidianVaultVisualization.tooltip = "Open the project Obsidian vault visualization.";
    obsidianVaultVisualization.command = {
        command: "antigravity.openObsidianVaultVisualization",
        title: "Obsidian Vault Visualization"
    };
    items.push(obsidianVaultVisualization);
    const autocommitCheckpoint = new NodeItem({ kind: "action", label: autocommitRunning ? "Autocommit Stop" : "Autocommit Start" }, vscode.TreeItemCollapsibleState.None);
    if (!autocommitRunning && !hasGitHub) {
        autocommitCheckpoint.iconPath = new vscode.ThemeIcon("save-all", new vscode.ThemeColor("disabledForeground"));
        autocommitCheckpoint.tooltip = "No GitHub repository found. Please Init a repository first.";
    }
    else {
        autocommitCheckpoint.iconPath = new vscode.ThemeIcon("save-all", QUICK_ACTION_COLOR);
        autocommitCheckpoint.command = {
            command: "antigravity.autocommitCheckpoint",
            title: "Autocommit Checkpoint"
        };
    }
    items.push(autocommitCheckpoint);
    if (autocommitRunning) {
        const revertChanges = new NodeItem({ kind: "action", label: "Revert Changes" }, vscode.TreeItemCollapsibleState.None);
        revertChanges.iconPath = new vscode.ThemeIcon("discard", QUICK_ACTION_COLOR);
        revertChanges.command = {
            command: "antigravity.autocommitRevert",
            title: "Revert Changes"
        };
        items.push(revertChanges);
    }
    const sopManual = new NodeItem({ kind: "action", label: "SOP Manual" }, vscode.TreeItemCollapsibleState.None);
    sopManual.iconPath = new vscode.ThemeIcon("repo", SOP_MANUAL_ACTION_COLOR);
    sopManual.contextValue = "antigravitySopManual";
    sopManual.command = {
        command: "antigravity.openSopManual",
        title: "SOP Manual"
    };
    items.push(sopManual);
    const adlcFrameworkManual = new NodeItem({ kind: "action", label: "ADLC Framework Manual" }, vscode.TreeItemCollapsibleState.None);
    adlcFrameworkManual.iconPath = new vscode.ThemeIcon("book", SOP_MANUAL_ACTION_COLOR);
    adlcFrameworkManual.tooltip = "Open the ADLC workflow diagram and framework design document.";
    adlcFrameworkManual.command = {
        command: "antigravity.openAdlcFrameworkManual",
        title: "ADLC Framework Manual"
    };
    items.push(adlcFrameworkManual);
    return items;
}
function getRepositoryActionItems() {
    const items = [];
    const rootPath = (0, utils_1.getRootPath)();
    const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : undefined;
    const currentBranch = repoRoot ? (0, git_1.getCurrentBranchNameSync)(repoRoot) : undefined;
    const commitChanges = new NodeItem({ kind: "action", label: "Commit" }, vscode.TreeItemCollapsibleState.None);
    commitChanges.iconPath = new vscode.ThemeIcon("check", ORANGE_ACTION_COLOR);
    commitChanges.command = {
        command: "antigravity.commitChanges",
        title: "Commit"
    };
    items.push(commitChanges);
    const createRepoTagVersion = new NodeItem({ kind: "action", label: "Create Repo Release" }, vscode.TreeItemCollapsibleState.None);
    createRepoTagVersion.iconPath = new vscode.ThemeIcon("tag", ORANGE_ACTION_COLOR);
    createRepoTagVersion.command = {
        command: "antigravity.createRepoTagVersion",
        title: "Create Repo Release"
    };
    items.push(createRepoTagVersion);
    const createFeatureBranch = new NodeItem({ kind: "action", label: "Create Feature Branch" }, vscode.TreeItemCollapsibleState.None);
    createFeatureBranch.iconPath = new vscode.ThemeIcon("source-control", ORANGE_ACTION_COLOR);
    createFeatureBranch.command = {
        command: "antigravity.createFeatureBranch",
        title: "Create Feature Branch"
    };
    items.push(createFeatureBranch);
    const createPullRequest = new NodeItem({ kind: "action", label: "Create Pull Request" }, vscode.TreeItemCollapsibleState.None);
    createPullRequest.iconPath = new vscode.ThemeIcon("git-pull-request", ORANGE_ACTION_COLOR);
    createPullRequest.command = {
        command: "antigravity.createPullRequest",
        title: "Create Pull Request"
    };
    items.push(createPullRequest);
    if (currentBranch && currentBranch !== "main") {
        const mergeBranchToMain = new NodeItem({ kind: "action", label: "Merge branch to main" }, vscode.TreeItemCollapsibleState.None);
        mergeBranchToMain.iconPath = new vscode.ThemeIcon("git-merge", ORANGE_ACTION_COLOR);
        mergeBranchToMain.command = {
            command: "antigravity.mergeBranchToMain",
            title: "Merge branch to main"
        };
        items.push(mergeBranchToMain);
    }
    const checkoutMain = new NodeItem({ kind: "action", label: "Go To Branch" }, vscode.TreeItemCollapsibleState.None);
    checkoutMain.iconPath = new vscode.ThemeIcon("git-compare", ORANGE_ACTION_COLOR);
    checkoutMain.command = {
        command: "antigravity.checkoutMain",
        title: "Go To Branch"
    };
    items.push(checkoutMain);
    const pullRemoteAndMerge = new NodeItem({ kind: "action", label: "Pull Remote and merge" }, vscode.TreeItemCollapsibleState.None);
    pullRemoteAndMerge.iconPath = new vscode.ThemeIcon("cloud-download", PULL_REMOTE_AND_MERGE_ACTION_COLOR);
    pullRemoteAndMerge.command = {
        command: "antigravity.pullRemoteAndMerge",
        title: "Pull Remote and merge"
    };
    items.push(pullRemoteAndMerge);
    const agenticReviewOfMerge = new NodeItem({ kind: "action", label: "Agentic review of Merge" }, vscode.TreeItemCollapsibleState.None);
    agenticReviewOfMerge.iconPath = new vscode.ThemeIcon("warning", MERGE_REVIEW_ACTION_COLOR);
    agenticReviewOfMerge.command = {
        command: "antigravity.agenticReviewOfMerge",
        title: "Agentic review of Merge"
    };
    items.push(agenticReviewOfMerge);
    return items;
}
function getAdlcAgentItems() {
    const rootPath = (0, utils_1.getRootPath)();
    const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : undefined;
    return adlcAgents_1.ADLC_AGENT_CATALOG.filter((entry) => !HIDDEN_ADLC_AGENT_ITEM_IDS.has(entry.id)).map((entry) => {
        const available = repoRoot ? (0, adlcAgents_1.adlcAgentExists)(repoRoot, entry.folder) : false;
        const relativePath = (0, adlcAgents_1.getAdlcAgentRelativePath)(entry.folder);
        const item = new NodeItem({ kind: "action", label: entry.label }, vscode.TreeItemCollapsibleState.None);
        item.iconPath = new vscode.ThemeIcon("robot", ADLC_AGENT_ICON_COLOR);
        item.tooltip = available
            ? `Run ${entry.label} (${relativePath}) with a chosen harness, model, and input artifacts.`
            : `${relativePath} was not found. Install the SDLC library to enable this agent.`;
        if (!available)
            item.description = "not deployed";
        item.command = {
            command: "antigravity.runAdlcAgent",
            title: entry.label,
            arguments: [entry.id]
        };
        return item;
    });
}
function getAuxiliaryAgentAndSkillItems() {
    const rootPath = (0, utils_1.getRootPath)();
    const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : undefined;
    const cloudInfrastructureSignals = repoRoot
        ? (0, cloudArchitectReview_1.detectCloudInfrastructureSignals)(repoRoot, 3)
        : [];
    const entries = [
        {
            label: "Consultant Agent",
            kind: "agent",
            icon: "robot",
            relativePath: ".agents/agents/consultant-agent/consultant-agent.md"
        },
        {
            label: "Explain-me Agent",
            kind: "action",
            icon: "comment-discussion",
            command: "antigravity.explainMe",
            tooltip: "Run the explain-me skill against the current solution and uncommitted changes."
        },
        { label: "Grill-me", kind: "skill", icon: "flame", relativePath: ".agents/skills/grill-me/SKILL.md" },
        { label: "Pre-mortem Agent", kind: "skill", icon: "warning", relativePath: ".agents/skills/pre-mortem/SKILL.md" },
        { label: "Handoff", kind: "skill", icon: "arrow-swap", relativePath: ".agents/skills/handoff/SKILL.md" },
        { label: "Conversation To Spec", kind: "skill", icon: "file-text", relativePath: ".agents/skills/to-spec/SKILL.md" },
        { label: "Spec To Tickets", kind: "skill", icon: "issues", relativePath: ".agents/skills/to-tickets/SKILL.md" },
        { label: "llm-judge-agent", kind: "agent", icon: "law", relativePath: ".agents/agents/llm-judge-agent/llm-judge-agent.md" },
        {
            label: "Feature Estimator Agent",
            kind: "action",
            icon: "pulse",
            command: "antigravity.featureEstimator",
            tooltip: "Estimate a feature from a Jira item or free-form description."
        },
        { label: "Autoresearch Agent", kind: "skill", icon: "telescope", relativePath: ".agents/skills/autoresearch/SKILL.md" },
        { label: "Brainstorm Ideas", kind: "skill", icon: "lightbulb", relativePath: ".agents/skills/brainstorm-ideas/SKILL.md" },
        { label: "Customer Interviewer", kind: "skill", icon: "comment-discussion", relativePath: ".agents/skills/customer-interview-script/SKILL.md" },
        { label: "System Design Agent", kind: "skill", icon: "type-hierarchy", relativePath: ".agents/skills/architecture-designer/SKILL.md" },
        { label: "Prototype Builder", kind: "skill", icon: "beaker", relativePath: ".agents/skills/prototype/SKILL.md" },
        { label: "Story Point Council", kind: "skill", icon: "organization", relativePath: ".agents/skills/storypoints-council/SKILL.md" },
        {
            label: "Cloud Architect Review",
            kind: "action",
            icon: "cloud",
            command: cloudInfrastructureSignals.length > 0 ? "antigravity.cloudArchitectReview" : undefined,
            tooltip: cloudInfrastructureSignals.length > 0
                ? `Detected cloud infrastructure signals: ${cloudInfrastructureSignals.join(", ")}`
                : "Disabled because no cloud infrastructure signals were detected in this project."
        }
    ];
    return entries.map((entry) => {
        const filePath = repoRoot && entry.relativePath
            ? path.join(repoRoot, entry.relativePath)
            : undefined;
        const item = new NodeItem({ kind: entry.kind, label: entry.label, filePath }, vscode.TreeItemCollapsibleState.None);
        item.iconPath = entry.label === "Feature Estimator Agent"
            ? FEATURE_ESTIMATOR_ICON_PATH
            : new vscode.ThemeIcon(entry.icon, FEATURE_ESTIMATOR_ACTION_COLOR);
        item.tooltip = entry.tooltip ?? entry.relativePath;
        if (entry.command) {
            item.command = {
                command: entry.command,
                title: entry.label
            };
        }
        else if (filePath && fs.existsSync(filePath)) {
            item.command = {
                command: "antigravity.openAgent",
                title: `Open ${entry.label}`,
                arguments: [filePath]
            };
        }
        else if (entry.relativePath) {
            item.description = "not installed";
            item.tooltip = `${entry.relativePath} was not found. Install the corresponding agentic library to enable it.`;
        }
        return item;
    });
}
function getDeployAgenticLibrariesItems() {
    const deployColor = new vscode.ThemeColor("charts.blue");
    const deploySdlc = new NodeItem({ kind: "action", label: "Install SDLC" }, vscode.TreeItemCollapsibleState.None);
    deploySdlc.iconPath = new vscode.ThemeIcon("cloud-download", deployColor);
    deploySdlc.command = {
        command: "antigravity.deployAgenticLibSdlc",
        title: "Install SDLC"
    };
    const deploySdlcExtended = new NodeItem({ kind: "action", label: "Install SDLC Extended" }, vscode.TreeItemCollapsibleState.None);
    deploySdlcExtended.iconPath = new vscode.ThemeIcon("cloud-download", deployColor);
    deploySdlcExtended.command = {
        command: "antigravity.deployAgenticLibSdlcExtended",
        title: "Install SDLC Extended"
    };
    const deployProfessionalServices = new NodeItem({ kind: "action", label: "Install Professional Services" }, vscode.TreeItemCollapsibleState.None);
    deployProfessionalServices.iconPath = new vscode.ThemeIcon("cloud-download", deployColor);
    deployProfessionalServices.command = {
        command: "antigravity.deployAgenticLibProfessionalServices",
        title: "Install Professional Services"
    };
    const deployTechAdvisory = new NodeItem({ kind: "action", label: "Install Tech Advisory" }, vscode.TreeItemCollapsibleState.None);
    deployTechAdvisory.iconPath = new vscode.ThemeIcon("cloud-download", deployColor);
    deployTechAdvisory.command = {
        command: "antigravity.deployAgenticLibTechAdvisory",
        title: "Install Tech Advisory"
    };
    const cleanDeployedLibs = new NodeItem({ kind: "action", label: "Clean Deployed Libs" }, vscode.TreeItemCollapsibleState.None);
    cleanDeployedLibs.iconPath = new vscode.ThemeIcon("trash", new vscode.ThemeColor("charts.red"));
    cleanDeployedLibs.command = {
        command: "antigravity.cleanDeployedLibs",
        title: "Clean Deployed Libs"
    };
    return [deploySdlc, deploySdlcExtended, deployProfessionalServices, deployTechAdvisory, cleanDeployedLibs];
}
function getBacklogManagementItems() {
    const items = [];
    const rootPath = (0, utils_1.getRootPath)();
    const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : undefined;
    const savedJiraProjectKey = repoRoot && fs.existsSync(path.join(repoRoot, ".env"))
        ? (fs
            .readFileSync(path.join(repoRoot, ".env"), "utf8")
            .match(/^\s*JIRA_PROJECT_KEY\s*=\s*([^\r\n#]+)/m)?.[1] ?? "")
            .trim()
            .replace(/^['"]|['"]$/g, "")
            .toUpperCase()
        : "";
    if (!savedJiraProjectKey) {
        const selectOrCreateJiraProject = new NodeItem({ kind: "action", label: "Select/Set Jira Project" }, vscode.TreeItemCollapsibleState.None);
        selectOrCreateJiraProject.iconPath = new vscode.ThemeIcon("project", JIRA_ACTION_COLOR);
        selectOrCreateJiraProject.command = {
            command: "antigravity.selectOrCreateJiraProject",
            title: "Select/Set Jira Project"
        };
        items.push(selectOrCreateJiraProject);
    }
    const addBacklogItem = new NodeItem({ kind: "action", label: "Add Backlog Item" }, vscode.TreeItemCollapsibleState.None);
    addBacklogItem.iconPath = new vscode.ThemeIcon("add", JIRA_ACTION_COLOR);
    addBacklogItem.tooltip = "Create a backlog item in docs/backlog, and in Jira too when a project is connected.";
    addBacklogItem.command = {
        command: "antigravity.addBacklogItem",
        title: "Add Backlog Item"
    };
    const takeBacklogItemAssign = new NodeItem({ kind: "action", label: "Take Backlog Item (Assign)" }, vscode.TreeItemCollapsibleState.None);
    takeBacklogItemAssign.iconPath = new vscode.ThemeIcon("person-add", JIRA_ACTION_COLOR);
    takeBacklogItemAssign.tooltip = "Take a backlog item (Jira or local) and assign it to yourself, moving it to In Progress.";
    takeBacklogItemAssign.command = {
        command: "antigravity.takeBacklogItemAssign",
        title: "Take Backlog Item (Assign)"
    };
    const markBacklogItemCompleted = new NodeItem({ kind: "action", label: "Mark Backlog Item as Completed" }, vscode.TreeItemCollapsibleState.None);
    markBacklogItemCompleted.iconPath = new vscode.ThemeIcon("pass", JIRA_ACTION_COLOR);
    markBacklogItemCompleted.tooltip = "Mark a backlog item (Jira or local) as completed.";
    markBacklogItemCompleted.command = {
        command: "antigravity.completeJiraItem",
        title: "Mark Backlog Item as Completed"
    };
    const assignBacklogItemToAgent = new NodeItem({ kind: "action", label: "Assign Backlog Item to Agent" }, vscode.TreeItemCollapsibleState.None);
    assignBacklogItemToAgent.iconPath = new vscode.ThemeIcon("person-add", JIRA_ACTION_COLOR);
    assignBacklogItemToAgent.tooltip = "Assign a Jira item or a local backlog item from docs/backlog to the selected agent.";
    assignBacklogItemToAgent.command = {
        command: "antigravity.assignBacklogItemToAgent",
        title: "Assign Backlog Item to Agent"
    };
    items.push(addBacklogItem, takeBacklogItemAssign, markBacklogItemCompleted, assignBacklogItemToAgent);
    return items;
}
function getIncrementVersionItems() {
    const incrementMajor = new NodeItem({ kind: "action", label: "Increment Major Version" }, vscode.TreeItemCollapsibleState.None);
    incrementMajor.iconPath = new vscode.ThemeIcon("arrow-up", QUICK_ACTION_COLOR);
    incrementMajor.command = {
        command: "antigravity.incrementMajorVersion",
        title: "Increment Major Version"
    };
    const incrementMinor = new NodeItem({ kind: "action", label: "Increment Minor Version" }, vscode.TreeItemCollapsibleState.None);
    incrementMinor.iconPath = new vscode.ThemeIcon("arrow-up", QUICK_ACTION_COLOR);
    incrementMinor.command = {
        command: "antigravity.incrementMinorVersion",
        title: "Increment Minor Version"
    };
    const incrementPatch = new NodeItem({ kind: "action", label: "Increment Patch Version" }, vscode.TreeItemCollapsibleState.None);
    incrementPatch.iconPath = new vscode.ThemeIcon("arrow-up", QUICK_ACTION_COLOR);
    incrementPatch.command = {
        command: "antigravity.incrementPatchVersion",
        title: "Increment Patch Version"
    };
    return [incrementMajor, incrementMinor, incrementPatch];
}
function getUpdateProjectConfigItems() {
    const updateGithubActions = new NodeItem({ kind: "action", label: "Update Github Actions" }, vscode.TreeItemCollapsibleState.None);
    updateGithubActions.iconPath = new vscode.ThemeIcon("github-action", UPDATE_PROJECT_CONFIG_ACTION_COLOR);
    updateGithubActions.command = {
        command: "antigravity.updateGithubActions",
        title: "Update Github Actions"
    };
    updateGithubActions.tooltip =
        "Run the selected Agentic Harness with the GitHub Actions update prompt.";
    const updateTests = new NodeItem({ kind: "action", label: "Update Tests" }, vscode.TreeItemCollapsibleState.None);
    updateTests.iconPath = new vscode.ThemeIcon("beaker", UPDATE_PROJECT_CONFIG_ACTION_COLOR);
    updateTests.command = {
        command: "antigravity.updateTests",
        title: "Update Tests"
    };
    updateTests.tooltip =
        "Run the selected Agentic Harness with the test and Postman script update prompt.";
    const updateAgentsMd = new NodeItem({ kind: "action", label: "Update AGENTS.md" }, vscode.TreeItemCollapsibleState.None);
    updateAgentsMd.iconPath = new vscode.ThemeIcon("note", UPDATE_PROJECT_CONFIG_ACTION_COLOR);
    updateAgentsMd.command = {
        command: "antigravity.updateWorkspaceAgentsMd",
        title: "Update AGENTS.md"
    };
    updateAgentsMd.tooltip =
        "Open the selected Agentic Harness with the progressive-disclosure AGENTS.md update prompt.";
    return [updateGithubActions, updateTests, updateAgentsMd];
}
function getPrReviewerItems() {
    const reviewPullRequest = new NodeItem({ kind: "action", label: "Review a Pull Request" }, vscode.TreeItemCollapsibleState.None);
    reviewPullRequest.iconPath = new vscode.ThemeIcon("git-pull-request", QUICK_ACTION_COLOR);
    reviewPullRequest.command = {
        command: "antigravity.reviewPullRequest",
        title: "Review a Pull Request"
    };
    const approvePullRequest = new NodeItem({ kind: "action", label: "Approve a Pull Request" }, vscode.TreeItemCollapsibleState.None);
    approvePullRequest.iconPath = new vscode.ThemeIcon("pass", QUICK_ACTION_COLOR);
    approvePullRequest.command = {
        command: "antigravity.approvePullRequest",
        title: "Approve a Pull Request"
    };
    const feedbackOnPullRequest = new NodeItem({ kind: "action", label: "Feedback on Pull Request" }, vscode.TreeItemCollapsibleState.None);
    feedbackOnPullRequest.iconPath = new vscode.ThemeIcon("comment-discussion", QUICK_ACTION_COLOR);
    feedbackOnPullRequest.command = {
        command: "antigravity.feedbackOnPullRequest",
        title: "Feedback on Pull Request"
    };
    return [reviewPullRequest, approvePullRequest, feedbackOnPullRequest];
}
function getClaudeActionItems() {
    const item = new NodeItem({ kind: "action", label: "Claude Terminal" }, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon("robot", terminal_1.CLAUDE_ACTION_COLOR);
    item.command = {
        command: "antigravity.openClaudeTerminal",
        title: "Open Claude Terminal"
    };
    const codexTerminal = new NodeItem({ kind: "action", label: "Codex Terminal" }, vscode.TreeItemCollapsibleState.None);
    codexTerminal.iconPath = new vscode.ThemeIcon("robot", terminal_1.CLAUDE_ACTION_COLOR);
    codexTerminal.command = {
        command: "antigravity.openCodexTerminal",
        title: "Open Codex Terminal"
    };
    const opencodeTerminal = new NodeItem({ kind: "action", label: "Opencode Terminal" }, vscode.TreeItemCollapsibleState.None);
    opencodeTerminal.iconPath = new vscode.ThemeIcon("robot", terminal_1.CLAUDE_ACTION_COLOR);
    opencodeTerminal.command = {
        command: "antigravity.openOpencodeTerminal",
        title: "Open Opencode Terminal"
    };
    const setClaudeModel = new NodeItem({ kind: "action", label: "Set Claude Model" }, vscode.TreeItemCollapsibleState.None);
    setClaudeModel.iconPath = new vscode.ThemeIcon("repo", CLAUDE_MODEL_ACTION_COLOR);
    setClaudeModel.command = {
        command: "antigravity.setClaudeModel",
        title: "Set Claude Model"
    };
    const buildProject = new NodeItem({ kind: "action", label: "Build Project" }, vscode.TreeItemCollapsibleState.None);
    buildProject.iconPath = new vscode.ThemeIcon("tools", QUICK_ACTION_COLOR);
    buildProject.command = {
        command: "antigravity.buildProject",
        title: "Build Project"
    };
    const runProjectTests = new NodeItem({ kind: "action", label: "Run Project Tests" }, vscode.TreeItemCollapsibleState.None);
    runProjectTests.iconPath = new vscode.ThemeIcon("beaker", QUICK_ACTION_COLOR);
    runProjectTests.command = {
        command: "antigravity.runProjectTests",
        title: "Run Project Tests"
    };
    const ollamaTerminals = new NodeItem({ kind: "category", label: "Ollama Terminals" }, vscode.TreeItemCollapsibleState.Collapsed);
    ollamaTerminals.iconPath = new vscode.ThemeIcon("terminal", terminal_1.CLAUDE_ACTION_COLOR);
    const agentMonitorTerminals = new NodeItem({ kind: "category", label: "Agent Monitor Terminals" }, vscode.TreeItemCollapsibleState.Collapsed);
    agentMonitorTerminals.iconPath = new vscode.ThemeIcon("terminal", terminal_1.CLAUDE_ACTION_COLOR);
    return [item, codexTerminal, opencodeTerminal, ollamaTerminals, agentMonitorTerminals, setClaudeModel, buildProject, runProjectTests];
}
function getOllamaTerminalItems() {
    const ollamaClaude = new NodeItem({ kind: "action", label: "Ollama Claude" }, vscode.TreeItemCollapsibleState.None);
    ollamaClaude.iconPath = new vscode.ThemeIcon("robot", terminal_1.CLAUDE_ACTION_COLOR);
    ollamaClaude.command = {
        command: "antigravity.openOllamaClaudeTerminal",
        title: "Open Ollama Claude Terminal"
    };
    const ollamaCodex = new NodeItem({ kind: "action", label: "Ollama Codex" }, vscode.TreeItemCollapsibleState.None);
    ollamaCodex.iconPath = new vscode.ThemeIcon("robot", terminal_1.CLAUDE_ACTION_COLOR);
    ollamaCodex.command = {
        command: "antigravity.openOllamaCodexTerminal",
        title: "Open Ollama Codex Terminal"
    };
    return [ollamaClaude, ollamaCodex];
}
function getAgentMonitorTerminalItems() {
    const monitorClaude = new NodeItem({ kind: "action", label: "Agent Monitor Claude" }, vscode.TreeItemCollapsibleState.None);
    monitorClaude.iconPath = new vscode.ThemeIcon("robot", terminal_1.CLAUDE_ACTION_COLOR);
    monitorClaude.command = {
        command: "antigravity.openAgentMonitorClaudeTerminal",
        title: "Open Agent Monitor Claude Terminal"
    };
    const monitorCodex = new NodeItem({ kind: "action", label: "Agent Monitor Codex" }, vscode.TreeItemCollapsibleState.None);
    monitorCodex.iconPath = new vscode.ThemeIcon("robot", terminal_1.CLAUDE_ACTION_COLOR);
    monitorCodex.command = {
        command: "antigravity.openAgentMonitorCodexTerminal",
        title: "Open Agent Monitor Codex Terminal"
    };
    const monitorOpenCode = new NodeItem({ kind: "action", label: "Agent Monitor OpenCode" }, vscode.TreeItemCollapsibleState.None);
    monitorOpenCode.iconPath = new vscode.ThemeIcon("robot", terminal_1.CLAUDE_ACTION_COLOR);
    monitorOpenCode.command = {
        command: "antigravity.openAgentMonitorOpenCodeTerminal",
        title: "Open Agent Monitor OpenCode Terminal"
    };
    return [monitorClaude, monitorCodex, monitorOpenCode];
}
//# sourceMappingURL=treeProvider.js.map