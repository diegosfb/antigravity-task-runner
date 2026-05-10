import * as fs from "fs";
import * as path from "path";
import { execSync, spawnSync } from "child_process";

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

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect new job boundary (2-space indent + identifier + colon, nothing else)
      if (/^  [\w-]+:\s*$/.test(line)) {
        currentEnv = "_repo";
      }

      // Detect job-level environment declaration (exactly 4 spaces indent)
      const envInlineMatch = line.match(/^    environment:\s*["']?([^\s"'#]+)["']?/);
      if (envInlineMatch) {
        currentEnv = envInlineMatch[1];
        ensureEnv(result, currentEnv);
      } else if (/^    environment:\s*$/.test(line)) {
        // Multi-line environment block: look for name: on next line
        const nextLine = lines[i + 1];
        if (nextLine) {
          const nameMatch = nextLine.match(/^\s+name:\s*["']?([^\s"'#]+)["']?/);
          if (nameMatch) {
            currentEnv = nameMatch[1];
            ensureEnv(result, currentEnv);
          }
        }
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

export function parseGitHubOwnerRepo(remoteUrl: string): { owner: string; repo: string } | null {
  const httpsMatch = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(\.git)?$/);
  if (!httpsMatch) return null;
  return { owner: httpsMatch[1], repo: httpsMatch[2] };
}

export function runGh(args: string, cwd: string): string {
  return execSync(`gh ${args}`, { cwd, encoding: "utf8" }).trim();
}

export function setGhSecret(name: string, value: string, env: string | null, cwd: string): void {
  const args = ["secret", "set", name];
  if (env) args.push("--env", env);
  const result = spawnSync("gh", args, { cwd, input: value, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr?.toString() || "gh secret set failed");
}

export function setGhVariable(name: string, value: string, env: string | null, cwd: string): void {
  const args = ["variable", "set", name, "--body", value];
  if (env) args.push("--env", env);
  const result = spawnSync("gh", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr?.toString() || "gh variable set failed");
}

export function getGitRemoteUrl(repoRoot: string): string {
  return execSync("git remote get-url origin", { cwd: repoRoot, encoding: "utf8" }).trim();
}
