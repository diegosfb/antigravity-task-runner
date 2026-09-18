# Shared Agent Library and Harness Synchronization

## Purpose

Maintain one canonical library of skills and agents while using Claude Code, Codex, Gemini CLI, Google Antigravity, and OpenCode on the same project.

```text
project/
├── AGENTS.md
├── CLAUDE.md
├── .agents/
│   ├── skills/<skill>/SKILL.md
│   ├── agents/<agent>.md
│   ├── workflows/
│   ├── documentation/
│   └── skills/agents-harness-sync/
│       └── scripts/sync-agents.sh
├── .claude/agents/       # generated
├── .codex/agents/        # generated TOML
├── .gemini/agents/       # generated
└── .opencode/agents/     # generated
```

`.agents/` is the durable control plane. Harness-specific directories are compatibility outputs.

## Skills

Use `.agents/skills/<skill-name>/SKILL.md` as the shared skill library. Multiple current harnesses support this Agent Skills convention. Do not duplicate skill methodology inside agents.

## Why agents need synchronization

Agent definitions are less standardized. Claude Code, Gemini CLI, Antigravity, and OpenCode use Markdown plus YAML frontmatter, but their schemas differ. Codex uses standalone TOML custom-agent files. Therefore maintain one canonical definition and translate only what differs.

```text
                .agents/agents/*.md
                  SOURCE OF TRUTH
                         |
 .agents/skills/agents-harness-sync/scripts/sync-agents.sh
                         |
       +---------+-------+--------+---------+
       |         |                |         |
     Claude    Gemini          OpenCode    Codex
      .md       .md              .md       .toml

Antigravity can consume .agents/agents directly.
```

# Canonical agent format

Canonical path:

```text
.agents/agents/<agent-name>.md
.agents/agents/<agent-name>/<agent-name>.md
.agents/agents/<parent-agent>/subagents/<agent-name>/<agent-name>.md
```

All three layouts are canonical. Use the nested `subagents/` form when the parent-child ownership is meaningful.

Required frontmatter:

```yaml
name:
description:
role:
```

`role` is one of `agent`, `orchestrator`, or `subagent`.

Recommended optional canonical fields:

```yaml
skills:
subagents:
tools:
model:
inputs:
outputs:
execution:
```

These fields describe portable intent. They are not assumed to be native fields in every harness.

## Full canonical template

```markdown
---
name: capacity-manager
description: >
  Orchestrates workforce capacity planning by analyzing demand, available
  supply, recruiting requirements, team composition, and delivery locations.

role: orchestrator

skills:
  - capacity-planning
  - staffing-analysis
  - location-analysis

subagents:
  - staffing-planner
  - recruiting-planner
  - geo-planner

tools:
  - filesystem
  - shell

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
      description: Project objectives, constraints, technologies, and delivery context.
      type: text_or_file
    - name: assumptions
      description: User assumptions overriding defaults.
      type: structured_data

outputs:
  - name: capacity_plan
    description: Final recommended workforce capacity plan.
    type: structured_data
    required: true
  - name: staffing_analysis
    description: Supply, demand, gaps, and recruiting requirements.
    type: structured_data
    required: true
  - name: rationale
    description: Explanation of major decisions and assumptions.
    type: markdown
    required: true

execution:
  mode: sequential_with_parallel_delegation
  delegation:
    - when: team composition analysis is required
      agent: staffing-planner
    - when: recruiting gaps exist
      agent: recruiting-planner
    - when: geographic analysis is required
      agent: geo-planner
  final_authority: self
---

# Capacity Manager

## Purpose
You are the workforce capacity-management orchestrator. Transform demand,
available supply, project context, and assumptions into an actionable plan.
You own the final result even when analysis is delegated.

## Responsibilities
1. Understand demand.
2. Evaluate available supply.
3. Identify staffing gaps.
4. Determine recruiting requirements.
5. Design team composition when appropriate.
6. Evaluate delivery locations when relevant.
7. Delegate specialized analysis.
8. Reconcile subagent results.
9. Produce the final recommendation.
10. State assumptions, risks, and unresolved uncertainty.

## Input Handling
Distinguish supplied facts, derived information, assumptions, and missing
information. Never silently convert missing information into facts.

## Skills
Use declared skills as reusable procedures. Do not reproduce their complete
methodology here. `.agents/skills/<skill>/SKILL.md` is authoritative.

## Subagents
Define when each subagent is used, exactly what context it receives, and its
expected return contract.

## Delegation Rules
Delegate only when specialization materially improves the result. Run
independent analyses in parallel when supported. Never blindly concatenate
subagent responses; reconcile them.

## Decision Authority
The orchestrator owns the final recommendation. When subagents disagree,
identify the disagreement, compare assumptions, resolve it when possible, and
surface material unresolved uncertainty.

## Error Handling
Use documented assumptions/defaults where appropriate. Ask the user only when
missing information prevents meaningful analysis. If a subagent fails, proceed
directly when possible and disclose reduced confidence.

## Output Requirements
Produce every required output declared in frontmatter.

## Quality Checks
- [ ] Inputs were accounted for.
- [ ] Required skills were used.
- [ ] Appropriate subagents were invoked.
- [ ] Subagent results were reconciled.
- [ ] Assumptions are explicit.
- [ ] Required outputs exist.
- [ ] Recommendations have rationale.

## Constraints
Do not fabricate facts, silently alter assumptions, duplicate skill
methodologies, invoke subagents unnecessarily, or expose irrelevant
harness-specific implementation details.

## Completion Criteria
Complete when required analysis is done, delegated work is reconciled, required
outputs exist, risks/assumptions are explicit, and the result is internally
consistent.
```

# Canonical design rules

Keep identity, purpose, role, inputs, outputs, skills, subagent relationships, delegation rules, decision authority, procedures, quality checks, constraints, and completion criteria canonical.

Keep provider-specific settings out unless the translator explicitly supports them: provider model IDs, Claude permission modes, OpenCode permissions, Gemini `kind`, Codex sandbox/reasoning settings, vendor MCP syntax, UI colors, and vendor-specific tool names. Generic canonical tool intent must not be blindly mapped to vendor tool names.

# Subagent discovery and context loading

Subagents should use **progressive context loading**. The parent should not need the full instructions, skills, references, and working context of every available subagent at startup.

```text
Harness starts
     |
     +-- discovers available subagents
     |   usually via compact routing metadata such as name + description
     v
Parent works
     |
     +-- decides a specialist is needed
     v
Invokes selected subagent
     |
     +-- separate/new context where supported
     +-- full subagent instructions become available
     +-- relevant task context is supplied
     +-- relevant skills become discoverable/loadable
     v
Subagent works
     |
     v
Returns result
     |
     v
Parent receives the result, not necessarily the subagent's full working context
```

Exact mechanics differ by harness. "Loaded" does not require literal insertion into the initial prompt: a harness may expose discovery metadata through a tool schema, registry, agent list, or internal mechanism. The semantic requirement is that the parent can discover **which specialists exist and when to use them** without loading their complete prompts.

## What should be available when

| Information | Parent/discovery context | Invoked subagent context |
|---|---:|---:|
| Subagent name | Yes | Yes |
| Subagent description | Yes/equivalent routing metadata | Yes |
| Full subagent instructions | Normally no | Yes |
| Detailed input/output contract | Prefer minimal/on demand | Yes |
| Subagent skill descriptions | Normally no | Yes/on demand |
| Full skill instructions | No | Only when needed |
| Files read by subagent | No | As required |
| Subagent working context | No | Yes |
| Final subagent result | Yes, after completion | Yes |

## Description is routing metadata

Canonical `description` is not merely human documentation. It is the agent's **discovery/routing description** and should state both what the agent does and when it should be invoked.

Avoid:

```yaml
description: Handles geography.
```

Prefer:

```yaml
description: >
  Evaluate and recommend delivery locations based on talent availability,
  cost, timezone coverage, feasibility, and delivery quality. Use when a
  project requires location selection, geographic optimization, or comparison
  of delivery locations.
```

Conceptually, the parent initially needs only compact information such as:

```text
staffing-planner
  "Analyze workforce demand, available supply, gaps, and team composition.
   Use when staffing requirements or supply coverage must be determined."

recruiting-planner
  "Determine external recruiting requirements from staffing gaps. Use when
   internal supply cannot satisfy workforce demand."

geo-planner
  "Evaluate locations based on talent, economics, feasibility, timezone
   coverage, and delivery quality. Use when location selection is required."
```

The parent can identify a need, invoke `geo-planner`, and only then use the full geo-planner instructions. Agent-format enforcement should therefore validate descriptions for routing quality, not merely presence.

## Do not duplicate subagent instructions in orchestrators

An orchestrator should declare the relationship and delegation contract rather than copy the specialist's complete methodology.

Good:

```yaml
subagents:
  - geo-planner
```

With concise parent instructions:

```markdown
## geo-planner

Use `geo-planner` when delivery location materially affects feasibility,
economics, timezone coverage, talent availability, or delivery quality.

Expected return:
- recommended locations;
- alternatives;
- rationale;
- risks;
- confidence.
```

The specialist methodology belongs in the canonical geo-planner agent, and reusable methodology belongs in its skills.

## Three-stage progressive loading model

```text
LEVEL 1 - ORCHESTRATOR
Parent instructions
      |
      +-- compact subagent discovery/routing metadata
      v
decide whether delegation is needed

LEVEL 2 - SUBAGENT
Full selected subagent instructions
      |
      +-- task/context supplied by parent
      +-- skill discovery metadata
      v
perform specialized work

LEVEL 3 - SKILL
Relevant SKILL.md
      |
      +-- references/scripts/assets only as required
      v
execute reusable methodology
```

This avoids loading the orchestrator, every subagent prompt, every skill, and every reference before any specialist is needed. Instead, the parent discovers available specialists, invokes only those required, receives their outputs, reconciles the results, and retains final decision responsibility.

## Context passed to a subagent

When the harness permits selective delegation, pass the minimum sufficient context rather than automatically forwarding the parent's entire working context:

- specific delegated objective;
- relevant input data or files;
- necessary project constraints;
- assumptions affecting the task;
- expected output or return contract.

A useful specialist result is compact and structured:

```text
Recommendation:
Argentina + India

Alternatives:
...

Rationale:
...

Risks:
...

Assumptions:
...

Confidence:
High
```

The parent normally needs this result rather than the specialist's complete intermediate working context.

## Canonical validation implications

Agent-format enforcement should verify that:

- every subagent has a high-quality discovery and routing description;
- descriptions state capability and invocation conditions;
- orchestrators reference subagents explicitly;
- orchestrators state when each subagent should be invoked;
- expected-return contracts are defined where useful;
- specialist methodology is not unnecessarily duplicated in orchestrators;
- subagent responsibilities remain bounded;
- reusable methodology is referenced through skills rather than duplicated;
- parent agents retain reconciliation and final-decision responsibility unless explicitly designed otherwise.

# Native harness formats

## Claude Code

Project custom subagents: `.claude/agents/`.

Native form:

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: inherit
skills:
  - code-review
---

You are a code reviewer.
```

Claude requires `name` and `description`. Its current schema also supports `tools`, `disallowedTools`, `model`, `permissionMode`, `maxTurns`, `skills`, `mcpServers`, `hooks`, `memory`, `background`, `effort`, `isolation`, `color`, and `initialPrompt`.

Canonical mapping: `name -> name`, `description -> description`, `skills -> skills`, compatible model -> `model`, body -> system prompt. Translate `subagents` through orchestration instructions and, where appropriate, Claude's `Agent(...)` allowlisting. Do not blindly map generic tool names. Claude ordinary subagents cannot recursively spawn subagents.

## Codex

Project custom agents: `.codex/agents/*.toml`.

Native minimum:

```toml
name = "reviewer"
description = "Reviews changes for correctness, security, and test risks."
developer_instructions = """
Review code like an owner.
Prioritize correctness, security, regressions, and missing tests.
"""
```

Optional normal Codex config can include:

```toml
model = "gpt-5.6-terra"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
```

Global multi-agent controls live under `[agents]`, for example:

```toml
[agents]
max_concurrent_threads_per_session = 8
```

Canonical mapping: `name -> name`, `description -> description`, Markdown body -> `developer_instructions`; map model only when explicitly Codex-compatible; map skills only through supported `skills.config`; represent canonical subagent relationships through orchestration instructions rather than inventing TOML fields.

Important: current Codex documentation says standalone `.codex/agents/*.toml` files are discovered directly. Do not generate obsolete/made-up per-agent `config_file` registrations.

## Gemini CLI

Project subagents: `.gemini/agents/*.md`.

Representative native form:

```markdown
---
name: security-auditor
description: Specialized in finding security vulnerabilities in code.
kind: local
tools:
  - read_file
  - grep_search
model: <gemini-model>
temperature: 0.2
---

You are a security auditing specialist.
```

Canonical mapping: `name`, `description`, and body map directly; add Gemini-specific `kind: local`; only emit model/tool names after explicit Gemini-compatible mapping. Gemini also has a distinct remote-agent format.

## Google Antigravity

Workspace agents are discovered from:

```text
.agents/agents/<name>.md
```

or:

```text
.agents/agents/<name>/agent.md
```

Representative native form:

```markdown
---
name: code-reviewer
description: Rigorous code review specialist.
mainAgent: true
subagent: true
tools:
  - view_file
  - grep_search
---

You are an expert code reviewer.
```

Documented metadata includes `name`, `description`, `tools`, `mainAgent`, and `subagent`. `mainAgent: true` permits direct selection; `subagent: true` permits invocation through the subagent mechanism.

Conceptual canonical role mapping:
- `agent`: `mainAgent: true`, subagent according to intended use.
- `orchestrator`: `mainAgent: true`, optionally `subagent: true`.
- `subagent`: `mainAgent: false`, `subagent: true`.

Antigravity is closest to the chosen canonical location, so prefer direct consumption. If a future version rejects canonical-only YAML fields, generate directory-form `agent.md` compatibility files instead of weakening the canonical contract.

## OpenCode

Project agents: `.opencode/agents/<name>.md`.

Representative native form:

```markdown
---
description: Reviews changes without modifying files
mode: subagent
model: anthropic/claude-sonnet-4-5
steps: 8
permissions:
  edit: deny
---

You are in code-review mode.
```

OpenCode distinguishes `mode: primary` and `mode: subagent`. The file path supplies the agent ID.

Canonical mapping:
- `description -> description`
- `role: subagent -> mode: subagent`
- `role: agent/orchestrator -> mode: primary` when intended for direct selection
- compatible provider/model -> `model`
- body -> system prompt
- tools/permissions only through explicit OpenCode mappings
- subagent relationships -> orchestration instructions/permissions

# Harness comparison

| Area | Claude Code | Codex | OpenCode |
|---|---|---|---|
| Overall agentic coding | Excellent | Excellent | Very good/excellent |
| Complex autonomous tasks | Excellent | Excellent | Good/excellent |
| Specialized subagents | Excellent | Excellent | Excellent/flexible |
| Skills | Excellent | Excellent | Excellent |
| Project instructions | Strong Claude ecosystem | Strong AGENTS.md | Strong AGENTS.md |
| Hooks/automation | Excellent | Strong/evolving | Flexible |
| Native model family | Claude | OpenAI | Provider-independent |
| Claude models | Native | No | Yes |
| OpenAI models | No | Native | Yes |
| Gemini models | No | No | Yes, with provider support |
| Local models | Not core strength | Not core strength | Strong option |
| Provider independence | Low | Low | Excellent |
| Configuration simplicity | Good | Good | More configurable |
| Extensibility | Excellent | Very good/excellent | Excellent |

Capabilities evolve quickly; treat this as architecture guidance rather than a permanent benchmark.

# Recommendations

## Claude Code
Strong default for difficult autonomous repository work, especially repository understanding, implementation, custom subagents, hooks, skills, MCP, permissions, context management, background work, and worktree isolation.

## Codex
Strong for OpenAI-model-driven iterative engineering: inspect -> reason -> modify -> execute -> test -> inspect failures -> modify again. Current Codex supports custom subagents and parallel multi-agent workflows.

## OpenCode
Best fit when provider independence matters. It can act as a meta-harness across Claude, OpenAI, Gemini, and local/provider-backed models, depending on configured providers.

# Recommended operating model

Do not make a harness the permanent platform. Make `.agents/` the platform:

```text
                       .agents/
                  YOUR CONTROL PLANE
                         |
          +--------------+--------------+
          |              |              |
     Claude Code       Codex         OpenCode
          |                              |
        Claude                     multiple models
```

Recommended usage:
- difficult coding/architecture: Claude Code and Codex;
- multi-model experimentation/routing: OpenCode;
- Gemini-centric work: Gemini CLI;
- Antigravity: use its IDE/async-agent experience and native `.agents/agents`;
- durable organizational intelligence: always keep it in `.agents/`.

# What the agent-format skill should enforce

For every agent definition in any canonical location:

1. Require YAML frontmatter.
2. Require `name`, `description`, `role`.
3. Ensure `name` matches the filename.
4. Restrict role to `agent`, `orchestrator`, `subagent`.
5. Validate every skill against `.agents/skills/<skill>/`.
6. Validate every subagent against another canonical agent.
7. Infer missing relationships from content, not filenames alone.
8. Preserve existing responsibilities when normalizing.
9. Require orchestrators to define delegation and final authority.
10. Require subagents to define bounded responsibility and expected return.
11. Encourage explicit inputs/outputs for non-trivial agents.
12. Keep reusable methodology in skills.
13. Detect missing references and obvious circular delegation.
14. Report orphaned subagents and substantially overlapping agents.
15. Never treat generated harness files as the source of truth.
16. Run `.agents/skills/agents-harness-sync/scripts/sync-agents.sh --dry-run` when available and fix canonical errors until it passes.

The skill should include the canonical template above as its reference/example.

# sync-agents.sh responsibilities

The script is a compatibility compiler:

```text
READ       .agents/agents/*.md
VALIDATE   schema, references, roles, names
TRANSLATE  -> Claude Markdown
           -> Gemini Markdown
           -> OpenCode Markdown
           -> Codex TOML
PRESERVE   canonical instruction body
```

It must not rewrite domain logic, invent provider-specific models, blindly translate tool names, or duplicate skill methodology.

# Important limitation

No single harness implements this entire canonical schema exactly. That is intentional.

```text
canonical agent
      |
      +-- portable intent
      +-- inputs/outputs
      +-- skills
      +-- delegation graph
      +-- instructions
      |
      v
compatibility compiler
      |
      +-- Claude execution metadata
      +-- Codex execution metadata
      +-- Gemini execution metadata
      +-- OpenCode execution metadata
```

The canonical format is a durable abstraction, not the lowest common denominator.

# Documentation basis

Native formats were checked against current documentation on August 29, 2026:
- Claude Code custom subagents;
- OpenAI Codex custom subagents;
- Gemini CLI subagents;
- Google Antigravity custom agents/subagents;
- OpenCode agents and Agent Skills.

Re-check native schemas before major compatibility-compiler changes because these harnesses evolve quickly.
