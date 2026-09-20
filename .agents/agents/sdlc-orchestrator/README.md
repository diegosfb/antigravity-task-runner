# SDLC Orchestrator

> Source contract: [`sdlc-orchestrator.md`](./sdlc-orchestrator.md). The source contract is authoritative if this summary and the contract differ.

## What it does

Entry-point orchestrator for the dsfb-sdlc v2 library. Reads the user's intent, consults routing-registry.yaml, and dispatches the correct workflow agent(s), then sequences artifact handoffs along the workflow. Start here unless you already know the exact specialist you need.

## How it interacts with other agents

- **Role:** `orchestrator`.

- **Declared interaction points:** `ux-agent`, `developer-agent`, `product-agent`, `red-team-agent`, `security-check-agent`, `architect-agent`. The source contract defines the trigger, evidence, and handoff direction for each interaction.

## Input artifacts

| Artifact | Requirement | Type | Purpose |
|---|---|---|---|
| `request` | Required | `text_or_structured_data` | User intent, scope, constraints, and authorization. |
| `routing_registry` | Required | `file` | Canonical targets, triggers, paths, and handoffs. |
| `workflow_configuration` | Required | `file` | Approval, validation, security, and automation settings. |

## Output artifacts

| Artifact | Type | Purpose |
|---|---|---|
| `routing_decision` | `structured_data` | Selected agent or workflow and expected artifact handoff. |
| `workflow_state` | `structured_data` | Stage status, approvals, blockers, and next owner. |
| `workflow_result` | `structured_data` | Validated final result for the authorized workflow boundary. |

## Artifact locations

No fixed repository output path is declared. Artifacts are returned through the invoking workflow, existing branch or pull request, configured backlog, CI/CD system, or another location explicitly supplied at runtime.

## Usage notes

- Invoke this agent only within the scope and activation rules defined in [`sdlc-orchestrator.md`](./sdlc-orchestrator.md).
- Preserve artifact traceability across handoffs; do not substitute summaries for required source evidence.
- Follow repository approval, security, validation, and failure-routing rules before declaring the work complete.
