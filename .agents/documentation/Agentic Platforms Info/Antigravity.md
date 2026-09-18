# Antigravity Architecture & Customization Guide

## Overview

Antigravity is a **runtime-portable** configuration framework layered on top of agentic coding tools. It defines agents, skills, workflows, and rules that work across multiple runtimes — Claude Code, OpenAI Codex CLI, and Gemini CLI — without modification.

Each layer serves a different purpose:

| Layer | Purpose |
|---|---|
| Rules | Always-active behavioral mandates |
| Skills | Reusable capability packages, auto-selected or explicitly invoked |
| Agents | Specialized execution personas with domain-specific logic |
| Workflows | Deterministic step-by-step slash commands |
| Tools | Delegated to the underlying runtime (MCP, built-ins) |

---

## Core Concepts

### Agent Manager

The Agent Manager is the primary orchestrator — the main Claude Code (or Codex/Gemini) instance you interact with. Its responsibilities:

- Context management and workspace analysis
- Deciding which agents and skills to engage
- Delegating complex phases to specialized agents
- Coordinating multi-agent workstreams

The Agent Manager is not a file you define. It is the runtime itself, extended and shaped by the Antigravity configuration it loads.

---

### Agents

An agent is a specialized execution persona with domain-specific logic, behavioral constraints, and a defined role. Agents are defined as Markdown files with YAML frontmatter. The directory form uses a lowercase `agent.md` filename.

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

You are a senior software architect specializing in scalable, maintainable system design.

## Your Role
- Design system architecture for new features
- Evaluate technical trade-offs
...
```

**Frontmatter fields:**

| Field | Purpose |
|---|---|
| `name` | Agent identifier, used in `@mention` invocation |
| `description` | When to invoke this agent — also used for auto-selection |
| `tools` | Map of allowed tools (`read`, `grep`, `glob`, `bash`, etc.) |
| `model` | Model tier to use (`sonnet`, `opus`, `haiku`) |

**Tool specification** uses a YAML map with boolean values (not a comma-separated list):

```yaml
tools:
  read: true
  grep: true
  glob: true
  bash: true
```

**Invocation:** agents are engaged automatically when the task matches their description, or explicitly via `@mention` syntax (e.g., `@architect`, `@code-reviewer`).

**Locations:**

```
User-global:   ~/.gemini/config/agents/<name>/agent.md
Project-level: .agents/agents/<name>/agent.md
Alternative:   .agents/agents/<name>.md
```

**Available global agents:**

| Agent | Role | Model |
|---|---|---|
| `architect` | System design, scalability, trade-off analysis | opus |
| `code-reviewer` | Quality gates, security, structural style | sonnet |
| `security-reviewer` | PII, secrets, CVE scanning, OWASP Top 10 | sonnet |
| `database-reviewer` | SQL efficiency, schema design, Supabase/RLS | sonnet |
| `ba-analyst` | Jira epics, user stories, acceptance criteria | sonnet |
| `brainstorming` | Idea validation and structured design before implementation | sonnet |
| `prompt-engineer` | Prompt quality scoring and rewriting | sonnet |
| `product-specialist` | Competitive analysis, feature fit, differentiation | sonnet |
| `project-structure-reviewer` | DevOps posture, IaC, secrets governance | sonnet |
| `todo-assistant` | Project-level TODO list management | sonnet |
| `workspace-setup` | Baseline project scaffolding for new workspaces | sonnet |
| `antigravity-config` | Evaluates and improves Antigravity configuration | sonnet |

---

### Subagents

A subagent is a child agent spawned by the Agent Manager to handle a specific subtask. Subagents inherit most configuration from the parent unless the agent's `agent.md` specifies overrides.

**Use cases:**
- Parallel codebase exploration before planning
- Separation of concerns (explore vs. implement vs. review)
- Delegating long research tasks without blocking the main conversation

Subagents are not a separate file type — they are spawned at runtime by the Agent Manager using the Agent tool of the underlying runtime.

---

### Multi-agent Systems

Multi-agent setups are a **composition pattern**, not a dedicated primitive. The Agent Manager spawns multiple subagents for independent workstreams and merges their results before the next step.

Common patterns from the Antigravity execution guide:

- **Research phase:** `@brainstorming` + `@researcher` in parallel
- **Review phase:** `@security-reviewer` + `@database-reviewer` + `@code-reviewer` in parallel
- **Feature phase:** `@architect` for design, then `@agentic-engineering` + `@test-driven-development` for implementation, then reviewers

---

### Skills

A skill is a reusable, self-contained capability package. Unlike agents (which are persistent personas), skills inject domain-specific guidance and guardrails into the active session for the duration of a task.

**Trigger:** auto-selected by relevance to the task description, or explicitly referenced with `@skill-name`.

**Skill directory structure:**

```
my-skill/
├── SKILL.md           # Required — describes the skill and when/how to use it
├── scripts/           # Optional — executable helpers
├── agents/            # Optional — skill-specific agent definitions
└── references/        # Optional — supporting docs, context, or API references
```

**SKILL.md frontmatter:**

```markdown
---
name: agentic-engineering
description: Operate as an agentic engineer using eval-first execution, decomposition, and cost-aware model routing.
origin: ECC
---

# Agentic Engineering
...
```

| Field | Purpose |
|---|---|
| `name` | Skill identifier |
| `description` | When to auto-select this skill |
| `origin` | Optional provenance tag |

**Locations:**

```
User-global:   ~/.antigravity/skills/<name>/SKILL.md
Project-level: .agent/skills/<name>/SKILL.md
```

**Available global skills:**

| Skill | Domain |
|---|---|
| `agentic-engineering` | Eval-first execution, task decomposition, model routing |
| `researcher` | Multi-source deep investigation, no impulsive changes |
| `git-orchestrator` | Versioning, PR generation, release tagging |
| `e2e-testing` | TestSprite end-to-end orchestration |
| `cloud-deploy` | AWS / GCP / Render rollouts |
| `devops-agent` | Infrastructure, CI/CD, monitoring setup |
| `docker-deploy` | Docker image build and container orchestration |
| `database-migrations` | Schema changes, rollbacks, zero-downtime migrations |
| `infrastructure-architect` | Terraform stacks, infrastructure YAML |
| `test-driven-development` | Red-Green-Refactor TDD cycle |
| `technical-writer` | Inline docs, ADRs, Mermaid architecture diagrams |
| `explain-me` | Senior Engineer walkthrough of architecture decisions |
| `design-system` | Foundational UI/UX tokens |
| `ui-ux-pro-max` | 67 UI styles, 161 palettes, 57 font pairings, UX guidelines |
| `troubleshooting` | Structured debugging and incident response |
| `performance-optimizer` | Frame drops, memory leaks, render bottlenecks |
| `article-writing` | Long-form content with voice consistency |
| `codebase-onboarding` | Architecture map, entry points, starter CLAUDE.md |
| `config-manager` | Secure env var and ARN/project ID management |

---

### Workflows

Workflows are **deterministic slash commands** — scripted, step-by-step sequences that execute the same way every time. Unlike skills (which adapt), workflows have a fixed trajectory.

**Workflow file format:**

```markdown
---
description: Build Verification and Patch Release Pipeline
---

This workflow acts as a Pre-Flight checklist for new builds...

// turbo
1. **Coding Standards**: Run `npm run lint`...
2. **Security Checks**: Run `npm audit`...

// turbo
3. **Health Check**: Run `npm run build`...

4. **Increment Version**: Run `./scripts/bump-version.sh`...
```

**`// turbo` annotation:** marks a block of steps that can run in parallel. Multiple agents are spawned concurrently for these steps. Steps without `// turbo` are sequential.

**Usage:** triggered by typing `/workflow-name` in the chat (e.g., `/deploy`, `/build-version`).

**Available global workflows:**

| Command | What it does |
|---|---|
| `/build-version` | Lint + audit + test + build + bump patch version + tag + push |
| `/deploy-gcp` | Minor bump, tag, push to GCP Cloud Run |
| `/deploy-aws` | Minor bump, tag, Docker build, push to AWS App Runner |
| `/deploy-render` | Minor bump, tag, trigger Render auto-deploy |
| `/deploy-full` | Atomic release to all three platforms |
| `/create-infra` | Create or update infrastructure from config YAML |
| `/switch-env` | Switch active environment (DEV/QA/UAT/PROD) |

**Locations:**

```
User-global:   ~/.antigravity/workflows/<name>.md
Project-level: .agent/workflows/<name>.md
```

---

### Rules

Rules are **always-active behavioral mandates** — persistent, project-wide constraints that shape how the Agent Manager and all agents behave. They are loaded automatically at the start of every session; no invocation is required.

**Format:** plain markdown files (no frontmatter, no special syntax — just headings and content).

**Key distinction from Claude Code permissions:** Antigravity rules are behavioral guidelines for the agent (what to do, how to think, what workflow to follow). They are not command-level allow/deny policies.

```
~/.antigravity/rules/development.md    ← defines the Feature Implementation Workflow
~/.antigravity/rules/git-workflow.md   ← Conventional Commits, PR process
~/.antigravity/rules/security.md       ← secrets, input validation, OWASP
~/.antigravity/rules/testing.md        ← TestSprite, unit test standards
~/.antigravity/rules/code-review.md    ← severity-based quality gates
~/.antigravity/rules/documentation.md  ← architecture_readme.md mandate
~/.antigravity/rules/coding-style.md   ← style and patterns
~/.antigravity/rules/research.md       ← Read-Only protocol for investigations
~/.antigravity/rules/patterns.md       ← design patterns
```

**Loaded via:** the runtime's instruction file (`CLAUDE.md`, `AGENTS.md`, or equivalent) using `#include` directives:

```markdown
#include ~/.antigravity/rules/development.md
#include ~/.antigravity/rules/security.md
```

**Locations:**

```
User-global:   ~/.antigravity/rules/<name>.md
Project-level: .agent/rules/<name>.md
```

---

## Invocation Syntax

Antigravity uses `@mention` syntax to explicitly invoke agents and skills inline in the conversation:

| Syntax | What it does |
|---|---|
| `@architect` | Engage the architect agent |
| `@code-reviewer` | Engage the code-reviewer agent |
| `@cloud-deploy` | Activate the cloud-deploy skill |
| `@e2e-testing` | Activate the e2e-testing skill |
| `/build-version` | Trigger the build-version workflow |
| `/deploy-gcp` | Trigger the GCP deployment workflow |

Without an explicit `@mention`, the Agent Manager auto-selects agents and skills based on the task description matching their `description` fields.

### Technical vs. Functional Invocation

It is important to distinguish between how an agent is triggered via the UI versus how its logic is applied to the session:

#### 1. Technical (The "Slash Command")
Custom Antigravity agents are not automatically registered as slash commands in the runtime (e.g., typing `/brainstorming` in Claude Code). Slash commands are reserved for skills built into the binary or specifically enabled as plugins.

#### 2. Functional (The "Persona")
Even if not available as a slash command, an agent's logic is always accessible. Because the Agent Manager has access to the filesystem, it can read an agent definition and adopt its specific workflow upon request.

**Usage example:** *"Let's brainstorm a new feature—use the instructions from the brainstorming agent."*

#### Disambiguation (Multiple Agents)
If multiple agents with the same name exist (e.g., standard vs. custom desktop versions), the Agent Manager uses three methods to resolve the conflict:

1. **The Inventory "Map"**: Scanning index files like `antigravity-agents.md` to identify specific paths.
2. **Contextual Clues**: Looking for keywords in the prompt (e.g., *"Use the desktop brainstorming agent"*).
3. **Proactive Clarification**: If ambiguity remains, the Agent Manager will ask for a preference before proceeding.

> [!TIP]
> To make an agent available globally, place it under the official `~/.gemini/config/agents/` directory.

### Agent Discovery & Path Resolution

When you use `@mention` syntax (e.g., `@data-scraper-agent`), the Agent Manager performs a multi-step lookup to locate the corresponding definition on your system.

#### 1. Standard "Source of Truth" Paths
The system automatically checks established configuration directories used by Antigravity and its supported runtimes. These are the primary locations for global agent definitions:
- `~/.antigravity/`
- `~/.claude/`
- `~/.codex/`

#### 2. The Workspace Index
If an agent is not found in standard paths, the system consults the **Workspace Index** (e.g., `antigravity-agents.md`). This acts as a "map," allowing the Agent Manager to reference agents stored in non-standard locations (like `~/Desktop/agents/`) without needing to scan the entire hard drive.

#### 3. Targeted Discovery
The Agent Manager does not perform broad disk scans. It only searches outside standard configuration folders if:
- **Explicitly directed:** e.g., *"I have another agent definition on my Desktop."*
- **Disambiguation is required:** If you mention an agent that isn't in standard paths or the index, the system may run a targeted search in likely locations (like `~/Desktop` or the current project folder).

#### 4. Privacy & Context
Discovery is strictly limited to configuration folders and project directories. The Agent Manager does not access personal files (Photos, Mail, Documents, etc.) unless they are within an active project workspace or specifically identified as a configuration source.

### Skill Discovery & Comparison

The discovery logic for **Skills** is identical to that of **Agents**, utilizing the same organizational "map."

#### 1. Discovery Logic
- **Passive Mapping:** By default, the system checks `~/.antigravity/skills/`, `~/.claude/`, and `~/.codex/`.
- **The Index:** The system relies on the **Skill Index** (e.g., `antigravity-skills.md`) to locate skills stored outside standard paths without needing to scan the entire system.
- **Contextual Use:** If a skill is referenced on the Desktop or in a specific project folder, the Agent Manager "learns" that path and maintains it in the conversation context or saves it to persistent memory.

#### 2. Functional Difference
While the discovery method is shared, the way they are applied differs:
- **Agents:** Adopted as a **Persona** (role, behavioral logic, and specific workflow).
- **Skills:** Utilized for their **Tools and Scripts** (dynamic capabilities injected into the active session).

From a discovery standpoint, both are managed as unified assets within the Antigravity ecosystem.

---

## File Type Reference

| Component | File type | Location |
|---|---|---|
| Rules | `<name>.md` (plain markdown) | `~/.antigravity/rules/` or `.agent/rules/` |
| Skills | `SKILL.md` + optional dirs | `~/.antigravity/skills/<name>/` or `.agent/skills/<name>/` |
| Agents | `agent.md` or `<name>.md` (with YAML frontmatter) | `~/.gemini/config/agents/<name>/` or `.agents/agents/` |
| Workflows | `<name>.md` (with frontmatter) | `~/.antigravity/workflows/` or `.agent/workflows/` |
| Skill index | `INDEX.md` | `~/.antigravity/skills/` |
| Usage guide | `how_to_use.md` | `~/.antigravity/` |

---

## Folder Structure Reference

### Global (user home)

```
~/
└── .antigravity/
    ├── how_to_use.md               # Execution guide and concept overview
    ├── readme.txt
    ├── rules/
    │   ├── development.md
    │   ├── git-workflow.md
    │   ├── security.md
    │   ├── testing.md
    │   ├── code-review.md
    │   ├── documentation.md
    │   ├── coding-style.md
    │   ├── research.md
    │   └── patterns.md
    ├── skills/
    │   ├── INDEX.md
    │   ├── agentic-engineering/
    │   │   └── SKILL.md
    │   ├── cloud-deploy/
    │   │   ├── SKILL.md
    │   │   ├── scripts/
    │   │   └── references/
    │   └── researcher/
    │       ├── SKILL.md
    │       └── references/
    └── workflows/
        ├── README.md
        ├── build-version.md
        ├── deploy.md
        ├── deploy-aws-apprunner.md
        ├── deploy-gcp-cloudrun.md
        ├── deploy-render.md
        ├── create-infra.md
        └── switch-env.md
```

Global agents use Antigravity's Gemini configuration directory:

```
~/.gemini/config/agents/
├── architect/
│   └── agent.md
├── code-reviewer/
│   └── agent.md
└── security-reviewer/
    └── agent.md
```

### Project level

```
my-repo/
├── CLAUDE.md                       # Runtime instructions (includes Antigravity rules)
└── .agents/
    ├── rules/
    │   └── team.md                 # Project-specific rules
    ├── agents/
    │   └── reviewer/
    │       └── agent.md            # Project-specific agent definition
    ├── skills/
    │   └── my-skill/
    │       └── SKILL.md
    ├── workflows/
    │   └── deploy-staging.md
    └── global-config/              # Symlink or copy of ~/.antigravity for portability
        └── workflows/
```

---

## Integration with Runtime Instruction Files

Antigravity rules are loaded via the runtime's instruction system. The method depends on which runtime is in use:

**Claude Code** (`~/.claude/CLAUDE.md`):
```markdown
#include ~/.antigravity/rules/development.md
#include ~/.antigravity/rules/git-workflow.md
#include ~/.antigravity/rules/security.md
```

**OpenAI Codex CLI** (`~/.codex/AGENTS.md`):
```markdown
#include ~/.antigravity/rules/development.md
```

**Gemini CLI** (equivalent instruction file): same `#include` pattern.

This is what makes Antigravity runtime-portable — the rules are just markdown, and every runtime has an instruction file that can include them.

---

## Execution Pipelines

From the Antigravity execution guide, the recommended agent and skill order for common development tasks:

### 1. Research & Ideation
1. `@brainstorming` — analyze intent and draft concepts
2. `@researcher` — deep multi-source investigation
3. `@article-writing` — synthesize findings into documentation

### 2. Architecture & Design
1. `@architect` — evaluate trade-offs, scalability, design patterns
2. `@design-system` — establish foundational UI/UX tokens
3. `@technical-writer` — generate ADRs and update `architecture_readme.md`
4. `@explain-me` — walk through logic for human clarity

### 3. Implementation (Feature / Bug)
1. `@architect` or `@brainstorming` — implementation plan
2. `@database-reviewer` — schema and RLS policies
3. `@agentic-engineering` + `@test-driven-development` — execution
4. `@performance-optimizer` — profile for bottlenecks
5. `@technical-writer` — inline docs and API updates

### 4. Quality Assurance
1. `@security-reviewer` — PII, secrets, CVEs
2. `@database-reviewer` — SQL efficiency
3. `@code-reviewer` — structural style, edge cases
4. `@e2e-testing` — TestSprite end-to-end validation

### 5. Git & Deployment
1. `@git-orchestrator` — versioning and PR creation
2. `@cloud-deploy` — push to AWS, GCP, or Render
3. `/build-version` then `/deploy-full` — verified release pipeline

---

## What Can Be Customized?

| Component | Customizable | How |
|---|---|---|
| Rules | Yes | Add/edit `.md` files in `.antigravity/rules/` or `.agent/rules/` |
| Agents | Yes | Add `agent.md` in `~/.gemini/config/agents/<name>/` or `.agents/agents/<name>/`; project agents may also use `.agents/agents/<name>.md` |
| Skills | Yes | Add `SKILL.md` in `.antigravity/skills/<name>/` or `.agent/skills/` |
| Workflows | Yes | Add `.md` files in `.antigravity/workflows/` or `.agent/workflows/` |
| Tools | Via runtime | Antigravity delegates tool access to the underlying runtime (MCP, etc.) |
| Model per agent | Yes | `model:` field in agent frontmatter |
| Tool access per agent | Yes | `tools:` map in agent frontmatter |
| Parallel steps | Yes | `// turbo` annotation in workflow steps |
| Execution pipelines | Yes | Compose agents and skills in any order |

---

## Recommended Usage Hierarchy

1. **Rules** — set the behavioral foundation for every session
2. **Skills** — encode reusable procedures and domain knowledge
3. **Agents** — create specialized roles for each development phase
4. **Workflows** — define deterministic release and CI pipelines
5. **Execution pipelines** — compose agents and skills into phase-specific sequences

---

## Mental Model Summary

| Concept | What it is |
|---|---|
| Agent Manager | The orchestrating runtime instance — delegates and coordinates |
| Agent | A specialized persona with domain logic and tool access (`agent.md` or `<name>.md`) |
| Subagent | A child agent spawned for a specific delegated task |
| Multi-agent | A composition of parallel agents managed by the orchestrator |
| Skill | A reusable capability package, auto-selected or `@mentioned` (`SKILL.md`) |
| Workflow | A deterministic slash command with optional `// turbo` parallelism |
| Rule | An always-active behavioral mandate (plain markdown, no invocation needed) |
| `// turbo` | Annotation marking workflow steps that run in parallel |
| `@mention` | Explicit invocation of an agent or skill by name |

---

## Key Differences vs Claude Code and Codex

| Feature | Antigravity | Claude Code | Codex |
|---|---|---|---|
| Purpose | Framework layered on top of runtimes | The runtime itself | The runtime itself |
| Runtime portability | Yes — works on Claude Code, Codex, Gemini | No | No |
| Project-level dir | `.agent/` | `.claude/` | `.codex/` |
| Agent format | `agent.md` or `<name>.md` with YAML frontmatter | `.md` with YAML frontmatter (tools as list) | `.toml` |
| Skill format | `SKILL.md` in `~/.antigravity/skills/` | `SKILL.md` in `~/.claude/skills/` | `SKILL.md` in `~/.agents/skills/` |
| Workflow format | `.md` with `// turbo` parallelism annotation | `.md` slash commands in `.claude/commands/` | No native primitive |
| Rules format | Plain markdown (behavioral, always active) | Embedded in `CLAUDE.md` | `.rules` files (command allow/deny) |
| Invocation syntax | `@agent-name`, `@skill-name`, `/workflow` | Spawned via `Agent` tool | Spawned via agent config |
| Hooks | Delegated to Claude Code if used there | Native (`settings.json`) | No equivalent |
| Memory | Delegated to Claude Code if used there | Native (file-based per project) | No equivalent |
| Permissions | Delegated to the runtime | `settings.json` `permissions` | `.rules` files |
| Config file | None (Antigravity is config, not a tool) | `settings.json` | `config.toml` |

---

## Key Insight

Antigravity is not a runtime — it is a **configuration layer** that runs on top of runtimes.

While Claude Code and Codex each have their own native primitives, Antigravity provides a unified set of agents, skills, workflows, and rules that work identically regardless of which tool is driving the session.

The framework is designed around one principle: **the best agent setup is the one you can carry with you**. By keeping all configuration in portable markdown files, Antigravity ensures that your development workflow, quality gates, and deployment pipelines are available everywhere.
