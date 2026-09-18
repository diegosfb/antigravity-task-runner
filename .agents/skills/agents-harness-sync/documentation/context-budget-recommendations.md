# Context Budget Recommendations

## Purpose

Use this guide to keep the shared `.agents` library context-efficient across Claude Code, Codex, Gemini CLI, Antigravity, and OpenCode. The goal is to keep startup/discovery context small and useful while loading detailed agents, skills, references, source files, and tool results only when needed.

## Recommended startup budget

| Component | Recommended | Upper target |
|---|---:|---:|
| `AGENTS.md` / core project instructions | 1,500-4,000 tokens | ~5,000 |
| Agent discovery metadata | 1,000-3,000 | ~5,000 |
| Skill discovery metadata | 1,000-3,000 | ~5,000 |
| Other startup material | Minimal | Minimal |
| **Total project-controlled startup** | **3,000-8,000** | **~10,000-15,000** |

Use **10,000 tokens** as the default engineering budget. This is not a model context-window limit; it is a recommended budget for repository-controlled material present or discoverable at task startup.

For a 10K budget:

| Usage | Status |
|---|---|
| 0-60% | **GOOD** |
| 60-85% | **WATCH** |
| >85% | **HIGH** |

## Per-resource recommendations

| Resource | Recommended |
|---|---:|
| Agent `description` | ~30-100 tokens |
| Skill `description` | ~30-100 |
| Simple agent body | ~500-1,500 |
| Complex specialist | ~1,500-3,000 |
| Orchestrator | ~1,500-3,500 |
| `SKILL.md` | ~500-2,500 |
| `AGENTS.md` | ~1,500-4,000 |
| References | As needed/on demand |

These are engineering targets, not hard harness limits.

## Progressive context loading

Prefer:

```text
LEVEL 1 - STARTUP
project instructions
+ agent names/descriptions
+ skill names/descriptions
        |
        v
LEVEL 2 - AGENT INVOCATION
full selected agent
+ relevant task context
+ skill discovery
        |
        v
LEVEL 3 - SKILL INVOCATION
relevant SKILL.md
        |
        v
references/scripts/files only when required
```

Avoid eagerly loading every agent, subagent, skill, and reference.

## Descriptions are routing metadata

Agent and skill descriptions should explain **what the resource does and when to use it**.

Avoid:

```yaml
description: Handles geography.
```

Prefer:

```yaml
description: >
  Evaluate and recommend delivery locations based on talent availability,
  economics, timezone coverage, feasibility, and delivery quality. Use when
  a project requires location selection, geographic optimization, or
  comparison of delivery locations.
```

Do not shorten descriptions so aggressively that routing quality deteriorates. A few extra routing tokens can prevent thousands of irrelevant tokens from being loaded later.

## Subagents

The parent should normally know compact discovery information about available subagents, not their complete prompts.

```text
START
  parent + subagent routing metadata
        |
        v
  select specialist
        |
        v
  load full specialist instructions
        |
        v
  load specialist skills as needed
        |
        v
  return compact result to parent
```

When selective delegation is supported, pass only the minimum sufficient context:

- delegated objective;
- relevant inputs/files;
- necessary constraints;
- applicable assumptions;
- expected output contract.

The subagent should return useful results such as recommendation, rationale, assumptions, risks, confidence, and necessary structured evidence. The parent generally does not need the specialist's entire intermediate working context.

Orchestrators should not duplicate complete subagent methodologies. Declare when the specialist should be used and what it should return; keep the specialist methodology in its canonical agent and reusable procedures in skills.

## Healthy example

With 20 agents and 30 skills averaging ~60 discovery tokens:

```text
20 agents x 60 = 1,200
30 skills x 60 = 1,800
AGENTS.md       = 2,500
                  -----
STARTUP        ~= 5,500 tokens
```

The full library can still contain 200K+ tokens because most content is loaded on demand.

Therefore:

```text
LIBRARY SIZE != STARTUP CONTEXT SIZE
```

## Unhealthy example

Avoid:

```text
20 agents x 2,500 = 50,000
30 skills x 2,000 = 60,000
AGENTS.md          =  5,000
                     -------
STARTUP            =115,000 tokens
```

Even if a model can technically accept it, this wastes context and attention before repository work begins.

## Scaling

A library with 40 agents and 60 skills is reasonable if discovery metadata remains compact. At ~60 discovery tokens per resource, 100 resources cost roughly 6,000 tokens.

The architecture should allow the full library to grow without forcing all of it into startup context.

## Optimization order

If startup context grows too large:

1. **Remove duplication.** Eliminate rules repeated across `AGENTS.md`, agents, skills, subagents, and generated harness files.
2. **Improve/shorten routing descriptions.** Preserve what + when while removing background prose.
3. **Move shared methodology into skills.**
4. **Move detailed examples, schemas, tables, and background material into references.**
5. **Reduce `AGENTS.md` to genuinely project-wide rules.**
6. **Review agent overlap.** Consolidate agents with substantially overlapping responsibilities.
7. **Review always-loaded harness-specific configuration.**

Do not prematurely remove useful routing information just to save a few tokens.

## Harness differences

Claude Code, Codex, Gemini CLI, Antigravity, and OpenCode differ in how they expose project instructions, agents, skills, tool schemas, and delegation.

Repository analysis can estimate:

- project instruction files;
- canonical agent discovery metadata;
- canonical skill discovery metadata;
- local agent/skill/reference sizes;
- visible harness configuration.

It cannot accurately measure:

- hidden harness system prompts;
- provider-side instructions;
- hidden/internal tool schemas;
- runtime conversation history;
- implementation-specific context transformations.

Treat context-budget results as **engineering estimates**, not billing-accurate prompt measurements.

## Using context-budget.py

Install at:

```text
.agents/context-budget.py
```

Analyze all supported harnesses:

```bash
./.agents/context-budget.py
```

Analyze one:

```bash
./.agents/context-budget.py --harness claude
./.agents/context-budget.py --harness codex
./.agents/context-budget.py --harness gemini
./.agents/context-budget.py --harness antigravity
./.agents/context-budget.py --harness opencode
```

Change the engineering budget:

```bash
./.agents/context-budget.py --budget 15000
```

Machine-readable output:

```bash
./.agents/context-budget.py --json
```

The analyzer reports core instructions, agent/skill discovery estimates, average description sizes, startup total, budget usage, GOOD/WATCH/HIGH status, complete `.agents` text-library size, startup/library percentage, and descriptions exceeding the ~100-token routing target.

## Recommended automation policy

A local or CI validation can run:

```bash
./.agents/context-budget.py --budget 10000
```

Suggested policy:

```text
GOOD
  no action

WATCH
  warn and review recent additions

HIGH
  require context-budget review
```

Do not automatically fail merely because one description exceeds 100 tokens. Likewise, exceeding 10K may occasionally be justified. These thresholds make context cost visible and intentional.

## Core principle

The key metric is not:

```text
How large is .agents/?
```

It is:

```text
How much of .agents must be present before the harness
knows what information is relevant?
```

A well-designed library can contain hundreds of thousands of tokens of accumulated knowledge while exposing only a few thousand tokens of high-quality discovery information at startup.

Prefer:

```text
DISCOVER -> SELECT -> LOAD -> EXECUTE
```

over:

```text
LOAD EVERYTHING -> TRY TO FIND WHAT MATTERS
```
