# Task Runner Usage

This document describes the items that appear in the Task Runner sidebar and what each one does. Some items are always visible. Others only appear when the repository is already a Git repo, when Jira is configured, or when autocommit is running.

## Before You Start

- Open the `Task Runner` view from the VS Code activity bar.
- Use the settings gear button for the built-in Task Runner settings screen, or edit raw `antigravity.*` values in VS Code `settings.json`.
- Jira items work best when the repo has a valid `.env` with Jira credentials and a saved `JIRA_PROJECT_KEY`.
- Claude items expect the `claude` CLI and local Claude config to be available.

## Settings

Task Runner settings can be edited in two places:

- Click the settings gear in the `Task Runner` view for the built-in settings page.
- Open VS Code Settings or `settings.json` and edit the raw `antigravity.*` keys directly.

As a rule of thumb, save repo-specific behavior in Workspace settings and personal machine-specific values in User settings.

### Paths, folders, and linked content

| Setting | Used by | What it controls |
| --- | --- | --- |
| `antigravity.rootPath` | Agents, workflows, project assets | Repo-relative path to the antigravity folder that contains agent and workflow content. Leave it at the default unless the repo stores that folder somewhere else. |
| `antigravity.workspaceProjectPath` | `Workspace Setup`, environment/config scripts | Folder where workspace files are extracted or downloaded. Relative values are resolved from the repo root. |
| `antigravity.workflowsFolder` | `Workflows` section | Base folder searched for workflow markdown before Task Runner falls back to bundled workflows. |
| `antigravity.customAgenticPlatformAddons` | Linked folders section | Extra local folder to show in the sidebar so you can browse custom shared assets. |
| `antigravity.sopManualLink` | `SOP Manual` | Markdown URL downloaded by the SOP Manual action. If `SOP_MANUAL_LINK` exists in the repo `.env`, that repo value overrides this setting. |
| `antigravity.antigravityWorkspaceProject` | `Update Agentic Workspace` | Local folder path where the `antigravity-workspace` repo should live when Task Runner refreshes shared workspace assets. This is an advanced setting and is usually edited only in raw settings. |

### Build, Git, and terminal behavior

| Setting | Used by | What it controls |
| --- | --- | --- |
| `antigravity.terminalName` | Workflow and repo scripts | Terminal name used for the regular Task Runner script terminal. |
| `antigravity.agentTerminalName` | Agent launches | Terminal name used when Task Runner runs an agent-oriented command. |
| `antigravity.buildCommand` | `Build Project` | Exact build command Task Runner runs for the project. |
| `antigravity.projectTestingCommand` | `Run Project Tests`, PR and merge scripts | Exact test command Task Runner runs when a flow wants project validation. |
| `antigravity.defaultGithubCodeReviewer` | `Create Pull Request` | Default GitHub reviewer suggestion shown in the PR flow. |
| `antigravity.createReleaseBranchWhenCreatingReleases` | `Create Repo Release` | When enabled, release creation also creates, checks out, and pushes a release branch named for the release. |
| `antigravity.autoUpdateClaudeMd` | `Autocommit Start` | When enabled, starting autocommit also asks Claude to refresh `CLAUDE.md`. |
| `antigravity.enableDebugLogging` | Antigravity output channel | When enabled, Task Runner writes extra debug logs to the extension output. |
| `antigravity.useAgentForGithubRepositoryManagement` | `Commit` | Switches GitHub repo management to prefer agent-driven flows. In the current implementation this mainly affects `Commit`: when enabled, the commit flow delegates message generation and commit execution to the selected light agent harness instead of the built-in local message generator. |

### Jira settings

| Setting | Used by | What it controls |
| --- | --- | --- |
| `antigravity.jiraBaseUrl` | All Jira actions | Jira site base URL, usually your Atlassian cloud URL. |
| `antigravity.jiraEmail` | All Jira actions | Jira account email used for API authentication. |
| `antigravity.jiraApiToken` | All Jira actions | Jira API token used for API authentication. Treat this as a secret and do not commit it to Git. |

### Agent and harness commands

| Setting | Used by | What it controls |
| --- | --- | --- |
| `antigravity.antigravityPath` | Agent launches that still use the Antigravity executable | Path to the `antigravity` executable. Change it only if the command is not on your PATH or you want a custom binary. |
| `antigravity.antigravityArgs` | Same executable-based agent launches | Argument template passed to the `antigravity` executable. It supports `{agent}` and `{agentFile}` placeholders. |
| `antigravity.agenticHarnessExecutionCommand` | Main agentic actions | Primary harness command used for heavier agent-driven actions such as `Assign Jira Item to Agent`, `Agentic review of Merge`, and `Set Feature Flag for changes`. |
| `antigravity.agenticHarnessExecutionCommands` | Settings command picker | Saved list of selectable main harness commands. Add values here if you want more options in the settings dropdown. |
| `antigravity.lightAgenticHarnessExecutionCommand` | Lightweight agentic actions | Lighter or cheaper harness command used for smaller prompt-driven tasks. If `Use Agent for Github Repository Management` is enabled, `Commit` uses this lighter harness path. |
| `antigravity.lightAgenticHarnessExecutionCommands` | Settings command picker | Saved list of selectable light harness commands. Edit it when you want different quick-select options in the settings UI. |

### Fallback sources and setup repos

| Setting | Used by | What it controls |
| --- | --- | --- |
| `antigravity.scriptFallbackBaseUrl` | Missing repo scripts | Base URL Task Runner uses to download a script when `./scripts/<name>.sh` is missing locally. |
| `antigravity.configFallbackBaseUrl` | Environment/config downloads | Base URL Task Runner uses to download missing config files such as `DEV-settings.yaml` or `.env`. |
| `antigravity.claudeSetupGithub` | `Update Agentic Setup` | GitHub repo URL used when refreshing Claude setup files. This is an advanced setup value. |
| `antigravity.geminiSetupGithub` | `Update Agentic Setup` | GitHub repo URL used when refreshing Gemini setup files. This is an advanced setup value. |
| `antigravity.codexSetupGithub` | `Update Agentic Setup` | GitHub repo URL used when refreshing Codex setup files. This is an advanced setup value. |

## Launchers And Linked Folders

| Item | What it does | How to use it | When it appears |
| --- | --- | --- | --- |
| `Claude Terminal` | Opens a new terminal in the repo root and runs `claude`. Before launching, Task Runner checks Claude's `ANTHROPIC_BASE_URL`. If that value points at `localhost` or `127.0.0.1`, Task Runner treats Claude as using a local liteLLM proxy, runs the configured liteLLM start command, waits for the health check to pass, and only then launches `claude`. | Click it when you want an interactive Claude session rooted in the current project. See `Claude + local liteLLM setup` below for the exact files and keys. | Always |
| `Set Claude Model` | Opens a model-selection panel for Claude and applies the chosen router, model, effort level, and internal behavior. If `~/.claude/routerconfig.json` does not exist yet, Task Runner creates it from `routerconfig.example.json` and opens it. | Click it, choose the desired router and model, then apply the change. | Always |
| `Run liteLLM OpenAI` | Runs the configured `tool-run.litellm-openai` command from Claude router config in the secondary terminal. | Use it when your Claude setup depends on a local liteLLM service. | Always |
| `Build Project` | Runs the command stored in `antigravity.buildCommand`. | Set the build command in Task Runner settings, then click the item. | Always |
| `Run Project Tests` | Runs the command stored in `antigravity.projectTestingCommand`. | Set the test command in Task Runner settings, then click the item. | Always |
| `antigravity` folder | Lets you browse the home Antigravity folder at `~/.gemini/antigravity`. | Expand it to inspect bundled workflows, files, and helper content. | When `~/.gemini/antigravity` exists |
| `claude` folder | Lets you browse `~/.claude`. | Expand it to inspect Claude settings, workflows, plugins, or local files. | When `~/.claude` exists |
| `codex` folder | Lets you browse `~/.codex`. | Expand it to inspect Codex-related local files and settings. | When `~/.codex` exists |
| Custom add-ons folder | Lets you browse the folder configured in `antigravity.customAgenticPlatformAddons`. | Set the add-ons path in settings, then expand the folder to browse reusable assets. | When the setting is configured and the folder exists |

## Claude + Local liteLLM Setup

Task Runner decides whether it should auto-start liteLLM when you click `Claude Terminal` by checking Claude's `ANTHROPIC_BASE_URL`.

### Where Task Runner reads that value

1. Project override first: `<repo>/.agent/claude/settings.json`
2. Global fallback: `~/.claude/settings.json`

Task Runner reads `env.ANTHROPIC_BASE_URL` from those files in that order. If the project-level file exists, it wins.

### What counts as "local liteLLM"

- If `ANTHROPIC_BASE_URL` starts with `http://localhost`
- Or if it starts with `http://127.0.0.1`

When that happens, clicking `Claude Terminal` will:

1. Run the `Run liteLLM OpenAI` action internally
2. Start the command stored at `~/.claude/routerconfig.json` under `tool-run.litellm-openai`
3. Wait for `http://localhost:4000/health`
4. Launch `claude`

### Important current limitation

- The readiness check is hardcoded to `http://localhost:4000/health`.
- In practice, that means the local liteLLM setup should use port `4000` if you want the auto-start behavior to work cleanly.

### Easiest way to configure it

Use the `Set Claude Model` item in the Task Runner sidebar.

1. Click `Set Claude Model`
2. If `~/.claude/routerconfig.json` does not exist yet, Task Runner creates it from `routerconfig.example.json`
3. Choose the `LiteLLM` router
4. Choose the model you want Claude to use through liteLLM
5. Apply the change

That flow writes the selected router's `baseurl`, auth token, API key, and model into `~/.claude/settings.json`, and if the router has a `post_run` entry such as `litellm-openai`, it also runs the matching command from `tool-run`.

### Manual configuration files

Global Claude settings example in `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://localhost:4000",
    "ANTHROPIC_MODEL": "openai/gpt-5.2-codex",
    "ANTHROPIC_API_KEY": "<your-api-key-if-needed>",
    "ANTHROPIC_AUTH_TOKEN": ""
  }
}
```

Optional project-specific override in `<repo>/.agent/claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://localhost:4000"
  }
}
```

liteLLM launch command example in `~/.claude/routerconfig.json`:

```json
{
  "tool-run": {
    "litellm-openai": "OPENAI_API_KEY=<your-key> LITELLM_DROP_PARAMS=true litellm --model openai/gpt-5.2-codex"
  },
  "LiteLLM-settings": {
    "baseurl": "http://localhost:4000",
    "post_run": "litellm-openai"
  }
}
```

### Which file should you edit

- Edit `~/.claude/settings.json` if you want one global Claude setup across projects.
- Edit `<repo>/.agent/claude/settings.json` if this repo should override your normal global Claude endpoint.
- Edit `~/.claude/routerconfig.json` if you need to change how liteLLM is launched or which router/model options appear in `Set Claude Model`.

### Common failure mode

If `ANTHROPIC_BASE_URL` points to `localhost` but `tool-run.litellm-openai` is missing from `~/.claude/routerconfig.json`, `Claude Terminal` will recognize that you want local liteLLM but will have no start command to run. In that case, fix `routerconfig.json` first.

## Quick Actions

| Item | What it does | How to use it | When it appears |
| --- | --- | --- | --- |
| `Setup Workspace` | Opens a project template picker populated from `Resources/project-templates.json`, copies the bundled `CLAUDE.md` and `AGENTS.md` guide files into the target workspace root, creates `.agent` and `.claude` there, copies `Resources/jira-project-creation` into `.agent/skills/`, then launches the selected Agentic Harness to download the chosen starter project into the configured workspace path using that template's URL and instructions. | Use it before `Workspace Setup` when you want to seed the workspace with a starter project. | Always |
| `Update Project Config` | A collapsed section right after `Setup Workspace` that groups agent-driven project configuration and project guide updates. | Expand it when you want to run one of the focused project config update prompts below. | Always |
| `Update Github Actions` | Runs the selected Agentic Harness with the prompt `Update the project Github actions to match the project setup`. | Use it when the repository workflows need to be brought in line with the current project structure and setup. | Inside `Update Project Config` |
| `Update Tests` | Runs the selected Agentic Harness with the prompt `Update the project unit tests, integration tests and postman scripts`. | Use it when the unit tests, integration tests, or Postman scripts need to catch up with the current project behavior. | Inside `Update Project Config` |
| `Update AGENTS.md` | Opens the selected Agentic Harness with the progressive-disclosure refactor prompt for the workspace `AGENTS.md`. | Use it after setup when the project instructions need to be refreshed to match the current repo conventions and structure. | Inside `Update Project Config` |
| `Workspace Setup` | Runs the bundled `workspace-setup.sh --force` script in the configured workspace project path. This is the main bootstrap action for creating the workspace structure. It creates the agentic project folders and executes the project scaffolding scripts. | Use it when starting a repo or when the workspace files need to be regenerated. | Always |
| 🧠 `Assign Jira Item to Agent` | Lets you choose an eligible Jira item and an agent harness command. `Assign` updates the Jira summary and labels, assigns the issue to you with a label explaining that it is being worked on by an agent and not by you, moves it to `In Progress`, and launches the selected agent for that issue. `Grill Me` copies the bundled `grill-me` skill into the project’s `.agent/skills` and `.claude/skills`, then launches the selected Agentic Harness in prompt mode to review that same selected Jira item without assigning it first. | Use it either to hand a Jira task to an agent-driven workflow or to pressure-test the selected Jira item before assignment. Requires Jira credentials and a saved `JIRA_PROJECT_KEY`. | Always, but effectively requires Jira setup |
| `Init Repository` | Initializes Git for the current project, asks for the repository name, and can remove nested `.git` folders before running the init script. | Use it the first time a project becomes a Git repository. | Only when the current project does not already have a `.git` folder |
| 🤖 `Commit` | Saves files, stages changes, excludes `.env` and `config/.env`, generates a commit message using the Light Agentic Harnes execution commands, and creates the commit. The Commit action only uses an agent if antigravity.useAgentForGithubRepositoryManagement is enabled.| Use it for a normal local checkpoint after making changes. | Only when the project is already a Git repo |
| `Create Repo Release` | Prompts for an optional description and runs the release/tag script. It respects the `antigravity.createReleaseBranchWhenCreatingReleases` setting. | Use it when you want to create and push a versioned release tag. | Only when the project is already a Git repo |
| `Create Feature Branch` | Opens a dialog for branch type and branch name, normalizes the branch name, optionally helps with Jira task naming, and runs the branch creation script. | Use it to start a new `feature/`, `fix/`, or `hotfix/` branch in the expected format. | Only when the project is already a Git repo |
| 🤖 `Create Pull Request` | Starts the PR creation workflow in a terminal, using the default reviewer setting and the configured test command when available. | Use it after your feature branch is ready for review and already includes the latest `main`. | Only when the project is already a Git repo |
| `Merge branch to main` | Runs the merge-to-main workflow for the current branch after checking that you are not already on `main`. | Use it when your current feature branch is ready to be merged into `main`. | Only when the project is a Git repo and the current branch is not `main` |
| `Go To Branch` | Shows available branches, lets you pick one, and switches to it after the usual commit/discard safety checks. | Use it to change branches from inside the sidebar. | Only when the project is already a Git repo |
| `Pull Remote and merge` | Updates local `main`, merges it into the current branch, runs tests if configured, and pushes the branch. | Use it to sync your working branch with the latest remote `main` before review or merge. | Only when the project is a Git repo and the current branch is not `main` |
| 🧠 `Agentic review of Merge` | Opens an agentic review terminal with a prompt focused on reviewing the merge result against `main`. It uses the agent harness selected in the settings | Use it after syncing a branch with `main` and before final review. The working tree must be clean. | Only when the project is a Git repo and the current branch is not `main` |
| 🧠 `Set Feature Flag for changes` | Opens an agentic prompt that asks the harness to wrap new or modified behavior changes in `.env`-driven feature flags and add them to `.env.example`. It uses the agent harness selected in the settings| Use it when you need a safe rollout path for new behavior. | Always |
| `Select/Set Jira Project` | Chooses and saves the Jira project key for the repo. If, inside that same dialog, you click Create Jira Project, Task Runner copies the bundled `jira-project-creation` skill into the project’s `.agent/skills` and `.claude/skills`, then uses the Agentic Harness configured in settings to create and configure a new project in Jira. | Use it before any Jira issue actions if the repo has not been linked to a Jira project yet. | When no `JIRA_PROJECT_KEY` is saved for the repo |
| `Add Jira Item` | Opens a form where you choose the issue type and enter the summary and description. `Create` creates the Jira issue normally. `Grill Me` copies the bundled `grill-me` skill into the project’s `.agent/skills` and `.claude/skills`, then launches the selected Agentic Harness in prompt mode using that draft Jira item information instead of creating the ticket immediately. | Use it to either create a new Jira task directly from the sidebar or stress-test the draft item before creating it. | When a Jira project key is already saved |
| `Take Jira Item (Assign)` | Shows available unassigned Jira items, assigns the selected one to you, and moves it to `In Progress`. | Use it when you want to pick up an existing Jira item yourself. | When a Jira project key is already saved |
| `Jira Item Completed` | Lets you choose one of your active Jira items and moves it to `In Review`, or `Done` if review is unavailable. | Use it when your work on a Jira item is complete. | When a Jira project key is already saved |
| `Increment Major Version` | Runs the version bump script with `major`. | Use it for a breaking-release version bump. | Always |
| `Increment Minor Version` | Runs the version bump script with `minor`. | Use it for a backward-compatible feature release. | Always |
| `Increment Patch Version` | Runs the version bump script with `patch`. | Use it for a bug-fix or small maintenance release. | Always |
| `Cloud Architect Review` | Copies the bundled `cloud-architect` skill into the project’s `.agent/skills` and `.claude/skills`, then launches the selected Agentic Harness in prompt mode with the infrastructure review prompt. It stays visible but is disabled when the repo does not appear to contain cloud infrastructure. | Use it when the repository includes deployment or infrastructure files and you want an agent to review sizing and cloud setup choices. | Always, but disabled when no cloud infrastructure signals are detected |
| `Feature Estimator` | Opens a configuration page where you can work from either one Jira item in `To Do` or a free-text feature description. `Estimate` copies the bundled `estimator` skill into the project’s `.agent/skills` and `.claude/skills`, then launches the selected Agentic Harness in prompt mode with the estimation request. `Grill Me` copies the bundled `grill-me` skill into the same project skill folders, then launches the selected Agentic Harness in prompt mode to review that same selected feature. | Use it when you want either a quick effort and staffing estimate or a more probing feature review based on the same Jira/text input. | Always |
| `Explain Me` | Copies the bundled `explain-me` skill into the project’s `.agent/skills` and `.claude/skills`, then launches the selected Agentic Harness in prompt mode with a request to explain the whole solution and the latest uncommitted changes. | Use it when you want a guided walkthrough of the project plus a focused explanation of what has changed locally. | Always |
| `Autocommit Start` | Starts the autocommit background workflow. | Use it when you want periodic automated checkpoints. A GitHub remote must already exist. | When autocommit is not already running |
| `Autocommit Stop` | Stops the autocommit background workflow. | Use it when you no longer want automated checkpoints. | When autocommit is already running |
| `Revert Changes` | Runs the autocommit revert script. | Use it to roll back the current autocommit change set. | Only when autocommit is already running |
| `SOP Manual` | Downloads the configured SOP markdown file to a temp file and opens it in VS Code. | Use it when you need the current SOP reference while working in the repo. | Always |

## Dynamic Sections

| Item | What it does | How to use it |
| --- | --- | --- |
| `Claude Plugins` | Lists Claude plugins from `claude plugin list`. Each plugin shows whether it is enabled or disabled. | Expand the section, then right-click a plugin to enable or disable it. |
| `Agents` | Lists Claude agents from `claude agents`. Clicking an item opens a terminal that runs `claude --agent <name>` in the current repo. | Expand the section and click the agent you want to run. |
| `Skills` | Lists skills from project skill folders, user skill folders, and enabled plugin skill caches. Clicking an item opens its `SKILL.md`. | Expand the section and open a skill when you want to inspect its instructions or reuse it. |
| `Workflows` | Lists markdown workflows from `~/.gemini/antigravity/workflows`. Clicking an item runs `./scripts/<workflow-name>.sh` if that script exists in the repo; otherwise it opens the workflow markdown. | Expand the section and click the workflow you want to run or inspect. |

## Right-Click Actions

| Action | Applies to | What it does | How to use it |
| --- | --- | --- | --- |
| `Copy Path` | Folder and file items in the sidebar | Copies the selected item's absolute path to the clipboard. | Right-click the item and choose `Copy Path`. |
| `Open Path` | Folder and file items in the sidebar | Opens a folder externally or opens a file in the editor. | Right-click the item and choose `Open Path`. |
| `Add To Project` | Folder and file items in linked trees | Creates a symlink in the project root that points to the selected item. | Use it when you want a linked asset directly in the repo root. |
| `Add To Custom Skills` | Skill folders or `SKILL.md` files | Creates a symlink into `.agent/skills` so the skill becomes part of the project skill set. | Use it to promote a reusable skill into the current project's custom skills. |
| `Add To Custom Agents` | Agent folders or `AGENT.md` files | Creates a symlink into `.agent/agents` so the agent becomes part of the project agent set. | Use it to promote a reusable agent into the current project's custom agents. |
| `Enable Plugin` | Disabled plugin entries | Runs `claude plugin enable <plugin>`. | Right-click a disabled plugin entry under `Claude Plugins`. |
| `Disable Plugin` | Enabled plugin entries | Runs `claude plugin disable <plugin>`. | Right-click an enabled plugin entry under `Claude Plugins`. |

## Practical Reading Of The Sidebar

- The first block is for Claude launch and build/test commands.
- The middle block is for repo setup, Git flow, Jira flow, versioning, autocommit, and project helper actions.
- The lower block is for reusable assets: plugins, agents, skills, workflows, and linked folders.
- If an item looks gray or does not appear, Task Runner is usually waiting on a missing prerequisite such as Git initialization, a GitHub remote, Jira setup, or a config value in settings.
