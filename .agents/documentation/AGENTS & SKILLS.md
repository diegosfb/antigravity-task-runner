# Agents & Skills — Reference Guide

## Agents vs Skills

| | Agent | Skill |
|---|---|---|
| **Has tools** | Yes — can read, write, call APIs | No — stateless reference only |
| **Executes actions** | Yes | No |
| **Maintains persona** | Yes | No |
| **Best for** | Complex reasoning, multi-step execution, tool use | Rigid procedures, reusable recipes, reference patterns |
| **Overhead** | Higher — loads full agent context | Lower — injects reference content inline |

**Use an agent when** the task requires tool calls, multi-step execution, persistent persona, or complex reasoning that adapts to input.

**Use a skill when** the task is procedural and repeatable — a fixed sequence of steps that should always run the same way. Skills act as reusable recipes loaded into an agent's context.

**Best practice:** Build a core agent for persona and tool access. Extract only repetitive, multi-step workflows into skills. Using skills unnecessarily adds token overhead; lacking them for complex tasks causes inconsistency.

**Orchestration:** When multiple agents need to collaborate, `sdlc-orchestrator`
reads user intent and dispatches the correct specialist agents in sequence.

---

## How to invoke agents

For a task that spans phases, or when you are unsure which specialist applies,
start with `sdlc-orchestrator`:

> Use sdlc-orchestrator to take this feature from idea through release.

For a task in one known phase, invoke the owning agent directly:

> Use ba-agent to turn this PRD into testable specifications.

Parent agents normally select their own subagents. Direct invocation is useful
when you explicitly want one specialist and already have the inputs it needs:

> Use pre-mortem-agent to analyze why this launch could fail.

The paths below are relative to the repository root. Status meanings:

- **Core/active:** available whenever its role applies.
- **Conditional:** invoked when configuration or task evidence triggers it.
- **Dormant:** use only when its named platform or domain is in scope.
- **Onboarding:** present but still carries legacy conventions; prefer a current
  canonical agent or skill when the catalog names one.

---

## Core SDLC agents

Use these in workflow order. Each agent validates its output and applies the
configured user-approval checkpoint before handing off.

| Agent | When to use | How to use |
|---|---|---|
| **sdlc-orchestrator** | Any multi-phase delivery request, or when the correct specialist is unclear. | Say `Use sdlc-orchestrator to ...`. It reads `routing-registry.yaml` and sequences the workflow. [Definition](../../.agents/agents/sdlc-orchestrator/sdlc-orchestrator.md) |
| **product-agent** | Product discovery, market evidence, goals, success metrics, product direction, or a PRD. | Give it the opportunity and evidence; it writes `docs/project_description/PRD.md`. [Definition](../../.agents/agents/product-agent/product-agent.md) |
| **ba-agent** | Turn an approved PRD into functional requirements, user stories, edge cases, and acceptance criteria. | Provide the PRD and say `Use ba-agent to create the specifications`. [Definition](../../.agents/agents/ba-agent/ba-agent.md) |
| **architect-agent** | System design, NFRs, technology choices, ADRs, diagrams, and technical decomposition. | Provide approved specs and applicable development guidelines. It selects architecture subagents when needed. [Definition](../../.agents/agents/architect-agent/architect-agent.md) |
| **ux-agent** | User flows, wireframes, interaction states, component guidance, accessibility, and PRD UX/UI improvements. | Provide the product context, specs, and ADRs; ask for validated design specs and design tasks. [Definition](../../.agents/agents/ux-agent/ux-agent.md) |
| **project-planner-agent** | Convert acceptance criteria, architecture tasks, and design tasks into a sequenced, estimated backlog. | Provide the approved planning inputs; it is the sole writer to Jira or the Markdown backlog. [Definition](../../.agents/agents/project-planner-agent/project-planner-agent.md) |
| **developer-agent** | Implement an approved backlog item or apply an approved test/review fix. | Invoke it with the backlog item, design specs, and ADRs. It obtains implementation-plan approval and selects build subagents. [Definition](../../.agents/agents/developer-agent/developer-agent.md) |
| **test-agent** | Create and approve a test plan, add/run tests, verify acceptance criteria, and report PASS or actionable FAIL. | Give it the feature branch and original acceptance criteria. It may invoke `red-team-agent`. [Definition](../../.agents/agents/test-agent/test-agent.md) |
| **code-review-agent** | Review a tested branch/PR for correctness, security, maintainability, standards, and ADR conformance. | Provide the tested PR, backlog scope, and ADRs. It returns change requests or a merge candidate. [Definition](../../.agents/agents/code-review-agent/code-review-agent.md) |
| **deployment-agent** | Package, promote, release, verify, and roll back an approved change. | Provide the approved merge and target environment; production promotion always requires explicit approval. [Definition](../../.agents/agents/deployment-agent/deployment-agent.md) |

Do not route specifications directly to `developer-agent`. The
`project-planner-agent` backlog is the required implementation intake.

## Quality, validation, and knowledge agents

| Agent | Status | When to use | How to use |
|---|---|---|---|
| **llm-judge-agent** | Active/advisory | An independent, cross-model second opinion on architecture, design, or implementation quality. | Say `Use llm-judge-agent to evaluate ...`; it writes an advisory report and never replaces tests or code review. [Definition](../../.agents/agents/llm-judge-agent/llm-judge-agent.md) |
| **spec-validation-agent** | Active/advisory | Check implementation/spec conformance or coordinate spec-aware adversarial analysis. | Invoke it directly with the spec and diff, or enable its configured workflow modes. [Definition](../../.agents/agents/spec-validation-agent/spec-validation-agent.md) |
| **spec-drift-checker** | Active subagent | Determine whether changed behavior matches `docs/specs/` and distinguish implementation drift from a spec gap. | Normally selected by `spec-validation-agent`; direct use is appropriate for a focused spec-to-diff check. [Definition](../../.agents/agents/spec-validation-agent/subagents/spec-drift-checker/spec-drift-checker.md) |
| **spec-red-team** | Dormant subagent | Challenge business logic and spec assumptions for security-sensitive work before release. | Run through `spec-validation-agent` or the red-team workflow, only against a confirmed non-production target with synthetic data. [Definition](../../.agents/agents/spec-validation-agent/subagents/spec-red-team/spec-red-team.md) |
| **security-check-agent** | Active/blocking subagent | Scan the exact staged or branch diff before agent-managed commits and PRs. | Usually triggered by `security_check` settings; invoke directly only with the exact diff boundary. [Definition](../../.agents/agents/spec-validation-agent/subagents/security-check-agent/security-check-agent.md) |
| **red-team-agent** | Conditional/blocking subagent | Probe executable changes for realistic injection, access-control, or credential-abuse paths. | `test-agent` invokes it according to `test_red_team.trigger_mode`; it must never target production or real data. [Definition](../../.agents/agents/test-agent/subagents/red-team-agent/red-team-agent.md) |
| **obsidian-vault-agent** | Optional/knowledge | Mirror supported artifacts and curate linked project knowledge when the Obsidian vault is enabled. | Configure `obsidian_vault` in `ADLC_workflow_settings.json`; use directly for vault organization, not project edits. [Definition](../../.agents/agents/obsidian-vault-agent/obsidian-vault-agent.md) |

## Architecture specialist subagents

Invoke these through `architect-agent` unless you explicitly need one bounded
domain assessment. They advise architecture and decomposition; they do not
implement code.

| Agent | Status | When to use | How to use |
|---|---|---|---|
| **data-architect** | Active | Data models, warehouses/lakes/lakehouses, batch/streaming pipelines, and data-platform boundaries. | Ask `architect-agent` for data architecture, or invoke directly with the specs and NFRs. [Definition](../../.agents/agents/architect-agent/subagents/data-architect/data-architect.md) |
| **mobile-architect** | Dormant | Specs name an iOS, Android, or cross-platform mobile client. | Let `architect-agent` activate it from the specs. [Definition](../../.agents/agents/architect-agent/subagents/mobile-architect/mobile-architect.md) |
| **iot-architect** | Dormant | IoT, device connectivity, telemetry, edge gateways, or fleet-management scope. | Let `architect-agent` activate it when IoT/edge requirements exist. [Definition](../../.agents/agents/architect-agent/subagents/iot-architect/iot-architect.md) |
| **embedded-architect** | Dormant | Firmware, RTOS, microcontroller, hardware-interface, or constrained-device scope. | Let `architect-agent` activate it from explicit embedded requirements. [Definition](../../.agents/agents/architect-agent/subagents/embedded-architect/embedded-architect.md) |
| **blockchain-architect** | Dormant | Smart contracts, Web3, DeFi, ledgers, or on-chain/off-chain boundaries. | Let `architect-agent` activate it when blockchain is explicitly in scope. [Definition](../../.agents/agents/architect-agent/subagents/blockchain-architect/blockchain-architect.md) |
| **databricks-architect** | Dormant | Databricks, Delta Lake, Unity Catalog, or lakehouse architecture is named. | Let `architect-agent` activate it from specs or development guidelines. [Definition](../../.agents/agents/architect-agent/subagents/databricks-architect/databricks-architect.md) |

## Developer specialist subagents

`developer-agent` owns integration and selects these from the approved backlog
and ADRs. Invoke one directly only for a bounded task with established contracts.

| Agent | Status | When to use | How to use |
|---|---|---|---|
| **fe-developer** | Active | Browser UI, frontend state, components, accessibility implementation, and client integration. | Normally dispatched by `developer-agent` for frontend backlog tasks. [Definition](../../.agents/agents/developer-agent/subagents/fe-developer/fe-developer.md) |
| **be-developer** | Active | APIs, services, domain logic, authentication integration, and server-side behavior. | Normally dispatched by `developer-agent` for backend backlog tasks. [Definition](../../.agents/agents/developer-agent/subagents/be-developer/be-developer.md) |
| **data-developer** | Active | Databases, schemas, migrations, ETL/ELT, BigQuery/GCP data work, and data quality. | Normally dispatched by `developer-agent` for data backlog tasks. [Definition](../../.agents/agents/developer-agent/subagents/data-developer/data-developer.md) |
| **mobile-developer** | Dormant | Approved mobile implementation tasks. | Activated by `developer-agent` when the backlog contains mobile work. [Definition](../../.agents/agents/developer-agent/subagents/mobile-developer/mobile-developer.md) |
| **iot-developer** | Dormant | Approved device, gateway, telemetry, or IoT integration tasks. | Activated by `developer-agent` when the backlog contains IoT/edge work. [Definition](../../.agents/agents/developer-agent/subagents/iot-developer/iot-developer.md) |
| **embedded-developer** | Dormant | Approved firmware, RTOS, driver, or microcontroller tasks. | Activated by `developer-agent` when the backlog contains embedded work. [Definition](../../.agents/agents/developer-agent/subagents/embedded-developer/embedded-developer.md) |
| **blockchain-developer** | Dormant | Approved smart-contract or blockchain integration tasks. | Activated by `developer-agent` when the backlog contains blockchain work. [Definition](../../.agents/agents/developer-agent/subagents/blockchain-developer/blockchain-developer.md) |
| **databricks-developer** | Dormant | Approved Databricks, Spark, Delta Lake, or Unity Catalog tasks. | Activated by `developer-agent` when the backlog or ADRs name Databricks. [Definition](../../.agents/agents/developer-agent/subagents/databricks-developer/databricks-developer.md) |

## Consultant and advisory agents

`consultant-agent` is an optional dispatcher outside the SDLC sequence. Use it
when you want advice or an artifact without advancing a workflow stage. Every
consultant can also be invoked directly.

| Agent | Status | When to use | How to use |
|---|---|---|---|
| **consultant-agent** | Active dispatcher | You want ad-hoc advice but do not know which consultant, artifact specialist, or platform SME fits. | Say `Use consultant-agent to ...`; it selects one specialist and integrates the answer. [Definition](../../.agents/agents/consultant-agent/consultant-agent.md) |
| **explain-me** | Active | Understand how and why a codebase, feature, fix, architecture, or technology works, including alternatives. | Invoke directly for a written and voiced explanation; it is read-only. [Definition](../../.agents/agents/consultant-agent/subagents/explain-me/explain-me.md) |
| **explain-new-contributions** | Active | Catch up on committed and uncommitted changes on the current branch and `main`. | Say `Use explain-new-contributions to catch me up`; it produces a read-only, evidence-backed briefing. [Definition](../../.agents/agents/consultant-agent/subagents/explain-new-contributions/explain-new-contributions.md) |
| **pre-mortem-agent** | Active | Imagine a proposed product, feature, or launch failed and identify Tigers, Paper Tigers, Elephants, and mitigations before commitment. | Invoke directly with the proposal and evidence, or enable product-agent's pre-mortem setting. [Definition](../../.agents/agents/consultant-agent/subagents/pre-mortem-agent/pre-mortem-agent.md) |
| **sounding-board-agent** | Active | Stress-test an idea, plan, decision, or architecture and compare credible alternatives. | Ask it to challenge a proposal; expect focused questions and evidence-based agreement or disagreement. [Definition](../../.agents/agents/consultant-agent/subagents/sounding-board-agent/sounding-board-agent.md) |
| **humanizer** | Active | Remove AI-writing tells from supplied text without changing its meaning or voice. | Provide the text and say `Use humanizer`; it returns minimally edited copy and a change log. [Definition](../../.agents/agents/consultant-agent/subagents/humanizer/humanizer.md) |
| **cloud-consumption-estimation** | Active | Estimate cloud requests, storage, compute, egress, billable units, and optionally cost from volumetrics. | Supply provider, region, architecture, and known volumes; it asks before introducing explicit assumptions. [Definition](../../.agents/agents/consultant-agent/subagents/cloud-consumption-estimation/cloud-consumption-estimation.md) |
| **gcp-sme** | Active | GCP architecture, migration, troubleshooting, BigQuery, security, operations, or current pricing guidance. | Invoke directly for GCP advice or let architecture/data agents consult it. [Definition](../../.agents/agents/consultant-agent/subagents/gcp-sme/gcp-sme.md) |
| **doc-generator** | Skill | Generate or improve API docs, READMEs, and implementation-grounded technical documentation. | Give it the code scope and requested documentation artifact; load it directly or through consultant-agent. [Definition](../../.agents/skills/doc-generator/SKILL.md) |
| **aws-sme** | Dormant | AWS architecture, migration, troubleshooting, security, cost, or Well-Architected analysis. | Invoke when AWS is explicitly in scope. [Definition](../../.agents/agents/consultant-agent/subagents/aws-sme/aws-sme.md) |
| **azure-sme** | Dormant | Azure architecture, migration, Entra, networking, security, cost, or Well-Architected analysis. | Invoke when Azure is explicitly in scope. [Definition](../../.agents/agents/consultant-agent/subagents/azure-sme/azure-sme.md) |
| **snowflake-sme** | Dormant | Snowflake architecture, performance, ingestion, governance, security, or cost. | Invoke when Snowflake is explicitly in scope. [Definition](../../.agents/agents/consultant-agent/subagents/snowflake-sme/snowflake-sme.md) |
| **ai-advisor** | Onboarding | AI tooling, LLM/API/platform choices, RAG, inference, or AI-enabled process optimization. | Invoke directly for structured, cost-aware AI advice; verify current facts before decisions. [Definition](../../.agents/agents/consultant-agent/subagents/ai-advisor/ai-advisor.md) |
| **web-search** | Onboarding | Broad multi-source internet research or difficult technical issue discovery. | Invoke for research that cannot be answered from repository context; expect source-backed findings. [Definition](../../.agents/agents/consultant-agent/subagents/web-search/web-search.md) |
| **software-tutor** | Onboarding | Learn a software concept, compare technologies, or walk through debugging at simple and engineer levels. | Invoke directly with the concept and your experience level. [Definition](../../.agents/agents/consultant-agent/subagents/software-tutor/software-tutor.md) |
| **financial-workbook-builder** | Onboarding | Build or revise a spreadsheet artifact. | Invoke with the desired workbook structure, source data, calculations, and output expectations. [Definition](../../.agents/skills/financial-workbook-builder/SKILL.md) |
| **pitch-deck-builder** | Onboarding | Create or restructure an investor, sales, startup, or fundraising deck. | Invoke with the audience, objective, evidence, and existing material; it performs discovery before building slides. [Definition](../../.agents/skills/pitch-deck-builder/SKILL.md) |
| **enterprise-value-engineer** | Onboarding | Quantify business value, ROI, economic impact, or an enterprise value case. | Invoke the skill with business drivers and supporting evidence. [Definition](../../.agents/skills/enterprise-value-engineer/SKILL.md) |

---

## Skills

### Code Quality

| Skill | Purpose |
|-------|---------|
| **coding-standards** | Baseline cross-project coding conventions for naming, readability, immutability, and code-quality review. |
| **simplify** | Builds or refines code using the smallest safe solution while preserving required behavior and safeguards. |
| **architecture-decision-records** | Patterns for creating, maintaining, and managing Architecture Decision Records (ADRs). |

### Architecture & Design

| Skill | Purpose |
|-------|---------|
| **architecture-designer** | Software architect for system design, patterns, and architectural decisions. Invoke for architecture reviews. |
| **microservices-architect** | Distributed systems architect for microservices patterns, service boundaries, and domain-driven design. |
| **cloud-architect** | Multi-cloud architect for AWS, Azure, and GCP — cloud migration, cost optimization, Well-Architected review. |
| **edge-architect** | Edge computing and CDN architecture — CDN strategies, edge deployment, global latency optimization. |
| **websocket-engineer** | WebSocket specialist for real-time communication — Socket.IO, bidirectional messaging, scaling strategies. |
| **terraform-engineer** | Senior Terraform engineer for infrastructure as code, multi-cloud provisioning, and modular architecture. |
| **secrets-management** | Secret storage, rotation, and credential management — HashiCorp Vault, AWS Secrets Manager, and patterns. |

### Testing

| Skill | Purpose |
|-------|---------|
| **playwright-expert** | Playwright E2E testing for web applications — browser automation, Page Object Model, test authoring. |
| **postman-test-scripts** | Creates Postman collections and test scripts for API testing and use-case coverage. |

### Data

| Skill | Purpose |
|-------|---------|
| **data-architect** | Reference for ETL/ELT pipeline design, data lakes, warehouses, and streaming architectures. (Thin skill — loads architecture, pipeline, and technology references on demand.) |
| **database-migrations** | Migration best practices for schema changes, zero-downtime deployments, rollbacks, across Postgres/MySQL/SQLite. |
| **system-requirements-estimation** | Back-of-envelope calculations for system design — QPS, storage, bandwidth, and latency estimation. |

### Operations & Observability

| Skill | Purpose |
|-------|---------|
| **dev-ops** | Reference for deployment strategies, Docker patterns, and CI/CD pipeline patterns. Use `deployment-agent` when active release or infrastructure work is required. |
| **observability-monitoring** | Observability reference for logging, metrics, tracing, alerting, and performance testing. |

### Project & Process

| Skill | Purpose |
|-------|---------|
| **codebase-onboarding** | Analyzes an unfamiliar codebase and generates a structured onboarding guide with architecture map and key entry points. |
| **jira-project-creation** | Step-by-step guide for creating a Jira Software project. Use `project-planner-agent` for workflow-owned Jira backlog operations. |
| **grill-me** | Interviews the user relentlessly about a plan or design until reaching shared understanding. |

---

## Notes

- `routing-registry.yaml` is authoritative for orchestrated routes and workflow
  handoffs. The parent agent declarations are authoritative for consultant
  onboarding entries that are not yet registered as direct routes.
- Agents and skills that share a name (for example, `data-architect` or
  `humanizer`) use the skill as reusable method/reference material and the agent
  as the active executor.
