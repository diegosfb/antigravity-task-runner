# Code Review Agent

> Source contract: [`code-review-agent.md`](./code-review-agent.md). The source contract is authoritative if this summary and the contract differ.

## What it does

The quality gate. Consumes passing code and reviews for correctness, security, maintainability, and ADR conformance. Emits change requests (loop back to developer-agent) or an approved PR (to deployment-agent). Absorbs security-reviewer - security is a review lens here, not a separate stage.

## How it interacts with other agents

- **Upstream:** receives a tested, finalized branch or pull request from `developer-agent` after `test-agent` PASS and required specification and security validation.
- **Downstream:** returns actionable change requests to `developer-agent`, or hands an explicitly approved merged pull request to `deployment-agent`.

## Input artifacts

| Artifact | Requirement | Type | Purpose |
|---|---|---|---|
| `review_candidate` | Required | `repository_state` | Tested branch or pull request and complete diff. |
| `verification_evidence` | Required | `structured_data` | Test PASS and required validation results. |
| `governing_contracts` | Required | `files_or_structured_data` | Backlog scope, specifications, acceptance criteria, ADRs, and design constraints. |
| `workflow_configuration` | Required | `file` | Pull-request merge gate and repository workflow configuration. |

| Artifact | Requirement | Type | Purpose |
|---|---|---|---|
| `prior_review_context` | Optional | `structured_data` | Earlier findings, responses, and tracked defect references. |

## Output artifacts

| Artifact | Type | Purpose |
|---|---|---|
| `review_decision` | `structured_data` | Evidence-backed approval or changes-requested verdict. |
| `change_requests` | `structured_data` | Actionable findings returned to developer-agent when review fails. |
| `approved_pr` | `repository_reference` | Validated and explicitly approved merged pull request for deployment-agent. |

## Artifact locations

No fixed repository output path is declared. Artifacts are returned through the invoking workflow, existing branch or pull request, configured backlog, CI/CD system, or another location explicitly supplied at runtime.

## Usage notes

- Invoke this agent only within the scope and activation rules defined in [`code-review-agent.md`](./code-review-agent.md).
- Preserve artifact traceability across handoffs; do not substitute summaries for required source evidence.
- Follow repository approval, security, validation, and failure-routing rules before declaring the work complete.
