# LLM Judge Agent

> Source contract: [`llm-judge-agent.md`](./llm-judge-agent.md). The source contract is authoritative if this summary and the contract differ.

## What it does

Optional cross-model quality gate. After an architecture design, solutioning pass, or implementation is done, it has a DIFFERENT LLM than the one that produced the work judge it against rubrics - scoring quality, flagging risks, and proposing prioritized improvements. Advisory - its verdict routes back to the producing agent; it never edits artifacts and never replaces the test-agent or code-review-agent gates. Use after architect-agent output, a major solutioning decision, or a completed implementation when you want an independent second opinion.

## How it interacts with other agents

- **Consumes (by artifact type):**
  - **Architecture:** `docs/architecture/architecture.md` + `docs/architecture/adrs/` + the specs they answer + `docs/architecture/development_guidelines.md` (the binding guardrails).
  - **Solutioning:** a technical decomposition, design proposal, or ADR set + the spec/PRD it serves.
  - **Implementation:** the feature branch diff + the backlog item + acceptance criteria + the ADRs that bind it.
- **Produces:** a judgment report at `docs/reviews/judge-<phase>-<slug>-<YYYY-MM-DD>.md`: rubric scores, evidence-backed findings, prioritized improvements, and a verdict.
- **Verdict routing:** ACCEPT / ACCEPT-WITH-IMPROVEMENTS → the producing agent decides what to adopt; REWORK → back to the producing agent (`architect-agent` for design, `developer-agent` for code) with the findings. You are advisory: you do NOT gate the workflow, and PASS here never skips test-agent or code-review-agent.
- **Trigger:** on-demand by default. `ADLC_workflow_settings.json` (project root, `llm_judge.trigger_mode`) can make the producing agents invoke you automatically — after architecture, after risky dev tasks, or after every dev task. Missing file = on-demand.

## Input artifacts

- **Artifact under judgment:** an architecture package, solutioning proposal, ADR set, or implementation branch diff.
- **Binding context:** the applicable PRD or specification, acceptance criteria, ADRs, development guidelines, and backlog item.
- **Author provenance:** `generated_by` metadata for documents or the `Generated-by` commit trailer for implementation work.
- **Judge configuration:** `llm_judge` settings from `ADLC_workflow_settings.json`, including the judge provider, command, and trigger mode.
- **Rubric:** the matching evaluation rubric from `references/judging-rubrics.md`.

## Output artifacts

- **Judgment report:** rubric scores, evidence-backed findings, prioritized improvements, limitations, judge provenance, and an `ACCEPT`, `ACCEPT-WITH-IMPROVEMENTS`, or `REWORK` verdict.
- **Advisory handoff:** `REWORK` returns to the producing agent; accepted results remain advisory and never replace Test Agent or Code Review Agent approval.

## Artifact locations

- Judgment reports: `docs/reviews/judge-<phase>-<slug>-<YYYY-MM-DD>.md`
- Architecture inputs: `docs/architecture/architecture.md`, `docs/architecture/adrs/`, and applicable specifications
- Judge configuration: `ADLC_workflow_settings.json`
- Rubrics: `references/judging-rubrics.md`

## Usage notes

- Invoke this agent only within the scope and activation rules defined in [`llm-judge-agent.md`](./llm-judge-agent.md).
- Preserve artifact traceability across handoffs; do not substitute summaries for required source evidence.
- Follow repository approval, security, validation, and failure-routing rules before declaring the work complete.
