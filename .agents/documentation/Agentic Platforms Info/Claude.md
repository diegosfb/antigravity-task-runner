# Claude Code Architecture & Customization Guide

## Overview

Claude Code is an agentic CLI customized through multiple layers. Each layer serves a different purpose:

| Layer | Purpose |
|---|---|
| `CLAUDE.md` | Behavior, conventions, and instructions |
| Skills | Reusable procedures and capabilities |
| MCP servers | External tool integrations |
| Agents / Subagents | Delegation and specialization |
| Commands | Native slash command workflows |
| Plugins | Distribution across teams |
| Hooks | Event-driven shell automation |
| Memory | Persistent cross-session context |
| Permissions | Tool-level allow / deny policy |

### Using the shared `.agents` library

Claude can discover project skills directly from `.agents/skills/`; no skill
symlink or copy step is required. Keep each skill at
`.agents/skills/<name>/SKILL.md` with its supporting files in the same folder.

Canonical agents remain under `.agents/agents/`. Run the shared
`agents-harness-sync` skill after adding, removing, renaming, or changing an
agent. Its final synchronization step creates or refreshes the flattened links
under `.claude/agents/` that Claude uses for agent discovery:

```bash
.agents/skills/agents-harness-sync/scripts/sync-agents.sh
```

The package deployment scripts run `agents-harness-sync` automatically after
downloading their selected components.

| Shared source | Claude discovery behavior |
|---|---|
| `.agents/agents/**/<name>.md` | `agents-harness-sync` exposes it as `.claude/agents/<name>.md`. |
| `.agents/skills/<name>/SKILL.md` | Discovered directly; no symlink is needed. |
| `.agents/workflows/<name>.md` | Not converted by `agents-harness-sync`; expose it as a Claude command only when that workflow needs a Claude-specific adapter. |

Agent synchronization is owned by `agents-harness-sync`; a separate skill
linking step is unnecessary.

---

## Core Concepts

### Agents

An agent is a configured execution persona with a specific role, tool set, and behavioral instructions. Claude Code itself runs as the main orchestrating agent.

**Custom agents** are defined as markdown files with YAML frontmatter:

```markdown
---
name: code-reviewer
description: Reviews code for bugs, security vulnerabilities, and code quality issues
tools: Glob, Grep, Read, WebFetch, TodoWrite
model: sonnet
color: red
---

You are an expert code reviewer. Focus on high-confidence issues only...
```

**Frontmatter fields:**

| Field | Purpose |
|---|---|
| `name` | Agent identifier |
| `description` | When to invoke this agent (used for auto-selection) |
| `tools` | Comma-separated list of allowed tools |
| `model` | Model to use (`sonnet`, `opus`, `haiku`, or `inherit`) |
| `color` | Visual label color in the UI |

**Locations:**

```
User-global:   ~/.claude/agents/<name>.md
Project-level: <repo>/.claude/agents/<name>.md
```

**Browsing agents — `/agents` command:**

Typing `/agents` in Claude Code opens the agent library UI with three sections:

| Section | Contents |
|---|---|
| Running | Agents currently active in the session |
| Library | All available agents (user + built-in) |
| Create new agent | Shortcut to scaffold a new `AGENT.md` |

**User agents** — loaded from `~/.claude/agents/`, shown with their model and any special flags:

| Agent | Model | Notes |
|---|---|---|
| `ca-tax-advisor` | `sonnet` | Custom domain agent |
| `pr-agent` | `inherit` | Inherits parent model; has `user memory` enabled |

**Built-in agents** — always available regardless of user config:

| Agent | Model | Purpose |
|---|---|---|
| `claude-code-guide` | `haiku` | Answers questions about Claude Code features and API |
| `Explore` | `haiku` | Fast codebase exploration — file search, keyword search |
| `general-purpose` | `inherit` | Open-ended research and multi-step tasks |
| `Plan` | `inherit` | Software architecture and implementation planning |
| `statusline-setup` | `sonnet` | Configures the Claude Code status line setting |

The `inherit` model means the agent uses whatever model the parent session is running on.

**Invoking an agent:**

There are three ways to engage a custom agent:

**Option 1 — Auto-routing (implicit)**
Just ask a question in the agent's domain. The main agent detects relevance from the agent's `description` field and routes automatically:
```
"What's my estimated tax liability on $50K in RSU vesting this year?"
```

**Option 2 — Explicit invocation by name**
Reference the agent by name in natural language:
```
"Use the ca-tax-advisor to help me think through whether to do a backdoor Roth this year."
```

**Option 3 — Under the hood**
Both options above result in the same thing: the main agent calls the `Agent` tool with `subagent_type` set to the agent's name and your question as the prompt:
```
Agent(subagent_type: "ca-tax-advisor", prompt: "...")
```

---

### Subagents

A subagent is a child agent spawned mid-conversation to handle a specific task. The main agent uses the `Agent` tool to create them.

**Key properties:**
- **Isolated context** — the subagent only sees what it's briefed with, not the full conversation
- **Parallel capable** — multiple subagents can run concurrently for independent workstreams
- **Ephemeral** — they complete and return a result; they do not persist
- **Worktree isolation** — can run in a separate git worktree to avoid interfering with the main working state

**When to use subagents:**
- Codebase exploration while the main agent continues planning
- Parallel code review from multiple perspectives
- Delegating a long-running research task

---

### Multi-agent Systems

Not a dedicated file type — a composition pattern where the orchestrating agent spawns multiple subagents for concurrent or sequential work.

Built using:
- A parent agent that manages the overall task
- Multiple subagents each handling an independent workstream
- Results merged by the parent before the next step

Example: a feature development command might spawn 2-3 `code-explorer` agents in parallel to analyze different aspects of a codebase, then 3 `code-reviewer` agents in parallel after implementation.

---

### Skills

A skill is a reusable, lightweight playbook stored as a `SKILL.md` file. When invoked, it injects specialized guidance and procedures into the active session.

**Invoking a skill:**

| Method | Syntax | Example |
|---|---|---|
| Slash command | `/skill-name` | `/commit`, `/simplify` |
| With arguments | `/skill-name arg1 arg2` | `/commit fix auth bug` |
| Automatic | Claude picks it up when the task matches the skill's `description` | — |

**Skill directory structure:**

```
my-skill/
├── SKILL.md        # Required — describes the skill and when/how to use it
├── scripts/        # Optional — executable helpers
├── agents/         # Optional — skill-specific agent definitions
└── references/     # Optional — supporting docs or context
```

**Locations:**

```
User-global:   ~/.claude/skills/<name>/SKILL.md
               (or ~/.antigravity/skills/<name>/SKILL.md with Antigravity)
Project-shared: <repo>/.agents/skills/<name>/SKILL.md
Claude-native: <repo>/.claude/skills/<name>/SKILL.md (optional)
```

Skills are auto-selected by relevance or explicitly referenced by name. They inject specialized guidance and domain knowledge into the active session without forcing a fixed execution sequence.

---

### Commands (Workflows)

Commands are **native slash commands** — the Claude Code equivalent of workflows. Unlike Codex, this is a first-class primitive.

A command is a markdown file that defines a structured, repeatable procedure. Users trigger it with `/command-name [arguments]`.

**Command file structure:**

```markdown
---
description: Guided feature development with codebase understanding and architecture focus
argument-hint: Optional feature description
---

# Feature Development

Command instructions here. Use $ARGUMENTS to reference user input.

## Phase 1: Discovery
1. Create todo list
2. Understand the request...

## Phase 2: Exploration
Launch agents in parallel...
```

**Frontmatter fields:**

| Field | Purpose |
|---|---|
| `description` | Short description shown in command picker |
| `argument-hint` | Hint for what arguments the command accepts |

**Locations:**

```
User-global:   ~/.claude/commands/<name>.md
Project-level: <repo>/.claude/commands/<name>.md
Plugin-level:  <plugin>/commands/<name>.md
```

---

### Tools

Tools are the atomic, low-level primitives Claude Code can call. They are built into the runtime and cannot be added or modified directly.

**Built-in tools:**

| Tool | Purpose |
|---|---|
| `Read` | Read files |
| `Write` | Create or overwrite files |
| `Edit` | Make targeted edits to existing files |
| `Bash` | Execute shell commands |
| `Grep` | Search file contents |
| `Glob` | Find files by pattern |
| `Agent` | Spawn a subagent |
| `WebSearch` | Search the internet |
| `WebFetch` | Fetch a URL |
| `TodoWrite` | Manage task lists |
| `Monitor` | Stream output from a background process |
| `NotebookEdit` | Edit Jupyter notebooks |

**Adding tools:** only possible via MCP servers (see below). The built-in list is fixed.

---

### MCP Servers (Tools)

MCP (Model Context Protocol) servers expose additional tools to Claude Code. Once connected, those tools behave exactly like built-in ones.

**Configured in `settings.json`:**

```
User-level:   ~/.claude/settings.json
Project-level: <repo>/.claude/settings.json
```

**Basic MCP config:**

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@org/mcp-server"]
    }
  }
}
```

**With optional fields:**

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["index.js"],
      "env": { "API_KEY": "xxx" },
      "cwd": "/path/to/server"
    }
  }
}
```

MCP tools do not need to be imported — once the server is running, its tools are immediately available to the main agent, subagents, and custom agents.

---

### Plugins

A plugin is a shareable, installable package that bundles any combination of:
- Skills
- Agents
- Commands (slash commands)
- MCP server configurations
- Hooks

The plugin manifest lives at `.claude-plugin/plugin.json`:

```json
{
  "name": "my-plugin",
  "description": "What this plugin provides",
  "author": {
    "name": "Author Name",
    "email": "author@example.com"
  }
}
```

Plugins are installed from a marketplace and often pre-wire MCP servers so consumers don't need to configure them manually.

---

### Hooks

Hooks are shell commands that execute automatically in response to Claude Code events. They are unique to Claude Code — no equivalent exists in Codex.

**Hook events:**

| Event | When it fires |
|---|---|
| `SessionStart` | At the beginning of a new session |
| `PreToolUse` | Before any tool call |
| `PostToolUse` | After any tool call completes |
| `Notification` | When Claude sends a notification |
| `Stop` | When Claude finishes responding |

**Configured in `settings.json`** or via a plugin's `hooks/hooks.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash scripts/post-bash.sh"
          }
        ]
      }
    ]
  }
}
```

Hooks receive context about the triggering event via environment variables (e.g., the tool name, input, output). They can block tool execution by returning a non-zero exit code.

---

### Memory

Memory is a persistent, file-based system for storing cross-session context. It is unique to Claude Code — no equivalent exists in Codex.

**Memory types:**

| Type | What it stores |
|---|---|
| `user` | User role, preferences, knowledge level |
| `feedback` | Corrections and validated approaches |
| `project` | Goals, decisions, deadlines, open questions |
| `reference` | Pointers to external systems and resources |

**Location:**

```
~/.claude/projects/<project-hash>/memory/
├── MEMORY.md          # Index — loaded into every session
├── user_role.md
├── feedback_testing.md
└── project_goals.md
```

Each memory file uses frontmatter:

```markdown
---
name: feedback on testing approach
description: User prefers real DB in tests, not mocks — past incident
type: feedback
---

Do not mock the database in tests.

**Why:** A prior incident where mocked tests passed but the prod migration failed.
**How to apply:** Always use a real test database in integration tests for this project.
```

`MEMORY.md` is the index — one line per memory file. It is loaded into every session automatically.

---

### Permissions

Permissions define which tools Claude Code can use without prompting, and which are always blocked. Configured in `settings.json`.

```json
{
  "permissions": {
    "allow": [
      "Bash(git status)",
      "Bash(npm test)",
      "Read(*)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push --force)"
    ]
  }
}
```

Permissions use glob-style patterns. Tools not matching any rule prompt the user for approval.

---

## File Type Reference

| Component | File type | Location |
|---|---|---|
| Instructions | `CLAUDE.md` | `~/.claude/` or repo root or subdirectory |
| Configuration | `settings.json` | `~/.claude/` or `<repo>/.claude/` |
| Custom agents | `<name>.md` (with frontmatter) | `.claude/agents/` |
| Skills | `SKILL.md` (+ optional dirs) | `.agents/skills/<name>/` (shared) or `.claude/skills/<name>/` |
| Commands | `<name>.md` (with frontmatter) | `.claude/commands/` |
| Plugin manifest | `plugin.json` | `.claude-plugin/` |
| Hooks (plugin) | `hooks.json` | `<plugin>/hooks/` |
| Memory index | `MEMORY.md` | `~/.claude/projects/<hash>/memory/` |
| Memory files | `<topic>.md` (with frontmatter) | same as above |

---

## Folder Structure Reference

### Global (user home)

```
~/
├── .claude/
│   ├── CLAUDE.md                   # Global instructions
│   ├── settings.json               # Global config (MCP, permissions, hooks)
│   ├── agents/
│   │   ├── code-reviewer.md
│   │   └── architect.md
│   ├── commands/
│   │   └── deploy.md
│   ├── skills/
│   │   └── researcher/
│   │       └── SKILL.md
│   └── projects/
│       └── <project-hash>/
│           └── memory/
│               ├── MEMORY.md
│               └── user_role.md
```

### Project level

```
my-repo/
├── CLAUDE.md                       # Project instructions
├── .claude/
│   ├── settings.json               # Project config (overrides global for trusted repos)
│   ├── agents/
│   │   └── reviewer.md
│   └── commands/
│       └── release.md
├── .claude-plugin/                 # If this repo is itself a plugin
│   └── plugin.json
└── src/
```

### Mental split

| Directory | Contains |
|---|---|
| `~/.claude/` | Global config, agents, commands, skills, memory |
| `<repo>/.claude/` | Project-level overrides for config, agents, commands |
| `<repo>/CLAUDE.md` | Project instructions (loaded after global `~/.claude/CLAUDE.md`) |
| `.claude-plugin/` | Plugin manifest (if the repo is a distributable plugin) |

---

## settings.json Sections

`settings.json` controls runtime behavior, tool access, and integrations.

**a. MCP servers**

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"]
    }
  }
}
```

**b. Permissions**

```json
{
  "permissions": {
    "allow": ["Bash(git *)", "Read(*)", "Write(src/*)"],
    "deny": ["Bash(sudo *)", "Bash(rm -rf *)"]
  }
}
```

**c. Hooks**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "bash hooks/pre-bash.sh" }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [{ "type": "command", "command": "bash hooks/lint.sh" }]
      }
    ]
  }
}
```

**d. Environment variables**

```json
{
  "env": {
    "NODE_ENV": "development",
    "API_BASE_URL": "http://localhost:3000"
  }
}
```

---

## CLAUDE.md Hierarchy

Instructions are composed from multiple `CLAUDE.md` files in order from least to most specific. More specific files can override or extend earlier ones.

```
~/.claude/CLAUDE.md            ← global (lowest precedence)
<repo root>/CLAUDE.md          ← project
<subdir>/CLAUDE.md             ← subdirectory (highest precedence)
```

`CLAUDE.md` files support `#include` directives to pull in external rule files:

```markdown
#include /path/to/rules/coding-style.md
#include /path/to/rules/security.md
```

---

## What Can Be Customized?

| Component | Customizable | How |
|---|---|---|
| Instructions | Yes | `CLAUDE.md` at any level |
| Custom agents | Yes | `.claude/agents/<name>.md` |
| Subagents | Yes | Spawned by any agent at runtime |
| Multi-agent | Yes | Composition pattern via orchestrating agent |
| Skills | Yes | `.agents/skills/<name>/SKILL.md` (shared) or `.claude/skills/<name>/SKILL.md` |
| Commands | Yes | `.claude/commands/<name>.md` |
| Tools (built-in) | No | Fixed by the runtime |
| Tools (MCP) | Yes | `settings.json` `mcpServers` section |
| Plugins | Yes | `.claude-plugin/plugin.json` |
| Hooks | Yes | `settings.json` or plugin `hooks/hooks.json` |
| Memory | Yes | Written automatically or on request |
| Permissions | Yes | `settings.json` `permissions` section |

---

## Recommended Usage Hierarchy

1. **`CLAUDE.md`** — define conventions, constraints, and persona
2. **Skills** — encode reusable procedures and domain knowledge
3. **Commands** — define repeatable multi-step workflows as slash commands
4. **MCP servers** — connect external capabilities
5. **Custom agents** — create specialized roles for delegation
6. **Hooks** — automate quality checks and side effects on tool events
7. **Plugins** — bundle and distribute capabilities across teams
8. **Permissions** — enforce tool-level safety boundaries

---

## Mental Model Summary

| Concept | What it is |
|---|---|
| Agent | A persona with a role, tool set, and instructions |
| Subagent | A child agent spawned for a specific subtask |
| Multi-agent | A composition of parallel or sequential agents |
| Skill | A reusable, self-contained capability package |
| Command | A native slash command — a scripted workflow |
| Tool | A built-in atomic primitive (Read, Write, Bash, etc.) |
| MCP server | A process that exposes additional tools |
| Plugin | An installable bundle of skills, agents, commands, and hooks |
| Hook | A shell script triggered by a Claude Code event |
| Memory | Persistent, file-based cross-session context |
| Permission | A tool-level allow / deny rule |

---

## Key Differences vs Codex

| Feature | Claude Code | Codex |
|---|---|---|
| Instructions file | `CLAUDE.md` | `AGENTS.md` |
| Configuration format | `settings.json` (JSON) | `config.toml` (TOML) |
| Agent definition format | Markdown + YAML frontmatter | TOML file |
| Native slash commands | Yes — `.claude/commands/` | No native primitive |
| Hooks | Yes — event-driven shell scripts | No equivalent |
| Persistent memory | Yes — file-based per project | No equivalent |
| Permissions | Yes — `settings.json` `permissions` | `.rules` files |
| Skills location | `.agents/skills/` shared; `.claude/skills/` native | `.agents/skills/` |
| Config location | `.claude/settings.json` | `.codex/config.toml` |

---

## Command Execution Model

When Claude executes a command it operates as an autonomous agent using a 3-level system of skills, rules, and workflows.

### 1. The Core Agent (Claude)

The primary orchestrator — interprets natural language, plans steps, and manages the context window. Can spawn specialized subagents to handle parallel work (e.g., one agent writes tests while another edits code).

### 2. Skills (`.agents/skills/` or `.claude/skills/`)

Specialized playbooks (`SKILL.md` files) that extend Claude's capabilities for a task.

- **Discovery:** progressive loading — YAML metadata first, then markdown body, then linked files — minimizing tokens used
- **Execution environment:** sandbox with access to the filesystem, bash commands, and code execution
- **Invocation:** slash command (`/skill-name`), explicit request by name, or automatic detection from task description

### 3. Rules & Context (`CLAUDE.md`)

Define how Claude behaves in specific scenarios.

| Scope | Location | Content |
|---|---|---|
| Global | `~/.claude/CLAUDE.md` | General preferences, coding style, tool policies |
| Project | `<repo>/CLAUDE.md` | Repo-specific instructions ("always use TypeScript", "run npm test after editing") |
| Subdirectory | `<subdir>/CLAUDE.md` | Override for a specific area of the repo |

Best practices encoded in rules: branch naming, PR process, testing procedures, language constraints.

### 4. Workflows (Agentic Loop)

Every command follows a three-phase loop:

```
1. Gather Context   → read files, grep codebase, analyze current state
2. Take Action      → write code, edit files, call external systems via MCP
3. Verify Results   → compile, run tests, check for errors, self-correct if needed
```

The loop repeats until the goal is met or requires user input.

### 5. Interaction Mechanisms

| Mechanism | Purpose |
|---|---|
| Slash commands (`/`) | Quick automation of pre-defined workflows (`/fix`, `/review`, `/test`) |
| MCP | Connects Claude to external systems (Jira, GitHub, Linear) for context-aware actions |
| Subagents | Parallel task execution with isolated context |
| Hooks | Shell scripts triggered on tool events (`PreToolUse`, `PostToolUse`) |

### Example: Command Execution Map

```
> claude implement user auth feature

Skill used:    AuthBuilder (specialized auth skill)
Rule applied:  CLAUDE.md → "Use OAuth2.0"
Workflow:      Read Requirements → Write Code → Create Test → Run Test
Subagents:     code-writer (parallel) + test-writer (parallel) → reviewer
```

---

## Key Insight

Claude Code is not built around a single abstraction. It is a layered system where:

- **Instructions** (`CLAUDE.md`) guide behavior across every session
- **Skills** encode reusable procedures and domain knowledge
- **Commands** define repeatable slash-command workflows natively
- **Agents** enable specialization and parallel delegation
- **MCP servers** connect the outside world
- **Hooks** automate quality gates and event responses
- **Memory** builds persistent context across sessions
- **Plugins** package everything for distribution

Understanding how these layers compose is the key to using Claude Code effectively.
