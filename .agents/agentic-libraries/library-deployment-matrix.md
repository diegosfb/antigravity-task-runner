# Agentic Library Deployment Matrix

This matrix is the sole package source of truth for which canonical agents, skills, workflows, shared documentation, and guidelines should be deployed. A `YES` means the item belongs in that library package; `NO` means it should not be deployed by that package.

## Classification rules

- **SDLC**, **Extended SDLC**, **General Purpose**, and **Professional Services** reflect their current explicit deployment configurations. `Extended SDLC` is a superset of `SDLC`: every SDLC component must also be marked `YES` there, alongside any specialized additions. Selecting a parent agent includes its canonical subagents as package contents.
- **Financial & Business** is a recommended package: skills whose catalog Pack is `Business & Finance`, plus agents whose primary purpose is product, commercial, financial, delivery, or organizational decision support.
- **Technical Advisor** is a recommended package: architecture, cloud/platform, data, infrastructure, security, technical-estimation, research, and specialist-advisory capabilities. It is advisory-oriented and does not automatically include the complete implementation workflow.
- Supporting files inside an agent or skill directory travel with that component and therefore do not receive separate rows.
- Shared documentation is deployed with every package so users receive the platform guidance and workflow documentation alongside the selected components.
- Shared guidelines are deployed with every package so agents receive consistent security, delivery, infrastructure, and operational guidance.

| Type | Component | Path | SDLC | Extended SDLC | General Purpose | Professional Services | Financial & Business | Technical Advisor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Documentation | `documentation` | `.agents/documentation` | YES | YES | YES | YES | YES | YES |
| Guidelines | `guidelines` | `.agents/guidelines` | YES | YES | YES | YES | YES | YES |
| Agent | `business-finance-agent` | `.agents/agents/business-finance-agent/business-finance-agent.md` | NO | NO | NO | NO | YES | NO|
| Agent | `marketing-agent` | `.agents/agents/marketing-agent/marketing-agent.md` | NO | NO | NO | YES | NO | NO|
| Agent | `content-creator.` | `.agents/agents/marketing-agent/subagents/community-manager/community-manager.md` | NO | NO | NO | YES | NO | NO|
| Agent | `content-creator` | `.agents/agents/marketing-agent/subagents/content-creator/content-creator.md` | NO | NO | NO | YES | NO | NO|
| Agent | `demand-gen-specialist` | `.agents/agents/marketing-agent/subagents/demand-gen-specialist/demand-gen-specialist.md` | NO | NO | NO | YES | NO | NO|
| Agent | `developer-advocate` | `.agents/agents/marketing-agent/subagents/developer-advocate/developer-advocate.md` | NO | NO | NO | YES | NO | NO|
| Agent | `event-manager` | `.agents/agents/marketing-agent/subagents/event-manager/event-manager.md` | NO | NO | NO | YES | NO | NO|
| Agent | `pr-comms-lead` | `.agents/agents/marketing-agent/subagents/pr-comms-lead/pr-comms-lead.md` | NO | NO | NO | YES | NO | NO|
| Agent | `seo-analyst` | `.agents/agents/marketing-agent/subagents/seo-analyst/seo-analyst.md` | NO | NO | NO | YES | NO | NO|
| Agent | `ai-advisor` | `.agents/agents/consultant-agent/subagents/ai-advisor/ai-advisor.md` | NO | NO | NO | NO | NO | YES |
| Agent | `architect-agent` | `.agents/agents/architect-agent/architect-agent.md` | YES | YES | NO | NO | NO | YES |
| Agent | `autoresearch-runner` | `.agents/agents/autoresearch-runner/autoresearch-runner.md` | NO | NO | YES | NO | NO | NO |
| Agent | `aws-sme` | `.agents/agents/consultant-agent/subagents/aws-sme/aws-sme.md` | NO | NO | NO | NO | NO | YES |
| Agent | `azure-sme` | `.agents/agents/consultant-agent/subagents/azure-sme/azure-sme.md` | NO | NO | NO | NO | NO | YES |
| Agent | `ba-agent` | `.agents/agents/ba-agent/ba-agent.md` | YES | YES | NO | NO | NO | NO |
| Agent | `be-developer` | `.agents/agents/developer-agent/subagents/be-developer/be-developer.md` | YES | YES | NO | NO | NO | NO |
| Agent | `blockchain-architect` | `.agents/agents/architect-agent/subagents/blockchain-architect/blockchain-architect.md` | NO | YES | NO | NO | NO | YES |
| Agent | `blockchain-developer` | `.agents/agents/developer-agent/subagents/blockchain-developer/blockchain-developer.md` | NO | YES | NO | NO | NO | NO |
| Agent | `capacity-manager` | `.agents/agents/consultant-agent/subagents/capacity-manager/capacity-manager.md` | NO | NO | NO | YES | NO | NO |
| Agent | `cloud-consumption-estimation` | `.agents/agents/consultant-agent/subagents/cloud-consumption-estimation/cloud-consumption-estimation.md` | NO | NO | NO | YES | NO | YES |
| Agent | `code-review-agent` | `.agents/agents/code-review-agent/code-review-agent.md` | YES | YES | NO | NO | NO | NO |
| Agent | `consultant-agent` | `.agents/agents/consultant-agent/consultant-agent.md` | NO | NO | NO | YES | NO | YES |
| Agent | `data-architect` | `.agents/agents/architect-agent/subagents/data-architect/data-architect.md` | YES | YES | NO | NO | NO | YES |
| Agent | `data-developer` | `.agents/agents/developer-agent/subagents/data-developer/data-developer.md` | YES | YES | NO | NO | NO | NO |
| Agent | `databricks-architect` | `.agents/agents/architect-agent/subagents/databricks-architect/databricks-architect.md` | NO | YES | NO | NO | NO | YES |
| Agent | `databricks-developer` | `.agents/agents/developer-agent/subagents/databricks-developer/databricks-developer.md` | NO | YES | NO | NO | NO | NO |
| Agent | `delivery-manager` | `.agents/agents/consultant-agent/subagents/delivery-manager/delivery-manager.md` | NO | NO | NO | YES | NO | NO |
| Agent | `deployment-agent` | `.agents/agents/deployment-agent/deployment-agent.md` | YES | YES | NO | NO | NO | NO |
| Agent | `developer-agent` | `.agents/agents/developer-agent/developer-agent.md` | YES | YES | NO | NO | NO | NO |
| Agent | `embedded-architect` | `.agents/agents/architect-agent/subagents/embedded-architect/embedded-architect.md` | NO | YES | NO | NO | NO | YES |
| Agent | `embedded-developer` | `.agents/agents/developer-agent/subagents/embedded-developer/embedded-developer.md` | NO | YES | NO | NO | NO | NO |
| Agent | `explain-me` | `.agents/agents/consultant-agent/subagents/explain-me/explain-me.md` | NO | NO | YES | NO | NO | YES |
| Agent | `explain-new-contributions` | `.agents/agents/consultant-agent/subagents/explain-new-contributions/explain-new-contributions.md` | YES | YES | NO | NO | NO | NO |
| Agent | `fe-developer` | `.agents/agents/developer-agent/subagents/fe-developer/fe-developer.md` | YES | YES | NO | NO | NO | NO |
| Agent | `gcp-sme` | `.agents/agents/consultant-agent/subagents/gcp-sme/gcp-sme.md` | NO | NO | NO | YES | NO | YES |
| Agent | `humanizer` | `.agents/agents/consultant-agent/subagents/humanizer/humanizer.md` | NO | NO | YES | YES | NO | NO |
| Agent | `industry-sme` | `.agents/agents/consultant-agent/subagents/industry-sme/industry-sme.md` | NO | NO | NO | YES | NO | YES |
| Agent | `iot-architect` | `.agents/agents/architect-agent/subagents/iot-architect/iot-architect.md` | NO | YES | NO | NO | NO | YES |
| Agent | `iot-developer` | `.agents/agents/developer-agent/subagents/iot-developer/iot-developer.md` | NO | YES | NO | NO | NO | NO |
| Agent | `llm-judge-agent` | `.agents/agents/llm-judge-agent/llm-judge-agent.md` | YES | YES | NO | NO | NO | YES |
| Agent | `marketing-manager` | `.agents/agents/consultant-agent/subagents/marketing-manager/marketing-manager.md` | NO | NO | NO | YES | NO | NO |
| Agent | `mergers-and-integrations` | `.agents/agents/consultant-agent/subagents/mergers-and-integrations/mergers-and-integrations.md` | NO | NO | NO | YES | NO | NO |
| Agent | `mobile-architect` | `.agents/agents/architect-agent/subagents/mobile-architect/mobile-architect.md` | NO | YES | NO | NO | NO | YES |
| Agent | `mobile-developer` | `.agents/agents/developer-agent/subagents/mobile-developer/mobile-developer.md` | NO | YES | NO | NO | NO | NO |
| Agent | `obsidian-vault-agent` | `.agents/agents/obsidian-vault-agent/obsidian-vault-agent.md` | YES | YES | NO | NO | NO | NO |
| Agent | `pre-mortem-agent` | `.agents/agents/consultant-agent/subagents/pre-mortem-agent/pre-mortem-agent.md` | NO | NO | NO | YES | NO | NO |
| Agent | `product-agent` | `.agents/agents/product-agent/product-agent.md` | YES | YES | NO | NO | NO | NO |
| Agent | `project-planner-agent` | `.agents/agents/project-planner-agent/project-planner-agent.md` | YES | YES | NO | NO | NO | NO |
| Agent | `red-team-agent` | `.agents/agents/test-agent/subagents/red-team-agent/red-team-agent.md` | YES | YES | NO | NO | NO | NO |
| Agent | `sales-engineer` | `.agents/agents/consultant-agent/subagents/sales-engineer/sales-engineer.md` | NO | NO | NO | YES | NO | NO |
| Agent | `sdlc-orchestrator` | `.agents/agents/sdlc-orchestrator/sdlc-orchestrator.md` | YES | YES | NO | NO | NO | NO |
| Agent | `security-check-agent` | `.agents/agents/spec-validation-agent/subagents/security-check-agent/security-check-agent.md` | YES | YES | NO | NO | NO | NO |
| Agent | `snowflake-sme` | `.agents/agents/consultant-agent/subagents/snowflake-sme/snowflake-sme.md` | NO | NO | NO | NO | NO | YES |
| Agent | `software-tutor` | `.agents/agents/consultant-agent/subagents/software-tutor/software-tutor.md` | NO | NO | NO | NO | NO | YES |
| Agent | `sounding-board-agent` | `.agents/agents/consultant-agent/subagents/sounding-board-agent/sounding-board-agent.md` | NO | NO | NO | YES | NO | YES |
| Agent | `spec-drift-checker` | `.agents/agents/spec-validation-agent/subagents/spec-drift-checker/spec-drift-checker.md` | YES | YES | NO | NO | NO | NO |
| Agent | `spec-red-team` | `.agents/agents/spec-validation-agent/subagents/spec-red-team/spec-red-team.md` | YES | YES | NO | NO | NO | NO |
| Agent | `spec-validation-agent` | `.agents/agents/spec-validation-agent/spec-validation-agent.md` | YES | YES | NO | NO | NO | NO |
| Agent | `test-agent` | `.agents/agents/test-agent/test-agent.md` | YES | YES | NO | NO | NO | NO |
| Agent | `ux-agent` | `.agents/agents/ux-agent/ux-agent.md` | YES | YES | NO | NO | NO | NO |
| Agent | `web-search` | `.agents/agents/consultant-agent/subagents/web-search/web-search.md` | NO | NO | YES | YES | YES | NO |
| Skill | `accessibility` | `.agents/skills/accessibility/SKILL.md` | NO | YES | NO | NO | NO | NO |
| Skill | `accessibility-runtime-tester` | `.agents/skills/accessibility-runtime-tester/SKILL.md` | NO | YES | NO | NO | NO | NO |
| Skill | `acquire-codebase-knowledge` | `.agents/skills/acquire-codebase-knowledge/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `agent-auditor` | `.agents/skills/agent-auditor/SKILL.md` | NO | NO | YES | NO | NO | NO |
| Skill | `agent-content-security` | `.agents/skills/agent-content-security/SKILL.md` | NO | NO | YES | NO | NO | NO |
| Skill | `agents-harness-sync` | `.agents/skills/agents-harness-sync/SKILL.md` | YES | YES | YES | YES | YES | YES |
| Skill | `architecture-designer` | `.agents/skills/architecture-designer/SKILL.md` | YES | YES | NO | NO | NO | YES |
| Skill | `autoresearch` | `.agents/skills/autoresearch/SKILL.md` | NO | YES | YES | NO | NO | NO |
| Skill | `azure-pricing` | `.agents/skills/azure-pricing/SKILL.md` | NO | NO | NO | YES | NO | YES |
| Skill | `bigquery-data-transfer-service` | `.agents/skills/bigquery-data-transfer-service/SKILL.md` | NO | YES | NO | NO | NO | YES |
| Skill | `brainstorm-experiments` | `.agents/skills/brainstorm-experiments/SKILL.md` | YES | YES | YES | YES | YES | NO |
| Skill | `brainstorm-ideas` | `.agents/skills/brainstorm-ideas/SKILL.md` | YES | YES | YES | YES | YES | NO |
| Skill | `building-data-apps` | `.agents/skills/building-data-apps/SKILL.md` | YES | YES | NO | NO | NO | YES |
| Skill | `climate-tech-advisor` | `.agents/skills/climate-tech-advisor/SKILL.md` | NO | NO | NO | NO | NO | YES |
| Skill | `cloud-architect` | `.agents/skills/cloud-architect/SKILL.md` | YES | YES | NO | NO | NO | YES |
| Skill | `code-reviewer` | `.agents/skills/code-reviewer/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `coding-standards` | `.agents/skills/coding-standards/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `contract-drafting-assistant` | `.agents/skills/contract-drafting-assistant/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `customer-interview-script` | `.agents/skills/customer-interview-script/SKILL.md` | YES | YES | NO | YES | NO | NO |
| Skill | `customer-success-manager` | `.agents/skills/customer-success-manager/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `dashboard-builder` | `.agents/skills/dashboard-builder/SKILL.md` | NO | NO | YES | YES | YES | NO |
| Skill | `data-autocleaning` | `.agents/skills/data-autocleaning/SKILL.md` | NO | YES | NO | NO | NO | YES |
| Skill | `data-cost-governance` | `.agents/skills/data-cost-governance/SKILL.md` | YES | YES | NO | NO | NO | YES |
| Skill | `data-governance` | `.agents/skills/data-governance/SKILL.md` | YES | YES | NO | NO | NO | YES |
| Skill | `data-modeling` | `.agents/skills/data-modeling/SKILL.md` | YES | YES | NO | NO | NO | YES |
| Skill | `data-quality` | `.agents/skills/data-quality/SKILL.md` | YES | YES | NO | NO | NO | YES |
| Skill | `data-scraper` | `.agents/skills/data-scraper/SKILL.md` | NO | YES | YES | NO | NO | NO |
| Skill | `data-security-compliance` | `.agents/skills/data-security-compliance/SKILL.md` | YES | YES | NO | NO | NO | YES |
| Skill | `database-design` | `.agents/skills/database-design/SKILL.md` | YES | YES | NO | NO | NO | YES |
| Skill | `database-migrations` | `.agents/skills/database-migrations/SKILL.md` | YES | YES | NO | NO | NO | YES |
| Skill | `database-optimizer` | `.agents/skills/database-optimizer/SKILL.md` | YES | YES | NO | NO | NO | YES |
| Skill | `dataform-bigquery` | `.agents/skills/dataform-bigquery/SKILL.md` | YES | YES | NO | NO | NO | YES |
| Skill | `dbt-bigquery` | `.agents/skills/dbt-bigquery/SKILL.md` | YES | YES | NO | NO | NO | YES |
| Skill | `delivery-capacity-planner` | `.agents/skills/delivery-capacity-planner/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `design-system` | `.agents/skills/design-system/SKILL.md` | YES | YES | NO | YES | NO | YES |
| Skill | `developing-with-bigquery` | `.agents/skills/developing-with-bigquery/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `development-estimation` | `.agents/skills/development-estimation/SKILL.md` | YES | YES | NO | YES | NO | NO |
| Skill | `diagnosing-bugs` | `.agents/skills/diagnosing-bugs/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `discovering-gcp-data-assets` | `.agents/skills/discovering-gcp-data-assets/SKILL.md` | NO | YES | NO | NO | NO | NO |
| Skill | `drawio-skill` | `.agents/skills/drawio-skill/SKILL.md` | YES | YES | YES | YES | NO | NO |
| Skill | `e2e-testing` | `.agents/skills/e2e-testing/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `ecommerce-advisor` | `.agents/skills/ecommerce-advisor/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `edge-architect` | `.agents/skills/edge-architect/SKILL.md` | NO | YES | NO | NO | NO | YES |
| Skill | `edtech-advisor` | `.agents/skills/edtech-advisor/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `enterprise-value-engineer` | `.agents/skills/enterprise-value-engineer/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `etl-elt-patterns` | `.agents/skills/etl-elt-patterns/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `executive-advisor` | `.agents/skills/executive-advisor/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `explain-me` | `.agents/skills/explain-me/SKILL.md` | YES | YES | YES | YES | YES | YES |
| Skill | `financial-workbook-builder` | `.agents/skills/financial-workbook-builder/SKILL.md` | NO | NO | NO | YES | YES | NO |
| Skill | `fintech-advisor` | `.agents/skills/fintech-advisor/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `founder-leadership-coaching` | `.agents/skills/founder-leadership-coaching/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `gcloud-auth-verification` | `.agents/skills/gcloud-auth-verification/SKILL.md` | NO | YES | NO | NO | NO | NO |
| Skill | `gcp-composer-troubleshooting` | `.agents/skills/gcp-composer-troubleshooting/SKILL.md` | NO | YES | NO | NO | NO | NO |
| Skill | `gcp-data-pipelines` | `.agents/skills/gcp-data-pipelines/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `gcp-dataflow` | `.agents/skills/gcp-dataflow/SKILL.md` | NO | YES | NO | NO | NO | NO |
| Skill | `gcp-pipeline-orchestration` | `.agents/skills/gcp-pipeline-orchestration/SKILL.md` | NO | YES | NO | NO | NO | NO |
| Skill | `gcp-pipeline-resource-provisioning` | `.agents/skills/gcp-pipeline-resource-provisioning/SKILL.md` | NO | YES | NO | NO | NO | NO |
| Skill | `gcp-spark` | `.agents/skills/gcp-spark/SKILL.md` | NO | YES | NO | NO | NO | NO |
| Skill | `google-gemini-api` | `.agents/skills/google-gemini-api/SKILL.md` | NO | YES | NO | NO | NO | NO |
| Skill | `google-gemini-embeddings` | `.agents/skills/google-gemini-embeddings/SKILL.md` | NO | YES | NO | NO | NO | NO |
| Skill | `google-gemini-file-search` | `.agents/skills/google-gemini-file-search/SKILL.md` | NO | YES | NO | NO | NO | NO |
| Skill | `grill-me` | `.agents/skills/grill-me/SKILL.md` | YES | YES | YES | YES | NO | NO |
| Skill | `grill-with-docs` | `.agents/skills/grill-with-docs/SKILL.md` | YES | YES | YES | YES | NO | NO |
| Skill | `handoff` | `.agents/skills/handoff/SKILL.md` | YES | YES | YES | YES | NO | NO |
| Skill | `harvesting-meeting-context` | `.agents/skills/harvesting-meeting-context/SKILL.md` | YES | YES | YES | YES | NO | NO |
| Skill | `healthtech-advisor` | `.agents/skills/healthtech-advisor/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `humanizer` | `.agents/skills/humanizer/SKILL.md` | NO | NO | YES | YES | NO | NO |
| Skill | `identify-assumptions` | `.agents/skills/identify-assumptions/SKILL.md` | YES | YES | NO | YES | NO | NO |
| Skill | `jira-project-creation` | `.agents/skills/jira-project-creation/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `job-application-resume` | `.agents/skills/job-application-resume/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `leads-qualification` | `.agents/skills/leads-qualification/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `leads-researcher` | `.agents/skills/leads-researcher/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `llm-application-dev-langchain` | `.agents/skills/llm-application-dev-langchain/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `log-generation` | `.agents/skills/log-generation/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `ma-playbook` | `.agents/skills/ma-playbook/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `marketplace-advisor` | `.agents/skills/marketplace-advisor/SKILL.md` | NO | NO | NO | YES | YES | NO |
| Skill | `meeting-insights` | `.agents/skills/meeting-insights/SKILL.md` | YES | YES | YES | YES | NO | NO |
| Skill | `microservices-architect` | `.agents/skills/microservices-architect/SKILL.md` | YES | YES | NO | NO | NO | YES |
| Skill | `observability-monitoring` | `.agents/skills/observability-monitoring/SKILL.md` | YES | YES | NO | NO | NO | YES |
| Skill | `partnerships-architect` | `.agents/skills/partnerships-architect/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `pitch-deck-builder` | `.agents/skills/pitch-deck-builder/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `pitch-deck-reviewer` | `.agents/skills/pitch-deck-reviewer/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `playwright-expert` | `.agents/skills/playwright-expert/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `postman-test-scripts` | `.agents/skills/postman-test-scripts/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `powerpoint` | `.agents/skills/powerpoint/SKILL.md` | NO | NO | NO | NO | NO | NO |
| Skill | `pre-mortem` | `.agents/skills/pre-mortem/SKILL.md` | YES | YES | YES | YES | YES | YES |
| Skill | `presales-engineering` | `.agents/skills/presales-engineering/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `press-release` | `.agents/skills/press-release/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `pricing-strategy` | `.agents/skills/pricing-strategy/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `prompt-engineer` | `.agents/skills/prompt-engineer/SKILL.md` | NO | NO | YES | NO | NO | NO |
| Skill | `proposal-and-sow-writer` | `.agents/skills/proposal-and-sow-writer/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `proptech-advisor` | `.agents/skills/proptech-advisor/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `prototype` | `.agents/skills/prototype/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `rag-architect` | `.agents/skills/rag-architect/SKILL.md` | YES | YES | NO | NO | NO | YES |
| Skill | `recruiting-capacity-planner` | `.agents/skills/recruiting-capacity-planner/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `revenue-operations` | `.agents/skills/revenue-operations/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `secrets-management` | `.agents/skills/secrets-management/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `senior-data-engineer` | `.agents/skills/senior-data-engineer/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `senior-fullstack` | `.agents/skills/senior-fullstack/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `simplify` | `.agents/skills/simplify/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `skill-auditor` | `.agents/skills/skill-auditor/SKILL.md` | NO | NO | YES | NO | NO | NO |
| Skill | `snowflake-development` | `.agents/skills/snowflake-development/SKILL.md` | NO | YES | NO | NO | NO | NO |
| Skill | `storypoints-council` | `.agents/skills/storypoints-council/SKILL.md` | YES | YES | NO | YES | NO | NO |
| Skill | `streaming-specialist` | `.agents/skills/streaming-specialist/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `system-requirements-estimation` | `.agents/skills/system-requirements-estimation/SKILL.md` | YES | YES | NO | YES | NO | YES |
| Skill | `tdd` | `.agents/skills/tdd/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `teach` | `.agents/skills/teach/SKILL.md` | NO | NO | NO | NO | NO | NO |
| Skill | `terraform-engineer` | `.agents/skills/terraform-engineer/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `thought-leadership-writing` | `.agents/skills/thought-leadership-writing/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `to-spec` | `.agents/skills/to-spec/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `to-tickets` | `.agents/skills/to-tickets/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `ui-design-system` | `.agents/skills/ui-design-system/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `ui-designer` | `.agents/skills/ui-designer/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `ux-researcher-designer` | `.agents/skills/ux-researcher-designer/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `vtu-estimator` | `.agents/skills/vtu-estimator/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `doc-generator` | `.agents/skills/doc-generator/SKILL.md` | YES | YES | NO | YES | NO | YES |
| Skill | `websocket-engineer` | `.agents/skills/websocket-engineer/SKILL.md` | YES | YES | NO | NO | NO | NO |
| Skill | `channel-economics` | `.agents/skills/channel-economics/SKILL.md` | NO | NO | NO | YES | NO | NO |
| Skill | `business-idea-evaluator` | `.agents/skills/business-idea-evaluator/SKILL.md` | NO | NO | NO | NO | YES | NO |
| Skill | `business-investment-advisor` | `.agents/skills/business-investment-advisor/SKILL.md` | NO | NO | NO | NO | YES | NO |
| Skill | `business-plan-builder` | `.agents/skills/business-plan-builder/SKILL.md` | NO | NO | NO | NO | YES | NO |
| Skill | `ca-tax-advisor` | `.agents/skills/ca-tax-advisor/SKILL.md` | NO | NO | NO | NO | YES | NO |
| Skill | `financial-analyst` | `.agents/skills/financial-analyst/SKILL.md` | NO | NO | NO | NO | YES | NO |
| Skill | `fundamental-analysis` | `.agents/skills/fundamental-analysis/SKILL.md` | NO | NO | NO | NO | YES | NO |
| Skill | `investor-materials` | `.agents/skills/investor-materials/SKILL.md` | NO | NO | NO | NO | YES | NO |
| Skill | `investor-outreach` | `.agents/skills/investor-outreach/SKILL.md` | NO | NO | NO | NO | YES | NO |
| Skill | `morgan-stanley-ta` | `.agents/skills/morgan-stanley-ta/SKILL.md` | NO | NO | NO | NO | YES | NO |
| Skill | `solo-founder-prioritization` | `.agents/skills/solo-founder-prioritization/SKILL.md` | NO | NO | NO | NO | YES | NO |
| Workflow | `red-team-workflow` | `.agents/workflows/red-team-workflow.md` | YES | YES | NO | NO | NO | NO |
| Workflow | `backlog-implementation-workflow` | `.agents/workflows/backlog-implementation-workflow.md` | YES | YES | NO | NO | NO | NO |
| Workflow | `project-definition-workflow` | `.agents/workflows/project-definition-workflow.md` | YES | YES | NO | NO | NO | NO |




