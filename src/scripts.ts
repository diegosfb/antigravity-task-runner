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

function readYamlStringField(filePath: string, fieldName: string): string | undefined {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith(`${fieldName}:`)) {
        const value = trimmed.slice(fieldName.length + 1).trim();
        if (value) return value;
      }
    }
  } catch { /* ignore */ }
  return undefined;
}

export async function downloadInfrastructureFileIfMissing(
  repoRoot: string,
  settingsFileName: string
): Promise<void> {
  const settingsPath = path.join(repoRoot, "config", settingsFileName);
  if (!fs.existsSync(settingsPath)) return;

  const infraRef = readYamlStringField(settingsPath, "Infrastructure");
  if (!infraRef) return;

  const localPath = path.join(repoRoot, infraRef);
  if (fs.existsSync(localPath)) return;

  // Strip leading "config/" — configFallbackBaseUrl already points to the config directory.
  const urlRelativePath = infraRef.replace(/^config\//, "");
  const url = getConfigFallbackUrl(urlRelativePath);

  const answer = await vscode.window.showWarningMessage(
    `Infrastructure file ${infraRef} is missing. Download from ${url}?`,
    "Yes",
    "No"
  );
  if (answer !== "Yes") return;

  try {
    await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
    await downloadFile(url, localPath);
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    const message = raw || "Request failed (unknown error)";
    void vscode.window.showErrorMessage(
      `Failed to download ${infraRef}: ${message}`,
      { modal: true },
      "OK"
    );
  }
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
    const raw = error instanceof Error ? error.message : String(error);
    const message = raw || "Request failed (unknown error)";
    void vscode.window.showErrorMessage(
      `Failed to download config/${fileName}: ${message}`,
      { modal: true },
      "OK"
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
        if (status === 404) {
          reject(new Error(`File not found at URL (404). Make sure it exists in your repo.`));
        } else {
          reject(new Error(`HTTP ${status}`));
        }
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
  repoRoot: string,
  scriptsDir?: string
): Promise<string | undefined> {
  const url = getScriptFallbackUrl(scriptFileName);
  const targetDir = scriptsDir ?? path.join(repoRoot, "workspace", "scripts");
  try {
    await fs.promises.mkdir(targetDir, { recursive: true });
    const destination = path.join(targetDir, scriptFileName);
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
  scriptFileName: string,
  scriptsDir?: string,
  fallbackDir?: string
): Promise<string | undefined> {
  const targetDir = scriptsDir ?? path.join(repoRoot, "workspace", "scripts");
  const scriptPath = path.join(targetDir, scriptFileName);
  if (fs.existsSync(scriptPath)) return scriptPath;
  if (fallbackDir) {
    const fallbackPath = path.join(fallbackDir, scriptFileName);
    if (fs.existsSync(fallbackPath)) return fallbackPath;
  }
  return await downloadScript(scriptFileName, repoRoot, targetDir);
}

export async function runRepoScript(
  scriptName: string,
  args: string[] = [],
  options: { cwd?: string; scriptDir?: string; fallbackScriptDir?: string } = {}
): Promise<void> {
  const rootPath = getRootPath();
  if (!rootPath) {
    void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
    await runInSecondaryTerminal([`echo "[antigravity] ERROR: rootPath not set or invalid"`]);
    return;
  }
  const repoRoot = getRepoRoot(rootPath);
  const workingDir = options.cwd || repoRoot;
  const scriptFileName = `${scriptName}.sh`;
  const scriptPath = await ensureScriptFile(repoRoot, scriptFileName, options.scriptDir, options.fallbackScriptDir);
  if (!scriptPath) {
    await runInSecondaryTerminal([
      `echo "[antigravity] ERROR: script not found: ${scriptFileName}"`,
      `echo "[antigravity] looked in: ${options.scriptDir ?? path.join(repoRoot, "workspace", "scripts")}"`
    ]);
    return;
  }
  const argString = args.map((arg) => quoteShellArg(arg)).join(" ");
  const command = argString
    ? `${quoteShellArg(scriptPath)} ${argString}`
    : quoteShellArg(scriptPath);
  await runInSecondaryTerminal([
    `echo "[antigravity] running: ${scriptFileName} ${argString}"`,
    `echo "[antigravity] cwd: ${workingDir}"`,
    `cd ${quoteShellArg(workingDir)}`,
    command
  ]);
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
