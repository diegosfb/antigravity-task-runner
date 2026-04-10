import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { getRootPath, getRepoRoot, getWorkspaceRoot, quoteShellArg } from "./utils";
import { runInSecondaryTerminal } from "./terminal";

const SCRIPT_FALLBACK_BASE_URL = "https://raw.githubusercontent.com/diegosfb/antigravity-workspace/main/scripts";
const CONFIG_FALLBACK_BASE_URL = "https://raw.githubusercontent.com/diegosfb/antigravity-workspace/main/config";

function buildScriptUrl(baseUrl: string, scriptFileName: string): string {
  // Convert github.com blob URLs to raw URLs.
  let url = baseUrl;
  if (url.includes("github.com/") && !url.includes("raw.githubusercontent.com")) {
    url = url
      .replace("https://github.com/", "https://raw.githubusercontent.com/")
      .replace("/blob/", "/");
  }
  url = url.replace(/\/+$/, "");
  // If the base URL already ends with /scripts, append filename directly.
  if (url.endsWith("/scripts")) {
    return `${url}/${scriptFileName}`;
  }
  return `${url}/scripts/${scriptFileName}`;
}

function getScriptFallbackUrl(scriptFileName: string): string {
  const config = vscode.workspace.getConfiguration("antigravity");
  const baseUrl = config.get<string>("scriptFallbackBaseUrl") || SCRIPT_FALLBACK_BASE_URL;
  return buildScriptUrl(baseUrl, scriptFileName);
}

function getConfigFallbackUrl(fileName: string): string {
  const config = vscode.workspace.getConfiguration("antigravity");
  let baseUrl = config.get<string>("configFallbackBaseUrl") || CONFIG_FALLBACK_BASE_URL;
  if (baseUrl.includes("github.com/") && !baseUrl.includes("raw.githubusercontent.com")) {
    baseUrl = baseUrl
      .replace("https://github.com/", "https://raw.githubusercontent.com/")
      .replace("/blob/", "/");
  }
  baseUrl = baseUrl.replace(/\/+$/, "");
  return `${baseUrl}/${fileName}`;
}

export async function downloadConfigFileIfMissing(
  repoRoot: string,
  fileName: string
): Promise<void> {
  const filePath = path.join(repoRoot, "config", fileName);
  if (fs.existsSync(filePath)) return;
  const url = getConfigFallbackUrl(fileName);
  const answer = await vscode.window.showWarningMessage(
    `Config file config/${fileName} is missing. Download from ${url}?`,
    "Yes",
    "No"
  );
  if (answer !== "Yes") return;
  try {
    await fs.promises.mkdir(path.join(repoRoot, "config"), { recursive: true });
    await downloadFile(url, filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    void vscode.window.showErrorMessage(
      `Failed to download config/${fileName} from ${url}: ${message}`
    );
  }
}

function downloadFile(url: string, destination: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (
        response.statusCode &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        response.resume();
        void downloadFile(response.headers.location, destination).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        const status = response.statusCode ?? "unknown";
        response.resume();
        reject(new Error(`Request failed with status ${status}`));
        return;
      }
      const fileStream = fs.createWriteStream(destination, { mode: 0o755 });
      response.pipe(fileStream);
      fileStream.on("finish", () => {
        fileStream.close((closeError) => {
          if (closeError) { reject(closeError); return; }
          resolve();
        });
      });
      fileStream.on("error", (error) => {
        fileStream.close(() => reject(error));
      });
    });
    request.on("error", (error) => { reject(error); });
  });
}

async function downloadScript(
  scriptFileName: string,
  repoRoot: string
): Promise<string | undefined> {
  const url = getScriptFallbackUrl(scriptFileName);
  try {
    const scriptsDir = path.join(repoRoot, "scripts");
    await fs.promises.mkdir(scriptsDir, { recursive: true });
    const destination = path.join(scriptsDir, scriptFileName);
    try {
      await downloadFile(url, destination);
      await fs.promises.chmod(destination, 0o755);
      return destination;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      try { await fs.promises.unlink(destination); } catch { /* ignore */ }
      void vscode.window.showErrorMessage(
        `Failed to download ${scriptFileName} from ${url}: ${message}`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    void vscode.window.showErrorMessage(`Failed to download ${scriptFileName}: ${message}`);
  }
  return undefined;
}

export async function ensureScriptFile(
  repoRoot: string,
  scriptFileName: string
): Promise<string | undefined> {
  const scriptPath = path.join(repoRoot, "scripts", scriptFileName);
  if (fs.existsSync(scriptPath)) return scriptPath;
  return await downloadScript(scriptFileName, repoRoot);
}

export async function runRepoScript(
  scriptName: string,
  args: string[] = [],
  options: { cwd?: string } = {}
): Promise<void> {
  const rootPath = getRootPath();
  if (!rootPath) {
    void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
    return;
  }
  const repoRoot = getRepoRoot(rootPath);
  const workingDir = options.cwd || repoRoot;
  const scriptFileName = `${scriptName}.sh`;
  const scriptPath = await ensureScriptFile(repoRoot, scriptFileName);
  if (!scriptPath) return;
  const argString = args.map((arg) => quoteShellArg(arg)).join(" ");
  const command = argString
    ? `${quoteShellArg(scriptPath)} ${argString}`
    : quoteShellArg(scriptPath);
  await runInSecondaryTerminal([`cd ${quoteShellArg(workingDir)}`, command]);
}

export async function openFile(filePath: string): Promise<void> {
  const uri = vscode.Uri.file(filePath);
  await vscode.window.showTextDocument(uri, { preview: false });
}

export async function runWorkflow(workflowFile: string): Promise<void> {
  const rootPath = getRootPath();
  if (!rootPath) {
    void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
    return;
  }
  const repoRoot = getRepoRoot(rootPath);
  const workspaceRoot = getWorkspaceRoot() || repoRoot;
  const workflowName = path.basename(workflowFile, ".md");
  const scriptPath = path.join(repoRoot, "scripts", `${workflowName}.sh`);
  if (fs.existsSync(scriptPath)) {
    await runInSecondaryTerminal([
      `cd "${workspaceRoot}"`,
      `./scripts/${path.basename(scriptPath)}`
    ]);
    return;
  }
  await openFile(workflowFile);
}

function getAntigravityExecutable(): string {
  return (
    vscode.workspace.getConfiguration("antigravity").get<string>("antigravityPath") ||
    "antigravity"
  );
}

function getAntigravityArgsTemplate(): string {
  return (
    vscode.workspace.getConfiguration("antigravity").get<string>("antigravityArgs") ||
    '--agent "{agent}"'
  );
}

function interpolateAgentArgs(template: string, agentName: string, agentFile: string): string {
  return template.replace(/\{agent\}/g, agentName).replace(/\{agentFile\}/g, agentFile);
}

export async function runAgent(agentName: string, agentFile: string): Promise<void> {
  const rootPath = getRootPath();
  if (!rootPath) {
    void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
    return;
  }
  const repoRoot = getRepoRoot(rootPath);
  const safeAgentName = agentName.replace(/"/g, '\\"');
  const safeAgentFile = agentFile.replace(/"/g, '\\"');
  const command = getAntigravityExecutable();
  const args = interpolateAgentArgs(
    getAntigravityArgsTemplate(),
    safeAgentName,
    safeAgentFile
  ).trim();
  await runInSecondaryTerminal([
    `cd "${repoRoot}"`,
    args ? `${command} ${args}` : command
  ]);
}
