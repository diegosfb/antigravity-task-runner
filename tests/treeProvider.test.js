const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { promisify } = require("node:util");

function createVscodeMock(configuration = {}) {
  class ThemeColor { constructor(id) { this.id = id; } }
  class ThemeIcon { constructor(id, color) { this.id = id; this.color = color; } }
  const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };
  class TreeItem {
    constructor(label, collapsibleState) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  }
  return {
    ThemeColor,
    ThemeIcon,
    TreeItem,
    TreeItemCollapsibleState,
    workspace: { getConfiguration: () => ({ get: (key) => configuration[key] }) },
    window: { terminals: [], createTerminal: () => ({}), createOutputChannel: () => ({ appendLine() {} }) },
    EventEmitter: class { constructor() { this.event = undefined; } fire() {} },
    tasks: { executeTask: () => Promise.resolve({}) },
    TaskScope: { Workspace: 0 },
    Task: class {},
    ShellExecution: class {},
    TaskRevealKind: { Always: 0 },
    TaskPanelKind: { Shared: 0 },
    Uri: { file: (p) => p }
  };
}

function setupTreeProviderModule(configuration = {}, dependencyOverrides = {}) {
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === "vscode") return createVscodeMock(configuration);
    if (dependencyOverrides[id]) return dependencyOverrides[id];
    return originalRequire.apply(this, arguments);
  };
  delete require.cache[require.resolve("../out/treeProvider.js")];
  const tp = require("../out/treeProvider.js");
  Module.prototype.require = originalRequire;
  return tp;
}

test("NodeItem stores kind and filePath", () => {
  const { NodeItem } = setupTreeProviderModule();
  const item = new NodeItem(
    { kind: "agent", label: "test-agent", filePath: "/path/to/agent.md" },
    0
  );
  assert.equal(item.kind, "agent");
  assert.equal(item.filePath, "/path/to/agent.md");
  assert.equal(item.sortKey, "test-agent");
});

test("NodeItem uses sortKey when provided", () => {
  const { NodeItem } = setupTreeProviderModule();
  const item = new NodeItem(
    { kind: "action", label: "Z item", sortKey: "a-zzz" },
    0
  );
  assert.equal(item.sortKey, "a-zzz");
});

test("parsePluginListOutput parses multi-line plugin format", () => {
  const { parsePluginListOutput } = setupTreeProviderModule();
  const output = [
    "❯ frontend-design@claude-plugins-official",
    "    Version: 6223f4d740e7",
    "    Scope: user",
    "    Status: ✔ enabled",
    "",
    "❯ theme@market",
    "    Version: 1.0.0",
    "    Scope: user",
    "    Status: ✘ disabled"
  ].join("\n");
  const plugins = parsePluginListOutput(output);
  assert.equal(plugins.length, 2);
  assert.equal(plugins[0].name, "frontend-design@claude-plugins-official");
  assert.equal(plugins[0].enabled, true);
  assert.equal(plugins[1].name, "theme@market");
  assert.equal(plugins[1].enabled, false);
});

test("parsePluginListOutput parses JSON format", () => {
  const { parsePluginListOutput } = setupTreeProviderModule();
  const output = JSON.stringify([
    { name: "plugin-a", enabled: true },
    { name: "plugin-b", enabled: false }
  ]);
  const plugins = parsePluginListOutput(output);
  assert.equal(plugins.length, 2);
  assert.equal(plugins[0].name, "plugin-a");
  assert.equal(plugins[0].enabled, true);
});

test("parsePluginListOutput handles empty output", () => {
  const { parsePluginListOutput } = setupTreeProviderModule();
  const plugins = parsePluginListOutput("");
  assert.deepEqual(plugins, []);
});

test("parseAgentsOutput returns empty array for empty input", () => {
  const { parseAgentsOutput } = setupTreeProviderModule();
  assert.deepEqual(parseAgentsOutput(""), []);
});

test("parseAgentsOutput parses agent lines with sections", () => {
  const { parseAgentsOutput } = setupTreeProviderModule();
  const output = [
    "User agents:",
    "ai-adviser · claude-sonnet-4-20250506 · user memory",
    "",
    "Plugin agents:",
    "custom-agent · claude-haiku-3-5 · plugin skills",
  ].join("\n");
  const agents = parseAgentsOutput(output);
  assert.equal(agents.length, 2);
  assert.equal(agents[0].name, "ai-adviser");
  assert.equal(agents[0].model, "claude-sonnet-4-20250506");
  assert.equal(agents[0].section, "User");
  assert.equal(agents[1].name, "custom-agent");
  assert.equal(agents[1].model, "claude-haiku-3-5");
  assert.equal(agents[1].section, "Plugin");
});

test("readSkillsDir returns empty array for missing directory", () => {
  const { readSkillsDir } = setupTreeProviderModule();
  const result = readSkillsDir("/nonexistent");
  assert.deepEqual(result, []);
});

test("readSkillsDir finds skill directories with SKILL.md", () => {
  const { readSkillsDir } = setupTreeProviderModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-tp-"));
  const skillDir = path.join(tmpDir, "my-skill");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), "# Skill\n", "utf8");
  const result = readSkillsDir(tmpDir);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, "my-skill");
  assert.ok(result[0].filePath.endsWith("my-skill/SKILL.md"));
  assert.equal(result[0].source, path.basename(tmpDir));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("readSkillsDir skips directories without SKILL.md", () => {
  const { readSkillsDir } = setupTreeProviderModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-tp-"));
  const noSkillDir = path.join(tmpDir, "no-skill");
  fs.mkdirSync(noSkillDir, { recursive: true });
  const result = readSkillsDir(tmpDir);
  assert.equal(result.length, 0);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("Skills category includes project and multi-harness skill sources", async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-tree-provider-skills-"));
  const homeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-tree-provider-home-"));
  const writeSkill = (root, name) => {
    const skillDir = path.join(root, name);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), `# ${name}\n`, "utf8");
  };

  writeSkill(path.join(repoRoot, ".agents", "skills"), "shared-project-skill");
  writeSkill(path.join(repoRoot, ".codex", "skills"), "project-codex-skill");
  writeSkill(path.join(repoRoot, ".gemini", "skills"), "project-gemini-skill");
  writeSkill(path.join(repoRoot, ".opencode", "skills"), "project-opencode-skill");
  writeSkill(path.join(homeRoot, ".codex", "skills", ".system"), "user-codex-system-skill");
  writeSkill(path.join(homeRoot, ".gemini", "skills"), "user-gemini-skill");
  writeSkill(path.join(homeRoot, ".config", "opencode", "skills"), "user-opencode-skill");

  const { AntigravityViewProvider } = setupTreeProviderModule(
    {},
    {
      os: { ...os, homedir: () => homeRoot },
      child_process: { exec: (_command, _options, callback) => callback(null, "", "") },
      "./utils": {
        getRootPath: () => repoRoot,
        getRepoRoot: () => repoRoot,
        getWorkspaceProjectPath: () => repoRoot
      },
      "./git": {
        isAutocommitRunning: () => false,
        hasGitHubRemoteSync: () => false,
        getCurrentBranchNameSync: () => undefined
      }
    }
  );
  const provider = new AntigravityViewProvider();

  try {
    const rootItems = await provider.getChildren();
    const skills = rootItems.find((item) => item.label === "Skills");

    assert.ok(skills);
    const children = await provider.getChildren(skills);
    const byLabel = new Map(children.map((item) => [item.label, item]));

    assert.equal(byLabel.get("shared-project-skill").description, "Project .agents");
    assert.equal(byLabel.get("project-codex-skill").description, "Project Codex");
    assert.equal(byLabel.get("project-gemini-skill").description, "Project Gemini");
    assert.equal(byLabel.get("project-opencode-skill").description, "Project OpenCode");
    assert.equal(byLabel.get("user-codex-system-skill").description, "User Codex system");
    assert.equal(byLabel.get("user-gemini-skill").description, "User Gemini");
    assert.equal(byLabel.get("user-opencode-skill").description, "User OpenCode config");
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
    fs.rmSync(homeRoot, { recursive: true, force: true });
  }
});

test("Agents category includes project and multi-harness agent sources", async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-tree-provider-agents-"));
  const homeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-tree-provider-home-"));
  const writeFile = (filePath, content = "# Agent\n") => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
  };

  writeFile(path.join(repoRoot, ".agents", "agents", "shared-project-agent", "shared-project-agent.md"));
  writeFile(path.join(repoRoot, ".codex", "agents", "project-codex-agent.toml"), "name = \"project-codex-agent\"\n");
  writeFile(path.join(repoRoot, ".gemini", "agents", "project-gemini-agent.md"));
  writeFile(path.join(repoRoot, ".opencode", "agents", "project-opencode-agent.md"));
  writeFile(path.join(homeRoot, ".codex", "agents", "user-codex-agent.toml"), "name = \"user-codex-agent\"\n");
  writeFile(path.join(homeRoot, ".gemini", "agents", "user-gemini-agent.md"));
  writeFile(path.join(homeRoot, ".config", "opencode", "agents", "user-opencode-agent.md"));

  const claudeAgentsOutput = [
    "User agents:",
    "claude-cli-agent · claude-sonnet-4-20250506 · user memory"
  ].join("\n");
  const execMock = (_command, _options, callback) => callback(null, claudeAgentsOutput, "");
  execMock[promisify.custom] = () => Promise.resolve({ stdout: claudeAgentsOutput, stderr: "" });

  const { AntigravityViewProvider } = setupTreeProviderModule(
    {},
    {
      os: { ...os, homedir: () => homeRoot },
      child_process: { exec: execMock },
      "./utils": {
        getRootPath: () => repoRoot,
        getRepoRoot: () => repoRoot,
        getWorkspaceProjectPath: () => repoRoot
      },
      "./git": {
        isAutocommitRunning: () => false,
        hasGitHubRemoteSync: () => false,
        getCurrentBranchNameSync: () => undefined
      }
    }
  );
  const provider = new AntigravityViewProvider();

  try {
    const rootItems = await provider.getChildren();
    const agents = rootItems.find((item) => item.label === "Agents");

    assert.ok(agents);
    const children = await provider.getChildren(agents);
    const byLabel = new Map(children.map((item) => [item.label, item]));

    assert.equal(byLabel.get("shared-project-agent").description, "Project .agents");
    assert.equal(byLabel.get("project-codex-agent").description, "Project Codex");
    assert.equal(byLabel.get("project-gemini-agent").description, "Project Gemini");
    assert.equal(byLabel.get("project-opencode-agent").description, "Project OpenCode");
    assert.equal(byLabel.get("user-codex-agent").description, "User Codex");
    assert.equal(byLabel.get("user-gemini-agent").description, "User Gemini");
    assert.equal(byLabel.get("user-opencode-agent").description, "User OpenCode config");
    assert.equal(byLabel.get("project-codex-agent").command.command, "antigravity.openAgent");

    const claudeCliAgent = byLabel.get("claude-cli-agent");
    assert.equal(claudeCliAgent.description, "claude-sonnet-4-20250506");
    assert.equal(claudeCliAgent.command.command, "antigravity.runClaudeAgent");
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
    fs.rmSync(homeRoot, { recursive: true, force: true });
  }
});

test("emptyItem creates NodeItem with circle-slash icon", () => {
  const { emptyItem } = setupTreeProviderModule();
  const item = emptyItem("Nothing here");
  assert.equal(item.label, "Nothing here");
});

test("missingRootItem creates a warning item", () => {
  const { missingRootItem } = setupTreeProviderModule();
  const item = missingRootItem();
  assert.equal(item.label, "Missing ~/.antigravity");
});

test("shouldHideAntigravityEntry checks ANTIGRAVITY_ROOT_HIDDEN", () => {
  const { shouldHideAntigravityEntry } = setupTreeProviderModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-tp-"));
  const entry = { name: ".DS_Store" };
  assert.equal(shouldHideAntigravityEntry(tmpDir, entry), false);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("shouldHideAddonsEntry hides dot-prefixed files and directories inside configured addons tree", () => {
  const addonsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-addons-"));
  const nestedDir = path.join(addonsRoot, "visible");
  fs.mkdirSync(nestedDir, { recursive: true });

  const { shouldHideAddonsEntry } = setupTreeProviderModule({
    customAgenticPlatformAddons: addonsRoot
  });

  assert.equal(
    shouldHideAddonsEntry(addonsRoot, { name: ".hidden", isDirectory: () => true }),
    true
  );
  assert.equal(
    shouldHideAddonsEntry(nestedDir, { name: ".nested-hidden", isDirectory: () => true }),
    true
  );
  assert.equal(
    shouldHideAddonsEntry(addonsRoot, { name: ".env", isDirectory: () => false }),
    true
  );
  assert.equal(
    shouldHideAddonsEntry(addonsRoot, { name: "README.md", isDirectory: () => false }),
    false
  );
  assert.equal(
    shouldHideAddonsEntry(path.dirname(addonsRoot), { name: ".outside", isDirectory: () => true }),
    false
  );

  fs.rmSync(addonsRoot, { recursive: true, force: true });
});

test("quick actions include ADLC after feature flag with runner actions", async () => {
  const { AntigravityViewProvider } = setupTreeProviderModule();
  const provider = new AntigravityViewProvider();

  const rootItems = await provider.getChildren();
  const actionLabels = rootItems.map((item) => item.label);
  const featureFlagIndex = actionLabels.indexOf("Set Feature Flag for changes");
  const adlcIndex = actionLabels.indexOf("ADLC");

  assert.notEqual(featureFlagIndex, -1);
  assert.equal(adlcIndex, featureFlagIndex + 1);

  const adlcItem = rootItems[adlcIndex];
  assert.equal(adlcItem.collapsibleState, 1);
  assert.equal(adlcItem.command, undefined);
  assert.equal(adlcItem.iconPath.id, "hubot");
  assert.equal(adlcItem.iconPath.color.id, "charts.red");

  const adlcChildren = await provider.getChildren(adlcItem);
  assert.deepEqual(
    adlcChildren.map((item) => item.label),
    [
      "Product Designer",
      "Business Analyst",
      "Solution Architect",
      "Estimate Project",
      "Create Execution Plan",
      "Develop Execution Plan"
    ]
  );
  assert.equal(adlcChildren[0].command?.command, "antigravity.openProductDesigner");
  assert.equal(adlcChildren[1].command?.command, "antigravity.openBusinessAnalyst");
  assert.equal(adlcChildren[2].command?.command, "antigravity.openSolutionArchitect");
  assert.equal(adlcChildren[3].command?.command, "antigravity.openEstimator");
  assert.equal(adlcChildren[4].command?.command, "antigravity.openPlanExecution");
  assert.equal(adlcChildren[5].command?.command, "antigravity.openDeveloper");
  for (const item of adlcChildren) {
    assert.equal(item.iconPath.color.id, "charts.red");
  }
  assert.equal(adlcChildren[4].iconPath.id, "map");
});

test("quick actions include ADLC Agents after feature flag with red group and agent icons", async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-tree-provider-adlc-"));
  fs.mkdirSync(path.join(repoRoot, ".agents", "agents", "ba-agent"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, ".agents", "agents", "ba-agent", "ba-agent.md"), "---\nname: ba-agent\n---\n");
  const utils = require("../out/utils.js");
  const { AntigravityViewProvider } = setupTreeProviderModule(
    {},
    { "./utils": { ...utils, getRootPath: () => repoRoot, getRepoRoot: () => repoRoot } }
  );
  const provider = new AntigravityViewProvider();

  try {
    const rootItems = await provider.getChildren();
    const rootLabels = rootItems.map((item) => item.label);
    const featureFlagIndex = rootLabels.indexOf("Set Feature Flag for changes");
    const adlcIndex = rootLabels.indexOf("ADLC Agents");

    assert.notEqual(featureFlagIndex, -1);
    assert.equal(adlcIndex, featureFlagIndex + 1);

    const adlcAgents = rootItems[adlcIndex];
    assert.equal(adlcAgents.collapsibleState, 1);
    assert.equal(adlcAgents.command, undefined);
    assert.equal(adlcAgents.iconPath.id, "organization");
    assert.equal(adlcAgents.iconPath.color.id, "charts.red");

    const children = await provider.getChildren(adlcAgents);
    assert.deepEqual(
      children.map((item) => item.label),
      [
        "Product Agent",
        "BA Agent",
        "UX Agent",
        "Architect Agent",
        "Architecture Review Agent",
        "Project Planner Agent",
        "Create Tests Agent",
        "Coding Agent",
        "Code Review Agent",
        "Deployment Agent",
        "SDLC Orchestrator Agent"
      ]
    );
    for (const item of children) {
      assert.equal(item.command.command, "antigravity.runAdlcAgent");
      assert.equal(item.iconPath.id, "robot");
      assert.equal(item.iconPath.color.id, "charts.red");
    }

    const baAgent = children.find((item) => item.label === "BA Agent");
    assert.deepEqual(baAgent.command.arguments, ["ba"]);
    assert.equal(baAgent.description, undefined);
    assert.equal(baAgent.iconPath.color.id, "charts.red");

    assert.equal(children.some((item) => item.label === "Documentation Agent"), false);
    assert.equal(children.some((item) => item.label === "Spec Validation Agent"), false);

    const codingAgent = children.find((item) => item.label === "Coding Agent");
    assert.deepEqual(codingAgent.command.arguments, ["coding"]);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("quick actions group auxiliary agents and skills after ADLC Agents using the estimator color", async () => {
  const { AntigravityViewProvider } = setupTreeProviderModule();
  const provider = new AntigravityViewProvider();

  const rootItems = await provider.getChildren();
  const rootLabels = rootItems.map((item) => item.label);
  const adlcIndex = rootLabels.indexOf("ADLC Agents");
  const auxiliaryIndex = rootLabels.indexOf("Auxiliary Agents and Skills");

  assert.notEqual(adlcIndex, -1);
  assert.equal(auxiliaryIndex, adlcIndex + 1);

  const auxiliary = rootItems[auxiliaryIndex];
  assert.equal(auxiliary.collapsibleState, 1);
  assert.equal(auxiliary.command, undefined);
  assert.equal(auxiliary.iconPath.id, "tools");
  assert.equal(auxiliary.iconPath.color.id, "terminal.ansiBrightBlue");

  const children = await provider.getChildren(auxiliary);
  assert.deepEqual(
    children.map((item) => item.label),
    [
      "Consultant Agent",
      "Explain-me Agent",
      "Grill-me",
      "Pre-mortem Agent",
      "Handoff",
      "Conversation To Spec",
      "Spec To Tickets",
      "llm-judge-agent",
      "Feature Estimator Agent",
      "Autoresearch Agent",
      "Brainstorm Ideas",
      "Customer Interviewer",
      "System Design Agent",
      "Prototype Builder",
      "Story Point Council",
      "Cloud Architect Review"
    ]
  );
  for (const item of children) {
    if (item.iconPath.color) assert.equal(item.iconPath.color.id, "terminal.ansiBrightBlue");
  }

  assert.equal(children.find((item) => item.label === "Explain-me Agent").command.command, "antigravity.explainMe");
  assert.equal(children.find((item) => item.label === "Feature Estimator Agent").command.command, "antigravity.featureEstimator");
  assert.equal(rootLabels.includes("Explain Me"), false);
  assert.equal(rootLabels.includes("Feature Estimator"), false);
  assert.equal(rootLabels.includes("Cloud Architect Review"), false);
});

test("quick actions present agentic libraries as install actions", async () => {
  const { AntigravityViewProvider } = setupTreeProviderModule();
  const provider = new AntigravityViewProvider();

  const rootItems = await provider.getChildren();
  const installLibraries = rootItems.find((item) => item.label === "Install Agentic Libraries");

  assert.ok(installLibraries);
  assert.equal(installLibraries.iconPath.id, "cloud-download");
  assert.equal(installLibraries.tooltip, "Install agentic libraries in the current workspace.");

  const installActions = await provider.getChildren(installLibraries);
  assert.deepEqual(
    installActions.slice(0, 4).map((item) => item.label),
    ["Install SDLC", "Install SDLC Extended", "Install Professional Services", "Install Tech Advisory"]
  );
  for (const item of installActions.slice(0, 4)) {
    assert.equal(item.iconPath.id, "cloud-download");
    assert.match(item.command.title, /^Install /);
  }
});

test("quick actions group backlog commands under Backlog Management", async () => {
  const { AntigravityViewProvider } = setupTreeProviderModule();
  const provider = new AntigravityViewProvider();

  const rootItems = await provider.getChildren();
  const backlogManagement = rootItems.find((item) => item.label === "Backlog Management");

  assert.ok(backlogManagement);
  assert.equal(backlogManagement.collapsibleState, 1);
  assert.equal(backlogManagement.command, undefined);
  assert.equal(backlogManagement.iconPath.id, "checklist");

  const backlogLabels = [
    "Select/Set Jira Project",
    "Add Backlog Item",
    "Take Backlog Item (Assign)",
    "Mark Backlog Item as Completed",
    "Assign Backlog Item to Agent"
  ];
  assert.equal(rootItems.some((item) => backlogLabels.includes(item.label)), false);

  const backlogActions = await provider.getChildren(backlogManagement);
  assert.deepEqual(backlogActions.map((item) => item.label), backlogLabels);
  assert.deepEqual(
    backlogActions.map((item) => item.command.command),
    [
      "antigravity.selectOrCreateJiraProject",
      "antigravity.addBacklogItem",
      "antigravity.takeBacklogItemAssign",
      "antigravity.completeJiraItem",
      "antigravity.assignBacklogItemToAgent"
    ]
  );
});

test("quick actions group version increments under Increment Versions", async () => {
  const { AntigravityViewProvider } = setupTreeProviderModule();
  const provider = new AntigravityViewProvider();

  const rootItems = await provider.getChildren();
  const incrementVersions = rootItems.find((item) => item.label === "Increment Versions");
  const versionLabels = [
    "Increment Major Version",
    "Increment Minor Version",
    "Increment Patch Version"
  ];

  assert.ok(incrementVersions);
  assert.equal(incrementVersions.collapsibleState, 1);
  assert.equal(incrementVersions.command, undefined);
  assert.equal(incrementVersions.iconPath.id, "arrow-up");
  assert.equal(rootItems.some((item) => versionLabels.includes(item.label)), false);

  const versionActions = await provider.getChildren(incrementVersions);
  assert.deepEqual(versionActions.map((item) => item.label), versionLabels);
  assert.deepEqual(
    versionActions.map((item) => item.command.command),
    [
      "antigravity.incrementMajorVersion",
      "antigravity.incrementMinorVersion",
      "antigravity.incrementPatchVersion"
    ]
  );
});

test("quick actions place Obsidian Vault Visualization before Autocommit", async () => {
  const { AntigravityViewProvider } = setupTreeProviderModule();
  const provider = new AntigravityViewProvider();

  const rootItems = await provider.getChildren();
  const rootLabels = rootItems.map((item) => item.label);
  const obsidianIndex = rootLabels.indexOf("Obsidian Vault Visualization");
  const autocommitIndex = rootLabels.findIndex((label) => label.startsWith("Autocommit "));

  assert.notEqual(obsidianIndex, -1);
  assert.equal(obsidianIndex, autocommitIndex - 1);

  const obsidian = rootItems[obsidianIndex];
  assert.equal(obsidian.iconPath.id, "graph");
  assert.equal(obsidian.command.command, "antigravity.openObsidianVaultVisualization");
});

test("quick actions place ADLC Framework Manual after SOP Manual", async () => {
  const { AntigravityViewProvider } = setupTreeProviderModule();
  const provider = new AntigravityViewProvider();

  const rootItems = await provider.getChildren();
  const rootLabels = rootItems.map((item) => item.label);
  const sopIndex = rootLabels.indexOf("SOP Manual");
  const adlcManualIndex = rootLabels.indexOf("ADLC Framework Manual");

  assert.notEqual(sopIndex, -1);
  assert.equal(adlcManualIndex, sopIndex + 1);

  const adlcManual = rootItems[adlcManualIndex];
  assert.equal(adlcManual.iconPath.id, "book");
  assert.equal(adlcManual.command.command, "antigravity.openAdlcFrameworkManual");
});

test("Workflows category lists workspace .agents workflows", async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-tree-provider-workflows-"));
  const workflowsDir = path.join(repoRoot, ".agents", "workflows");
  fs.mkdirSync(workflowsDir, { recursive: true });
  fs.writeFileSync(path.join(workflowsDir, "project-definition-workflow.md"), "# Project Definition\n", "utf8");
  fs.writeFileSync(path.join(workflowsDir, "README.md"), "# Ignore\n", "utf8");

  const { AntigravityViewProvider } = setupTreeProviderModule(
    {},
    {
      "./utils": {
        getRootPath: () => repoRoot,
        getRepoRoot: () => repoRoot,
        getWorkspaceProjectPath: () => repoRoot,
        getAntigravityHomePath: () => undefined,
        safeReadDir: async (dirPath) => {
          try {
            return await fs.promises.readdir(dirPath, { withFileTypes: true });
          } catch {
            return [];
          }
        }
      },
      "./git": {
        isAutocommitRunning: () => false,
        hasGitHubRemoteSync: () => false,
        getCurrentBranchNameSync: () => undefined
      }
    }
  );
  const provider = new AntigravityViewProvider();

  try {
    const rootItems = await provider.getChildren();
    const workflows = rootItems.find((item) => item.label === "Workflows");

    assert.ok(workflows);
    const children = await provider.getChildren(workflows);

    assert.deepEqual(children.map((item) => item.label), ["project-definition-workflow"]);
    assert.equal(children[0].kind, "workflow");
    assert.equal(children[0].filePath, path.join(workflowsDir, "project-definition-workflow.md"));
    assert.equal(children[0].command.command, "antigravity.runWorkflow");
    assert.deepEqual(children[0].command.arguments, [path.join(workflowsDir, "project-definition-workflow.md")]);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("top-level Claude actions include terminal launcher entries", async () => {
  const { AntigravityViewProvider } = setupTreeProviderModule();
  const provider = new AntigravityViewProvider();

  const rootItems = await provider.getChildren();
  const rootLabels = rootItems.map((item) => item.label);
  const claudeTerminalIndex = rootLabels.indexOf("Claude Terminal");
  const codexTerminalIndex = rootLabels.indexOf("Codex Terminal");
  const ollamaClaudeIndex = rootLabels.indexOf("Ollama Claude");
  const ollamaCodexIndex = rootLabels.indexOf("Ollama Codex");
  const opencodeIndex = rootLabels.indexOf("Opencode");

  assert.notEqual(claudeTerminalIndex, -1);
  assert.equal(codexTerminalIndex, claudeTerminalIndex + 1);
  assert.equal(ollamaClaudeIndex, codexTerminalIndex + 1);
  assert.equal(ollamaCodexIndex, ollamaClaudeIndex + 1);
  assert.equal(opencodeIndex, ollamaCodexIndex + 1);
  assert.equal(rootLabels.includes("Run liteLLM OpenAI"), false);
});

test("quick actions group repository commands under Repository Actions", async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-tree-provider-repo-"));
  fs.mkdirSync(path.join(repoRoot, ".git"));
  const utils = require("../out/utils.js");
  const git = require("../out/git.js");
  const { AntigravityViewProvider } = setupTreeProviderModule(
    {},
    {
      "./utils": {
        ...utils,
        getRootPath: () => repoRoot,
        getRepoRoot: () => repoRoot
      },
      "./git": {
        ...git,
        getCurrentBranchNameSync: () => "feature/test-repository-actions"
      }
    }
  );
  const provider = new AntigravityViewProvider();

  const rootItems = await provider.getChildren();
  const repositoryActions = rootItems.find((item) => item.label === "Repository Actions");

  assert.ok(repositoryActions);
  assert.equal(repositoryActions.collapsibleState, 1);
  assert.equal(repositoryActions.command, undefined);
  assert.equal(repositoryActions.iconPath.id, "github");
  assert.equal(repositoryActions.iconPath.color.id, "charts.orange");

  const repositoryActionLabels = (await provider.getChildren(repositoryActions)).map((item) => item.label);

  assert.deepEqual(repositoryActionLabels.slice(0, 4), [
    "Commit",
    "Create Repo Release",
    "Create Feature Branch",
    "Create Pull Request"
  ]);
  assert.deepEqual(repositoryActionLabels.slice(-3), [
    "Go To Branch",
    "Pull Remote and merge",
    "Agentic review of Merge"
  ]);
  assert.ok(
    repositoryActionLabels.length === 7 || repositoryActionLabels.length === 8
  );
  if (repositoryActionLabels.length === 8) {
    assert.equal(repositoryActionLabels[4], "Merge branch to main");
  }

  fs.rmSync(repoRoot, { recursive: true, force: true });
});
