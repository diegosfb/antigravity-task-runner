"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferAssignableAgentLabelFromCommand = inferAssignableAgentLabelFromCommand;
exports.buildAgentRunCommand = buildAgentRunCommand;
const agenticHarnessCommand_1 = require("./agenticHarnessCommand");
function quoteShellArg(value) {
    return `"${value.replace(/["\\$`]/g, "\\$&")}"`;
}
function getExecutableName(command) {
    const firstToken = command.trim().split(/\s+/)[0] || "";
    const normalized = firstToken.replace(/\\/g, "/");
    return normalized.split("/").pop()?.toLowerCase() || "";
}
function inferAssignableAgentLabelFromCommand(command) {
    const trimmedCommand = command.trim().toLowerCase();
    const executableName = getExecutableName(command);
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
        return (0, agenticHarnessCommand_1.buildAgenticHarnessPromptCommandForCommand)(customCommand, repoRoot, prompt, "dangerous");
    }
    if (agentLabel === "Claude Code") {
        return `claude --permission-mode auto ${quoteShellArg(prompt)}`;
    }
    if (agentLabel === "Codex") {
        return (0, agenticHarnessCommand_1.buildAgenticHarnessPromptCommandForCommand)("codex", repoRoot, prompt, "dangerous");
    }
    if (agentLabel === "Gemini") {
        return (0, agenticHarnessCommand_1.buildAgenticHarnessPromptCommandForCommand)("gemini", repoRoot, prompt, "dangerous");
    }
    if (agentLabel === "OpenCode") {
        return `opencode run ${quoteShellArg(prompt)}`;
    }
    if (agentLabel === "Qwen Code") {
        return `opencode run -m ollama/qwen3-coder:30b ${quoteShellArg(prompt)}`;
    }
    return `opencode run ${quoteShellArg(prompt)}`;
}
//# sourceMappingURL=agentRunCommand.js.map