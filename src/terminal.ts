import * as vscode from "vscode";
import { logAlways } from "./logger";
import { getAgenticHarnessExecutionCommand } from "./settings";
import { quoteShellArg } from "./utils";

export const CLAUDE_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiYellow");

function getOrCreateTerminal(name: string): vscode.Terminal {
  const existing = vscode.window.terminals.find((t) => t.name === name);
  if (existing) return existing;
  return vscode.window.createTerminal({ name });
}

function getTerminalName(): string {
  return (
    vscode.workspace.getConfiguration("antigravity").get<string>("terminalName") ||
    "Antigravity Workflow"
  );
}

export async function runInSecondaryTerminal(lines: string[]): Promise<boolean> {
  const terminal = getOrCreateTerminal(getTerminalName());
  terminal.show();
  for (const line of lines) {
    terminal.sendText(line, true);
  }
  return true;
}

export function runInNewTerminal(
  name: string,
  lines: string[],
  options: Omit<vscode.TerminalOptions, "name"> = {}
): void {
  const terminal = vscode.window.createTerminal({ name, ...options });
  terminal.show();
  for (const line of lines) {
    terminal.sendText(line, true);
  }
}

export function buildAgenticHarnessPromptCommand(
  prompt: string,
  mode: "dangerous" | "prompt" = "dangerous"
): string {
  const command = getAgenticHarnessExecutionCommand();
  const runString = command.startsWith("claude")
    ? `${command} ${mode === "prompt" ? "-p" : "--dangerously-skip-permissions"} ${quoteShellArg(prompt)}`
    : `${command} ${quoteShellArg(prompt)}`;
  logAlways(`[agenticHarness] runString: ${runString}`);
  if (command.startsWith("claude")) {
    return runString;
  }
  return runString;
}

export async function runClaudeInitAndUpdateInNewTerminal(
  repoRoot: string,
  prompt: string
): Promise<void> {
  const commands = [
    `cd ${quoteShellArg(repoRoot)}`,
    buildAgenticHarnessPromptCommand(prompt, "dangerous")
  ];
  runInNewTerminal("Agentic Harness Init", commands, {
    iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
    color: CLAUDE_ACTION_COLOR
  });
}

export async function runCodexInitAndUpdateInNewTerminal(
  repoRoot: string,
  prompt: string
): Promise<void> {
  const trustOverride = `projects.${JSON.stringify(repoRoot)}.trust_level="trusted"`;
  runInNewTerminal(
    "Codex Init",
    [
      `cd ${quoteShellArg(repoRoot)}`,
      `codex -C ${quoteShellArg(repoRoot)} -c "trust_level=\\"trusted\\"" -c ${quoteShellArg(trustOverride)} ${quoteShellArg(prompt)}`
    ],
    {
      iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
      color: CLAUDE_ACTION_COLOR
    }
  );
}

export function runClaudePromptInNewTerminal(repoRoot: string, prompt: string): void {
  runInNewTerminal(
    "Agentic Harness",
    [`cd ${quoteShellArg(repoRoot)}`, buildAgenticHarnessPromptCommand(prompt, "prompt")],
    {
      iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
      color: CLAUDE_ACTION_COLOR
    }
  );
}
