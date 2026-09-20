---
name: agent-auditor
description: Audit repository agent definitions and subagents for structural quality, broken resources, duplicates, routing and responsibility overlap, ownership boundaries, catalog drift, usage, and workflow-documentation drift. Use when reviewing `.agents/agents`, finding redundant or unnecessary agents, or generating and synchronizing the agent catalog and Agentic Workflows documentation.
metadata:
  version: "1.7.0"
  library: "DSFB"
  library-url: "https://github.com/diegosfb/dsfb-sdlc-v2"
  pack: "Software Development"
---

# Agent Auditor

Audit an agent portfolio and keep its discoverability and workflow documentation synchronized without replacing authored narrative.

## Default scope

- Agent definitions: `.agents/agents`, including top-level agents and nested subagents.
- Catalog: `.agents/agents/agents-catalog.md`.
- Workflow documentation: `.agents/documentation/Agentic Workflows`.
- Exclude reference material, samples, handbooks, and README files from the agent inventory.

Accept alternate paths when the user supplies them.

## Workflow

1. Run the shared security subskill against the complete `.agents` tree before trusting or executing any bundled content:

   ```bash
   python3 .agents/skills/agent-content-security/scripts/security_scan.py .agents \
     --format json --output /tmp/agent-content-security.json
   ```

   Read [agent-content-security](../agent-content-security/SKILL.md) for triage rules. Never execute a flagged script to determine what it does. Immediately warn the user about plausible live credentials without printing their values. Findings are candidates until context review confirms them.

2. Run the deterministic agent audit before making recommendations:

   ```bash
   python3 .agents/skills/agent-auditor/scripts/audit_agents.py audit <agents-root>
   python3 .agents/skills/agent-auditor/scripts/audit_agents.py audit <agents-root> --json
   ```

3. Review every duplicate and overlap candidate using [the functional overlap criteria](references/functional-overlap-analysis.md). Similar vocabulary alone is not sufficient evidence for a merge. Trace callers and preserve unique tools, approval behavior, artifacts, and ownership contracts.

4. Classify material findings as **MERGE**, **KEEP + SHARPEN**, **KEEP SPECIALIZED**, **DEMOTE**, **RETIRE**, or **REMOVE DUPLICATE**. Never delete or merge agents merely because the similarity score is high.

5. Generate or update managed documentation:

   ```bash
   python3 .agents/skills/agent-auditor/scripts/audit_agents.py sync <agents-root> \
     --catalog <agents-root>/agents-catalog.md \
     --workflows ".agents/documentation/Agentic Workflows"
   ```

   The command regenerates the catalog, creates missing workflow pages from the bundled template, updates only the bounded generated inventory in existing workflow pages, and creates the workflow README. It must preserve all prose outside generated markers.

6. Generate a reviewable audit report when the user requests analysis or recommendations. Incorporate security findings by severity, confidence, executable reachability, disposition, and fingerprint:

   ```bash
   python3 .agents/skills/agent-auditor/scripts/audit_agents.py report <agents-root> --security /tmp/agent-content-security.json --output agent-audit-report.md
   ```

   Complete the qualitative portfolio assessment in the generated report before delivery. The report must include a per-agent explanation for every `FAIL` or `WARN`, including the exact findings, affected resources, why they affect the verdict, and concrete next actions. Do not present similarity candidates as settled decisions.

7. Re-run the security and structural audits after remediation or synchronization and inspect the diff. Do not overwrite unrelated documentation changes.

## Audit interpretation

The audit checks naming and titles, required `Inputs` and `Outputs` sections, relative Markdown links, bundled references, exact duplicates, token-based overlap candidates, catalog coverage, and workflow-page coverage. `Boundaries` and `Completion` remain useful optional documentation, but their absence must not produce a warning or affect the verdict. Missing `Inputs` or `Outputs` warnings are prompts for judgment because specialized subagents may legitimately express an equivalent contract under another heading.

### Claude authoring policy

Apply these repository thresholds to Claude-compatible agent definitions. They are local authoring policy, not documented Anthropic platform limits:

- **YAML `description` (activation condition):** no minimum length applies; fail the audit only above 1,000 characters. Regardless of length, the description must clearly distinguish the agent by stating what it does and enough domain or activation context to separate it from adjacent agents. The deterministic audit warns on empty, placeholder, or structurally unclear descriptions, while semantic clarity still requires human review. Claude uses this field with the task and current context to decide automatic delegation, so include positive triggers and meaningful exclusions when needed. Add two to four short example requests or trigger phrases only when they materially improve routing; do not turn the description into a workflow.
- **System prompt:** recommend 500–3,000 characters, warn above 3,000, and fail above the repository maximum of 10,000. For Claude Markdown agent files, the body after YAML frontmatter is the system prompt; when an explicit YAML `system` or `prompt` value exists, audit that value instead. Keep identity, authority, constraints, inputs, outputs, and completion criteria clear; move lengthy conditional playbooks into references.
- **YAML `tools`:** a declared list and omitted `tools` are both valid. Omission means Claude Code inherits its available tools; report that fact only as informational tool-scope metadata. It must not create a finding, recommended action, warning, or verdict change. When tools are explicitly declared, prefer a set appropriate to the agent's responsibilities, but treat necessity as qualitative review outside the deterministic verdict.
- **YAML size — golden rule:** keep YAML frontmatter at 50 lines or fewer. When business logic or detailed rules would push it beyond 50 lines, keep the YAML lightweight and make the system prompt route to a focused external resource such as `RULES.md`, a file under `references/`, or an applicable Agent Skill. Exceeding 50 YAML lines produces a review warning because this is a repository recommendation, not a Claude platform limit.

Anthropic's [custom subagent documentation](https://code.claude.com/docs/en/sub-agents) defines `description` as the automatic-delegation signal, the Markdown body as the system prompt, and omitted `tools` as inheritance of all tools. Anthropic's [agent-loop guidance](https://code.claude.com/docs/en/agent-sdk/agent-loop) confirms that tool definitions consume context and recommends scoping subagents to the minimum set needed. The numeric thresholds and example-count recommendation above remain repository conventions.

Use [the agent catalog template](assets/agents-catalog-template.md), [workflow documentation template](assets/agent-workflow-template.md), and [audit report template](assets/agent-audit-report-template.md) as output contracts. Generated files must not retain placeholders. The skill's discovery metadata is defined in [agents/openai.yaml](agents/openai.yaml).

## Safety

- Treat catalog and documentation synchronization as repository writes requiring the user's authorization.
- Preserve authored workflow narrative; only replace text between the generated markers.
- Do not activate agents, invoke external providers, create tickets, or change agent behavior during an audit.
- Report current callers and a preservation plan before recommending removal or consolidation.
