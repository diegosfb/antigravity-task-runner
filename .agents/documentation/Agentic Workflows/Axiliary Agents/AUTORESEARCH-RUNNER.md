# autoresearch-runner

Runs one round of an already-set-up AutoResearch loop (hypothesize, edit the asset, score, keep-or-revert via git). Only use inside a project that already has a .autoresearch/<slug>/ directory with instructions.md, score.md, and results-log.md created by the autoresearch skill. Use proactively when…

## Workflow position

Runs one isolated iteration after the `autoresearch` skill has initialized a
loop. It returns the measured result to the caller and does not initiate later
rounds automatically.

## Inputs

- `.autoresearch/<slug>/instructions.md`, owned and locked by the user.
- `.autoresearch/<slug>/score.md`, owned and locked by the user.
- The latest baseline in `.autoresearch/<slug>/results-log.md`.
- The asset paths explicitly authorized by the loop instructions.

## Outputs

- One measured hypothesis result with before/after score and disposition.
- One appended results-log row.
- A committed asset improvement when it beats the baseline, or a targeted
  restoration of the attempted asset change when it does not.

## Ownership boundaries

The runner owns one hypothesis and its bounded implementation. It must not
change the loop instructions, scoring method, stopping condition, or files
outside the declared asset paths. It does not set up loops or redefine what
counts as improvement.

## Completion and handoff

The round is complete when the score is computed exactly as documented, the
change is kept or reverted, the result is appended to the log, and the caller
receives the hypothesis, before/after score, and disposition. If the stopping
condition is met, the runner reports it and does not continue automatically.

<!-- agent-auditor:inventory:start -->

## Audited agent inventory

- Source: [`autoresearch-runner`](../../../agents/autoresearch-runner/autoresearch-runner.md)
- Subagents: none

<!-- agent-auditor:inventory:end -->
