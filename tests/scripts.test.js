const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function createVscodeMock() {
  return {
    ThemeColor: class { constructor(id) { this.id = id; } },
    workspace: { getConfiguration: () => ({ get: () => undefined }) },
    window: { terminals: [], createTerminal: () => ({}), createOutputChannel: () => ({ appendLine() {} }) },
    EventEmitter: class { constructor() { this.event = undefined; } fire() {} },
    tasks: { executeTask: () => Promise.resolve({}) },
    TaskScope: { Workspace: 0 },
    Task: class {},
    ShellExecution: class {},
    TaskRevealKind: { Always: 0 },
    TaskPanelKind: { Shared: 0 }
  };
}

function setupScriptsModule() {
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === "vscode") return createVscodeMock();
    return originalRequire.apply(this, arguments);
  };
  const scripts = require("../out/scripts.js");
  Module.prototype.require = originalRequire;
  return scripts;
}

test("buildScriptUrl converts github.com blob URL to raw URL", () => {
  const scripts = setupScriptsModule();
  const url = scripts.buildScriptUrl("https://github.com/user/repo/blob/main/scripts", "test.sh");
  assert.equal(url, "https://raw.githubusercontent.com/user/repo/main/scripts/test.sh");
});

test("buildScriptUrl keeps raw.githubusercontent.com as-is", () => {
  const scripts = setupScriptsModule();
  const url = scripts.buildScriptUrl("https://raw.githubusercontent.com/user/repo/main/scripts", "test.sh");
  assert.equal(url, "https://raw.githubusercontent.com/user/repo/main/scripts/test.sh");
});

test("buildScriptUrl handles base URL ending in /scripts", () => {
  const scripts = setupScriptsModule();
  const url = scripts.buildScriptUrl("https://example.com/base/scripts", "test.sh");
  assert.equal(url, "https://example.com/base/scripts/test.sh");
});

test("buildScriptUrl handles base URL not ending in /scripts", () => {
  const scripts = setupScriptsModule();
  const url = scripts.buildScriptUrl("https://example.com/base", "test.sh");
  assert.equal(url, "https://example.com/base/scripts/test.sh");
});

test("buildScriptUrl strips trailing slash", () => {
  const scripts = setupScriptsModule();
  const url = scripts.buildScriptUrl("https://example.com/base/", "test.sh");
  assert.equal(url, "https://example.com/base/scripts/test.sh");
});

test("downloadFile handles 404 response", async () => {
  const scripts = setupScriptsModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-scripts-"));
  const dest = path.join(tmpDir, "test.sh");
  try {
    await scripts.downloadFile("https://example.invalid/file.sh", dest);
    assert.fail("Expected download to throw");
  } catch (error) {
    assert.ok(error instanceof Error);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("interpolateAgentArgs replaces placeholders", () => {
  const scripts = setupScriptsModule();
  const result = scripts.interpolateAgentArgs('{agent} {agentFile}', "MyAgent", "/path/to/agent.md");
  assert.equal(result, "MyAgent /path/to/agent.md");
});

test("interpolateAgentArgs handles empty template", () => {
  const scripts = setupScriptsModule();
  const result = scripts.interpolateAgentArgs("", "MyAgent", "/path/to/agent.md");
  assert.equal(result, "");
});

test("ensureScriptFile returns existing file path", async () => {
  const scripts = setupScriptsModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-scripts-"));
  const scriptDir = path.join(tmpDir, "scripts");
  fs.mkdirSync(scriptDir, { recursive: true });
  fs.writeFileSync(path.join(scriptDir, "test.sh"), "echo hi\n", "utf8");
  const result = await scripts.ensureScriptFile(tmpDir, "test.sh", scriptDir);
  assert.equal(result, path.join(scriptDir, "test.sh"));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("ensureScriptFile returns fallback path when available", async () => {
  const scripts = setupScriptsModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-scripts-"));
  const fallbackDir = path.join(tmpDir, "fallback");
  fs.mkdirSync(fallbackDir, { recursive: true });
  fs.writeFileSync(path.join(fallbackDir, "test.sh"), "echo hi\n", "utf8");
  const result = await scripts.ensureScriptFile(tmpDir, "test.sh", path.join(tmpDir, "scripts"), fallbackDir);
  assert.equal(result, path.join(fallbackDir, "test.sh"));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("readYamlStringField returns value for existing field", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-scripts-"));
  const yamlPath = path.join(tmpDir, "config.yaml");
  fs.writeFileSync(yamlPath, "Infrastructure: infra/\nKey: Value\n", "utf8");
  const scripts = setupScriptsModule();
  assert.equal(scripts.readYamlStringField(yamlPath, "Infrastructure"), "infra/");
  assert.equal(scripts.readYamlStringField(yamlPath, "Missing"), undefined);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("readYamlStringField returns undefined for missing file", () => {
  const scripts = setupScriptsModule();
  assert.equal(scripts.readYamlStringField("/nonexistent.yaml", "Infrastructure"), undefined);
});
