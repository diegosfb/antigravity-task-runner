"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLAUDE_ACTION_COLOR = void 0;
exports.getAgentTerminalName = getAgentTerminalName;
exports.runInSecondaryTerminal = runInSecondaryTerminal;
exports.runInPersistentTerminal = runInPersistentTerminal;
exports.runCommandInTaskTerminal = runCommandInTaskTerminal;
exports.buildAgenticHarnessPromptCommand = buildAgenticHarnessPromptCommand;
exports.buildAgenticHarnessFileCommand = buildAgenticHarnessFileCommand;
exports.buildLightAgenticHarnessPromptCommand = buildLightAgenticHarnessPromptCommand;
exports.runClaudeInitAndUpdateInPersistentTerminal = runClaudeInitAndUpdateInPersistentTerminal;
exports.runCodexInitAndUpdateInPersistentTerminal = runCodexInitAndUpdateInPersistentTerminal;
exports.runClaudePromptInPersistentTerminal = runClaudePromptInPersistentTerminal;
const vscode = require("vscode");
const logger_1 = require("./logger");
const settings_1 = require("./settings");
const agenticHarnessCommand_1 = require("./agenticHarnessCommand");
const utils_1 = require("./utils");
exports.CLAUDE_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiYellow");
function getOrCreateTerminal(name, options = {}) {
    const existing = vscode.window.terminals.find((t) => t.name === name);
    if (existing)
        return existing;
    return vscode.window.createTerminal({ name, ...options });
}
function getAgentTerminalName() {
    return "Antigravity Agent";
}
function getTerminalName() {
    return (vscode.workspace.getConfiguration("antigravity").get("terminalName") ||
        "Antigravity Workflow");
}
async function runInSecondaryTerminal(lines) {
    const terminal = getOrCreateTerminal(getTerminalName());
    terminal.show();
    for (const line of lines) {
        terminal.sendText(line, true);
    }
    return true;
}
function runInPersistentTerminal(name, lines, options = {}) {
    const terminal = getOrCreateTerminal(name, options);
    terminal.show();
    for (const line of lines) {
        terminal.sendText(line, true);
    }
}
async function runCommandInTaskTerminal(name, commandLine, options = {}) {
    const scope = options.cwd
        ? vscode.workspace.getWorkspaceFolder(vscode.Uri.file(options.cwd)) ?? vscode.TaskScope.Workspace
        : vscode.TaskScope.Workspace;
    const task = new vscode.Task({ type: "shell", task: name }, scope, name, "Antigravity", new vscode.ShellExecution(commandLine, {
        cwd: options.cwd,
        env: options.env
    }));
    task.presentationOptions = {
        reveal: vscode.TaskRevealKind.Always,
        panel: vscode.TaskPanelKind.Shared,
        focus: true,
        clear: false,
        showReuseMessage: false
    };
    return vscode.tasks.executeTask(task);
}
function buildAgenticHarnessPromptCommand(repoRoot, prompt, mode = "unattended") {
    const command = (0, settings_1.getAgenticHarnessExecutionCommand)();
    const runString = (0, agenticHarnessCommand_1.buildAgenticHarnessPromptCommandForCommand)(command, repoRoot, prompt, mode);
    (0, logger_1.logAlways)(`[agenticHarness] runString: ${runString}`);
    return runString;
}
function buildAgenticHarnessFileCommand(repoRoot, promptFilePath, mode = "unattended") {
    const command = (0, settings_1.getAgenticHarnessExecutionCommand)();
    const runString = (0, agenticHarnessCommand_1.buildAgenticHarnessFileCommandForCommand)(command, repoRoot, promptFilePath, mode);
    (0, logger_1.logAlways)(`[agenticHarness] runString (file): ${runString}`);
    return runString;
}
function buildLightAgenticHarnessPromptCommand(repoRoot, prompt, mode = "unattended") {
    const command = (0, settings_1.getLightAgenticHarnessExecutionCommand)();
    const runString = (0, agenticHarnessCommand_1.buildAgenticHarnessPromptCommandForCommand)(command, repoRoot, prompt, mode);
    (0, logger_1.logAlways)(`[lightAgenticHarness] runString: ${runString}`);
    return runString;
}
async function runClaudeInitAndUpdateInPersistentTerminal(repoRoot, prompt) {
    const commands = [
        `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
        buildAgenticHarnessPromptCommand(repoRoot, prompt, "unattended")
    ];
    runInPersistentTerminal(getAgentTerminalName(), commands, {
        iconPath: new vscode.ThemeIcon("robot", exports.CLAUDE_ACTION_COLOR),
        color: exports.CLAUDE_ACTION_COLOR
    });
}
async function runCodexInitAndUpdateInPersistentTerminal(repoRoot, prompt) {
    const trustOverride = `projects.${JSON.stringify(repoRoot)}.trust_level="trusted"`;
    runInPersistentTerminal(getAgentTerminalName(), [
        `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
        `codex -C ${(0, utils_1.quoteShellArg)(repoRoot)} -c "trust_level=\\"trusted\\"" -c ${(0, utils_1.quoteShellArg)(trustOverride)} ${(0, utils_1.quoteShellArg)(prompt)}`
    ], {
        iconPath: new vscode.ThemeIcon("robot", exports.CLAUDE_ACTION_COLOR),
        color: exports.CLAUDE_ACTION_COLOR
    });
}
function runClaudePromptInPersistentTerminal(repoRoot, prompt) {
    runInPersistentTerminal(getAgentTerminalName(), [`cd ${(0, utils_1.quoteShellArg)(repoRoot)}`, buildAgenticHarnessPromptCommand(repoRoot, prompt, "prompt")], {
        iconPath: new vscode.ThemeIcon("robot", exports.CLAUDE_ACTION_COLOR),
        color: exports.CLAUDE_ACTION_COLOR
    });
}
//# sourceMappingURL=terminal.js.map