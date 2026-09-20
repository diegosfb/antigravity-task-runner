# Security Check Agent

> Source contract: [`security-check-agent.md`](./security-check-agent.md). The source contract is authoritative if this summary and the contract differ.

## What it does

Blocking security assurance subagent of spec-validation-agent. Reviews the staged diff before agent-managed commits and the complete branch diff before agent-managed pull requests. Detects secrets, unsafe credential files, hollow auth/security controls, unsafe logging, weak cryptography, injection risks, dependency concerns, and inadequate security-focused tests. Produces PASS or FAIL with actionable evidence; never fixes code.

## How it interacts with other agents

- **Parent orchestrator:** `spec-validation-agent` dispatches this subagent and integrates its return.

- **Declared interaction points:** `developer-agent`, `project-planner-agent`. The source contract defines the trigger, evidence, and handoff direction for each interaction.

## Input artifacts

- **Pre-commit:** the exact staged diff, staged file list, applicable specs and
  ADRs, security classification, and tests that cover the change.
- **Pre-PR:** the complete branch diff against its target branch, commit list,
  applicable specs/ADRs, and full validation evidence.
- `.agents/guidelines/security.md` and the security references under
  `.agents/agents/code-review-agent/references/` are mandatory baselines.

Inspect changed implementation and its call paths far enough to determine
whether controls are real rather than decorative. Stay read-only: report
findings to `developer-agent`; do not edit code, tests, configuration, history,
or backlog items.

## Output artifacts

Return the bounded result described by this agent's responsibilities to the parent agent or direct caller. Include the requested deliverable or findings, supporting evidence, explicit assumptions, material risks or limitations, confidence, and unresolved questions.

## Artifact locations

No fixed repository output path is declared. Artifacts are returned through the invoking workflow, existing branch or pull request, configured backlog, CI/CD system, or another location explicitly supplied at runtime.

## Usage notes

- Invoke this agent only within the scope and activation rules defined in [`security-check-agent.md`](./security-check-agent.md).
- Preserve artifact traceability across handoffs; do not substitute summaries for required source evidence.
- Follow repository approval, security, validation, and failure-routing rules before declaring the work complete.
