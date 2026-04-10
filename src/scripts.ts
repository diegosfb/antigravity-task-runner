import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { getRootPath, getRepoRoot, getWorkspaceRoot, quoteShellArg } from "./utils";
import { runInSecondaryTerminal } from "./terminal";

const SCRIPT_FALLBACK_BASE_URL = "https://raw.githubusercontent.com/diegosfb/antigravity-workspace";

function normalizeGithubRawUrl(url: string): string {
  if (url.includes("github.com/") && !url.includes("raw.githubusercontent.com")) {
    return url
      .replace("https://github.com/", "https://raw.githubusercontent.com/")
      .replace("/blob/", "/");
  }
  return url.replace(/\/+$/, "");
}

function buildScriptFallbackUrls(baseUrl: string, scriptFileName: string): string[] {
  const trimmed = normalizeGithubRawUrl(baseUrl);
  const urls: string[] = [];
  const add = (url: string) => {
    if (!urls.includes(url)) urls.push(url);
  };
  const hasScriptsSuffix = trimmed.endsWith("/scripts");
  const baseWithoutScripts = hasScriptsSuffix ? trimmed.slice(0, -"/scripts".length) : trimmed;
  const hasBranch = /\/(main|master)(\/|$)/.test(baseWithoutScripts);
  if (hasBranch) {
    const primaryBase = hasScriptsSuffix ? trimmed : `${baseWithoutScripts}/scripts`;
    add(`${primaryBase}/${scriptFileName}`);
    if (baseWithoutScripts.includes("/main/")) {
      const swapped = baseWithoutScripts.replace("/main/", "/master/");
      add(`${swapped}/scripts/${scriptFileName}`);
    } else if (baseWithoutScripts.includes("/master/")) {
      const swapped = baseWithoutScripts.replace("/master/", "/main/");
      add(`${swapped}/scripts/${scriptFileName}`);
    }
  } else {
    add(`${baseWithoutScripts}/main/scripts/${scriptFileName}`);
    add(`${baseWithoutScripts}/master/scripts/${scriptFileName}`);
  }
  return urls;
}

function getScriptFallbackUrls(scriptFileName: string): string[] {
  const config = vscode.workspace.getConfiguration("antigravity");
  const baseUrl = config.get<string>("scriptFallbackBaseUrl") || SCRIPT_FALLBACK_BASE_URL;
  return Array.from(new Set(buildScriptFallbackUrls(baseUrl, scriptFileName)));
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
  const urls = getScriptFallbackUrls(scriptFileName);
  let lastError: string | undefined;
  try {
    const scriptsDir = path.join(repoRoot, "scripts");
    await fs.promises.mkdir(scriptsDir, { recursive: true });
    const destination = path.join(scriptsDir, scriptFileName);
    for (const url of urls) {
      try {
        await downloadFile(url, destination);
        await fs.promises.chmod(destination, 0o755);
        return destination;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        lastError = `${url} (${message})`;
        try { await fs.promises.unlink(destination); } catch { /* ignore */ }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    lastError = message;
  }
  if (lastError) {
    void vscode.window.showErrorMessage(
      `Failed to download ${scriptFileName}. Last error: ${lastError}`
    );
  } else {
    void vscode.window.showErrorMessage(`Failed to download ${scriptFileName}.`);
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
