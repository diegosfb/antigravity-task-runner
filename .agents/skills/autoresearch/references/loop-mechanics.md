# Loop mechanics: /goal vs /loop, and keep/revert via git

Karpathy's original autoresearch fixes a 5-minute wall-clock *training
budget per round* (not a 5-minute wait *between* rounds) and then runs rounds
back-to-back, indefinitely, with no idle time in between. When generalizing
past ML training, the right pacing depends on how long it actually takes to
get a trustworthy score for one variant.

## Choosing /goal vs /loop

| | `/goal` | `/loop <interval>` |
|---|---|---|
| Next round starts | Immediately after the previous turn finishes | On a wall-clock timer |
| Best when | Scoring is fast (seconds-minutes): a benchmark, a build, a computed metric | Scoring needs real-world data to accumulate (traffic, sends, opens) over hours/days |
| Stops on | The stated condition is met, a model judges it impossible, or the user clears it | The user stops it, or Claude decides the work is done |
| Command | `/goal <stopping condition from instructions.md>`, optionally with a turn/time bound like "or stop after 40 rounds" | `/loop 2h continue the autoresearch loop in .autoresearch/<slug>/: read instructions.md, do one round, update results-log.md` |

Either way, **auto mode or acceptEdits** should be on, or every file edit and
git command will stop for a permission prompt and defeat the point of an
unattended loop. Say this to the user explicitly when recommending a command.

Read `.autoresearch/<slug>/instructions.md` for the stopping condition and
pass it verbatim into `/goal` where possible — don't paraphrase it into
something looser or stricter.

### A loop only runs while something is watching the clock

Both `/goal` and `/loop` are session-scoped: they only fire while this
Claude Code session is open and the machine is on. That's fine for "leave my
laptop running overnight." It is **not** the same as "runs no matter what,"
and the skill should never imply otherwise. If the user wants a loop that
survives a closed laptop or a killed terminal, point them at:

- **Cloud Routines** — runs on Anthropic-managed infrastructure on a
  schedule, independent of any open session or local machine.
- **Desktop scheduled tasks** — runs locally on a schedule even without an
  open session, as long as the machine is on.

## Keep-or-revert, precisely

Because the asset lives in a real git repo, "keep or revert" is just git,
not a manual file-backup scheme:

1. Before round 1, commit the current asset state on the loop's branch
   (`autoresearch/<slug>`) as the baseline.
2. Each round, after making the one change:
   - Score it.
   - **Keep**: `git add <asset path> && git commit -m "round N: <hypothesis>"`.
     This commit is now the baseline for the next round.
   - **Revert**: `git restore --worktree -- <asset path>` discards only the
     uncommitted change to the declared asset. Never reset the branch or
     discard unrelated changes. The asset returns to exactly the last kept
     baseline before round N+1 starts.
3. `results-log.md` records every round regardless of outcome, so the
   history of *attempts* survives even though the file content of *reverted*
   attempts doesn't.

This mirrors Karpathy's own convention of branching per experiment tag and
using git as the memory for what was kept.

## Results log schema

One row per round, appended (never rewritten) as rounds happen:

```
| Round | Timestamp | Hypothesis | Score before | Score after | Delta | Kept / Reverted |
```

Keep hypotheses to one sentence. Keep scores in the same units `score.md`
defines. A round that errors out (script crashed, asset broke) still gets a
row — record it as reverted with a note, don't silently skip it.

## Why two enforcement layers on the locked files

`Edit(.autoresearch/**/instructions.md)` and `Edit(.autoresearch/**/score.*)`
deny rules stop Claude's built-in Edit/Write tools, and Claude Code also
checks these deny rules against file-editing commands it recognizes inside
Bash (`cat >`, `sed -i`, redirections, etc.). The `protect-autoresearch-files.sh`
hook is a second, independent check on the same two file patterns — useful
because permission rules apply to Claude Code's built-in tools and
recognized Bash file commands, not to an arbitrary script (e.g. a Python
script Claude writes and runs) that opens and edits a file directly by path.
Neither layer is a substitute for the instructions in `instructions.md`
itself telling Claude plainly which files are off-limits and why.
