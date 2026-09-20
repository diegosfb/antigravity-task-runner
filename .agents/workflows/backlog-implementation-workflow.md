---
description: Implement a selected backlog scope in dependency order using the planner for item ownership, developer-agent for implementation, spec-validation-agent for conformance and security, and test-agent for verification. Stops at the code-review handoff.
---

# Backlog Implementation

Implement and test an approved, bounded backlog scope through this loop:

```text
project-planner-agent -> developer-agent -> spec-validation-agent -> test-agent
        ^                                                      |
        |----------- defect tracking / completion -------------|
```

Invoke with `/backlog-implementation-workflow`. This workflow consumes an
approved backlog; it does not redefine requirements, architecture, UX, or
backlog priority. It stops when the selected scope is tested, finalized, and
ready for `code-review-agent`. It never reviews, merges, or deploys.

## Required input

Require one explicit execution boundary: a backlog item, epic, sprint, release,
or user-supplied item set. Do not interpret “the backlog” as permission to run
an unlimited queue.

Resolve the backlog system of record and confirm the selected items exist. Read
their acceptance criteria, source specifications, ADRs, UX constraints,
dependencies, estimates, and current statuses. If the backlog is missing,
unapproved, internally inconsistent, or lacks required traceability, stop and
return it to `project-planner-agent`; do not invent work.

Before resuming a prior run, inspect backlog statuses, branches, test evidence,
and tracked failures. Continue from the earliest incomplete gate rather than
duplicating branches, plans, tests, defects, commits, or pull requests.

## Ordering contract

Ask `project-planner-agent` for the ordered items within the selected boundary.
It remains the sole backlog writer and status owner. Execute explicit
dependencies first, then planner priority and risk. Never skip a blocked item
to implement a dependent item.

Process one item at a time by default. Parallel execution is allowed only when
the planner explicitly identifies items as mutually independent, each has an
isolated task branch, and their integration seam is known. A parallel wave
must rejoin before any dependent item starts.

## Per-item loop

### 1. Claim and plan

Have `project-planner-agent` identify the next unblocked item. Pass that item,
its complete traceability chain, and the current repository state to
`developer-agent`.

Before any edit or implementation dispatch, `developer-agent` must:

1. Produce the mandatory implementation plan listing files, reasons,
   approach, validation, and acceptance criteria.
2. Read `user_approval_gates.mandatory.implementation_plan`, treating every
   value as `required`.
3. Present the plan and wait for explicit approval.
4. Record the exact approved plan through the configured vault event before
   editing.
5. Resolve `developer_git_workflow.mode` and establish the permitted task
   branch behavior. Never implement directly on `main`.

Approval of the backlog or this workflow is not approval of an item’s
implementation plan. A material plan change requires a new approval.

### 2. Implement

`developer-agent` dispatches the appropriate active or conditionally activated
implementation subagents, integrates their work at shared seams, and follows
the approved plan, specifications, ADRs, and UX requirements. Implement only
the current item; report scope or dependency defects to
`project-planner-agent` instead of silently re-planning.

Run focused developer checks during implementation. Do not weaken acceptance
criteria or tests to make the change pass.

Apply the configured cross-model judge before the test handoff when
`llm_judge.trigger_mode` requires it. Resolve a `REWORK` result through a
revised, approved implementation plan.

### 3. Validate specification conformance

Invoke `spec-validation-agent` on every spec-covered candidate change before
normal test execution. Its `spec-drift-checker` compares behavior with the
governing specifications:

- `CONFORMANT` or an evidenced not-applicable result proceeds.
- High-confidence `DRIFT` returns to `developer-agent` through a revised-plan
  loop.
- `SPEC_GAP` returns to `ba-agent` and pauses affected implementation until the
  specification and downstream artifacts are corrected and re-approved.
- Lower-confidence uncertainty is surfaced for human review.

This explicit workflow invocation performs the conformance check even when
`spec_validation.drift_check_mode` is `on-demand`. Do not run the dormant
`spec-red-team` here unless separately requested and a non-production,
synthetic-data target is confirmed.

### 4. Plan and execute tests

Pass the candidate branch and original BA acceptance criteria to `test-agent`.
Before writing or running new feature tests, it creates and validates
`docs/test-plans/<feature-name>.md`, then enforces
`user_approval_gates.configurable.test_plan`. Missing or invalid values fail
safe to `required`.

Run the smallest appropriate unit, integration, acceptance, end-to-end,
accessibility, and data-quality coverage, including every applicable acceptance
criterion. Apply `test_red_team.trigger_mode`; any dynamic adversarial test
requires a confirmed local or ephemeral non-production target with synthetic
data.

On failure, `test-agent` sends sanitized, actionable evidence to
`developer-agent`. When `test_failure_tracking.track_in_backlog` is enabled, it
also sends the evidence to `project-planner-agent`, which deduplicates it and
returns the existing or created Bug/investigation Task ID. Fixes require a new
evidence-mapped implementation plan, explicit approval, vault recording, and a
full affected-suite rerun. Reuse the item’s branch and any existing PR.

Invoke `documentation-agent` after `test-agent` returns PASS. Provide the exact
tested revision, PASS evidence, and governing task, specification, ADR, UX, and
acceptance-criteria artifacts. Continue with its documented revision or
justified no-change record. If documentation exposes a code or specification
conflict, return it to `developer-agent` through the normal revised-plan,
specification-validation, and test loop.

### 5. Close the item and finalize its repository state

After documentation completes, send the documented revision, test verification
evidence, documentation handoff, and tracked IDs to `project-planner-agent`.
Only the planner may mark blocking failures and the originating item Done. Wait
for its completion acknowledgement; backlog access failure blocks finalization
rather than being silently bypassed.

Return the acknowledgement to `developer-agent`, which then performs the
configured final self-audit and repository checks:

1. Run `spec-validation-agent/security-check-agent` on the exact staged diff
   when `security_check.pre_commit` is enabled; require PASS.
2. Run configured pre-commit hooks and commit with backlog traceability and
   model provenance.
3. When the selected Git workflow includes a pull request, run
   `security-check-agent` on the complete branch diff when
   `security_check.pre_pr` is enabled, then run configured pre-PR hooks.
4. Enforce `user_approval_gates.configurable.pull_request_creation`
   immediately before creating a required PR.
5. Read `no_mistakes.enabled`; missing or invalid values fail safe to `false`
   and must be reported. When enabled, run No-mistakes after the preceding
   checks and approval: use its full validation, push, PR, and CI path when the
   resolved Git mode includes a PR, or skip its push, PR, and CI phases when the
   mode is branch-only. When disabled, do not invoke it automatically. An
   explicit user request overrides the disabled setting without bypassing any
   existing gate.
6. Push the validated branch or create/update its PR according to the resolved
   per-item Git mode when No-mistakes did not already perform that delivery.

A security FAIL or BLOCKED result enters the same planner-tracked,
revised-plan, fix, and retest loop. A passing security review never replaces
`test-agent` PASS.

Stop the item at the `code-review-agent` handoff boundary. Record the branch or
PR as ready for review, but do not invoke code review as part of this workflow.

### 6. Continue in order

Ask `project-planner-agent` for the next unblocked item inside the selected
scope and repeat the loop. Do not pull work outside the boundary. Stop early
when:

- a required user approval is pending;
- a dependency or specification gap blocks the next item;
- a safe test target or required external system is unavailable;
- security or required tests remain failing;
- the user stops the run.

## Completion

The workflow is complete only when every item in the selected scope is Done in
the backlog and has a validated branch or PR ready for code review. Report:

```text
BACKLOG IMPLEMENTATION — COMPLETE | BLOCKED | PARTIAL
SCOPE: <epic, sprint, release, or item IDs>
COMPLETED: <item -> branch/PR -> test evidence>
TRACKED FAILURES: <resolved and open IDs>
SPEC VALIDATION: <per-item verdict/report>
SECURITY VALIDATION: <pre-commit/pre-PR verdicts>
REMAINING: <items inside the selected scope>
BLOCKERS: <none or explicit blockers>
NEXT STEP: Hand validated branches/PRs to code-review-agent.
```

Never claim the entire backlog is complete when only the selected execution
boundary has completed.
