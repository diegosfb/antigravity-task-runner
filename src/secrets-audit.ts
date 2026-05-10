import * as fs from "fs";
import * as path from "path";
import { execSync, spawnSync } from "child_process";
import * as vscode from "vscode";
import { appendEnvComment } from "./utils";

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
        // Multi-line environment block: scan forward for name: sub-key
        for (let j = i + 1; j < lines.length; j++) {
          const subLine = lines[j];
          if (!/^\s{6,}/.test(subLine)) break; // exited the block
          const nameMatch = subLine.match(/^\s+name:\s*["']?([^\s"'#]+)["']?/);
          if (nameMatch) {
            currentEnv = nameMatch[1];
            ensureEnv(result, currentEnv);
            break;
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
  const httpsMatch = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!httpsMatch) return null;
  return { owner: httpsMatch[1], repo: httpsMatch[2] };
}

export function runGh(args: string, cwd: string): string {
  return execSync(`gh ${args}`, { cwd, encoding: "utf8" }).trim();
}

export function spawnGh(args: string[], cwd: string): string {
  const result = spawnSync("gh", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.error?.message || result.stderr?.toString() || "gh command failed");
  return result.stdout.trim();
}

export function setGhSecret(name: string, value: string, env: string | null, cwd: string): void {
  const args = ["secret", "set", name];
  if (env) args.push("--env", env);
  const result = spawnSync("gh", args, { cwd, input: value, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.error?.message || result.stderr?.toString() || "gh secret set failed");
}

export function setGhVariable(name: string, value: string, env: string | null, cwd: string): void {
  const args = ["variable", "set", name, "--body", value];
  if (env) args.push("--env", env);
  const result = spawnSync("gh", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.error?.message || result.stderr?.toString() || "gh variable set failed");
}

export function getGitRemoteUrl(repoRoot: string): string {
  return execSync("git remote get-url origin", { cwd: repoRoot, encoding: "utf8" }).trim();
}

export function computeDelta(required: AuditMap, existing: AuditMap): AuditMap {
  const delta: AuditMap = {};
  for (const [env, req] of Object.entries(required)) {
    const ex = existing[env] ?? { secrets: [], variables: [] };
    delta[env] = {
      secrets: req.secrets.filter((s) => !ex.secrets.includes(s)),
      variables: req.variables.filter((v) => !ex.variables.includes(v)),
    };
  }
  return delta;
}

const KNOWN_HINTS: Array<[RegExp, string]> = [
  [/^DOCKERHUB_/i, "DockerHub — hub.docker.com > Account Settings > Security"],
  [/^AWS_ACCESS_KEY_ID$/i, "AWS IAM — Console > Users > Security credentials > Access keys"],
  [/^AWS_SECRET_ACCESS_KEY$/i, "AWS IAM — Console > Users > Security credentials > Access keys"],
  [/^AWS_ROLE_ARN$|^AWS_/i, "AWS IAM — Console > Roles or IAM Identity Center"],
  [/^GCP_SA_KEY$|^GOOGLE_CREDENTIALS$|^GCP_/i, "GCP — IAM & Admin > Service Accounts > Keys"],
  [/^AZURE_/i, "Azure — Portal > App registrations > Certificates & secrets"],
  [/^RENDER_/i, "Render — dashboard.render.com > Account Settings > API Keys"],
];

export function getSecretHint(name: string): string {
  for (const [pattern, hint] of KNOWN_HINTS) {
    if (pattern.test(name)) return hint;
  }
  return "";
}

export function buildEnvCommentLines(required: AuditMap): string[] {
  const lines: string[] = ["# === GitHub Secrets & Variables (auto-audited) ==="];
  for (const [env, { secrets, variables }] of Object.entries(required)) {
    for (const s of secrets) lines.push(`# GITHUB_SECRET[${env}]: ${s}`);
    for (const v of variables) lines.push(`# GITHUB_VARIABLE[${env}]: ${v}`);
  }
  return lines;
}

export function writeEnvDocumentation(envPath: string, required: AuditMap, appendEnvCommentFn: (f: string, l: string) => void): void {
  const lines = buildEnvCommentLines(required);
  for (const line of lines) {
    appendEnvCommentFn(envPath, line);
  }
}

export async function runSecretsAudit(repoRoot: string): Promise<void> {
  // Pre-flight checks
  try { runGh("--version", repoRoot); } catch {
    void vscode.window.showErrorMessage("gh CLI is required. Install from https://cli.github.com");
    return;
  }
  try { runGh("auth status", repoRoot); } catch {
    void vscode.window.showErrorMessage("Run `gh auth login` to authenticate with GitHub.");
    return;
  }

  let remoteUrl: string;
  try { remoteUrl = getGitRemoteUrl(repoRoot); } catch {
    void vscode.window.showErrorMessage("No git remote found. Is this a GitHub repository?");
    return;
  }

  const ownerRepo = parseGitHubOwnerRepo(remoteUrl);
  if (!ownerRepo) {
    void vscode.window.showErrorMessage("Remote origin is not a GitHub URL.");
    return;
  }

  // Load workflow files
  const workflowFiles = loadWorkflowFiles(repoRoot);
  if (workflowFiles.length === 0) {
    void vscode.window.showInformationMessage("No workflow files found in .github/workflows/");
    return;
  }

  // Scan for required secrets/variables
  const required = scanWorkflowFiles(workflowFiles);
  const totalRequired = Object.values(required).reduce((n, v) => n + v.secrets.length + v.variables.length, 0);
  if (totalRequired === 0) {
    void vscode.window.showInformationMessage("No secrets or variables referenced in workflows — nothing to audit.");
    return;
  }

  // Discover existing secrets/variables from GitHub
  const { owner, repo } = ownerRepo;
  const existing: AuditMap = {};

  let environments: string[] = [];
  try {
    const envResp = JSON.parse(runGh(`api repos/${owner}/${repo}/environments`, repoRoot)) as { environments?: { name: string }[] };
    environments = (envResp.environments ?? []).map((e) => e.name);
  } catch { /* no environments configured */ }

  for (const env of environments) {
    const secrets: string[] = [];
    const variables: string[] = [];
    try {
      const s = JSON.parse(spawnGh(["secret", "list", "--env", env, "--json", "name"], repoRoot)) as { name: string }[];
      secrets.push(...s.map((x) => x.name));
    } catch { /* env may have no secrets */ }
    try {
      const v = JSON.parse(spawnGh(["variable", "list", "--env", env, "--json", "name"], repoRoot)) as { name: string }[];
      variables.push(...v.map((x) => x.name));
    } catch { /* env may have no variables */ }
    existing[env] = { secrets, variables };
  }

  // Repo-level
  const repoSecrets: string[] = [];
  const repoVars: string[] = [];
  try {
    const s = JSON.parse(runGh("secret list --json name", repoRoot)) as { name: string }[];
    repoSecrets.push(...s.map((x) => x.name));
  } catch { /* ignore */ }
  try {
    const v = JSON.parse(runGh("variable list --json name", repoRoot)) as { name: string }[];
    repoVars.push(...v.map((x) => x.name));
  } catch { /* ignore */ }
  existing["_repo"] = { secrets: repoSecrets, variables: repoVars };

  // Compute delta
  const delta = computeDelta(required, existing);
  const missingItems = Object.entries(delta).flatMap(([env, { secrets, variables }]) => [
    ...secrets.map((s) => ({ env, name: s, type: "secret" as const })),
    ...variables.map((v) => ({ env, name: v, type: "variable" as const })),
  ]);

  // Write .env documentation regardless
  const envPath = path.join(repoRoot, ".env");
  writeEnvDocumentation(envPath, required, appendEnvComment);

  if (missingItems.length === 0) {
    void vscode.window.showInformationMessage("✅ All secrets and variables are configured.");
    return;
  }

  const envNames = [...new Set(missingItems.map((i) => i.env))].join(", ");
  const proceed = await vscode.window.showInformationMessage(
    `Found ${missingItems.length} missing item(s) across environments: ${envNames}. Proceed to set them?`,
    "Set them",
    "Skip (document only)"
  );
  if (!proceed || proceed === "Skip (document only)") return;

  // Collect values and create
  let setCount = 0;
  const skipped: string[] = [];

  for (const item of missingItems) {
    const hint = item.type === "secret" ? getSecretHint(item.name) : "";
    const prompt = `Enter value for ${item.type} "${item.name}" — ${item.env === "_repo" ? "repo-level" : `environment "${item.env}"`}`;
    const placeHolder = hint || undefined;

    const value = await vscode.window.showInputBox({
      prompt,
      placeHolder,
      password: item.type === "secret",
      ignoreFocusOut: true,
    });

    if (value === undefined || value === "") {
      skipped.push(`${item.name} / ${item.env}`);
      continue;
    }

    try {
      const envArg = item.env !== "_repo" ? item.env : null;
      if (item.type === "secret") {
        setGhSecret(item.name, value, envArg, repoRoot);
      } else {
        setGhVariable(item.name, value, envArg, repoRoot);
      }
      setCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      void vscode.window.showErrorMessage(`Failed to set ${item.type} "${item.name}": ${msg}`);
      skipped.push(`${item.name} / ${item.env}`);
    }
  }

  if (skipped.length > 0) {
    void vscode.window.showWarningMessage(
      `✅ Set ${setCount} of ${missingItems.length} items. Skipped: ${skipped.join(", ")}. Run again to retry.`
    );
  } else {
    void vscode.window.showInformationMessage("✅ All secrets and variables are configured.");
  }
}
