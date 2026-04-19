export type AssignableAgentLabel = "Claude Code" | "Codex" | "OpenCode" | "Qwen Code";

function quoteShellArg(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

export function buildAgentRunCommand(
  repoRoot: string,
  agentLabel: AssignableAgentLabel,
  prompt: string
): string {
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
  if (agentLabel === "Qwen Code") {
    return `opencode run -m ollama/qwen3-coder:30b ${quoteShellArg(prompt)}`;
  }
  return `opencode run ${quoteShellArg(prompt)}`;
}
