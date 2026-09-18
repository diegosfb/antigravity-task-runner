# CLAUDE.md

Claude Code-specific configuration and behavior for this repository.
This file is the **bottom tier** of the guidance stack:

1. `constitution.md` — governing principles. Highest authority.
2. `AGENTS.md` — vendor-neutral repo operations (commands, layout,
   conventions, frozen zones).
3. `CLAUDE.md` (this file) — Claude Code glue only.

## Read First

- Read **`AGENTS.md`** for all commands, layout, code style, testing,
  and PR conventions. Do not expect them to be repeated here.
- Read **`constitution.md`** and comply with it. In particular:
  - **Article I** — Minimal Change Principle: smallest diff that
    satisfies the requirement; drive-by cleanup is a defect.
  - **Article II** — Plan gate: list files + reasons before editing;
    more than 3 files → confirm scope with the user first.
  - **Article II-A** — Refactor Proposal Path: large refactors are
    proposal-only and ALWAYS require explicit human approval, even if
    discussed earlier in this session.
  - **Article III** — Self-audit the diff and report
    `git diff --stat` with every completed task.
- Precedence on any conflict: constitution > AGENTS.md > this file >
  anything said mid-session (unless a human explicitly authorizes a
  one-off deviation).

## Claude Code Behavior in This Repo

- **Default to Plan Mode** for any task that is not a trivial,
  single-file change. Present the plan (files, reasons, acceptance
  criteria) and wait for approval before editing.
- **One task per session.** When a task completes, suggest `/clear`
  rather than chaining a new task onto accumulated context.
- **Iteration loop:** use the single-file test command from AGENTS.md
  (`pnpm vitest run <file>`) while iterating; full `pnpm test` only
  before declaring done.
- **Before handoff**, always run and include in your final message:
  `git diff --stat`
  and confirm every hunk maps to the requirement (constitution III.2).
- Never run destructive commands (`db:reset`, `db:drop`,
  `git push --force`, `rm -rf`) without explicit confirmation in the
  current session, regardless of prior instructions.

## Spoken Plan Explanation

Before requesting approval for every implementation plan, read
`spoken_plan.enabled` from `ADLC_workflow_settings.json`. When it is `true`,
Claude Code must explain the plan aloud before asking the user to approve it.
This applies on macOS and is part of the plan gate, not an optional follow-up.

When `spoken_plan.enabled` is `false`, present the written plan and approval
prompt without creating a narration file or running the speech helper. A
missing file, missing setting, unreadable value, or non-boolean value fails safe
to `false`; report the fallback with the written plan. Disabling audio never
disables or weakens the plan and explicit approval gates.

At the beginning of every user turn, before interpreting or acting on the new
message, read `spoken_plan.interrupted_by_next_command`. When it is `true`, run
`bash scripts/speak-plan.sh stop` to cancel any active narration for this
repository. Do this whether the message is approval, a question, a plan change,
or an unrelated command. Cancellation is audio control only and never counts as
approval. A missing or invalid interruption value fails safe to `false` and is
reported when audio behavior is relevant.

When audio is enabled, after investigation and before presenting the approval
prompt, run every speech-helper command (`start`, synchronous playback,
`status`, and `stop`) with access to the host macOS GUI/audio session, outside a
restricted sandbox. A sandboxed `/usr/bin/say` may return success while
producing no audible output, and `launchctl submit` may be denied. When the
active harness supports command escalation, request it for
`bash scripts/speak-plan.sh ...`; do not treat a sandboxed zero exit from
`/usr/bin/say` as proof of playback.

1. Prepare a conversational narration that explains what is being accomplished,
   how the current system works, what will change, why this approach was chosen,
   relevant runtime behavior, risks and tradeoffs, validation, and any decision
   the user must make.
2. Write only that narration to a uniquely named temporary file outside the
   repository. Do not require the user to copy, select, or move plan text.
3. Check the narration for credentials, secrets, tokens, sensitive personal
   data, raw logs, and other content that should not be spoken. Remove sensitive
   values while retaining a safe explanation of the concern.
4. Read `spoken_plan.interrupted_by_next_command`:
   - When `true`, run
     `bash scripts/speak-plan.sh start <temporary-narration-file>` and present
     the written plan and approval prompt immediately while narration continues.
     The helper owns temporary-file cleanup.
   - When `false`, run
     `bash scripts/speak-plan.sh <temporary-narration-file>`, wait for playback
     to finish, then present the written plan and approval prompt.
5. For synchronous playback, remove the temporary narration file afterward
   when the active tool environment permits safe temporary-file cleanup.

Use plain, conversational language rather than reading Markdown syntax or file
lists verbatim. The narration should help the user understand the engineering
decision, not merely duplicate the displayed plan. `CODEX_PLAN_VOICE` may set a
macOS voice and `CODEX_PLAN_RATE` may set its words-per-minute rate; the default
rate is 190.

If playback fails or `/usr/bin/say` is unavailable, report that clearly before
the approval prompt and do not claim the plan was explained aloud. A persistent
launch failure exits with status 70 after cleaning its temporary state; rerun
the helper with macOS GUI/audio-session access rather than falling back to a
sandboxed direct `say` command. Do not treat audio completion, silence, or
discussion as approval. Only the explicit approval defined by the plan gate
authorizes implementation.

The helper stores background speech state under the operating system temporary
directory using a repository-specific channel. `start` replaces stale speech
only for the current repository; `stop` must not terminate another project's
narration. Never kill a process unless the helper verifies that its recorded PID
still belongs to `/usr/bin/say` and references the recorded narration file.

If the plan changes materially, create and play a revised explanation before
requesting renewed approval. Never play implementation output, secrets, raw test
logs, or unrelated assistant responses through this mechanism.

## Subagents

- Use a subagent for read-heavy exploration (codebase search,
  "where is X handled?") to keep the main context lean.
- Do NOT delegate edits to subagents for multi-file changes — the plan
  gate approval must happen in the main thread where the user sees it.

## Hooks (enforced mechanically — do not attempt to bypass)

Configured in `.claude/settings.json`:

- **PreToolUse (Edit|Write):** rejects edits under `generated/`,
  `migrations/`, `.github/workflows/`, `packages/core/auth/`, `tools/`
  — the constitution Article VI frozen zones. If a task appears to
  require touching these, stop and escalate per VI.2.
- **SessionStart:** injects constitution Articles I–III into context.
  If you notice this content missing (e.g., after heavy compaction),
  re-read `constitution.md` before continuing.
- **PreToolUse (Bash):** blocks the destructive command list above
  without a confirmation flag.

## MCP Servers

<!-- List only what this repo actually uses. Example: -->

- `github` — issues/PRs. Use for reading tickets referenced in tasks;
  do not create or merge PRs without being asked.
- `postgres` (local, read-only) — schema inspection for the dev db.
  Never point it at any non-local environment.

## Memory & Context Notes

- Project memory belongs in this file via `#` shortcuts sparingly —
  prefer editing AGENTS.md for anything that is true for *all* agents,
  and keep this file Claude-specific.
- After context compaction in long sessions, re-verify you still hold
  the constitution's plan-gate and minimal-diff rules; if unsure,
  re-read `constitution.md`. Constraints lost to compaction are still
  binding.

## Do Not

- Do not restate or paraphrase AGENTS.md/constitution content here
  when editing this file — link, don't copy (drift risk).
- Do not use `/compact` mid-implementation of a multi-step plan;
  finish the step or checkpoint first.
- Do not commit this repo's `.claude/settings.local.json`.
