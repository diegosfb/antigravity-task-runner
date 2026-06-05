import * as vscode from "vscode";
import { spawn } from "child_process";
import { logAlways } from "./logger";
import { getAgenticHarnessExecutionCommand, getLightAgenticHarnessExecutionCommand } from "./settings";
import { buildAgenticHarnessPromptCommandForCommand, buildAgenticHarnessFileCommandForCommand, type AgenticHarnessPromptMode } from "./agenticHarnessCommand";
import { quoteShellArg } from "./utils";

export const CLAUDE_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiYellow");

type ExternalTerminalLaunchSpec = {
  args: string[];
  command: string;
  cwd: string;
};

function getOrCreateTerminal(name: string, options: Omit<vscode.TerminalOptions, "name"> = {}): vscode.Terminal {
  const existing = vscode.window.terminals.find((t) => t.name === name);
  if (existing) return existing;
  return vscode.window.createTerminal({ name, ...options });
}

export function getAgentTerminalName(): string {
  return (
    vscode.workspace.getConfiguration("antigravity").get<string>("agentTerminalName") ||
    "Antigravity Agent"
  );
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

function quoteAppleScriptString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function buildExternalTerminalLaunchSpecs(
  repoRoot: string,
  command: string,
  platform = process.platform
): ExternalTerminalLaunchSpec[] {
  if (platform === "darwin") {
    const commandLine = `cd ${quoteShellArg(repoRoot)} && ${command}`;
    return [
      {
        command: "osascript",
        args: [
          "-e",
          'tell application "Terminal" to activate',
          "-e",
          `tell application "Terminal" to do script ${quoteAppleScriptString(commandLine)}`
        ],
        cwd: repoRoot
      }
    ];
  }

  if (platform === "win32") {
    const commandLine = `cd /d "${repoRoot.replace(/"/g, '""')}" && ${command}`;
    return [
      {
        command: "cmd.exe",
        args: ["/c", "start", "\"Claude Terminal\"", "cmd.exe", "/k", commandLine],
        cwd: repoRoot
      }
    ];
  }

  const shellCommand = `cd ${quoteShellArg(repoRoot)} && ${command}`;
  return [
    {
      command: "x-terminal-emulator",
      args: ["-e", "bash", "-lc", shellCommand],
      cwd: repoRoot
    },
    {
      command: "gnome-terminal",
      args: ["--", "bash", "-lc", shellCommand],
      cwd: repoRoot
    },
    {
      command: "konsole",
      args: ["-e", "bash", "-lc", shellCommand],
      cwd: repoRoot
    },
    {
      command: "xterm",
      args: ["-e", "bash", "-lc", shellCommand],
      cwd: repoRoot
    }
  ];
}

export async function openCommandInExternalTerminal(repoRoot: string, command: string): Promise<void> {
  const launchSpecs = buildExternalTerminalLaunchSpecs(repoRoot, command);
  const errors: string[] = [];

  for (const spec of launchSpecs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(spec.command, spec.args, {
          cwd: spec.cwd,
          detached: true,
          shell: false,
          stdio: "ignore"
        });

        child.once("error", reject);
        child.once("spawn", () => {
          child.unref();
          resolve();
        });
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${spec.command}: ${message}`);
    }
  }

  throw new Error(`Unable to launch an external terminal. ${errors.join("; ")}`);
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
  const commands = [
    `cd ${quoteShellArg(repoRoot)}`,
    buildAgenticHarnessPromptCommandForCommand("codex", repoRoot, prompt, "unattended")
  ];
  runInPersistentTerminal(getAgentTerminalName(), commands, {
    iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
    color: CLAUDE_ACTION_COLOR
  });
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
