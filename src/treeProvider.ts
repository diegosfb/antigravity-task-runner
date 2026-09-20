import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { getRootPath, getRepoRoot, getWorkspaceProjectPath, getAntigravityHomePath, safeReadDir } from "./utils";
import { isAutocommitRunning, hasGitHubRemoteSync, getCurrentBranchNameSync } from "./git";
import { CLAUDE_ACTION_COLOR } from "./terminal";
import {
  detectCloudInfrastructureSignals
} from "./cloudArchitectReview";
import { ADLC_AGENT_CATALOG, adlcAgentExists, getAdlcAgentRelativePath } from "./adlcAgents";

const HIDDEN_ADLC_AGENT_ITEM_IDS = new Set(["documentation", "spec-validation"]);
const ADLC_AGENT_ICON_COLOR = new vscode.ThemeColor("charts.red");

const execAsync = promisify(exec);

export type NodeKind = "category" | "agent" | "workflow" | "folder" | "separator" | "action" | "plugin" | "skill";

export type NodePayload = {
  kind: NodeKind;
  label: string;
  sortKey?: string;
  filePath?: string;
};

export class NodeItem extends vscode.TreeItem {
  readonly kind: NodeKind;
  readonly filePath?: string;
  readonly sortKey: string;

  constructor(payload: NodePayload, collapsibleState: vscode.TreeItemCollapsibleState) {
    super(payload.label, collapsibleState);
    this.kind = payload.kind;
    this.filePath = payload.filePath;
    this.sortKey = (payload.sortKey ?? payload.label).toLowerCase();
  }
}

export class AntigravityViewProvider implements vscode.TreeDataProvider<NodeItem> {
  private readonly emitter = new vscode.EventEmitter<NodeItem | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;

  refresh(): void {
    this.emitter.fire(undefined);
  }

  getTreeItem(element: NodeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: NodeItem): Promise<NodeItem[]> {
    if (!element) {
      const separatorItem = new NodeItem(
        { kind: "separator", label: "────────" },
        vscode.TreeItemCollapsibleState.None
      );
      separatorItem.tooltip = "";
      separatorItem.contextValue = "antigravitySeparator";

      const actionItems = getQuickActionItems();
      const claudeItems = getClaudeActionItems();
      const actionSeparator = new NodeItem(
        { kind: "separator", label: "────────" },
        vscode.TreeItemCollapsibleState.None
      );
      actionSeparator.tooltip = "";
      actionSeparator.contextValue = "antigravitySeparator";

      const agents = new NodeItem(
        { kind: "category", label: "Agents" },
        vscode.TreeItemCollapsibleState.Collapsed
      );
      agents.iconPath = new vscode.ThemeIcon("organization", new vscode.ThemeColor("charts.purple"));

      const skills = new NodeItem(
        { kind: "category", label: "Skills" },
        vscode.TreeItemCollapsibleState.Collapsed
      );
      skills.iconPath = new vscode.ThemeIcon("symbol-method", new vscode.ThemeColor("charts.purple"));

      const workflows = new NodeItem(
        { kind: "category", label: "Workflows" },
        vscode.TreeItemCollapsibleState.Collapsed
      );
      workflows.iconPath = new vscode.ThemeIcon("run-all", new vscode.ThemeColor("charts.purple"));

      const agenticHarnessAndAddOns = new NodeItem(
        { kind: "category", label: "Agentic Harness and AddOns" },
        vscode.TreeItemCollapsibleState.Collapsed
      );
      agenticHarnessAndAddOns.iconPath = new vscode.ThemeIcon("package", new vscode.ThemeColor("charts.purple"));

      const claudePluginsPath = path.join(os.homedir(), ".claude", "plugins");
      const claudePlugins = new NodeItem(
        { kind: "folder", label: "Claude Plugins", filePath: claudePluginsPath },
        vscode.TreeItemCollapsibleState.Collapsed
      );
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

    if (element.kind === "category" && element.label === "Deploy Agentic Libraries") {
      return getDeployAgenticLibrariesItems();
    }

    if (element.kind === "category" && element.label === "ADLC Agents") {
      return getAdlcAgentItems();
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
      if (!element.filePath) return [];
      return this.getFolderItems(element.filePath);
    }

    return [];
  }

  private async getClaudePluginItems(): Promise<NodeItem[]> {
    try {
      const { stdout, stderr } = await execAsync("claude plugin list 2>&1", { timeout: 8000 });
      const plugins = parsePluginListOutput(stdout || stderr || "");
      if (plugins.length === 0) {
        return [emptyItem("No plugins found")];
      }
      return plugins.map(({ name, enabled }) => {
        const displayName = name.split("@")[0];
        const item = new NodeItem(
          { kind: "plugin", label: displayName, filePath: name }, // filePath = full "name@marketplace"
          vscode.TreeItemCollapsibleState.None
        );
        item.contextValue = enabled ? "claudePluginEnabled" : "claudePluginDisabled";
        item.iconPath = new vscode.ThemeIcon(
          "extensions",
          new vscode.ThemeColor(enabled ? "terminal.ansiGreen" : "disabledForeground")
        );
        item.description = enabled ? "enabled" : "disabled";
        return item;
      });
    } catch {
      return [emptyItem("Failed to list plugins")];
    }
  }

  private async getAgentItems(): Promise<NodeItem[]> {
    try {
      const rootPath = getRootPath();
      const repoRoot = rootPath ? getRepoRoot(rootPath) : undefined;
      const opts = repoRoot ? { timeout: 8000, cwd: repoRoot } : { timeout: 8000 };
      const { stdout, stderr } = await execAsync("claude agents 2>&1", opts);
      const agents = parseAgentsOutput(stdout || stderr || "");
      if (agents.length === 0) {
        return [emptyItem("No agents found")];
      }
      const SECTION_ICON: Record<string, string> = {
        user: "account",
        plugin: "extensions",
        "built-in": "robot",
        project: "account"
      };
      return agents.map(({ name, model, section }) => {
        const sectionKey = section.toLowerCase();
        const item = new NodeItem(
          { kind: "agent", label: name, filePath: name },
          vscode.TreeItemCollapsibleState.None
        );
        item.contextValue = "antigravityClaudeAgent";
        item.description = model;
        item.tooltip = `${section} agent · ${model}`;
        item.iconPath = new vscode.ThemeIcon(
          SECTION_ICON[sectionKey] ?? "robot",
          CLAUDE_ACTION_COLOR
        );
        item.command = {
          command: "antigravity.runClaudeAgent",
          title: `Run ${name}`,
          arguments: [name]
        };
        return item;
      });
    } catch {
      return [emptyItem("Failed to list agents")];
    }
  }

  private async getSkillItems(): Promise<NodeItem[]> {
    const rootPath = getRootPath();
    const repoRoot = rootPath ? getRepoRoot(rootPath) : undefined;

    const allSkills: Array<{ name: string; filePath: string; source: string; section: string }> = [];

    // Project skills: <workspaceProjectPath>/.agent/skills/ and <repoRoot>/.claude/skills/ (deduped)
    if (repoRoot) {
      const projectBase = getWorkspaceProjectPath(repoRoot);
      const seenProjectSkills = new Set<string>();
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
      const item = new NodeItem(
        { kind: "skill", label: name, filePath },
        vscode.TreeItemCollapsibleState.None
      );
      item.contextValue = "antigravitySkillItem";
      item.description = source;
      item.tooltip = `${section} skill · ${source}`;
      item.iconPath = new vscode.ThemeIcon("symbol-keyword", CLAUDE_ACTION_COLOR);
      item.command = {
        command: "antigravity.openAgent",
        title: "Open Skill",
        arguments: [filePath]
      };
      return item;
    });
  }

  private async getWorkflowItems(): Promise<NodeItem[]> {
    const rootPath = getAntigravityHomePath();
    if (!rootPath) {
      return [missingRootItem()];
    }

    const workflowsDir = path.join(rootPath, "workflows");
    const entries = await safeReadDir(workflowsDir);

    const markdownFiles = entries.filter(
      (entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md"
    );

    const items = markdownFiles
      .map((entry) => {
        const workflowFile = path.join(workflowsDir, entry.name);
        const item = new NodeItem(
          { kind: "workflow", label: entry.name.replace(/\.md$/, ""), filePath: workflowFile },
          vscode.TreeItemCollapsibleState.None
        );
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

  private async getFolderItems(dirPath: string): Promise<NodeItem[]> {
    const entries = (await safeReadDir(dirPath)).filter(
      (entry) => !shouldHideAntigravityEntry(dirPath, entry)
    );
    const itemsWithKind = entries.map((entry) => {
      const entryPath = path.join(dirPath, entry.name);
      const isDirectory = entry.isDirectory();
      const item = new NodeItem(
        { kind: "folder", label: entry.name, filePath: entryPath },
        isDirectory
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
      );
      item.iconPath = new vscode.ThemeIcon(isDirectory ? "folder" : "file");
      if (isDirectory) {
        item.contextValue = fs.existsSync(path.join(entryPath, "SKILL.md"))
          ? "antigravityFolderItemSkillFolder"
          : fs.existsSync(path.join(entryPath, "AGENT.md"))
            ? "antigravityFolderItemAgentFolder"
            : "antigravityFolderItem";
      } else {
        if (entry.name === "SKILL.md") {
          item.contextValue = "antigravityFolderItemSkillFile";
        } else if (entry.name.endsWith(".md")) {
          item.contextValue = "antigravityFolderItemAgentFile";
        } else {
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
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.item.sortKey.localeCompare(b.item.sortKey);
      })
      .map((entry) => entry.item);

    return items.length > 0 ? items : [emptyItem("Empty folder")];
  }
}

const QUICK_ACTION_COLOR = new vscode.ThemeColor("charts.green");
const ORANGE_ACTION_COLOR = new vscode.ThemeColor("charts.orange");
const PULL_REMOTE_AND_MERGE_ACTION_COLOR = new vscode.ThemeColor("charts.yellow");
const CLAUDE_MODEL_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiBlue");
const JIRA_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiBlue");
const SOP_MANUAL_ACTION_COLOR = new vscode.ThemeColor("charts.yellow");
const WHITE_FOLDER_COLOR = new vscode.ThemeColor("terminal.ansiWhite");
const FEATURE_FLAG_ACTION_COLOR = new vscode.ThemeColor("charts.purple");
const MERGE_REVIEW_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiRed");
const CLOUD_ARCHITECT_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiCyan");
const EXPLAIN_ME_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiCyan");
const UPDATE_PROJECT_CONFIG_ACTION_COLOR = new vscode.ThemeColor("charts.green");
const FEATURE_ESTIMATOR_ICON_PATH = vscode.Uri.file(
  path.resolve(__dirname, "..", "Resources", "feature-estimator-red.svg")
);

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

function shouldHideAntigravityEntry(dirPath: string, entry: fs.Dirent): boolean {
  const antigravityRoot = getAntigravityHomePath();
  if (!antigravityRoot) return false;
  if (path.resolve(dirPath) !== path.resolve(antigravityRoot)) return false;
  return ANTIGRAVITY_ROOT_HIDDEN.has(entry.name);
}

function missingRootItem(): NodeItem {
  const item = new NodeItem(
    { kind: "category", label: "Missing ~/.antigravity" },
    vscode.TreeItemCollapsibleState.None
  );
  item.iconPath = new vscode.ThemeIcon("warning");
  item.tooltip = `Expected ${path.join(os.homedir(), ".gemini", "antigravity")} to exist.`;
  return item;
}

function emptyItem(label: string): NodeItem {
  const item = new NodeItem({ kind: "category", label }, vscode.TreeItemCollapsibleState.None);
  item.iconPath = new vscode.ThemeIcon("circle-slash");
  return item;
}

function readSkillsDir(dir: string): Array<{ name: string; filePath: string; source: string }> {
  if (!fs.existsSync(dir)) return [];
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => {
        // isDirectory() returns false for symlinks — follow them explicitly
        if (e.isDirectory()) return true;
        if (e.isSymbolicLink()) {
          try { return fs.statSync(path.join(dir, e.name)).isDirectory(); } catch { return false; }
        }
        return false;
      })
      .map((e) => ({ name: e.name, filePath: path.join(dir, e.name, "SKILL.md"), source: path.basename(dir) }))
      .filter((s) => fs.existsSync(s.filePath));
  } catch {
    return [];
  }
}

async function readEnabledPluginSkills(): Promise<Array<{ name: string; filePath: string; source: string }>> {
  try {
    const { stdout, stderr } = await execAsync("claude plugin list 2>&1", { timeout: 8000 });
    const clean = (stdout || stderr || "").replace(ANSI_CSI_PATTERN, "");
    const skills: Array<{ name: string; filePath: string; source: string }> = [];
    let pluginName = "";
    let marketplace = "";
    let version = "";

    for (const rawLine of clean.split("\n")) {
      const line = rawLine.trim();
      const headerMatch = line.match(/^❯\s+([a-zA-Z0-9_.-]+)@([a-zA-Z0-9_.-]+)/);
      if (headerMatch) { pluginName = headerMatch[1]; marketplace = headerMatch[2]; version = ""; continue; }
      const versionMatch = line.match(/^Version:\s+(\S+)/);
      if (versionMatch) { version = versionMatch[1]; continue; }
      const statusMatch = line.match(/^Status:\s*[✔✘✗]\s*(enabled|disabled)/i);
      if (statusMatch && statusMatch[1].toLowerCase() === "enabled" && pluginName && version) {
        const skillsDir = path.join(os.homedir(), ".claude", "plugins", "cache", marketplace, pluginName, version, "skills");
        for (const s of readSkillsDir(skillsDir)) {
          skills.push({ name: s.name, filePath: s.filePath, source: pluginName });
        }
      }
    }
    return skills;
  } catch {
    return [];
  }
}

function parseAgentsOutput(output: string): Array<{ name: string; model: string; section: string }> {
  const agents: Array<{ name: string; model: string; section: string }> = [];
  let currentSection = "";

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

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

function parsePluginListOutput(output: string): Array<{ name: string; enabled: boolean }> {
  // Strip ANSI escape codes
  const clean = output.replace(ANSI_CSI_PATTERN, "").replace(ANSI_OSC_PATTERN, "");

  // Try JSON first
  const trimmed = clean.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const data = JSON.parse(trimmed);
      const arr: unknown[] = Array.isArray(data) ? data : [data];
      return arr
        .map((item) => {
          const obj = item as Record<string, unknown>;
          return {
            name: String(obj["name"] ?? obj["id"] ?? ""),
            enabled: obj["enabled"] !== false && obj["status"] !== "disabled"
          };
        })
        .filter((p) => p.name);
    } catch { /* fall through */ }
  }

  // Primary format — multi-line blocks:
  //   ❯ frontend-design@claude-plugins-official
  //     Version: 6223f4d740e7
  //     Scope: user
  //     Status: ✔ enabled
  const plugins: Array<{ name: string; enabled: boolean }> = [];
  let pendingName: string | null = null;

  for (const rawLine of clean.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

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

function buildAntigravityItem(): NodeItem {
  const antigravityRoot = getAntigravityHomePath();
  const antigravityLabel = antigravityRoot ? path.basename(antigravityRoot) : ".antigravity";
  const antigravityItem = new NodeItem(
    { kind: "folder", label: antigravityLabel, filePath: antigravityRoot },
    antigravityRoot
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None
  );
  antigravityItem.iconPath = new vscode.ThemeIcon("folder");
  antigravityItem.contextValue = "antigravityFolderItem";
  if (!antigravityRoot) {
    antigravityItem.label = "Missing ~/.gemini/antigravity";
    antigravityItem.iconPath = new vscode.ThemeIcon("warning");
    antigravityItem.tooltip = `Expected ${path.join(os.homedir(), ".gemini", "antigravity")} to exist.`;
  }
  return antigravityItem;
}

function getAgenticHarnessAndAddOnsItems(): NodeItem[] {
  return [buildAntigravityItem(), ...getLinkedFolderItems()];
}

function getLinkedFolderItems(): NodeItem[] {
  const folders: Array<{ label: string; path: string; isAddons?: boolean }> = [...TOP_LEVEL_LINKED_FOLDERS];
  const rawAddons = vscode.workspace.getConfiguration("antigravity").get<string>("customAgenticPlatformAddons") || "";
  const addonsPath = rawAddons.trim().replace(/^~/, os.homedir());
  if (addonsPath) {
    folders.push({ label: path.basename(addonsPath) || "addons", path: addonsPath, isAddons: true });
  }
  return folders.filter((linked) => fs.existsSync(linked.path)).map(
    (linked) => {
      const item = new NodeItem(
        { kind: "folder", label: linked.label, filePath: linked.path },
        vscode.TreeItemCollapsibleState.Collapsed
      );
      item.iconPath = new vscode.ThemeIcon(
        "folder",
        linked.isAddons ? CLAUDE_ACTION_COLOR : WHITE_FOLDER_COLOR
      );
      item.tooltip = linked.path;
      item.contextValue = "antigravityFolderItem";
      return item;
    }
  );
}

function getQuickActionItems(): NodeItem[] {
  const items: NodeItem[] = [];
  const rootPath = getRootPath();
  const repoRoot = rootPath ? getRepoRoot(rootPath) : undefined;
  const cloudInfrastructureSignals = repoRoot
    ? detectCloudInfrastructureSignals(repoRoot, 3)
    : [];
  const hasCloudInfrastructure = cloudInfrastructureSignals.length > 0;
  const hasRepo = repoRoot ? fs.existsSync(path.join(repoRoot, ".git")) : false;
  const autocommitRunning = repoRoot ? isAutocommitRunning(repoRoot) : false;
  const hasAgentFolder = repoRoot ? fs.existsSync(path.join(getWorkspaceProjectPath(repoRoot), ".agent")) : false;
  const hasGitHub = repoRoot ? hasGitHubRemoteSync(repoRoot) : false;
  const savedJiraProjectKey =
    repoRoot && fs.existsSync(path.join(repoRoot, ".env"))
      ? (
        fs
          .readFileSync(path.join(repoRoot, ".env"), "utf8")
          .match(/^\s*JIRA_PROJECT_KEY\s*=\s*([^\r\n#]+)/m)?.[1] ?? ""
      )
        .trim()
        .replace(/^['"]|['"]$/g, "")
        .toUpperCase()
      : "";

  const setupWorkspace = new NodeItem(
    { kind: "action", label: "Setup Workspace" },
    vscode.TreeItemCollapsibleState.None
  );
  setupWorkspace.iconPath = new vscode.ThemeIcon("debug-continue", QUICK_ACTION_COLOR);
  if (hasAgentFolder) {
    setupWorkspace.iconPath = new vscode.ThemeIcon(
      "debug-continue",
      new vscode.ThemeColor("disabledForeground")
    );
    setupWorkspace.tooltip = "A .agent folder already exists in this project.";
  }
  setupWorkspace.contextValue = hasRepo ? "antigravitySetupWorkspaceActionWithRepo" : "antigravitySetupWorkspaceAction";
  setupWorkspace.command = {
    command: "antigravity.setupWorkspace",
    title: "Setup Workspace"
  };
  items.push(setupWorkspace);

  const deployAgenticLibraries = new NodeItem(
    { kind: "category", label: "Deploy Agentic Libraries" },
    vscode.TreeItemCollapsibleState.Collapsed
  );
  deployAgenticLibraries.iconPath = new vscode.ThemeIcon("cloud-upload", QUICK_ACTION_COLOR);
  deployAgenticLibraries.tooltip = "Deploy agentic libraries to the current workspace.";
  items.push(deployAgenticLibraries);



  const assignBacklogItemToAgent = new NodeItem(
    { kind: "action", label: "Assign Backlog Item to Agent" },
    vscode.TreeItemCollapsibleState.None
  );
  assignBacklogItemToAgent.iconPath = new vscode.ThemeIcon("person-add", JIRA_ACTION_COLOR);
  assignBacklogItemToAgent.tooltip = "Assign a Jira item or a local backlog item from docs/backlog to the selected agent.";
  assignBacklogItemToAgent.command = {
    command: "antigravity.assignBacklogItemToAgent",
    title: "Assign Backlog Item to Agent"
  };
  items.push(assignBacklogItemToAgent);

  if (!hasRepo) {
    const initRepo = new NodeItem(
      { kind: "action", label: "Init Repository" },
      vscode.TreeItemCollapsibleState.None
    );
    initRepo.iconPath = new vscode.ThemeIcon("repo", ORANGE_ACTION_COLOR);
    initRepo.command = {
      command: "antigravity.initRepository",
      title: "Init Repository"
    };
    items.push(initRepo);
  }

  if (hasRepo) {
    const repositoryActions = new NodeItem(
      { kind: "category", label: "Repository Actions" },
      vscode.TreeItemCollapsibleState.Collapsed
    );
    repositoryActions.iconPath = new vscode.ThemeIcon("github", ORANGE_ACTION_COLOR);
    items.push(repositoryActions);
  }

  const setFeatureFlag = new NodeItem(
    { kind: "action", label: "Set Feature Flag for changes" },
    vscode.TreeItemCollapsibleState.None
  );
  setFeatureFlag.iconPath = new vscode.ThemeIcon("symbol-boolean", FEATURE_FLAG_ACTION_COLOR);
  setFeatureFlag.command = {
    command: "antigravity.setFeatureFlag",
    title: "Set Feature Flag for changes"
  };
  items.push(setFeatureFlag);

  const adlcAgents = new NodeItem(
    { kind: "category", label: "ADLC Agents" },
    vscode.TreeItemCollapsibleState.Collapsed
  );
  adlcAgents.iconPath = new vscode.ThemeIcon("organization", ADLC_AGENT_ICON_COLOR);
  adlcAgents.tooltip = "Run an ADLC agent from .agents/agents with a chosen harness, model, and input artifacts.";
  items.push(adlcAgents);

  const addBacklogItem = new NodeItem(
    { kind: "action", label: "Add Backlog Item" },
    vscode.TreeItemCollapsibleState.None
  );
  addBacklogItem.iconPath = new vscode.ThemeIcon("add", JIRA_ACTION_COLOR);
  addBacklogItem.tooltip = "Create a backlog item in docs/backlog, and in Jira too when a project is connected.";
  addBacklogItem.command = {
    command: "antigravity.addBacklogItem",
    title: "Add Backlog Item"
  };
  items.push(addBacklogItem);

  const takeBacklogItemAssign = new NodeItem(
    { kind: "action", label: "Take Backlog Item (Assign)" },
    vscode.TreeItemCollapsibleState.None
  );
  takeBacklogItemAssign.iconPath = new vscode.ThemeIcon("person-add", JIRA_ACTION_COLOR);
  takeBacklogItemAssign.tooltip = "Take a backlog item (Jira or local) and assign it to yourself, moving it to In Progress.";
  takeBacklogItemAssign.command = {
    command: "antigravity.takeBacklogItemAssign",
    title: "Take Backlog Item (Assign)"
  };
  items.push(takeBacklogItemAssign);

  const markBacklogItemCompleted = new NodeItem(
    { kind: "action", label: "Mark Backlog Item as Completed" },
    vscode.TreeItemCollapsibleState.None
  );
  markBacklogItemCompleted.iconPath = new vscode.ThemeIcon("pass", JIRA_ACTION_COLOR);
  markBacklogItemCompleted.tooltip = "Mark a backlog item (Jira or local) as completed.";
  markBacklogItemCompleted.command = {
    command: "antigravity.completeJiraItem",
    title: "Mark Backlog Item as Completed"
  };
  items.push(markBacklogItemCompleted);

  if (!savedJiraProjectKey) {
    const selectOrCreateJiraProject = new NodeItem(
      { kind: "action", label: "Select/Set Jira Project" },
      vscode.TreeItemCollapsibleState.None
    );
    selectOrCreateJiraProject.iconPath = new vscode.ThemeIcon("project", JIRA_ACTION_COLOR);
    selectOrCreateJiraProject.command = {
      command: "antigravity.selectOrCreateJiraProject",
      title: "Select/Set Jira Project"
    };
    items.push(selectOrCreateJiraProject);
  }

  const incrementMajor = new NodeItem(
    { kind: "action", label: "Increment Major Version" },
    vscode.TreeItemCollapsibleState.None
  );
  incrementMajor.iconPath = new vscode.ThemeIcon("arrow-up", QUICK_ACTION_COLOR);
  incrementMajor.command = {
    command: "antigravity.incrementMajorVersion",
    title: "Increment Major Version"
  };
  items.push(incrementMajor);

  const incrementMinor = new NodeItem(
    { kind: "action", label: "Increment Minor Version" },
    vscode.TreeItemCollapsibleState.None
  );
  incrementMinor.iconPath = new vscode.ThemeIcon("arrow-up", QUICK_ACTION_COLOR);
  incrementMinor.command = {
    command: "antigravity.incrementMinorVersion",
    title: "Increment Minor Version"
  };
  items.push(incrementMinor);

  const incrementPatch = new NodeItem(
    { kind: "action", label: "Increment Patch Version" },
    vscode.TreeItemCollapsibleState.None
  );
  incrementPatch.iconPath = new vscode.ThemeIcon("arrow-up", QUICK_ACTION_COLOR);
  incrementPatch.command = {
    command: "antigravity.incrementPatchVersion",
    title: "Increment Patch Version"
  };
  items.push(incrementPatch);

  const cloudArchitectReview = new NodeItem(
    { kind: "action", label: "Cloud Architect Review" },
    vscode.TreeItemCollapsibleState.None
  );
  if (hasCloudInfrastructure) {
    cloudArchitectReview.iconPath = new vscode.ThemeIcon("cloud", CLOUD_ARCHITECT_ACTION_COLOR);
    cloudArchitectReview.command = {
      command: "antigravity.cloudArchitectReview",
      title: "Cloud Architect Review"
    };
    cloudArchitectReview.tooltip =
      `Detected cloud infrastructure signals: ${cloudInfrastructureSignals.join(", ")}`;
  } else {
    cloudArchitectReview.iconPath = new vscode.ThemeIcon(
      "cloud",
      new vscode.ThemeColor("disabledForeground")
    );
    cloudArchitectReview.tooltip =
      `Disabled because no cloud infrastructure signals were detected in this project. ` +
      "Looked for directories like infra/terraform/k8s and files such as deploy scripts, docker-compose, and Terraform manifests.";
  }
  items.push(cloudArchitectReview);

  const featureEstimator = new NodeItem(
    { kind: "action", label: "Feature Estimator" },
    vscode.TreeItemCollapsibleState.None
  );
  featureEstimator.iconPath = FEATURE_ESTIMATOR_ICON_PATH;
  featureEstimator.command = {
    command: "antigravity.featureEstimator",
    title: "Feature Estimator"
  };
  featureEstimator.tooltip =
    "Estimate a feature from a To Do Jira item or a free-form description using the selected Agentic Harness.";
  items.push(featureEstimator);

  const explainMe = new NodeItem(
    { kind: "action", label: "Explain Me" },
    vscode.TreeItemCollapsibleState.None
  );
  explainMe.iconPath = new vscode.ThemeIcon("comment-discussion", EXPLAIN_ME_ACTION_COLOR);
  explainMe.command = {
    command: "antigravity.explainMe",
    title: "Explain Me"
  };
  explainMe.tooltip =
    "Download the latest explain-me skill into the project and ask the selected Agentic Harness to explain the whole solution and the latest uncommitted changes.";
  items.push(explainMe);

  const autocommitCheckpoint = new NodeItem(
    { kind: "action", label: autocommitRunning ? "Autocommit Stop" : "Autocommit Start" },
    vscode.TreeItemCollapsibleState.None
  );
  if (!autocommitRunning && !hasGitHub) {
    autocommitCheckpoint.iconPath = new vscode.ThemeIcon("save-all", new vscode.ThemeColor("disabledForeground"));
    autocommitCheckpoint.tooltip = "No GitHub repository found. Please Init a repository first.";
  } else {
    autocommitCheckpoint.iconPath = new vscode.ThemeIcon("save-all", QUICK_ACTION_COLOR);
    autocommitCheckpoint.command = {
      command: "antigravity.autocommitCheckpoint",
      title: "Autocommit Checkpoint"
    };
  }
  items.push(autocommitCheckpoint);

  if (autocommitRunning) {
    const revertChanges = new NodeItem(
      { kind: "action", label: "Revert Changes" },
      vscode.TreeItemCollapsibleState.None
    );
    revertChanges.iconPath = new vscode.ThemeIcon("discard", QUICK_ACTION_COLOR);
    revertChanges.command = {
      command: "antigravity.autocommitRevert",
      title: "Revert Changes"
    };
    items.push(revertChanges);
  }

  const sopManual = new NodeItem(
    { kind: "action", label: "SOP Manual" },
    vscode.TreeItemCollapsibleState.None
  );
  sopManual.iconPath = new vscode.ThemeIcon("repo", SOP_MANUAL_ACTION_COLOR);
  sopManual.contextValue = "antigravitySopManual";
  sopManual.command = {
    command: "antigravity.openSopManual",
    title: "SOP Manual"
  };
  items.push(sopManual);

  return items;
}

function getRepositoryActionItems(): NodeItem[] {
  const items: NodeItem[] = [];
  const rootPath = getRootPath();
  const repoRoot = rootPath ? getRepoRoot(rootPath) : undefined;
  const currentBranch = repoRoot ? getCurrentBranchNameSync(repoRoot) : undefined;

  const commitChanges = new NodeItem(
    { kind: "action", label: "Commit" },
    vscode.TreeItemCollapsibleState.None
  );
  commitChanges.iconPath = new vscode.ThemeIcon("check", ORANGE_ACTION_COLOR);
  commitChanges.command = {
    command: "antigravity.commitChanges",
    title: "Commit"
  };
  items.push(commitChanges);

  const createRepoTagVersion = new NodeItem(
    { kind: "action", label: "Create Repo Release" },
    vscode.TreeItemCollapsibleState.None
  );
  createRepoTagVersion.iconPath = new vscode.ThemeIcon("tag", ORANGE_ACTION_COLOR);
  createRepoTagVersion.command = {
    command: "antigravity.createRepoTagVersion",
    title: "Create Repo Release"
  };
  items.push(createRepoTagVersion);

  const createFeatureBranch = new NodeItem(
    { kind: "action", label: "Create Feature Branch" },
    vscode.TreeItemCollapsibleState.None
  );
  createFeatureBranch.iconPath = new vscode.ThemeIcon("source-control", ORANGE_ACTION_COLOR);
  createFeatureBranch.command = {
    command: "antigravity.createFeatureBranch",
    title: "Create Feature Branch"
  };
  items.push(createFeatureBranch);

  const createPullRequest = new NodeItem(
    { kind: "action", label: "Create Pull Request" },
    vscode.TreeItemCollapsibleState.None
  );
  createPullRequest.iconPath = new vscode.ThemeIcon("git-pull-request", ORANGE_ACTION_COLOR);
  createPullRequest.command = {
    command: "antigravity.createPullRequest",
    title: "Create Pull Request"
  };
  items.push(createPullRequest);

  if (currentBranch && currentBranch !== "main") {
    const mergeBranchToMain = new NodeItem(
      { kind: "action", label: "Merge branch to main" },
      vscode.TreeItemCollapsibleState.None
    );
    mergeBranchToMain.iconPath = new vscode.ThemeIcon("git-merge", ORANGE_ACTION_COLOR);
    mergeBranchToMain.command = {
      command: "antigravity.mergeBranchToMain",
      title: "Merge branch to main"
    };
    items.push(mergeBranchToMain);
  }

  const checkoutMain = new NodeItem(
    { kind: "action", label: "Go To Branch" },
    vscode.TreeItemCollapsibleState.None
  );
  checkoutMain.iconPath = new vscode.ThemeIcon("git-compare", ORANGE_ACTION_COLOR);
  checkoutMain.command = {
    command: "antigravity.checkoutMain",
    title: "Go To Branch"
  };
  items.push(checkoutMain);

  const pullRemoteAndMerge = new NodeItem(
    { kind: "action", label: "Pull Remote and merge" },
    vscode.TreeItemCollapsibleState.None
  );
  pullRemoteAndMerge.iconPath = new vscode.ThemeIcon("cloud-download", PULL_REMOTE_AND_MERGE_ACTION_COLOR);
  pullRemoteAndMerge.command = {
    command: "antigravity.pullRemoteAndMerge",
    title: "Pull Remote and merge"
  };
  items.push(pullRemoteAndMerge);

  const agenticReviewOfMerge = new NodeItem(
    { kind: "action", label: "Agentic review of Merge" },
    vscode.TreeItemCollapsibleState.None
  );
  agenticReviewOfMerge.iconPath = new vscode.ThemeIcon("warning", MERGE_REVIEW_ACTION_COLOR);
  agenticReviewOfMerge.command = {
    command: "antigravity.agenticReviewOfMerge",
    title: "Agentic review of Merge"
  };
  items.push(agenticReviewOfMerge);

  return items;
}

function getAdlcAgentItems(): NodeItem[] {
  const rootPath = getRootPath();
  const repoRoot = rootPath ? getRepoRoot(rootPath) : undefined;
  return ADLC_AGENT_CATALOG.filter((entry) => !HIDDEN_ADLC_AGENT_ITEM_IDS.has(entry.id)).map((entry) => {
    const available = repoRoot ? adlcAgentExists(repoRoot, entry.folder) : false;
    const relativePath = getAdlcAgentRelativePath(entry.folder);
    const item = new NodeItem(
      { kind: "action", label: entry.label },
      vscode.TreeItemCollapsibleState.None
    );
    item.iconPath = new vscode.ThemeIcon("robot", ADLC_AGENT_ICON_COLOR);
    item.tooltip = available
      ? `Run ${entry.label} (${relativePath}) with a chosen harness, model, and input artifacts.`
      : `${relativePath} was not found. Deploy the SDLC library to enable this agent.`;
    if (!available) item.description = "not deployed";
    item.command = {
      command: "antigravity.runAdlcAgent",
      title: entry.label,
      arguments: [entry.id]
    };
    return item;
  });
}

function getDeployAgenticLibrariesItems(): NodeItem[] {
  const deployColor = new vscode.ThemeColor("charts.blue");

  const deploySdlc = new NodeItem(
    { kind: "action", label: "Deploy SDLC" },
    vscode.TreeItemCollapsibleState.None
  );
  deploySdlc.iconPath = new vscode.ThemeIcon("cloud-upload", deployColor);
  deploySdlc.command = {
    command: "antigravity.deployAgenticLibSdlc",
    title: "Deploy SDLC"
  };

  const deploySdlcExtended = new NodeItem(
    { kind: "action", label: "Deploy SDLC Extended" },
    vscode.TreeItemCollapsibleState.None
  );
  deploySdlcExtended.iconPath = new vscode.ThemeIcon("cloud-upload", deployColor);
  deploySdlcExtended.command = {
    command: "antigravity.deployAgenticLibSdlcExtended",
    title: "Deploy SDLC Extended"
  };

  const deployProfessionalServices = new NodeItem(
    { kind: "action", label: "Deploy Professional Services" },
    vscode.TreeItemCollapsibleState.None
  );
  deployProfessionalServices.iconPath = new vscode.ThemeIcon("cloud-upload", deployColor);
  deployProfessionalServices.command = {
    command: "antigravity.deployAgenticLibProfessionalServices",
    title: "Deploy Professional Services"
  };

  const deployTechAdvisory = new NodeItem(
    { kind: "action", label: "Deploy Tech Advisory" },
    vscode.TreeItemCollapsibleState.None
  );
  deployTechAdvisory.iconPath = new vscode.ThemeIcon("cloud-upload", deployColor);
  deployTechAdvisory.command = {
    command: "antigravity.deployAgenticLibTechAdvisory",
    title: "Deploy Tech Advisory"
  };

  const cleanDeployedLibs = new NodeItem(
    { kind: "action", label: "Clean Deployed Libs" },
    vscode.TreeItemCollapsibleState.None
  );
  cleanDeployedLibs.iconPath = new vscode.ThemeIcon("trash", new vscode.ThemeColor("charts.red"));
  cleanDeployedLibs.command = {
    command: "antigravity.cleanDeployedLibs",
    title: "Clean Deployed Libs"
  };

  return [deploySdlc, deploySdlcExtended, deployProfessionalServices, deployTechAdvisory, cleanDeployedLibs];
}

function getUpdateProjectConfigItems(): NodeItem[] {
  const updateGithubActions = new NodeItem(
    { kind: "action", label: "Update Github Actions" },
    vscode.TreeItemCollapsibleState.None
  );
  updateGithubActions.iconPath = new vscode.ThemeIcon(
    "github-action",
    UPDATE_PROJECT_CONFIG_ACTION_COLOR
  );
  updateGithubActions.command = {
    command: "antigravity.updateGithubActions",
    title: "Update Github Actions"
  };
  updateGithubActions.tooltip =
    "Run the selected Agentic Harness with the GitHub Actions update prompt.";

  const updateTests = new NodeItem(
    { kind: "action", label: "Update Tests" },
    vscode.TreeItemCollapsibleState.None
  );
  updateTests.iconPath = new vscode.ThemeIcon("beaker", UPDATE_PROJECT_CONFIG_ACTION_COLOR);
  updateTests.command = {
    command: "antigravity.updateTests",
    title: "Update Tests"
  };
  updateTests.tooltip =
    "Run the selected Agentic Harness with the test and Postman script update prompt.";

  const updateAgentsMd = new NodeItem(
    { kind: "action", label: "Update AGENTS.md" },
    vscode.TreeItemCollapsibleState.None
  );
  updateAgentsMd.iconPath = new vscode.ThemeIcon("note", UPDATE_PROJECT_CONFIG_ACTION_COLOR);
  updateAgentsMd.command = {
    command: "antigravity.updateWorkspaceAgentsMd",
    title: "Update AGENTS.md"
  };
  updateAgentsMd.tooltip =
    "Open the selected Agentic Harness with the progressive-disclosure AGENTS.md update prompt.";

  return [updateGithubActions, updateTests, updateAgentsMd];
}

function getPrReviewerItems(): NodeItem[] {
  const reviewPullRequest = new NodeItem(
    { kind: "action", label: "Review a Pull Request" },
    vscode.TreeItemCollapsibleState.None
  );
  reviewPullRequest.iconPath = new vscode.ThemeIcon("git-pull-request", QUICK_ACTION_COLOR);
  reviewPullRequest.command = {
    command: "antigravity.reviewPullRequest",
    title: "Review a Pull Request"
  };

  const approvePullRequest = new NodeItem(
    { kind: "action", label: "Approve a Pull Request" },
    vscode.TreeItemCollapsibleState.None
  );
  approvePullRequest.iconPath = new vscode.ThemeIcon("pass", QUICK_ACTION_COLOR);
  approvePullRequest.command = {
    command: "antigravity.approvePullRequest",
    title: "Approve a Pull Request"
  };

  const feedbackOnPullRequest = new NodeItem(
    { kind: "action", label: "Feedback on Pull Request" },
    vscode.TreeItemCollapsibleState.None
  );
  feedbackOnPullRequest.iconPath = new vscode.ThemeIcon("comment-discussion", QUICK_ACTION_COLOR);
  feedbackOnPullRequest.command = {
    command: "antigravity.feedbackOnPullRequest",
    title: "Feedback on Pull Request"
  };

  return [reviewPullRequest, approvePullRequest, feedbackOnPullRequest];
}

function getClaudeActionItems(): NodeItem[] {
  const item = new NodeItem(
    { kind: "action", label: "Claude Terminal" },
    vscode.TreeItemCollapsibleState.None
  );
  item.iconPath = new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR);
  item.command = {
    command: "antigravity.openClaudeTerminal",
    title: "Open Claude Terminal"
  };

  const codexTerminal = new NodeItem(
    { kind: "action", label: "Codex Terminal" },
    vscode.TreeItemCollapsibleState.None
  );
  codexTerminal.iconPath = new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR);
  codexTerminal.command = {
    command: "antigravity.openCodexTerminal",
    title: "Open Codex Terminal"
  };

  const opencodeTerminal = new NodeItem(
    { kind: "action", label: "Opencode Terminal" },
    vscode.TreeItemCollapsibleState.None
  );
  opencodeTerminal.iconPath = new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR);
  opencodeTerminal.command = {
    command: "antigravity.openOpencodeTerminal",
    title: "Open Opencode Terminal"
  };

  const setClaudeModel = new NodeItem(
    { kind: "action", label: "Set Claude Model" },
    vscode.TreeItemCollapsibleState.None
  );
  setClaudeModel.iconPath = new vscode.ThemeIcon("repo", CLAUDE_MODEL_ACTION_COLOR);
  setClaudeModel.command = {
    command: "antigravity.setClaudeModel",
    title: "Set Claude Model"
  };
  const buildProject = new NodeItem(
    { kind: "action", label: "Build Project" },
    vscode.TreeItemCollapsibleState.None
  );
  buildProject.iconPath = new vscode.ThemeIcon("tools", QUICK_ACTION_COLOR);
  buildProject.command = {
    command: "antigravity.buildProject",
    title: "Build Project"
  };

  const runProjectTests = new NodeItem(
    { kind: "action", label: "Run Project Tests" },
    vscode.TreeItemCollapsibleState.None
  );
  runProjectTests.iconPath = new vscode.ThemeIcon("beaker", QUICK_ACTION_COLOR);
  runProjectTests.command = {
    command: "antigravity.runProjectTests",
    title: "Run Project Tests"
  };

  const ollamaTerminals = new NodeItem(
    { kind: "category", label: "Ollama Terminals" },
    vscode.TreeItemCollapsibleState.Collapsed
  );
  ollamaTerminals.iconPath = new vscode.ThemeIcon("terminal", CLAUDE_ACTION_COLOR);

  const agentMonitorTerminals = new NodeItem(
    { kind: "category", label: "Agent Monitor Terminals" },
    vscode.TreeItemCollapsibleState.Collapsed
  );
  agentMonitorTerminals.iconPath = new vscode.ThemeIcon("terminal", CLAUDE_ACTION_COLOR);

  return [item, codexTerminal, opencodeTerminal, ollamaTerminals, agentMonitorTerminals, setClaudeModel, buildProject, runProjectTests];
}

function getOllamaTerminalItems(): NodeItem[] {
  const ollamaClaude = new NodeItem(
    { kind: "action", label: "Ollama Claude" },
    vscode.TreeItemCollapsibleState.None
  );
  ollamaClaude.iconPath = new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR);
  ollamaClaude.command = {
    command: "antigravity.openOllamaClaudeTerminal",
    title: "Open Ollama Claude Terminal"
  };

  const ollamaCodex = new NodeItem(
    { kind: "action", label: "Ollama Codex" },
    vscode.TreeItemCollapsibleState.None
  );
  ollamaCodex.iconPath = new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR);
  ollamaCodex.command = {
    command: "antigravity.openOllamaCodexTerminal",
    title: "Open Ollama Codex Terminal"
  };

  return [ollamaClaude, ollamaCodex];
}

function getAgentMonitorTerminalItems(): NodeItem[] {
  const monitorClaude = new NodeItem(
    { kind: "action", label: "Agent Monitor Claude" },
    vscode.TreeItemCollapsibleState.None
  );
  monitorClaude.iconPath = new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR);
  monitorClaude.command = {
    command: "antigravity.openAgentMonitorClaudeTerminal",
    title: "Open Agent Monitor Claude Terminal"
  };

  const monitorCodex = new NodeItem(
    { kind: "action", label: "Agent Monitor Codex" },
    vscode.TreeItemCollapsibleState.None
  );
  monitorCodex.iconPath = new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR);
  monitorCodex.command = {
    command: "antigravity.openAgentMonitorCodexTerminal",
    title: "Open Agent Monitor Codex Terminal"
  };

  const monitorOpenCode = new NodeItem(
    { kind: "action", label: "Agent Monitor OpenCode" },
    vscode.TreeItemCollapsibleState.None
  );
  monitorOpenCode.iconPath = new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR);
  monitorOpenCode.command = {
    command: "antigravity.openAgentMonitorOpenCodeTerminal",
    title: "Open Agent Monitor OpenCode Terminal"
  };

  return [monitorClaude, monitorCodex, monitorOpenCode];
}
