# Canonical Agent Template

## Canonical location

Use one Markdown file per agent in any of these canonical layouts:

```text
.agents/agents/<agent-name>.md
.agents/agents/<agent-name>/<agent-name>.md
.agents/agents/<parent-agent>/subagents/<agent-name>/<agent-name>.md
```

Use the nested `subagents/` layout when ownership by a parent agent is meaningful. Do not relocate a valid definition merely to prefer one canonical layout over another.

The YAML frontmatter is the machine-readable contract. The Markdown body is the harness-neutral operating procedure.

## Required fields

```yaml
name: <agent-name>
description: <concise discovery description>
role: <agent|orchestrator|subagent>
```

`name` must exactly match the filename without `.md`; in directory layouts, the directory immediately containing the file must use the same agent name.

## Optional canonical fields

Use only when meaningful:

```yaml
skills:
  - <skill-name>
subagents:
  - <agent-name>
tools:
  - <portable-tool-intent>
model: inherit
inputs:
  required:
    - name: <input-name>
      description: <what it contains>
      type: <type>
  optional:
    - name: <input-name>
      description: <what it contains>
      type: <type>
outputs:
  - name: <output-name>
    description: <what is returned>
    type: <type>
    required: true
execution:
  mode: <execution-mode>
  delegation:
    - when: <condition>
      agent: <subagent-name>
  final_authority: self
```

Canonical extensions are intentionally harness-neutral. Do not put harness-only temperature, token limits, permission syntax, MCP syntax, `kind`, `mode`, Codex TOML, or harness-specific tool identifiers here unless the project explicitly defines them as portable.

## Full template

```markdown
---
name: example-orchestrator
description: Coordinates a multi-step analysis and delegates specialized work.
role: orchestrator
skills:
  - example-analysis
subagents:
  - example-specialist
tools:
  - filesystem
model: inherit
inputs:
  required:
    - name: request
      description: The work request and source material.
      type: text_or_file
  optional:
    - name: assumptions
      description: User-provided assumptions that override defaults.
      type: structured_data
outputs:
  - name: final_result
    description: Reconciled final result.
    type: structured_data
    required: true
  - name: rationale
    description: Major decisions, assumptions, and risks.
    type: markdown
    required: true
execution:
  mode: sequential_with_parallel_delegation
  delegation:
    - when: specialized analysis is required
      agent: example-specialist
  final_authority: self
---

# Example Orchestrator

## Purpose

State the agent's single primary purpose and what outcome it owns.

## Responsibilities

- State the responsibilities that belong to this agent.
- Keep reusable methodologies in referenced skills.
- Make final ownership explicit for orchestrators.

## Input Handling

Describe how required and optional inputs are interpreted, including missing-input behavior and assumptions.

## Operating Procedure

1. Validate inputs.
2. Determine required analysis.
3. Invoke relevant skills.
4. Delegate specialized work when justified.
5. Reconcile delegated results.
6. Validate the final result.
7. Produce the declared outputs.

## Skills

Explain when each declared skill is used. Treat its `SKILL.md` as authoritative; do not duplicate the full skill procedure here.

## Subagents

### `example-specialist`

Delegate the bounded specialized task. Provide only relevant context.

Expected return:
- findings
- assumptions
- risks
- confidence

## Delegation Rules

Delegate only when specialization materially improves the result. Parallelize independent work when supported. Never concatenate subagent responses blindly; reconcile conflicts and retain final ownership.

## Decision Authority

State who owns the final recommendation and how conflicting subagent results are resolved.

## Error Handling

Define behavior for missing information, failed subagents, unsupported requests, and uncertainty.

## Output Requirements

Define the content and quality expected for each declared output.

## Quality Checks

- [ ] Required inputs were considered.
- [ ] Required skills were used.
- [ ] Appropriate subagents were invoked.
- [ ] Delegated results were reconciled.
- [ ] Assumptions and risks are explicit.
- [ ] Required outputs are complete.

## Constraints

List prohibitions, boundaries, and non-goals.

## Completion Criteria

Define the observable conditions that mean the task is complete.
```

## Concrete example

```markdown
---
name: capacity-manager
description: Orchestrates workforce capacity planning across supply, recruiting, team composition, and delivery location decisions.
role: orchestrator
skills:
  - capacity-planning
  - staffing-analysis
  - location-analysis
subagents:
  - staffing-planner
  - recruiting-planner
  - geo-planner
model: inherit
inputs:
  required:
    - name: demand
      description: Requested roles, profiles, project demand, or workforce requirements.
      type: file_or_structured_data
  optional:
    - name: bench
      description: Available internal workforce or bench data.
      type: file_or_structured_data
    - name: project_description
      description: Project objectives, constraints, technologies, and expected outcomes.
      type: text_or_file
outputs:
  - name: capacity_plan
    description: Final recommended workforce capacity plan.
    type: structured_data
    required: true
  - name: rationale
    description: Major decisions, assumptions, risks, and tradeoffs.
    type: markdown
    required: true
execution:
  mode: sequential_with_parallel_delegation
  delegation:
    - when: team composition or supply analysis is required
      agent: staffing-planner
    - when: recruiting gaps exist
      agent: recruiting-planner
    - when: delivery-location analysis is required
      agent: geo-planner
  final_authority: self
---

# Capacity Manager

## Purpose

Transform workforce demand, available supply, project context, and assumptions into an actionable capacity plan. Own the final recommendation even when analysis is delegated.

## Responsibilities

- Understand demand and constraints.
- Evaluate internal supply before external recruiting when bench data exists.
- Identify staffing gaps and recruiting requirements.
- Design team composition when project context requires it.
- Evaluate delivery locations when relevant.
- Coordinate and reconcile specialist subagents.
- Produce the final capacity plan with assumptions, risks, and rationale.

## Input Handling

Treat `demand` as primary. If `bench` is supplied, evaluate it before recommending recruiting. Use `project_description` to decide whether team-design and location analysis are relevant. Do not invent missing requirements.

## Operating Procedure

1. Validate inputs and separate facts, derived information, assumptions, and missing data.
2. Determine which analyses are required.
3. Invoke applicable skills.
4. Delegate bounded specialist analyses.
5. Reconcile recommendations and resolve conflicting assumptions.
6. Produce and quality-check the final capacity plan.

## Skills

Use `capacity-planning` for overall reconciliation, `staffing-analysis` for supply/demand comparison, and `location-analysis` for geography and delivery feasibility. The corresponding `SKILL.md` files are authoritative.

## Subagents

Use `staffing-planner` for supply/demand and composition, `recruiting-planner` for uncovered staffing demand, and `geo-planner` when geography materially affects delivery. Require each to return findings, assumptions, risks, and confidence.

## Delegation Rules

Delegate only when specialized analysis improves the result. Independent analyses may run in parallel. Review and reconcile all delegated work before returning the final result.

## Decision Authority

The capacity manager owns the final recommendation. Resolve disagreements by comparing assumptions against supplied evidence; surface material unresolved uncertainty.

## Error Handling

Use documented defaults only when permitted. If a subagent fails, continue directly when practical and disclose any resulting confidence reduction.

## Output Requirements

Return the recommended staffing plan, internal supply allocation when applicable, recruiting gaps, relevant team/location recommendations, assumptions, risks, confidence, and supporting rationale.

## Quality Checks

- [ ] Demand is fully accounted for.
- [ ] Internal supply was considered when available.
- [ ] Recruiting gaps are explicit.
- [ ] Relevant skills and subagents were used.
- [ ] No demand is double-counted.
- [ ] Assumptions and material tradeoffs are explicit.
- [ ] Required outputs are complete.

## Constraints

Do not fabricate availability or requirements, silently change supplied assumptions, duplicate skill methodologies, or delegate unnecessarily.

## Completion Criteria

Complete when relevant demand is analyzed, specialist work is reconciled, required outputs are produced, and assumptions and material risks are explicit.
```
