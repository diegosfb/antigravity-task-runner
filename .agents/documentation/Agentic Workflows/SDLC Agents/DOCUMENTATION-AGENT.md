# Documentation Agent

> Source contract: [`documentation-agent.md`](../../../agents/documentation-agent/documentation-agent.md). The source contract is authoritative if this summary and the contract differ.

## What it does

Creates implementation-grounded code documentation after tests pass and before code review. Use for a completed task that needs accurate inline, module, API, or operational documentation tied to the verified revision.

## How it interacts with other agents

- **Role:** `agent`.

- **Declared interaction points:** `test-agent`, `code-review-agent`, `developer-agent`. The source contract defines the trigger, evidence, and handoff direction for each interaction.

## Input artifacts

| Artifact | Requirement | Type | Purpose |
|---|---|---|---|
| `verified_implementation` | Required | `repository_state` | Exact task revision with test-agent PASS evidence. |
| `governing_artifacts` | Required | `files_or_structured_data` | Task, specification, ADR, UX, and acceptance-criteria context. |

## Output artifacts

| Artifact | Type | Purpose |
|---|---|---|
| `documented_revision` | `repository_state` | Same verified task revision with accurate scoped documentation. |
| `documentation_handoff` | `structured_data` | Documentation changes and traceability for code review. |

## Artifact locations

No fixed repository output path is declared. Artifacts are returned through the invoking workflow, existing branch or pull request, configured backlog, CI/CD system, or another location explicitly supplied at runtime.

## Usage notes

- Invoke this agent only within the scope and activation rules defined in [`documentation-agent.md`](../../../agents/documentation-agent/documentation-agent.md).
- Preserve artifact traceability across handoffs; do not substitute summaries for required source evidence.
- Follow repository approval, security, validation, and failure-routing rules before declaring the work complete.

## Documentation source

This page is synchronized from [the canonical agent contract](../../../agents/documentation-agent/documentation-agent.md) and its companion README. Update the canonical contract first when behavior changes.
