const test = require("node:test");
const assert = require("node:assert/strict");

function createVscodeMock() {
  class ThemeColor { constructor(id) { this.id = id; } }
  const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };
  class TreeItem {
    constructor(label, collapsibleState) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  }
  return {
    ThemeColor,
    TreeItem,
    TreeItemCollapsibleState,
    workspace: { getConfiguration: () => ({ get: () => undefined }) },
    window: {
      terminals: [],
      createTerminal: () => ({}),
      createOutputChannel: () => ({ appendLine() {} }),
      showErrorMessage: () => Promise.resolve(),
      showWarningMessage: () => Promise.resolve(),
      showInformationMessage: () => Promise.resolve(),
      createWebviewPanel: () => ({
        webview: {
          html: "",
          postMessage: () => Promise.resolve(),
          onDidReceiveMessage: () => ({ dispose() {} })
        },
        onDidDispose: () => ({ dispose() {} }),
        dispose() {}
      })
    },
    EventEmitter: class { constructor() { this.event = undefined; } fire() {} },
    tasks: { executeTask: () => Promise.resolve({}) },
    TaskScope: { Workspace: 0 },
    Task: class {},
    ShellExecution: class {},
    TaskRevealKind: { Always: 0 },
    TaskPanelKind: { Shared: 0 },
    Uri: { file: (p) => p, joinPath: (...parts) => parts.join("/") },
    extensions: { getExtension: () => undefined },
    commands: { executeCommand: () => Promise.resolve() },
    ViewColumn: { Active: 0 }
  };
}

function setupExtensionModule() {
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === "vscode") return createVscodeMock();
    return originalRequire.apply(this, arguments);
  };
  const ext = require("../out/extension.js");
  Module.prototype.require = originalRequire;
  return ext;
}

test("activate is exported as a function", () => {
  const ext = setupExtensionModule();
  assert.equal(typeof ext.activate, "function");
});

test("deactivate is exported", () => {
  const ext = setupExtensionModule();
  assert.equal(typeof ext.deactivate, "function");
});
