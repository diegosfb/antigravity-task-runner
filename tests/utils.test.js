const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function createVscodeMock() {
  return {
    workspace: { getConfiguration: () => ({ get: () => undefined }), workspaceFolders: undefined }
  };
}

function setupUtilsModule() {
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === "vscode") return createVscodeMock();
    return originalRequire.apply(this, arguments);
  };
  const utils = require("../out/utils.js");
  Module.prototype.require = originalRequire;
  return utils;
}

test("quoteShellArg wraps in double quotes and escapes inner quotes", () => {
  const utils = setupUtilsModule();
  assert.equal(utils.quoteShellArg("hello"), '"hello"');
  assert.equal(utils.quoteShellArg('he"llo'), '"he\\"llo"');
  assert.equal(utils.quoteShellArg(""), '""');
});

test("getRepoRoot returns normalized path when not inside .agent/antigravity", () => {
  const utils = setupUtilsModule();
  assert.equal(utils.getRepoRoot("/some/path"), "/some/path");
});

test("getRepoRoot walks up from .agent/antigravity", () => {
  const utils = setupUtilsModule();
  const result = utils.getRepoRoot("/project/.agent/antigravity");
  assert.equal(result, "/project");
});

test("resolveProjectWorkspaceRoot appends workspace for repo roots", () => {
  const utils = setupUtilsModule();
  assert.equal(utils.resolveProjectWorkspaceRoot("/project"), "/project/workspace");
});

test("resolveProjectWorkspaceRoot preserves paths already pointing at workspace", () => {
  const utils = setupUtilsModule();
  assert.equal(utils.resolveProjectWorkspaceRoot("/project/workspace"), "/project/workspace");
});

test("parseEnvFile returns empty object for missing file", () => {
  const utils = setupUtilsModule();
  const result = utils.parseEnvFile("/nonexistent/.env");
  assert.deepEqual(result, {});
});

test("parseEnvFile parses key=value pairs", () => {
  const utils = setupUtilsModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-utils-"));
  const envPath = path.join(tmpDir, ".env");
  fs.writeFileSync(envPath, "KEY=value\nANOTHER=123\n", "utf8");
  const result = utils.parseEnvFile(envPath);
  assert.equal(result.key, "value");
  assert.equal(result.another, "123");
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("parseEnvFile strips surrounding quotes", () => {
  const utils = setupUtilsModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-utils-"));
  const envPath = path.join(tmpDir, ".env");
  fs.writeFileSync(envPath, 'KEY="quoted"\nSINGLE=\'single\'\n', "utf8");
  const result = utils.parseEnvFile(envPath);
  assert.equal(result.key, "quoted");
  assert.equal(result.single, "single");
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("parseEnvFile strips export prefix", () => {
  const utils = setupUtilsModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-utils-"));
  const envPath = path.join(tmpDir, ".env");
  fs.writeFileSync(envPath, "export EXPORTED_KEY=exported_value\n", "utf8");
  const result = utils.parseEnvFile(envPath);
  assert.equal(result.exported_key, "exported_value");
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("parseEnvFile skips comments and blank lines", () => {
  const utils = setupUtilsModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-utils-"));
  const envPath = path.join(tmpDir, ".env");
  fs.writeFileSync(envPath, "# comment\n\nKEY=value\n", "utf8");
  const result = utils.parseEnvFile(envPath);
  assert.equal(result.key, "value");
  assert.equal(Object.keys(result).length, 1);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("parseEnvFile handles lines without = separator", () => {
  const utils = setupUtilsModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-utils-"));
  const envPath = path.join(tmpDir, ".env");
  fs.writeFileSync(envPath, "MALFORMED_LINE\nKEY=value\n", "utf8");
  const result = utils.parseEnvFile(envPath);
  assert.equal(result.key, "value");
  assert.equal(result.malformed_line, undefined);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("upsertEnvFileValue creates new file with key=value", () => {
  const utils = setupUtilsModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-utils-"));
  const envPath = path.join(tmpDir, ".env");
  utils.upsertEnvFileValue(envPath, "NEW_KEY", "new_value");
  const content = fs.readFileSync(envPath, "utf8");
  assert.match(content, /^NEW_KEY=new_value\n$/m);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("upsertEnvFileValue updates existing key", () => {
  const utils = setupUtilsModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-utils-"));
  const envPath = path.join(tmpDir, ".env");
  fs.writeFileSync(envPath, "KEY=old\n", "utf8");
  utils.upsertEnvFileValue(envPath, "KEY", "new");
  const content = fs.readFileSync(envPath, "utf8");
  assert.match(content, /^KEY=new\n$/m);
  assert.doesNotMatch(content, /old/);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("upsertEnvFileValue does nothing for empty key", () => {
  const utils = setupUtilsModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-utils-"));
  const envPath = path.join(tmpDir, ".env");
  fs.writeFileSync(envPath, "KEY=value\n", "utf8");
  utils.upsertEnvFileValue(envPath, "", "anything");
  const content = fs.readFileSync(envPath, "utf8");
  assert.equal(content.trim(), "KEY=value");
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("appendEnvComment adds a line if not present", () => {
  const utils = setupUtilsModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-utils-"));
  const envPath = path.join(tmpDir, ".env");
  fs.writeFileSync(envPath, "KEY=value\n", "utf8");
  utils.appendEnvComment(envPath, "# my comment");
  const content = fs.readFileSync(envPath, "utf8");
  assert.match(content, /# my comment/);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("appendEnvComment does not duplicate existing line", () => {
  const utils = setupUtilsModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-utils-"));
  const envPath = path.join(tmpDir, ".env");
  fs.writeFileSync(envPath, "# my comment\nKEY=value\n", "utf8");
  utils.appendEnvComment(envPath, "# my comment");
  const content = fs.readFileSync(envPath, "utf8");
  assert.equal(content.match(/# my comment/g).length, 1);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("appendEnvComment does nothing for empty line", () => {
  const utils = setupUtilsModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-utils-"));
  const envPath = path.join(tmpDir, ".env");
  fs.writeFileSync(envPath, "KEY=value\n", "utf8");
  utils.appendEnvComment(envPath, "");
  const content = fs.readFileSync(envPath, "utf8");
  assert.equal(content.trim(), "KEY=value");
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("getWorkspaceProjectPath returns repoRoot-relative path", () => {
  const utils = setupUtilsModule();
  const result = utils.getWorkspaceProjectPath("/repo");
  assert.equal(result, "/repo");
});

test("findNestedGitFolders discovers nested .git directories", () => {
  const utils = setupUtilsModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-utils-"));
  const nestedGit = path.join(tmpDir, "sub", "module", ".git");
  fs.mkdirSync(nestedGit, { recursive: true });
  const results = utils.findNestedGitFolders(tmpDir);
  assert.ok(results.length > 0);
  assert.ok(results.some((r) => r.includes("sub/module/.git") || r.includes("sub/module/.git")));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("findNestedGitFolders skips node_modules and .git at root", () => {
  const utils = setupUtilsModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-utils-"));
  fs.mkdirSync(path.join(tmpDir, "node_modules", ".git"), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
  const results = utils.findNestedGitFolders(tmpDir);
  assert.equal(results.length, 0);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("safeReadDir returns empty array for missing directory", async () => {
  const utils = setupUtilsModule();
  const results = await utils.safeReadDir("/nonexistent-dir");
  assert.deepEqual(results, []);
});

test("safeReadDir returns entries for existing directory", async () => {
  const utils = setupUtilsModule();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-utils-"));
  fs.writeFileSync(path.join(tmpDir, "test.txt"), "content", "utf8");
  const results = await utils.safeReadDir(tmpDir);
  assert.ok(results.length > 0);
  assert.equal(results[0].name, "test.txt");
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("listInfrastructureYamlFiles returns empty for missing directory", async () => {
  const utils = setupUtilsModule();
  const results = await utils.listInfrastructureYamlFiles("/nonexistent");
  assert.deepEqual(results, []);
});

test("waitForFileExists returns false for timeout", async () => {
  const utils = setupUtilsModule();
  const result = await utils.waitForFileExists("/nonexistent-file-xyz", 100, 20);
  assert.equal(result, false);
});
