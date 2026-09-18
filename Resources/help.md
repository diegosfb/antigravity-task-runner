# Task Runner Help

This guide describes Task Runner as it is currently implemented in this repository for `v4.10.106`.

It is intentionally source-of-truth to the extension code. If the UI, an older screenshot, or an older help document says something different, trust this file. Items marked **Under development** exist in code but are incomplete, partially surfaced, or still inconsistent.

## Quick Start

1. Open the `Task Runner` activity bar view.
2. Use the title bar buttons:
   - `Settings` opens the built-in Task Runner settings page.
   - `Open Help Doc` opens this help document in Markdown preview.
3. Configure the basics first:
   - `antigravity.buildCommand`
   - `antigravity.projectTestingCommand`
   - `antigravity.agenticHarnessExecutionCommand`
   - `antigravity.lightAgenticHarnessExecutionCommand`
   - `antigravity.jiraBaseUrl`
   - `antigravity.jiraEmail`
   - `antigravity.jiraApiToken`
4. If you use Jira flows, make sure the repo has a root `.env` with `JIRA_PROJECT_KEY`, or use `Select/Set Jira Project` to save it.
5. If you use Claude routing, keep `~/.claude/settings.json` and `~/.claude/routerconfig.json` in good shape.

## What The Sidebar Shows

The current top-level order is:

1. AI launchers and build/test actions
2. Linked folders such as `~/.gemini/antigravity`, `~/.claude`, `~/.codex`, and optional custom add-ons
3. Quick actions and categories
4. `Claude Plugins`
5. `Agents`
6. `Skills`
7. `Workflows`

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
| `opencode` | `Opencode`, optional harness choices |
| `ollama` | `Ollama Claude`, `Ollama Codex` |
| `zip` | Explorer `Backup-Compress` |
| `/Applications/DiffMerge.app` on macOS | Explorer `DiffMerge` actions |

## Settings Reference

Use the title-bar gear button or VS Code settings to edit `antigravity.*`.

### Core Settings

| Setting | What it controls | Used by |
| --- | --- | --- |
| `antigravity.rootPath` | Main Antigravity content root. Defaults to `./.agent/antigravity`. If that does not exist, the extension falls back to the workspace root. | Repo root detection, agents, workflows |
| `antigravity.workspaceProjectPath` | Where workspace files should be created or downloaded. Relative values are resolved from the repo root. | `Setup Workspace`, internal workspace bootstrap flows |
| `antigravity.workflowsFolder` | Extra workflow lookup root. Task Runner checks `<folder>/workflows/<name>/WORKFLOW.md` and `<folder>/<name>/WORKFLOW.md` before falling back to bundled workflows. | `Approve a Pull Request` and other workflow lookups |
| `antigravity.terminalName` | Shared VS Code terminal name for normal Task Runner script runs. | Build/test/scripts |
| `antigravity.agentTerminalName` | VS Code terminal name used for agent-oriented persistent terminals. | Agent launches and some helper actions |
| `antigravity.buildCommand` | Exact build command to run. | `Build Project` |
| `antigravity.projectTestingCommand` | Exact test command to run. | `Run Project Tests`, PR and merge flows |
| `antigravity.defaultGithubCodeReviewer` | Default reviewer suggestion passed into the PR flow. | `Create Pull Request` |
| `antigravity.enableDebugLogging` | Enables extra logs in the `Antigravity Task Runner` output channel. | Troubleshooting |

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
| `Ollama Claude` | Opens an external OS terminal and runs `ollama launch claude --model glm-5:cloud --yes`. | Requires `ollama`. |
| `Ollama Codex` | Opens an external OS terminal and runs `ollama launch codex --model glm-5:cloud --yes`. | Requires `ollama`. Sidebar only right now. |
| `Opencode` | Opens an external OS terminal in the repo root and runs `opencode`. | Sidebar only right now. |
| `Set Claude Model` | Opens a model/router configuration page and writes the selected Claude routing values. | Creates `~/.claude/routerconfig.json` from `routerconfig.example.json` if needed. |
| `Build Project` | Runs `antigravity.buildCommand` in a VS Code task terminal. | Fails fast if the setting is blank. |
| `Run Project Tests` | Runs `antigravity.projectTestingCommand` in a VS Code task terminal. | Fails fast if the setting is blank. |

### Linked Folders And Browsers

| Item | What it shows | Appears when |
| --- | --- | --- |
| `antigravity` | `~/.gemini/antigravity` | That folder exists |
| `claude` | `~/.claude` | That folder exists |
| `codex` | `~/.codex` | That folder exists |
| Custom add-ons folder | The folder from `antigravity.customAgenticPlatformAddons` | The setting is configured and the folder exists |
| `Claude Plugins` | Output of `claude plugin list` | Always shown; contents depend on CLI availability |
| `Agents` | Output of `claude agents` | Always shown; contents depend on CLI availability |
| `Skills` | Project skills from `.agent/skills` and `.claude/skills`, user skills from `~/.claude/skills`, and enabled plugin skills from the Claude plugin cache | Always shown |
| `Workflows` | Markdown files under `~/.gemini/antigravity/workflows` | When that folder exists |

### Quick Actions

| Item | What it does | Notes |
| --- | --- | --- |
| `Update Project Config` | Category containing focused harness-driven update prompts. | Children are listed below. |
| `Assign Backlog Item to Agent` | Lets you pick a Jira backlog item and/or local backlog markdown item, choose an agent harness command, then either assign it or run `Grill Me`. | Requires valid Jira settings. If `Use Jira` is enabled, the repo also needs `JIRA_PROJECT_KEY`. |
| `Init Repository` | Creates or connects a Git repo and GitHub repo, then bootstraps repo defaults. | Visible only when the project is not already a Git repo. Also creates CI/CD workflow files, `.gitignore`, `.env.example`, default GitHub environments (`dev`, `qa`, `stage`, `prod`), commits, and pushes. |
| `Set Feature Flag for changes` | Opens the selected harness with a prompt to wrap behavior changes in `.env` feature flags and add them to `.env.example`. | Always visible. |
| `ADLC` | Category of role-based runner forms. | The tooltip still says "coming soon", but the forms are implemented. See the ADLC section below. |
| `Select/Set Jira Project` | Lets you save an existing Jira project key or launch agentic creation of a company-managed Jira Software project. | Visible when the repo does not already have `JIRA_PROJECT_KEY` in its root `.env`. |
| `Create Backlog item` | Opens a form to create a local backlog markdown file and, optionally, create the matching Jira item too. | Visible when `JIRA_PROJECT_KEY` is already saved. |
| `Take Jira Item (Assign)` | Assigns an eligible unassigned Jira item to you and moves it to `In Progress`. | Visible when `JIRA_PROJECT_KEY` is already saved. |
| `Backlog Item Completed` | Moves a Jira item to `In Review`, or to `Done` if review is unavailable, and can also update the local backlog file status. | Visible when `JIRA_PROJECT_KEY` is already saved. |
| `Increment Major Version` | Runs the repo bump script with `major`. | Sidebar only right now. |
| `Increment Minor Version` | Runs the repo bump script with `minor`. | Sidebar only right now. |
| `Increment Patch Version` | Runs the repo bump script with `patch`. | Sidebar only right now. |
| `Cloud Architect Review` | Copies the bundled `cloud-architect` skill into the project and launches the selected harness with an infrastructure review prompt. | Stays visible, but behaves as disabled when no cloud/infrastructure signals are detected. |
| `Feature Estimator` | Estimates a single feature from either a Jira `To Do` item or free text, or runs `Grill Me` on the same input. | Sidebar only right now. Copies the `estimator` or `grill-me` skill into the project first. |
| `Explain Me` | Copies the `explain-me` skill into the project and asks the selected harness to explain the solution and the latest uncommitted changes. | Sidebar only right now. |
| `Revert Changes` | Runs the autocommit revert script. | Appears only when autocommit is already running. |
| `SOP Manual` | Opens the project SOP at `Resources/sop.md` if present, otherwise downloads and opens the bundled SOP. | Right-click the item to copy the SOP into the project. |

### `Update Project Config` Children

| Item | What it does |
| --- | --- |
| `Update Github Actions` | Opens the selected harness with the GitHub Actions update prompt. |
| `Update Tests` | Opens the selected harness with the test and Postman update prompt. |
| `Update AGENTS.md` | Opens the selected harness with the progressive-disclosure `AGENTS.md` update prompt. Requires an existing `AGENTS.md` in the configured workspace path. |

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

### ADLC Role Runners

The ADLC section is a set of advanced forms that launch a user-supplied script with normalized arguments. These flows do not bundle the script for you. Each form requires an `Agent Script Path`, and most default their file/folder inputs under `<repo>/workspace/...`.

| Item | Purpose | Main required inputs |
| --- | --- | --- |
| `Product Designer` | Launch a product-design runner script. | Agent harness, workspace folder, project description folder, agent script path |
| `Business Analyst` | Launch a business-analyst runner script. | Agent harness, workspace folder, specs folder, agent script path |
| `Solution Architect` | Launch a solution-architecture runner script. | Agent harness, workspace folder, project description folder, specs folder, agent script path |
| `Estimate Project` | Launch a project-level estimation runner script. | Agent harness, workspace folder, project description folder, architecture folder, backlog folder, agent script path |
| `Create Execution Plan` | Launch an execution-planning runner script. | Agent harness, workspace folder, project description folder, architecture folder, backlog folder, agent script path |
| `Develop Execution Plan` | Launch a development runner script against an execution plan. | Agent harness, workspace folder, execution plan file, architecture folder, backlog folder, agent script path |

ADLC notes:

- `Business Analyst`, `Estimate Project`, `Create Execution Plan`, and `Develop Execution Plan` can also pass Jira credentials and Jira project info when `Enable Jira` is turned on.
- The forms save draft values in workspace state, so reopening them usually restores your last inputs.
- The current ADLC category tooltip still says "coming soon", but the forms are already wired and usable.

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

### `Create Backlog item`

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

### `Backlog Item Completed`

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

- Source: `claude agents`
- Clicking an item runs `claude --agent <name>` in the current repo
- The list can include user, plugin, built-in, and project agents depending on your Claude setup

### Skills

Task Runner merges skills from:

- `<repo>/.agent/skills`
- `<repo>/.claude/skills`
- `~/.claude/skills`
- enabled Claude plugin caches under `~/.claude/plugins/cache/.../skills`

Clicking a skill opens its `SKILL.md`.

### Workflows

- Source: markdown files in `~/.gemini/antigravity/workflows`
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
| `Bring to Project` | `SOP Manual` | Copies the bundled SOP into `Resources/sop.md` |

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
| `Antigravity: Setup Workspace` | **Under development** | Opens a template picker, creates workspace support folders and harness links, then launches the selected harness to fetch the chosen template into `antigravity.workspaceProjectPath` |
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

- `Setup Workspace` is only partially wired today.
  - It already loads live project templates, creates support folders such as `.agent`, `.claude`, `.codex`, and `.opencode`, and launches the selected harness.
  - Helper code already exists to copy `CLAUDE.md`, `AGENTS.md`, and bundled setup skills, but that copy step is not currently executed in the main command path.
- `ADLC` works, but the sidebar tooltip still says `ADLC roles coming soon.`
- `Feedback on Pull Request` is still a placeholder.
- Autocommit is only partially surfaced.
  - The revert command is wired.
  - The internal start/stop command exists.
  - The main sidebar does not currently expose a normal `Autocommit Start` or `Autocommit Stop` entry.
- Several commands are implemented and reachable from sidebar clicks, but not contributed as standalone Command Palette commands.
  - Examples: `Codex Terminal`, `Ollama Codex`, `Opencode`, `Feature Estimator`, `Explain Me`, `Cloud Architect Review`, and the version bump commands.

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
