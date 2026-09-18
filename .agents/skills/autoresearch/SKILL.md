---
name: autoresearch
description: Turn "is it good?" into one objective number for a single asset (landing page, email/DM copy, ad, prompt, config file, algorithm, source file...), then run repeated hypothesize → edit → score → keep-or-revert rounds until a goal is hit or the user stops it. This is Andrej Karpathy's autoresearch "program, train, prepare" loop (github.com/karpathy/autoresearch) generalized past ML training to any business asset. Use whenever the user wants to auto-optimize something, run an overnight experiment loop, set up A/B-style iterative improvement against a metric, or asks for an "autoresearch" / "evolutionary" / "keep testing until it's better" workflow.
disable-model-invocation: true
argument-hint: [asset to optimize]
---

# AutoResearch: one asset, one number, all night

You are setting up and, optionally, running a **three-file autoresearch loop**:
pick one thing, define one honest number for "is it good", then repeatedly
hypothesize a change, apply it to the asset, score it, and keep the change only
if the number improved.

Read this file fully before doing anything. For the detailed fit-check
criteria, see [references/fit-check.md](references/fit-check.md). For how the
round-by-round mechanics map onto Claude Code's `/goal`, `/loop`, and git, see
[references/loop-mechanics.md](references/loop-mechanics.md).

**Be honest about what this can and can't do.** Don't promise the user
something like "I'll work all night no matter what" — a local loop only runs
while this session and machine stay on (see the note in Step 4). Say that
plainly instead of overselling it.

## The three-file contract

| File | Who edits it | Purpose |
|---|---|---|
| `.autoresearch/<slug>/instructions.md` | **Human only** | Goal, rules, stopping condition, in plain English |
| The **asset** (the user's real file(s), e.g. `landing.html`, `emails/cold-open.md`) | **Claude, one change per round** | The only thing that changes |
| `.autoresearch/<slug>/score.md` | **Human only** | The objective measuring stick |

Claude may *read* `instructions.md` and `score.md` every round. Claude must
never edit either one, and must never redefine what "better" means to make a
score look higher. This is enforced two ways, both set up in Step 3:
a permission deny rule and a `PreToolUse` hook.

## Step 1 — Interview

If the user already named the asset and a rough metric in their message, use
that and skip straight to confirming details. Otherwise ask, in plain
conversational turns (not all at once):

1. **What asset do you want to optimize?** Get the actual file path(s) or
   repo location. This is the only thing Claude will be allowed to edit.
2. **What's the ONE objective number?** Push for something a script, a
   command, or a fetched log can produce — not "make it look nicer." Good
   examples: page load time in ms, positive-reply rate on outreach messages,
   click-through rate, p95 latency, cost per request, lines of failing tests.
   Nudge toward a single number even when the user describes several
   concerns; ask which one matters most right now, and note the rest as
   guardrails (see `score.md.template`'s guardrails section) rather than
   folding them into the primary metric.
3. **How do you get that number?** A command to run, a dashboard/export to
   read, an API to call. If the honest answer is "I'd have to wait 3 weeks
   for SEO reindexing" or "I'd have to manually survey users," say so now —
   it matters for the fit check next.

## Step 2 — Fit check

Run the fit check honestly before building anything. Full criteria and
examples are in [references/fit-check.md](references/fit-check.md); the
condensed version:

**Must-haves — all three required, or this isn't a good autoresearch target:**
- (a) Scored objectively: a real number comes out, not a vibe.
- (b) Fast feedback: a round can be scored in minutes/hours, not weeks.
- (c) Claude can actually change the asset: it's a file or API Claude can
  edit, not a published video or a one-way action.

**Nice-to-haves — the more of these hold, the more powerful the loop:**
- (d) High volume of feedback (lots of traffic/sends/iterations)
- (e) Cheap to fail (a bad variant costs little)
- (f) Consistent measuring stick (fair, repeatable comparisons)

If a must-have fails, **say so plainly** and propose a better-shaped target
instead of proceeding anyway. Common failure and fix:
- Fails (b) because feedback needs real users over days/weeks (e.g. email
  open rate on a small list) → shrink the loop to a faster proxy (subject
  line A/B on a synthetic panel, or a longer `/loop` interval that matches
  the real feedback cadence — see loop-mechanics.md) or accept a slower
  cadence explicitly.
- Fails (c) because the asset is something Claude has no write access to
  (a live ad already served, a published page with no repo) → find the
  editable source of truth instead (the ad's draft, the CMS-backed file).

## Step 3 — Set up the three files

1. Pick a short slug for this loop (e.g. `landing-hero`, `cold-outreach-v2`).
2. Create `.autoresearch/<slug>/` and write, from the templates in this
   skill's `templates/` directory (one directory up from this file, i.e.
   `${CLAUDE_SKILL_DIR}/../../templates/`):
   - `instructions.md` — filled in with the goal, the asset path(s), the
     rules, and a concrete stopping condition (a target number, a round
     budget like "stop after 40 rounds with no improvement," or "until the
     human says stop").
   - `score.md` — filled in with the exact metric, direction (higher/lower
     is better), the exact command or steps to compute it, and any
     guardrails (things that must not get worse even if the main number
     improves).
   - `results-log.md` — the empty log table, with the baseline score you
     measure right now as round 0.
3. Lock the two human-only files. Merge this into `.claude/settings.json`
   (create the file if it doesn't exist; merge into any existing
   `permissions`/`hooks` blocks rather than overwriting them):

   ```json
   {
     "permissions": {
       "deny": [
         "Edit(.autoresearch/**/instructions.md)",
         "Edit(.autoresearch/**/score.*)"
       ]
     },
     "hooks": {
       "PreToolUse": [
         {
           "matcher": "Edit|Write",
           "hooks": [
             {
               "type": "command",
               "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-autoresearch-files.sh"
             }
           ]
         }
       ]
     }
   }
   ```

   Copy `hooks/protect-autoresearch-files.sh` from this skill's bundle to
   `.claude/hooks/protect-autoresearch-files.sh` and make it executable
   (`chmod +x`). The deny rule stops Claude's own Edit/Write tool and most
   Bash file-editing commands; the hook is defense-in-depth in case a
   Bash-based edit slips past the deny rule's recognized command list.
4. Create a git branch for the loop, matching Karpathy's original
   convention, so keep/revert is just git: `git checkout -b
   autoresearch/<slug>`. Commit the current asset state as the baseline
   before round 1.
5. Read `instructions.md` and `score.md` back and confirm the setup with the
   user before starting: state the goal, the metric, the stopping condition,
   and the fit-check result (including any must-have that's borderline).

## Step 4 — Run the loop

One round is:

1. Read the current baseline asset and its score from `results-log.md` (or
   compute the baseline score fresh if this is round 1).
2. Form exactly **one** hypothesis and make exactly **one** change to the
   asset only.
3. Score the variant using `score.md`'s method — nothing else.
4. **Keep or revert**, via git:
   - Beats baseline → `git add`/`git commit` the change; it's the new
     baseline.
   - Doesn't beat baseline → `git restore --worktree -- <asset path>` to
     discard only the declared asset change, then try a different hypothesis
     next round. Never reset the branch or discard unrelated changes.
5. Append one row to `results-log.md`: round #, hypothesis, score before →
   after, delta, kept/reverted.

**Choosing how rounds are paced** — see
[references/loop-mechanics.md](references/loop-mechanics.md) for the full
tradeoffs, in short:
- If a round can be scored immediately (seconds to a few minutes), drive the
  loop with `/goal <the stopping condition from instructions.md>` so rounds
  run back-to-back without a fixed wait.
- If scoring needs to wait for real-world feedback to accumulate (traffic,
  sends, opens), use `/loop <interval> <round-prompt>` with an interval that
  matches how long that feedback actually takes to arrive — don't fake a
  5-minute cadence around data that isn't ready yet.

**Be upfront about "overnight, indefinitely."** `/goal` and `/loop` both stop
firing if this Claude Code session or machine isn't running. For a loop that
truly must survive a closed laptop, tell the user about [cloud
Routines](https://code.claude.com/docs/en/routines) or a [Desktop scheduled
task](https://code.claude.com/docs/en/desktop-scheduled-tasks) instead of
implying a local `/loop` will do that on its own.

Stop the loop when the stopping condition in `instructions.md` is met, when a
model judges it impossible (with `/goal`), or when the user says stop.

## Step 5 — Report

When the loop stops (or whenever the user asks), read `results-log.md` and
offer a short summary: total rounds, kept vs. reverted count, the baseline
score vs. the current score and the percent improvement, and the 2-3 changes
that mattered most. Offer to turn this into a clean report file if the user
wants something to share — a markdown file is the default; only reach for a
Word doc if they explicitly ask for one.
