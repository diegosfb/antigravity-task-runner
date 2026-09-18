# Gemini CLI Architecture & Customization Guide

## Overview

Gemini CLI is Google's agentic coding tool powered by Gemini models. It is customized through multiple layers:

| Layer | Purpose |
|---|---|
| `GEMINI.md` | Behavior, conventions, and instructions |
| Skills | Reusable procedures and capabilities (via Antigravity) |
| MCP servers | External tool integrations |
| Agents | Delegation and specialization (via Antigravity) |
| Brain | Task planning and implementation tracking |
| Knowledge | Persistent cross-session knowledge base |
| Conversations | Stored session history |
| Browser | Built-in browser automation and recording |

> Gemini CLI does not have native plugins, hooks, or slash-command workflows. These capabilities are provided by the **Antigravity** framework layered on top.

---

## Core Concepts

### Instruction System (GEMINI.md)

`GEMINI.md` is the primary instruction file — the equivalent of `CLAUDE.md` in Claude Code or `AGENTS.md` in Codex. It sets the agent's behavior, conventions, and project context.

**Hierarchy:** loaded from least to most specific, with closer files taking precedence:

```raw
~/.gemini/GEMINI.md          ← global (lowest precedence)
<repo root>/GEMINI.md        ← project
<subdir>/GEMINI.md           ← subdirectory (highest precedence)
```

Supports `#include` directives to pull in Antigravity rules:

```markdown
#include ~/.antigravity/rules/development.md
#include ~/.antigravity/rules/security.md
```

---

### Agents

Agents are specialized execution personas defined as `AGENT.md` files with YAML frontmatter. The format is shared with Antigravity — the same files work across Gemini CLI, Claude Code, and Codex.

**Agent file format:**

```markdown
---
name: architect
description: Software architecture specialist for system design, scalability, and technical decision-making. Use PROACTIVELY when planning new features, refactoring large systems, or making architectural decisions.
tools:
  read: true
  grep: true
  glob: true
model: opus
---

You are a senior software architect...
```

**Frontmatter fields:**

| Field | Purpose |
|---|---|
| `name` | Agent identifier |
| `description` | When to invoke — used for auto-selection |
| `tools` | Boolean map of allowed tools |
| `model` | Model tier (`opus`, `sonnet`, `haiku`) — mapped to Gemini equivalents at runtime |

**Tool specification** uses a YAML boolean map:

```yaml
tools:
  read: true
  grep: true
  glob: true
  bash: true
```

**Locations:**

```raw
User-global:   ~/.gemini/antigravity/agents/<name>/AGENT.md
Project-level: .agent/agents/<name>/AGENT.md
```

**Available global agents:**

| Agent | Role |
|---|---|
| `architect` | System design, scalability, trade-off analysis |
| `code-reviewer` | Quality gates, security, structural style |
| `security-reviewer` | PII, secrets, CVE scanning, OWASP Top 10 |
| `database-reviewer` | SQL efficiency, schema design, Supabase/RLS |
| `ba-analyst` | Jira epics, user stories, acceptance criteria |
| `brainstorming` | Idea validation before implementation |
| `prompt-engineer` | Prompt quality scoring and rewriting |
| `product-specialist` | Competitive analysis, feature fit |
| `project-structure-reviewer` | DevOps posture, IaC, secrets governance |
| `jira-manager` | Jira issue tracking and reporting |
| `todo-assistant` | Project-level TODO list management |
| `workspace-setup` | Baseline project scaffolding |
| `antigravity-config` | Evaluates and improves Antigravity configuration |

---

### Subagents

A subagent is a child agent spawned by the main orchestrator to handle a specific subtask. Subagents run with their own context, execute independently, and return results to the parent.

**Use cases:**
- Parallel codebase exploration before planning
- Concurrent review from multiple specialized angles
- Delegating a long research task while the main session continues

---

### Multi-agent Systems

A composition pattern — not a dedicated file type. The main agent spawns multiple subagents for independent workstreams, collects their results, and synthesizes before the next step.

---

### Skills

Skills are reusable capability packages loaded dynamically when the task matches their description. The format and location structure is shared with Antigravity.

**Skill directory structure:**

```raw
my-skill/
├── SKILL.md           # Required
├── scripts/           # Optional
├── agents/            # Optional — skill-specific agents
└── references/        # Optional — supporting docs
```

**Locations:**

```raw
User-global:   ~/.gemini/antigravity/skills/<name>/SKILL.md
Project-level: .agent/skills/<name>/SKILL.md
```

**Available global skills (via Antigravity):**

| Skill | Domain |
|---|---|
| `agentic-engineering` | Eval-first execution, decomposition, model routing |
| `researcher` | Multi-source deep investigation |
| `git-orchestrator` | Versioning, PR generation, release tagging |
| `e2e-testing` | TestSprite end-to-end orchestration |
| `cloud-deploy` | AWS / GCP / Render rollouts |
| `database-migrations` | Schema changes, rollbacks, zero-downtime |
| `test-driven-development` | Red-Green-Refactor TDD cycle |
| `technical-writer` | Inline docs, ADRs, Mermaid diagrams |
| `explain-me` | Senior Engineer architecture walkthroughs |
| `ui-ux-pro-max` | UI styles, color palettes, UX guidelines |
| `troubleshooting` | Structured debugging and incident response |
| `codebase-onboarding` | Architecture map, conventions, starter GEMINI.md |
| `rag-engineer` | RAG pipelines and vector search |
| `postman-test-scripts` | Postman test script generation |

---

### Tools

Tools are the built-in, atomic operations Gemini CLI can perform. They are fixed by the runtime and cannot be removed, but can be extended via MCP servers.

**Built-in tools:**

| Tool | Purpose |
|---|---|
| `read_file` | Read file contents |
| `write_file` | Create or overwrite files |
| `replace_in_file` | Make targeted edits to existing files |
| `run_shell_command` | Execute shell commands |
| `list_directory` | List directory contents |
| `create_directory` | Create directories |
| `move_file` | Move or rename files |
| `copy_file` | Copy files |
| `web_search` | Search the internet |
| `web_fetch` / `browse` | Fetch a URL or interact with a browser session |

**Adding tools:** only possible via MCP servers (see below).

---

### MCP Servers (Tools)

MCP (Model Context Protocol) servers expose additional tools to Gemini CLI. Unlike Claude Code (where MCP is in `settings.json`) and Codex (where it is in `config.toml`), Gemini CLI stores MCP config in a **separate JSON file**.

**Config location:**

```raw
User-global:   ~/.gemini/antigravity/mcp_config.json
```

**Config format:**

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@org/mcp-server"],
      "env": {}
    }
  }
}
```

**With environment variables:**

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.atlassian.com/v1/forge/mcp"],
      "env": {
        "JIRA_URL": "https://your-org.atlassian.net/"
      }
    }
  }
}
```

**Configured MCP servers on this system:**

| Server | Purpose |
|---|---|
| `TestSprite` | End-to-end UI testing automation |
| `ollama` | Local model inference via Ollama |
| `jira` | Jira issue management |

---

### Brain (Task Planning)

The Brain is an **Antigravity-specific planning system** unique to the Gemini runtime. It provides persistent task tracking across sessions, surviving context resets and conversation restarts.

Each task gets a UUID-named directory under `~/.gemini/antigravity/brain/<uuid>/` containing:

**`task.md`** — A checklist of high-level tasks with status markers:

```markdown
# Node.js + React App Setup

- [x] Plan project architecture     ← completed
- [/] Initialize project directories ← in progress
- [ ] Create React + Vite frontend   ← not started
- [ ] Verify application
```

**`implementation_plan.md`** — Detailed implementation plan with proposed changes, file targets, and verification steps.

**`.resolved` files** — Snapshots of resolved states for rollback and comparison.

**When to use:** the Brain is automatically activated by Antigravity for complex multi-step tasks. It stores the plan before execution and updates task status as work progresses.

**Location:**

```raw
~/.gemini/antigravity/brain/<task-uuid>/
├── task.md
├── task.md.resolved
├── implementation_plan.md
└── implementation_plan.md.resolved
```

---

### Knowledge

The Knowledge system is a persistent, cross-session knowledge base for the Gemini Antigravity workspace.

```raw
~/.gemini/antigravity/knowledge/
├── knowledge.lock     ← prevents concurrent writes
└── browser/           ← browser-sourced knowledge artifacts
```

Used to accumulate domain knowledge, documentation extracts, and reference material that persists across sessions.

---

### Conversations

Gemini CLI stores all conversation history as serialized protobuf (`.pb`) files, organized per project.

```raw
~/.gemini/antigravity/conversations/
├── <uuid>.pb
├── <uuid>.pb
└── ...
```

This enables conversation resumption and history search across sessions. Projects are tracked in:

```raw
~/.gemini/projects.json
```

Which maps workspace paths to project identifiers:

```json
{
  "projects": {
    "/Users/you/my-project": "my-project",
    "/Users/you/another-app": "another-app"
  }
}
```

---

### Browser Integration

Gemini CLI has built-in browser tooling — a unique capability not available in Claude Code or Codex without MCP.

**Capabilities:**
- `browse` tool — interact with web pages, extract content, fill forms
- `web_fetch` — fetch and parse page content
- Browser recordings — stored as session replays in `~/.gemini/antigravity/browser_recordings/`
- HTML artifacts — generated HTML outputs saved in `~/.gemini/antigravity/html_artifacts/`

Browser integration enables tasks like: scraping documentation, testing web UIs, filling forms, and capturing page states — all without an external MCP server.

---

## File Type Reference

| Component | File type | Location |
|---|---|---|
| Instructions | `GEMINI.md` | `~/.gemini/` or repo root or subdirectory |
| Settings | `settings.json` | `~/.gemini/` |
| MCP config | `mcp_config.json` | `~/.gemini/antigravity/` |
| Agents | `AGENT.md` (with YAML frontmatter) | `~/.gemini/antigravity/agents/<name>/` |
| Skills | `SKILL.md` (+ optional dirs) | `~/.gemini/antigravity/skills/<name>/` |
| Rules | `<name>.md` (plain markdown) | `~/.gemini/antigravity/rules/` |
| Brain tasks | `task.md`, `implementation_plan.md` | `~/.gemini/antigravity/brain/<uuid>/` |
| Conversations | `<uuid>.pb` | `~/.gemini/antigravity/conversations/` |
| Projects map | `projects.json` | `~/.gemini/` |
| Knowledge | various | `~/.gemini/antigravity/knowledge/` |
| HTML artifacts | `.html` | `~/.gemini/antigravity/html_artifacts/` |
| Browser recordings | session files | `~/.gemini/antigravity/browser_recordings/` |

---

## Folder Structure Reference

### Global (user home)

```raw
~/
├── .gemini/
│   ├── GEMINI.md                        # Global instructions (often empty / minimal)
│   ├── settings.json                    # Auth type and UI theme only
│   ├── projects.json                    # Project path → ID registry
│   ├── oauth_creds.json                 # OAuth credentials
│   ├── google_accounts.json             # Google account bindings
│   ├── state.json                       # Runtime state
│   ├── trustedFolders.json              # Folders approved for shell execution
│   ├── history                          # CLI input history
│   └── antigravity/                     # Antigravity workspace for Gemini
│       ├── mcp_config.json              # MCP server definitions
│       ├── installation_id              # Unique install identifier
│       ├── agents/
│       │   ├── INDEX.md
│       │   └── architect/
│       │       └── AGENT.md
│       ├── skills/
│       │   ├── INDEX.md
│       │   └── researcher/
│       │       └── SKILL.md
│       ├── rules/
│       │   ├── development.md
│       │   ├── security.md
│       │   └── git-workflow.md
│       ├── brain/
│       │   └── <task-uuid>/
│       │       ├── task.md
│       │       └── implementation_plan.md
│       ├── conversations/
│       │   └── <uuid>.pb
│       ├── knowledge/
│       │   └── knowledge.lock
│       ├── html_artifacts/
│       ├── browser_recordings/
│       ├── scratch/                     # Temporary working directory
│       ├── playground/                  # Experimental area
│       ├── context_state/               # Context snapshots
│       ├── implicit/                    # Implicit context
│       └── annotations/                 # Annotation data
```

### Project level

```raw
my-repo/
├── GEMINI.md                            # Project-level instructions
└── .agent/                              # Project-level Antigravity config
    ├── agents/
    │   └── reviewer/
    │       └── AGENT.md
    ├── skills/
    │   └── my-skill/
    │       └── SKILL.md
    ├── rules/
    │   └── team.md
    └── workflows/
        └── deploy-staging.md
```

---

## settings.json vs mcp_config.json

Unlike Claude Code (where everything is in one `settings.json`) and Codex (where everything is in `config.toml`), Gemini CLI splits configuration across two files with very different scopes:

**`~/.gemini/settings.json`** — minimal runtime settings only:

```json
{
  "security": {
    "auth": {
      "selectedType": "gemini-api-key"
    }
  },
  "ui": {
    "theme": "Default Light"
  }
}
```

**`~/.gemini/antigravity/mcp_config.json`** — all MCP server definitions:

```json
{
  "mcpServers": {
    "TestSprite": {
      "command": "npx",
      "args": ["-y", "@testsprite/testsprite-mcp@latest"],
      "env": {}
    },
    "ollama": {
      "command": "npx",
      "args": ["-y", "ollama-mcp"],
      "env": {
        "OLLAMA_URL": "http://127.0.0.1:11434"
      }
    }
  }
}
```

> There is no equivalent in Gemini CLI to Claude Code's `permissions` block or Codex's `approval_policy` / `sandbox_mode`. Tool access control is handled at the agent level via the `tools:` map in each `AGENT.md`.

---

## Models

Gemini CLI runs on Google's Gemini model family. Antigravity agent files use abstract tiers (`opus`, `sonnet`, `haiku`) which map to Gemini equivalents at runtime:

| Antigravity tier | Gemini equivalent | Use case |
|---|---|---|
| `opus` | Gemini 2.5 Pro | Architecture, complex reasoning, multi-file analysis |
| `sonnet` | Gemini 2.5 Flash | Implementation, reviews, standard tasks |
| `haiku` | Gemini 2.0 Flash | Fast transforms, classification, boilerplate |

---

## What Can Be Customized?

| Component | Customizable | How |
|---|---|---|
| Instructions | Yes | `GEMINI.md` at any level |
| Agents | Yes | `~/.gemini/antigravity/agents/<name>/AGENT.md` |
| Subagents | Yes | Spawned by any agent at runtime |
| Multi-agent | Yes | Composition pattern |
| Skills | Yes | `~/.gemini/antigravity/skills/<name>/SKILL.md` |
| Tools (built-in) | No | Fixed by the runtime |
| Tools (MCP) | Yes | `mcp_config.json` `mcpServers` section |
| Brain planning | Automatic | Created by Antigravity for complex tasks |
| Conversations | Automatic | Stored per session as `.pb` files |
| Knowledge | Yes | Populated via browser and research tools |
| Rules | Yes | Plain markdown in `~/.gemini/antigravity/rules/` |
| Auth / UI | Yes | `settings.json` |
| Trusted folders | Yes | `trustedFolders.json` |

---

## Recommended Usage Hierarchy

1. **`GEMINI.md`** — define conventions, constraints, and persona
2. **Rules** — load Antigravity behavioral mandates via `#include`
3. **Skills** — encode reusable procedures and domain knowledge
4. **MCP servers** — connect external tools via `mcp_config.json`
5. **Agents** — create specialized roles for delegation
6. **Brain** — let Antigravity track complex multi-step task plans

---

## Mental Model Summary

| Concept | What it is |
|---|---|
| Agent | A persona with a role, tool map, and instructions (`AGENT.md`) |
| Subagent | A child agent spawned for a specific subtask |
| Multi-agent | A composition of parallel agents |
| Skill | A reusable capability package (`SKILL.md`) |
| Tool | A built-in atomic operation (read, write, shell, browse) |
| MCP server | A process that exposes additional tools via `mcp_config.json` |
| Brain | Persistent task planning with `task.md` and `implementation_plan.md` |
| Knowledge | Cross-session knowledge base |
| Conversations | Per-session history stored as `.pb` protobuf files |
| Browser | Built-in web interaction — no MCP required |

---

## Key Differences vs Claude Code and Codex

| Feature | Gemini CLI | Claude Code | Codex |
|---|---|---|---|
| Instructions file | `GEMINI.md` | `CLAUDE.md` | `AGENTS.md` |
| Config format | `settings.json` (minimal) | `settings.json` (full) | `config.toml` |
| MCP config | Separate `mcp_config.json` | Inside `settings.json` | Inside `config.toml` |
| Agent format | `AGENT.md` + YAML (tools as map) | `AGENT.md` + YAML (tools as list) | `.toml` |
| Native slash commands | No | Yes — `.claude/commands/` | No |
| Native hooks | No | Yes — `settings.json` | No |
| Persistent memory | Via Brain + Knowledge | Native file-based memory | No |
| Browser built-in | Yes — `browse` tool native | No (needs MCP) | No |
| Conversation history | Yes — `.pb` files per session | No | No |
| Permissions / approval | Via `tools:` map in agents | `settings.json` permissions | `.rules` files |
| Project registry | `projects.json` | No | No |
| Project-level dir | `.agent/` (Antigravity) | `.claude/` | `.codex/` |
| Antigravity home | `~/.gemini/antigravity/` | `~/.antigravity/` (shared) | `~/.antigravity/` (shared) |
| Model family | Gemini 2.5 Pro / Flash | Claude Opus / Sonnet / Haiku | GPT / o-series |

---

## Key Insight

Gemini CLI is a capable agentic runtime with several unique built-in features — native browser integration, persistent conversation history, and a model family optimized for long-context reasoning.

Its native configuration surface is intentionally minimal (`settings.json` covers only auth and UI). The full capability layer — agents, skills, rules, workflows, task planning, and MCP integrations — is provided by the **Antigravity** framework stored in `~/.gemini/antigravity/`.

Understanding both layers is the key to using Gemini CLI effectively: the runtime provides the model and tools; Antigravity provides the workflows, quality gates, and domain knowledge that make those tools useful.
