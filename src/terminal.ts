import * as vscode from "vscode";

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

export async function runClaudeInitAndUpdateInNewTerminal(
  repoRoot: string,
  prompt: string
): Promise<void> {
  runInNewTerminal(
    "Claude Init",
    [`cd "${repoRoot}"`, `claude "${prompt.replace(/"/g, '\\"')}"`],
    {
      iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
      color: CLAUDE_ACTION_COLOR
    }
  );
}

export function runClaudePromptInNewTerminal(repoRoot: string, prompt: string): void {
  runInNewTerminal(
    "Claude",
    [`cd "${repoRoot}"`, `claude -p "${prompt.replace(/"/g, '\\"')}"`],
    {
      iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
      color: CLAUDE_ACTION_COLOR
    }
  );
}
