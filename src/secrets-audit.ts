import * as fs from "fs";
import * as path from "path";

export type AuditMap = Record<string, { secrets: string[]; variables: string[] }>;

export interface WorkflowFile {
  name: string;
  content: string;
}

export const GITHUB_BUILTIN_SECRETS = new Set([
  "GITHUB_TOKEN", "GITHUB_SHA", "GITHUB_REF", "GITHUB_ACTOR",
  "GITHUB_REPOSITORY", "GITHUB_EVENT_NAME", "GITHUB_WORKSPACE",
  "GITHUB_RUN_ID", "GITHUB_RUN_NUMBER", "GITHUB_HEAD_REF", "GITHUB_BASE_REF",
]);

function ensureEnv(map: AuditMap, env: string): void {
  if (!map[env]) map[env] = { secrets: [], variables: [] };
}

function addUnique(arr: string[], value: string): void {
  if (!arr.includes(value)) arr.push(value);
}

export function scanWorkflowFiles(files: WorkflowFile[]): AuditMap {
  const result: AuditMap = {};

  for (const file of files) {
    const lines = file.content.split(/\r?\n/);
    let currentEnv = "_repo";

    for (const line of lines) {
      const envMatch = line.match(/^\s+environment:\s*["']?(\S+?)["']?\s*$/);
      if (envMatch) {
        currentEnv = envMatch[1];
        ensureEnv(result, currentEnv);
      }

      const secretMatches = line.matchAll(/\$\{\{\s*secrets\.([A-Z0-9_]+)\s*\}\}/gi);
      for (const m of secretMatches) {
        const name = m[1].toUpperCase();
        if (GITHUB_BUILTIN_SECRETS.has(name)) continue;
        ensureEnv(result, currentEnv);
        addUnique(result[currentEnv].secrets, name);
      }

      const varMatches = line.matchAll(/\$\{\{\s*vars\.([A-Z0-9_]+)\s*\}\}/gi);
      for (const m of varMatches) {
        const name = m[1].toUpperCase();
        ensureEnv(result, currentEnv);
        addUnique(result[currentEnv].variables, name);
      }
    }
  }

  return result;
}

export function loadWorkflowFiles(repoRoot: string): WorkflowFile[] {
  const dir = path.join(repoRoot, ".github", "workflows");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .map((f) => ({
      name: f,
      content: fs.readFileSync(path.join(dir, f), "utf8"),
    }));
}
