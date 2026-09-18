# Light Agentic Harness Execution Command

**Date:** 2026-05-07  
**Branch:** feature/refact-actions-using-agent-harness

## Problem

The extension has one "Agentic Harness execution command" setting used for all agent-driven flows. Heavy operations (full task runs, PR management) and light operations (commit message generation) share the same command, meaning users must run a full Sonnet-class model even for quick commit messages where a fast/local model is sufficient.

## Goal

Add a parallel "Light Agentic Harness execution command" setting for lightweight agent tasks, and route the commit flow to it. The new setting uses the same `command-list` UI (preset dropdown + free-text input, saves custom values back into the list).

## Approach

Mirror the existing Agentic Harness pattern exactly — no new abstractions.

---

## Design

### 1. `package.json` — new settings

| Key | Type | Default |
|---|---|---|
| `antigravity.lightAgenticHarnessExecutionCommand` | `string` | `"claude --model claude-haiku-4-5-20251001"` |
| `antigravity.lightAgenticHarnessExecutionCommands` | `string[]` | see below |

Default preset list for `lightAgenticHarnessExecutionCommands`:
```json
[
  "claude --model claude-haiku-4-5-20251001",
  "opencode run -m ollama/qwen3-coder:30b",
  "gemini"
]
```

### 2. `src/settings.ts`

- Add `DEFAULT_LIGHT_AGENTIC_HARNESS_EXECUTION_COMMANDS` constant with the three defaults above.
- Add `getLightAgenticHarnessExecutionCommand()` — reads `antigravity.lightAgenticHarnessExecutionCommand`, falls back to first default (same pattern as `getAgenticHarnessExecutionCommand`).
- Add a `SettingsField` entry in `getExtensionSettingsFields()` for `lightAgenticHarnessExecutionCommand` of type `command-list`, placed immediately below the existing Agentic Harness field.
  - `label`: `"Light Agentic Harness execution commands"`
  - `description`: `"Pick a saved command or type your own. Applying settings saves custom values into the list for next time."`
  - `placeholder`: `"claude --model claude-haiku-4-5-20251001"`
  - `optionsKey`: `"lightAgenticHarnessExecutionCommands"`

### 3. `src/terminal.ts`

Add one new exported function:

```ts
export function buildLightAgenticHarnessPromptCommand(
  repoRoot: string,
  prompt: string,
  mode: AgenticHarnessPromptMode = "dangerous"
): string {
  const command = getLightAgenticHarnessExecutionCommand();
  const runString = buildAgenticHarnessPromptCommandForCommand(command, repoRoot, prompt, mode);
  logAlways(`[lightAgenticHarness] runString: ${runString}`);
  return runString;
}
```

Import `getLightAgenticHarnessExecutionCommand` from `./settings`.

### 4. `src/extension.ts` — commit flow

In the `antigravity.commitChanges` handler (~line 2795), replace:

```ts
buildAgenticHarnessPromptCommand(repoRoot, prompt, "prompt")
```

with:

```ts
buildLightAgenticHarnessPromptCommand(repoRoot, prompt, "prompt")
```

Also update the import at the top of the file to include `buildLightAgenticHarnessPromptCommand`.

---

## Files changed

| File | Change |
|---|---|
| `package.json` | +2 setting definitions |
| `src/settings.ts` | +1 constant, +1 accessor function, +1 settings field entry |
| `src/terminal.ts` | +1 function, +1 import |
| `src/extension.ts` | swap one function call + update import |

## Files NOT changed

- `src/agenticHarnessCommand.ts` — reused as-is
- `src/agenticHarnessSkill.ts` — reused as-is
- All other files
