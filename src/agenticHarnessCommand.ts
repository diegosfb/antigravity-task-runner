import { quoteShellArg, getExecutableName } from "./shellUtils";

export type AgenticHarnessPromptMode = "unattended" | "prompt";

type HarnessBaseCommandBuilder = (
  command: string,
  repoRoot: string,
  mode: AgenticHarnessPromptMode
) => string;

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

function buildOpenCodeUnattendedBaseCommand(command: string): string {
  return /\bopencode\s+run\b/.test(command)
    ? command
    : command.replace(/\bopencode\b/, "opencode run");
}

function buildOpenCodePromptBaseCommand(command: string): string {
  return command.replace(/\bopencode\s+run\b/, "opencode").trim();
}

function buildGeminiUnattendedBaseCommand(command: string): string {
  return /(?:^|\s)--yolo(?:\s|$)/.test(command)
    ? command
    : command.replace(/\bgemini\b/, "gemini --yolo");
}

const HARNESS_BASE_COMMAND_BUILDERS: Record<string, HarnessBaseCommandBuilder> = {
  claude(command, _repoRoot, mode) {
    if (mode === "unattended") {
      return `${command} --dangerously-skip-permissions --print`;
    }
    return command;
  },

  codex(command, repoRoot, mode) {
    const codexTrustArgs = buildCodexTrustArgs(repoRoot);

    if (mode === "unattended") {
      return `${buildCodexExecBaseCommand(command)} --full-auto ${codexTrustArgs}`;
    }

    return `${buildCodexPromptBaseCommand(command)} ${codexTrustArgs}`;
  },

  opencode(command, _repoRoot, mode) {
    return mode === "unattended"
      ? buildOpenCodeUnattendedBaseCommand(command)
      : buildOpenCodePromptBaseCommand(command);
  },

  gemini(command, _repoRoot, mode) {
    return mode === "unattended"
      ? buildGeminiUnattendedBaseCommand(command)
      : command;
  }
};

function buildAgenticHarnessBaseCommand(
  command: string,
  repoRoot: string,
  mode: AgenticHarnessPromptMode
): string {
  const trimmedCommand = command.trim();
  const executableName = getExecutableName(trimmedCommand);
  const buildBaseCommand = HARNESS_BASE_COMMAND_BUILDERS[executableName];
  return buildBaseCommand ? buildBaseCommand(trimmedCommand, repoRoot, mode) : trimmedCommand;
}

function buildAgenticHarnessCommandForArgument(
  command: string,
  repoRoot: string,
  promptArgument: string,
  mode: AgenticHarnessPromptMode
): string {
  const baseCommand = buildAgenticHarnessBaseCommand(command, repoRoot, mode);
  return `${baseCommand} ${promptArgument}`;
}

function buildPromptArgumentFromFile(promptFilePath: string): string {
  const quotedFile = quoteShellArg(promptFilePath);
  return `"$(cat ${quotedFile})"`;
}

export function buildAgenticHarnessPromptCommandForCommand(
  command: string,
  repoRoot: string,
  prompt: string,
  mode: AgenticHarnessPromptMode = "unattended"
): string {
  return buildAgenticHarnessCommandForArgument(
    command,
    repoRoot,
    quoteShellArg(prompt),
    mode
  );
}

/**
 * Builds the agentic harness command using a prompt stored in a file.
 * This mirrors the normal prompt builder but injects `$(cat <file>)` as the
 * prompt argument so long, multi-line prompts do not need to be shell-escaped
 * inline by the caller.
 */
export function buildAgenticHarnessFileCommandForCommand(
  command: string,
  repoRoot: string,
  promptFilePath: string,
  mode: AgenticHarnessPromptMode = "unattended"
): string {
  return buildAgenticHarnessCommandForArgument(
    command,
    repoRoot,
    buildPromptArgumentFromFile(promptFilePath),
    mode
  );
}
