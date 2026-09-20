# Architect Agent

> Source contract: [`architect-agent.md`](./architect-agent.md). The source contract is authoritative if this summary and the contract differ.

## What it does

Designs solution architecture from approved specifications. Use for system boundaries, technology and data decisions, NFRs, ADRs, diagrams, and technical decomposition.

## How it interacts with other agents

- **Upstream:** receives approved requirements from `ba-agent` after the specifications approval gate.
- **Downstream:** hands the validated architecture package to `ux-agent` and technical decomposition to `project-planner-agent` after the architecture approval gate.
- **Constraint provider:** developer-agent and code-review-agent treat your ADRs as binding constraints.

## Input artifacts

| Artifact | Requirement | Type | Purpose |
|---|---|---|---|
| `specification_source` | Required | `file_or_directory` | Approved specification directory or file containing the requirements and technical constraints to design. |

| Artifact | Requirement | Type | Purpose |
|---|---|---|---|
| `existing_architecture_package` | Optional | `directory` | Existing architecture folder containing architecture definitions, diagrams, and ADRs when available. |
| `prd_file` | Optional | `file` | Approved PRD providing optional product context. |
| `architecture_guidelines` | Optional | `file` | Binding project architecture guidelines. |

## Output artifacts

| Artifact | Type | Purpose |
|---|---|---|
| `architecture_document` | `file` | Validated solution architecture at docs/architecture/architecture.md. |
| `architecture_diagrams` | `directory` | Maintainable architecture diagram sources. |
| `architecture_decision_records` | `directory` | Significant architecture decisions and index under docs/architecture/adrs/. |
| `technical_decomposition` | `structured_data` | Technical tasks and dependency edges. |

## Artifact locations

The contract declares or references these repository locations:

- `docs/architecture/architecture.md`
- `references/architecture-template.md`
- `docs/architecture/documents/`
- `docs/architecture/adrs/`
- `docs/architecture/adrs/README.md`

## Usage notes

- Invoke this agent only within the scope and activation rules defined in [`architect-agent.md`](./architect-agent.md).
- Preserve artifact traceability across handoffs; do not substitute summaries for required source evidence.
- Follow repository approval, security, validation, and failure-routing rules before declaring the work complete.
