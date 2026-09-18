# Project Planner Agent

The `project-planner-agent` is the arbiter and sequencer. It merges acceptance
criteria, technical decomposition, and design work into one ordered,
dependency-aware, estimated backlog. It is the sole writer to that backlog.

## Workflow position

```mermaid
flowchart LR
    BA[ba-agent<br/>acceptance criteria] --> PP[project-planner-agent]
    A[architect-agent<br/>technical tasks and dependencies] --> PP
    UX[ux-agent<br/>design tasks] --> PP
    PP -->|ordered sprint-ready backlog| D[developer-agent]
    D -->|scope or dependency problem| PP
    T[test-agent] -->|failure context| PP
    PP -->|matched or created item IDs| T
    T -->|full PASS and verified resolution| PP
    PP -->|origin and blocking items Done| T
    LOOP[Review bounce or estimate drift] -->|re-plan signal| PP
```

## Inputs

| Input | Source | Use |
|---|---|---|
| Acceptance criteria | `ba-agent` | Provides behavioral traceability and completion conditions. |
| Technical tasks and dependency edges | `architect-agent` | Defines build work and structural ordering constraints. |
| Design tasks | `ux-agent` | Places experience work alongside the technical work it supports. |
| Execution feedback | `developer-agent` and downstream loops | Reveals bad dependencies, repeated bounces, or estimate drift. |
| Test failure and resolution evidence | `test-agent` | Creates or matches traceable defects and closes them only after verification. |

## Outputs

The output is the task backlog, stored in Jira when it is the system of record
or in `docs/backlog/` Markdown otherwise. Every sprint-ready item includes:

- Source artifact and acceptance-criterion traceability.
- Explicit dependencies, including an empty list when none exist.
- Priority and dependency-aware sequence.
- Complexity estimate and time range.
- Stated estimation assumptions.

The developer-agent pulls work only from this ordered backlog.

When `test_failure_tracking.track_in_backlog` is enabled, test failures add a
deduplicated Bug, or an investigation Task when the cause is not yet confirmed.
The item links to the originating task or story with explicit `Blocks`/`Is
Blocked By` relationships where applicable and retains the test evidence.

## Planning method

1. Merge the BA, architecture, and UX streams.
2. Resolve cross-stream dependencies and conflicts before sprint execution.
3. Sequence dependency order first, then priority and risk.
4. Estimate every item using ranges and explicit assumptions.
5. Materialize the ordered plan in the configured backlog system.
6. Re-sequence and re-estimate remaining work when execution evidence warrants
   it.
7. Deduplicate reported test failures, return the existing or created backlog
   ID to the test-agent, and close the item only after the full affected suite
   verifies the resolution.
8. When the full suite passes and all blocking failures are resolved, mark the
   originating task/story Done and return completion acknowledgement with all
   final item IDs and statuses to the test-agent.

## Ownership boundaries

The planner owns backlog writing, sequencing, prioritization, and estimates. It
does not define product vision, requirements, architecture, UX, or code.
Upstream agents provide their respective work through this single planning
door; execution agents consume work through the single backlog exit.

## Agent interactions

- Receives acceptance criteria from `ba-agent`, dependency edges from
  `architect-agent`, and design tasks from `ux-agent`.
- Produces sprint-ready tasks for `developer-agent` in dependency order.
- Receives scope and dependency corrections from development rather than
  allowing the developer to silently rewrite the plan.
- Uses repeated test/review bounces and estimate drift as evidence for
  re-planning the remaining backlog.
- Receives sanitized failure context from `test-agent`, deduplicates it against
  open items, creates a Bug or investigation Task when needed, links it to the
  originating work, and returns its ID for the developer's revised plan.
- Records verification evidence from `test-agent` before resolving a tracked
  failure.
- Keeps the originating item incomplete until the full affected suite passes
  and every blocking Bug/Task is Done, then marks it Done and acknowledges the
  completed set so developer repository finalization may begin.

The developer-agent's per-task implementation plan is separate: it requires
explicit user approval and vault persistence before building. That plan does
not replace or mutate the planner-owned backlog.

## Vault behavior

When enabled, Markdown backlog artifacts are mirrored into `Backlog/`; Jira
outcomes and material planning decisions are recorded as linked semantic notes
and action-log entries. Estimates, sequencing decisions, assumptions, and
re-planning conclusions should remain traceable to their source artifacts.

## Completion and handoff

Planning is complete when all accepted work is traceable, conflicts are
resolved, dependencies are explicit, every item has complexity and time-range
estimates with assumptions, test failures are deduplicated and linked, verified
resolutions and originating-item completion are recorded, and the backlog is
ordered so the developer-agent can pull the next unblocked task without
inventing sequence or scope.

<!-- agent-auditor:inventory:start -->

## Audited agent inventory

- Source: [`project-planner-agent`](../../../agents/project-planner-agent/project-planner-agent.md)
- Subagents: none

<!-- agent-auditor:inventory:end -->
