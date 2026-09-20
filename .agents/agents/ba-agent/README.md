# BA Agent

> Source contract: [`ba-agent.md`](./ba-agent.md). The source contract is authoritative if this summary and the contract differ.

## What it does

Owns the WHAT of the project - translates product vision into concrete, testable requirements. Produces specs (to architect-agent) and acceptance criteria (to project-planner-agent). The acceptance criteria are the contract the test-agent later verifies against. Use whenever a feature idea must become an unambiguous specification.

## How it interacts with other agents

- **Upstream:** receives the approved PRD and supporting evidence from `product-agent` after the PRD approval gate.
- **Downstream:** hands approved specifications to `architect-agent` and their acceptance criteria to `project-planner-agent` after the specifications approval gate.
- **Downstream contract:** test-agent verifies code against YOUR acceptance criteria, not the developer's interpretation. Write them testable.

## Input artifacts

| Artifact | Requirement | Type | Purpose |
|---|---|---|---|
| `approved_prd` | Required | `file` | Approved product requirements and decisions. |
| `workflow_configuration` | Required | `file` | Specifications approval-gate configuration. |

| Artifact | Requirement | Type | Purpose |
|---|---|---|---|
| `supporting_evidence` | Optional | `file_or_directory` | Reviewed research, meeting analysis, and project context. |
| `existing_specifications` | Optional | `directory` | Existing specifications to reconcile or update. |
| `alternative_input_contract` | Optional | `text_or_files` | Developed conversation and verified repository evidence for explicit to-spec runs. |

## Output artifacts

| Artifact | Type | Purpose |
|---|---|---|
| `feature_specifications` | `directory` | Validated specifications for every in-scope feature. |
| `acceptance_criteria` | `structured_data` | Testable criteria for planning and verification. |

## Artifact locations

The contract declares or references these repository locations:

- `docs/specs/<feature-name>.md`
- `references/spec-template.md`

## Usage notes

- Invoke this agent only within the scope and activation rules defined in [`ba-agent.md`](./ba-agent.md).
- Preserve artifact traceability across handoffs; do not substitute summaries for required source evidence.
- Follow repository approval, security, validation, and failure-routing rules before declaring the work complete.
