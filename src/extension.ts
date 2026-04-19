import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec, spawn } from "child_process";
import { AntigravityViewProvider } from "./treeProvider";
import {
  isAutocommitRunning,
  hasGitHubRemote
} from "./git";
import {
  runInSecondaryTerminal,
  runInNewTerminal,
  buildAgenticHarnessPromptCommand,
  runClaudeInitAndUpdateInNewTerminal,
  runCodexInitAndUpdateInNewTerminal,
  CLAUDE_ACTION_COLOR
} from "./terminal";
import {
  renderAntigravitySettingsHtml,
  renderClaudeModelConfigHtml,
  renderAgenticSetupHtml,
  loadOpenRouterConfig,
  loadClaudeSettings,
  getRouterSettings,
  getToolRunCommand,
  getUseAgentForGithubRepositoryManagement,
  normalizeStringArray,
  readClaudeAnthropicBaseUrl,
  isLocalLiteLLMBaseUrl,
  LOCAL_LITELLM_READY_URL
} from "./settings";
import { runRepoScript, runWorkflow, runAgent, openFile, ensureScriptFile, downloadConfigFileIfMissing, downloadInfrastructureFileIfMissing, downloadMarkdownToTempFile } from "./scripts";
import {
  getRootPath,
  getRepoRoot,
  getWorkspaceProjectPath,
  listInfrastructureYamlFiles,
  findNestedGitFolders,
  parseEnvFile,
  quoteShellArg,
  upsertEnvFileValue,
  waitForUrlReady
} from "./utils";
import { initLogger, log, logAlways, showOutputChannel } from "./logger";
import {
  createJiraIssue,
  getJiraProjects,
  createJiraProject,
  JiraCredentials,
  JiraProjectSummary,
  JiraIssueSummary,
  JiraIssueType,
  getJiraIssueTypes,
  searchOpenUnassignedJiraIssues,
  searchOpenUnassignedTodoJiraIssuesForProject,
  assignJiraIssueToCurrentUser,
  searchOpenAssignedJiraIssuesForCurrentUser,
  transitionJiraIssueToStatus,
  updateJiraIssueSummaryAndLabels
} from "./jira";

type GitInputBox = {
  value: string;
};

type GitRepository = {
  rootUri: vscode.Uri;
  inputBox: GitInputBox;
  commit(message: string, options?: { all?: boolean; noVerify?: boolean }): Thenable<void>;
};

type GitApi = {
  repositories: GitRepository[];
  getRepository?(uri: vscode.Uri): GitRepository | null | undefined;
};

type GitExtensionExports = {
  getAPI(version: 1): GitApi;
};

type AssignableAgentOption = {
  label: "Claude Code" | "Codex" | "OpenCode" | "Qwen Code";
};

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Antigravity Task Runner");
  context.subscriptions.push(outputChannel);
  initLogger(outputChannel);

  const provider = new AntigravityViewProvider();
  const extensionRoot = context.extensionPath;
  log(`[activate] Extension root: ${extensionRoot}`);
  const assignableAgentOptions: AssignableAgentOption[] = [
    { label: "Claude Code" },
    { label: "Codex" },
    { label: "OpenCode" },
    { label: "Qwen Code" }
  ];

  const launchClaudeInit = async (
    repoRoot: string,
    guidelinesFileName = "Project Level CLAUDE.md Guidelines.txt"
  ): Promise<void> => {
    log(`[launchClaudeInit] repoRoot: ${repoRoot}`);
    const guidelineCandidates = [
      path.join(extensionRoot, guidelinesFileName)
    ];
    const guidelinesFile = guidelineCandidates.find((candidate) => fs.existsSync(candidate));
    log(`[launchClaudeInit] guidelinesFile: ${guidelinesFile ?? "not found, using /init"}`);
    const prompt = guidelinesFile
      ? fs.readFileSync(guidelinesFile, "utf8").trim()
      : "/init";
    log(`[launchClaudeInit] launching Claude init terminal`);
    await runClaudeInitAndUpdateInNewTerminal(repoRoot, prompt);
    log(`[launchClaudeInit] done`);
  };

  const launchAgentInit = async (repoRoot: string): Promise<void> => {
    log(`[launchAgentInit] repoRoot: ${repoRoot}`);
    const guidelinesFile = path.join(
      extensionRoot,
      "Project Level AGENT.md Guidelines.txt"
    );
    log(`[launchAgentInit] guidelinesFile: ${guidelinesFile} exists=${fs.existsSync(guidelinesFile)}`);
    const prompt = fs.existsSync(guidelinesFile)
      ? fs.readFileSync(guidelinesFile, "utf8").trim()
      : "/init";
    log(`[launchAgentInit] launching Codex init terminal`);
    await runCodexInitAndUpdateInNewTerminal(repoRoot, prompt);
    log(`[launchAgentInit] done`);
  };

  const refreshAutocommitUiWhenStateChanges = (
    repoRoot: string,
    expectedRunningState: boolean,
    attemptsRemaining = 20
  ): void => {
    provider.refresh();
    if (isAutocommitRunning(repoRoot) === expectedRunningState || attemptsRemaining <= 0) {
      return;
    }

    setTimeout(() => {
      refreshAutocommitUiWhenStateChanges(
        repoRoot,
        expectedRunningState,
        attemptsRemaining - 1
      );
    }, 500);
  };

  type BranchTypeOption = {
    label: string;
    description: string;
    prefix: string;
    requiresJiraKey?: boolean;
  };

  const branchTypes: BranchTypeOption[] = [
    {
      label: "Feature",
      description: "Create feature/<short-name>",
      prefix: "feature"
    },
    {
      label: "Bug Fix",
      description: "Create fix/<short-name>",
      prefix: "fix"
    },
    {
      label: "Jira Task",
      description: "Create feature/JIRA-123-short-name",
      prefix: "feature",
      requiresJiraKey: true
    },
    {
      label: "Hot Fix",
      description: "Create hotfix/<short-name>",
      prefix: "hotfix"
    }
  ];

  const getNonce = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let nonce = "";
    for (let i = 0; i < 32; i += 1) {
      nonce += chars[Math.floor(Math.random() * chars.length)];
    }
    return nonce;
  };

  const normalizeBranchSegment = (value: string): string =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");

  const buildStandardBranchName = (prefix: string, rawValue: string): string | undefined => {
    const withoutPrefix = rawValue.trim().replace(/^(feature|fix|hotfix)\//i, "");
    const segment = normalizeBranchSegment(withoutPrefix);
    return segment ? `${prefix}/${segment}` : undefined;
  };

  const buildJiraTaskBranchName = (rawValue: string): string | undefined => {
    const withoutPrefix = rawValue.trim().replace(/^feature\//i, "");
    const match = withoutPrefix.match(/^([A-Za-z][A-Za-z0-9]+-\d+)[-\s/]+(.+)$/);
    if (!match) return undefined;
    const issueKey = match[1].toUpperCase();
    const description = normalizeBranchSegment(match[2]);
    if (!description) return undefined;
    return `feature/${issueKey}-${description}`;
  };

  const resolveClaudeWorkflowFile = (workflowName: string): string | undefined => {
    const config = vscode.workspace.getConfiguration("antigravity");
    const configuredFolderRaw =
      config.get<string>("workflowsFolder") || path.join(os.homedir(), ".gemini");
    const configuredFolder = configuredFolderRaw.startsWith("~")
      ? path.join(os.homedir(), configuredFolderRaw.slice(1))
      : configuredFolderRaw;
    const configuredCandidates = [
      path.join(configuredFolder, "workflows", workflowName, "WORKFLOW.md"),
      path.join(configuredFolder, workflowName, "WORKFLOW.md")
    ];
    const configuredPath = configuredCandidates.find((candidate) => fs.existsSync(candidate));
    if (configuredPath) return configuredPath;

    const bundledPath = path.join(
      extensionRoot,
      "Knowhow",
      "Antigravity workflows",
      workflowName,
      "WORKFLOW.md"
    );
    if (fs.existsSync(bundledPath)) return bundledPath;

    return undefined;
  };

  const renderCreateFeatureBranchHtml = (webview: vscode.Webview): string => {
    const nonce = getNonce();
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
    const branchTypeData = branchTypes.map((option) => ({
      label: option.label,
      description: option.description,
      requiresJiraKey: option.requiresJiraKey ?? false
    }));

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Create Feature Branch</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: var(--vscode-font-family);
      }
      body {
        margin: 0;
        padding: 20px;
        color: var(--vscode-foreground);
        background: var(--vscode-editor-background);
      }
      form {
        display: grid;
        gap: 16px;
      }
      label {
        display: grid;
        gap: 6px;
        font-size: 13px;
      }
      select,
      input,
      button {
        font: inherit;
      }
      select,
      input {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        color: var(--vscode-input-foreground);
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border, transparent);
        border-radius: 6px;
      }
      .hint {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }
      .current-branch-title {
        font-size: 22px;
        font-weight: 600;
        line-height: 1.3;
      }
      .current-branch-value {
        color: #7cc7ff;
      }
      .error {
        min-height: 18px;
        font-size: 12px;
        color: var(--vscode-errorForeground);
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 8px;
      }
      button {
        border: 0;
        border-radius: 6px;
        padding: 8px 14px;
        cursor: pointer;
      }
      button[type="submit"] {
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-background);
      }
      button[type="button"] {
        color: var(--vscode-button-secondaryForeground);
        background: var(--vscode-button-secondaryBackground);
      }
    </style>
  </head>
  <body>
    <form id="feature-branch-form">
      <label>
        Branch type
        <select id="branch-type"></select>
        <span class="hint" id="branch-type-hint"></span>
      </label>
      <label>
        Name
        <input id="branch-name" type="text" autocomplete="off" />
        <span class="hint" id="branch-name-hint"></span>
      </label>
      <div class="error" id="error-message"></div>
      <div class="actions">
        <button type="button" id="cancel-button">Cancel</button>
        <button type="submit">Create</button>
      </div>
    </form>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const branchTypes = ${JSON.stringify(branchTypeData)};
      const branchTypeSelect = document.getElementById("branch-type");
      const branchTypeHint = document.getElementById("branch-type-hint");
      const branchNameInput = document.getElementById("branch-name");
      const branchNameHint = document.getElementById("branch-name-hint");
      const errorMessage = document.getElementById("error-message");
      const form = document.getElementById("feature-branch-form");
      const cancelButton = document.getElementById("cancel-button");

      const updateHints = () => {
        const selected = branchTypes.find((option) => option.label === branchTypeSelect.value) || branchTypes[0];
        branchTypeHint.textContent = selected.description;
        branchNameInput.placeholder = selected.requiresJiraKey ? "JIRA-123-short-name" : "short-descriptive-name";
        branchNameHint.textContent = selected.requiresJiraKey
          ? "Use the Jira key followed by a short kebab-case description."
          : "Use a short kebab-case description.";
        errorMessage.textContent = "";
      };

      for (const option of branchTypes) {
        const element = document.createElement("option");
        element.value = option.label;
        element.textContent = option.label;
        branchTypeSelect.appendChild(element);
      }

      branchTypeSelect.addEventListener("change", updateHints);
      cancelButton.addEventListener("click", () => {
        vscode.postMessage({ type: "cancelCreateFeatureBranch" });
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const branchType = branchTypeSelect.value;
        const branchNameInputValue = branchNameInput.value.trim();
        if (!branchNameInputValue) {
          errorMessage.textContent = "Enter a branch name.";
          branchNameInput.focus();
          return;
        }
        vscode.postMessage({
          type: "submitCreateFeatureBranch",
          payload: {
            branchType,
            branchNameInput: branchNameInputValue
          }
        });
      });

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (!message) return;
        if (message.type === "createFeatureBranchError") {
          errorMessage.textContent = message.payload?.message || "Invalid branch name.";
        }
      });

      branchTypeSelect.value = branchTypes[0].label;
      updateHints();
      branchNameInput.focus();
    </script>
  </body>
</html>`;
  };

  const showCreateFeatureBranchDialog = async (): Promise<
    { branchType: BranchTypeOption; branchName: string } | undefined
  > =>
    new Promise((resolve) => {
      const panel = vscode.window.createWebviewPanel(
        "createFeatureBranch",
        "Create Feature Branch",
        vscode.ViewColumn.Active,
        { enableScripts: true }
      );
      panel.webview.html = renderCreateFeatureBranchHtml(panel.webview);

      let settled = false;
      const resolveOnce = (value: { branchType: BranchTypeOption; branchName: string } | undefined) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      panel.onDidDispose(() => resolveOnce(undefined), undefined, context.subscriptions);
      panel.webview.onDidReceiveMessage(
        async (message) => {
          if (!message) return;
          if (message.type === "cancelCreateFeatureBranch") {
            panel.dispose();
            return;
          }
          if (message.type !== "submitCreateFeatureBranch") return;

          const payload = message.payload || {};
          const selectedBranchType = branchTypes.find((option) => option.label === payload.branchType);
          const branchNameInput =
            typeof payload.branchNameInput === "string" ? payload.branchNameInput : "";

          if (!selectedBranchType) {
            void panel.webview.postMessage({
              type: "createFeatureBranchError",
              payload: { message: "Select a branch type." }
            });
            return;
          }

          const branchName = selectedBranchType.requiresJiraKey
            ? buildJiraTaskBranchName(branchNameInput)
            : buildStandardBranchName(selectedBranchType.prefix, branchNameInput);

          if (!branchName) {
            void panel.webview.postMessage({
              type: "createFeatureBranchError",
              payload: {
                message: selectedBranchType.requiresJiraKey
                  ? "Use the format JIRA-123-short-name."
                  : "Enter a short descriptive branch name."
              }
            });
            return;
          }

          resolveOnce({ branchType: selectedBranchType, branchName });
          panel.dispose();
        },
        undefined,
        context.subscriptions
      );
    });

  const getRepoEnvPath = (repoRoot: string): string => path.join(repoRoot, ".env");

  const getJiraCredentialsFromEnv = (repoRoot: string): JiraCredentials => {
    const envPath = getRepoEnvPath(repoRoot);
    const env = parseEnvFile(envPath);
    const config = vscode.workspace.getConfiguration("antigravity");
    const baseUrl =
      (config.get<string>("jiraBaseUrl") || "").trim() ||
      (env.jira_base_url || "").trim();
    const email =
      (config.get<string>("jiraEmail") || "").trim() ||
      (env.jira_email || "").trim();
    const apiToken =
      (config.get<string>("jiraApiToken") || "").trim() ||
      (env.jira_api_token || "").trim();

    const missing = [
      !baseUrl ? "JIRA_BASE_URL" : undefined,
      !email ? "JIRA_EMAIL" : undefined,
      !apiToken ? "JIRA_API_TOKEN" : undefined
    ].filter((value): value is string => Boolean(value));

    if (missing.length > 0) {
      throw new Error(`Missing Jira settings in .env: ${missing.join(", ")}.`);
    }

    return { baseUrl, email, apiToken };
  };

  const getSavedJiraProjectKey = (repoRoot: string): string => {
    const env = parseEnvFile(getRepoEnvPath(repoRoot));
    return (env.jira_project_key || "").trim().toUpperCase();
  };

  const getSopManualLink = (repoRoot?: string): string => {
    const config = vscode.workspace.getConfiguration("antigravity");
    const repoOverride = repoRoot
      ? (parseEnvFile(getRepoEnvPath(repoRoot)).sop_manual_link || "").trim()
      : "";
    return repoOverride || (config.get<string>("sopManualLink") || "").trim();
  };

  const validateJiraProjectKey = (value: string): string | undefined => {
    const normalized = value.trim().toUpperCase();
    if (!normalized) return "Enter a Jira project key.";
    if (!/^[A-Z][A-Z0-9]+$/.test(normalized)) {
      return "Use letters and numbers only, starting with a letter.";
    }
    return undefined;
  };

  const buildJiraProjectKeyFromName = (name: string): string | undefined => {
    const normalized = name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "");

    if (normalized.length < 2) return undefined;
    const candidate = /^[A-Z]/.test(normalized) ? normalized : `P${normalized}`;
    return candidate.slice(0, 10);
  };

  const renderJiraProjectSetupHtml = (
    webview: vscode.Webview,
    projects: JiraProjectSummary[]
  ): string => {
    const nonce = getNonce();
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
    const projectOptions = projects.map((project) => ({
      key: project.key,
      label: `${project.name} (${project.key})`
    }));

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Set Jira Project</title>
    <style>
      :root { color-scheme: light dark; font-family: var(--vscode-font-family); }
      body { margin: 0; padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
      form { display: grid; gap: 20px; }
      .section {
        display: grid;
        gap: 12px;
        padding: 14px;
        border: 1px solid var(--vscode-input-border, transparent);
        border-radius: 8px;
        background: color-mix(in srgb, var(--vscode-editor-background) 92%, var(--vscode-editorWidget-background) 8%);
      }
      .section-title {
        font-size: 14px;
        font-weight: 600;
      }
      label { display: grid; gap: 6px; font-size: 13px; }
      input, textarea, select, button { font: inherit; }
      input, textarea, select {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        color: var(--vscode-input-foreground);
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border, transparent);
        border-radius: 6px;
      }
      textarea { min-height: 120px; resize: vertical; }
      .hint { font-size: 12px; color: var(--vscode-descriptionForeground); }
      .error { min-height: 18px; font-size: 12px; color: var(--vscode-errorForeground); }
      .actions { display: flex; justify-content: flex-end; gap: 8px; }
      button { border: 0; border-radius: 6px; padding: 8px 14px; cursor: pointer; }
      button.primary { color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
      button[type="button"] { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    </style>
  </head>
  <body>
    <form id="jira-project-setup-form">
      <div class="section">
        <div class="section-title">Select Existing Project</div>
        <label>
          Jira Project
          <select id="project-select"></select>
          <span class="hint" id="project-select-hint"></span>
        </label>
        <div class="actions">
          <button type="button" class="primary" id="use-project-button">Use Project</button>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Create New Project</div>
        <label>
          Project Name
          <input id="project-name" type="text" autocomplete="off" />
          <span class="hint">The Jira project key will be generated automatically from this name.</span>
        </label>
        <label>
          Description
          <textarea id="project-description"></textarea>
        </label>
        <div class="actions">
          <button type="button" class="primary" id="create-project-button">Create Project</button>
        </div>
      </div>
      <div class="error" id="error-message"></div>
      <div class="actions">
        <button type="button" id="cancel-button">Cancel</button>
      </div>
      </form>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const projects = ${JSON.stringify(projectOptions)};
      const form = document.getElementById("jira-project-setup-form");
      const projectSelect = document.getElementById("project-select");
      const projectSelectHint = document.getElementById("project-select-hint");
      const projectNameInput = document.getElementById("project-name");
      const projectDescriptionInput = document.getElementById("project-description");
      const errorMessage = document.getElementById("error-message");
      const cancelButton = document.getElementById("cancel-button");
      const useProjectButton = document.getElementById("use-project-button");
      const createProjectButton = document.getElementById("create-project-button");

      const placeholderOption = document.createElement("option");
      placeholderOption.value = "";
      placeholderOption.textContent = projects.length > 0 ? "Select a Jira project" : "No Jira projects found";
      projectSelect.appendChild(placeholderOption);

      for (const project of projects) {
        const option = document.createElement("option");
        option.value = project.key;
        option.textContent = project.label;
        projectSelect.appendChild(option);
      }

      projectSelectHint.textContent = projects.length > 0
        ? "Choose an existing Jira project and save it to this repository .env file."
        : "No Jira projects were loaded. You can still create a new one below.";

      cancelButton.addEventListener("click", () => {
        vscode.postMessage({ type: "cancelJiraProjectSetup" });
      });

      form.addEventListener("input", () => {
        errorMessage.textContent = "";
      });

      useProjectButton.addEventListener("click", () => {
        if (!projectSelect.value) {
          errorMessage.textContent = "Select a Jira project.";
          projectSelect.focus();
          return;
        }
        vscode.postMessage({
          type: "submitJiraProjectSetup",
          payload: {
            mode: "select",
            projectKey: projectSelect.value
          }
        });
      });

      createProjectButton.addEventListener("click", () => {
        const payload = {
          mode: "create",
          projectName: projectNameInput.value.trim(),
          description: projectDescriptionInput.value.trim()
        };
        if (!payload.projectName) {
          errorMessage.textContent = "Enter a Jira project name.";
          projectNameInput.focus();
          return;
        }
        vscode.postMessage({ type: "submitJiraProjectSetup", payload });
      });

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (message?.type === "jiraProjectSetupError") {
          errorMessage.textContent = message.payload?.message || "Unable to save the Jira project.";
        }
      });

      if (projects.length > 0) {
        projectSelect.focus();
      } else {
        projectNameInput.focus();
      }
    </script>
  </body>
</html>`;
  };

  const showJiraProjectSetupDialog = async (
    projects: JiraProjectSummary[]
  ): Promise<
    | { mode: "select"; projectKey: string }
    | { mode: "create"; name: string; key: string; description: string }
    | undefined
  > =>
    new Promise((resolve) => {
      const panel = vscode.window.createWebviewPanel(
        "jiraProjectSetup",
        "Set Jira Project",
        vscode.ViewColumn.Active,
        { enableScripts: true }
      );
      panel.webview.html = renderJiraProjectSetupHtml(panel.webview, projects);

      let settled = false;
      const resolveOnce = (
        value:
          | { mode: "select"; projectKey: string }
          | { mode: "create"; name: string; key: string; description: string }
          | undefined
      ) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      panel.onDidDispose(() => resolveOnce(undefined), undefined, context.subscriptions);
      panel.webview.onDidReceiveMessage(
        async (message) => {
          if (!message) return;
          if (message.type === "cancelJiraProjectSetup") {
            panel.dispose();
            return;
          }
          if (message.type !== "submitJiraProjectSetup") return;

          const payload = message.payload || {};
          if (payload.mode === "select") {
            const projectKey =
              typeof payload.projectKey === "string" ? payload.projectKey.trim().toUpperCase() : "";
            const keyError = validateJiraProjectKey(projectKey);

            if (keyError) {
              void panel.webview.postMessage({
                type: "jiraProjectSetupError",
                payload: { message: keyError }
              });
              return;
            }

            resolveOnce({ mode: "select", projectKey });
            panel.dispose();
            return;
          }

          const name = typeof payload.projectName === "string" ? payload.projectName.trim() : "";
          const key = buildJiraProjectKeyFromName(name);
          const description =
            typeof payload.description === "string" ? payload.description.trim() : "";

          if (!name) {
            void panel.webview.postMessage({
              type: "jiraProjectSetupError",
              payload: { message: "Enter a Jira project name." }
            });
            return;
          }
          if (!key) {
            void panel.webview.postMessage({
              type: "jiraProjectSetupError",
              payload: { message: "Enter a project name that can produce a Jira project key." }
            });
            return;
          }

          resolveOnce({ mode: "create", name, key, description });
          panel.dispose();
        },
        undefined,
        context.subscriptions
      );
    });

  const ensureSavedJiraProjectKey = async (
    repoRoot: string,
    credentials: JiraCredentials
  ): Promise<string | undefined> => {
    let projectKey = getSavedJiraProjectKey(repoRoot);
    if (projectKey) {
      return projectKey;
    }

    let projects: JiraProjectSummary[] = [];
    try {
      projects = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Loading Jira projects",
          cancellable: false
        },
        async () => getJiraProjects(credentials)
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Failed to load Jira projects: ${message}`);
      return undefined;
    }

    const setupSelection = await showJiraProjectSetupDialog(projects);
    if (!setupSelection) {
      return undefined;
    }

    if (setupSelection.mode === "select") {
      projectKey = setupSelection.projectKey;
    } else {
      try {
        const createdProject = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Creating Jira project",
            cancellable: false
          },
          async () =>
            createJiraProject(credentials, {
              key: setupSelection.key,
              name: setupSelection.name,
              description: setupSelection.description
            })
        );

        projectKey = createdProject.key.toUpperCase();
        void vscode.window.showInformationMessage(
          `Created Jira project ${projectKey} and saved it to this repository .env file.`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to create Jira project: ${message}`);
        return undefined;
      }
    }

    upsertEnvFileValue(getRepoEnvPath(repoRoot), "JIRA_PROJECT_KEY", projectKey);
    provider.refresh();
    return projectKey;
  };

  const renderCreateJiraItemHtml = (
    webview: vscode.Webview,
    projectKey: string,
    issueTypes: JiraIssueType[]
  ): string => {
    const nonce = getNonce();
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Add Jira Item</title>
    <style>
      :root { color-scheme: light dark; font-family: var(--vscode-font-family); }
      body { margin: 0; padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
      form { display: grid; gap: 16px; }
      label { display: grid; gap: 6px; font-size: 13px; }
      input, textarea, select, button { font: inherit; }
      input, textarea, select {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        color: var(--vscode-input-foreground);
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border, transparent);
        border-radius: 6px;
      }
      textarea { min-height: 140px; resize: vertical; }
      .current-branch-title { font-size: 18px; font-weight: 600; }
      .current-branch-value { color: #7cc7ff; }
      .hint { font-size: 12px; color: var(--vscode-descriptionForeground); }
      .error { min-height: 18px; font-size: 12px; color: var(--vscode-errorForeground); }
      .actions { display: flex; justify-content: flex-end; gap: 8px; }
      button { border: 0; border-radius: 6px; padding: 8px 14px; cursor: pointer; }
      button[type="submit"] { color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
      button[type="button"] { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    </style>
  </head>
  <body>
    <form id="jira-item-form">
      <div class="current-branch-title">Jira Project: <span class="current-branch-value">${projectKey}</span></div>
      <label>
        Item Type
        <select id="issue-type"></select>
      </label>
      <label>
        Name
        <input id="issue-name" type="text" autocomplete="off" />
      </label>
      <label>
        Description
        <textarea id="issue-description"></textarea>
        <span class="hint">The description will be sent to Jira as rich text.</span>
      </label>
      <div class="error" id="error-message"></div>
      <div class="actions">
        <button type="button" id="cancel-button">Cancel</button>
        <button type="submit">Create</button>
      </div>
    </form>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const issueTypes = ${JSON.stringify(issueTypes.map((issueType) => issueType.name))};
      const issueTypeSelect = document.getElementById("issue-type");
      const issueNameInput = document.getElementById("issue-name");
      const issueDescriptionInput = document.getElementById("issue-description");
      const errorMessage = document.getElementById("error-message");
      const form = document.getElementById("jira-item-form");
      const cancelButton = document.getElementById("cancel-button");

      for (const issueType of issueTypes) {
        const option = document.createElement("option");
        option.value = issueType;
        option.textContent = issueType;
        issueTypeSelect.appendChild(option);
      }

      cancelButton.addEventListener("click", () => {
        vscode.postMessage({ type: "cancelCreateJiraItem" });
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const payload = {
          issueType: issueTypeSelect.value,
          summary: issueNameInput.value.trim(),
          description: issueDescriptionInput.value.trim()
        };
        if (!payload.summary) {
          errorMessage.textContent = "Enter a Jira item name.";
          issueNameInput.focus();
          return;
        }
        vscode.postMessage({ type: "submitCreateJiraItem", payload });
      });

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (message?.type === "createJiraItemError") {
          errorMessage.textContent = message.payload?.message || "Unable to create the Jira item.";
        }
      });

      issueTypeSelect.value = issueTypes[0];
      issueNameInput.focus();
    </script>
  </body>
</html>`;
  };

  const showCreateJiraItemDialog = async (
    projectKey: string,
    issueTypes: JiraIssueType[]
  ): Promise<{ issueType: string; summary: string; description: string } | undefined> =>
    new Promise((resolve) => {
      const panel = vscode.window.createWebviewPanel(
        "createJiraItem",
        "Add Jira Item",
        vscode.ViewColumn.Active,
        { enableScripts: true }
      );
      panel.webview.html = renderCreateJiraItemHtml(panel.webview, projectKey, issueTypes);

      let settled = false;
      const resolveOnce = (
        value: { issueType: string; summary: string; description: string } | undefined
      ) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      panel.onDidDispose(() => resolveOnce(undefined), undefined, context.subscriptions);
      panel.webview.onDidReceiveMessage(
        async (message) => {
          if (!message) return;
          if (message.type === "cancelCreateJiraItem") {
            panel.dispose();
            return;
          }
          if (message.type !== "submitCreateJiraItem") return;

          const payload = message.payload || {};
          const issueType = typeof payload.issueType === "string" ? payload.issueType.trim() : "";
          const summary = typeof payload.summary === "string" ? payload.summary.trim() : "";
          const description =
            typeof payload.description === "string" ? payload.description.trim() : "";

          if (!issueType) {
            void panel.webview.postMessage({
              type: "createJiraItemError",
              payload: { message: "Select a Jira item type." }
            });
            return;
          }
          if (!summary) {
            void panel.webview.postMessage({
              type: "createJiraItemError",
              payload: { message: "Enter a Jira item name." }
            });
            return;
          }

          resolveOnce({ issueType, summary, description });
          panel.dispose();
        },
        undefined,
        context.subscriptions
      );
    });

  const renderAssignJiraItemToAgentHtml = (
    webview: vscode.Webview,
    projectKey: string,
    agents: AssignableAgentOption[],
    issues: JiraIssueSummary[]
  ): string => {
    const nonce = getNonce();
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
    const agentOptions = agents.map((agent) => agent.label);
    const issueOptions = issues.map((issue) => ({
      key: issue.key,
      summary: issue.summary,
      detail: [issue.issueTypeName, issue.statusName].filter(Boolean).join(" • ")
    }));

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Assign Jira Item to Agent</title>
    <style>
      :root { color-scheme: light dark; font-family: var(--vscode-font-family); }
      body { margin: 0; padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
      form { display: grid; gap: 16px; }
      label { display: grid; gap: 6px; font-size: 13px; }
      select, button { font: inherit; }
      select {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        color: var(--vscode-input-foreground);
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border, transparent);
        border-radius: 6px;
      }
      .current-branch-title { font-size: 18px; font-weight: 600; }
      .current-branch-value { color: #7cc7ff; }
      .hint { font-size: 12px; color: var(--vscode-descriptionForeground); }
      .error { min-height: 18px; font-size: 12px; color: var(--vscode-errorForeground); }
      .actions { display: flex; justify-content: flex-end; gap: 8px; }
      button { border: 0; border-radius: 6px; padding: 8px 14px; cursor: pointer; }
      button[type="submit"] { color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
      button[type="button"] { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    </style>
  </head>
  <body>
    <form id="assign-jira-item-to-agent-form">
      <div class="current-branch-title">Jira Project: <span class="current-branch-value">${projectKey}</span></div>
      <label>
        Agent
        <select id="agent-select"></select>
        <span class="hint">Choose which coding agent should receive the work prompt.</span>
      </label>
      <label>
        Jira Item
        <select id="issue-select"></select>
        <span class="hint" id="issue-hint"></span>
      </label>
      <div class="error" id="error-message"></div>
      <div class="actions">
        <button type="button" id="cancel-button">Cancel</button>
        <button type="submit">Assign</button>
      </div>
    </form>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const agents = ${JSON.stringify(agentOptions)};
      const issues = ${JSON.stringify(issueOptions)};
      const form = document.getElementById("assign-jira-item-to-agent-form");
      const agentSelect = document.getElementById("agent-select");
      const issueSelect = document.getElementById("issue-select");
      const issueHint = document.getElementById("issue-hint");
      const cancelButton = document.getElementById("cancel-button");
      const errorMessage = document.getElementById("error-message");

      const updateIssueHint = () => {
        const selected = issues.find((issue) => issue.key === issueSelect.value);
        issueHint.textContent = selected
          ? [selected.summary, selected.detail].filter(Boolean).join(" • ")
          : "Choose an unassigned Jira item that is currently in To Do.";
      };

      for (const agent of agents) {
        const option = document.createElement("option");
        option.value = agent;
        option.textContent = agent;
        agentSelect.appendChild(option);
      }

      for (const issue of issues) {
        const option = document.createElement("option");
        option.value = issue.key;
        option.textContent = issue.key;
        issueSelect.appendChild(option);
      }

      cancelButton.addEventListener("click", () => {
        vscode.postMessage({ type: "cancelAssignJiraItemToAgent" });
      });

      issueSelect.addEventListener("change", updateIssueHint);

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!agentSelect.value) {
          errorMessage.textContent = "Select an agent.";
          agentSelect.focus();
          return;
        }
        if (!issueSelect.value) {
          errorMessage.textContent = "Select a Jira item.";
          issueSelect.focus();
          return;
        }
        vscode.postMessage({
          type: "submitAssignJiraItemToAgent",
          payload: {
            agentLabel: agentSelect.value,
            issueKey: issueSelect.value
          }
        });
      });

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (message?.type === "assignJiraItemToAgentError") {
          errorMessage.textContent = message.payload?.message || "Unable to assign the Jira item.";
        }
      });

      agentSelect.value = agents[0];
      issueSelect.value = issues[0]?.key || "";
      updateIssueHint();
      agentSelect.focus();
    </script>
  </body>
</html>`;
  };

  const showAssignJiraItemToAgentDialog = async (
    projectKey: string,
    agents: AssignableAgentOption[],
    issues: JiraIssueSummary[]
  ): Promise<{ agentLabel: AssignableAgentOption["label"]; issueKey: string } | undefined> =>
    new Promise((resolve) => {
      const panel = vscode.window.createWebviewPanel(
        "assignJiraItemToAgent",
        "Assign Jira Item to Agent",
        vscode.ViewColumn.Active,
        { enableScripts: true }
      );
      panel.webview.html = renderAssignJiraItemToAgentHtml(panel.webview, projectKey, agents, issues);

      let settled = false;
      const resolveOnce = (
        value: { agentLabel: AssignableAgentOption["label"]; issueKey: string } | undefined
      ) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      panel.onDidDispose(() => resolveOnce(undefined), undefined, context.subscriptions);
      panel.webview.onDidReceiveMessage(
        async (message) => {
          if (!message) return;
          if (message.type === "cancelAssignJiraItemToAgent") {
            panel.dispose();
            return;
          }
          if (message.type !== "submitAssignJiraItemToAgent") return;

          const payload = message.payload || {};
          const agentLabel = typeof payload.agentLabel === "string" ? payload.agentLabel.trim() : "";
          const issueKey = typeof payload.issueKey === "string" ? payload.issueKey.trim() : "";
          const selectedAgent = agents.find((agent) => agent.label === agentLabel);

          if (!selectedAgent) {
            void panel.webview.postMessage({
              type: "assignJiraItemToAgentError",
              payload: { message: "Select an agent." }
            });
            return;
          }

          if (!issueKey || !issues.some((issue) => issue.key === issueKey)) {
            void panel.webview.postMessage({
              type: "assignJiraItemToAgentError",
              payload: { message: "Select a Jira item." }
            });
            return;
          }

          resolveOnce({ agentLabel: selectedAgent.label, issueKey });
          panel.dispose();
        },
        undefined,
        context.subscriptions
      );
    });

  const buildIssueSummaryForAgent = (
    originalSummary: string,
    agentLabel: AssignableAgentOption["label"]
  ): string => {
    const baseSummary = originalSummary.replace(/\s+- By Agent .+$/i, "").trim();
    return `${baseSummary} - By Agent ${agentLabel}`;
  };

  const buildAgentJiraLabel = (agentLabel: AssignableAgentOption["label"]): string =>
    `developed-by-agent-${agentLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;

  const buildJiraAgentPrompt = (
    issueKey: string,
    summary: string
  ): string =>
    `work on Jira Item ${issueKey} - ${summary}. Do not ask follow-up questions unless you are truly blocked by missing critical information or permissions. Make reasonable assumptions, proceed, and add each assumption you make to the Jira ticket using comment lines that start with assuming . If you finish the work successfully, commit your changes, add a Jira comment starting with AGENT SOLUTION: describing briefly how you solved it, and transition Jira item ${issueKey} to In Review. Keep the branch as-is (I'll handle it later); do not merge.`;

  const buildAgentRunCommand = (
    repoRoot: string,
    agentLabel: AssignableAgentOption["label"],
    prompt: string
  ): string => {
    if (agentLabel === "Claude Code") {
      return `claude --permission-mode auto ${quoteShellArg(prompt)}`;
    }
    if (agentLabel === "Codex") {
      const trustOverride = `projects.${JSON.stringify(repoRoot)}.trust_level="trusted"`;
      return `codex exec --full-auto -C ${quoteShellArg(repoRoot)} -c "trust_level=\\"trusted\\"" -c ${quoteShellArg(trustOverride)} ${quoteShellArg(prompt)}`;
    }
    if (agentLabel === "OpenCode") {
      return `opencode run ${quoteShellArg(prompt)}`;
    }
    return `opencode run -m ollama/qwen3-coder:30b ${quoteShellArg(prompt)}`;
  };

  const launchAgentForJiraItem = (
    repoRoot: string,
    agentLabel: AssignableAgentOption["label"],
    issueKey: string,
    issueSummary: string
  ): void => {
    const prompt = buildJiraAgentPrompt(issueKey, issueSummary);
    const command = buildAgentRunCommand(repoRoot, agentLabel, prompt);
    runInNewTerminal(
      `${agentLabel}: ${issueKey}`,
      [`cd ${quoteShellArg(repoRoot)}`, command],
      {
        iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
        color: CLAUDE_ACTION_COLOR
      }
    );
  };

  const execInRepo = async (command: string, cwd: string): Promise<string> =>
    new Promise((resolve, reject) => {
      exec(command, { cwd }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || stdout.trim() || error.message));
          return;
        }
        resolve(stdout);
      });
    });

  const parseGitNameStatus = (output: string): Array<{
    status: string;
    path: string;
    previousPath?: string;
  }> =>
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const parts = line.split("\t");
        const [status = "", firstPath = "", secondPath] = parts;
        if (status.startsWith("R")) {
          return {
            status,
            path: secondPath ?? firstPath,
            previousPath: firstPath
          };
        }
        return { status, path: firstPath };
      })
      .filter((entry) => entry.path.length > 0);

  const describeCommitPath = (filePath: string): string => {
    const normalized = filePath.replace(/\\/g, "/");
    const segments = normalized.split("/").filter(Boolean);
    if (segments.length === 0) return "project files";
    const fileName = segments[segments.length - 1];
    const parent = segments.length > 1 ? segments[segments.length - 2] : undefined;
    if (!parent || parent === "." || fileName === parent) return fileName;
    return `${parent}/${fileName}`;
  };

  const buildGeneratedCommitMessage = async (repoRoot: string): Promise<string> => {
    const statusOutput = await execInRepo(
      "git diff --cached --name-status --find-renames",
      repoRoot
    );
    const entries = parseGitNameStatus(statusOutput);
    if (entries.length === 0) return "";

    if (entries.length === 1) {
      const [entry] = entries;
      const subject = describeCommitPath(entry.path);
      if (entry.status.startsWith("A")) return `Add ${subject}`;
      if (entry.status.startsWith("D")) return `Remove ${subject}`;
      if (entry.status.startsWith("R") && entry.previousPath) {
        return `Rename ${describeCommitPath(entry.previousPath)} to ${describeCommitPath(entry.path)}`;
      }
      return `Update ${subject}`;
    }

    const firstSegmentCounts = new Map<string, number>();
    for (const entry of entries) {
      const [firstSegment] = entry.path.replace(/\\/g, "/").split("/");
      if (!firstSegment) continue;
      firstSegmentCounts.set(firstSegment, (firstSegmentCounts.get(firstSegment) ?? 0) + 1);
    }

    const dominantArea = [...firstSegmentCounts.entries()]
      .sort((left, right) => right[1] - left[1])[0]?.[0];
    const prefixSet = new Set(entries.map((entry) => entry.status.charAt(0)));
    if (dominantArea && firstSegmentCounts.size === 1) {
      if (prefixSet.size === 1 && prefixSet.has("A")) return `Add ${dominantArea} files`;
      if (prefixSet.size === 1 && prefixSet.has("D")) return `Remove ${dominantArea} files`;
      return `Update ${dominantArea} files`;
    }

    if (prefixSet.size === 1 && prefixSet.has("A")) return `Add ${entries.length} files`;
    if (prefixSet.size === 1 && prefixSet.has("D")) return `Remove ${entries.length} files`;
    return `Update ${entries.length} files`;
  };

  const getGitApi = async (): Promise<GitApi> => {
    const gitExtension = vscode.extensions.getExtension<GitExtensionExports>("vscode.git");
    if (!gitExtension) {
      throw new Error("VS Code Git integration is not available.");
    }

    const exports = gitExtension.isActive
      ? gitExtension.exports
      : await gitExtension.activate();
    if (!exports?.getAPI) {
      throw new Error("VS Code Git integration could not be activated.");
    }

    return exports.getAPI(1);
  };

  const getGitRepository = async (repoRoot: string): Promise<GitRepository | undefined> => {
    const api = await getGitApi();
    const repoUri = vscode.Uri.file(repoRoot);
    const fromApi = api.getRepository?.(repoUri);
    if (fromApi) return fromApi;

    const normalizedRepoRoot = path.normalize(repoUri.fsPath);
    const resolvedRepoRoot = (() => {
      try {
        return fs.realpathSync.native(repoUri.fsPath);
      } catch {
        return normalizedRepoRoot;
      }
    })();

    return api.repositories.find((repository) => {
      const candidatePath = path.normalize(repository.rootUri.fsPath);
      if (candidatePath === normalizedRepoRoot) return true;
      try {
        return fs.realpathSync.native(repository.rootUri.fsPath) === resolvedRepoRoot;
      } catch {
        return false;
      }
    });
  };

  const focusSourceControlChanges = async (): Promise<void> => {
    await vscode.commands.executeCommand("workbench.view.scm");
    try {
      await vscode.commands.executeCommand("workbench.scm.action.focusNextResourceGroup");
    } catch {
      // Focusing the SCM view is sufficient if the resource-group command is unavailable.
    }
  };

  const getAvailablePullRequestBranches = async (repoRoot: string): Promise<string[]> => {
    const stdout = await execInRepo(
      "git for-each-ref --format='%(refname:short)' refs/remotes/origin",
      repoRoot
    );
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => line !== "origin/HEAD")
      .filter((line) => line !== "origin/main")
      .map((line) => line.replace(/^origin\//, ""))
      .sort((a, b) => a.localeCompare(b));
  };

  const getCurrentBranchName = async (repoRoot: string): Promise<string> => {
    const stdout = await execInRepo("git branch --show-current", repoRoot);
    const branchName = stdout.trim();
    return branchName || "detached HEAD";
  };

  const getAvailableCheckoutBranches = async (repoRoot: string): Promise<string[]> => {
    const stdout = await execInRepo(
      "git for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin/main",
      repoRoot
    );
    const branches = new Set(
      stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .filter((line) => line !== "origin/HEAD")
        .map((line) => line.replace(/^origin\//, ""))
    );
    return Array.from(branches).sort((a, b) => {
      if (a === "main") return -1;
      if (b === "main") return 1;
      return a.localeCompare(b);
    });
  };

  const renderReviewPullRequestHtml = (
    webview: vscode.Webview,
    branches: string[]
  ): string => {
    const nonce = getNonce();
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Review Pull Request</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: var(--vscode-font-family);
      }
      body {
        margin: 0;
        padding: 20px;
        color: var(--vscode-foreground);
        background: var(--vscode-editor-background);
      }
      form {
        display: grid;
        gap: 16px;
      }
      label {
        display: grid;
        gap: 6px;
        font-size: 13px;
      }
      select,
      button {
        font: inherit;
      }
      select {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        color: var(--vscode-input-foreground);
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border, transparent);
        border-radius: 6px;
      }
      .hint {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }
      .error {
        min-height: 18px;
        font-size: 12px;
        color: var(--vscode-errorForeground);
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      button {
        border: 0;
        border-radius: 6px;
        padding: 8px 14px;
        cursor: pointer;
      }
      button[type="submit"] {
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-background);
      }
      button[type="button"] {
        color: var(--vscode-button-secondaryForeground);
        background: var(--vscode-button-secondaryBackground);
      }
    </style>
  </head>
  <body>
    <form id="review-pr-form">
      <label>
        Pull request branch
        <select id="branch-select"></select>
        <span class="hint">Choose the branch you want to check out for review.</span>
      </label>
      <div class="error" id="error-message"></div>
      <div class="actions">
        <button type="button" id="cancel-button">Cancel</button>
        <button type="submit">Select</button>
      </div>
    </form>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const branches = ${JSON.stringify(branches)};
      const branchSelect = document.getElementById("branch-select");
      const cancelButton = document.getElementById("cancel-button");
      const errorMessage = document.getElementById("error-message");
      const form = document.getElementById("review-pr-form");

      for (const branch of branches) {
        const option = document.createElement("option");
        option.value = branch;
        option.textContent = branch;
        branchSelect.appendChild(option);
      }

      cancelButton.addEventListener("click", () => {
        vscode.postMessage({ type: "cancelReviewPullRequest" });
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!branchSelect.value) {
          errorMessage.textContent = "Select a pull request branch.";
          return;
        }
        vscode.postMessage({
          type: "submitReviewPullRequest",
          payload: { branchName: branchSelect.value }
        });
      });

      branchSelect.focus();
    </script>
  </body>
</html>`;
  };

  const showReviewPullRequestDialog = async (
    branches: string[]
  ): Promise<string | undefined> =>
    new Promise((resolve) => {
      const panel = vscode.window.createWebviewPanel(
        "reviewPullRequest",
        "Review a Pull Request",
        vscode.ViewColumn.Active,
        { enableScripts: true }
      );
      panel.webview.html = renderReviewPullRequestHtml(panel.webview, branches);

      let settled = false;
      const resolveOnce = (value: string | undefined) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      panel.onDidDispose(() => resolveOnce(undefined), undefined, context.subscriptions);
      panel.webview.onDidReceiveMessage(
        (message) => {
          if (!message) return;
          if (message.type === "cancelReviewPullRequest") {
            panel.dispose();
            return;
          }
          if (message.type !== "submitReviewPullRequest") return;
          const branchName =
            typeof message.payload?.branchName === "string" ? message.payload.branchName : "";
          if (!branchName) return;
          resolveOnce(branchName);
          panel.dispose();
        },
        undefined,
        context.subscriptions
      );
    });

  const renderCheckoutBranchHtml = (
    webview: vscode.Webview,
    currentBranch: string,
    branches: string[]
  ): string => {
    const nonce = getNonce();
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Current Branch: ${currentBranch}</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: var(--vscode-font-family);
      }
      body {
        margin: 0;
        padding: 20px;
        color: var(--vscode-foreground);
        background: var(--vscode-editor-background);
      }
      form {
        display: grid;
        gap: 16px;
      }
      label {
        display: grid;
        gap: 6px;
        font-size: 13px;
      }
      select,
      button {
        font: inherit;
      }
      select {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        color: var(--vscode-input-foreground);
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border, transparent);
        border-radius: 6px;
      }
      .hint {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }
      .error {
        min-height: 18px;
        font-size: 12px;
        color: var(--vscode-errorForeground);
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      button {
        border: 0;
        border-radius: 6px;
        padding: 8px 14px;
        cursor: pointer;
      }
      button[type="submit"] {
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-background);
      }
      button[type="button"] {
        color: var(--vscode-button-secondaryForeground);
        background: var(--vscode-button-secondaryBackground);
      }
    </style>
  </head>
  <body>
    <form id="checkout-branch-form">
      <div class="current-branch-title">Current Branch: <span class="current-branch-value">${currentBranch}</span></div>
      <label>
        Checkout Branch
        <select id="branch-select"></select>
        <span class="hint">Choose the branch you want to check out.</span>
      </label>
      <div class="error" id="error-message"></div>
      <div class="actions">
        <button type="button" id="cancel-button">Cancel</button>
        <button type="submit">Checkout</button>
      </div>
    </form>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const branches = ${JSON.stringify(branches)};
      const branchSelect = document.getElementById("branch-select");
      const cancelButton = document.getElementById("cancel-button");
      const errorMessage = document.getElementById("error-message");
      const form = document.getElementById("checkout-branch-form");

      for (const branch of branches) {
        const option = document.createElement("option");
        option.value = branch;
        option.textContent = branch;
        branchSelect.appendChild(option);
      }

      if (branches.includes("main")) {
        branchSelect.value = "main";
      }

      cancelButton.addEventListener("click", () => {
        vscode.postMessage({ type: "cancelCheckoutBranch" });
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!branchSelect.value) {
          errorMessage.textContent = "Select a branch to check out.";
          return;
        }
        vscode.postMessage({
          type: "submitCheckoutBranch",
          payload: { branchName: branchSelect.value }
        });
      });

      branchSelect.focus();
    </script>
  </body>
</html>`;
  };

  const showCheckoutBranchDialog = async (
    currentBranch: string,
    branches: string[]
  ): Promise<string | undefined> =>
    new Promise((resolve) => {
      const panel = vscode.window.createWebviewPanel(
        "checkoutBranch",
        `Current Branch: ${currentBranch}`,
        vscode.ViewColumn.Active,
        { enableScripts: true }
      );
      panel.webview.html = renderCheckoutBranchHtml(panel.webview, currentBranch, branches);

      let settled = false;
      const resolveOnce = (value: string | undefined) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      panel.onDidDispose(() => resolveOnce(undefined), undefined, context.subscriptions);
      panel.webview.onDidReceiveMessage(
        (message) => {
          if (!message) return;
          if (message.type === "cancelCheckoutBranch") {
            panel.dispose();
            return;
          }
          if (message.type !== "submitCheckoutBranch") return;
          const branchName =
            typeof message.payload?.branchName === "string" ? message.payload.branchName : "";
          if (!branchName) return;
          resolveOnce(branchName);
          panel.dispose();
        },
        undefined,
        context.subscriptions
      );
    });

  const prepareCommitBeforeCheckout = async (
    repoRoot: string,
    targetBranch: string
  ): Promise<boolean> => {
    const statusOutput = await execInRepo("git status --porcelain", repoRoot);
    if (statusOutput.trim().length === 0) return true;

    const selection = await vscode.window.showWarningMessage(
      `You have uncommitted changes that could be overwritten when checking out ${targetBranch}. Commit them with a message or cancel the checkout.`,
      { modal: true },
      "Commit Changes",
      "Discard All Changes"
    );
    if (selection === "Commit Changes") {
      const commitMessage = await vscode.window.showInputBox({
        title: "Commit Changes Before Checkout",
        prompt: "Enter a commit message for the uncommitted changes.",
        ignoreFocusOut: true,
        validateInput: (value) => value.trim().length === 0 ? "Commit message is required." : undefined
      });
      if (commitMessage === undefined) return false;

      await execInRepo(
        `git add -A && git commit -m ${quoteShellArg(commitMessage.trim())}`,
        repoRoot
      );
      return true;
    }

    if (selection !== "Discard All Changes") return false;

    const confirmDiscard = await vscode.window.showWarningMessage(
      `Warning: you are going to lose all uncommitted and untracked changes before checking out ${targetBranch}. Are you sure?`,
      { modal: true },
      { title: "No", isCloseAffordance: true },
      { title: "Yes, Discard Changes" }
    );
    if (confirmDiscard?.title !== "Yes, Discard Changes") return false;

    await execInRepo("git reset --hard HEAD && git clean -fd", repoRoot);
    return true;
  };

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("antigravityView", provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.openSettings", async () => {
      const panel = vscode.window.createWebviewPanel(
        "antigravitySettings",
        "Antigravity Settings",
        vscode.ViewColumn.Active,
        { enableScripts: true }
      );
      panel.webview.html = renderAntigravitySettingsHtml(panel.webview);
      panel.webview.onDidReceiveMessage(
        async (message) => {
          if (!message || message.type !== "applySettings") return;
          const payload = message.payload || {};
          const values = payload.values || {};
          const target =
            payload.target === "workspace" && vscode.workspace.workspaceFolders
              ? vscode.ConfigurationTarget.Workspace
              : vscode.ConfigurationTarget.Global;
          const config = vscode.workspace.getConfiguration("antigravity");
          for (const [key, rawValue] of Object.entries(values)) {
            if (typeof rawValue === "boolean") {
              await config.update(key, rawValue, target);
              continue;
            }
            if (Array.isArray(rawValue)) {
              const normalized = rawValue
                .filter((item): item is string => typeof item === "string")
                .map((item) => item.trim())
                .filter((item) => item.length > 0);
              await config.update(key, normalized, target);
              continue;
            }
            const normalized = typeof rawValue === "string" ? rawValue.trim() : "";
            if (normalized === "") {
              await config.update(key, undefined, target);
            } else {
              await config.update(key, normalized, target);
            }
          }
          provider.refresh();
          void vscode.window.showInformationMessage("Antigravity settings updated.");
        },
        undefined,
        context.subscriptions
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.runClaudeAgent", async (agentName: string) => {
      log(`[runClaudeAgent] agentName: ${agentName}`);
      if (!agentName) {
        log(`[runClaudeAgent] ERROR: agent name missing`);
        void vscode.window.showErrorMessage("Agent name is missing.");
        return;
      }
      const rootPath = getRootPath();
      const repoRoot = rootPath ? getRepoRoot(rootPath) : process.cwd();
      log(`[runClaudeAgent] repoRoot: ${repoRoot}`);
      const runString = `claude --agent ${quoteShellArg(agentName)}`;
      logAlways(`[runClaudeAgent] runString: ${runString}`);
      runInNewTerminal(`Agent: ${agentName}`, [
        `cd ${quoteShellArg(repoRoot)}`,
        runString
      ], {
        iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
        color: CLAUDE_ACTION_COLOR
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "antigravity.runAgent",
      async (agentName: string, filePath: string) => {
        log(`[runAgent] agentName: ${agentName}, filePath: ${filePath}`);
        if (!agentName) {
          log(`[runAgent] ERROR: agent name missing`);
          void vscode.window.showErrorMessage("Agent name is missing.");
          return;
        }
        if (!filePath || !fs.existsSync(filePath)) {
          log(`[runAgent] ERROR: agent file not found: ${filePath}`);
          void vscode.window.showErrorMessage("Agent file not found.");
          return;
        }
        log(`[runAgent] running agent`);
        await runAgent(agentName, filePath);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.openAgent", async (filePath: string) => {
      if (!filePath || !fs.existsSync(filePath)) {
        void vscode.window.showErrorMessage("Agent file not found.");
        return;
      }
      await openFile(filePath);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.copyPath", async (item: { filePath?: string }) => {
      const filePath = item?.filePath;
      if (!filePath) {
        void vscode.window.showErrorMessage("No path available.");
        return;
      }
      await vscode.env.clipboard.writeText(filePath);
      void vscode.window.showInformationMessage(`Copied: ${filePath}`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.openPath", async (item: { filePath?: string }) => {
      const filePath = item?.filePath;
      if (!filePath || !fs.existsSync(filePath)) {
        void vscode.window.showErrorMessage("Path not found.");
        return;
      }
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        await vscode.env.openExternal(vscode.Uri.file(filePath));
      } else {
        await openFile(filePath);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.addToProject", async (item: { filePath?: string }) => {
      const filePath = item?.filePath;
      if (!filePath || !fs.existsSync(filePath)) {
        void vscode.window.showErrorMessage("Path not found.");
        return;
      }
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const projectRoot = getRepoRoot(rootPath);
      const linkName = path.basename(filePath);
      const linkPath = path.join(projectRoot, linkName);
      let linkExists = false;
      try {
        fs.lstatSync(linkPath); // succeeds for regular files and symlinks (including broken)
        linkExists = true;
      } catch {
        // path doesn't exist at all
      }
      if (linkExists) {
        void vscode.window.showErrorMessage(`"${linkName}" already exists in the project root.`);
        return;
      }
      try {
        fs.symlinkSync(filePath, linkPath);
        void vscode.window.showInformationMessage(`Symlink created: ${linkName} → ${filePath}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to create symlink: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.addToAgent", async (item: { filePath?: string }) => {
      const filePath = item?.filePath;
      if (!filePath || !fs.existsSync(filePath)) {
        void vscode.window.showErrorMessage("Path not found.");
        return;
      }
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const projectRoot = getRepoRoot(rootPath);
      const agentDir = path.join(projectRoot, ".agent");
      if (!fs.existsSync(agentDir)) {
        fs.mkdirSync(agentDir, { recursive: true });
      }
      const linkName = path.basename(filePath);
      const linkPath = path.join(agentDir, linkName);
      let linkExists = false;
      try {
        fs.lstatSync(linkPath);
        linkExists = true;
      } catch {
        // path doesn't exist at all
      }
      if (linkExists) {
        void vscode.window.showErrorMessage(`"${linkName}" already exists in .agent.`);
        return;
      }
      try {
        fs.symlinkSync(filePath, linkPath);
        void vscode.window.showInformationMessage(`Symlink created: .agent/${linkName} → ${filePath}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to create symlink: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.addToCustomSkills", async (item: { filePath?: string }) => {
      const filePath = item?.filePath;
      if (!filePath || !fs.existsSync(filePath)) {
        void vscode.window.showErrorMessage("Path not found.");
        return;
      }
      // If item is a SKILL.md file, symlink its parent folder; if it's a folder, symlink it directly
      const stat = fs.statSync(filePath);
      const skillSource = stat.isDirectory() ? filePath : path.dirname(filePath);
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const projectRoot = getRepoRoot(rootPath);
      const skillsDir = path.join(projectRoot, ".agent", "skills");
      if (!fs.existsSync(skillsDir)) {
        fs.mkdirSync(skillsDir, { recursive: true });
      }
      const linkName = path.basename(skillSource);
      const linkPath = path.join(skillsDir, linkName);
      let linkExists = false;
      try {
        fs.lstatSync(linkPath);
        linkExists = true;
      } catch {
        // path doesn't exist at all
      }
      if (linkExists) {
        void vscode.window.showErrorMessage(`"${linkName}" already exists in .agent/skills.`);
        return;
      }
      try {
        fs.symlinkSync(skillSource, linkPath);
        void vscode.window.showInformationMessage(`Symlink created: .agent/skills/${linkName} → ${skillSource}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to create symlink: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.addToCustomAgents", async (item: { filePath?: string }) => {
      const filePath = item?.filePath;
      if (!filePath || !fs.existsSync(filePath)) {
        void vscode.window.showErrorMessage("Path not found.");
        return;
      }
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const projectRoot = getRepoRoot(rootPath);
      const agentsDir = path.join(projectRoot, ".agent", "agents");
      if (!fs.existsSync(agentsDir)) {
        fs.mkdirSync(agentsDir, { recursive: true });
      }
      // If the selected item is an AGENT.md file, symlink its parent folder instead.
      const stat = fs.statSync(filePath);
      const agentSource = (!stat.isDirectory() && path.basename(filePath) === "AGENT.md")
        ? path.dirname(filePath)
        : filePath;
      const linkName = path.basename(agentSource);
      const linkPath = path.join(agentsDir, linkName);
      let linkExists = false;
      try {
        fs.lstatSync(linkPath);
        linkExists = true;
      } catch {
        // path doesn't exist at all
      }
      if (linkExists) {
        void vscode.window.showErrorMessage(`"${linkName}" already exists in .agent/agents.`);
        return;
      }
      try {
        fs.symlinkSync(agentSource, linkPath);
        void vscode.window.showInformationMessage(`Symlink created: .agent/agents/${linkName} → ${agentSource}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to create symlink: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.enablePlugin", async (item: { filePath?: string }) => {
      const pluginName = item?.filePath;
      if (!pluginName) return;
      await runInSecondaryTerminal([`claude plugin enable ${quoteShellArg(pluginName)}`]);
      setTimeout(() => provider.refresh(), 1500);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.disablePlugin", async (item: { filePath?: string }) => {
      const pluginName = item?.filePath;
      if (!pluginName) return;
      await runInSecondaryTerminal([`claude plugin disable ${quoteShellArg(pluginName)}`]);
      setTimeout(() => provider.refresh(), 1500);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.runWorkflow", async (filePath: string) => {
      log(`[runWorkflow] filePath: ${filePath}`);
      if (!filePath || !fs.existsSync(filePath)) {
        log(`[runWorkflow] ERROR: workflow file not found: ${filePath}`);
        void vscode.window.showErrorMessage("Workflow file not found.");
        return;
      }
      log(`[runWorkflow] running workflow`);
      await runWorkflow(filePath);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.openClaudeTerminal", async () => {
      log(`[openClaudeTerminal] triggered`);
      try {
        const rootPath = getRootPath();
        if (!rootPath) {
          log(`[openClaudeTerminal] ERROR: rootPath not set`);
          void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
          return;
        }
        const repoRoot = getRepoRoot(rootPath);
        log(`[openClaudeTerminal] repoRoot: ${repoRoot}`);
        const baseUrl = await readClaudeAnthropicBaseUrl(repoRoot);
        if (isLocalLiteLLMBaseUrl(baseUrl)) {
          await vscode.commands.executeCommand("antigravity.runLiteLLMOpenAI");
          const ready = await waitForUrlReady(LOCAL_LITELLM_READY_URL);
          if (!ready) {
            void vscode.window.showErrorMessage(
              `liteLLM did not become ready at ${LOCAL_LITELLM_READY_URL}.`
            );
            return;
          }
        }
        runInNewTerminal("Claude", [`cd ${quoteShellArg(repoRoot)}`, "claude"], {
          iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
          color: CLAUDE_ACTION_COLOR
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Claude Terminal failed: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.openOllamaClaudeTerminal", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
      runInNewTerminal("Ollama Claude", [`cd ${quoteShellArg(repoRoot)}`, "ollama launch claude"], {
        iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
        color: CLAUDE_ACTION_COLOR
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.openOpenClaudeTerminal", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
      runInNewTerminal("OpenClaude", [`cd ${quoteShellArg(repoRoot)}`, "openclaude"], {
        iconPath: new vscode.ThemeIcon("robot", CLAUDE_ACTION_COLOR),
        color: CLAUDE_ACTION_COLOR
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.setClaudeModel", async () => {
      const routerConfigPath = path.join(os.homedir(), ".claude", "routerconfig.json");
      if (!fs.existsSync(routerConfigPath)) {
        const rootPath = getRootPath();
        const repoRoot = rootPath ? getRepoRoot(rootPath) : undefined;
        const repTemplatePath = repoRoot ? path.join(repoRoot, "routerconfig.example.json") : undefined;
        const templatePath = (repTemplatePath && fs.existsSync(repTemplatePath))
          ? repTemplatePath
          : path.join(extensionRoot, "routerconfig.example.json");
        if (fs.existsSync(templatePath)) {
          fs.mkdirSync(path.dirname(routerConfigPath), { recursive: true });
          fs.copyFileSync(templatePath, routerConfigPath);
          await vscode.window.showTextDocument(vscode.Uri.file(routerConfigPath));
        } else {
          void vscode.window.showErrorMessage(
            "Could not create ~/.claude/routerconfig.json: template routerconfig.example.json not found."
          );
        }
        return;
      }

      const config = await loadOpenRouterConfig();
      if (!config) return;

      const routers = normalizeStringArray(config.routers);
      if (routers.length === 0) {
        void vscode.window.showErrorMessage("routerconfig.json is missing a routers array.");
        return;
      }

      const panel = vscode.window.createWebviewPanel(
        "antigravitySetClaudeModel",
        "Set Claude Model",
        vscode.ViewColumn.Active,
        { enableScripts: true }
      );
      const claudeSettings = await loadClaudeSettings();
      panel.webview.html = renderClaudeModelConfigHtml(panel.webview, config, claudeSettings);
      panel.webview.onDidReceiveMessage(
        async (message) => {
          if (!message || message.type !== "applyClaudeModel") return;
          const { router, model, effortLevel, internalBehaviour } = message.payload || {};
          if (
            typeof router !== "string" ||
            typeof model !== "string" ||
            typeof effortLevel !== "string" ||
            typeof internalBehaviour !== "string"
          ) {
            void vscode.window.showErrorMessage("Invalid Claude model selection.");
            return;
          }

          const baseSettings = getRouterSettings(config, router);
          if (!baseSettings) {
            void vscode.window.showErrorMessage(
              `routerconfig.json is missing ${router}-settings configuration.`
            );
            return;
          }
          const settings = baseSettings;
          const missingKeys: string[] = [];
          const mandatory = new Set(
            (settings.mandatory_params || []).map((value) => value.trim())
          );
          if (mandatory.has("api_key") && !settings.apikey) missingKeys.push("api_key");
          if (mandatory.has("auth_token") && !settings.auth_token)
            missingKeys.push("auth_token");
          if (missingKeys.length > 0) {
            void vscode.window.showErrorMessage(
              `Missing ${missingKeys.join(", ")} for ${router}. ` +
              "Set it in ~/.claude/routerconfig.json."
            );
            return;
          }

          const rootPath = getRootPath();
          if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
          }
          const repoRoot = getRepoRoot(rootPath);
          const command =
            quoteShellArg(path.join(extensionRoot, "src", "Switch-ClaudeCode-Model.sh")) +
            ` --model ${quoteShellArg(model)}` +
            ` --baseurl ${quoteShellArg(settings.baseurl)}` +
            ` --auth-token ${quoteShellArg(settings.auth_token)}` +
            ` --api-key ${quoteShellArg(settings.apikey)}` +
            ` --effort-level ${quoteShellArg(effortLevel)}` +
            ` --internal-model ${quoteShellArg(internalBehaviour)}`;
          const commands = [`cd ${quoteShellArg(repoRoot)}`, command];
          const postRun = settings.post_run?.trim();
          const toolRunCommand = postRun ? getToolRunCommand(config, postRun) : undefined;
          if (postRun && !toolRunCommand) {
            commands.push(`nohup sh -c ${quoteShellArg(postRun)} >/dev/null 2>&1 &`);
          }
          await runInSecondaryTerminal(commands);
          if (toolRunCommand) {
            await runInSecondaryTerminal([`cd ${quoteShellArg(repoRoot)}`, toolRunCommand]);
          }
          panel.dispose();
        },
        undefined,
        context.subscriptions
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.workspaceSetup", async () => {
      showOutputChannel();
      logAlways("[Workspace Setup] Command triggered");
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        logAlways("[Workspace Setup] ERROR: No workspace folder is open");
        void vscode.window.showErrorMessage("No workspace folder is open.");
        return;
      }
      logAlways(`[Workspace Setup] workspaceRoot: ${workspaceRoot}`);
      const repoRoot = workspaceRoot;
      const workspaceDir = getWorkspaceProjectPath(repoRoot);
      logAlways(`[Workspace Setup] workspaceDir: ${workspaceDir}`);
      if (!fs.existsSync(workspaceDir)) {
        logAlways(`[Workspace Setup] workspaceDir does not exist, creating: ${workspaceDir}`);
        fs.mkdirSync(path.join(workspaceDir, "scripts"), { recursive: true });
      }
      const scriptPath = path.join(extensionRoot, "src", "workspace-setup.sh");
      logAlways(`[Workspace Setup] scriptPath: ${scriptPath}`);
      if (!fs.existsSync(scriptPath)) {
        logAlways(`[Workspace Setup] ERROR: workspace-setup.sh not found at: ${scriptPath}`);
        void vscode.window.showErrorMessage(`workspace-setup.sh not found in extension at: ${scriptPath}`);
        return;
      }
      logAlways(`[Workspace Setup] workspace-setup.sh found, making executable`);
      await fs.promises.chmod(scriptPath, 0o755).catch((e) => logAlways(`[Workspace Setup] chmod failed: ${e}`));

      logAlways(`[Workspace Setup] running workspace-setup.sh in: ${workspaceDir}`);
      const exitCode = await new Promise<number>((resolve) => {
        const proc = spawn(scriptPath, ["--force"], { cwd: workspaceDir, shell: false });
        proc.stdout.on("data", (data: Buffer) => {
          for (const line of data.toString().split("\n")) {
            if (line.trim()) logAlways(`[workspace-setup.sh] ${line}`);
          }
        });
        proc.stderr.on("data", (data: Buffer) => {
          for (const line of data.toString().split("\n")) {
            if (line.trim()) logAlways(`[workspace-setup.sh STDERR] ${line}`);
          }
        });
        proc.on("close", (code) => resolve(code ?? 1));
        proc.on("error", (err) => {
          logAlways(`[Workspace Setup] spawn error: ${err.message}`);
          resolve(1);
        });
      });
      logAlways(`[Workspace Setup] workspace-setup.sh exited with code: ${exitCode}`);

      if (exitCode !== 0) {
        void vscode.window.showErrorMessage(`workspace-setup.sh failed (exit ${exitCode}). Check the Antigravity Task Runner output panel.`);
        return;
      }

      // logAlways(`[Workspace Setup] launching AGENTS.md init`);
      // await launchAgentInit(repoRoot);
      // await launchClaudeInit(repoRoot);
      // logAlways(`[Workspace Setup] AGENTS.md init launched`);
      logAlways(`[Workspace Setup] Done`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.initRepository", async () => {
      showOutputChannel();
      logAlways(`[initRepository] triggered`);
      const rootPath = getRootPath();
      if (!rootPath) {
        logAlways(`[initRepository] ERROR: rootPath not set`);
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
      logAlways(`[initRepository] repoRoot: ${repoRoot}`);
      if (fs.existsSync(path.join(repoRoot, ".git"))) {
        logAlways(`[initRepository] existing .git directory found at ${path.join(repoRoot, ".git")}`);
        void vscode.window.showWarningMessage(
          "A Git repository already exists in this project."
        );
        return;
      }
      const repoName = await vscode.window.showInputBox({
        title: "Init Repository",
        prompt: "Enter the repository name",
        placeHolder: "my-repository"
      });
      if (!repoName || repoName.trim() === "") {
        logAlways("[initRepository] cancelled before repository name was provided");
        return;
      }
      const trimmedRepoName = repoName.trim();
      logAlways(`[initRepository] requested repoName: ${trimmedRepoName}`);
      const nestedGitFolders = findNestedGitFolders(repoRoot);
      logAlways(`[initRepository] nested .git folders found: ${nestedGitFolders.length}`);
      if (nestedGitFolders.length > 0) {
        const relPaths = nestedGitFolders.map((p) => path.relative(repoRoot, p));
        logAlways(`[initRepository] nested .git relative paths: ${relPaths.join(", ")}`);
        const selection = await vscode.window.showWarningMessage(
          `Found ${nestedGitFolders.length} nested .git folder(s):\n${relPaths.join(", ")}\n\nRemove them and absorb into one repo?`,
          { modal: true },
          "Yes",
          "No"
        );
        logAlways(`[initRepository] nested .git removal selection: ${selection ?? "dismissed"}`);
        if (selection !== "Yes") {
          logAlways("[initRepository] cancelled because nested .git folders were not approved for removal");
          return;
        }
        for (const gitDir of nestedGitFolders) {
          logAlways(`[initRepository] removing nested .git folder: ${gitDir}`);
          fs.rmSync(gitDir, { recursive: true, force: true });
        }
      }
      logAlways(`[initRepository] invoking init-repo script from ${path.join(extensionRoot, "src")}`);
      await runRepoScript("init-repo", [trimmedRepoName], { scriptDir: path.join(extensionRoot, "src") });
      logAlways("[initRepository] init-repo script invocation completed");
      provider.refresh();
      logAlways("[initRepository] tree provider refreshed");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.commitChanges", async () => {
      showOutputChannel();
      logAlways("[commitChanges] triggered");
      let repoRoot = "";
      try {
        const rootPath = getRootPath();
        if (!rootPath) {
          logAlways("[commitChanges] ERROR: rootPath not set");
          void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
          return;
        }

        repoRoot = getRepoRoot(rootPath);
        logAlways(`[commitChanges] repoRoot: ${repoRoot}`);
        if (!fs.existsSync(path.join(repoRoot, ".git"))) {
          logAlways("[commitChanges] ERROR: repository not initialized");
          void vscode.window.showWarningMessage(
            "Initialize a Git repository before using Commit."
          );
          return;
        }

        await focusSourceControlChanges();
        await vscode.workspace.saveAll(false);

        const statusOutput = await execInRepo("git status --porcelain", repoRoot);
        if (statusOutput.trim().length === 0) {
          logAlways("[commitChanges] no changes detected");
          void vscode.window.showInformationMessage("No changes to commit.");
          return;
        }

        if (getUseAgentForGithubRepositoryManagement()) {
          const prompt = "commit all changes and automatically generate the commit message";
          logAlways("[commitChanges] delegating commit to Agentic Harness");
          runInNewTerminal(
            "Agentic Harness Commit",
            [
              `cd ${quoteShellArg(repoRoot)}`,
              buildAgenticHarnessPromptCommand(prompt, "prompt")
            ],
            {
              iconPath: new vscode.ThemeIcon("git-commit", CLAUDE_ACTION_COLOR),
              color: CLAUDE_ACTION_COLOR
            }
          );
          void vscode.window.showInformationMessage(
            "Opened Agentic Harness Commit terminal."
          );
          return;
        }

        const secretCandidateOutput = await execInRepo(
          "git status --porcelain -- .env config/.env",
          repoRoot
        );
        if (secretCandidateOutput.trim().length > 0) {
          logAlways("[commitChanges] excluding .env/config/.env from automated commit");
          void vscode.window.showWarningMessage(
            "Excluded .env and config/.env from this automated commit for safety."
          );
        }

        await execInRepo(
          "git add -A -- . && git rm -q --cached --ignore-unmatch .env config/.env",
          repoRoot
        );

        const repository = await getGitRepository(repoRoot);
        if (!repository) {
          logAlways("[commitChanges] ERROR: VS Code Git repository not found");
          void vscode.window.showErrorMessage(
            "VS Code Git integration could not find the current repository."
          );
          return;
        }

        const commitMessage = await buildGeneratedCommitMessage(repoRoot);
        if (!commitMessage.trim()) {
          logAlways("[commitChanges] no commit message generated");
          void vscode.window.showWarningMessage("Nothing commitable was staged.");
          return;
        }

        logAlways(`[commitChanges] generated message: ${commitMessage}`);
        repository.inputBox.value = commitMessage;
        await repository.commit(commitMessage, { all: false });
        provider.refresh();

        logAlways("[commitChanges] commit completed");
        void vscode.window.showInformationMessage(`Committed changes: ${commitMessage}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logAlways(
          `[commitChanges] ERROR${repoRoot ? ` (${repoRoot})` : ""}: ${message}`
        );
        void vscode.window.showErrorMessage(`Commit failed: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.buildVersion", async () => {
      await runRepoScript("build-version");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.runLiteLLMOpenAI", async () => {
      const config = await loadOpenRouterConfig();
      if (!config) return;
      const command = getToolRunCommand(config, "litellm-openai");
      if (!command) {
        void vscode.window.showErrorMessage(
          'routerconfig.json is missing "tool-run.litellm-openai".'
        );
        return;
      }
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
      await runInSecondaryTerminal([`cd ${quoteShellArg(repoRoot)}`, command]);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.createClaudeMd", async () => {
      log(`[createClaudeMd] triggered`);
      try {
        const rootPath = getRootPath();
        const repoRoot = rootPath ? getRepoRoot(rootPath) : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!repoRoot) {
          log(`[createClaudeMd] ERROR: no workspace folder or rootPath`);
          void vscode.window.showErrorMessage("No workspace folder is open.");
          return;
        }
        log(`[createClaudeMd] repoRoot: ${repoRoot}`);
        await launchClaudeInit(repoRoot, "Project Level AGENT.md Guidelines.txt");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log(`[createClaudeMd] ERROR: ${message}`);
        void vscode.window.showErrorMessage(`Create CLAUDE.md failed: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.createAgentMd", async () => {
      log(`[createAgentMd] triggered`);
      try {
        const rootPath = getRootPath();
        const repoRoot = rootPath ? getRepoRoot(rootPath) : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!repoRoot) {
          log(`[createAgentMd] ERROR: no workspace folder or rootPath`);
          void vscode.window.showErrorMessage("No workspace folder is open.");
          return;
        }
        log(`[createAgentMd] repoRoot: ${repoRoot}`);
        await launchAgentInit(repoRoot);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log(`[createAgentMd] ERROR: ${message}`);
        void vscode.window.showErrorMessage(`Create AGENTS.md failed: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.createRepository", async () => {
      await runRepoScript("create-repo");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.createInfrastructure", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }

      const repoRoot = getRepoRoot(rootPath);
      const infraFiles = await listInfrastructureYamlFiles(repoRoot);
      if (infraFiles.length === 0) {
        void vscode.window.showErrorMessage(
          `No infrastructure YAML files found under ${path.join(repoRoot, "config", "Infrastructure")}.`
        );
        return;
      }

      const selection = await vscode.window.showQuickPick(
        infraFiles.map((filePath) => {
          const relativePath = path.relative(repoRoot, filePath);
          return { label: relativePath, value: relativePath };
        }),
        {
          title: "Create Infrastructure",
          placeHolder: "Select infra yaml path"
        }
      );

      if (!selection) return;

      await runRepoScript("create-infra", [selection.value], { cwd: repoRoot });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.deploy", async () => {
      await runRepoScript("deploy");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.selectOrCreateJiraProject", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }

      const repoRoot = getRepoRoot(rootPath);
      let credentials: JiraCredentials;

      try {
        credentials = getJiraCredentialsFromEnv(repoRoot);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(message);
        return;
      }

      const projectKey = await ensureSavedJiraProjectKey(repoRoot, credentials);
      if (!projectKey) {
        return;
      }

      void vscode.window.showInformationMessage(`Jira project ${projectKey} is now selected.`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.addJiraItem", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }

      const repoRoot = getRepoRoot(rootPath);
      let credentials: JiraCredentials;

      try {
        credentials = getJiraCredentialsFromEnv(repoRoot);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(message);
        return;
      }

      const projectKey = await ensureSavedJiraProjectKey(repoRoot, credentials);
      if (!projectKey) return;

      let issueTypes: JiraIssueType[];
      try {
        issueTypes = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Loading Jira item types",
            cancellable: false
          },
          async () => getJiraIssueTypes(credentials, projectKey)
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to load Jira item types: ${message}`);
        return;
      }

      if (issueTypes.length === 0) {
        void vscode.window.showErrorMessage(
          `No Jira item types are available for project ${projectKey}.`
        );
        return;
      }

      const jiraItem = await showCreateJiraItemDialog(projectKey, issueTypes);
      if (!jiraItem) return;

      try {
        const createdIssue = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Creating Jira item",
            cancellable: false
          },
          async () =>
            createJiraIssue(credentials, {
              projectKey,
              issueTypeName: jiraItem.issueType,
              summary: jiraItem.summary,
              description: jiraItem.description
            })
        );

        void vscode.window.showInformationMessage(
          `Created Jira ${jiraItem.issueType} ${createdIssue.key} in project ${projectKey}.`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to create Jira item: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.takeJiraItemAssign", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }

      const repoRoot = getRepoRoot(rootPath);
      let credentials: JiraCredentials;
      const projectKey = getSavedJiraProjectKey(repoRoot);

      try {
        credentials = getJiraCredentialsFromEnv(repoRoot);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(message);
        return;
      }

      if (!projectKey) {
        void vscode.window.showErrorMessage(
          "Take Jira Item (Assign) is disabled because JIRA_PROJECT_KEY is not set for this repository."
        );
        provider.refresh();
        return;
      }

      let issues: JiraIssueSummary[];
      try {
        issues = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Loading unassigned Jira items",
            cancellable: false
          },
          async () => searchOpenUnassignedJiraIssues(credentials)
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to load Jira items: ${message}`);
        return;
      }

      if (issues.length === 0) {
        void vscode.window.showInformationMessage(
          "No open Jira tickets assigned to no one were found."
        );
        return;
      }

      const selection = await vscode.window.showQuickPick(
        issues.map((issue) => ({
          label: issue.key,
          description: issue.summary,
          detail: [issue.projectKey || issue.projectName, issue.issueTypeName, issue.statusName]
            .filter(Boolean)
            .join(" • "),
          issue
        })),
        {
          title: "Take Jira Item (Assign)",
          placeHolder: "Select an open Jira ticket that is currently unassigned",
          matchOnDescription: true,
          matchOnDetail: true
        }
      );

      if (!selection) return;

      const confirm = await vscode.window.showInformationMessage(
        `Assign ${selection.issue.key} to ${credentials.email}?`,
        { modal: true },
        "Assign To Me"
      );
      if (confirm !== "Assign To Me") return;

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Assigning ${selection.issue.key} to you and moving it to In Progress`,
            cancellable: false
          },
          async () => {
            await assignJiraIssueToCurrentUser(credentials, selection.issue.key);
            await transitionJiraIssueToStatus(credentials, selection.issue.key, "In Progress");
          }
        );

        void vscode.window.showInformationMessage(
          `Assigned Jira item ${selection.issue.key} to ${credentials.email} and moved it to In Progress.`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to assign Jira item: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.assignJiraItemToAgent", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }

      const repoRoot = getRepoRoot(rootPath);
      let credentials: JiraCredentials;
      const projectKey = getSavedJiraProjectKey(repoRoot);

      try {
        credentials = getJiraCredentialsFromEnv(repoRoot);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(message);
        return;
      }

      if (!projectKey) {
        void vscode.window.showErrorMessage(
          "Assign Jira Item to Agent is disabled because JIRA_PROJECT_KEY is not set for this repository."
        );
        provider.refresh();
        return;
      }

      let issues: JiraIssueSummary[];
      try {
        issues = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Loading unassigned Jira items in ${projectKey}`,
            cancellable: false
          },
          async () => searchOpenUnassignedTodoJiraIssuesForProject(credentials, projectKey)
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to load Jira items: ${message}`);
        return;
      }

      if (issues.length === 0) {
        void vscode.window.showInformationMessage(
          `No unassigned Jira tickets in To Do were found for project ${projectKey}.`
        );
        return;
      }

      const selection = await showAssignJiraItemToAgentDialog(
        projectKey,
        assignableAgentOptions,
        issues
      );
      if (!selection) return;

      const issue = issues.find((candidate) => candidate.key === selection.issueKey);
      if (!issue) {
        void vscode.window.showErrorMessage("The selected Jira item is no longer available.");
        return;
      }

      const updatedSummary = buildIssueSummaryForAgent(issue.summary, selection.agentLabel);

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Assigning ${issue.key} to ${selection.agentLabel}`,
            cancellable: false
          },
          async () => {
            await updateJiraIssueSummaryAndLabels(
              credentials,
              issue.key,
              updatedSummary,
              [buildAgentJiraLabel(selection.agentLabel)]
            );
            await assignJiraIssueToCurrentUser(credentials, issue.key);
            await transitionJiraIssueToStatus(credentials, issue.key, "In Progress");
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to assign Jira item to agent: ${message}`);
        return;
      }

      launchAgentForJiraItem(repoRoot, selection.agentLabel, issue.key, issue.summary);
      void vscode.window.showInformationMessage(
        `${issue.key} was assigned to ${credentials.email}, moved to In Progress, and sent to ${selection.agentLabel}.`
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.completeJiraItem", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }

      const repoRoot = getRepoRoot(rootPath);
      let credentials: JiraCredentials;
      const projectKey = getSavedJiraProjectKey(repoRoot);

      try {
        credentials = getJiraCredentialsFromEnv(repoRoot);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(message);
        return;
      }

      if (!projectKey) {
        void vscode.window.showErrorMessage(
          "Jira Item Completed is disabled because JIRA_PROJECT_KEY is not set for this repository."
        );
        provider.refresh();
        return;
      }

      let issues: JiraIssueSummary[];
      try {
        issues = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Loading your Jira items in ${projectKey}`,
            cancellable: false
          },
          async () => searchOpenAssignedJiraIssuesForCurrentUser(credentials, projectKey)
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to load Jira items: ${message}`);
        return;
      }

      if (issues.length === 0) {
        void vscode.window.showInformationMessage(
          `No Jira tickets assigned to you in To Do or In Progress were found for project ${projectKey}.`
        );
        return;
      }

      const selection = await vscode.window.showQuickPick(
        issues.map((issue) => ({
          label: issue.key,
          description: issue.summary,
          detail: [issue.projectKey || issue.projectName, issue.issueTypeName, issue.statusName]
            .filter(Boolean)
            .join(" • "),
          issue
        })),
        {
          title: "Jira Item Completed",
          placeHolder: `Select one of your Jira tickets in ${projectKey} to move into In Review`,
          matchOnDescription: true,
          matchOnDetail: true
        }
      );

      if (!selection) return;

      const confirm = await vscode.window.showInformationMessage(
        `Move ${selection.issue.key} to In Review?`,
        { modal: true },
        "Mark Completed"
      );
      if (confirm !== "Mark Completed") return;

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Moving ${selection.issue.key} to In Review`,
            cancellable: false
          },
          async () => transitionJiraIssueToStatus(credentials, selection.issue.key, "In Review")
        );

        void vscode.window.showInformationMessage(
          `Moved Jira item ${selection.issue.key} to In Review.`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to update Jira item: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.incrementMajorVersion", async () => {
      await runRepoScript("bump-version", ["major"]);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.incrementMinorVersion", async () => {
      await runRepoScript("bump-version", ["minor"]);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.incrementPatchVersion", async () => {
      await runRepoScript("bump-version", ["patch"]);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.createRepoTagVersion", async () => {
      log(`[createRepoTagVersion] triggered`);
      const description = await vscode.window.showInputBox({
        title: "Create Repo Tag Version",
        prompt: "Add a tag description (optional)"
      });
      if (description === undefined) return;
      const trimmed = description.trim();
      log(`[createRepoTagVersion] description: "${trimmed}"`);
      const createReleaseBranch = vscode.workspace
        .getConfiguration("antigravity")
        .get<boolean>("createReleaseBranchWhenCreatingReleases") ?? true;
      await runRepoScript("commit-push-tag", trimmed ? [trimmed] : [], {
        scriptDir: path.join(extensionRoot, "src"),
        env: {
          CREATE_RELEASE_BRANCH: createReleaseBranch ? "1" : "0"
        }
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.createFeatureBranch", async () => {
      log("[createFeatureBranch] triggered");
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
      const dialogResult = await showCreateFeatureBranchDialog();
      if (!dialogResult) return;
      const { branchType, branchName } = dialogResult;
      log(`[createFeatureBranch] branchName: ${branchName}`);
      if (branchType.label) {
        log(`[createFeatureBranch] branchType: ${branchType.label}`);
      }
      const scriptPath = path.join(extensionRoot, "src", "create_feature_branch.sh");
      if (!fs.existsSync(scriptPath)) {
        void vscode.window.showErrorMessage(
          "Create feature branch script not found in the extension package."
        );
        return;
      }

      runInNewTerminal(
        "Create Feature Branch",
        [
          `cd ${quoteShellArg(repoRoot)}`,
          `${quoteShellArg(scriptPath)} ${quoteShellArg(branchName)}`
        ],
        {
          iconPath: new vscode.ThemeIcon("git-branch")
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.createPullRequest", async () => {
      log("[createPullRequest] triggered");
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
      const scriptPath = path.join(extensionRoot, "src", "create_pull_requrest.sh");
      if (!fs.existsSync(scriptPath)) {
        void vscode.window.showErrorMessage(
          "Create pull request script not found in the extension package."
        );
        return;
      }

      runInNewTerminal(
        "Create Pull Request",
        [
          `cd ${quoteShellArg(repoRoot)}`,
          quoteShellArg(scriptPath)
        ],
        {
          iconPath: new vscode.ThemeIcon("git-pull-request")
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.checkoutMain", async () => {
      log("[checkoutMain] triggered");
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);

      try {
        const currentBranch = await getCurrentBranchName(repoRoot);
        const branches = await getAvailableCheckoutBranches(repoRoot);
        if (branches.length === 0) {
          void vscode.window.showInformationMessage("No branches were found for checkout.");
          return;
        }

        const selectedBranch = await showCheckoutBranchDialog(currentBranch, branches);
        if (!selectedBranch) return;

        const canProceed = await prepareCommitBeforeCheckout(repoRoot, selectedBranch);
        if (!canProceed) return;

        const scriptPath = path.join(extensionRoot, "src", "checkout_branch.sh");
        if (!fs.existsSync(scriptPath)) {
          void vscode.window.showErrorMessage(
            "Checkout branch script not found in the extension package."
          );
          return;
        }

        runInNewTerminal(
          "Checkout Branch",
          [
            `cd ${quoteShellArg(repoRoot)}`,
            `${quoteShellArg(scriptPath)} ${quoteShellArg(selectedBranch)}`
          ],
          {
            iconPath: new vscode.ThemeIcon("source-control")
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Checkout branch failed: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.reviewPullRequest", async () => {
      log("[reviewPullRequest] triggered");
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);

      try {
        const statusOutput = await execInRepo("git status --porcelain", repoRoot);
        if (statusOutput.trim().length > 0) {
          void vscode.window.showWarningMessage(
            "Commit or stash your local changes before reviewing a pull request so nothing gets lost."
          );
          return;
        }

        const branches = await getAvailablePullRequestBranches(repoRoot);
        if (branches.length === 0) {
          void vscode.window.showInformationMessage("No pull request branches were found on origin.");
          return;
        }

        const selectedBranch = await showReviewPullRequestDialog(branches);
        if (!selectedBranch) return;

        runInNewTerminal(
          "Review Pull Request",
          [
            `cd ${quoteShellArg(repoRoot)}`,
            `git rev-parse --verify ${quoteShellArg(`refs/heads/${selectedBranch}`)} >/dev/null 2>&1 && git checkout ${quoteShellArg(selectedBranch)} || git checkout --track ${quoteShellArg(`origin/${selectedBranch}`)}`
          ],
          {
            iconPath: new vscode.ThemeIcon("git-pull-request")
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Review Pull Request failed: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.approvePullRequest", async () => {
      log("[approvePullRequest] triggered");
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
      const workflowFile = resolveClaudeWorkflowFile("approve_pull_request");
      if (!workflowFile) {
        void vscode.window.showErrorMessage(
          "Approve pull request workflow not found in the configured Antigravity Workflows Folder or the bundled extension files."
        );
        return;
      }
      runInNewTerminal(
        "Agentic Harness Approve Pull Request",
        [
          `cd ${quoteShellArg(repoRoot)}`,
          buildAgenticHarnessPromptCommand(`run this workflow ${workflowFile}`)
        ],
        {
          iconPath: new vscode.ThemeIcon("pass", CLAUDE_ACTION_COLOR),
          color: CLAUDE_ACTION_COLOR
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.feedbackOnPullRequest", async () => {
      void vscode.window.showInformationMessage(
        "Feedback on Pull Request is added to the sidebar. Detailed functionality will be wired in later."
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.createRepoTag", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
      const tagName = await vscode.window.showInputBox({
        title: "Create Repo Tag",
        prompt: "Tag name (e.g. v1.0.0)"
      });
      if (!tagName?.trim()) return;
      const tag = tagName.trim();
      const message = await vscode.window.showInputBox({
        title: "Create Repo Tag",
        prompt: "Tag message (optional)"
      });
      if (message === undefined) return;
      const msg = message.trim() || tag;
      runInNewTerminal("Antigravity", [
        `cd ${quoteShellArg(repoRoot)}`,
        `git tag -a ${quoteShellArg(tag)} -m ${quoteShellArg(msg)} && git push origin ${quoteShellArg(tag)} && echo "[antigravity] tag ${tag} pushed"`,
      ]);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.autocommitCheckpoint", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }

      const repoRoot = getRepoRoot(rootPath);
      const action = isAutocommitRunning(repoRoot) ? "stop" : "start";
      if (action === "start") {
        const hasGithub = await hasGitHubRemote(repoRoot);
        if (!hasGithub) {
          void vscode.window.showErrorMessage(
            "No GitHub remote found for this project. Set up a GitHub repository before starting autocommit."
          );
          return;
        }
      }
      // Ensure both autocommit scripts are present, using bundled src/ versions.
      const srcDir = path.join(extensionRoot, "src");
      const scriptPath = await ensureScriptFile(repoRoot, "autocommit_changes.sh", srcDir);
      if (!scriptPath) return;
      await ensureScriptFile(repoRoot, "autocommit_revert.sh", srcDir);
      await runInSecondaryTerminal([
        `cd ${quoteShellArg(repoRoot)}`,
        `${quoteShellArg(scriptPath)} ${action}`
      ]);
      refreshAutocommitUiWhenStateChanges(repoRoot, action === "start");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.autocommitRevert", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
      const scriptPath = await ensureScriptFile(repoRoot, "autocommit_revert.sh", path.join(extensionRoot, "src"));
      if (!scriptPath) return;
      await runInSecondaryTerminal([
        `cd ${quoteShellArg(repoRoot)}`,
        `${quoteShellArg(scriptPath)}`
      ]);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.switchEnvironment", async () => {
      const rootPath = getRootPath();
      if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
      }
      const repoRoot = getRepoRoot(rootPath);
      const workspaceDir = getWorkspaceProjectPath(repoRoot);

      const selection = await vscode.window.showQuickPick(
        [
          { label: "DEV", value: "DEV" },
          { label: "QA", value: "QA" },
          { label: "UAT", value: "UAT" },
          { label: "PROD", value: "PROD" }
        ],
        {
          title: "Switch Environment",
          placeHolder: "Select target environment"
        }
      );
      if (!selection) return;

      // Ensure switch-env.sh is present, downloading from Script Fallback Base URL if missing.
      const scriptPath = await ensureScriptFile(repoRoot, "switch-env.sh", path.join(workspaceDir, "scripts"));
      if (!scriptPath) return;

      // Offer to download missing config files from Config Fallback Base URL.
      // Files live in workspace/config/ so pass workspaceDir as the root.
      const settingsFileName = `${selection.value.toLowerCase()}-settings.yaml`;
      await downloadConfigFileIfMissing(workspaceDir, settingsFileName);
      await downloadInfrastructureFileIfMissing(workspaceDir, settingsFileName);
      await downloadConfigFileIfMissing(workspaceDir, ".env");

      await runInSecondaryTerminal([
        `cd ${quoteShellArg(workspaceDir)}`,
        `${quoteShellArg(scriptPath)} ${quoteShellArg(selection.value)}`
      ]);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.openSopManual", async () => {
      const rootPath = getRootPath();
      const repoRoot = rootPath ? getRepoRoot(rootPath) : undefined;
      const sopManualLink = getSopManualLink(repoRoot);
      if (!sopManualLink) {
        void vscode.window.showErrorMessage(
          "SOP Manual Link is not set in Antigravity settings or the repository .env file."
        );
        return;
      }

      try {
        const localPath = await downloadMarkdownToTempFile(sopManualLink, "sop-manual.md");
        await openFile(localPath);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Failed to download SOP manual: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.updateAgenticWorkspace", async () => {
      const rawWorkspaceProjectDir = vscode.workspace.getConfiguration("antigravity").get<string>("antigravityWorkspaceProject") || "~/antigravity-workspace";
      const workspaceProjectDir = rawWorkspaceProjectDir.replace(/^~/, os.homedir());
      await runRepoScript("update-agentic-workspace", [workspaceProjectDir], { scriptDir: path.join(extensionRoot, "src") });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.updateAgenticSetup", async () => {
      const config = vscode.workspace.getConfiguration("antigravity");
      const initialValues = {
        claudeGithub: config.get<string>("claudeSetupGithub") || "",
        geminiGithub: config.get<string>("geminiSetupGithub") || "",
        codexGithub: config.get<string>("codexSetupGithub") || ""
      };
      const panel = vscode.window.createWebviewPanel(
        "antigravityAgenticSetup",
        "Update Agentic Setup",
        vscode.ViewColumn.Active,
        { enableScripts: true }
      );
      panel.webview.html = renderAgenticSetupHtml(panel.webview, initialValues);
      panel.webview.onDidReceiveMessage(
        async (message) => {
          try {
            await runInSecondaryTerminal([`echo "[antigravity] message received: ${JSON.stringify(message)}"`]);
            if (!message || message.type !== "agenticSetupUpdate") {
              await runInSecondaryTerminal([`echo "[antigravity] ignored message type: ${message?.type}"`]);
              return;
            }
            const { tool, url, all } = message as { tool: string; url: string; all: Record<string, string> };
            await runInSecondaryTerminal([`echo "[antigravity] update triggered: tool=${tool} url=${url}"`]);
            // Save all three values every time any Update is clicked
            if (all.claudeGithub) await config.update("claudeSetupGithub", all.claudeGithub, vscode.ConfigurationTarget.Global);
            if (all.geminiGithub) await config.update("geminiSetupGithub", all.geminiGithub, vscode.ConfigurationTarget.Global);
            if (all.codexGithub) await config.update("codexSetupGithub", all.codexGithub, vscode.ConfigurationTarget.Global);
            await runInSecondaryTerminal([`echo "[antigravity] config saved, running script..."`]);
            await runRepoScript("update-agent-setup", url ? [tool, url] : [tool], { scriptDir: path.join(extensionRoot, "src") });
          } catch (err) {
            await runInSecondaryTerminal([`echo "[antigravity] ERROR: ${String(err)}"`]);
          }
        },
        undefined,
        context.subscriptions
      );
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.backupCompress", async (uri: vscode.Uri) => {
      const targetPath = uri?.fsPath;
      if (!targetPath) {
        void vscode.window.showErrorMessage("No file or folder selected.");
        return;
      }
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const dir = path.dirname(targetPath);
      const base = path.basename(targetPath);
      const zipName = `${base} [${timestamp}].zip`;
      const zipPath = path.join(dir, zipName);
      const isDir = fs.statSync(targetPath).isDirectory();
      const flag = isDir ? "-r" : "";
      const cmd = `zip ${flag} ${quoteShellArg(zipPath)} ${quoteShellArg(base)}`.trim();
      exec(cmd, { cwd: dir }, (error) => {
        if (error) {
          void vscode.window.showErrorMessage(`Backup-Compress failed: ${error.message}`);
        } else {
          void vscode.window.showInformationMessage(`Backup created: ${zipName}`);
        }
      });
    })
  );
  const runDiffMerge = async (uri: vscode.Uri | undefined, uris?: vscode.Uri[]) => {
    const selectedUris = Array.isArray(uris) && uris.length > 0
      ? uris
      : uri
        ? [uri]
        : [];
    if (selectedUris.length === 0) {
      void vscode.window.showErrorMessage("No files selected.");
      return;
    }
    if (selectedUris.length > 3) {
      void vscode.window.showErrorMessage("DiffMerge supports selecting up to 3 files from the Explorer menu.");
      return;
    }

    const filePaths = selectedUris
      .map((item) => item.fsPath)
      .filter((item): item is string => Boolean(item));

    const invalidPath = filePaths.find((filePath) => {
      try {
        return fs.statSync(filePath).isDirectory();
      } catch {
        return true;
      }
    });
    if (invalidPath) {
      void vscode.window.showErrorMessage("DiffMerge can only be launched with existing files.");
      return;
    }

    const proc = spawn("open", ["-a", "/Applications/DiffMerge.app", "--args", ...filePaths], { shell: false });
    proc.on("error", (error) => {
      void vscode.window.showErrorMessage(`DiffMerge failed: ${error.message}`);
    });
    proc.on("exit", (code) => {
      if (code && code !== 0) {
        void vscode.window.showErrorMessage(`DiffMerge exited with code ${code}.`);
      }
    });
  };
  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.diffMergeSingle", runDiffMerge)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("antigravity.diffMergeFiles", runDiffMerge)
  );
}

export function deactivate() { }
