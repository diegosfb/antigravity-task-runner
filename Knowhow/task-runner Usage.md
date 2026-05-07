# Task Runner Usage

This document describes the items that appear in the Task Runner sidebar and what each one does. Some items are always visible. Others only appear when the repository is already a Git repo, when Jira is configured, or when autocommit is running.

## Before You Start

- Open the `Task Runner` view from the VS Code activity bar.
- Use the settings gear button to configure values such as:
  - `antigravity.rootPath`
  - `antigravity.workspaceProjectPath`
  - `antigravity.buildCommand`
  - `antigravity.projectTestingCommand`
  - `antigravity.workflowsFolder`
- Jira items work best when the repo has a valid `.env` with Jira credentials and a saved `JIRA_PROJECT_KEY`.
- Claude items expect the `claude` CLI and local Claude config to be available.

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
| `Workspace Setup` | Runs the bundled `workspace-setup.sh --force` script in the configured workspace project path. This is the main bootstrap action for creating the workspace structure. It creates the agentic project folders and executes the project scaffolding scripts. | Use it when starting a repo or when the workspace files need to be regenerated. | Always |
| 🧠 `Assign Jira Item to Agent` | Lets you choose an eligible Jira item and an agent to assign the issue to so it automatically starts working on it. It updates the Jira summary and labels, assigns the issue to you with a label explaining that it is being worked on by an agent and not by you, moves it to `In Progress`, and launches the selected agent for that issue. The selected agent is the agent specified in the setting Agentic Harnes execution commands| Use it to hand a Jira task to an agent-driven workflow. Requires Jira credentials and a saved `JIRA_PROJECT_KEY`. | Always, but effectively requires Jira setup |
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
| `Select/Set Jira Project` | Chooses and saves the Jira project key for the repo. If, inside that same dialog, you click Create Jira Project, then yes, it uses the Agentic Harness configured on settings to create and configure a new project in Jira.| Use it before any Jira issue actions if the repo has not been linked to a Jira project yet. | When no `JIRA_PROJECT_KEY` is saved for the repo |
| `Add Jira Item` | Creates a new Jira issue after you choose the issue type and enter the summary and description. | Use it to create a new task directly from the sidebar. | When a Jira project key is already saved |
| `Take Jira Item (Assign)` | Shows available unassigned Jira items, assigns the selected one to you, and moves it to `In Progress`. | Use it when you want to pick up an existing Jira item yourself. | When a Jira project key is already saved |
| `Jira Item Completed` | Lets you choose one of your active Jira items and moves it to `In Review`, or `Done` if review is unavailable. | Use it when your work on a Jira item is complete. | When a Jira project key is already saved |
| `Increment Major Version` | Runs the version bump script with `major`. | Use it for a breaking-release version bump. | Always |
| `Increment Minor Version` | Runs the version bump script with `minor`. | Use it for a backward-compatible feature release. | Always |
| `Increment Patch Version` | Runs the version bump script with `patch`. | Use it for a bug-fix or small maintenance release. | Always |
| `Autocommit Start` | Starts the autocommit background workflow. | Use it when you want periodic automated checkpoints. A GitHub remote must already exist. | When autocommit is not already running |
| `Autocommit Stop` | Stops the autocommit background workflow. | Use it when you no longer want automated checkpoints. | When autocommit is already running |
| `Revert Changes` | Runs the autocommit revert script. | Use it to roll back the current autocommit change set. | Only when autocommit is already running |
| `Environment Switch` | Prompts for `DEV`, `QA`, `UAT`, or `PROD`, makes sure the switch script exists, offers to download missing config files, and then runs the environment switch script. | Use it when you need the workspace config moved to a different environment profile. | Always |
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
- The middle block is for repo setup, Git flow, Jira flow, versioning, autocommit, and environment management.
- The lower block is for reusable assets: plugins, agents, skills, workflows, and linked folders.
- If an item looks gray or does not appear, Task Runner is usually waiting on a missing prerequisite such as Git initialization, a GitHub remote, Jira setup, or a config value in settings.
