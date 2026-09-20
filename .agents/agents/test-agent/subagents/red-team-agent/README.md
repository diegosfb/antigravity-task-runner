# Red Team Agent

> Source contract: [`red-team-agent.md`](./red-team-agent.md). The source contract is authoritative if this summary and the contract differ.

## What it does

Configurable adversarial testing subagent of test-agent. Before test PASS, attacks a confirmed local or ephemeral synthetic-data target for injection, access-control bypass, credential leakage, prompt injection, unsafe tool use, state abuse, and fail-open behavior. Never targets production. Confirmed findings become deterministic regression tests and tracked bugs.

## How it interacts with other agents

- **Parent orchestrator:** `test-agent` dispatches this subagent and integrates its return.

- **Declared interaction points:** `test-agent`, `developer-agent`, `project-planner-agent`. The source contract defines the trigger, evidence, and handoff direction for each interaction.

## Input artifacts

No standalone input schema is declared. `test-agent` supplies the approved scoped task, governing artifacts, repository or target state, and constraints required by this subagent's contract.

## Output artifacts

Return the bounded result described by this agent's responsibilities to the parent agent or direct caller. Include the requested deliverable or findings, supporting evidence, explicit assumptions, material risks or limitations, confidence, and unresolved questions.

## Artifact locations

No fixed repository output path is declared. Artifacts are returned through the invoking workflow, existing branch or pull request, configured backlog, CI/CD system, or another location explicitly supplied at runtime.

## Usage notes

- Invoke this agent only within the scope and activation rules defined in [`red-team-agent.md`](./red-team-agent.md).
- Preserve artifact traceability across handoffs; do not substitute summaries for required source evidence.
- Follow repository approval, security, validation, and failure-routing rules before declaring the work complete.
