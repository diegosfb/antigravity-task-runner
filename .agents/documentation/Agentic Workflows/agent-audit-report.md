# Agent Audit Report — 2026-08-28

## Portfolio assessment

The portfolio contains 14 top-level agents and 34 subagents. All definitions are cataloged, every top-level agent has a workflow page, and no relative Markdown links are broken. No exact duplicates were detected. The 23 similarity candidates are explained by shared parent templates or adjacent specialist domains; none currently warrants a merge or retirement.

Most definitions do not use the auditor's canonical `Inputs`, `Outputs`, `Ownership boundaries`, and `Completion` headings. Many convey equivalent contracts through `Responsibilities`, `Position in workflow`, `Response Format`, `Guardrails`, or compact consumes/produces blocks. Treat these warnings as a documentation-standardization backlog, not evidence that the agents are unusable.

## Qualitative overlap decisions

| Decision | Agent family | Usage evidence | Rationale and preservation plan |
|---|---|---|---|
| **KEEP SPECIALIZED** | `blockchain-architect`, `data-architect`, `databricks-architect`, `embedded-architect`, `iot-architect`, `mobile-architect` | `architect-agent` owns dispatch and activates specialists by domain; `sdlc-orchestrator` delegates subagent selection to that parent. | Similarity comes from their common consumes/produces contract. Each owns a distinct technology domain and produces design rather than code. Preserve all specialists and their activation conditions. |
| **KEEP SPECIALIZED** | `aws-sme`, `azure-sme`, `gcp-sme` | `consultant-agent` and `consulting-smes.md` route by named cloud platform; AWS and Azure are dormant while GCP is core-stack active. | Their consulting workflow is intentionally parallel, but service catalogs, operational guidance, and platform triggers differ. Preserve separate SMEs and explicit platform routing. |
| **KEEP + SHARPEN** | `embedded-developer`, `iot-developer` | `developer-agent` activates them from different backlog scopes and both definitions state the firmware-versus-connectivity split. | The boundary already exists: embedded owns firmware internals; IoT owns connectivity, fleet, and cloud ingestion. Repeat that exclusion in trigger metadata if misrouting is observed. |
| **KEEP SPECIALIZED** | `fe-developer`, `mobile-developer` | Both are dispatched by `developer-agent`, but one consumes web/frontend tasks and the other mobile tasks. | Shared UI and accessibility language is expected. Preserve platform-specific implementation ownership. |
| **KEEP SPECIALIZED** | `iot-architect`, `iot-developer` | The architect produces ADR-ready design and decomposition; the developer consumes ADRs and implements device/cloud code. | The names overlap by domain, but lifecycle, authority, and outputs are deliberately separate. Preserve the design/implementation handoff. |
| **KEEP SPECIALIZED** | `blockchain-developer` with `mobile-developer` or `iot-developer` | All are dormant implementation specialists selected from backlog scope by `developer-agent`. | Low similarity is caused by the common implementation-subagent contract, not interchangeable responsibilities. No routing change is needed. |

## Summary

| Agent | Type | Verdict | Missing sections | Broken links | Overlap candidates |
|---|---|---|---:|---:|---:|
| `architect-agent` | agent | WARN | 4 | 0 | 0 |
| `blockchain-architect` | subagent | WARN | 4 | 0 | 5 |
| `data-architect` | subagent | WARN | 4 | 0 | 5 |
| `databricks-architect` | subagent | WARN | 4 | 0 | 5 |
| `embedded-architect` | subagent | WARN | 4 | 0 | 5 |
| `iot-architect` | subagent | WARN | 4 | 0 | 6 |
| `mobile-architect` | subagent | WARN | 4 | 0 | 5 |
| `ba-agent` | agent | WARN | 4 | 0 | 0 |
| `code-review-agent` | agent | WARN | 4 | 0 | 0 |
| `consultant-agent` | agent | WARN | 4 | 0 | 0 |
| `ai-advisor` | subagent | WARN | 4 | 0 | 0 |
| `aws-sme` | subagent | WARN | 4 | 0 | 2 |
| `azure-sme` | subagent | WARN | 4 | 0 | 2 |
| `cloud-consumption-estimation` | subagent | WARN | 4 | 0 | 0 |
| `doc-generator` | subagent | WARN | 4 | 0 | 0 |
| `explain-me` | subagent | WARN | 3 | 0 | 0 |
| `explain-new-contributions` | subagent | WARN | 2 | 0 | 0 |
| `gcp-sme` | subagent | WARN | 4 | 0 | 2 |
| `humanizer` | subagent | WARN | 3 | 0 | 0 |
| `industry-sme` | subagent | WARN | 3 | 0 | 0 |
| `mergers-and-integrations` | subagent | WARN | 3 | 0 | 0 |
| `pre-mortem-agent` | subagent | WARN | 2 | 0 | 0 |
| `snowflake-sme` | subagent | WARN | 4 | 0 | 0 |
| `software-tutor` | subagent | WARN | 4 | 0 | 0 |
| `sounding-board-agent` | subagent | WARN | 4 | 0 | 0 |
| `web-search` | subagent | WARN | 4 | 0 | 0 |
| `deployment-agent` | agent | WARN | 4 | 0 | 0 |
| `developer-agent` | agent | WARN | 4 | 0 | 0 |
| `be-developer` | subagent | WARN | 4 | 0 | 0 |
| `blockchain-developer` | subagent | WARN | 4 | 0 | 2 |
| `data-developer` | subagent | WARN | 4 | 0 | 0 |
| `databricks-developer` | subagent | WARN | 4 | 0 | 0 |
| `embedded-developer` | subagent | WARN | 4 | 0 | 1 |
| `fe-developer` | subagent | WARN | 4 | 0 | 1 |
| `iot-developer` | subagent | WARN | 4 | 0 | 3 |
| `mobile-developer` | subagent | WARN | 4 | 0 | 2 |
| `llm-judge-agent` | agent | WARN | 4 | 0 | 0 |
| `obsidian-vault-agent` | agent | WARN | 4 | 0 | 0 |
| `product-agent` | agent | WARN | 4 | 0 | 0 |
| `project-planner-agent` | agent | WARN | 4 | 0 | 0 |
| `sdlc-orchestrator` | agent | WARN | 4 | 0 | 0 |
| `spec-validation-agent` | agent | WARN | 4 | 0 | 0 |
| `security-check-agent` | subagent | WARN | 2 | 0 | 0 |
| `spec-drift-checker` | subagent | WARN | 3 | 0 | 0 |
| `spec-red-team` | subagent | WARN | 2 | 0 | 0 |
| `red-team-agent` | subagent | WARN | 3 | 0 | 0 |
| `test-agent` | agent | WARN | 4 | 0 | 0 |
| `ux-agent` | agent | WARN | 4 | 0 | 0 |

## Duplicate and overlap candidates

| Agents | Exact duplicate | Similarity | Required review |
|---|---|---:|---|
| `embedded-architect` / `mobile-architect` | no | 0.533 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `blockchain-architect` / `mobile-architect` | no | 0.530 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `blockchain-architect` / `embedded-architect` | no | 0.520 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `databricks-architect` / `iot-architect` | no | 0.512 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `data-architect` / `databricks-architect` | no | 0.508 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `embedded-architect` / `iot-architect` | no | 0.504 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `databricks-architect` / `embedded-architect` | no | 0.496 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `databricks-architect` / `mobile-architect` | no | 0.467 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `iot-architect` / `mobile-architect` | no | 0.465 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `blockchain-architect` / `databricks-architect` | no | 0.446 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `blockchain-architect` / `iot-architect` | no | 0.423 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `azure-sme` / `gcp-sme` | no | 0.421 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `data-architect` / `iot-architect` | no | 0.394 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `data-architect` / `mobile-architect` | no | 0.389 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `fe-developer` / `mobile-developer` | no | 0.389 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `blockchain-architect` / `data-architect` | no | 0.373 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `aws-sme` / `azure-sme` | no | 0.370 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `data-architect` / `embedded-architect` | no | 0.370 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `embedded-developer` / `iot-developer` | no | 0.368 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `iot-architect` / `iot-developer` | no | 0.364 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `aws-sme` / `gcp-sme` | no | 0.358 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `blockchain-developer` / `mobile-developer` | no | 0.352 | Compare triggers, authority, outputs, callers, and preservation needs. |
| `blockchain-developer` / `iot-developer` | no | 0.350 | Compare triggers, authority, outputs, callers, and preservation needs. |

## Catalog and workflow documentation drift

- Missing catalog entries: none
- Missing top-level workflow pages: none
