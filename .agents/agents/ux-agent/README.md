# UX Agent

> Source contract: [`ux-agent.md`](./ux-agent.md). The source contract is authoritative if this summary and the contract differ.

## What it does

Owns the user experience. Works FROM the ADRs so designs respect real technical constraints. Produces a design package with a design document and wireframes, and embeds approved UX and accessibility requirements into the affected specifications. Use for any user-facing design work.

## How it interacts with other agents

- **Upstream:** receives the approved PRD and specifications plus the validated architecture package and ADRs after their respective gates.
- **Downstream:** hands the approved design package and updated specifications to `project-planner-agent`.

## Input artifacts

| Artifact | Requirement | Type | Purpose |
|---|---|---|---|
| `approved_product_context` | Required | `files` | Approved PRD and relevant feature specifications. |
| `workflow_configuration` | Required | `file` | UX/UI design approval-gate configuration. |

| Artifact | Requirement | Type | Purpose |
|---|---|---|---|
| `architecture_package` | Optional | `files_or_directory` | Approved architecture, diagrams, and applicable ADRs when available. |
| `research_and_evidence` | Optional | `files_or_structured_data` | Reviewed user research, meeting analysis, and feedback. |
| `existing_experience_system` | Optional | `files_or_repository_state` | Current UI, design system, patterns, and prior design artifacts. |

## Output artifacts

| Artifact | Type | Purpose |
|---|---|---|
| `design_package` | `directory` | Design folder containing the design document and wireframes. |
| `updated_specifications` | `files` | Affected specifications with approved UX, interaction, state, responsive, and accessibility requirements embedded. |

## Artifact locations

The contract declares or references these repository locations:

- `docs/design/`
- `docs/design/design.md`
- `docs/design/wireframes/`
- `docs/specs/`

## Usage notes

- Invoke this agent only within the scope and activation rules defined in [`ux-agent.md`](./ux-agent.md).
- Preserve artifact traceability across handoffs; do not substitute summaries for required source evidence.
- Follow repository approval, security, validation, and failure-routing rules before declaring the work complete.
