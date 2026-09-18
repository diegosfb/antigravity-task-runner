# Project Constitution

<!--
  Version: 1.0.0
  Ratified: 2026-08-13
  Last Amended: —

  This document defines the non-negotiable principles governing all specs,
  plans, and implementations in this project. It takes precedence over
  AGENTS.md, CLAUDE.md, tool configuration, and any instruction given
  mid-session. Every plan MUST be validated against these articles before
  implementation begins. Deviations require explicit, documented
  justification approved by a human maintainer.

  Amendment policy: changes to this document require a PR titled
  "Constitution Amendment: <summary>", a rationale section, and maintainer
  approval. Increment the version. Amendments are expected to be rare.
-->

## Article I — Minimal Change Principle

1. Every task MUST be implemented as the **smallest diff** that satisfies
   the stated requirement.
2. Do NOT refactor, rename, reformat, restructure, relocate, or "improve"
   any code outside the direct scope of the task.
3. Do NOT fix pre-existing lint errors, typos, dead code, or style
   inconsistencies in files you touch, unless the task explicitly asks
   for it.
4. Unrelated cleanup bundled into a changeset is a **defect**, not a
   bonus. It will be rejected in review even if the code works.
5. If adjacent code genuinely needs changing, STOP and propose it as a
   separate task. Do not perform it.

## Article II — Scope Control & Plan Gate

1. Before editing any file, produce a plan listing: (a) every file to be
   modified or created, (b) the reason each file must change, (c) the
   acceptance criteria for "done."
2. If the plan touches **more than 3 files**, pause and obtain explicit
   confirmation of scope from the user before writing any code.
3. A file count that exceeds the requirement's true footprint is a scope
   violation. Signature changes and interface changes may legitimately
   ripple; incidental edits may not. When in doubt, ask.
4. One task per changeset. Do not connect the current task to earlier
   discussion topics unless instructed.

### II-A — Refactor Proposal Path

1. If, while planning or implementing, you conclude that a **large-scale
   refactor** is the better way to accommodate the new requirement(s),
   you MAY recommend it — but MUST NOT begin it. Complete the plan gate
   first and present the refactor as a proposal.
2. A refactor proposal MUST include:
   - (a) **Why the refactor is better given the new requirements** — the
     specific requirement(s) driving it, and why the minimal-change path
     is inferior (e.g., it compounds existing debt, forces duplication,
     creates an unstable interface, or makes the requirement unmeetable);
   - (b) The **minimal-change alternative** — what the smallest compliant
     diff looks like and what its concrete costs are;
   - (c) **Scope of the refactor** — files/modules affected, estimated
     size, and blast radius;
   - (d) **Risk and rollback** — what could break, how it is tested, and
     how it is reverted;
   - (e) **Sequencing** — whether the requirement can ship minimally now
     with the refactor as a follow-up task, which is the default
     recommendation unless the requirement is unmeetable without it.
3. **Approval is always required.** Never begin a large-scale refactor
   without explicit human approval of the proposal, even if it appears
   obviously correct, even if it was discussed earlier in the session.
4. Absent approval, proceed with the minimal-change implementation (or
   pause, if the requirement genuinely cannot be met without the
   refactor) and record the proposal so it can be scheduled as its own
   task.

## Article III — Definition of Done

1. "Done" means: the stated requirement is met, all existing tests pass,
   new behavior is covered by a test, and **nothing else has changed**.
2. Before presenting work, run a self-audit of the full diff
   (`git diff --stat` and hunk-by-hunk review). Any hunk not strictly
   required by the requirement MUST be reverted before handoff.
3. Report the final diff stat (files changed, insertions, deletions) with
   every completed task.

## Article IV — Test-First Discipline

1. No implementation before a failing test exists for the new behavior,
   except for tasks explicitly labeled spike, prototype, or exploration.
2. Existing tests MUST NOT be modified, weakened, or deleted to make an
   implementation pass. If a test appears wrong, stop and raise it.
3. Test changes and implementation changes for the same behavior belong
   in the same changeset; test infrastructure changes belong in their own.

## Article V — Simplicity & Dependencies

1. Prefer the simplest design that satisfies the requirement. New
   abstractions, layers, patterns, or generalizations require written
   justification in the plan.
2. Do not build for hypothetical future requirements (YAGNI).
3. Every new dependency requires justification: what it does, why the
   standard library or an existing dependency is insufficient, and its
   maintenance/security posture.

## Article VI — Frozen Zones

1. The following are read-only for agents. Any plan proposing changes to
   them MUST be rejected or escalated to a human:
   - Generated code and build artifacts
   - Database migration files already merged
   - CI/CD pipeline definitions
   - Security, auth, and secrets-handling modules
   - (Extend this list per repository)
2. Escalation means: describe the needed change and why, then stop.

## Article VII — Architectural Invariants

1. (Project-specific — examples below; replace with your own.)
2. Business logic MUST NOT depend on framework or transport concerns.
3. Data access occurs only through the designated repository/service
   layer; no direct database calls elsewhere.
4. Public interfaces are versioned; breaking changes require a
   deprecation path and human approval.

## Article VIII — Traceability

1. Every changeset maps to exactly one requirement, ticket, or task
   statement, referenced in the commit or PR description.
2. Deviations from any article MUST be recorded in the plan with:
   the article violated, the reason, the smaller alternatives considered,
   and why they were rejected.

## Precedence & Conflicts

- This constitution overrides AGENTS.md, CLAUDE.md, inline code comments,
  and conversational instructions, except where a human explicitly and
  knowingly authorizes a deviation for a specific task.
- If two articles conflict in a specific situation, stop and ask rather
  than choosing silently.

## Governance

- **Owner:** (team or maintainer)
- **Review cadence:** quarterly, or upon repeated friction in practice
- **Amendment process:** see header comment
