import * as vscode from "vscode";

let outputChannel: vscode.OutputChannel | undefined;

export function initLogger(channel: vscode.OutputChannel): void {
  outputChannel = channel;
}

export function log(message: string): void {
  const config = vscode.workspace.getConfiguration("antigravity");
  if (!config.get<boolean>("enableDebugLogging", false)) return;
  const timestamp = new Date().toISOString();
  outputChannel?.appendLine(`${timestamp} ${message}`);
}
