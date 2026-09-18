---
name: to-tickets
description: Break an approved specification or plan into context-sized tracer-bullet tickets with explicit blocking edges, then hand the approved breakdown to project-planner-agent for the configured Jira or local backlog workflow. Use only when explicitly invoked.
disable-model-invocation: true
metadata:
  version: "1.0.0"
  library: "Matt Pocock Skills — adapted"
  library-url: "https://skills.sh/mattpocock/skills"
  pack: "Software Development"
---

# To Tickets

Break an approved specification or plan into tracer-bullet delivery tickets. Preserve `project-planner-agent` as the sole backlog writer and use its established inputs, templates, estimates, approval gate, local files, and Jira workflow.

## 1. Gather context

- Read the complete approved source specification or plan, including referenced acceptance criteria, ADRs, UX artifacts, and relevant comments.
- Read the project domain glossary and use its vocabulary in ticket titles and descriptions.
- Inspect the affected code and existing tests when needed to identify safe delivery seams.
- If only conversation context exists, use `to-spec` to create and approve the canonical source specification before decomposing it. Every ticket must retain a source-artifact link.

## 2. Draft tracer-bullet tickets

Prefer narrow vertical slices that deliver complete, independently demonstrable or verifiable behavior across the layers they actually need. A slice may include schema, API, UI, and focused tests when that is the smallest coherent behavior.

Each ticket must:

- fit within one fresh agent context;
- deliver one observable outcome;
- trace to source acceptance criteria, an ADR, or an approved design artifact;
- declare its blockers, including an empty blocker list when it can start immediately;
- include complexity and time-estimate ranges with assumptions;
- use the planner's [`issue-template.md`](../../agents/project-planner-agent/references/issue-template.md) fields and terminology.

Create a separate prerequisite ticket only when it genuinely unlocks multiple slices, cannot safely land within one slice, or is required by an ownership or deployment boundary. Do not create opportunistic prefactoring work; tie it to a demonstrated delivery blocker or risk.

### Wide refactors

When one mechanical change has a blast radius that prevents independently green vertical slices, use expand–migrate–contract:

1. Expand by adding the new form beside the old without breaking callers.
2. Migrate callers in context-sized batches, each blocked by the expand ticket.
3. Contract by removing the old form only after every migration ticket is complete.

If migration batches cannot stay green independently, identify the shared integration branch requirement and add a final integrate-and-verify ticket. Do not represent a wide refactor as a fake vertical slice.

## 3. Build the dependency graph

- Give every ticket explicit blocking edges and preserve their correct direction.
- Create blockers before dependents so real tracker identifiers can be referenced.
- Identify the initial execution frontier: all tickets with no incomplete blockers.
- Sequence by dependency order first, then the planner's priority, risk, and execution-ordering rules.
- Keep parent epics or source issues unchanged unless the approved backlog workflow explicitly requires updating them.

## 4. Review the breakdown

Use the planner's [`confirmation-template.md`](../../agents/project-planner-agent/references/confirmation-template.md) to present the proposed epics and numbered tickets. For every ticket include its title, blockers, observable delivery outcome, source trace, estimate, and assumptions.

Ask the user whether:

- the granularity is too coarse or too fine;
- the blocking edges represent genuine gates;
- any tickets should be merged or split.

Iterate until the breakdown is approved. This review satisfies the configured backlog-plan approval interaction; do not add a redundant approval prompt. Always perform the planner's validation, and obey `user_approval_gates.configurable.backlog_plan` when deciding whether explicit approval is required.

## 5. Materialize through project-planner-agent

After validation and any required approval, hand the breakdown to `project-planner-agent`:

- **Local backlog:** create the epic and one child file per ticket under `docs/backlog/` using the planner's [`epic-template.md`](../../agents/project-planner-agent/references/epic-template.md) and [`issue-template.md`](../../agents/project-planner-agent/references/issue-template.md). Do not use `.scratch/`.
- **Jira:** follow `jira-manager-playbook.md` in the planner's [Jira references directory](../../agents/project-planner-agent/jira-references/) and its [`jira-handoff.md`](../../agents/project-planner-agent/references/jira-handoff.md), preserving the approved structure, source links, estimates, acceptance criteria, issue types, unassigned defaults, and native dependency links.
- Apply `ready-for-agent` only after the item is validated and released by the configured approval gate.
- Report created file paths or Jira identifiers, mappings, the executable frontier, and any partial failures. Never claim an external write succeeded without verification.

## Boundaries

- Do not replace the planner's estimation methodology, templates, defect lifecycle, or system-of-record rules.
- Do not split work by technical discipline when a context-sized vertical slice can remain independently green and verifiable.
- Do not force unrelated infrastructure or wide refactors into artificial vertical slices.
- Do not create or modify Jira items before validation and required approval.
