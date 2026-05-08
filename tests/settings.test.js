const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("module");

// Mock vscode module before importing settings
// vscode calls are inside function bodies (not at module level),
// so the module import succeeds even without vscode available.
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === "vscode") {
    return {};
  }
  return originalRequire.apply(this, arguments);
};

// settings.ts exports pure helpers that don't require vscode at import time
// because vscode calls are inside function bodies, not at module level.
// We can import and call the pure helpers safely.
const settings = require("../out/settings.js");

test("getLightAgenticHarnessExecutionCommand is exported", () => {
  assert.strictEqual(typeof settings.getLightAgenticHarnessExecutionCommand, "function");
});

test("getToolRunCommand returns undefined for missing tool", () => {
  const result = settings.getToolRunCommand({}, "nonexistent");
  assert.strictEqual(result, undefined);
});

test("getToolRunCommand returns command string for known tool", () => {
  const result = settings.getToolRunCommand({ "tool-run": { build: "npm run build" } }, "build");
  assert.strictEqual(result, "npm run build");
});

test("normalizeStringArray filters non-strings and empty values", () => {
  const result = settings.normalizeStringArray(["a", "", 42, "b", null]);
  assert.deepEqual(result, ["a", "b"]);
});
