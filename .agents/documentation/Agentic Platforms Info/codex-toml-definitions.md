# Codex TOML Agent Definitions and Canonical Resources

## Purpose

This document explains how Codex custom-agent TOML files fit into the shared `.agents` architecture, especially when canonical agents use references, scripts, templates, documentation, and Agent Skills.

The key principle is:

> **The Codex TOML file is the Codex-specific agent definition/adapter. It is not the agent's complete resource bundle.**

The durable source of truth remains under `.agents/`.

---

# 1. Recommended architecture

For a complex canonical agent:

```text
.agents/
├── agents/
│   └── geo-planner/
│       ├── geo-planner.md
│       ├── references/
│       │   ├── geo-economics.md
│       │   └── location-tiers.md
│       ├── scripts/
│       │   └── score-location.py
│       ├── templates/
│       │   └── location-report.md
│       └── documentation/
│
└── skills/
    └── location-analysis/
        ├── SKILL.md
        ├── references/
        └── scripts/
```

The Codex compatibility layer contains only the Codex-specific agent definition:

```text
.codex/
└── agents/
    └── geo-planner.toml
```

Conceptually:

```text
.codex/agents/geo-planner.toml
             |
             | instantiates/configures
             v
      +--------------------+
      | Codex subagent     |
      |                    |
      | name               |
      | description        |
      | instructions       |
      | model/config       |
      | sandbox/tools      |
      +---------+----------+
                |
                | operates in project
                v
             .agents/
          /      |       \
         v       v        v
      agents   skills   resources
```

The TOML file does not need to duplicate every reference, script, template, or skill.

---

# 2. What belongs in the Codex TOML

A Codex custom-agent definition primarily establishes the agent identity, routing description, instructions, and any Codex-specific execution configuration.

A representative definition is:

```toml
name = "geo-planner"
description = "Evaluate and recommend delivery locations when geography materially affects feasibility, economics, talent availability, timezone coverage, or delivery quality."

developer_instructions = """
You are the geo-planner specialist.

Evaluate delivery-location alternatives and return recommendations, rationale,
risks, assumptions, and confidence.

Canonical supporting resources for this agent are located under:

.agents/agents/geo-planner/

Use references, scripts, templates, and documentation from that directory when
required.

Reusable skills are maintained under:

.agents/skills/

Do not duplicate or relocate canonical resources into .codex.
"""
```

Codex-specific configuration can also be applied where appropriate, for example:

```toml
model = "<codex-compatible-model>"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
```

Provider/harness-specific execution settings belong in the generated Codex adapter rather than in the portable canonical agent unless there is a deliberate canonical abstraction for them.

---

# 3. What does not need to be copied into `.codex/agents`

Do not create:

```text
.codex/agents/geo-planner/
├── references/
├── scripts/
├── templates/
└── copied-skills/
```

merely because the canonical agent uses those resources.

Keep them in:

```text
.agents/
```

The Codex agent operates in the project workspace and can use canonical project resources subject to its configured tools, sandbox, permissions, and runtime capabilities.

This preserves the central design objective:

```text
ONE canonical resource
       |
       +-- Claude adapter
       +-- Codex adapter
       +-- Gemini adapter
       +-- OpenCode adapter
       +-- Antigravity/native use
```

rather than:

```text
same resource
copied five times
```

---

# 4. Canonical instructions and Codex `developer_instructions`

Suppose the canonical definition is:

```text
.agents/agents/geo-planner/geo-planner.md
```

with YAML metadata followed by Markdown instructions.

The synchronization process should:

1. parse the canonical metadata;
2. translate relevant metadata into Codex TOML;
3. preserve the canonical instruction body;
4. place the applicable instructions into `developer_instructions`;
5. tell the Codex agent where its canonical supporting resources live;
6. avoid copying those supporting resources.

Conceptually:

```text
geo-planner.md
     |
     +-- name -----------------> TOML name
     |
     +-- description ----------> TOML description
     |
     +-- Markdown body --------> developer_instructions
     |
     +-- skills ---------------> preserve/use through shared skill library
     |
     +-- resource location ----> explicit canonical path guidance
```

---

# 5. References

References should remain beside the canonical agent when they are private to that agent:

```text
.agents/agents/geo-planner/
├── geo-planner.md
└── references/
    ├── geo-economics.md
    └── location-tiers.md
```

The generated Codex instructions can state:

```text
Canonical supporting resources are located at:
.agents/agents/geo-planner/

Read material under references/ only when required for the current task.
```

This also preserves progressive context loading.

Do not inject every reference into `developer_instructions`.

Instead:

```text
agent invoked
     |
     v
need reference?
     |
    yes
     |
     v
read .agents/agents/geo-planner/references/<relevant-file>
```

---

# 6. Scripts

Scripts also remain canonical:

```text
.agents/agents/geo-planner/scripts/score-location.py
```

The Codex agent can be instructed to use the script when the task requires it, subject to the agent's sandbox/tool configuration.

For example:

```text
When deterministic location scoring is required, use:
.agents/agents/geo-planner/scripts/score-location.py
```

Do not embed the script's source into the TOML.

Benefits:

- one implementation to maintain;
- no synchronization drift;
- smaller generated adapters;
- easier testing;
- progressive loading/execution.

---

# 7. Templates and assets

The same rule applies to templates and other agent-specific resources:

```text
.agents/agents/geo-planner/templates/location-report.md
```

The generated Codex adapter points to the canonical location rather than copying the file.

For binary assets, large templates, or other non-instruction resources, this separation is even more important.

---

# 8. Skills

Skills should remain under the shared skill library:

```text
.agents/skills/location-analysis/SKILL.md
```

Suppose the canonical agent declares:

```yaml
skills:
  - location-analysis
  - staffing-analysis
```

Do not inject the complete content of both skills into the generated TOML.

The intended progression is:

```text
Codex starts
     |
     +-- knows geo-planner exists
     |
     v
geo-planner invoked
     |
     +-- developer_instructions
     +-- canonical resource location
     |
     v
location-analysis methodology needed?
     |
    yes
     |
     v
.agents/skills/location-analysis/SKILL.md
     |
     v
reference/script needed?
     |
     v
load/use only required resource
```

This preserves context efficiency.

The exact native skill-discovery mechanics should follow the installed Codex version, but `.agents/skills/` remains the canonical source of truth for the shared project architecture.

---

# 9. Flat versus directory canonical agents

Support both canonical layouts.

## Flat agent

Use for agents that need no private supporting resources:

```text
.agents/agents/code-reviewer.md
```

Canonical pattern:

```text
.agents/agents/<agent-name>.md
```

## Directory agent

Use when an agent has private references, scripts, templates, documentation, or other supporting resources:

```text
.agents/agents/geo-planner/
├── geo-planner.md
├── references/
├── scripts/
├── templates/
└── documentation/
```

Canonical pattern:

```text
.agents/agents/<agent-name>/<agent-name>.md
```

The directory and Markdown filename should both match the canonical `name`.

If both forms exist for the same agent:

```text
.agents/agents/geo-planner.md

and

.agents/agents/geo-planner/geo-planner.md
```

treat this as a duplicate/conflict rather than guessing which is authoritative.

---

# 10. Resource-path injection by `sync-agents.sh`

The synchronization script should understand whether an agent is flat or directory-based.

For a directory agent:

```text
.agents/agents/geo-planner/geo-planner.md
```

the generated Codex TOML should include guidance equivalent to:

```toml
developer_instructions = """
[canonical geo-planner instructions]

Canonical supporting resources for this agent are under:

.agents/agents/geo-planner/

When required, use references, scripts, templates, documentation, and other
supporting resources from that directory.

Shared Agent Skills are maintained under:

.agents/skills/

Do not duplicate or relocate canonical resources into .codex.
"""
```

For a flat agent:

```text
.agents/agents/code-reviewer.md
```

there may be no private resource directory to advertise.

The synchronization process should not invent one unless required.

---

# 11. Generated files are adapters

Treat:

```text
.codex/agents/geo-planner.toml
```

as a generated deployment artifact.

Do not treat it as the durable source of the agent.

The relationship is:

```text
CANONICAL
.agents/agents/geo-planner/
        |
        +-- geo-planner.md
        +-- references/
        +-- scripts/
        +-- templates/
        |
        v
sync-agents.sh
        |
        v
CODEX ADAPTER
.codex/agents/geo-planner.toml
```

Therefore:

```text
EDIT .agents/
GENERATE .codex/
```

not:

```text
EDIT BOTH
```

---

# 12. Progressive context loading

This architecture avoids forcing all agent resources into the subagent's initial context.

The desired progression is:

```text
DISCOVERY
name + description
       |
       v
INVOCATION
developer_instructions
       |
       v
SPECIALIZED METHODOLOGY
selected SKILL.md
       |
       v
DEEP DETAIL
selected reference/script/template
```

The complete resource tree may be large while the actual task uses only a small subset.

For example:

```text
geo-planner/
├── geo-planner.md                used
├── references/
│   ├── geo-economics.md          used
│   ├── labor-regulations.md      not needed
│   └── office-infrastructure.md  not needed
├── scripts/
│   └── score-location.py         used
└── templates/
    └── location-report.md        used
```

Only resources required for the task should participate.

---

# 13. Parent and subagent context

When a Codex parent agent delegates to a specialist, the parent should ideally provide the minimum sufficient task context:

- delegated objective;
- relevant inputs;
- relevant files;
- project constraints;
- assumptions;
- expected return format.

The specialist then uses its own instructions and canonical resources.

It should return a compact result such as:

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

The parent needs the specialist's useful result, not necessarily all of its intermediate context.

---

# 14. Example end-to-end flow

```text
User asks for capacity plan
        |
        v
capacity-manager
        |
        | determines geo analysis is required
        v
Codex discovers/invokes geo-planner
        |
        v
.codex/agents/geo-planner.toml
        |
        +-- identity
        +-- routing description
        +-- developer instructions
        +-- Codex execution configuration
        |
        v
geo-planner works in project
        |
        +-- .agents/agents/geo-planner/references/
        +-- .agents/agents/geo-planner/scripts/
        +-- .agents/agents/geo-planner/templates/
        +-- .agents/skills/location-analysis/
        |
        v
geo-planner result
        |
        v
capacity-manager reconciles result
        |
        v
final capacity plan
```

---

# 15. Why this design is preferable

## Single source of truth

All durable behavior and resources remain in `.agents/`.

## No synchronization drift

A reference or script is not copied into four or five harness directories.

## Smaller generated files

Harness adapters contain only what is required to instantiate/configure the agent.

## Progressive context loading

Large references and skill instructions are used only when relevant.

## Harness independence

Replacing Codex does not require moving the canonical agent library.

## Easier version control

Generated adapters can be regenerated deterministically from canonical definitions.

---

# 16. Recommended `sync-agents.sh` responsibilities for Codex

For every canonical agent, the synchronization script should:

1. Discover both supported canonical layouts:
   - `.agents/agents/<name>.md`
   - `.agents/agents/<name>/<name>.md`
2. Reject duplicate definitions for the same canonical name.
3. Parse canonical YAML metadata.
4. Extract the Markdown instruction body.
5. Generate the Codex TOML definition.
6. Map canonical `name` to Codex `name`.
7. Map canonical `description` to Codex `description`.
8. Map the canonical body to `developer_instructions`.
9. Preserve/inject the canonical resource path for directory agents.
10. Point to `.agents/skills/` as the canonical shared skill library where useful.
11. Translate only explicitly compatible Codex model/configuration settings.
12. Never blindly translate generic tool names.
13. Never copy references/scripts/templates merely to build the Codex adapter.
14. Never duplicate skill contents into the TOML.
15. Mark generated files as generated where practical.
16. Make `.agents/` authoritative.

---

# 17. Core principle

The correct mental model is:

```text
TOML != complete agent
```

Instead:

```text
Codex TOML
    =
Codex-specific agent definition
    +
pointer/instructions for using
canonical project resources
```

while:

```text
.agents/
    =
durable agent implementation
    +
skills
    +
references
    +
scripts
    +
templates
    +
documentation
```

The objective is not to make `.codex/agents/` self-contained.

The objective is to make Codex able to execute the canonical agent correctly while maintaining **one copy of the agent's durable intelligence and resources**.
