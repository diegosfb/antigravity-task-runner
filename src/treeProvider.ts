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
      const claudeSeparator = new NodeItem(
        { kind: "separator", label: "────────" },
        vscode.TreeItemCollapsibleState.None
      );
      claudeSeparator.tooltip = "";
      claudeSeparator.contextValue = "antigravitySeparator";

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

      const linkedFolderItems = getLinkedFolderItems();

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

    if (element.kind === "category" && element.label === "PR Reviewer") {
      return getPrReviewerItems();
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
  const currentBranch = hasRepo && repoRoot ? getCurrentBranchNameSync(repoRoot) : undefined;
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
  setupWorkspace.iconPath = new vscode.ThemeIcon("repo-clone", QUICK_ACTION_COLOR);
  if (hasAgentFolder) {
    setupWorkspace.iconPath = new vscode.ThemeIcon(
      "repo-clone",
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

  const workspaceSetup = new NodeItem(
    { kind: "action", label: "Workspace Setup" },
    vscode.TreeItemCollapsibleState.None
  );
  workspaceSetup.iconPath = new vscode.ThemeIcon("run-all", QUICK_ACTION_COLOR);
  if (hasAgentFolder) {
    workspaceSetup.iconPath = new vscode.ThemeIcon(
      "run-all",
      new vscode.ThemeColor("disabledForeground")
    );
    workspaceSetup.tooltip = "A .agent folder already exists in this project.";
  }
  workspaceSetup.command = {
    command: "antigravity.workspaceSetup",
    title: "Run Workspace Setup"
  };
  items.push(workspaceSetup);

  const assignJiraItemToAgent = new NodeItem(
    { kind: "action", label: "Assign Jira Item to Agent" },
    vscode.TreeItemCollapsibleState.None
  );
  assignJiraItemToAgent.iconPath = new vscode.ThemeIcon("person-add", JIRA_ACTION_COLOR);
  if (!savedJiraProjectKey) {
    assignJiraItemToAgent.iconPath = new vscode.ThemeIcon(
      "person-add",
      new vscode.ThemeColor("disabledForeground")
    );
    assignJiraItemToAgent.tooltip =
      "Set JIRA_PROJECT_KEY in this repository before assigning a Jira item to an agent.";
  }
  assignJiraItemToAgent.command = {
    command: "antigravity.assignJiraItemToAgent",
    title: "Assign Jira Item to Agent"
  };
  items.push(assignJiraItemToAgent);

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
  } else {
    const addJiraItem = new NodeItem(
      { kind: "action", label: "Add Jira Item" },
      vscode.TreeItemCollapsibleState.None
    );
    addJiraItem.iconPath = new vscode.ThemeIcon("add", JIRA_ACTION_COLOR);
    addJiraItem.command = {
      command: "antigravity.addJiraItem",
      title: "Add Jira Item"
    };
    items.push(addJiraItem);

    const takeJiraItemAssign = new NodeItem(
      { kind: "action", label: "Take Jira Item (Assign)" },
      vscode.TreeItemCollapsibleState.None
    );
    takeJiraItemAssign.iconPath = new vscode.ThemeIcon("person-add", JIRA_ACTION_COLOR);
    takeJiraItemAssign.command = {
      command: "antigravity.takeJiraItemAssign",
      title: "Take Jira Item (Assign)"
    };
    items.push(takeJiraItemAssign);

    const completeJiraItem = new NodeItem(
      { kind: "action", label: "Jira Item Completed" },
      vscode.TreeItemCollapsibleState.None
    );
    completeJiraItem.iconPath = new vscode.ThemeIcon("pass", JIRA_ACTION_COLOR);
    completeJiraItem.command = {
      command: "antigravity.completeJiraItem",
      title: "Jira Item Completed"
    };
    items.push(completeJiraItem);
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
    "Copy the bundled explain-me skill into the project and ask the selected Agentic Harness to explain the whole solution and the latest uncommitted changes.";
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

  const setClaudeModel = new NodeItem(
    { kind: "action", label: "Set Claude Model" },
    vscode.TreeItemCollapsibleState.None
  );
  setClaudeModel.iconPath = new vscode.ThemeIcon("repo", CLAUDE_MODEL_ACTION_COLOR);
  setClaudeModel.command = {
    command: "antigravity.setClaudeModel",
    title: "Set Claude Model"
  };
  const runLiteLLMOpenAI = new NodeItem(
    { kind: "action", label: "Run liteLLM OpenAI" },
    vscode.TreeItemCollapsibleState.None
  );
  runLiteLLMOpenAI.iconPath = new vscode.ThemeIcon("rocket", CLAUDE_MODEL_ACTION_COLOR);
  runLiteLLMOpenAI.command = {
    command: "antigravity.runLiteLLMOpenAI",
    title: "Run liteLLM OpenAI"
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

  return [item, setClaudeModel, runLiteLLMOpenAI, buildProject, runProjectTests];
}
