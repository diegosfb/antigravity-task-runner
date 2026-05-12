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

export function getWorkspaceProjectPath(repoRoot: string): string {
  const configured = vscode.workspace.getConfiguration("antigravity").get<string>("workspaceProjectPath") || "./";
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(repoRoot, configured);
}

export function getAntigravityHomePath(): string | undefined {
  const homePath = path.join(os.homedir(), ".gemini", "antigravity");
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

export { quoteShellArg, getExecutableName } from "./shellUtils";

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
  let content: string;
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

export function upsertEnvFileValue(filePath: string, key: string, value: string): void {
  const normalizedKey = key.trim();
  if (!normalizedKey) return;

  const lines = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8").split(/\r?\n/)
    : [];

  const nextLine = `${normalizedKey}=${value}`;
  let updated = false;

  const rewritten = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;

    const withoutExport = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length).trim()
      : trimmed;
    const eqIndex = withoutExport.indexOf("=");
    if (eqIndex <= 0) return line;

    const existingKey = withoutExport.slice(0, eqIndex).trim();
    if (existingKey !== normalizedKey) return line;

    updated = true;
    return nextLine;
  });

  if (!updated) {
    if (rewritten.length > 0 && rewritten[rewritten.length - 1] !== "") {
      rewritten.push("");
    }
    rewritten.push(nextLine);
  }

  fs.writeFileSync(filePath, `${rewritten.join("\n")}\n`, "utf8");
}

export function appendEnvComment(filePath: string, line: string): void {
  const trimmedLine = line.trim();
  if (!trimmedLine) return;
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const lines = existing.split(/\r?\n/);
  if (lines.some((l) => l.trim() === trimmedLine)) return;
  const separator = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  fs.writeFileSync(filePath, `${existing}${separator}${trimmedLine}\n`, "utf8");
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

export async function waitForFileExists(
  filePath: string,
  timeoutMs = 300000,
  intervalMs = 1000
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(filePath)) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return fs.existsSync(filePath);
}
