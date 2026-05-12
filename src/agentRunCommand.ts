import { buildAgenticHarnessPromptCommandForCommand } from "./agenticHarnessCommand";
import { quoteShellArg, getExecutableName } from "./shellUtils";

export type AssignableAgentLabel =
  | "Antigravity"
  | "Claude Code"
  | "Codex"
  | "Gemini"
  | "OpenCode"
  | "Qwen Code";

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
    return buildAgenticHarnessPromptCommandForCommand("claude", repoRoot, prompt, "unattended");
  }
  if (agentLabel === "Codex") {
    return buildAgenticHarnessPromptCommandForCommand("codex", repoRoot, prompt, "unattended");
  }
  if (agentLabel === "Gemini") {
    return buildAgenticHarnessPromptCommandForCommand("gemini", repoRoot, prompt, "unattended");
  }
  if (agentLabel === "Qwen Code") {
    return buildAgenticHarnessPromptCommandForCommand("opencode run -m ollama/qwen3-coder:30b", repoRoot, prompt, "unattended");
  }
  if (agentLabel === "OpenCode") {
    return `opencode run ${quoteShellArg(prompt)}`;
  }
  return `NO AGENTIC HARNESS SELECTED`; //No Agentic Harness selected
}
