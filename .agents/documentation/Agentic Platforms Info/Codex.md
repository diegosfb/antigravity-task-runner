# Codex Architecture & Customization Guide

## Overview

Codex is an agentic system customized through multiple layers. Each layer serves a different purpose:

| Layer | Purpose |
|---|---|
| `AGENTS.md` | Behavior and conventions |
| Skills | Reusable procedures and capabilities |
| MCP servers | External tool integrations |
| Agents / Subagents | Delegation and specialization |
| Plugins | Distribution across teams |
| Rules / Requirements | Safety guardrails and governance |

---

## Core Concepts

### Agents

An agent is a configured execution persona. Codex itself runs as an agent.

**Built-in agents:**
- `default`
- `worker`
- `explorer`

**Custom agents** are defined as TOML files under `.codex/agents/`:

```toml
# ~/.codex/agents/reviewer.toml
name = "reviewer"
description = "Reviews code changes for correctness and style."
developer_instructions = """
Focus on bugs, regressions, missing tests, and style issues.
Prefer concise findings with actionable fixes.
"""
```

A custom agent can also override model, sandbox, and tool settings for that persona specifically.

**Two agent-definition patterns exist in practice:**

1. **User-created personas** live in `.codex/agents/*.toml`. These are global or project-scoped agent personas such as `reviewer` or `explorer` variants.
2. **Packaged skill agents** live inside a skill folder, commonly under `agents/*.yaml` such as `agents/openai.yaml`. These are part of a skill package and travel with that skill's scripts, references, and `SKILL.md`.

This is why a skill like `data-scraper-agent` does not use the simple TOML-in-`.codex/agents/` pattern: it is packaged as an agentic skill rather than as a standalone persona override.

---

### Subagents

A subagent is a child agent spawned to handle part of a task.

**Use cases:**
- Parallel work
- Separation of concerns (explore vs. implement vs. review)

Subagents inherit most configuration from the parent unless explicitly overridden.

---

### Multi-agent Systems

Not a first-class file structure — multi-agent setups are a composition pattern, not a dedicated primitive.

Built using:
- A parent agent that orchestrates
- Multiple subagents handling independent workstreams
- Or external orchestration via the Agents SDK

---

### Skills

A skill is a reusable, self-contained capability package. Skills are loaded dynamically when the task matches their description.

**Skill directory structure:**

```
my-skill/
├── SKILL.md        # Required — describes the skill and when to use it
├── agents/         # Optional — packaged agent definitions such as openai.yaml
├── scripts/        # Optional — executable helpers
└── references/     # Optional — supporting docs or context
```

**Discovery:** In this Codex installation, installed and built-in skills are discovered from the Codex skills registry under `.codex/skills/`. Each skill is still a directory whose entrypoint is `SKILL.md`.

**Locations:**

```
User-global: ~/.codex/skills/my-skill/SKILL.md
Built-in system skills: ~/.codex/skills/.system/<skill-name>/SKILL.md
```

> **Important:** In this environment, global installed skills live in `~/.codex/skills/`, including built-in system skills under `~/.codex/skills/.system/`. The `.agents/` tree is still useful for plugin-style assets such as marketplace metadata, but it is not where the active installed skills are stored here.

**Why some skills use YAML agent files:**

- Core Codex personas are typically defined in TOML under `.codex/agents/`.
- Distributed or packaged skills may include agent definitions inside the skill itself, often as YAML files such as `agents/openai.yaml`.
- That keeps the skill self-contained and portable: if the skill folder is removed, its agent definitions disappear with it, avoiding broken references to missing scripts or resources.
- In short:
  - `.codex/agents/*.toml` is for user-created personas.
  - `.codex/skills/<skill>/agents/*.yaml` is for packaged agentic skills.
- If `~/.codex/agents/` does not exist yet, that usually just means no manual personas have been created.

---

### Workflows

Codex does not have a dedicated workflow primitive. There is no native `/workflow` file type or built-in workflow runner.

Workflows are instead **composed** from other components:
- A skill can encode a multi-step procedure in its `SKILL.md`
- An agent can orchestrate subagents in sequence
- External scripts or CI pipelines can chain Codex invocations

---

### Tools (MCP)

Tools are external capabilities provided via MCP (Model Context Protocol) servers. Codex auto-discovers tools exposed by connected MCP servers — they appear automatically to the main agent, subagents, and custom agents (unless restricted).

**Configured in `config.toml`:**

```
User-level:   ~/.codex/config.toml
Project-level: <repo>/.codex/config.toml   (overrides user-level for trusted repos)
```

**Basic MCP config:**

```toml
[mcp_servers.my_server]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem"]
```

**With optional fields:**

```toml
[mcp_servers.my_server]
command = "node"
args = ["index.js"]
env = { API_KEY = "xxx" }
cwd = "/path/to/server"
```

MCP tools do not need to be imported like skills — once the server is configured and running, the tools it exposes are available immediately.

---

### Plugins

A plugin is a shareable, installable package that bundles:
- Skills
- MCP server configurations
- App integrations

Used when you want to distribute a capability set across teams or projects. Plugins often pre-wire MCP servers so consumers don't need to configure them manually.

---

### Rules

Rules define **command execution guardrails** — what Codex is allowed, required to confirm, or not allowed to run.

> Not to be confused with Antigravity rules, which are behavioral guidelines loaded into AGENTS.md. These `.rules` files control shell command policy.

**Written in `.rules` files** (not `.md`):

```
# Allow safe read-only commands
allow("git status")
allow("npm test")

# Require confirmation before write operations
prompt("git push")

# Block destructive commands
deny("rm -rf /")
deny("sudo *")
```

**Locations:**

```
User-level (global):   ~/.codex/rules/
Project-level:         <repo>/.codex/rules/
```

---

### Requirements (Admin Rules)

`requirements.toml` defines enforced, non-overridable policies — used for security and organizational governance. Unlike rules, these cannot be changed by individual users.

---

## File Type Reference

| Component | File type | Location |
|---|---|---|
| Agent instructions | `AGENTS.md` | `~/.codex/` or repo root |
| Instructions override | `AGENTS.override.md` | Same as `AGENTS.md` |
| Configuration | `config.toml` | `~/.codex/` or `<repo>/.codex/` |
| Custom agents | `*.toml` | `.codex/agents/` |
| Packaged skill agents | `*.yaml` (for example `openai.yaml`) | `~/.codex/skills/<name>/agents/` |
| MCP config | `config.toml` (section) | `.codex/config.toml` |
| Skills | `SKILL.md` (+ optional dirs) | `~/.codex/skills/<name>/` |
| Plugin manifest | `plugin.json` | `.codex-plugin/` |
| Rules | `*.rules` | `.codex/rules/` |
| Requirements | `requirements.toml` | Admin-managed |

---

## Folder Structure Reference

### Global (user home)

```
~/
├── .codex/                         # Codex config, instructions, and installed skills
│   ├── AGENTS.md
│   ├── AGENTS.override.md
│   ├── config.toml
│   ├── agents/
│   │   ├── reviewer.toml
│   │   └── explorer.toml
│   ├── rules/
│   │   ├── default.rules
│   │   ├── git.rules
│   │   └── security.rules
│   └── skills/
│       ├── .system/
│       │   └── imagegen/
│       │       └── SKILL.md
│       ├── code-review/
│       │   ├── SKILL.md
│       │   ├── agents/
│       │   │   └── openai.yaml
│       │   ├── scripts/
│       │   └── references/
│       └── release-check/
│           └── SKILL.md
└── .agents/
    └── plugins/
        └── marketplace.json
```

### Project level

```
my-repo/
├── AGENTS.md
├── AGENTS.override.md
├── .codex/                         # Project-level Codex config
│   ├── config.toml
│   ├── agents/
│   │   └── reviewer.toml
│   └── rules/
│       └── team.rules
├── .agents/                        # Project plugin metadata and related assets
│   └── plugins/
│       └── marketplace.json
├── .codex-plugin/                  # If this repo is itself a plugin
│   └── plugin.json
└── src/
```

### Mental split

| Directory | Contains |
|---|---|
| `.codex/` | Instructions (`AGENTS.md`), config (`config.toml`), custom agents (`agents/*.toml`), rules (`rules/*.rules`), installed skills (`skills/<name>/SKILL.md`), packaged skill agents (`skills/<name>/agents/*.yaml`) |
| `.agents/` | Plugin marketplace references and related plugin assets |

Rule of thumb: **put instructions, config, and installed skills in `.codex/`; use `.agents/` for plugin-oriented metadata/assets when needed.**

---

## config.toml Sections

`config.toml` controls how Codex behaves, what it can access, and how it runs.

**a. Model and AI behavior**

```toml
model = "o4-mini"
model_reasoning_effort = "high"
```

**b. Execution safety (sandbox + approvals)**

```toml
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = true
```

**c. MCP servers**

```toml
[mcp_servers.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem"]
```

**d. Custom agent overrides**

```toml
[agents.reviewer]
description = "Code review specialist"
```

**e. Environment and runtime**

```toml
[env]
API_KEY = "xxx"
```

---

## AGENTS.md Hierarchy

Instructions are composed from multiple `AGENTS.md` files, applied in order from least to most specific:

```
~/.codex/AGENTS.md          ← global (lowest precedence)
<repo root>/AGENTS.md       ← project
<current dir>/AGENTS.md     ← local (highest precedence)
```

`AGENTS.override.md` at any level takes precedence over all `AGENTS.md` files at the same level and below.

---

## What Can Be Customized?

| Component | Customizable | How |
|---|---|---|
| `AGENTS.md` | Yes | Freeform instructions, any directory |
| Custom agents | Yes | `.codex/agents/*.toml` |
| Packaged skill agents | Yes | `~/.codex/skills/<name>/agents/*.yaml` |
| Subagents | Yes | Spawned by any agent at runtime |
| Multi-agent | Yes | Composition pattern via orchestrating agent |
| Skills | Yes | `~/.codex/skills/<name>/SKILL.md` |
| Plugins | Yes | `.codex-plugin/plugin.json` |
| Workflows | Partial | No native primitive; compose via skills + agents |
| Tools (MCP) | Yes | `config.toml` `[mcp_servers.*]` sections |
| Rules | Yes | `.codex/rules/*.rules` |
| Requirements | Limited | Admin-level only, not user-overridable |

---

## Recommended Usage Hierarchy

1. **`AGENTS.md`** — define conventions, constraints, and persona
2. **Skills** — encode reusable procedures
3. **MCP servers** — connect external capabilities
4. **Custom agents** — create specialized roles
5. **Plugins** — bundle and distribute across teams
6. **Rules / Requirements** — enforce safety and governance

---

## Spoken Implementation Plans

This repository can use macOS speech to explain an implementation plan before
the user approves it. The project-level `spoken_plan` object in
`ADLC_workflow_settings.json` controls audio only; the written plan and explicit
approval gate remain mandatory in every mode.

| Setting | Behavior |
|---|---|
| `spoken_plan.enabled: true` | Create a conversational, secret-free narration in a temporary file outside the repository and play it with `scripts/speak-plan.sh`. |
| `spoken_plan.enabled: false` | Present only the written plan. This is also the fail-safe default for a missing, unreadable, or invalid value. |
| `spoken_plan.interrupted_by_next_command: true` | Start narration asynchronously, present the written plan immediately, and stop active speech before processing the next user message, including an approval. |
| `spoken_plan.interrupted_by_next_command: false` | Finish narration before presenting the written plan and approval prompt. This is the fail-safe default for a missing or invalid value. |

The helper uses the macOS `say` command and therefore requires macOS audio
support. Starting, finishing, or stopping narration never counts as approval;
implementation begins only after an explicit user response approving the
written plan. Narration files must not contain secrets and must remain outside
the repository so they cannot be committed accidentally.

If no audio plays, confirm that the settings are valid booleans, `say` is
available, system audio is not muted, and the helper is executable. Use
`scripts/speak-plan.sh stop` to end an active narration. The agent must report
invalid settings and continue with the mandatory written approval workflow.

---

## Mental Model Summary

| Concept | What it is |
|---|---|
| Agent | A persona executing tasks (built-in or custom) |
| Subagent | A child agent delegated a specific subtask |
| Multi-agent | A composition of agents working in parallel |
| Skill | A reusable, self-contained capability package |
| Plugin | An installable bundle of skills and MCP configs |
| Workflow | A composed sequence — not a native primitive |
| Tool (MCP) | An external capability exposed by an MCP server |
| Rule | A command execution guardrail (allow/deny/prompt) |
| Requirement | An enforced, non-overridable governance policy |

---

## Key Insight

Codex is not built around a single abstraction. It is a layered system where:

- **Instructions** (`AGENTS.md`) guide behavior
- **Skills** encode reusable knowledge and procedures
- **Agents** enable specialization and delegation
- **MCP** connects the outside world
- **Plugins** package everything for distribution
- **Rules** keep execution safe

Understanding how these layers compose is the key to using Codex effectively.
