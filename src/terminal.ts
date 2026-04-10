import * as vscode from "vscode";

export const CLAUDE_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiYellow");

const SECONDARY_TERMINAL_COMMANDS = {
  create: "secondaryTerminal.createTerminal",
  focus: "secondaryTerminal.focusTerminal",
  send: "secondaryTerminal.sendToTerminal"
};

async function hasSecondaryTerminal(): Promise<boolean> {
  const commands = await vscode.commands.getCommands(true);
  return (
    commands.includes(SECONDARY_TERMINAL_COMMANDS.create) &&
    commands.includes(SECONDARY_TERMINAL_COMMANDS.send)
  );
}

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
  const available = await hasSecondaryTerminal();
  if (!available) {
    const terminal = getOrCreateTerminal(getTerminalName());
    terminal.show();
    for (const line of lines) {
      terminal.sendText(line, true);
    }
    void vscode.window.showWarningMessage(
      "Secondary Terminal extension not available. Ran the task in the default terminal instead."
    );
    return true;
  }
  try {
    await vscode.commands.executeCommand(SECONDARY_TERMINAL_COMMANDS.create);
    await vscode.commands.executeCommand(SECONDARY_TERMINAL_COMMANDS.focus);
    for (const line of lines) {
      await vscode.commands.executeCommand(SECONDARY_TERMINAL_COMMANDS.send, line);
    }
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    void vscode.window.showErrorMessage(
      `Failed to send commands to Secondary Terminal: ${message}`
    );
    return false;
  }
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
