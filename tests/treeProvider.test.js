const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

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

function setupTreeProviderModule(configuration = {}) {
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === "vscode") return createVscodeMock(configuration);
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

test("quick actions include ADLC after feature flag with static child roles", async () => {
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

  const adlcChildren = await provider.getChildren(adlcItem);
  assert.deepEqual(
    adlcChildren.map((item) => item.label),
    [
      "Product Designer",
      "Business Analyst",
      "Solution Architect",
      "Estimator",
      "Developer"
    ]
  );
  assert.equal(adlcChildren[0].command?.command, "antigravity.openProductDesigner");
  assert.ok(adlcChildren.slice(1).every((item) => item.command === undefined));
});
