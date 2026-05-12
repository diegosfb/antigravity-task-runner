import * as vscode from "vscode";
import { logAlways } from "./logger";
import { getAgenticHarnessExecutionCommand, getLightAgenticHarnessExecutionCommand } from "./settings";
import { buildAgenticHarnessPromptCommandForCommand, buildAgenticHarnessFileCommandForCommand, type AgenticHarnessPromptMode } from "./agenticHarnessCommand";
import { quoteShellArg } from "./utils";

export const CLAUDE_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiYellow");

function getOrCreateTerminal(name: string, options: Omit<vscode.TerminalOptions, "name"> = {}): vscode.Terminal {
  const existing = vscode.window.terminals.find((t) => t.name === name);
  if (existing) return existing;
  return vscode.window.createTerminal({ name, ...options });
}

export function getAgentTerminalName(): string {
  return "Antigravity Agent";
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

export function runInPersistentTerminal(
  name: string,
  lines: string[],
  options: Omit<vscode.TerminalOptions, "name"> = {}
): void {
  const terminal = getOrCreateTerminal(name, options);
  terminal.show();
  for (const line of lines) {
    terminal.sendText(line, true);
  }
}

export async function runCommandInTaskTerminal(
  name: string,
  commandLine: string,
  options: {
    cwd?: string;
    env?: Record<string, string>;
  } = {}
): Promise<vscode.TaskExecution> {
  const scope = options.cwd
    ? vscode.workspace.getWorkspaceFolder(vscode.Uri.file(options.cwd)) ?? vscode.TaskScope.Workspace
    : vscode.TaskScope.Workspace;
  const task = new vscode.Task(
    { type: "shell", task: name },
    scope,
    name,
    "Antigravity",
    new vscode.ShellExecution(commandLine, {
      cwd: options.cwd,
      env: options.env
    })
  );
  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.Shared,
    focus: true,
    clear: false,
    showReuseMessage: false
  };
  return vscode.tasks.executeTask(task);
}

export function buildAgenticHarnessPromptCommand(
  repoRoot: string,
  prompt: string,
  mode: AgenticHarnessPromptMode = "unattended"
): string {
  const command = getAgenticHarnessExecutionCommand();
  const runString = buildAgenticHarnessPromptCommandForCommand(
    command,
    repoRoot,
    prompt,
    mode
  );
  logAlways(`[agenticHarness] runString: ${runString}`);
  return runString;
}

export function buildAgenticHarnessFileCommand(
  repoRoot: string,
  promptFilePath: string,
  mode: AgenticHarnessPromptMode = "unattended"
): string {
  const command = getAgenticHarnessExecutionCommand();
  const runString = buildAgenticHarnessFileCommandForCommand(
    command,
    repoRoot,
    promptFilePath,
    mode
  );
  logAlways(`[agenticHarness] runString (file): ${runString}`);
  return runString;
}

export function buildLightAgenticHarnessPromptCommand(
  repoRoot: string,
  prompt: string,
  mode: AgenticHarnessPromptMode = "unattended"
): string {
  const command = getLightAgenticHarnessExecutionCommand();
  const runString = buildAgenticHarnessPromptCommandForCommand(
    command,
    repoRoot,
    prompt,
    mode
  );
  logAlways(`[lightAgenticHarness] runString: ${runString}`);
  return runString;
}

export async function runClaudeInitAndUpdateInPersistentTerminal(
  repoRoot: string,
  prompt: string
): Promise<void> {
  const commands = [
    `cd ${quoteShellArg(repoRoot)}`,
    buildAgenticHarnessPromptCommand(repoRoot, prompt, "unattended")
  ];
  runInPersistentTerminal(getAgentTerminalName(), commands, {
    iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
    color: CLAUDE_ACTION_COLOR
  });
}

export async function runCodexInitAndUpdateInPersistentTerminal(
  repoRoot: string,
  prompt: string
): Promise<void> {
  const trustOverride = `projects.${JSON.stringify(repoRoot)}.trust_level="trusted"`;
  runInPersistentTerminal(
    getAgentTerminalName(),
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

export function runClaudePromptInPersistentTerminal(repoRoot: string, prompt: string): void {
  runInPersistentTerminal(
    getAgentTerminalName(),
    [`cd ${quoteShellArg(repoRoot)}`, buildAgenticHarnessPromptCommand(repoRoot, prompt, "prompt")],
    {
      iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
      color: CLAUDE_ACTION_COLOR
    }
  );
}
