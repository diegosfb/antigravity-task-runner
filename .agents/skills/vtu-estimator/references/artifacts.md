# AI Pods Offering Catalog — Artifacts & VTU Weights v6.0

All base VTU values are pre-AI-augmentation. Apply C×R×E multiplier at calculation time.
Expert keys map to `experts.md`. Allocation % must sum to 100% per artifact row.

---

## Product Definition (eFTE multiplier: 2.5×)

| Artifact Key | Description | Base VTUs | Validated By | Allocation % | Tokens/Unit |
|---|---|:---:|---|:---:|:---:|
| `prd_output` | Product Requirements Document (50–80pp) | 6 | `business_analyst` | 67% | 750,000 |
| `prd_output` | Product Requirements Document (50–80pp) | 6 | `product_manager` | 33% | 750,000 |
| `epics_output` | Epic-level backlog items | 0.5 | `business_analyst` | 77% | 85,000 |
| `epics_output` | Epic-level backlog items | 0.5 | `product_manager` | 23% | 85,000 |

---

## Product Delivery (eFTE multiplier: 3.3×)

| Artifact Key | Description | Base VTUs | Validated By | Allocation % | Tokens/Unit |
|---|---|:---:|---|:---:|:---:|
| `user_stories` | Detailed user stories with AC (INVEST) | 0.25 | `business_analyst` | 77% | 135,000 |
| `user_stories` | Detailed user stories with AC (INVEST) | 0.25 | `product_manager` | 23% | 135,000 |
| `platform_export_output_path` | Platform import files (Jira, Asana, ADO) | 0.1 | `business_analyst` | 100% | 800,000 |

---

## Software Architecture (eFTE multiplier: 1.67×)

| Artifact Key | Description | Base VTUs | Validated By | Allocation % | Tokens/Unit |
|---|---|:---:|---|:---:|:---:|
| `domain_boundaries` | Bounded Context Analysis | 8 | `solution_architect` | 67% | 3,900,000 |
| `domain_boundaries` | Bounded Context Analysis | 8 | `enterprise_architect` | 33% | 3,900,000 |
| `adrs_summary` | Architecture Decision Record (per ADR) | 0.5 | `enterprise_architect` | 100% | 230,000 |
| `target_architecture_foundation` | Target Architecture Foundation (C4, service catalog, deployment map) | 6 | `solution_architect` | 67% | 5,000,000 |
| `target_architecture_foundation` | Target Architecture Foundation (C4, service catalog, deployment map) | 6 | `enterprise_architect` | 33% | 5,000,000 |
| `target_architecture_specifications` | Target Architecture Specs (comms, data, security, observability, infra, migration) | 4 | `solution_architect` | 67% | 2,250,000 |
| `target_architecture_specifications` | Target Architecture Specs (comms, data, security, observability, infra, migration) | 4 | `enterprise_architect` | 33% | 2,250,000 |

---

## Code Development (eFTE multiplier: 1.67×)

| Artifact Key | Description | Base VTUs | Validated By | Allocation % | Tokens/Unit |
|---|---|:---:|---|:---:|:---:|
| `microservice` | Full microservice build (RPI cycle) | 7 | `senior_software_engineer` | 77% | 19,800,000 |
| `microservice` | Full microservice build (RPI cycle) | 7 | `technical_lead` | 23% | 19,800,000 |
| `frontend_view` | Frontend view/page (RPI cycle) | 3.5 | `senior_software_engineer` | 77% | 5,000,000 |
| `frontend_view` | Frontend view/page (RPI cycle) | 3.5 | `technical_lead` | 23% | 5,000,000 |
| `feature_implementation` | Complete feature (BE+FE+DB, RPI cycle) | 5 | `senior_software_engineer` | 77% | 5,500,000 |
| `feature_implementation` | Complete feature (BE+FE+DB, RPI cycle) | 5 | `technical_lead` | 23% | 5,500,000 |
| `bug_fix` | Bug fix with RCA (RPI cycle) | 2 | `senior_software_engineer` | 77% | 3,400,000 |
| `bug_fix` | Bug fix with RCA (RPI cycle) | 2 | `technical_lead` | 23% | 3,400,000 |
| `database_schema` | DB schema & migrations (RPI cycle) | 2 | `senior_software_engineer` | 100% | 6,000,000 |

---

## Quality Engineering Planning (eFTE multiplier: 2×)

| Artifact Key | Description | Base VTUs | Validated By | Allocation % | Tokens/Unit |
|---|---|:---:|---|:---:|:---:|
| `master_test_plan` | Master Test Plan | 3 | `qe_architect` | 100% | 1,900,000 |
| `test_strategy` | Test Strategy Document | 4 | `qe_architect` | 100% | 1,600,000 |
| `e2e_test_cases` | End-to-End Test Cases | 0.5 | `senior_test_engineer` | 100% | 40,000 |

---

## Quality Engineering Design (eFTE multiplier: 2×)

| Artifact Key | Description | Base VTUs | Validated By | Allocation % | Tokens/Unit |
|---|---|:---:|---|:---:|:---:|
| `test_cases` | Functional Test Cases per story (Gherkin) | 0.25 | `senior_test_engineer` | 100% | 35,000 |

---

## Quality Engineering Execution (eFTE multiplier: 2.5×)

| Artifact Key | Description | Base VTUs | Validated By | Allocation % | Tokens/Unit |
|---|---|:---:|---|:---:|:---:|
| `analysis_output_path` | Test case analysis (feasibility, complexity, gaps) | 0.5 | `senior_software_engineer` | 100% | 100,000 |
| `validated_test_cases_path` | Enhanced test cases with real selectors/MCP findings | 0.1 | `senior_test_engineer` | 100% | 100,000 |
| `framework_architecture_path` | Framework architecture documentation | 4 | `qe_architect` | 100% | 100,000 |
| `automation_plan_path` | Automation implementation plan | 2 | `automation_engineer` | 100% | 100,000 |
| `automation_code_path` | Generated automation code/scripts | 0.1 | `automation_engineer` | 100% | 100,000 |
| `execution_report_path` | Raw execution logs and results | 2 | `senior_test_engineer` | 100% | 100,000 |
| `analysis_summary_path` | Final analysis summary & defects report | 2 | `senior_test_engineer` | 100% | 100,000 |

---

## Legacy Insights (eFTE multiplier: 2×)

| Artifact Key | Description | Base VTUs | Validated By | Allocation % | Tokens/Unit |
|---|---|:---:|---|:---:|:---:|
| `knowledge_graph` | Codebase Knowledge Graph | 6 | `enterprise_architect` | 100% | 5,000,000 |
| `draft_documentation` | Documentation Drafts (per 50pp) | 2 | `business_analyst` | 77% | 2,000,000 |
| `draft_documentation` | Documentation Drafts (per 50pp) | 2 | `enterprise_architect` | 23% | 2,000,000 |
| `final_documentation_path` | Final approved documentation | 3 | `business_analyst` | 80% | 500,000 |
| `final_documentation_path` | Final approved documentation | 3 | `enterprise_architect` | 20% | 500,000 |

---

## UX Design (eFTE multiplier: 2.5×)

| Artifact Key | Description | Base VTUs | Validated By | Allocation % | Tokens/Unit |
|---|---|:---:|---|:---:|:---:|
| `design_mockups` | High-fidelity mockups | 2 | `ux_designer` | 100% | 500,000 |

---

## Data Quality (eFTE multiplier: 2×)

| Artifact Key | Description | Base VTUs | Validated By | Allocation % | Tokens/Unit |
|---|---|:---:|---|:---:|:---:|
| `data_pipelines` | Data Quality/Ingestion Pipelines | 3 | `senior_software_engineer` | 100% | 3,000,000 |

---

## Data Governance (eFTE multiplier: 2×)

| Artifact Key | Description | Base VTUs | Validated By | Allocation % | Tokens/Unit |
|---|---|:---:|---|:---:|:---:|
| `governance_policy` | Data Governance Policy/Catalog | 4 | `business_analyst` | 100% | 1,000,000 |
