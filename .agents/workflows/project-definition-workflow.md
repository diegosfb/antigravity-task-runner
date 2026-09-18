---
description: Define a project from initial idea through an approved, dependency-ordered backlog using product, business-analysis, architecture, UX, and planning agents. Stops before implementation.
---

# Project Definition

Turn an idea into an organized backlog through the SDLC definition chain:

```text
product-agent -> ba-agent -> architect-agent -> ux-agent -> project-planner-agent
     PRD           specs         solution          design          backlog
```

Invoke with `/project-definition-workflow`. This workflow defines the product
and solution, but never implements it. Do not invoke `developer-agent` or create
application code.

## Input

Accept the current conversation, project brief, stakeholder material, or an
existing partially completed definition. Establish the project objective,
available evidence, constraints, intended users, and desired backlog system.
Ask only for information that the owning agent cannot safely derive or record
as an explicit open question.

Before starting, inspect existing artifacts. Resume from the earliest missing,
invalid, or materially stale stage; do not recreate approved artifacts merely
because the workflow was invoked again. Never overwrite an existing artifact
without resolving conflicts with its owner and the user.

## Approval contract

At every stage, enforce the owning agent's validation and approval gate from
`ADLC_workflow_settings.json`:

| Stage | Setting |
|---|---|
| Product definition | `user_approval_gates.configurable.prd` |
| Requirements | `user_approval_gates.configurable.specifications` |
| Architecture | `user_approval_gates.configurable.architecture` |
| UX/UI design | `user_approval_gates.configurable.ux_ui_design` |
| Backlog plan | `user_approval_gates.configurable.backlog_plan` |

Validation is mandatory even when a gate is configured as `skip`. A missing or
invalid setting fails safe to `required`. When approval is required, stop at
that checkpoint and wait; approval of one artifact does not approve later
artifacts. Material changes invalidate approval for that artifact and its
affected downstream artifacts.

## Stage 1 — Product definition

Invoke `product-agent` with the idea and available evidence. It owns discovery,
problem framing, target users, goals and success metrics, market context,
candidate capabilities, constraints, assumptions, and configured pre-mortem
analysis.

When the evidence includes recordings, route them through
`harvesting-meeting-context` and then `meeting-insights`. Route existing notes
or transcripts directly through `meeting-insights`. Give `product-agent` the
reviewed `meeting-analysis.md`, not an unverified heuristic extraction. Its PRD
must preserve evidence classification and citations, disagreements, unknowns,
and the limits of what the meetings establish.

Expected artifact: `docs/project_description/PRD.md`.

Validate the PRD and pass its approval gate. Do not proceed with unresolved
product decisions that would force downstream agents to invent scope.

## Stage 2 — Requirements definition

Pass the approved PRD and supporting evidence to `ba-agent`. It owns functional
specifications, user stories, behavioral rules, edge cases, permissions, open
questions, and testable acceptance criteria.

Expected artifacts: `docs/specs/<feature-name>.md` for every in-scope feature.

Validate every specification and pass the specifications approval gate. The
acceptance criteria become one of the planner's authoritative input streams.

## Stage 3 — Solution architecture

Pass the approved specifications plus any binding development guidelines to
`architect-agent`. It owns system boundaries, technology and data decisions,
non-functional requirements, diagrams, ADRs, technical decomposition, and
dependency edges. Let the parent activate domain architecture subagents when
their scope is present.

Expected artifacts:

- `docs/architecture/architecture.md`
- Diagram sources under `docs/architecture/documents/`
- ADRs under `docs/architecture/adrs/`
- Technical tasks and dependency edges for planning

Apply the configured cross-model architecture judgment when required. Validate
the complete architecture package and pass its approval gate before UX design.

## Stage 4 — Experience and interface definition

Pass the approved PRD, relevant specifications, architecture, and ADRs to
`ux-agent`. UX is part of solution definition and backlog definition: it owns
user flows, wireframes, interaction states, component behavior, responsive
behavior, and accessibility requirements, and converts them into design tasks
for the planner.

Every user-facing flow must cover applicable empty, loading, error, and success
states. Every design task must trace to its feature and architectural
constraint. If UX exposes an architectural conflict, return it to
`architect-agent`, update affected artifacts, and repeat their validation and
approval gates.

For a project with no human-facing experience, still invoke `ux-agent` to
record a validated not-applicable decision and emit no invented UI tasks.

Validate the design package and pass the UX/UI approval gate.

## Stage 5 — Backlog definition

Pass all three approved planning streams to `project-planner-agent`:

1. Acceptance criteria and stories from `ba-agent`.
2. Technical tasks and dependency edges from `architect-agent`.
3. Design and accessibility tasks from `ux-agent`.

The planner resolves conflicts, preserves traceability, declares dependencies,
orders work by dependency then priority and risk, and assigns complexity and
time ranges with assumptions. Use `to-tickets` only when explicitly requested;
ordinary project definition uses the planner's normal decomposition contract.

Materialize the backlog in the project's configured system of record:

- Jira epics, stories, tasks, and dependency links when Jira is in scope.
- `docs/backlog/` Markdown when Jira is not in scope.

Do not silently create a new Jira project or select a different system of
record. If no destination is established, ask once before materialization.
Validate traceability, dependencies, ordering, estimates, and design coverage,
then pass the backlog-plan approval gate.

## Completion

Stop when the approved backlog is organized so `developer-agent` could pull the
next unblocked item without inventing scope or sequence. Report:

```text
PROJECT DEFINITION — COMPLETE
PRD: <path and approval status>
SPECS: <paths and approval status>
ARCHITECTURE: <document, diagrams, ADRs, and approval status>
UX: <design package or validated N/A decision and approval status>
BACKLOG: <Jira project/board or local path and approval status>
OPEN QUESTIONS: <none or blocking/non-blocking list>
NEXT STEP: Invoke /backlog-implementation-workflow with an explicit backlog scope.
```

Do not treat backlog approval as implementation-plan approval. Implementation
remains a separate workflow with its own mandatory gate.
