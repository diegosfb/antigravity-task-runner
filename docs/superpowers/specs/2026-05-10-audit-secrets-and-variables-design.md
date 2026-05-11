# Audit Secrets & Variables — Design Spec

**Date:** 2026-05-10  
**Status:** Approved  
**Feature:** Right-click action on Setup Workspace tree item that scans GitHub Actions workflows, compares against configured GitHub Secrets/Variables, and creates any missing ones interactively.

---

## 1. Overview

A new VS Code command `antigravity.auditSecretsAndVariables` is added to the right-click context menu of the "Setup Workspace" tree node. When triggered, it:

1. Scans `.github/workflows/*.yml` to discover all required secrets and variables
2. Reads configured GitHub Environments from the repo
3. Compares required vs existing secrets/variables per environment
4. Prompts for missing values using VS Code's native input API
5. Creates them in GitHub via the `gh` CLI
6. Documents all requirements in the project's `.env` file as comments

---

## 2. Architecture

### New files
- **`src/secrets-audit.ts`** — all scanning, comparison, collection, and creation logic

### Modified files
- **`package.json`** — one new command declaration + one new `view/item/context` menu entry under `antigravitySetupWorkspaceAction`
- **`src/extension.ts`** — one new command registration that calls `runSecretsAudit()` from `secrets-audit.ts`
- **`src/utils.ts`** — one new helper `appendEnvComment(filePath, line)`

### Command
- **ID:** `antigravity.auditSecretsAndVariables`
- **Menu label:** `Audit Secrets & Variables`
- **Icon:** `shield-lock`
- **When clause:** `view == antigravityView && viewItem == antigravitySetupWorkspaceAction`
- **Group:** `navigation@2` (alongside existing `updateWorkspaceAgentsMd` at `navigation@1`)

---

## 3. Workflow Scanning

Scans every file matching `.github/workflows/*.yml` and `.github/workflows/*.yaml`.

**Patterns detected:**
- `${{ secrets.NAME }}` → required GitHub Secret
- `${{ vars.NAME }}` → required GitHub Variable

**Environment association:**  
Workflow job blocks that declare `environment: <name>` associate all secrets/variables referenced within that job to that environment. References outside any environment block are tagged as `_repo` (repo-level).

**Built-in skip list** (never flagged as missing):
```
GITHUB_TOKEN, GITHUB_SHA, GITHUB_REF, GITHUB_ACTOR, GITHUB_REPOSITORY,
GITHUB_EVENT_NAME, GITHUB_WORKSPACE, GITHUB_RUN_ID, GITHUB_RUN_NUMBER,
GITHUB_HEAD_REF, GITHUB_BASE_REF
```

**Output structure:**
```ts
type AuditMap = Record<string, {
  secrets: string[];
  variables: string[];
}>;

// Example:
{
  production: { secrets: ["DOCKERHUB_TOKEN", "AWS_SECRET_KEY"], variables: ["APP_URL"] },
  staging:    { secrets: ["DOCKERHUB_TOKEN"], variables: [] },
  _repo:      { secrets: ["ANTHROPIC_API_KEY"], variables: ["NODE_ENV"] }
}
```

---

## 4. GitHub Discovery

### Pre-flight checks (fail fast with actionable error message)
1. `gh` CLI is installed — `gh --version`
2. Authenticated — `gh auth status`
3. Remote origin is a GitHub URL — `git remote get-url origin`

### Repo identity
Parse `owner/repo` from `git remote get-url origin` (handles both HTTPS and SSH formats).

### Environment list
```
gh api repos/{owner}/{repo}/environments
```
Returns the authoritative list of configured GitHub Environments. Only environments returned here are checked — no hardcoded list.

### Existing secrets/variables per environment
For each environment:
```
gh secret list --env <env> --json name
gh variable list --env <env> --json name
```

For repo-level (`_repo`):
```
gh secret list --json name
gh variable list --json name
```

### Delta computation
```
missing = required (from scan) − existing (from GitHub)
```
Only missing items proceed to the collection step.

---

## 5. Collection UI

### Opening summary
VS Code information message before prompting:
> "Found N missing items across M environments (env1, env2). Proceed to set them?"

Buttons: **Set them** / **Skip (document only)**

If the user picks "Skip (document only)", the `.env` documentation step (section 6) still runs.

### Per-item input
Items are grouped by environment (alphabetical), secrets before variables within each group.

For each missing item:
- **Secrets** → `showInputBox` with `password: true` (value masked)
- **Variables** → `showInputBox` with `password: false`
- Prompt: `Enter value for secret "DOCKERHUB_TOKEN" — production environment`
- Known-name hint: well-known secrets include a one-line hint about where to find the value (see Known Names table below)
- Pressing **Escape** skips that item and continues to the next

### Creation commands
- Secret (env): `gh secret set NAME --env ENV --body VALUE`
- Secret (repo): `gh secret set NAME --body VALUE`
- Variable (env): `gh variable set NAME --body VALUE --env ENV`
- Variable (repo): `gh variable set NAME --body VALUE`

### Closing summary
> "✅ 4 of 5 items set. 1 skipped (AZURE_CREDENTIALS / production). Run again to retry skipped items."

Or if all set:
> "✅ All secrets and variables are configured."

### Known Names — hint table
| Name pattern | Hint |
|---|---|
| `DOCKERHUB_*` | DockerHub — hub.docker.com > Account Settings > Security |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | AWS IAM — Console > Users > Security credentials |
| `AWS_ROLE_ARN` / `AWS_*` | AWS IAM — Console > Roles |
| `GCP_SA_KEY` / `GOOGLE_CREDENTIALS` / `GCP_*` | GCP — IAM & Admin > Service Accounts > Keys |
| `AZURE_CREDENTIALS` / `AZURE_*` | Azure — Portal > App registrations > Certificates & secrets |
| `RENDER_API_KEY` / `RENDER_*` | Render — dashboard.render.com > Account Settings > API Keys |

---

## 6. `.env` Documentation

After the audit (regardless of whether values were set), required items are documented in the project's `.env` as comments.

### Format
```
# === GitHub Secrets & Variables (auto-audited) ===
# GITHUB_SECRET[production]: DOCKERHUB_TOKEN
# GITHUB_SECRET[production]: AWS_SECRET_ACCESS_KEY
# GITHUB_VARIABLE[production]: APP_URL
# GITHUB_SECRET[staging]: DOCKERHUB_TOKEN
# GITHUB_SECRET[_repo]: ANTHROPIC_API_KEY
```

### Idempotency
Before appending, the existing `.env` content is read. Any line that already appears as a comment is skipped. Re-running the audit never duplicates entries.

### New helper in `utils.ts`
```ts
export function appendEnvComment(filePath: string, line: string): void
```
Reads the file, checks for the exact line as a comment, appends only if absent.

---

## 7. Error Handling

| Scenario | Behaviour |
|---|---|
| `gh` not installed | Error message: "gh CLI is required. Install from cli.github.com" |
| Not authenticated | Error message: "Run `gh auth login` to authenticate with GitHub" |
| No GitHub remote | Error message: "No GitHub remote found. Is this a GitHub repository?" |
| No workflow files | Info message: "No workflow files found in .github/workflows/" |
| No secrets/vars required | Info message: "No secrets or variables referenced in workflows — nothing to audit" |
| `gh secret set` fails | Error message per item, continue with remaining items |
| User cancels opening summary | Command exits, no `.env` changes |

---

## 8. Out of Scope

- Creating or managing GitHub Environments themselves (only reads existing ones)
- Rotating or deleting existing secrets
- Reading secrets values (GitHub API does not expose values — by design)
- Support for non-GitHub remotes (GitLab, Bitbucket)
- Syncing secrets between environments
