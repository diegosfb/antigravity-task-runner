"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferAssignableAgentLabelFromCommand = inferAssignableAgentLabelFromCommand;
exports.buildAgentRunCommand = buildAgentRunCommand;
const agenticHarnessCommand_1 = require("./agenticHarnessCommand");
const shellUtils_1 = require("./shellUtils");
function inferAssignableAgentLabelFromCommand(command) {
    const trimmedCommand = command.trim().toLowerCase();
    const executableName = (0, shellUtils_1.getExecutableName)(command);
    if (executableName === "claude")
        return "Claude Code";
    if (executableName === "codex")
        return "Codex";
    if (executableName === "gemini")
        return "Gemini";
    if (trimmedCommand.includes("qwen3-coder"))
        return "Qwen Code";
    if (executableName === "opencode")
        return "OpenCode";
    return "Antigravity";
}
function buildAgentRunCommand(repoRoot, agentLabel, prompt, options = {}) {
    const customCommand = options.customCommand?.trim();
    if (customCommand) {
        return (0, agenticHarnessCommand_1.buildAgenticHarnessPromptCommandForCommand)(customCommand, repoRoot, prompt, "unattended");
    }
    if (agentLabel === "Claude Code") {
        return (0, agenticHarnessCommand_1.buildAgenticHarnessPromptCommandForCommand)("claude", repoRoot, prompt, "unattended");
    }
    if (agentLabel === "Codex") {
        return (0, agenticHarnessCommand_1.buildAgenticHarnessPromptCommandForCommand)("codex", repoRoot, prompt, "unattended");
    }
    if (agentLabel === "Gemini") {
        return (0, agenticHarnessCommand_1.buildAgenticHarnessPromptCommandForCommand)("gemini", repoRoot, prompt, "unattended");
    }
    if (agentLabel === "Qwen Code") {
        return (0, agenticHarnessCommand_1.buildAgenticHarnessPromptCommandForCommand)("opencode run -m ollama/qwen3-coder:30b", repoRoot, prompt, "unattended");
    }
    if (agentLabel === "OpenCode") {
        return `opencode run ${(0, shellUtils_1.quoteShellArg)(prompt)}`;
    }
    return `NO AGENTIC HARNESS SELECTED`; //No Agentic Harness selected
}
//# sourceMappingURL=agentRunCommand.js.map