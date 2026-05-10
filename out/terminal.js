"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLAUDE_ACTION_COLOR = void 0;
exports.runInSecondaryTerminal = runInSecondaryTerminal;
exports.runInNewTerminal = runInNewTerminal;
exports.runCommandInTaskTerminal = runCommandInTaskTerminal;
exports.buildAgenticHarnessPromptCommand = buildAgenticHarnessPromptCommand;
exports.buildAgenticHarnessFileCommand = buildAgenticHarnessFileCommand;
exports.buildLightAgenticHarnessPromptCommand = buildLightAgenticHarnessPromptCommand;
exports.runClaudeInitAndUpdateInNewTerminal = runClaudeInitAndUpdateInNewTerminal;
exports.runCodexInitAndUpdateInNewTerminal = runCodexInitAndUpdateInNewTerminal;
exports.runClaudePromptInNewTerminal = runClaudePromptInNewTerminal;
const vscode = require("vscode");
const logger_1 = require("./logger");
const settings_1 = require("./settings");
const agenticHarnessCommand_1 = require("./agenticHarnessCommand");
const utils_1 = require("./utils");
exports.CLAUDE_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiYellow");
function getOrCreateTerminal(name) {
    const existing = vscode.window.terminals.find((t) => t.name === name);
    if (existing)
        return existing;
    return vscode.window.createTerminal({ name });
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
function runInNewTerminal(name, lines, options = {}) {
    const terminal = vscode.window.createTerminal({ name, ...options });
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
        panel: vscode.TaskPanelKind.Dedicated,
        focus: true,
        clear: false,
        showReuseMessage: false
    };
    return vscode.tasks.executeTask(task);
}
function buildAgenticHarnessPromptCommand(repoRoot, prompt, mode = "dangerous") {
    const command = (0, settings_1.getAgenticHarnessExecutionCommand)();
    const runString = (0, agenticHarnessCommand_1.buildAgenticHarnessPromptCommandForCommand)(command, repoRoot, prompt, mode);
    (0, logger_1.logAlways)(`[agenticHarness] runString: ${runString}`);
    return runString;
}
function buildAgenticHarnessFileCommand(repoRoot, promptFilePath, mode = "dangerous") {
    const command = (0, settings_1.getAgenticHarnessExecutionCommand)();
    const runString = (0, agenticHarnessCommand_1.buildAgenticHarnessFileCommandForCommand)(command, repoRoot, promptFilePath, mode);
    (0, logger_1.logAlways)(`[agenticHarness] runString (file): ${runString}`);
    return runString;
}
function buildLightAgenticHarnessPromptCommand(repoRoot, prompt, mode = "dangerous") {
    const command = (0, settings_1.getLightAgenticHarnessExecutionCommand)();
    const runString = (0, agenticHarnessCommand_1.buildAgenticHarnessPromptCommandForCommand)(command, repoRoot, prompt, mode);
    (0, logger_1.logAlways)(`[lightAgenticHarness] runString: ${runString}`);
    return runString;
}
async function runClaudeInitAndUpdateInNewTerminal(repoRoot, prompt) {
    const commands = [
        `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
        buildAgenticHarnessPromptCommand(repoRoot, prompt, "dangerous")
    ];
    runInNewTerminal("Agentic Harness Init", commands, {
        iconPath: new vscode.ThemeIcon("robot", exports.CLAUDE_ACTION_COLOR),
        color: exports.CLAUDE_ACTION_COLOR
    });
}
async function runCodexInitAndUpdateInNewTerminal(repoRoot, prompt) {
    const trustOverride = `projects.${JSON.stringify(repoRoot)}.trust_level="trusted"`;
    runInNewTerminal("Codex Init", [
        `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
        `codex -C ${(0, utils_1.quoteShellArg)(repoRoot)} -c "trust_level=\\"trusted\\"" -c ${(0, utils_1.quoteShellArg)(trustOverride)} ${(0, utils_1.quoteShellArg)(prompt)}`
    ], {
        iconPath: new vscode.ThemeIcon("robot", exports.CLAUDE_ACTION_COLOR),
        color: exports.CLAUDE_ACTION_COLOR
    });
}
function runClaudePromptInNewTerminal(repoRoot, prompt) {
    runInNewTerminal("Agentic Harness", [`cd ${(0, utils_1.quoteShellArg)(repoRoot)}`, buildAgenticHarnessPromptCommand(repoRoot, prompt, "prompt")], {
        iconPath: new vscode.ThemeIcon("robot", exports.CLAUDE_ACTION_COLOR),
        color: exports.CLAUDE_ACTION_COLOR
    });
}
//# sourceMappingURL=terminal.js.map