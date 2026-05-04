export type AgenticHarnessPromptMode = "dangerous" | "prompt";

function quoteShellArg(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

export function buildAgenticHarnessPromptCommandForCommand(
  command: string,
  repoRoot: string,
  prompt: string,
  mode: AgenticHarnessPromptMode = "dangerous"
): string {
  const trimmedCommand = command.trim();

  if (trimmedCommand.startsWith("claude")) {
    return `${trimmedCommand}${mode === "dangerous" ? " --dangerously-skip-permissions" : ""} ${quoteShellArg(prompt)}`;
  }

  if (trimmedCommand.startsWith("codex")) {
    const codexBaseCommand = /\bcodex\s+exec\b/.test(trimmedCommand)
      ? trimmedCommand
      : `${trimmedCommand} exec`;
    const trustOverride = `projects.${JSON.stringify(repoRoot)}.trust_level="trusted"`;
    const heredocMarker = "ANTIGRAVITY_HARNESS_PROMPT_EOF";

    return `${codexBaseCommand} --full-auto -C ${quoteShellArg(repoRoot)} -c "trust_level=\\"trusted\\"" -c ${quoteShellArg(trustOverride)} - <<'${heredocMarker}'\n${prompt}\n${heredocMarker}`;
  }

  return `${trimmedCommand} ${quoteShellArg(prompt)}`;
}
