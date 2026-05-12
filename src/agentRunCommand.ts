import { buildAgenticHarnessPromptCommandForCommand } from "./agenticHarnessCommand";

export type AssignableAgentLabel =
  | "Antigravity"
  | "Claude Code"
  | "Codex"
  | "Gemini"
  | "OpenCode"
  | "Qwen Code";

function quoteShellArg(value: string): string {
  return `"${value.replace(/["\\$`]/g, "\\$&")}"`;
}

function getExecutableName(command: string): string {
  const firstToken = command.trim().split(/\s+/)[0] || "";
  const normalized = firstToken.replace(/\\/g, "/");
  return normalized.split("/").pop()?.toLowerCase() || "";
}

export function inferAssignableAgentLabelFromCommand(command: string): AssignableAgentLabel {
  const trimmedCommand = command.trim().toLowerCase();
  const executableName = getExecutableName(command);
  if (executableName === "claude") return "Claude Code";
  if (executableName === "codex") return "Codex";
  if (executableName === "gemini") return "Gemini";
  if (trimmedCommand.includes("qwen3-coder")) return "Qwen Code";
  if (executableName === "opencode") return "OpenCode";
  return "Antigravity";
}

export function buildAgentRunCommand(
  repoRoot: string,
  agentLabel: AssignableAgentLabel,
  prompt: string,
  options: { customCommand?: string } = {}
): string {
  const customCommand = options.customCommand?.trim();
  if (customCommand) {
    return buildAgenticHarnessPromptCommandForCommand(
      customCommand,
      repoRoot,
      prompt,
      "unattended"
    );
  }

  if (agentLabel === "Claude Code") {
    return `claude --permission-mode auto ${quoteShellArg(prompt)}`;
  }
  if (agentLabel === "Codex") {
    return buildAgenticHarnessPromptCommandForCommand("codex", repoRoot, prompt, "unattended");
  }
  if (agentLabel === "Gemini") {
    return buildAgenticHarnessPromptCommandForCommand("gemini", repoRoot, prompt, "unattended");
  }
  if (agentLabel === "OpenCode") {
    return `opencode run ${quoteShellArg(prompt)}`;
  }
  if (agentLabel === "Qwen Code") {
    return `opencode run -m ollama/qwen3-coder:30b ${quoteShellArg(prompt)}`;
  }
  return `opencode run ${quoteShellArg(prompt)}`;
}
