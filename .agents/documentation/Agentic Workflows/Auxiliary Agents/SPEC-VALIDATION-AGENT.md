# Spec Validation Agent

> Source contract: [`spec-validation-agent.md`](../../../agents/spec-validation-agent/spec-validation-agent.md). The source contract is authoritative if this summary and the contract differ.

## What it does

Spec-validation and security-assurance parent. Dispatches advisory spec-drift/spec-red-team checks plus the blocking security-check-agent used before agent-managed commits and pull requests. The security checker verifies secrets, real enforcement, cryptography, logging, injection defenses, and security-test quality without fixing code.

## How it interacts with other agents

- **Upstream:** receives an exact candidate change and its governing specifications from `developer-agent`, or an explicitly authorized advisory-security request from a workflow or user.
- **Downstream:** returns drift and security findings to `developer-agent`, specification gaps to `ba-agent`, validation evidence to the invoking workflow, and confirmed regression-test references for human review.
- **Not a gate:** a clean validation pass never substitutes for test-agent (acceptance criteria) or code-review-agent (quality + deep security). You run *alongside* them, earlier and advisory.

## Input artifacts

| Artifact | Requirement | Type | Purpose |
|---|---|---|---|
| `candidate_change` | Required | `repository_state_or_file` | Exact artifact, staged diff, or branch diff under review. |
| `governing_specifications` | Required | `files` | Approved specifications and enforceable acceptance criteria. |
| `validation_request` | Required | `structured_data` | Requested check, lifecycle gate, and bounded scope. |
| `workflow_configuration` | Required | `file` | Spec-validation and security-check trigger configuration. |

| Artifact | Requirement | Type | Purpose |
|---|---|---|---|
| `security_context` | Optional | `structured_data` | Classification, threat context, and confirmed ephemeral target. |
| `prior_findings` | Optional | `files_or_structured_data` | Earlier reports, dispositions, and regression evidence. |

## Output artifacts

| Artifact | Type | Purpose |
|---|---|---|
| `validation_report` | `structured_data` | Consolidated verdicts, evidence, findings, and return paths. |
| `conformance_verdict` | `structured_data` | Conformant, drift, specification-gap, or review-needed result. |
| `security_verdict` | `structured_data` | Blocking PASS, FAIL, or BLOCKED for configured commit or PR gates. |
| `advisory_findings` | `structured_data` | Ranked red-team findings and confirmed regression-test references. |

## Artifact locations

The contract declares or references these repository locations:

- `docs/reviews/`

## Usage notes

- Invoke this agent only within the scope and activation rules defined in [`spec-validation-agent.md`](../../../agents/spec-validation-agent/spec-validation-agent.md).
- Preserve artifact traceability across handoffs; do not substitute summaries for required source evidence.
- Follow repository approval, security, validation, and failure-routing rules before declaring the work complete.

## Documentation source

This page is synchronized from [the canonical agent contract](../../../agents/spec-validation-agent/spec-validation-agent.md) and its companion README. Update the canonical contract first when behavior changes.
