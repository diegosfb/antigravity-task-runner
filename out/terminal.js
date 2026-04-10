"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLAUDE_ACTION_COLOR = void 0;
exports.runInSecondaryTerminal = runInSecondaryTerminal;
exports.runInNewTerminal = runInNewTerminal;
exports.runClaudeInitAndUpdateInNewTerminal = runClaudeInitAndUpdateInNewTerminal;
exports.runClaudePromptInNewTerminal = runClaudePromptInNewTerminal;
const vscode = require("vscode");
exports.CLAUDE_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiYellow");
const SECONDARY_TERMINAL_COMMANDS = {
    create: "secondaryTerminal.createTerminal",
    focus: "secondaryTerminal.focusTerminal",
    send: "secondaryTerminal.sendToTerminal"
};
async function hasSecondaryTerminal() {
    const commands = await vscode.commands.getCommands(true);
    return (commands.includes(SECONDARY_TERMINAL_COMMANDS.create) &&
        commands.includes(SECONDARY_TERMINAL_COMMANDS.send));
}
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
    const available = await hasSecondaryTerminal();
    if (!available) {
        const terminal = getOrCreateTerminal(getTerminalName());
        terminal.show();
        for (const line of lines) {
            terminal.sendText(line, true);
        }
        void vscode.window.showWarningMessage("Secondary Terminal extension not available. Ran the task in the default terminal instead.");
        return true;
    }
    try {
        await vscode.commands.executeCommand(SECONDARY_TERMINAL_COMMANDS.create);
        await vscode.commands.executeCommand(SECONDARY_TERMINAL_COMMANDS.focus);
        for (const line of lines) {
            await vscode.commands.executeCommand(SECONDARY_TERMINAL_COMMANDS.send, line);
        }
        return true;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        void vscode.window.showErrorMessage(`Failed to send commands to Secondary Terminal: ${message}`);
        return false;
    }
}
function runInNewTerminal(name, lines, options = {}) {
    const terminal = vscode.window.createTerminal({ name, ...options });
    terminal.show();
    for (const line of lines) {
        terminal.sendText(line, true);
    }
}
async function runClaudeInitAndUpdateInNewTerminal(repoRoot, prompt) {
    runInNewTerminal("Claude Init", [`cd "${repoRoot}"`, `claude "${prompt.replace(/"/g, '\\"')}"`], {
        iconPath: new vscode.ThemeIcon("robot", exports.CLAUDE_ACTION_COLOR),
        color: exports.CLAUDE_ACTION_COLOR
    });
}
function runClaudePromptInNewTerminal(repoRoot, prompt) {
    runInNewTerminal("Claude", [`cd "${repoRoot}"`, `claude -p "${prompt.replace(/"/g, '\\"')}"`], {
        iconPath: new vscode.ThemeIcon("robot", exports.CLAUDE_ACTION_COLOR),
        color: exports.CLAUDE_ACTION_COLOR
    });
}
//# sourceMappingURL=terminal.js.map