"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAgentRunCommand = buildAgentRunCommand;
function quoteShellArg(value) {
    return `"${value.replace(/"/g, '\\"')}"`;
}
function buildAgentRunCommand(repoRoot, agentLabel, prompt) {
    if (agentLabel === "Claude Code") {
        return `claude --permission-mode auto ${quoteShellArg(prompt)}`;
    }
    if (agentLabel === "Codex") {
        const trustOverride = `projects.${JSON.stringify(repoRoot)}.trust_level="trusted"`;
        const heredocMarker = "ANTIGRAVITY_JIRA_PROMPT_EOF";
        return `codex exec --full-auto -C ${quoteShellArg(repoRoot)} -c "trust_level=\\"trusted\\"" -c ${quoteShellArg(trustOverride)} - <<'${heredocMarker}'\n${prompt}\n${heredocMarker}`;
    }
    if (agentLabel === "OpenCode") {
        return `opencode run ${quoteShellArg(prompt)}`;
    }
    return `opencode run -m ollama/qwen3-coder:30b ${quoteShellArg(prompt)}`;
}
//# sourceMappingURL=agentRunCommand.js.map