import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as http from "http";
import * as https from "https";

export function getRootPath(): string | undefined {
  const rootPath = vscode.workspace.getConfiguration("antigravity").get<string>("rootPath");
  if (rootPath && fs.existsSync(rootPath)) return rootPath;
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) return undefined;
  const antigravityRoot = path.join(workspaceRoot, ".agent", "antigravity");
  if (fs.existsSync(antigravityRoot)) return antigravityRoot;
  if (fs.existsSync(workspaceRoot)) return workspaceRoot;
  return undefined;
}

export function getRepoRoot(rootPath: string): string {
  const normalized = path.resolve(rootPath);
  const parts = normalized.split(path.sep);
  if (
    parts.length >= 2 &&
    parts[parts.length - 2] === ".agent" &&
    parts[parts.length - 1] === "antigravity"
  ) {
    return path.resolve(normalized, "..", "..");
  }
  return normalized;
}

export function getWorkspaceRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return undefined;
  return folders[0].uri.fsPath;
}

export function getAntigravityHomePath(): string | undefined {
  const homePath = path.join(os.homedir(), ".antigravity");
  if (!fs.existsSync(homePath)) return undefined;
  return homePath;
}

export async function safeReadDir(dirPath: string): Promise<fs.Dirent[]> {
  try {
    return await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

export function quoteShellArg(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

const SKIP_DIRS = new Set(["node_modules", ".git"]);

export function findNestedGitFolders(rootDir: string): string[] {
  const results: string[] = [];
  const stack: string[] = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.name === ".git" && current !== rootDir) {
        results.push(fullPath);
        // don't descend into nested repos
      } else if (!SKIP_DIRS.has(entry.name)) {
        stack.push(fullPath);
      }
    }
  }
  return results;
}

export async function listInfrastructureYamlFiles(repoRoot: string): Promise<string[]> {
  const infraRoot = path.join(repoRoot, "config", "Infrastructure");
  if (!fs.existsSync(infraRoot)) return [];
  const results: string[] = [];
  const stack: string[] = [infraRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === ".yaml" || ext === ".yml") {
        results.push(fullPath);
      }
    }
  }
  return results.sort((a, b) => a.localeCompare(b));
}

export function parseEnvFile(filePath: string): Record<string, string> {
  const values: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return values;
  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return values;
  }
  for (const rawLine of content.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) {
      line = line.slice("export ".length).trim();
    }
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) values[key.toLowerCase()] = value;
  }
  return values;
}

export async function waitForUrlReady(
  url: string,
  timeoutMs = 30000,
  intervalMs = 1000
): Promise<boolean> {
  const client = url.startsWith("https") ? https : http;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await new Promise<boolean>((resolve) => {
      const req = client.get(url, (res) => {
        res.resume();
        resolve((res.statusCode ?? 0) < 500);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(intervalMs, () => {
        req.destroy();
        resolve(false);
      });
    });
    if (ready) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
