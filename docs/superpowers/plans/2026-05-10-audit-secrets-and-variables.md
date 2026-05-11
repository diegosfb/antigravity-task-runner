# Audit Secrets & Variables — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a right-click action on the "Setup Workspace" tree item that scans GitHub Actions workflows, identifies missing secrets/variables per GitHub Environment, prompts for values, creates them via `gh` CLI, and documents requirements in `.env`.

**Architecture:** A new `src/secrets-audit.ts` module contains all scanning, discovery, collection, and creation logic. The command is registered in `src/extension.ts` with a single call into `secrets-audit.ts`. The VS Code context menu entry is wired in `package.json`.

**Tech Stack:** TypeScript, VS Code API (`showInputBox`, `showInformationMessage`, `showErrorMessage`), Node.js `child_process.execSync` / `spawnSync`, `gh` CLI, Node.js `fs`, regex for YAML scanning.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/secrets-audit.ts` | **Create** | All audit logic: scanning, discovery, comparison, collection, creation, .env writing |
| `src/utils.ts` | **Modify** | Add `appendEnvComment(filePath, line)` helper |
| `src/extension.ts` | **Modify** | Register `antigravity.auditSecretsAndVariables` command |
| `package.json` | **Modify** | Declare command + add context menu entry |
| `tests/secretsAudit.test.js` | **Create** | Unit tests for all pure functions in secrets-audit.ts |

---

## Task 1: `appendEnvComment` utility in `utils.ts`

**Files:**
- Modify: `src/utils.ts` (after `upsertEnvFileValue`, line ~186)
- Test: `tests/secretsAudit.test.js`

- [ ] **Step 1: Create the test file**

```js
// tests/secretsAudit.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const Module = require("module");

const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === "vscode") return {};
  return originalRequire.apply(this, arguments);
};

const { appendEnvComment } = require("../out/utils.js");

test("appendEnvComment adds a new comment line", () => {
  const tmp = path.join(os.tmpdir(), `test-env-${Date.now()}`);
  appendEnvComment(tmp, "# GITHUB_SECRET[production]: DOCKERHUB_TOKEN");
  const content = fs.readFileSync(tmp, "utf8");
  assert.ok(content.includes("# GITHUB_SECRET[production]: DOCKERHUB_TOKEN"));
  fs.unlinkSync(tmp);
});

test("appendEnvComment does not duplicate an existing comment", () => {
  const tmp = path.join(os.tmpdir(), `test-env-${Date.now()}`);
  fs.writeFileSync(tmp, "# GITHUB_SECRET[production]: DOCKERHUB_TOKEN\n");
  appendEnvComment(tmp, "# GITHUB_SECRET[production]: DOCKERHUB_TOKEN");
  const content = fs.readFileSync(tmp, "utf8");
  const lines = content.split("\n").filter(Boolean);
  assert.strictEqual(lines.filter(l => l === "# GITHUB_SECRET[production]: DOCKERHUB_TOKEN").length, 1);
  fs.unlinkSync(tmp);
});

test("appendEnvComment creates the file if it does not exist", () => {
  const tmp = path.join(os.tmpdir(), `test-env-new-${Date.now()}`);
  appendEnvComment(tmp, "# GITHUB_SECRET[_repo]: ANTHROPIC_API_KEY");
  assert.ok(fs.existsSync(tmp));
  fs.unlinkSync(tmp);
});
```

- [ ] **Step 2: Run tests — expect FAIL (utils.js does not export `appendEnvComment`)**

```bash
cd /Users/diego.brihuega/Documents/Projects/antigravity-task-runner
npm run compile && node --test tests/secretsAudit.test.js
```

Expected: `TypeError: appendEnvComment is not a function`

- [ ] **Step 3: Add `appendEnvComment` to `src/utils.ts`**

Add after the closing brace of `upsertEnvFileValue` (around line 186):

```typescript
export function appendEnvComment(filePath: string, line: string): void {
  const trimmedLine = line.trim();
  if (!trimmedLine) return;
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const lines = existing.split(/\r?\n/);
  if (lines.some((l) => l.trim() === trimmedLine)) return;
  const separator = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  fs.writeFileSync(filePath, `${existing}${separator}${trimmedLine}\n`, "utf8");
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run compile && node --test tests/secretsAudit.test.js
```

Expected: All 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils.ts tests/secretsAudit.test.js
git commit -m "feat: add appendEnvComment utility and tests"
```

---

## Task 2: Workflow scanning — pure functions

**Files:**
- Create: `src/secrets-audit.ts`
- Test: `tests/secretsAudit.test.js`

- [ ] **Step 1: Add scanning tests**

Append to `tests/secretsAudit.test.js`:

```js
const { scanWorkflowFiles, GITHUB_BUILTIN_SECRETS } = require("../out/secrets-audit.js");

test("scanWorkflowFiles extracts secrets from workflow content", () => {
  const content = `
jobs:
  deploy:
    environment: production
    steps:
      - run: echo \${{ secrets.DOCKERHUB_TOKEN }}
      - run: echo \${{ vars.APP_URL }}
`;
  const result = scanWorkflowFiles([{ name: "deploy.yml", content }]);
  assert.deepEqual(result["production"].secrets, ["DOCKERHUB_TOKEN"]);
  assert.deepEqual(result["production"].variables, ["APP_URL"]);
});

test("scanWorkflowFiles tags secrets with no environment as _repo", () => {
  const content = `
jobs:
  build:
    steps:
      - run: echo \${{ secrets.ANTHROPIC_API_KEY }}
`;
  const result = scanWorkflowFiles([{ name: "build.yml", content }]);
  assert.ok(result["_repo"].secrets.includes("ANTHROPIC_API_KEY"));
});

test("scanWorkflowFiles skips GITHUB_TOKEN", () => {
  const content = `
jobs:
  build:
    steps:
      - run: echo \${{ secrets.GITHUB_TOKEN }}
`;
  const result = scanWorkflowFiles([{ name: "build.yml", content }]);
  const allSecrets = Object.values(result).flatMap(v => v.secrets);
  assert.ok(!allSecrets.includes("GITHUB_TOKEN"));
});

test("scanWorkflowFiles deduplicates across multiple files", () => {
  const fileA = { name: "a.yml", content: "jobs:\n  deploy:\n    environment: production\n    steps:\n      - run: echo ${{ secrets.DOCKERHUB_TOKEN }}\n" };
  const fileB = { name: "b.yml", content: "jobs:\n  deploy:\n    environment: production\n    steps:\n      - run: echo ${{ secrets.DOCKERHUB_TOKEN }}\n" };
  const result = scanWorkflowFiles([fileA, fileB]);
  assert.strictEqual(result["production"].secrets.filter(s => s === "DOCKERHUB_TOKEN").length, 1);
});
```

- [ ] **Step 2: Run tests — expect FAIL (module does not exist yet)**

```bash
npm run compile 2>&1; node --test tests/secretsAudit.test.js 2>&1 | head -20
```

Expected: compile errors or `Cannot find module '../out/secrets-audit.js'`

- [ ] **Step 3: Create `src/secrets-audit.ts` with scanning logic**

```typescript
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
```

- [ ] **Step 4: Run tests — expect PASS for all scanning tests**

```bash
npm run compile && node --test tests/secretsAudit.test.js
```

Expected: All scanning tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/secrets-audit.ts tests/secretsAudit.test.js
git commit -m "feat: add workflow scanning logic for secrets and variables"
```

---

## Task 3: GitHub discovery — repo identity + environment list

**Files:**
- Modify: `src/secrets-audit.ts`
- Test: `tests/secretsAudit.test.js`

- [ ] **Step 1: Add tests for `parseGitHubOwnerRepo`**

Append to `tests/secretsAudit.test.js`:

```js
const { parseGitHubOwnerRepo } = require("../out/secrets-audit.js");

test("parseGitHubOwnerRepo handles HTTPS remote", () => {
  const result = parseGitHubOwnerRepo("https://github.com/myorg/myrepo.git");
  assert.deepEqual(result, { owner: "myorg", repo: "myrepo" });
});

test("parseGitHubOwnerRepo handles SSH remote", () => {
  const result = parseGitHubOwnerRepo("git@github.com:myorg/myrepo.git");
  assert.deepEqual(result, { owner: "myorg", repo: "myrepo" });
});

test("parseGitHubOwnerRepo returns null for non-GitHub remote", () => {
  const result = parseGitHubOwnerRepo("https://gitlab.com/myorg/myrepo.git");
  assert.strictEqual(result, null);
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run compile && node --test tests/secretsAudit.test.js 2>&1 | grep -E "FAIL|TypeError"
```

Expected: `TypeError: parseGitHubOwnerRepo is not a function`

- [ ] **Step 3: Add `parseGitHubOwnerRepo` and `runGh` to `src/secrets-audit.ts`**

Add `import { execSync, spawnSync } from "child_process";` to the imports at the top of the file (alongside the existing `fs` and `path` imports). Then add these functions after `loadWorkflowFiles`:

```typescript

export function parseGitHubOwnerRepo(remoteUrl: string): { owner: string; repo: string } | null {
  const httpsMatch = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(\.git)?$/);
  if (!httpsMatch) return null;
  return { owner: httpsMatch[1], repo: httpsMatch[2] };
}

export function runGh(args: string, cwd: string): string {
  return execSync(`gh ${args}`, { cwd, encoding: "utf8" }).trim();
}

// spawnSync-based set operations avoid shell injection when values contain special characters
// (add `spawnSync` to the existing child_process import at the top of the file)
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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run compile && node --test tests/secretsAudit.test.js
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/secrets-audit.ts tests/secretsAudit.test.js
git commit -m "feat: add GitHub remote parsing and gh CLI runner"
```

---

## Task 4: Delta computation — missing secrets/variables per environment

**Files:**
- Modify: `src/secrets-audit.ts`
- Test: `tests/secretsAudit.test.js`

- [ ] **Step 1: Add delta tests**

Append to `tests/secretsAudit.test.js`:

```js
const { computeDelta } = require("../out/secrets-audit.js");

test("computeDelta returns items in required but not in existing", () => {
  const required = {
    production: { secrets: ["DOCKERHUB_TOKEN", "AWS_KEY"], variables: ["APP_URL"] },
  };
  const existing = {
    production: { secrets: ["DOCKERHUB_TOKEN"], variables: [] },
  };
  const delta = computeDelta(required, existing);
  assert.deepEqual(delta["production"].secrets, ["AWS_KEY"]);
  assert.deepEqual(delta["production"].variables, ["APP_URL"]);
});

test("computeDelta returns empty when all required exist", () => {
  const required = { _repo: { secrets: ["ANTHROPIC_API_KEY"], variables: [] } };
  const existing = { _repo: { secrets: ["ANTHROPIC_API_KEY"], variables: [] } };
  const delta = computeDelta(required, existing);
  assert.deepEqual(delta["_repo"].secrets, []);
  assert.deepEqual(delta["_repo"].variables, []);
});

test("computeDelta handles environment in required but not in existing", () => {
  const required = { staging: { secrets: ["MY_SECRET"], variables: [] } };
  const existing = {};
  const delta = computeDelta(required, existing);
  assert.deepEqual(delta["staging"].secrets, ["MY_SECRET"]);
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run compile && node --test tests/secretsAudit.test.js 2>&1 | grep -E "FAIL|TypeError"
```

Expected: `TypeError: computeDelta is not a function`

- [ ] **Step 3: Add `computeDelta` to `src/secrets-audit.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run compile && node --test tests/secretsAudit.test.js
```

Expected: All delta tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/secrets-audit.ts tests/secretsAudit.test.js
git commit -m "feat: add delta computation for missing secrets and variables"
```

---

## Task 5: Known-name hints table

**Files:**
- Modify: `src/secrets-audit.ts`
- Test: `tests/secretsAudit.test.js`

- [ ] **Step 1: Add hint tests**

Append to `tests/secretsAudit.test.js`:

```js
const { getSecretHint } = require("../out/secrets-audit.js");

test("getSecretHint returns hint for DOCKERHUB_TOKEN", () => {
  const hint = getSecretHint("DOCKERHUB_TOKEN");
  assert.ok(hint.includes("hub.docker.com"));
});

test("getSecretHint returns hint for AWS_ACCESS_KEY_ID", () => {
  const hint = getSecretHint("AWS_ACCESS_KEY_ID");
  assert.ok(hint.includes("IAM"));
});

test("getSecretHint returns empty string for unknown name", () => {
  const hint = getSecretHint("MY_CUSTOM_SECRET");
  assert.strictEqual(hint, "");
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run compile && node --test tests/secretsAudit.test.js 2>&1 | grep -E "FAIL|TypeError"
```

Expected: `TypeError: getSecretHint is not a function`

- [ ] **Step 3: Add `getSecretHint` to `src/secrets-audit.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run compile && node --test tests/secretsAudit.test.js
```

Expected: All hint tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/secrets-audit.ts tests/secretsAudit.test.js
git commit -m "feat: add known-name hints for common cloud service secrets"
```

---

## Task 6: `.env` documentation writer

**Files:**
- Modify: `src/secrets-audit.ts`
- Test: `tests/secretsAudit.test.js`

- [ ] **Step 1: Add `.env` documentation tests**

Append to `tests/secretsAudit.test.js`:

```js
const { buildEnvCommentLines } = require("../out/secrets-audit.js");

test("buildEnvCommentLines produces correct comment lines for secrets and variables", () => {
  const required = {
    production: { secrets: ["DOCKERHUB_TOKEN"], variables: ["APP_URL"] },
    _repo: { secrets: ["ANTHROPIC_API_KEY"], variables: [] },
  };
  const lines = buildEnvCommentLines(required);
  assert.ok(lines.includes("# GITHUB_SECRET[production]: DOCKERHUB_TOKEN"));
  assert.ok(lines.includes("# GITHUB_VARIABLE[production]: APP_URL"));
  assert.ok(lines.includes("# GITHUB_SECRET[_repo]: ANTHROPIC_API_KEY"));
});

test("buildEnvCommentLines includes the section header", () => {
  const lines = buildEnvCommentLines({ _repo: { secrets: ["MY_KEY"], variables: [] } });
  assert.ok(lines.includes("# === GitHub Secrets & Variables (auto-audited) ==="));
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run compile && node --test tests/secretsAudit.test.js 2>&1 | grep -E "FAIL|TypeError"
```

Expected: `TypeError: buildEnvCommentLines is not a function`

- [ ] **Step 3: Add `buildEnvCommentLines` and `writeEnvDocumentation` to `src/secrets-audit.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run compile && node --test tests/secretsAudit.test.js
```

Expected: All documentation tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/secrets-audit.ts tests/secretsAudit.test.js
git commit -m "feat: add .env documentation writer for audited secrets"
```

---

## Task 7: `runSecretsAudit` — orchestrator function

**Files:**
- Modify: `src/secrets-audit.ts`

This function is called from `extension.ts`. It uses the VS Code API so it is not unit-tested — it is the integration layer.

- [ ] **Step 1: Add `runSecretsAudit` to `src/secrets-audit.ts`**

Add these imports at the top of `src/secrets-audit.ts` (after existing imports):

```typescript
import * as vscode from "vscode";
import { appendEnvComment } from "./utils";
```

Then add at the bottom of the file:

```typescript
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
      const s = JSON.parse(runGh(`secret list --env "${env}" --json name`, repoRoot)) as { name: string }[];
      secrets.push(...s.map((x) => x.name));
    } catch { /* env may have no secrets */ }
    try {
      const v = JSON.parse(runGh(`variable list --env "${env}" --json name`, repoRoot)) as { name: string }[];
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

    if (value === undefined) {
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
```

- [ ] **Step 2: Compile to verify no TypeScript errors**

```bash
npm run compile 2>&1
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/secrets-audit.ts
git commit -m "feat: add runSecretsAudit orchestrator with VS Code UI"
```

---

## Task 8: Register command in `extension.ts`

**Files:**
- Modify: `src/extension.ts`

- [ ] **Step 1: Add import at the top of `src/extension.ts`**

Find the block of imports (around line 20–45). Add:

```typescript
import { runSecretsAudit } from "./secrets-audit";
```

- [ ] **Step 2: Register the command**

Find `vscode.commands.registerCommand("antigravity.updateWorkspaceAgentsMd"` (line ~3298). Add a new registration block immediately after its closing `)`  and before the next `context.subscriptions.push`:

```typescript
  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.auditSecretsAndVariables", async () => {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        void vscode.window.showErrorMessage("No workspace folder is open.");
        return;
      }
      await runSecretsAudit(workspaceRoot);
    })
  );
```

- [ ] **Step 3: Compile**

```bash
npm run compile 2>&1
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/extension.ts
git commit -m "feat: register auditSecretsAndVariables command"
```

---

## Task 9: Wire command into `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add to `activationEvents`**

Find the `activationEvents` array (line ~19). Add before the closing `]`:

```json
"onCommand:antigravity.auditSecretsAndVariables"
```

- [ ] **Step 2: Add to `contributes.commands`**

Find the `contributes.commands` array (line ~50). Add after the `antigravity.updateWorkspaceAgentsMd` entry:

```json
{
  "command": "antigravity.auditSecretsAndVariables",
  "title": "Audit Secrets & Variables",
  "icon": "$(shield-lock)"
}
```

- [ ] **Step 3: Add to `view/item/context` menu**

Find the existing `updateWorkspaceAgentsMd` context menu entry (line ~350):

```json
{
  "command": "antigravity.updateWorkspaceAgentsMd",
  "when": "view == antigravityView && viewItem == antigravitySetupWorkspaceAction",
  "group": "navigation@1"
}
```

Add immediately after it:

```json
,
{
  "command": "antigravity.auditSecretsAndVariables",
  "when": "view == antigravityView && viewItem == antigravitySetupWorkspaceAction",
  "group": "navigation@2"
}
```

- [ ] **Step 4: Compile and run all tests**

```bash
npm run compile && node --test tests/*.test.js
```

Expected: All tests pass, no compile errors.

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "feat: add Audit Secrets & Variables to Setup Workspace right-click menu"
```

---

## Task 10: Manual smoke test

- [ ] **Step 1: Open the extension in VS Code Extension Development Host**

Press `F5` in VS Code (or run `code --extensionDevelopmentPath=.` from the repo root). This opens a new VS Code window with the extension loaded.

- [ ] **Step 2: Open a project that has `.github/workflows/` files**

In the Extension Development Host window, open a workspace that contains GitHub Actions workflow files referencing `${{ secrets.X }}`.

- [ ] **Step 3: Right-click "Setup Workspace" in the Antigravity sidebar**

The context menu should show **"Audit Secrets & Variables"** as an option.

- [ ] **Step 4: Trigger the action — pre-flight**

If `gh` is not installed or not authenticated, verify the appropriate error message appears and the command exits cleanly.

- [ ] **Step 5: Trigger the action — happy path**

With `gh` installed and authenticated:
- Verify the opening summary message lists missing items correctly
- Verify `showInputBox` appears with `password: true` for secrets (text is masked)
- Verify `showInputBox` appears with `password: false` for variables (text is visible)
- Verify the hint text appears for known names (e.g., DOCKERHUB_TOKEN)
- Verify the closing summary correctly reports how many were set vs skipped

- [ ] **Step 6: Verify `.env` documentation**

Open the workspace `.env` file and verify lines like:
```
# === GitHub Secrets & Variables (auto-audited) ===
# GITHUB_SECRET[production]: DOCKERHUB_TOKEN
```
are present. Run the audit again — verify lines are not duplicated.

- [ ] **Step 7: Final commit (if any minor fixes from smoke test)**

```bash
git add -p
git commit -m "fix: smoke test corrections for audit secrets command"
```
