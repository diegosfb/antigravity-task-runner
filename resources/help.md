# Task Runner Help

This guide describes Task Runner as it is currently implemented in this repository for `{{TASK_RUNNER_VERSION}}`.

It is intentionally source-of-truth to the extension code. If the UI, an older screenshot, or an older help document says something different, trust this file. Items marked **Under development** exist in code but are incomplete, partially surfaced, or still inconsistent.

## Quick Start

1. Open the `Task Runner` activity bar view.
2. Use the title bar buttons:
   - `Settings` opens the built-in Task Runner settings page.
   - `Open Help Doc` opens this help document in Markdown preview.
3. In `Settings`, use:
   - `General Settings` for VS Code extension settings.
   - `SDLC Settings` for project-level `ADLC_workflow_settings.json` controls.
4. Configure the basics first:
   - `antigravity.buildCommand`
   - `antigravity.projectTestingCommand`
   - `antigravity.agenticHarnessExecutionCommand`
   - `antigravity.lightAgenticHarnessExecutionCommand`
   - `antigravity.jiraBaseUrl`
   - `antigravity.jiraEmail`
   - `antigravity.jiraApiToken`
5. If you use Jira flows, make sure the repo has a root `.env` with `JIRA_PROJECT_KEY`, or use `Select/Set Jira Project` to save it.
6. If you use Claude routing, keep `~/.claude/settings.json` and `~/.claude/routerconfig.json` in good shape.

## What The Sidebar Shows

The current top-level order is:

1. AI launchers and project commands: `Claude Terminal`, `Codex Terminal`, `Opencode Terminal`, `Ollama Terminals`, `Agent Monitor Terminals`, `Set Claude Model`, `Build Project`, and `Run Project Tests`
2. Quick actions and categories: `Setup Workspace`, `Install Agentic Libraries`, `Backlog Management`, repository actions, ADLC agents, auxiliary agents and skills, version increments, manuals, vault, and autocommit actions
3. `Agentic Harness and AddOns`
4. `Claude Plugins`
5. `Agents`
6. `Skills`
7. `Workflows`

### Item Types

| Item type | What it means |
| --- | --- |
| Action | A clickable command that runs a Task Runner operation, opens a form, opens a terminal, or opens a document. |
| Category | A collapsible grouping of related actions or generated entries. |
| Folder | A linked filesystem folder shown for browsing and right-click actions. |
| Agent | An agent definition file, runnable Claude CLI agent, or agent shortcut. |
| Skill | A `SKILL.md` capability definition from project, user, plugin, or harness skill folders. |
| Workflow | A workflow markdown file that can be opened or run through a matching script. |
| Plugin | A Claude plugin entry returned by `claude plugin list`. |
| Separator | A visual divider only; it has no command. |

Some items only appear when prerequisites are met:

- Git repository actions appear only when the workspace already has a `.git` folder.
- `Merge branch to main` appears only when the current branch is not `main`.
- Jira backlog actions depend on a saved `JIRA_PROJECT_KEY` in the repo `.env`.
- `Cloud Architect Review` stays visible, but is effectively disabled until the repo looks like it contains cloud or infrastructure files.
- `Revert Changes` appears only when autocommit is already running.

## Prerequisites

Task Runner does not bundle the underlying CLIs. Different features expect different tools to exist on your machine.

| Requirement | Used by |
| --- | --- |
| `git` | Repo flows, branch actions, tagging, PR flows, commit flows |
| `gh` authenticated with GitHub | `Init Repository`, `Audit Secrets & Variables`, repo bootstrap scripts |
| `claude` | `Claude Terminal`, Claude agents/plugins listing, some harness flows |
| `codex` | `Codex Terminal`, some harness choices, some ADLC workflows |
| `opencode` | `Opencode Terminal`, optional harness choices |
| `ollama` | `Ollama Claude`, `Ollama Codex` |
| `zip` | Explorer `Backup-Compress` |
| `/Applications/DiffMerge.app` on macOS | Explorer `DiffMerge` actions |

## Settings Reference

Use the title-bar gear button or VS Code settings to edit `antigravity.*`.
The built-in settings page has two tabs:

- `General Settings` updates VS Code `antigravity.*` settings at workspace or user scope.
- `SDLC Settings` updates the project root `ADLC_workflow_settings.json` file. Each control includes a description and tooltip. Policy-locked approval gates are shown read-only so users can see why they cannot be changed.

### Core Settings

| Setting | What it controls | Used by |
| --- | --- | --- |
| `antigravity.workspaceProjectPath` | Where workspace files should be created or downloaded. Relative values are resolved from the repo root. | `Setup Workspace`, internal workspace bootstrap flows |
| `antigravity.terminalName` | Shared VS Code terminal name for normal Task Runner script runs. | Build/test/scripts |
| `antigravity.agentTerminalName` | VS Code terminal name used for agent-oriented persistent terminals. | Agent launches and some helper actions |
| `antigravity.buildCommand` | Exact build command to run. | `Build Project` |
| `antigravity.projectTestingCommand` | Exact test command to run. | `Run Project Tests`, PR and merge flows |
| `antigravity.defaultGithubCodeReviewer` | Default reviewer suggestion passed into the PR flow. | `Create Pull Request` |
| `antigravity.enableDebugLogging` | Enables extra logs in the `Antigravity Task Runner` output channel. | Troubleshooting |

**When to change `antigravity.workspaceProjectPath`:** keep `./` when the
current repo is the project Task Runner should modify directly. Use a different
path when this repo is acting as a controller, template, or tooling repo and
generated or downloaded project files should land somewhere else. For example,
use `./workspace` to keep generated files in a dedicated folder,
`./sandbox/client-app` for a nested prototype, `../my-generated-project` for a
sibling folder, or an absolute path such as `/Users/you/dev/output-project` for
a fixed external destination.

### Agent And Harness Settings

| Setting | What it controls | Used by |
| --- | --- | --- |
| `antigravity.antigravityPath` | Path to the legacy `antigravity` executable. | Legacy agent launch command |
| `antigravity.antigravityArgs` | Argument template for the legacy `antigravity` executable. Supports `{agent}` and `{agentFile}`. | Legacy agent launch command |
| `antigravity.agenticHarnessExecutionCommand` | Primary harness command. | Jira-to-agent flows, feature flagging, review helpers, setup helpers |
| `antigravity.agenticHarnessExecutionCommands` | Saved presets for the primary harness command. | Settings UI dropdown |
| `antigravity.lightAgenticHarnessExecutionCommand` | Lightweight harness command. | Agent-driven commit flow and lightweight prompt tasks |
| `antigravity.lightAgenticHarnessExecutionCommands` | Saved presets for the light harness command. | Settings UI dropdown |
| `antigravity.useAgentForGithubRepositoryManagement` | When enabled, GitHub-repo management flows prefer the light harness instead of the built-in local commit-message generator. | `Commit`, PR preflight, merge preflight |

### Jira Settings

| Setting | What it controls | Used by |
| --- | --- | --- |
| `antigravity.jiraBaseUrl` | Jira site URL | All Jira-backed flows |
| `antigravity.jiraEmail` | Jira account email | All Jira-backed flows |
| `antigravity.jiraApiToken` | Jira API token | All Jira-backed flows |

### Repo And Content Settings

| Setting | What it controls | Used by |
| --- | --- | --- |
| `antigravity.customAgenticPlatformAddons` | Extra local folder to show in the linked-folder section. | Sidebar linked folders |
| `antigravity.projectStructureAndAgentsRepository` | GitHub repository URL used by `scripts/deploy-project-structure.sh` as the source for project structure and agents. Defaults to `https://github.com/diegosfb/antigravity-task-runner`. | Project structure bootstrap |
| `antigravity.createReleaseBranchWhenCreatingReleases` | If enabled, repo release creation also creates and pushes a release branch. | `Create Repo Release` |
| `antigravity.autoUpdateClaudeMd` | If autocommit start is used, also asks Claude to update `CLAUDE.md`. | Internal autocommit flow |

### Advanced Settings

These exist today but are mainly used by advanced or partially surfaced commands.

| Setting | What it controls |
| --- | --- |
| `antigravity.antigravityWorkspaceProject` | Local path to the `antigravity-workspace` checkout used by `Update Agentic Workspace` |
| `antigravity.claudeSetupGithub` | Source repo URL for `Update Agentic Setup` |
| `antigravity.geminiSetupGithub` | Source repo URL for `Update Agentic Setup` |
| `antigravity.codexSetupGithub` | Source repo URL for `Update Agentic Setup` |

## Sidebar Reference

### AI Launchers And Project Commands

| Item | What it does | Notes |
| --- | --- | --- |
| `Claude Terminal` | Opens an external OS terminal in the repo root and runs `claude`. | If Claude is configured to use a local liteLLM endpoint, Task Runner auto-starts liteLLM first. See the dedicated section below. |
| `Codex Terminal` | Opens an external OS terminal in the repo root and runs `codex`. | Sidebar only right now, not a contributed Command Palette command. |
| `Opencode Terminal` | Opens an external OS terminal in the repo root and runs `opencode`. | Sidebar only right now. |
| `Ollama Terminals` | Category for Ollama-backed harness launchers. | Contains `Ollama Claude` and `Ollama Codex`. |
| `Ollama Claude` | Opens an external OS terminal and runs `ollama launch claude --model glm-5:cloud --yes`. | Requires `ollama`. |
| `Ollama Codex` | Opens an external OS terminal and runs `ollama launch codex --model glm-5:cloud --yes`. | Requires `ollama`. Sidebar only right now. |
| `Agent Monitor Terminals` | Category for agent-monitor terminal launchers. | Contains Claude, Codex, and OpenCode monitor terminals. |
| `Agent Monitor Claude` | Opens the Claude agent-monitor terminal in the repo root. | Useful for monitoring or supervising agent work. |
| `Agent Monitor Codex` | Opens the Codex agent-monitor terminal in the repo root. | Useful for monitoring or supervising agent work. |
| `Agent Monitor OpenCode` | Opens the OpenCode agent-monitor terminal in the repo root. | Useful for monitoring or supervising agent work. |
| `Set Claude Model` | Opens a model/router configuration page and writes the selected Claude routing values. | Creates `~/.claude/routerconfig.json` from `routerconfig.example.json` if needed. |
| `Build Project` | Runs `antigravity.buildCommand` in a VS Code task terminal. | Fails fast if the setting is blank. |
| `Run Project Tests` | Runs `antigravity.projectTestingCommand` in a VS Code task terminal. | Fails fast if the setting is blank. |

### Linked Folders And Browsers

| Item | What it shows | Appears when |
| --- | --- | --- |
| `antigravity` or `Missing ~/.gemini/antigravity` | `~/.gemini/antigravity` | Always represented; shows a warning item when the folder is missing |
| `claude` | `~/.claude` | That folder exists |
| `codex` | `~/.codex` | That folder exists |
| Custom add-ons folder | The folder from `antigravity.customAgenticPlatformAddons` | The setting is configured and the folder exists |
| `Claude Plugins` | Output of `claude plugin list` | Always shown; contents depend on CLI availability |
| `Agents` | Project and user agents from shared `.agents` plus Claude, Codex, Gemini, OpenCode, and runnable Claude CLI agents | Always shown |
| `Skills` | Project, user, and plugin skills from shared `.agents` plus Claude, Codex, Gemini, and OpenCode skill folders | Always shown |
| `Workflows` | Markdown workflow files under `<repo>/.agents/workflows` and `~/.gemini/antigravity/workflows` | Always shown; displays an empty or missing-state item when no workflow files exist |

### Quick Actions

| Item | What it does | Notes |
| --- | --- | --- |
| `Setup Workspace` | Opens a template-driven workspace setup flow and launches the selected harness to create or download workspace files. | Disabled-looking when the project already has a `.agent` folder. Uses `antigravity.workspaceProjectPath`. |
| `Install Agentic Libraries` | Category for installing bundled agent/skill libraries into the current workspace. | Children are listed below. |
| `Backlog Management` | Category for local backlog and Jira backlog actions. | Children are listed below. |
| `Init Repository` | Creates or connects a Git repo and GitHub repo, then bootstraps repo defaults. | Visible only when the project is not already a Git repo. Also creates CI/CD workflow files, `.gitignore`, `.env.example`, default GitHub environments (`dev`, `qa`, `stage`, `prod`), commits, and pushes. |
| `Repository Actions` | Category for Git and GitHub repository operations. | Visible only when the workspace is already a Git repository. |
| `Set Feature Flag for changes` | Opens the selected harness with a prompt to wrap behavior changes in `.env` feature flags and add them to `.env.example`. | Always visible. |
| `ADLC Agents` | Category of deployed SDLC/ADLC agents. | Runs `.agents/agents/...` definitions with a selected harness, model, and input artifacts. |
| `Auxiliary Agents and Skills` | Category of supporting agents and skills outside the core ADLC sequence. | Children are listed below. |
| `Increment Versions` | Category for semantic version bump actions. | Contains major, minor, and patch increments. |
| `Obsidian Vault Visualization` | Opens the project Obsidian vault visualization. | Requires the vault visualization assets to exist. |
| `Autocommit Start` / `Autocommit Stop` | Starts or stops Task Runner's autocommit checkpoint flow. | Shows disabled text when no GitHub repository is connected. |
| `Revert Changes` | Runs the autocommit revert script. | Appears only when autocommit is already running. |
| `SOP Manual` | Opens the project SOP at `resources/sop.md` if present, otherwise downloads and opens the bundled SOP. | Right-click the item to copy the SOP into the project. |
| `ADLC Framework Manual` | Opens the ADLC workflow diagram and framework design document. | Sidebar action. |

### `Install Agentic Libraries` Children

| Item | What it does |
| --- | --- |
| `Install SDLC` | Installs the core SDLC agentic library into the current workspace. |
| `Install SDLC Extended` | Installs the extended SDLC agentic library into the current workspace. |
| `Install Professional Services` | Installs the professional-services agentic library into the current workspace. |
| `Install Tech Advisory` | Installs the tech-advisory agentic library into the current workspace. |
| `Clean Deployed Libs` | Removes deployed agentic-library content from the workspace. |

### `Backlog Management` Children

| Item | What it does |
| --- | --- |
| `Select/Set Jira Project` | Saves an existing Jira project key or launches agentic creation of a company-managed Jira Software project. |
| `Add Backlog Item` | Creates a local `docs/backlog` markdown item and can also create a matching Jira item. |
| `Take Backlog Item (Assign)` | Takes a Jira or local backlog item, assigns it to you, and moves it to `In Progress` when Jira is involved. |
| `Mark Backlog Item as Completed` | Marks a local and/or Jira backlog item completed; Jira moves to `In Review` when possible and otherwise falls back to `Done`. |
| `Assign Backlog Item to Agent` | Assigns a Jira item or local backlog file to the selected harness or runs `Grill Me` against it. |

### `Increment Versions` Children

| Item | What it does |
| --- | --- |
| `Increment Major Version` | Runs the version bump flow with `major`. |
| `Increment Minor Version` | Runs the version bump flow with `minor`. |
| `Increment Patch Version` | Runs the version bump flow with `patch`. |

### Repository Actions

`Repository Actions` appears only when the workspace is already a Git repository.

| Item | What it does | Notes |
| --- | --- | --- |
| `Commit` | Saves files, stages changes, excludes `.env` and `config/.env`, and creates a commit. | If `antigravity.useAgentForGithubRepositoryManagement` is enabled, the light harness is asked to commit automatically. Otherwise the extension generates a local commit message. |
| `Create Repo Release` | Runs the release workflow. | In this repo type it bumps the patch version, builds, packages the VSIX, commits, pushes, creates a GitHub release, and respects `antigravity.createReleaseBranchWhenCreatingReleases`. |
| `Create Feature Branch` | Opens a branch form and launches the branch creation script. | Supports `Feature`, `Bug Fix`, `Jira Task`, and `Hot Fix`. `Jira Task` expects `feature/JIRA-123-short-name`. |
| `Create Pull Request` | Runs the PR workflow in a persistent terminal. | Preflight tries to commit outstanding changes first and can use the configured test command. |
| `Merge branch to main` | Launches the merge-to-main script for the current branch. | Only shown when the current branch is not `main`. |
| `Go To Branch` | Lets you switch branches. | If you have uncommitted changes, the flow offers `Commit Changes` or `Discard All Changes` before checkout. |
| `Pull Remote and merge` | Updates local `main`, merges it into the current branch, runs tests if configured, and pushes the branch. | Only meaningful off `main`. |
| `Agentic review of Merge` | Opens the selected harness with a merge review prompt focused on the current branch vs `main`. | Requires a clean worktree. |

### ADLC Agents

The `ADLC Agents` section lists deployed agent definitions from `.agents/agents`. Each item opens a run form where you choose the harness, optional model, and required input artifacts. Items show `not deployed` when their agent definition is not installed in the project.

| Item | Purpose | Main required inputs |
| --- | --- | --- |
| `Product Agent` | Turns product definition inputs into product requirements context. | Product definition source and optional supporting evidence |
| `BA Agent` | Converts approved product context into specifications. | Approved PRD and existing specifications |
| `UX Agent` | Produces UX/design outputs from product and architecture context. | Approved product context; architecture package is optional in the UI |
| `Architect Agent` | Produces or updates an architecture package from specs and PRD context. | Specification source, PRD, and existing architecture package when available |
| `Architecture Review Agent` | Reviews an existing architecture package for gaps, risks, and inconsistencies. | Specification source, PRD, and existing architecture package |
| `Project Planner Agent` | Creates or updates delivery backlog from requirements, architecture, and design context. | Requirements stream, technical stream, design package, and existing backlog |
| `Create Tests Agent` | Generates tests from sequenced backlog or specification context. | Backlog item or user story/specification |
| `Coding Agent` | Implements a backlog item or user story/specification. | Backlog item or user story/specification |
| `Code Review Agent` | Reviews implementation work. | Pull request or review candidate |
| `Deployment Agent` | Handles deployment planning or execution context. | Deployment/release inputs declared by the deployed agent |
| `SDLC Orchestrator Agent` | Coordinates the SDLC agent sequence. | Project state and orchestration inputs declared by the deployed agent |

Hidden ADLC catalog entries such as `Documentation Agent` and `Spec Validation Agent` exist in code but are intentionally not shown in the sidebar.

### `Auxiliary Agents and Skills` Children

| Item | What it is |
| --- | --- |
| `Consultant Agent` | Opens `.agents/agents/consultant-agent/consultant-agent.md` when installed. |
| `Explain-me Agent` | Runs the bundled `explain-me` skill against the current solution and uncommitted changes. |
| `Grill-me` | Opens the `grill-me` skill when installed. |
| `Pre-mortem Agent` | Opens the `pre-mortem` skill when installed. |
| `Handoff` | Opens the `handoff` skill when installed. |
| `Conversation To Spec` | Opens the `to-spec` skill when installed. |
| `Spec To Tickets` | Opens the `to-tickets` skill when installed. |
| `llm-judge-agent` | Opens the LLM judge agent definition when installed. |
| `Feature Estimator Agent` | Estimates a feature from a Jira item or free-form description. |
| `Autoresearch Agent` | Opens the `autoresearch` skill when installed. |
| `Brainstorm Ideas` | Opens the `brainstorm-ideas` skill when installed. |
| `Customer Interviewer` | Opens the customer interview script skill when installed. |
| `System Design Agent` | Opens the architecture designer skill when installed. |
| `Prototype Builder` | Opens the prototype skill when installed. |
| `Story Point Council` | Opens the story point estimation skill when installed. |
| `Cloud Architect Review` | Runs a cloud-infrastructure review when cloud or infrastructure files are detected; otherwise it appears disabled. |

## Claude Terminal And Local liteLLM

`Claude Terminal` has special startup logic when Claude is configured to talk to a local liteLLM proxy.

### How Task Runner decides to auto-start liteLLM

It reads `ANTHROPIC_BASE_URL` in this order:

1. `<repo>/.agent/claude/settings.json`
2. `~/.claude/settings.json`

If the value starts with either:

- `http://localhost`
- `http://127.0.0.1`

Task Runner treats Claude as using local liteLLM.

### What happens then

1. It runs `Run liteLLM OpenAI` internally.
2. That command reads `tool-run.litellm-openai` from `~/.claude/routerconfig.json`.
3. It waits for `http://localhost:4000/health`.
4. If the health check succeeds, it launches `claude` in a new external terminal.

### Important limitation

The readiness check is currently hardcoded to `http://localhost:4000/health`.

If your local liteLLM server uses a different port, the Claude auto-start flow will not consider it ready.

### `Set Claude Model`

`Set Claude Model` opens a form driven by `~/.claude/routerconfig.json`.

Current behavior:

- If `~/.claude/routerconfig.json` does not exist, Task Runner creates it from:
  - `<repo>/routerconfig.example.json` when available, otherwise
  - the extension's bundled `routerconfig.example.json`
- The form reads router settings such as:
  - `baseurl`
  - `auth_token`
  - `apikey`
  - `models`
  - `post_run`
  - `mandatory_params`
- Applying a selection writes the resulting Claude settings and may run the router's post-run tool command.

## Jira And Local Backlog Behavior

Task Runner now treats Jira items and local backlog markdown files as related but separate sources of truth.

### Repo-level Jira key

The saved Jira project key is read from the repo root `.env`:

```env
JIRA_PROJECT_KEY=ABC
```

Several sidebar states depend on that value.

### Local backlog defaults

Most local backlog flows default to:

```text
docs/backlog
```

### `Add Backlog Item`

Current behavior:

- Always creates a local markdown backlog file.
- Can also create the matching Jira item when `Create on JIRA` is checked.
- Supports a `Grill Me` path that reviews the draft item instead of creating it immediately.

### `Assign Backlog Item to Agent`

Current behavior:

- Lets you choose:
  - a Jira item,
  - a local backlog item,
  - or both when the descriptions match cleanly
- Lets you override the harness command for that assignment
- `Assign`:
  - updates the Jira summary to append `- By Agent <HarnessLabel>`
  - adds a Jira label such as `developed-by-agent-codex`
  - assigns the issue to you
  - moves it to `In Progress`
  - launches the selected harness with Jira and backlog context
- `Grill Me`:
  - copies the `grill-me` skill into the project
  - launches the same item as a review prompt without changing Jira first

### `Mark Backlog Item as Completed`

Current behavior:

- Can complete a Jira item, a local backlog item, or both together
- Moves Jira to `In Review` when possible
- Falls back to `Done` when `In Review` is not available
- Updates the local backlog markdown `## Status` section to `In Review`

## Dynamic Sections

### Claude Plugins

- Source: `claude plugin list`
- Right click a plugin to enable or disable it
- Enabled plugins also contribute skills to the `Skills` section when those skills exist in the Claude plugin cache

### Agents

Task Runner merges agents from:

- `<repo>/.agents/agents`
- `<repo>/.agent/agents`
- `<repo>/.claude/agents`
- `<repo>/.codex/agents`
- `<repo>/.gemini/agents`
- `<repo>/.opencode/agents`
- `~/.claude/agents`
- `~/.codex/agents`
- `~/.gemini/agents`
- `~/.gemini/antigravity/agents`
- `~/.opencode/agents`
- `~/.config/opencode/agents`
- runnable Claude CLI agents from `claude agents`

Clicking a file-backed agent opens its definition file. Clicking a Claude CLI agent runs `claude --agent <name>` in the current repo.

### Skills

Task Runner merges skills from:

- `<repo>/.agents/skills`
- `<repo>/.agent/skills`
- `<repo>/.claude/skills`
- `<repo>/.codex/skills`
- `<repo>/.gemini/skills`
- `<repo>/.opencode/skills`
- `~/.claude/skills`
- `~/.codex/skills`
- `~/.codex/skills/.system`
- `~/.gemini/skills`
- `~/.gemini/antigravity/skills`
- `~/.opencode/skills`
- `~/.config/opencode/skills`
- enabled Claude plugin caches under `~/.claude/plugins/cache/.../skills`

Clicking a skill opens its `SKILL.md`. The item description shows the source, such as `Project .agents`, `User Codex system`, or `User Gemini`.

### Workflows

- Sources:
  - `<repo>/.agents/workflows`
  - `~/.gemini/antigravity/workflows`
- Clicking a workflow does one of two things:
  - if the repo has `scripts/<workflow-name>.sh`, it runs that script
  - otherwise it opens the workflow markdown

## Right-Click Actions In The Sidebar

| Action | Applies to | What it does |
| --- | --- | --- |
| `Copy Path` | Linked files and folders | Copies the absolute path |
| `Open` | Linked files and folders | Opens the file in the editor or opens the folder externally |
| `Add to project` | Linked files and folders | Creates a symlink in the repo root |
| `Add to Custom Skills` | Skill folders or `SKILL.md` files | Creates a symlink into `.agent/skills` |
| `Add to Custom Agents` | Agent folders or agent markdown files | Creates a symlink into `.agent/agents` |
| `Enable Plugin` | Disabled plugin entries | Runs `claude plugin enable <plugin>` |
| `Disable Plugin` | Enabled plugin entries | Runs `claude plugin disable <plugin>` |
| `Bring to Project` | `SOP Manual` | Copies the bundled SOP into `resources/sop.md` |

## Command Palette And Explorer Features Outside The Current Sidebar

These features are implemented today, but they are not all visible in the main sidebar.

### Command Palette

| Command | Current status | What it does |
| --- | --- | --- |
| `Antigravity: Open Help Doc` | Available now | Opens the latest `help.md` via Markdown preview |
| `Antigravity: Settings` | Available now | Opens the built-in settings webview |
| `Antigravity: Run liteLLM OpenAI` | Available now | Runs the `tool-run.litellm-openai` command from `~/.claude/routerconfig.json` in the shared Task Runner terminal |
| `Antigravity: Open OpenClaude Terminal` | Available now | Runs `openclaude` in a persistent VS Code terminal |
| `Antigravity: Create CLAUDE.md` | Available now | Launches the CLAUDE initialization/update flow |
| `Antigravity: Create AGENTS.md` | Available now | Launches the AGENTS initialization/update flow |
| `Antigravity: Update Agentic Workspace` | Available now | Runs `update-agentic-workspace.sh` against `antigravity.antigravityWorkspaceProject` |
| `Antigravity: Audit Secrets & Variables` | Available now | Scans `.github/workflows`, documents required items in `.env`, compares against GitHub repo and environment secrets/variables, and can prompt to set missing ones through `gh` |
| `Antigravity: Review a Pull Request` | Available now | Lets you pick a remote PR branch and checks it out locally after worktree safety checks |
| `Antigravity: Approve a Pull Request` | Available now | Launches the selected harness against the `approve_pull_request` workflow |
| `Antigravity: Feedback on Pull Request` | **Under development** | Currently only shows an informational message |
| `Antigravity: Setup Workspace` | Available now | Opens a template picker, creates workspace support folders and harness links, then launches the selected harness to fetch the chosen template into `antigravity.workspaceProjectPath` |
| `Antigravity: Create Repo Tag` | Available now | Creates and pushes an annotated `v<package.json version>` Git tag |

### Explorer Context Menu

| Command | Scope | What it does |
| --- | --- | --- |
| `Backup-Compress` | Files and folders in Explorer | Creates a timestamped `.zip` beside the selected item |
| `DiffMerge` | One selected file | Opens `/Applications/DiffMerge.app` with that file |
| `DiffMerge files` | Two or three selected files | Opens `/Applications/DiffMerge.app` with the selected files |

`DiffMerge` is currently macOS-specific because the extension hardcodes `/Applications/DiffMerge.app`.

## Remote Resource Behavior

Several features intentionally fetch the latest shared resources from the Task Runner GitHub repository instead of only using packaged local files.

That currently applies to:

- `Open Help Doc`
- `SOP Manual`
- `Setup Workspace` templates
- Bundled skills copied into a project, such as:
  - `jira-project-creation`
  - `grill-me`
  - `estimator`
  - `explain-me`
  - `cloud-architect`

This means a freshly opened help page or copied skill can reflect the latest content from the repo's `main` branch.

## Under Development And Known Gaps

These are the main areas where the implementation is real but the experience is not fully polished yet.

- `Feedback on Pull Request` is still a placeholder.
- Several commands are implemented and reachable from sidebar clicks, but not contributed as standalone Command Palette commands.
  - Examples: `Codex Terminal`, `Ollama Codex`, `Opencode Terminal`, `Feature Estimator Agent`, `Explain-me Agent`, `Cloud Architect Review`, and the version bump commands.

## Practical Tips

- If a sidebar item looks disabled or does nothing useful, check prerequisites first:
  - Git repo present
  - `JIRA_PROJECT_KEY` present in repo `.env`
  - required CLI installed
  - required setting filled in
- If a Jira flow fails, verify both:
  - Jira credentials in `antigravity.*` settings
  - the repo `.env` contains the right `JIRA_PROJECT_KEY`
- If `Claude Terminal` fails unexpectedly, inspect:
  - `<repo>/.agent/claude/settings.json`
  - `~/.claude/settings.json`
  - `~/.claude/routerconfig.json`
- If a bundled resource looks stale, remember that help, SOP, templates, and copied skills are intentionally fetched from the GitHub-backed resource provider.
