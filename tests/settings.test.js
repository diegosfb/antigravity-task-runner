const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("module");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Mock vscode module before importing settings
// vscode calls are inside function bodies (not at module level),
// so the module import succeeds even without vscode available.
const vscodeMock = {
  workspace: {
    workspaceFolders: [{ uri: { fsPath: "/tmp/project" } }],
    getConfiguration() {
      return {
        get(key) {
          const values = {
            workspaceProjectPath: "./",
            terminalName: "TaskRunner Workflow",
            agentTerminalName: "TaskRunner Agent",
            useAgentForGithubRepositoryManagement: true,
            useExternalTerminal: true
          };
          return values[key];
        }
      };
    }
  }
};
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === "vscode") {
    return vscodeMock;
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

test("settings page uses TaskRunner title", () => {
  const html = settings.renderAntigravitySettingsHtml({ cspSource: "vscode-resource:" });
  assert.match(html, /<title>TaskRunner Settings<\/title>/);
  assert.match(html, /<h1>TaskRunner Settings<\/h1>/);
  assert.doesNotMatch(html, /<title>Antigravity Settings<\/title>/);
  assert.doesNotMatch(html, /<h1>Antigravity Settings<\/h1>/);
});

test("settings page omits legacy and internal-only settings", () => {
  const html = settings.renderAntigravitySettingsHtml({ cspSource: "vscode-resource:" });
  assert.doesNotMatch(html, /rootPath/);
  assert.doesNotMatch(html, /TaskRunner Root Path/);
  assert.doesNotMatch(html, /workflowsFolder/);
  assert.doesNotMatch(html, /TaskRunner Workflows Folder/);
  assert.doesNotMatch(html, /antigravityPath/);
  assert.doesNotMatch(html, /antigravityArgs/);
  assert.doesNotMatch(html, /autoUpdateClaudeMd/);
  assert.doesNotMatch(html, /createReleaseBranchWhenCreatingReleases/);
  assert.doesNotMatch(html, /enableDebugLogging/);
});

test("settings page exposes descriptions and tooltip hooks", () => {
  const html = settings.renderAntigravitySettingsHtml({ cspSource: "vscode-resource:" });
  assert.match(html, /When enabled, agent-driven flows are preferred for GitHub repository management tasks\./);
  assert.match(html, /Project Structure & Agents Repository/);
  assert.match(html, /deploy-project-structure\.sh/);
  assert.match(html, /https:\/\/github\.com\/diegosfb\/antigravity-task-runner/);
  assert.match(html, /aria-describedby/);
  assert.match(html, /title = helpText/);
});

test("settings page exposes SDLC settings tab with descriptions", () => {
  const html = settings.renderAntigravitySettingsHtml({ cspSource: "vscode-resource:" });
  assert.match(html, /role="tablist"/);
  assert.match(html, />SDLC Settings</);
  assert.match(html, /Apply SDLC Settings/);
  assert.match(html, /spoken_plan\.enabled/);
  assert.match(html, /Product Pre-Mortem/);
  assert.match(html, /Enable Obsidian Vault Recording/);
});

test("writeSdlcWorkflowSettings updates known paths and ignores unknown paths", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "taskrunner-sdlc-settings-"));
  try {
    fs.writeFileSync(
      path.join(tmpDir, "ADLC_workflow_settings.json"),
      JSON.stringify({
        version: 1,
        spoken_plan: { enabled: false },
        obsidian_vault: { enabled: true, vault_path: "./docs/vault", link_mode: "symlink" }
      }, null, 2),
      "utf8"
    );
    settings.writeSdlcWorkflowSettings(tmpDir, {
      "spoken_plan.enabled": true,
      "obsidian_vault.vault_path": " ./custom-vault ",
      "unknown.path": "ignored"
    });
    const saved = JSON.parse(fs.readFileSync(path.join(tmpDir, "ADLC_workflow_settings.json"), "utf8"));
    assert.equal(saved.spoken_plan.enabled, true);
    assert.equal(saved.obsidian_vault.vault_path, "./custom-vault");
    assert.equal(saved.version, 1);
    assert.equal(saved.unknown, undefined);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
