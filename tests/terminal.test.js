const test = require("node:test");
const assert = require("node:assert/strict");

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

function setupTerminalModule() {
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === "vscode") return createVscodeMock();
    return originalRequire.apply(this, arguments);
  };
  const terminal = require("../out/terminal.js");
  Module.prototype.require = originalRequire;
  return terminal;
}

test("CLAUDE_ACTION_COLOR is exported", () => {
  const terminal = setupTerminalModule();
  assert.ok(terminal.CLAUDE_ACTION_COLOR);
});

test("getAgentTerminalName returns the agent terminal name", () => {
  const terminal = setupTerminalModule();
  assert.equal(terminal.getAgentTerminalName(), "Antigravity Agent");
});

test("runInSecondaryTerminal is an async function", () => {
  const terminal = setupTerminalModule();
  assert.equal(typeof terminal.runInSecondaryTerminal, "function");
});

test("runInPersistentTerminal is a function", () => {
  const terminal = setupTerminalModule();
  assert.equal(typeof terminal.runInPersistentTerminal, "function");
});

test("openCommandInExternalTerminal is a function", () => {
  const terminal = setupTerminalModule();
  assert.equal(typeof terminal.openCommandInExternalTerminal, "function");
});

test("runCommandInTaskTerminal is an async function", () => {
  const terminal = setupTerminalModule();
  assert.equal(typeof terminal.runCommandInTaskTerminal, "function");
});

test("buildAgenticHarnessPromptCommand is a function", () => {
  const terminal = setupTerminalModule();
  assert.equal(typeof terminal.buildAgenticHarnessPromptCommand, "function");
});

test("buildAgenticHarnessFileCommand is a function", () => {
  const terminal = setupTerminalModule();
  assert.equal(typeof terminal.buildAgenticHarnessFileCommand, "function");
});

test("buildLightAgenticHarnessPromptCommand is a function", () => {
  const terminal = setupTerminalModule();
  assert.equal(typeof terminal.buildLightAgenticHarnessPromptCommand, "function");
});

test("runClaudeInitAndUpdateInPersistentTerminal is an async function", () => {
  const terminal = setupTerminalModule();
  assert.equal(typeof terminal.runClaudeInitAndUpdateInPersistentTerminal, "function");
});

test("runCodexInitAndUpdateInPersistentTerminal is an async function", () => {
  const terminal = setupTerminalModule();
  assert.equal(typeof terminal.runCodexInitAndUpdateInPersistentTerminal, "function");
});

test("runClaudePromptInPersistentTerminal is a function", () => {
  const terminal = setupTerminalModule();
  assert.equal(typeof terminal.runClaudePromptInPersistentTerminal, "function");
});

test("buildExternalTerminalLaunchSpecs uses Terminal.app automation on macOS", () => {
  const terminal = setupTerminalModule();
  const specs = terminal.buildExternalTerminalLaunchSpecs("/tmp/project root", "claude", "darwin");

  assert.equal(specs.length, 1);
  assert.equal(specs[0].command, "osascript");
  assert.match(specs[0].args.join(" "), /tell application "Terminal" to activate/);
  assert.match(specs[0].args.join(" "), /cd \\"\/tmp\/project root\\" && claude/);
});

test("buildExternalTerminalLaunchSpecs uses cmd start on Windows", () => {
  const terminal = setupTerminalModule();
  const specs = terminal.buildExternalTerminalLaunchSpecs("C:\\Projects\\Task Runner", "claude", "win32");

  assert.equal(specs.length, 1);
  assert.equal(specs[0].command, "cmd.exe");
  assert.deepEqual(specs[0].args.slice(0, 5), ["/c", "start", "\"Claude Terminal\"", "cmd.exe", "/k"]);
  assert.match(specs[0].args[5], /cd \/d "C:\\Projects\\Task Runner" && claude/);
});

test("buildExternalTerminalLaunchSpecs provides Linux terminal fallbacks", () => {
  const terminal = setupTerminalModule();
  const specs = terminal.buildExternalTerminalLaunchSpecs("/tmp/project root", "claude", "linux");

  assert.deepEqual(
    specs.map((spec) => spec.command),
    ["x-terminal-emulator", "gnome-terminal", "konsole", "xterm"]
  );
  assert.ok(JSON.stringify(specs).includes('cd \\"/tmp/project root\\" && claude'));
});
