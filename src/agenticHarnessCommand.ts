export type AgenticHarnessPromptMode = "dangerous" | "prompt";

function quoteShellArg(value: string): string {
  return `"${value.replace(/["\\$`]/g, "\\$&")}"`;
}

function buildCodexTrustArgs(repoRoot: string): string {
  const trustOverride = `projects.${JSON.stringify(repoRoot)}.trust_level="trusted"`;
  return `-C ${quoteShellArg(repoRoot)} -c "trust_level=\\"trusted\\"" -c ${quoteShellArg(trustOverride)}`;
}

function buildCodexExecBaseCommand(command: string): string {
  return /\bcodex\s+exec\b/.test(command)
    ? command
    : command.replace(/\bcodex\b/, "codex exec");
}

function buildCodexPromptBaseCommand(command: string): string {
  return command.replace(/\bcodex\s+exec\b/, "codex").trim();
}

function getExecutableName(command: string): string {
  const firstToken = command.trim().split(/\s+/)[0] || "";
  const normalized = firstToken.replace(/\\/g, "/");
  const basename = normalized.split("/").pop() || normalized;
  return basename.toLowerCase();
}

export function buildAgenticHarnessPromptCommandForCommand(
  command: string,
  repoRoot: string,
  prompt: string,
  mode: AgenticHarnessPromptMode = "dangerous"
): string {
  const trimmedCommand = command.trim();
  const executableName = getExecutableName(trimmedCommand);

  if (executableName === "claude") {
    if (mode === "dangerous") {
      return `${trimmedCommand} --dangerously-skip-permissions --print ${quoteShellArg(prompt)}`;
    }
    return `${trimmedCommand} ${quoteShellArg(prompt)}`;
  }

  if (executableName === "codex") {
    const codexTrustArgs = buildCodexTrustArgs(repoRoot);

    if (mode === "prompt") {
      return `${buildCodexPromptBaseCommand(trimmedCommand)} ${codexTrustArgs} ${quoteShellArg(prompt)}`;
    }

    return `${buildCodexExecBaseCommand(trimmedCommand)} --full-auto ${codexTrustArgs} ${quoteShellArg(prompt)}`;
  }

  if (executableName === "opencode" || executableName === "gemini") {
    return `${trimmedCommand} ${quoteShellArg(prompt)}`;
  }

  return `${trimmedCommand} ${quoteShellArg(prompt)}`;
}

/**
 * Builds the agentic harness command using a prompt stored in a file.
 * This avoids shell-escaping issues with long, multi-line prompts and allows
 * the prompt to be edited without recompiling the extension.
 *
 * For claude: uses --print "$(cat <file>)"
 * For codex dangerous mode: uses file redirect (- < <file>)
 * For codex prompt mode: passes "$(cat <file>)" as the prompt argument
 * For opencode/gemini: passes "$(cat <file>)" as the prompt argument
 * For others: falls back to "$(cat <file>)" command substitution
 */
export function buildAgenticHarnessFileCommandForCommand(
  command: string,
  repoRoot: string,
  promptFilePath: string,
  mode: AgenticHarnessPromptMode = "dangerous"
): string {
  const trimmedCommand = command.trim();
  const executableName = getExecutableName(trimmedCommand);
  const quotedFile = quoteShellArg(promptFilePath);

  if (executableName === "claude") {
    if (mode === "dangerous") {
      return `${trimmedCommand} --dangerously-skip-permissions --print "$(cat ${quotedFile})"`;
    }
    return `${trimmedCommand} "$(cat ${quotedFile})"`;
  }

  if (executableName === "codex") {
    const codexTrustArgs = buildCodexTrustArgs(repoRoot);

    if (mode === "prompt") {
      return `${buildCodexPromptBaseCommand(trimmedCommand)} ${codexTrustArgs} "$(cat ${quotedFile})"`;
    }

    return `${buildCodexExecBaseCommand(trimmedCommand)} --full-auto ${codexTrustArgs} - < ${quotedFile}`;
  }

  if (executableName === "opencode" || executableName === "gemini") {
    return `${trimmedCommand} "$(cat ${quotedFile})"`;
  }

  // Generic fallback: inject file contents via command substitution
  return `${trimmedCommand} "$(cat ${quotedFile})"`;
}
