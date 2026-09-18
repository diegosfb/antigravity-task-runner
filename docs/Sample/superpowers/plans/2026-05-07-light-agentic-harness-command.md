# Light Agentic Harness Execution Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Light Agentic Harness execution command" setting (with preset list + free-text UI) and route the commit flow to it instead of the heavy harness command.

**Architecture:** Mirror the existing `agenticHarnessExecutionCommand` pattern exactly — new constant + accessor in `settings.ts`, new wrapper function in `terminal.ts`, swap in `extension.ts`. No new abstractions.

**Tech Stack:** TypeScript, VS Code extension API, Node.js built-in test runner (`node --test`).

---

## File Map

| File | Change |
|---|---|
| `package.json` | Add 2 new setting definitions after `agenticHarnessExecutionCommands` |
| `src/settings.ts` | Add `DEFAULT_LIGHT_AGENTIC_HARNESS_EXECUTION_COMMANDS`, `getLightAgenticHarnessExecutionCommand()`, and a new settings field entry |
| `src/terminal.ts` | Add `buildLightAgenticHarnessPromptCommand()` and update import |
| `src/extension.ts` | Swap `buildAgenticHarnessPromptCommand` → `buildLightAgenticHarnessPromptCommand` in the `commitChanges` handler + update import |
| `tests/settings.test.js` | New test file for `getLightAgenticHarnessExecutionCommand` (unit-testable path) |

---

## Task 1: Add settings to `package.json`

**Files:**
- Modify: `package.json` (after line ~448, after the `agenticHarnessExecutionCommands` block)

- [ ] **Step 1: Insert two new setting definitions**

In `package.json`, find the closing `}` of the `antigravity.agenticHarnessExecutionCommands` entry (around line 448) and insert the following two entries immediately after it, before `"antigravity.claudeSetupGithub"`:

```json
        "antigravity.lightAgenticHarnessExecutionCommand": {
          "type": "string",
          "default": "claude --model claude-haiku-4-5-20251001",
          "description": "Selected Light Agentic Harness execution command."
        },
        "antigravity.lightAgenticHarnessExecutionCommands": {
          "type": "array",
          "default": [
            "claude --model claude-haiku-4-5-20251001",
            "opencode run -m ollama/qwen3-coder:30b",
            "gemini"
          ],
          "items": {
            "type": "string"
          },
          "description": "Saved Light Agentic Harness execution commands offered on the Settings page."
        },
```

- [ ] **Step 2: Verify JSON is valid**

```bash
node -e "require('./package.json'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "Add lightAgenticHarnessExecutionCommand settings to package.json"
```

---

## Task 2: Add accessor and settings field in `settings.ts`

**Files:**
- Modify: `src/settings.ts`

- [ ] **Step 1: Add the default commands constant**

In `src/settings.ts`, directly after the `DEFAULT_AGENTIC_HARNESS_EXECUTION_COMMANDS` constant (around line 189), add:

```ts
const DEFAULT_LIGHT_AGENTIC_HARNESS_EXECUTION_COMMANDS = [
  "claude --model claude-haiku-4-5-20251001",
  "opencode run -m ollama/qwen3-coder:30b",
  "gemini"
];
```

- [ ] **Step 2: Add the accessor function**

Directly after `getAgenticHarnessExecutionCommand()` (around line 197), add:

```ts
export function getLightAgenticHarnessExecutionCommand(): string {
  const config = vscode.workspace.getConfiguration("antigravity");
  return (
    (config.get<string>("lightAgenticHarnessExecutionCommand") || "").trim() ||
    DEFAULT_LIGHT_AGENTIC_HARNESS_EXECUTION_COMMANDS[0]
  );
}
```

- [ ] **Step 3: Add the settings field entry**

In `getExtensionSettingsFields()`, after the block that builds and returns the `agenticHarnessExecutionCommand` field entry (around line 388–398), add the following field entry to the returned array, immediately after it:

```ts
    {
      key: "lightAgenticHarnessExecutionCommand",
      label: "Light Agentic Harness execution commands",
      description:
        "Pick a saved command or type your own. Applying settings saves custom values into the list for next time.",
      placeholder: "claude --model claude-haiku-4-5-20251001",
      value: getLightAgenticHarnessExecutionCommand(),
      type: "command-list",
      options: mergeUniqueStrings(
        DEFAULT_LIGHT_AGENTIC_HARNESS_EXECUTION_COMMANDS,
        config.get<string[]>("lightAgenticHarnessExecutionCommands"),
        [getLightAgenticHarnessExecutionCommand()]
      ),
      optionsKey: "lightAgenticHarnessExecutionCommands"
    },
```

Note: this must be inside the `getExtensionSettingsFields()` function body, in the array returned at the end. Look at how the `agenticHarnessExecutionCommand` field is built (lines 222–232 and 388–398) for the exact pattern to follow — the `options` merging uses the same `mergeUniqueStrings` helper.

- [ ] **Step 4: Compile to check for type errors**

```bash
npm run compile 2>&1 | head -30
```

Expected: no errors, output ends with something like `Process exited with code 0` or no output.

- [ ] **Step 5: Commit**

```bash
git add src/settings.ts
git commit -m "Add getLightAgenticHarnessExecutionCommand and settings field"
```

---

## Task 3: Add `buildLightAgenticHarnessPromptCommand` to `terminal.ts`

**Files:**
- Modify: `src/terminal.ts`

- [ ] **Step 1: Update the import from `./settings`**

At the top of `src/terminal.ts`, the import from `./settings` currently reads:

```ts
import { getAgenticHarnessExecutionCommand } from "./settings";
```

Change it to:

```ts
import { getAgenticHarnessExecutionCommand, getLightAgenticHarnessExecutionCommand } from "./settings";
```

- [ ] **Step 2: Add the new function**

Directly after `buildAgenticHarnessPromptCommand` (around line 88), add:

```ts
export function buildLightAgenticHarnessPromptCommand(
  repoRoot: string,
  prompt: string,
  mode: AgenticHarnessPromptMode = "dangerous"
): string {
  const command = getLightAgenticHarnessExecutionCommand();
  const runString = buildAgenticHarnessPromptCommandForCommand(
    command,
    repoRoot,
    prompt,
    mode
  );
  logAlways(`[lightAgenticHarness] runString: ${runString}`);
  return runString;
}
```

- [ ] **Step 3: Compile to check for type errors**

```bash
npm run compile 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/terminal.ts
git commit -m "Add buildLightAgenticHarnessPromptCommand to terminal.ts"
```

---

## Task 4: Swap commit flow to use the light harness

**Files:**
- Modify: `src/extension.ts`

- [ ] **Step 1: Update the import from `./terminal`**

Near the top of `src/extension.ts`, find the import that includes `buildAgenticHarnessPromptCommand`:

```ts
import {
  buildAgenticHarnessPromptCommand,
  ...
} from "./terminal";
```

Add `buildLightAgenticHarnessPromptCommand` to it:

```ts
import {
  buildAgenticHarnessPromptCommand,
  buildLightAgenticHarnessPromptCommand,
  ...
} from "./terminal";
```

- [ ] **Step 2: Swap the call in `commitChanges`**

In the `antigravity.commitChanges` handler (around line 2795), find:

```ts
buildAgenticHarnessPromptCommand(repoRoot, prompt, "prompt")
```

Replace it with:

```ts
buildLightAgenticHarnessPromptCommand(repoRoot, prompt, "prompt")
```

There is only one call to `buildAgenticHarnessPromptCommand` inside the `commitChanges` handler — do not touch the other calls in the file (lines ~940, ~3740, ~3783, ~3859).

- [ ] **Step 3: Compile**

```bash
npm run compile 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/extension.ts
git commit -m "Route commit flow to light agentic harness command"
```

---

## Task 5: Add tests for `getLightAgenticHarnessExecutionCommand` fallback

**Files:**
- Create: `tests/settings.test.js`

The `getLightAgenticHarnessExecutionCommand` function depends on `vscode` (not available in Node test runner). We test the fallback logic by checking the compiled output of the pure helper `getToolRunCommand` exported from `settings.ts` instead — it exercises the same `parseOptionalString` path. For the light harness accessor specifically, add a smoke test that verifies the module loads and the symbol is exported.

- [ ] **Step 1: Create the test file**

```js
const test = require("node:test");
const assert = require("node:assert/strict");

// settings.ts exports pure helpers that don't require vscode at import time
// because vscode calls are inside function bodies, not at module level.
// We can import and call the pure helpers safely.
const settings = require("../out/settings.js");

test("getLightAgenticHarnessExecutionCommand is exported", () => {
  assert.strictEqual(typeof settings.getLightAgenticHarnessExecutionCommand, "function");
});

test("getToolRunCommand returns undefined for missing tool", () => {
  const result = settings.getToolRunCommand({}, "nonexistent");
  assert.strictEqual(result, undefined);
});

test("getToolRunCommand returns command string for known tool", () => {
  const result = settings.getToolRunCommand({ "tool-run": { build: "npm run build" } }, "build");
  assert.strictEqual(result, "npm run build");
});

test("normalizeStringArray filters non-strings and empty values", () => {
  const result = settings.normalizeStringArray(["a", "", 42, "b", null]);
  assert.deepEqual(result, ["a", "b"]);
});
```

- [ ] **Step 2: Run the tests**

```bash
npm test 2>&1 | tail -20
```

Expected: all tests pass, including the new `settings.test.js` tests.

- [ ] **Step 3: Commit**

```bash
git add tests/settings.test.js
git commit -m "Add settings.test.js with smoke tests for new light harness export"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** package.json settings ✓ · `getLightAgenticHarnessExecutionCommand` ✓ · settings field ✓ · `buildLightAgenticHarnessPromptCommand` ✓ · commit flow swap ✓
- [x] **No placeholders:** all steps have exact code
- [x] **Type consistency:** `getLightAgenticHarnessExecutionCommand` defined in Task 2, imported in Task 3, used in Task 3 — names match throughout
- [x] **Import chain:** `terminal.ts` imports from `settings.ts`; `extension.ts` imports from `terminal.ts` — no circular additions
