# Improvement Plan — antigravity-task-runner

Generated from code review · 2026-05-12

---

## Summary

Overall quality is solid. The `HARNESS_BASE_COMMAND_BUILDERS` dispatch table, webview CSP/nonce handling, and test isolation patterns are all worth keeping. Two security/correctness issues and one portability blocker need to be addressed before wider distribution. The remaining items are maintenance debt that should follow in a cleanup pass.

---

## Critical (must fix)

### C1 — Unify `quoteShellArg` to the strongest escaping form

**Problem:** `quoteShellArg` exists in three files with different regex.
`utils.ts` only escapes `"`, while `agentRunCommand.ts` and `agenticHarnessCommand.ts` also escape `\`, `$`, and backtick. All callers that import from `utils.ts` — including `extension.ts` (commit messages, script args, model-switch flags) — do not protect against `$VAR` expansion or `` `cmd` `` substitution in the terminal.

**Locations:**
- `src/utils.ts:59` — weaker form (only escapes `"`) — used by `extension.ts`, `scripts.ts`, `terminal.ts`
- `src/agentRunCommand.ts:11` — stronger form (escapes `"`, `\`, `$`, backtick)
- `src/agenticHarnessCommand.ts:9` — stronger form (identical to above)

**Fix:** Upgrade `utils.ts` to the strongest form. Delete the two local copies and import from `utils.ts`.

```typescript
// src/utils.ts — canonical implementation
export function quoteShellArg(value: string): string {
  return `"${value.replace(/["\\$`]/g, "\\$&")}"`;
}
```

```typescript
// src/agentRunCommand.ts — remove local definition, add import
import { quoteShellArg } from "./utils";
```

```typescript
// src/agenticHarnessCommand.ts — remove local definition, add import
import { quoteShellArg } from "./utils";
```

---

### C2 — Remove hardcoded personal email from Jira agent prompts

**Problem:** `extension.ts:2449` contains the literal string `diegosfb@gmail.com` embedded in the agent prompt for Codex-Jira flows. Every user of this extension would be told to authenticate as the extension developer rather than themselves.

**Location:** `src/extension.ts:2449`

**Fix:** Read from the existing `jiraEmail` config key.

```typescript
// Before
const jiraAccessInstructions = agentLabel === "Codex"
  ? ` ... authenticated to Jira MCP as diegosfb@gmail.com ...`
  : "";

// After
const jiraEmail = (vscode.workspace
  .getConfiguration("antigravity")
  .get<string>("jiraEmail") || "").trim();

const jiraAccessInstructions = agentLabel === "Codex" && jiraEmail
  ? ` ... authenticated to Jira MCP as ${jiraEmail} ...`
  : "";
```

---

## Major (should fix)

### M1 — Replace hardcoded Jira group names in `jira.ts`

**Problem:** `TEAM_MANAGED_MEMBER_GROUPS` is set to `["jira-users-diegosfb"]` and multiple warning strings reference `Diego Fernandez` and `jira-users-diegosfb`. These make Jira project creation non-functional for any other org.

**Locations:**
- `src/jira.ts:30` — `TEAM_MANAGED_MEMBER_GROUPS`
- `src/jira.ts:33` — `TEAM_MANAGED_ACCESS_WARNING`
- `src/jira.ts:944` — warning string referencing the group

**Fix:** Either make the group configurable via settings, or remove the org-specific group pinning and let Jira's own defaults apply.

```typescript
// Option A — make configurable
const memberGroups = vscode.workspace
  .getConfiguration("antigravity")
  .get<string[]>("jiraMemberGroups") ?? [];

// Option B — remove the pinning entirely
const TEAM_MANAGED_MEMBER_GROUPS: string[] = [];
```

---

### M2 — Eliminate duplicated Codex trust arg construction in `terminal.ts`

**Problem:** `runCodexInitAndUpdateInPersistentTerminal` in `terminal.ts:140-156` manually builds the Codex `-C`/`-c trust_level` arguments that are already encapsulated inside `buildCodexTrustArgs()` in `agenticHarnessCommand.ts`. These two implementations will silently diverge.

**Location:** `src/terminal.ts:140-156`

**Fix:** Delegate to `buildAgenticHarnessPromptCommandForCommand`, which routes through the canonical `codex` builder.

```typescript
// Before
export async function runCodexInitAndUpdateInPersistentTerminal(
  repoRoot: string,
  prompt: string
): Promise<void> {
  const trustOverride = `projects.${JSON.stringify(repoRoot)}.trust_level="trusted"`;
  runInPersistentTerminal(
    getAgentTerminalName(),
    [
      `cd ${quoteShellArg(repoRoot)}`,
      `codex -C ${quoteShellArg(repoRoot)} -c "trust_level=\\"trusted\\"" -c ${quoteShellArg(trustOverride)} ${quoteShellArg(prompt)}`
    ],
    { iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR), color: CLAUDE_ACTION_COLOR }
  );
}

// After
export async function runCodexInitAndUpdateInPersistentTerminal(
  repoRoot: string,
  prompt: string
): Promise<void> {
  const commands = [
    `cd ${quoteShellArg(repoRoot)}`,
    buildAgenticHarnessPromptCommandForCommand("codex", repoRoot, prompt, "unattended")
  ];
  runInPersistentTerminal(getAgentTerminalName(), commands, {
    iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
    color: CLAUDE_ACTION_COLOR
  });
}
```

---

### M3 — Fix unquoted `cd` commands in `git.ts` and `scripts.ts`

**Problem:** Three locations use bare `"${variable}"` interpolation for the `cd` command. All other callers (25+ in `extension.ts`, 3 in `terminal.ts`) use `quoteShellArg`. Paths with spaces or `$` characters will break silently.

**Locations:**
- `src/git.ts:45` — `\`cd "${repoRoot}"\``
- `src/scripts.ts:278` — `\`cd "${workspaceRoot}"\``
- `src/scripts.ts:341` — `\`cd "${repoRoot}"\``

Additionally, `scripts.ts:278-280` (`runWorkflow`) uses an unquoted script invocation:
```typescript
`./scripts/${path.basename(scriptPath)}`
```

**Fix:**
```typescript
// git.ts:45
`cd ${quoteShellArg(repoRoot)}`,

// scripts.ts:278-280
`cd ${quoteShellArg(workspaceRoot)}`,
quoteShellArg(path.join(".", "scripts", path.basename(scriptPath))),

// scripts.ts:341
`cd ${quoteShellArg(repoRoot)}`,
```

---

### M4 — Deduplicate `getNonce()` — defined identically in two files

**Problem:** `getNonce()` is a private function in `settings.ts:158` and an identical closure in `extension.ts:314` inside `activate()`. Any change to the implementation must be made twice.

**Locations:**
- `src/settings.ts:158`
- `src/extension.ts:314`

**Fix:** Export from `settings.ts`, import in `extension.ts`.

```typescript
// src/settings.ts
export function getNonce(): string {   // add `export`
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i += 1) {
    nonce += chars[Math.floor(Math.random() * chars.length)];
  }
  return nonce;
}

// src/extension.ts — remove local definition, add to imports from settings
import { ..., getNonce } from "./settings";
```

---

### M5 — Route `Claude Code` path in `buildAgentRunCommand` through the harness builder

**Problem:** `agentRunCommand.ts:48` handles the `Claude Code` label with a hardcoded `claude --permission-mode auto` flag set, bypassing `buildAgenticHarnessPromptCommandForCommand`. This means the Claude Code path doesn't receive `--dangerously-skip-permissions --print` from `HARNESS_BASE_COMMAND_BUILDERS` and diverges from what `buildAgenticHarnessPromptCommand` would produce.

**Location:** `src/agentRunCommand.ts:48-50`

**Fix:**
```typescript
// Before
if (agentLabel === "Claude Code") {
  return `claude --permission-mode auto ${quoteShellArg(prompt)}`;
}

// After
if (agentLabel === "Claude Code") {
  return buildAgenticHarnessPromptCommandForCommand("claude", repoRoot, prompt, "unattended");
}
```

---

### M6 — Break up the 5,871-line `extension.ts` god file

**Problem:** The `activate()` function is ~5,700 lines of nested closures, local type definitions, HTML rendering, dialog managers, Jira flows, git utilities, and command registration — all sharing the same closure scope. No unit in this file can be tested in isolation.

**Suggested extraction targets** (each is already a coherent, self-contained unit):

| New file | What to move |
|---|---|
| `src/featureBranchDialog.ts` | `renderCreateFeatureBranchHtml`, `showCreateFeatureBranchDialog`, `branchTypes`, `buildStandardBranchName`, `buildJiraTaskBranchName`, `normalizeBranchSegment` |
| `src/featureEstimatorDialog.ts` | `renderFeatureEstimatorHtml`, `showFeatureEstimatorDialog`, `buildFeatureEstimatorDetailsFromIssue` |
| `src/jiraAgentLauncher.ts` | `buildJiraAgentPrompt`, `buildIssueSummaryForAgent`, `buildAgentJiraLabel`, `launchAgentForJiraItem`, `writeAgentLaunchScript`, `writeAgentPromptFile` |
| `src/commitFlow.ts` | `runCommitChangesFlow`, `parseGitStatusPorcelain`, `parseGitNameStatus`, `buildGeneratedCommitMessage`, `hasNonProtectedUncommittedChanges`, `isProtectedAutomatedCommitPath` |
| `src/setupWorkspaceDialog.ts` | `renderSetupWorkspaceHtml`, `showSetupWorkspaceDialog` |

Commands would remain in `extension.ts` and import from the above modules.

---

## Minor (nice to have)

- **`src/extension.ts:2449,2452`** — Typo `"ASSUMTION"` (×2) should be `"ASSUMPTION"` in the Jira agent prompt string. The AI will log Jira comments with the misspelling.

- **`src/terminal.ts:16`** — `getAgentTerminalName()` always returns the hardcoded string `"Antigravity Agent"` and ignores the `agentTerminalName` VS Code setting, while `getTerminalName()` correctly reads from config. Make `getAgentTerminalName()` consistent:
  ```typescript
  export function getAgentTerminalName(): string {
    return (
      vscode.workspace.getConfiguration("antigravity").get<string>("agentTerminalName") ||
      "Antigravity Agent"
    );
  }
  ```

- **`src/treeProvider.ts:592-601`** — The sidebar re-parses `.env` with a one-off inline regex instead of calling `parseEnvFile()`. The regex doesn't strip surrounding quotes, so `JIRA_PROJECT_KEY='PROJ'` would include the single quotes in the displayed key:
  ```typescript
  // Before — inline regex without quote stripping
  .match(/^\s*JIRA_PROJECT_KEY\s*=\s*([^\r\n#]+)/m)?.[1] ?? ""

  // After — reuse the existing utility
  const savedJiraProjectKey = repoRoot && fs.existsSync(path.join(repoRoot, ".env"))
    ? (parseEnvFile(path.join(repoRoot, ".env")).jira_project_key ?? "").toUpperCase()
    : "";
  ```

- **`package.json` — `workflowsFolder` default** is the absolute path `"/Users/diego.brihuega/.gemini"`. Change to `""` so users get an empty field they fill in, rather than a path that resolves to nothing on their machine.

- **`package.json` — `repository.url`** is the placeholder `"https://example.com/dsfb/antigravity-task-runner"`. Update to the actual repository URL.

- **`src/settings.ts:7`** — `DEFAULT_GITHUB_CODE_REVIEWER = "@diegosfb"` is a personal username. Consider changing the default to `""` or a generic placeholder so new users are prompted to fill it in rather than inheriting the extension author's handle.

---

## Inconsistency Report

### I1 — `quoteShellArg` (3 implementations, 2 distinct behaviors)

| Location | Escapes |
|---|---|
| `utils.ts:59` | `"` only |
| `agentRunCommand.ts:11` | `"` `\` `$` `` ` `` |
| `agenticHarnessCommand.ts:9` | `"` `\` `$` `` ` `` |

**Canonical form:** upgrade `utils.ts` to the strongest form, delete the other two (see C1).

---

### I2 — `getExecutableName` (duplicated in 2 files, not exported)

| Location | Fallback on empty |
|---|---|
| `agentRunCommand.ts:15` | returns `""` |
| `agenticHarnessCommand.ts:44` | returns normalized path |

Neither is exported or re-used. Move to `utils.ts` as an export.

```typescript
// src/utils.ts
export function getExecutableName(command: string): string {
  const firstToken = command.trim().split(/\s+/)[0] ?? "";
  const normalized = firstToken.replace(/\\/g, "/");
  return (normalized.split("/").pop() || normalized).toLowerCase();
}
```

---

### I3 — Shell-quoting for `cd` command (2 patterns across the codebase)

| Pattern | Locations |
|---|---|
| `\`cd "${variable}"\`` (incorrect) | `git.ts:45`, `scripts.ts:278`, `scripts.ts:341` |
| `\`cd ${quoteShellArg(variable)}\`` (correct) | `extension.ts` (25+ calls), `terminal.ts` (3 calls) |

**Fix:** apply M3 to make all `cd` calls use `quoteShellArg`.

---

### I4 — `getNonce` (2 identical definitions)

| Location | Scope |
|---|---|
| `settings.ts:158` | module-level private function |
| `extension.ts:314` | local closure inside `activate()` |

**Fix:** apply M4 — export from `settings.ts`, import everywhere.

---

## What's Working Well (preserve these)

1. **`HARNESS_BASE_COMMAND_BUILDERS` strategy map** (`agenticHarnessCommand.ts:51-80`) — clean dispatch record replaces a deep `if/else` chain. Easy to extend without touching existing entries.

2. **Module-prototype test isolation** (`tests/*.test.js`) — stubbing `vscode` via `Module.prototype.require` keeps tests zero-dependency and fast. Worth replicating for any new modules.

3. **`buildPromptArgumentFromFile` using `$(cat <file>)`** (`agenticHarnessCommand.ts:103-106`) — writing long prompts to a temp file and injecting `$(cat ...)` avoids complex inline shell escaping. Well-documented and correct.

4. **`resolveOnce` settled-flag pattern** in all webview dialogs — guarding promise resolution with a `settled` boolean prevents double-fire bugs from VS Code's async dispose/message interleaving.

5. **`parseEnvFile` edge case coverage** (`utils.ts:120-148`) — handles `export` prefix, surrounding quotes, comments, blank lines, and `=` in values correctly. This is the right level of care for a utility used in security-adjacent paths.
