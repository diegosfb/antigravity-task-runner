"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process_1 = require("child_process");
const treeProvider_1 = require("./treeProvider");
const git_1 = require("./git");
const terminal_1 = require("./terminal");
const settings_1 = require("./settings");
const scripts_1 = require("./scripts");
const agentRunCommand_1 = require("./agentRunCommand");
const utils_1 = require("./utils");
const logger_1 = require("./logger");
const jira_1 = require("./jira");
const jiraProjectHarness_1 = require("./jiraProjectHarness");
const mergeReviewPrompt_1 = require("./mergeReviewPrompt");
const projectTemplates_1 = require("./projectTemplates");
const secrets_audit_1 = require("./secrets-audit");
const cloudArchitectReview_1 = require("./cloudArchitectReview");
const featureEstimator_1 = require("./featureEstimator");
const grillMe_1 = require("./grillMe");
const agenticHarnessCommand_1 = require("./agenticHarnessCommand");
const resourceProvider_1 = require("./resourceProvider");
const updateProjectConfig_1 = require("./updateProjectConfig");
const explainMe_1 = require("./explainMe");
const deployAgenticLib_1 = require("./deployAgenticLib");
const businessAnalyst_1 = require("./businessAnalyst");
const productDesigner_1 = require("./productDesigner");
const developer_1 = require("./developer");
const estimator_1 = require("./estimator");
const planExecution_1 = require("./planExecution");
const solutionArchitect_1 = require("./solutionArchitect");
const backlogItem_1 = require("./backlogItem");
const backlogItemCompleted_1 = require("./backlogItemCompleted");
const assignBacklogItemToAgent_1 = require("./assignBacklogItemToAgent");
function getRepoPackageVersion(repoRoot) {
    try {
        const packageJsonPath = path.join(repoRoot, "package.json");
        const raw = fs.readFileSync(packageJsonPath, "utf8");
        const parsed = JSON.parse(raw);
        return typeof parsed.version === "string" && parsed.version.trim().length > 0
            ? parsed.version.trim()
            : undefined;
    }
    catch {
        return undefined;
    }
}
function activate(context) {
    const outputChannel = vscode.window.createOutputChannel("Antigravity Task Runner");
    const PULL_REMOTE_AND_MERGE_ACTION_COLOR = new vscode.ThemeColor("charts.yellow");
    const CLOUD_ARCHITECT_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiCyan");
    const FEATURE_ESTIMATOR_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiBrightBlue");
    const EXPLAIN_ME_ACTION_COLOR = new vscode.ThemeColor("terminal.ansiCyan");
    const UPDATE_PROJECT_CONFIG_ACTION_COLOR = new vscode.ThemeColor("charts.green");
    const ADLC_ACTION_COLOR = new vscode.ThemeColor("charts.red");
    context.subscriptions.push(outputChannel);
    (0, logger_1.initLogger)(outputChannel);
    const provider = new treeProvider_1.AntigravityViewProvider();
    const extensionRoot = context.extensionPath;
    const resourceProvider = (0, resourceProvider_1.createGitHubResourceProvider)();
    const FEATURE_ESTIMATOR_ICON_PATH = vscode.Uri.file(path.join(extensionRoot, "Resources", "feature-estimator-red.svg"));
    (0, logger_1.log)(`[activate] Extension root: ${extensionRoot}`);
    const launchClaudeInit = async (repoRoot, guidelinesFileName = "Project Level CLAUDE.md Guidelines.txt") => {
        (0, logger_1.log)(`[launchClaudeInit] repoRoot: ${repoRoot}`);
        const guidelineCandidates = [
            path.join(extensionRoot, guidelinesFileName)
        ];
        const guidelinesFile = guidelineCandidates.find((candidate) => fs.existsSync(candidate));
        (0, logger_1.log)(`[launchClaudeInit] guidelinesFile: ${guidelinesFile ?? "not found, using /init"}`);
        const prompt = guidelinesFile
            ? fs.readFileSync(guidelinesFile, "utf8").trim()
            : "/init";
        (0, logger_1.log)(`[launchClaudeInit] launching Claude init terminal`);
        await (0, terminal_1.runClaudeInitAndUpdateInPersistentTerminal)(repoRoot, prompt);
        (0, logger_1.log)(`[launchClaudeInit] done`);
    };
    const launchAgentInit = async (repoRoot) => {
        (0, logger_1.log)(`[launchAgentInit] repoRoot: ${repoRoot}`);
        const guidelinesFile = path.join(extensionRoot, "Project Level AGENT.md Guidelines.txt");
        (0, logger_1.log)(`[launchAgentInit] guidelinesFile: ${guidelinesFile} exists=${fs.existsSync(guidelinesFile)}`);
        const prompt = fs.existsSync(guidelinesFile)
            ? fs.readFileSync(guidelinesFile, "utf8").trim()
            : "/init";
        (0, logger_1.log)(`[launchAgentInit] launching Codex init terminal`);
        await (0, terminal_1.runCodexInitAndUpdateInPersistentTerminal)(repoRoot, prompt);
        (0, logger_1.log)(`[launchAgentInit] done`);
    };
    const launchUpdateProjectConfigPrompt = (logKey, terminalName, prompt, iconId, successMessage) => {
        (0, logger_1.log)(`[${logKey}] triggered`);
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        (0, logger_1.logAlways)(`[${logKey}] delegating to Agentic Harness`);
        (0, terminal_1.runInPersistentTerminal)(terminalName, [
            `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
            (0, terminal_1.buildAgenticHarnessPromptCommand)(repoRoot, prompt, "prompt")
        ], {
            iconPath: new vscode.ThemeIcon(iconId, UPDATE_PROJECT_CONFIG_ACTION_COLOR),
            color: UPDATE_PROJECT_CONFIG_ACTION_COLOR
        });
        void vscode.window.showInformationMessage(successMessage);
    };
    const launchProductDesignerInNewTerminal = (values) => {
        const terminal = vscode.window.createTerminal({
            name: "Product Designer",
            cwd: values.workspace,
            iconPath: new vscode.ThemeIcon("edit", ADLC_ACTION_COLOR),
            color: ADLC_ACTION_COLOR
        });
        terminal.show();
        terminal.sendText((0, productDesigner_1.buildProductDesignerCommand)(values), true);
    };
    const launchBusinessAnalystInNewTerminal = (values) => {
        const terminal = vscode.window.createTerminal({
            name: "Business Analyst",
            cwd: values.workspace,
            iconPath: new vscode.ThemeIcon("note", ADLC_ACTION_COLOR),
            color: ADLC_ACTION_COLOR
        });
        terminal.show();
        terminal.sendText((0, businessAnalyst_1.buildBusinessAnalystCommand)(values), true);
    };
    const launchSolutionArchitectInNewTerminal = (values) => {
        const terminal = vscode.window.createTerminal({
            name: "Solution Architect",
            cwd: values.workspace,
            iconPath: new vscode.ThemeIcon("symbol-structure", ADLC_ACTION_COLOR),
            color: ADLC_ACTION_COLOR
        });
        terminal.show();
        terminal.sendText((0, solutionArchitect_1.buildSolutionArchitectCommand)(values), true);
    };
    const launchEstimatorInNewTerminal = (values) => {
        const terminal = vscode.window.createTerminal({
            name: "Estimate Project",
            cwd: values.workspace,
            iconPath: new vscode.ThemeIcon("graph", ADLC_ACTION_COLOR),
            color: ADLC_ACTION_COLOR
        });
        terminal.show();
        terminal.sendText((0, estimator_1.buildEstimatorCommand)(values), true);
    };
    const launchPlanExecutionInNewTerminal = (values) => {
        const terminal = vscode.window.createTerminal({
            name: "Create Execution Plan",
            cwd: values.workspace,
            iconPath: new vscode.ThemeIcon("map", ADLC_ACTION_COLOR),
            color: ADLC_ACTION_COLOR
        });
        terminal.show();
        terminal.sendText((0, planExecution_1.buildPlanExecutionCommand)(values), true);
    };
    const launchDeveloperInNewTerminal = (values) => {
        const terminal = vscode.window.createTerminal({
            name: "Develop Execution Plan",
            cwd: values.workspace,
            iconPath: new vscode.ThemeIcon("play-circle", ADLC_ACTION_COLOR),
            color: ADLC_ACTION_COLOR
        });
        terminal.show();
        terminal.sendText((0, developer_1.buildDeveloperCommand)(values), true);
    };
    const getProjectScopedStateKey = (prefix) => {
        const workspaceRoot = (0, utils_1.getWorkspaceRoot)();
        const rootPath = (0, utils_1.getRootPath)();
        const projectRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : workspaceRoot;
        return `${prefix}:${projectRoot ?? "global"}`;
    };
    const refreshAutocommitUiWhenStateChanges = (repoRoot, expectedRunningState, attemptsRemaining = 20) => {
        provider.refresh();
        if ((0, git_1.isAutocommitRunning)(repoRoot) === expectedRunningState || attemptsRemaining <= 0) {
            return;
        }
        setTimeout(() => {
            refreshAutocommitUiWhenStateChanges(repoRoot, expectedRunningState, attemptsRemaining - 1);
        }, 500);
    };
    const runConfiguredProjectCommand = async (taskName, commandLine, settingLabel) => {
        if (!commandLine) {
            void vscode.window.showErrorMessage(`${settingLabel} is not set in Antigravity settings.`);
            return;
        }
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        try {
            await (0, terminal_1.runCommandInTaskTerminal)(taskName, commandLine, { cwd: repoRoot });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`${taskName} failed: ${message}`);
        }
    };
    const branchTypes = [
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
    const normalizeBranchSegment = (value) => value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");
    const buildStandardBranchName = (prefix, rawValue) => {
        const withoutPrefix = rawValue.trim().replace(/^(feature|fix|hotfix)\//i, "");
        const segment = normalizeBranchSegment(withoutPrefix);
        return segment ? `${prefix}/${segment}` : undefined;
    };
    const buildJiraTaskBranchName = (rawValue) => {
        const withoutPrefix = rawValue.trim().replace(/^feature\//i, "");
        const match = withoutPrefix.match(/^([A-Za-z][A-Za-z0-9]+-\d+)[-\s/]+(.+)$/);
        if (!match)
            return undefined;
        const issueKey = match[1].toUpperCase();
        const description = normalizeBranchSegment(match[2]);
        if (!description)
            return undefined;
        return `feature/${issueKey}-${description}`;
    };
    const resolveClaudeWorkflowFile = (workflowName) => {
        const config = vscode.workspace.getConfiguration("antigravity");
        const configuredFolderRaw = config.get("workflowsFolder") || path.join(os.homedir(), ".gemini");
        const configuredFolder = configuredFolderRaw.startsWith("~")
            ? path.join(os.homedir(), configuredFolderRaw.slice(1))
            : configuredFolderRaw;
        const configuredCandidates = [
            path.join(configuredFolder, "workflows", workflowName, "WORKFLOW.md"),
            path.join(configuredFolder, workflowName, "WORKFLOW.md")
        ];
        const configuredPath = configuredCandidates.find((candidate) => fs.existsSync(candidate));
        if (configuredPath)
            return configuredPath;
        const bundledPath = path.join(extensionRoot, "Knowhow", "Antigravity workflows", workflowName, "WORKFLOW.md");
        if (fs.existsSync(bundledPath))
            return bundledPath;
        return undefined;
    };
    const escapeHtml = (value) => value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    const renderSetupWorkspaceHtml = (webview, workspaceDir, projectTemplates) => {
        const nonce = (0, settings_1.getNonce)();
        const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
        const templateCards = projectTemplates
            .map((template, index) => {
            const checked = index === 0 ? " checked" : "";
            const selectedClass = index === 0 ? " selected" : "";
            const descriptionHtml = escapeHtml(template.description).replace(/\n/g, "<br />");
            return `
          <label class="template-card${selectedClass}">
            <input type="radio" name="project-template" value="${escapeHtml(template.name)}"${checked} />
            <span class="template-copy">
              <span class="template-name">${escapeHtml(template.name)}</span>
              <span class="template-description">${descriptionHtml}</span>
            </span>
          </label>
        `;
        })
            .join("");
        return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Setup Workspace</title>
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
      .intro {
        display: grid;
        gap: 6px;
      }
      .hint {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }
      .workspace-path {
        font-family: var(--vscode-editor-font-family, monospace);
        font-size: 12px;
        color: var(--vscode-textPreformat-foreground);
        background: var(--vscode-textCodeBlock-background);
        border-radius: 6px;
        padding: 10px 12px;
        overflow-wrap: anywhere;
      }
      .template-list {
        display: grid;
        gap: 10px;
      }
      .template-card {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 12px;
        align-items: start;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid var(--vscode-input-border, transparent);
        background: var(--vscode-sideBar-background);
        cursor: pointer;
      }
      .template-card.selected {
        border-color: var(--vscode-focusBorder);
        background: var(--vscode-list-hoverBackground);
      }
      .template-card input {
        margin-top: 3px;
      }
      .template-copy {
        display: grid;
        gap: 6px;
      }
      .template-name {
        font-size: 14px;
        font-weight: 600;
      }
      .template-description {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        line-height: 1.5;
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
        margin-top: 4px;
      }
      button {
        font: inherit;
        border: 0;
        border-radius: 6px;
        padding: 8px 14px;
        cursor: pointer;
      }
      button[type="submit"] {
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-background);
      }
      button[type="submit"][data-action="estimate"] {
        background: var(--vscode-charts-green, #2ea043);
      }
      button[type="submit"][data-action="estimate"]:hover {
        background: color-mix(in srgb, var(--vscode-charts-green, #2ea043) 88%, black 12%);
      }
      button[type="button"] {
        color: var(--vscode-button-secondaryForeground);
        background: var(--vscode-button-secondaryBackground);
      }
    </style>
  </head>
  <body>
    <form id="setup-workspace-form">
      <div class="intro">
        <div>Select a project template to download into the configured workspace path.</div>
        <div class="hint">After you click Setup, the selected Agentic Harness command from Settings will be launched to perform the download.</div>
        <div class="workspace-path">${escapeHtml(workspaceDir)}</div>
      </div>

      <div class="template-list">
        ${templateCards}
      </div>

      <div id="setup-workspace-error" class="error" aria-live="polite"></div>

      <div class="actions">
        <button type="button" id="cancel-button">Cancel</button>
        <button type="submit">Setup</button>
      </div>
    </form>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const form = document.getElementById("setup-workspace-form");
      const errorMessage = document.getElementById("setup-workspace-error");
      const cancelButton = document.getElementById("cancel-button");
      const cards = Array.from(document.querySelectorAll(".template-card"));
      const radios = Array.from(document.querySelectorAll('input[name="project-template"]'));

      const syncSelectedState = () => {
        cards.forEach((card) => {
          const radio = card.querySelector('input[name="project-template"]');
          card.classList.toggle("selected", Boolean(radio && radio.checked));
        });
      };

      radios.forEach((radio) => {
        radio.addEventListener("change", syncSelectedState);
      });

      cancelButton.addEventListener("click", () => {
        vscode.postMessage({ type: "cancelSetupWorkspace" });
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const selected = radios.find((radio) => radio.checked);
        if (!selected) {
          errorMessage.textContent = "Select a project type.";
          return;
        }
        errorMessage.textContent = "";
        vscode.postMessage({
          type: "submitSetupWorkspace",
          payload: { templateName: selected.value }
        });
      });

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (message?.type === "setupWorkspaceError") {
          errorMessage.textContent =
            message.payload?.message || "Unable to start workspace setup.";
        }
      });

      syncSelectedState();
    </script>
  </body>
</html>`;
    };
    const showSetupWorkspaceDialog = async (workspaceDir, projectTemplates) => new Promise((resolve) => {
        const panel = vscode.window.createWebviewPanel("setupWorkspace", "Setup Workspace", vscode.ViewColumn.Active, { enableScripts: true });
        panel.webview.html = renderSetupWorkspaceHtml(panel.webview, workspaceDir, projectTemplates);
        let settled = false;
        const resolveOnce = (value) => {
            if (settled)
                return;
            settled = true;
            resolve(value);
        };
        panel.onDidDispose(() => resolveOnce(undefined), undefined, context.subscriptions);
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message)
                return;
            if (message.type === "cancelSetupWorkspace") {
                panel.dispose();
                return;
            }
            if (message.type !== "submitSetupWorkspace")
                return;
            const payload = message.payload || {};
            const templateName = typeof payload.templateName === "string" ? payload.templateName.trim() : "";
            const selectedTemplate = projectTemplates.find((projectTemplate) => projectTemplate.name === templateName);
            if (!selectedTemplate) {
                void panel.webview.postMessage({
                    type: "setupWorkspaceError",
                    payload: { message: "Select a project type." }
                });
                return;
            }
            resolveOnce(selectedTemplate);
            panel.dispose();
        }, undefined, context.subscriptions);
    });
    const renderCreateFeatureBranchHtml = (webview, hasJiraProject) => {
        const nonce = (0, settings_1.getNonce)();
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
      button[type="submit"][data-action="grillMe"] {
        background: var(--vscode-charts-green, #2ea043);
      }
      button[type="submit"][data-action="grillMe"]:hover {
        background: color-mix(in srgb, var(--vscode-charts-green, #2ea043) 88%, black 12%);
      }
      button[type="button"] {
        color: var(--vscode-button-secondaryForeground);
        background: var(--vscode-button-secondaryBackground);
      }
      #jira-section {
        display: ${hasJiraProject ? "grid" : "none"};
        gap: 6px;
        font-size: 13px;
      }
      .jira-section-title {
        display: flex;
        align-items: baseline;
        gap: 6px;
      }
    </style>
  </head>
  <body>
    <form id="feature-branch-form">
      <div id="jira-section">
        <div class="jira-section-title">
          Jira issue
          <span class="hint">(optional — selects branch type and prefills name)</span>
        </div>
        <select id="jira-issue">
          <option value="">— Loading Jira issues… —</option>
        </select>
      </div>
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
      const jiraSection = document.getElementById("jira-section");
      const jiraIssueSelect = document.getElementById("jira-issue");

      const slugify = (text) =>
        text.trim().toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .replace(/-{2,}/g, "-")
          .slice(0, 40);

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

      jiraIssueSelect.addEventListener("change", () => {
        const opt = jiraIssueSelect.options[jiraIssueSelect.selectedIndex];
        const issueKey = opt.dataset.key || "";
        const summary = opt.dataset.summary || "";
        if (!issueKey) return;
        branchTypeSelect.value = "Jira Task";
        updateHints();
        const slug = slugify(summary);
        branchNameInput.value = slug ? issueKey + "-" + slug : issueKey + "-";
        branchNameInput.focus();
        branchNameInput.setSelectionRange(branchNameInput.value.length, branchNameInput.value.length);
      });

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
        if (message.type === "jiraIssuesLoaded") {
          const issues = message.payload?.issues || [];
          jiraIssueSelect.innerHTML = "";
          const placeholder = document.createElement("option");
          placeholder.value = "";
          placeholder.textContent = issues.length > 0
            ? "— Pick a Jira issue (optional) —"
            : "— No open unassigned issues —";
          jiraIssueSelect.appendChild(placeholder);
          for (const issue of issues) {
            const opt = document.createElement("option");
            opt.value = issue.key;
            opt.dataset.key = issue.key;
            opt.dataset.summary = issue.summary;
            opt.textContent = issue.key + "  " + issue.summary;
            jiraIssueSelect.appendChild(opt);
          }
          jiraSection.style.display = "grid";
        }
        if (message.type === "jiraIssuesError") {
          jiraSection.style.display = "none";
        }
      });

      branchTypeSelect.value = branchTypes[0].label;
      updateHints();
      branchNameInput.focus();
    </script>
  </body>
</html>`;
    };
    const showCreateFeatureBranchDialog = async (repoRoot) => {
        const savedProjectKey = getSavedJiraProjectKey(repoRoot);
        return new Promise((resolve) => {
            const panel = vscode.window.createWebviewPanel("createFeatureBranch", "Create Feature Branch", vscode.ViewColumn.Active, { enableScripts: true });
            panel.webview.html = renderCreateFeatureBranchHtml(panel.webview, Boolean(savedProjectKey));
            if (savedProjectKey) {
                void (async () => {
                    try {
                        const credentials = await resolveValidatedJiraCredentials(repoRoot);
                        const issues = await (0, jira_1.searchOpenUnassignedTodoJiraIssuesForProject)(credentials, savedProjectKey);
                        void panel.webview.postMessage({ type: "jiraIssuesLoaded", payload: { issues } });
                    }
                    catch (error) {
                        if (error instanceof Error && isJiraCredentialsConfigurationMessage(error.message)) {
                            await showJiraCredentialsValidationError(error);
                        }
                        void panel.webview.postMessage({ type: "jiraIssuesError" });
                    }
                })();
            }
            let settled = false;
            const resolveOnce = (value) => {
                if (settled)
                    return;
                settled = true;
                resolve(value);
            };
            panel.onDidDispose(() => resolveOnce(undefined), undefined, context.subscriptions);
            panel.webview.onDidReceiveMessage(async (message) => {
                if (!message)
                    return;
                if (message.type === "cancelCreateFeatureBranch") {
                    panel.dispose();
                    return;
                }
                if (message.type !== "submitCreateFeatureBranch")
                    return;
                const payload = message.payload || {};
                const selectedBranchType = branchTypes.find((option) => option.label === payload.branchType);
                const branchNameInput = typeof payload.branchNameInput === "string" ? payload.branchNameInput : "";
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
            }, undefined, context.subscriptions);
        });
    };
    const getRepoEnvPath = (repoRoot) => path.join(repoRoot, ".env");
    const getJiraCredentialsFromEnv = (repoRoot) => {
        const envPath = getRepoEnvPath(repoRoot);
        const env = (0, utils_1.parseEnvFile)(envPath);
        const config = vscode.workspace.getConfiguration("antigravity");
        const baseUrl = (config.get("jiraBaseUrl") || "").trim() ||
            (env.jira_base_url || "").trim();
        const email = (config.get("jiraEmail") || "").trim() ||
            (env.jira_email || "").trim();
        const apiToken = (config.get("jiraApiToken") || "").trim() ||
            (env.jira_api_token || "").trim();
        const missing = [
            !baseUrl ? "Jira Base URL" : undefined,
            !email ? "Jira Email" : undefined,
            !apiToken ? "Jira API Token" : undefined
        ].filter((value) => Boolean(value));
        if (missing.length > 0) {
            throw new Error(`Missing Jira credentials in Antigravity Settings: ${missing.join(", ")}.`);
        }
        return { baseUrl, email, apiToken };
    };
    const isJiraCredentialsConfigurationMessage = (message) => message === jira_1.INVALID_JIRA_TOKEN_MESSAGE ||
        message.startsWith("Missing Jira credentials in Antigravity Settings:");
    const showJiraCredentialsValidationError = async (error) => {
        const rawMessage = error instanceof Error ? error.message : String(error);
        const message = isJiraCredentialsConfigurationMessage(rawMessage)
            ? rawMessage
            : `Failed to validate Jira credentials: ${rawMessage}`;
        if (message === jira_1.INVALID_JIRA_TOKEN_MESSAGE) {
            const selection = await vscode.window.showErrorMessage(message, "Open Settings");
            if (selection === "Open Settings") {
                await vscode.commands.executeCommand("antigravity.openSettings");
            }
            return message;
        }
        await vscode.window.showErrorMessage(message);
        return message;
    };
    const resolveValidatedJiraCredentials = async (repoRoot) => {
        const credentials = getJiraCredentialsFromEnv(repoRoot);
        await (0, jira_1.validateJiraCredentials)(credentials);
        return credentials;
    };
    const getValidatedJiraCredentials = async (repoRoot) => {
        try {
            return await resolveValidatedJiraCredentials(repoRoot);
        }
        catch (error) {
            await showJiraCredentialsValidationError(error);
            return undefined;
        }
    };
    const getSavedJiraProjectKey = (repoRoot) => {
        const env = (0, utils_1.parseEnvFile)(getRepoEnvPath(repoRoot));
        return (env.jira_project_key || "").trim().toUpperCase();
    };
    const applySavedJiraProjectKey = (values, jiraProjectKey) => jiraProjectKey
        ? {
            ...values,
            jiraProjectName: jiraProjectKey
        }
        : values;
    const buildFeatureEstimatorDetailsFromIssue = (issue) => {
        const metadata = [issue.issueTypeName, issue.statusName].filter(Boolean).join(", ");
        return metadata
            ? `Jira item ${issue.key} (${metadata}): ${issue.summary}`
            : `Jira item ${issue.key}: ${issue.summary}`;
    };
    const renderFeatureEstimatorHtml = (webview, savedProjectKey) => {
        const nonce = (0, settings_1.getNonce)();
        const hasSavedProjectKey = savedProjectKey.length > 0;
        const useJiraByDefault = hasSavedProjectKey;
        const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
        return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Feature Estimator</title>
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
        gap: 18px;
      }
      .intro {
        display: grid;
        gap: 6px;
      }
      .mode-list {
        display: grid;
        gap: 12px;
      }
      .mode-card {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 12px;
        align-items: start;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid var(--vscode-input-border, transparent);
        background: var(--vscode-sideBar-background);
      }
      .mode-card.selected {
        border-color: var(--vscode-focusBorder);
        background: var(--vscode-list-hoverBackground);
      }
      .mode-card.disabled {
        opacity: 0.65;
      }
      .mode-card input[type="radio"] {
        margin-top: 3px;
      }
      .mode-copy {
        display: grid;
        gap: 4px;
      }
      .mode-title {
        font-size: 14px;
        font-weight: 600;
      }
      .mode-description,
      .hint,
      .status {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        line-height: 1.5;
      }
      .status.warning {
        color: var(--vscode-errorForeground);
      }
      .section {
        display: grid;
        gap: 8px;
        padding: 14px;
        border-radius: 8px;
        border: 1px solid var(--vscode-input-border, transparent);
        background: color-mix(in srgb, var(--vscode-editor-background) 92%, var(--vscode-editorWidget-background) 8%);
      }
      label {
        display: grid;
        gap: 6px;
        font-size: 13px;
      }
      select,
      textarea,
      button {
        font: inherit;
      }
      select,
      textarea {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        color: var(--vscode-input-foreground);
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border, transparent);
        border-radius: 6px;
      }
      textarea {
        min-height: 180px;
        resize: vertical;
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
    <form id="feature-estimator-form">
      <div class="intro">
        <div>Estimate a feature from a Jira item in To Do or from a free-form description.</div>
        <div class="hint">When you click Estimate, Task Runner downloads the latest estimator skill into this project from the Task Runner GitHub Resources folder and launches the selected Agentic Harness command from Settings. When you click Grill Me, it downloads the latest grill-me skill and launches a feature review prompt with the same selected Jira item or text description.</div>
      </div>

      <div class="mode-list">
        <label class="mode-card${useJiraByDefault ? " selected" : ""}" id="mode-jira-card">
          <input
            id="mode-jira"
            type="radio"
            name="feature-source"
            value="jira"${useJiraByDefault ? " checked" : ""}${hasSavedProjectKey ? "" : " disabled"}
          />
          <span class="mode-copy">
            <span class="mode-title">Jira To Do Item</span>
            <span class="mode-description">Pick a feature from Jira project ${hasSavedProjectKey ? escapeHtml(savedProjectKey) : "setup"} and work from that backlog item.</span>
          </span>
        </label>

        <div class="section" id="jira-section"${useJiraByDefault ? "" : " hidden"}>
          <label>
            Jira Item
            <select id="jira-issue-select">
              <option value="">${hasSavedProjectKey ? "— Loading To Do Jira items… —" : "— Set JIRA_PROJECT_KEY to use Jira items —"}</option>
            </select>
          </label>
          <div class="hint" id="jira-hint">${hasSavedProjectKey ? `Pick one To Do Jira item from ${escapeHtml(savedProjectKey)}.` : "Set JIRA_PROJECT_KEY in this repository to enable Jira-based estimation."}</div>
          <div class="status${hasSavedProjectKey ? "" : " warning"}" id="jira-status">${hasSavedProjectKey ? `Loading To Do Jira items from ${escapeHtml(savedProjectKey)}...` : "Jira estimation is unavailable until JIRA_PROJECT_KEY is configured and Jira credentials are available."}</div>
        </div>

        <label class="mode-card${useJiraByDefault ? "" : " selected"}" id="mode-text-card">
          <input
            id="mode-text"
            type="radio"
            name="feature-source"
            value="text"${useJiraByDefault ? "" : " checked"}
          />
          <span class="mode-copy">
            <span class="mode-title">Free Text Description</span>
            <span class="mode-description">Describe the feature directly when it is not in Jira yet or you want to estimate or review a draft idea.</span>
          </span>
        </label>

        <div class="section" id="text-section"${useJiraByDefault ? " hidden" : ""}>
          <label>
            Feature Description
            <textarea id="feature-description" placeholder="Describe the feature, expected behavior, constraints, integrations, and any assumptions that would affect the estimate."></textarea>
          </label>
          <div class="hint">Include enough detail for the selected skill to assess the feature, whether you want an estimate or a deeper review.</div>
        </div>
      </div>

      <div class="error" id="feature-estimator-error" aria-live="polite"></div>

      <div class="actions">
        <button type="button" id="cancel-button">Cancel</button>
        <button type="submit" data-action="estimate">Estimate</button>
        <button type="submit" data-action="grillMe">Grill Me</button>
      </div>
    </form>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const hasSavedProjectKey = ${JSON.stringify(hasSavedProjectKey)};
      const savedProjectKey = ${JSON.stringify(savedProjectKey)};
      const form = document.getElementById("feature-estimator-form");
      const errorMessage = document.getElementById("feature-estimator-error");
      const cancelButton = document.getElementById("cancel-button");
      const jiraRadio = document.getElementById("mode-jira");
      const textRadio = document.getElementById("mode-text");
      const jiraCard = document.getElementById("mode-jira-card");
      const textCard = document.getElementById("mode-text-card");
      const jiraSection = document.getElementById("jira-section");
      const textSection = document.getElementById("text-section");
      const jiraIssueSelect = document.getElementById("jira-issue-select");
      const jiraHint = document.getElementById("jira-hint");
      const jiraStatus = document.getElementById("jira-status");
      const featureDescription = document.getElementById("feature-description");
      const sourceRadios = Array.from(document.querySelectorAll('input[name="feature-source"]'));

      const setJiraCardState = () => {
        jiraCard.classList.toggle("selected", jiraRadio.checked && !jiraRadio.disabled);
        jiraCard.classList.toggle("disabled", jiraRadio.disabled);
        textCard.classList.toggle("selected", textRadio.checked);
      };

      const syncSourceState = () => {
        const usingJira = jiraRadio.checked && !jiraRadio.disabled;
        jiraSection.hidden = !usingJira;
        textSection.hidden = usingJira;
        setJiraCardState();
        errorMessage.textContent = "";
      };

      const switchToTextIfNeeded = () => {
        if (jiraRadio.checked && jiraRadio.disabled) {
          textRadio.checked = true;
        }
        syncSourceState();
      };

      const updateJiraHint = () => {
        const selected = jiraIssueSelect.options[jiraIssueSelect.selectedIndex];
        const summary = selected?.dataset.summary || "";
        const issueType = selected?.dataset.issueType || "";
        const status = selected?.dataset.status || "";

        jiraHint.textContent = summary
          ? [summary, [issueType, status].filter(Boolean).join(" • ")].filter(Boolean).join(" • ")
          : hasSavedProjectKey
            ? "Pick one To Do Jira item from " + savedProjectKey + "."
            : "Set JIRA_PROJECT_KEY in this repository to enable Jira-based estimation.";
      };

      sourceRadios.forEach((radio) => {
        radio.addEventListener("change", syncSourceState);
      });

      jiraIssueSelect.addEventListener("change", updateJiraHint);

      cancelButton.addEventListener("click", () => {
        vscode.postMessage({ type: "cancelFeatureEstimator" });
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const usingJira = jiraRadio.checked && !jiraRadio.disabled;
        const action = event.submitter?.dataset?.action === "grillMe" ? "grillMe" : "estimate";

        if (usingJira) {
          if (!jiraIssueSelect.value) {
            errorMessage.textContent = "Select a Jira item.";
            jiraIssueSelect.focus();
            return;
          }

          vscode.postMessage({
            type: "submitFeatureEstimator",
            payload: {
              action,
              source: "jira",
              issueKey: jiraIssueSelect.value
            }
          });
          return;
        }

        const details = featureDescription.value.trim();
        if (!details) {
          errorMessage.textContent = "Enter a feature description.";
          featureDescription.focus();
          return;
        }

        vscode.postMessage({
          type: "submitFeatureEstimator",
          payload: {
            action,
            source: "text",
            featureDetails: details
          }
        });
      });

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (!message) return;

        if (message.type === "featureEstimatorError") {
          errorMessage.textContent = message.payload?.message || "Unable to start this feature action.";
          return;
        }

        if (message.type === "featureEstimatorJiraLoaded") {
          const issues = message.payload?.issues || [];
          const projectKey = message.payload?.projectKey || savedProjectKey;

          jiraIssueSelect.innerHTML = "";
          if (issues.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "— No To Do Jira items found —";
            jiraIssueSelect.appendChild(option);
            jiraRadio.disabled = true;
            jiraStatus.textContent = "No To Do Jira items were found in " + projectKey + ".";
            jiraStatus.classList.add("warning");
            updateJiraHint();
            switchToTextIfNeeded();
            return;
          }

          for (const issue of issues) {
            const option = document.createElement("option");
            option.value = issue.key;
            option.textContent = issue.key + "  " + issue.summary;
            option.dataset.summary = issue.summary || "";
            option.dataset.issueType = issue.issueTypeName || "";
            option.dataset.status = issue.statusName || "";
            jiraIssueSelect.appendChild(option);
          }

          jiraRadio.disabled = false;
          jiraIssueSelect.value = issues[0].key;
          jiraStatus.textContent =
            "Loaded " + issues.length + " To Do Jira item" + (issues.length === 1 ? "" : "s") + " from " + projectKey + ".";
          jiraStatus.classList.remove("warning");
          updateJiraHint();
          syncSourceState();
          return;
        }

        if (message.type === "featureEstimatorJiraError") {
          const error = message.payload?.message || "Unable to load Jira items for estimation.";
          jiraIssueSelect.innerHTML = "";
          const option = document.createElement("option");
          option.value = "";
          option.textContent = "— Jira items unavailable —";
          jiraIssueSelect.appendChild(option);
          jiraRadio.disabled = true;
          jiraStatus.textContent = error;
          jiraStatus.classList.add("warning");
          updateJiraHint();
          switchToTextIfNeeded();
        }
      });

      setJiraCardState();
      updateJiraHint();
      syncSourceState();
      (jiraRadio.checked && !jiraRadio.disabled ? jiraIssueSelect : featureDescription).focus();
    </script>
  </body>
</html>`;
    };
    const showFeatureEstimatorDialog = async (repoRoot) => new Promise((resolve) => {
        const savedProjectKey = getSavedJiraProjectKey(repoRoot);
        const panel = vscode.window.createWebviewPanel("featureEstimator", "Feature Estimator", vscode.ViewColumn.Active, { enableScripts: true });
        panel.webview.html = renderFeatureEstimatorHtml(panel.webview, savedProjectKey);
        let availableIssues = [];
        if (savedProjectKey) {
            void (async () => {
                try {
                    const credentials = await resolveValidatedJiraCredentials(repoRoot);
                    const issues = await (0, jira_1.searchOpenTodoJiraIssuesForProject)(credentials, savedProjectKey);
                    availableIssues = issues;
                    void panel.webview.postMessage({
                        type: "featureEstimatorJiraLoaded",
                        payload: {
                            projectKey: savedProjectKey,
                            issues
                        }
                    });
                }
                catch (error) {
                    const message = error instanceof Error && isJiraCredentialsConfigurationMessage(error.message)
                        ? await showJiraCredentialsValidationError(error)
                        : error instanceof Error
                            ? error.message
                            : String(error);
                    void panel.webview.postMessage({
                        type: "featureEstimatorJiraError",
                        payload: { message }
                    });
                }
            })();
        }
        let settled = false;
        const resolveOnce = (value) => {
            if (settled)
                return;
            settled = true;
            resolve(value);
        };
        panel.onDidDispose(() => resolveOnce(undefined), undefined, context.subscriptions);
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message)
                return;
            if (message.type === "cancelFeatureEstimator") {
                panel.dispose();
                return;
            }
            if (message.type !== "submitFeatureEstimator")
                return;
            const payload = message.payload || {};
            const action = payload.action === "grillMe" ? "grillMe" : "estimate";
            const source = payload.source === "jira" ? "jira" : "text";
            if (source === "jira") {
                const issueKey = typeof payload.issueKey === "string" ? payload.issueKey.trim() : "";
                const issue = availableIssues.find((candidate) => candidate.key === issueKey);
                if (!issue) {
                    void panel.webview.postMessage({
                        type: "featureEstimatorError",
                        payload: { message: "Select a Jira item." }
                    });
                    return;
                }
                resolveOnce({ action, source: "jira", issue });
                panel.dispose();
                return;
            }
            const featureDetails = typeof payload.featureDetails === "string" ? payload.featureDetails.trim() : "";
            if (!featureDetails) {
                void panel.webview.postMessage({
                    type: "featureEstimatorError",
                    payload: { message: "Enter a feature description." }
                });
                return;
            }
            resolveOnce({ action, source: "text", featureDetails });
            panel.dispose();
        }, undefined, context.subscriptions);
    });
    const getProjectSopManualPath = (repoRoot) => path.join(repoRoot, "Resources", "sop.md");
    const validateJiraProjectKey = (value) => {
        const normalized = value.trim().toUpperCase();
        if (!normalized)
            return "Enter a Jira project key.";
        if (!/^[A-Z][A-Z0-9]+$/.test(normalized)) {
            return "Use letters and numbers only, starting with a letter.";
        }
        return undefined;
    };
    const renderJiraProjectSetupHtml = (webview, projects) => {
        const nonce = (0, settings_1.getNonce)();
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
      .instructions {
        margin: 0;
        padding-left: 18px;
        display: grid;
        gap: 6px;
        font-size: 13px;
      }
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
        <div class="section-title">Create Jira Project</div>
        <span class="hint">This uses the selected Agentic Harness command from Settings and must create a company-managed Jira Software project.</span>
        <label>
          Project Name
          <input id="create-project-name" type="text" autocomplete="off" />
        </label>
        <label>
          Project Key
          <input id="create-project-key" type="text" autocomplete="off" />
          <span class="hint">Use letters and numbers only, starting with a letter.</span>
        </label>
        <label>
          Description (optional)
          <textarea id="create-project-description"></textarea>
        </label>
        <ol class="instructions">
          <li>The Agentic Harness will create the project as company-managed.</li>
          <li>It will select "${jiraProjectHarness_1.JIRA_COMPANY_MANAGED_WORKFLOW_SCHEME}".</li>
          <li>The project key you enter here will be saved to this repository .env file automatically.</li>
        </ol>
        <div class="actions">
          <button type="button" class="primary" id="create-project-button">Create Jira Project</button>
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
      const createProjectNameInput = document.getElementById("create-project-name");
      const createProjectKeyInput = document.getElementById("create-project-key");
      const createProjectDescriptionInput = document.getElementById("create-project-description");
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
        : "No Jira projects were loaded. You can create one below.";

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
        const projectName = createProjectNameInput.value.trim();
        const projectKey = createProjectKeyInput.value.trim().toUpperCase();
        if (!projectName) {
          errorMessage.textContent = "Enter a Jira project name.";
          createProjectNameInput.focus();
          return;
        }
        if (!projectKey) {
          errorMessage.textContent = "Enter a Jira project key.";
          createProjectKeyInput.focus();
          return;
        }
        createProjectKeyInput.value = projectKey;
        vscode.postMessage({
          type: "createJiraProjectWithAgenticHarness",
          payload: {
            projectName,
            projectKey,
            description: createProjectDescriptionInput.value.trim()
          }
        });
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
        createProjectNameInput.focus();
      }
    </script>
  </body>
</html>`;
    };
    const showJiraProjectSetupDialog = async (repoRoot, credentials, projects) => new Promise((resolve) => {
        const panel = vscode.window.createWebviewPanel("jiraProjectSetup", "Set Jira Project", vscode.ViewColumn.Active, { enableScripts: true });
        panel.webview.html = renderJiraProjectSetupHtml(panel.webview, projects);
        let settled = false;
        const resolveOnce = (value) => {
            if (settled)
                return;
            settled = true;
            resolve(value);
        };
        panel.onDidDispose(() => resolveOnce(undefined), undefined, context.subscriptions);
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message)
                return;
            if (message.type === "cancelJiraProjectSetup") {
                panel.dispose();
                return;
            }
            if (message.type === "createJiraProjectWithAgenticHarness") {
                const payload = message.payload || {};
                const projectName = typeof payload.projectName === "string" ? payload.projectName.trim() : "";
                const projectKey = typeof payload.projectKey === "string" ? payload.projectKey.trim().toUpperCase() : "";
                const description = typeof payload.description === "string" ? payload.description.trim() : "";
                if (!projectName) {
                    void panel.webview.postMessage({
                        type: "jiraProjectSetupError",
                        payload: { message: "Enter a Jira project name." }
                    });
                    return;
                }
                const keyError = validateJiraProjectKey(projectKey);
                if (keyError) {
                    void panel.webview.postMessage({
                        type: "jiraProjectSetupError",
                        payload: { message: keyError }
                    });
                    return;
                }
                try {
                    await (0, jira_1.validateJiraCredentials)(credentials);
                }
                catch (error) {
                    const message = await showJiraCredentialsValidationError(error);
                    void panel.webview.postMessage({
                        type: "jiraProjectSetupError",
                        payload: { message }
                    });
                    return;
                }
                try {
                    const copiedSkillPaths = await (0, jiraProjectHarness_1.copyJiraProjectCreationSkill)(extensionRoot, repoRoot, resourceProvider);
                    (0, logger_1.logAlways)(`[jiraProjectCreate] skill locations ready: ${copiedSkillPaths.length > 0 ? copiedSkillPaths.join(", ") : "already present"}`);
                    provider.refresh();
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    void panel.webview.postMessage({
                        type: "jiraProjectSetupError",
                        payload: { message: `Failed to prepare the ${jiraProjectHarness_1.JIRA_PROJECT_CREATION_SKILL_NAME} skill: ${message}` }
                    });
                    return;
                }
                const prompt = (0, jiraProjectHarness_1.buildCreateJiraProjectAgenticHarnessPrompt)({
                    projectName,
                    projectKey,
                    description
                });
                const envPath = getRepoEnvPath(repoRoot);
                const commandLine = (0, terminal_1.buildAgenticHarnessPromptCommand)(repoRoot, prompt, "unattended");
                const taskName = `Agentic Harness Create Jira Project ${Date.now()}`;
                try {
                    await (0, terminal_1.runCommandInTaskTerminal)(taskName, commandLine, {
                        cwd: repoRoot,
                        env: (0, jiraProjectHarness_1.buildCreateJiraProjectAgenticHarnessEnvironment)(credentials)
                    });
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    void panel.webview.postMessage({
                        type: "jiraProjectSetupError",
                        payload: { message: `Failed to launch the Agentic Harness terminal: ${message}` }
                    });
                    return;
                }
                const endTaskProcessDisposable = vscode.tasks.onDidEndTaskProcess((event) => {
                    if (event.execution.task.name !== taskName) {
                        return;
                    }
                    endTaskProcessDisposable.dispose();
                    if (event.exitCode === 0) {
                        (0, utils_1.upsertEnvFileValue)(envPath, "JIRA_PROJECT_KEY", projectKey);
                        provider.refresh();
                        void vscode.window.showInformationMessage(`Saved Jira project ${projectKey} to this repository .env file after the Agentic Harness completed successfully.`);
                        return;
                    }
                    void vscode.window.showWarningMessage(`The Agentic Harness exited with code ${event.exitCode ?? "unknown"}, so JIRA_PROJECT_KEY was not saved.`);
                });
                void vscode.window.showInformationMessage(`Opened Agentic Harness to create Jira project ${projectKey}. JIRA_PROJECT_KEY will be saved after the task exits successfully.`);
                resolveOnce({ mode: "launched" });
                panel.dispose();
                return;
            }
            if (message.type !== "submitJiraProjectSetup")
                return;
            const payload = message.payload || {};
            if (payload.mode === "select") {
                const projectKey = typeof payload.projectKey === "string" ? payload.projectKey.trim().toUpperCase() : "";
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
            const projectKey = typeof payload.projectKey === "string" ? payload.projectKey.trim().toUpperCase() : "";
            const keyError = validateJiraProjectKey(projectKey);
            if (keyError) {
                void panel.webview.postMessage({
                    type: "jiraProjectSetupError",
                    payload: { message: keyError }
                });
                return;
            }
            resolveOnce({ mode: "manual", projectKey });
            panel.dispose();
        }, undefined, context.subscriptions);
    });
    const ensureSavedJiraProjectKey = async (repoRoot, credentials) => {
        let projectKey = getSavedJiraProjectKey(repoRoot);
        if (projectKey) {
            return projectKey;
        }
        let projects;
        try {
            projects = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Loading Jira projects",
                cancellable: false
            }, async () => (0, jira_1.getJiraProjects)(credentials));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Failed to load Jira projects: ${message}`);
            return undefined;
        }
        const setupSelection = await showJiraProjectSetupDialog(repoRoot, credentials, projects);
        if (!setupSelection) {
            return undefined;
        }
        if (setupSelection.mode === "launched") {
            return undefined;
        }
        if (setupSelection.mode === "select") {
            projectKey = setupSelection.projectKey;
        }
        else {
            projectKey = setupSelection.projectKey;
            void vscode.window.showInformationMessage(`Saved Jira project ${projectKey} to this repository .env file.`);
        }
        (0, utils_1.upsertEnvFileValue)(getRepoEnvPath(repoRoot), "JIRA_PROJECT_KEY", projectKey);
        provider.refresh();
        return projectKey;
    };
    const renderCreateJiraItemHtml = (webview, projectKey, issueTypes, defaultBacklogDir) => {
        const nonce = (0, settings_1.getNonce)();
        const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
        return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Create Backlog item</title>
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
      .current-branch-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 18px; font-weight: 600; }
      .current-branch-value { color: #7cc7ff; }
      .current-branch-title.is-disabled { opacity: 0.45; }
      .inline-checkbox { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 400; }
      .inline-checkbox input { width: auto; margin: 0; }
      .hint { font-size: 12px; color: var(--vscode-descriptionForeground); }
      .error { min-height: 18px; font-size: 12px; color: var(--vscode-errorForeground); }
      .actions { display: flex; justify-content: flex-end; gap: 8px; }
      button { border: 0; border-radius: 6px; padding: 8px 14px; cursor: pointer; }
      button[type="submit"] { color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
      button[type="submit"][data-action="grillMe"] { background: var(--vscode-charts-green, #2ea043); }
      button[type="submit"][data-action="grillMe"]:hover { background: color-mix(in srgb, var(--vscode-charts-green, #2ea043) 88%, black 12%); }
      button[type="button"] { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    </style>
  </head>
  <body>
    <form id="jira-item-form">
      <div class="current-branch-title" id="jira-project-title">
        <span>Jira Project: <span class="current-branch-value">${projectKey}</span></span>
        <label class="inline-checkbox">
          <input id="create-on-jira" type="checkbox" checked />
          <span>Create on JIRA</span>
        </label>
      </div>
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
      <label>
        Local Backlog Folder
        <input id="backlog-dir" type="text" autocomplete="off" value="${escapeHtml(defaultBacklogDir)}" />
        <span class="hint">Creates a matching local markdown file in this folder.</span>
      </label>
      <div class="error" id="error-message"></div>
      <div class="actions">
        <button type="button" id="cancel-button">Cancel</button>
        <button type="submit" data-action="create">Create</button>
        <button type="submit" data-action="grillMe">Grill Me</button>
      </div>
    </form>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const issueTypes = ${JSON.stringify(issueTypes.map((issueType) => issueType.name))};
      const issueTypeSelect = document.getElementById("issue-type");
      const issueNameInput = document.getElementById("issue-name");
      const issueDescriptionInput = document.getElementById("issue-description");
      const backlogDirInput = document.getElementById("backlog-dir");
      const createOnJiraInput = document.getElementById("create-on-jira");
      const jiraProjectTitle = document.getElementById("jira-project-title");
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

      const syncJiraProjectState = () => {
        jiraProjectTitle.classList.toggle("is-disabled", !createOnJiraInput.checked);
      };

      createOnJiraInput.addEventListener("change", syncJiraProjectState);

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const action = event.submitter?.dataset?.action === "grillMe" ? "grillMe" : "create";
        const payload = {
          action,
          createOnJira: createOnJiraInput.checked,
          issueType: issueTypeSelect.value,
          summary: issueNameInput.value.trim(),
          description: issueDescriptionInput.value.trim(),
          backlogDir: backlogDirInput.value.trim()
        };
        if (!payload.summary) {
          errorMessage.textContent = "Enter a Jira item name.";
          issueNameInput.focus();
          return;
        }
        if (!payload.backlogDir) {
          errorMessage.textContent = "Enter a local backlog folder.";
          backlogDirInput.focus();
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
      syncJiraProjectState();
      issueNameInput.focus();
    </script>
  </body>
</html>`;
    };
    const showCreateJiraItemDialog = async (projectKey, issueTypes, defaultBacklogDir) => new Promise((resolve) => {
        const panel = vscode.window.createWebviewPanel("createJiraItem", "Create Backlog item", vscode.ViewColumn.Active, { enableScripts: true });
        panel.webview.html = renderCreateJiraItemHtml(panel.webview, projectKey, issueTypes, defaultBacklogDir);
        let settled = false;
        const resolveOnce = (value) => {
            if (settled)
                return;
            settled = true;
            resolve(value);
        };
        panel.onDidDispose(() => resolveOnce(undefined), undefined, context.subscriptions);
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message)
                return;
            if (message.type === "cancelCreateJiraItem") {
                panel.dispose();
                return;
            }
            if (message.type !== "submitCreateJiraItem")
                return;
            const payload = message.payload || {};
            const action = payload.action === "grillMe" ? "grillMe" : "create";
            const createOnJira = payload.createOnJira !== false;
            const issueType = typeof payload.issueType === "string" ? payload.issueType.trim() : "";
            const summary = typeof payload.summary === "string" ? payload.summary.trim() : "";
            const description = typeof payload.description === "string" ? payload.description.trim() : "";
            const backlogDir = typeof payload.backlogDir === "string" ? payload.backlogDir.trim() : "";
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
            if (!backlogDir) {
                void panel.webview.postMessage({
                    type: "createJiraItemError",
                    payload: { message: "Enter a local backlog folder." }
                });
                return;
            }
            resolveOnce({ action, createOnJira, issueType, summary, description, backlogDir });
            panel.dispose();
        }, undefined, context.subscriptions);
    });
    const getAssignableAgentCommandOptions = () => {
        const config = vscode.workspace.getConfiguration("antigravity");
        return Array.from(new Set([
            (0, settings_1.getAgenticHarnessExecutionCommand)(),
            ...(0, settings_1.normalizeStringArray)(config.get("agenticHarnessExecutionCommands"))
        ]
            .map((item) => item.trim())
            .filter(Boolean)));
    };
    const showAssignJiraItemToAgentDialog = async (projectKey, issues, backlogItems, selectedIssueKey, selectedBacklogItemPath, backlogStatusMessage = "") => new Promise((resolve) => {
        const initialAgentCommand = (0, settings_1.getAgenticHarnessExecutionCommand)();
        const agentCommandOptions = getAssignableAgentCommandOptions();
        const panel = vscode.window.createWebviewPanel("assignJiraItemToAgent", "Assign Backlog Item to Agent", vscode.ViewColumn.Active, { enableScripts: true });
        panel.webview.html = (0, assignBacklogItemToAgent_1.renderAssignBacklogItemToAgentHtml)(panel.webview, issues, {
            agentCommandOptions,
            backlogItems,
            backlogStatusMessage,
            initialAgentCommand,
            projectKey,
            selectedBacklogItemPath,
            selectedIssueKey
        });
        let settled = false;
        const resolveOnce = (value) => {
            if (settled)
                return;
            settled = true;
            resolve(value);
        };
        panel.onDidDispose(() => resolveOnce(undefined), undefined, context.subscriptions);
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message)
                return;
            if (message.type === "cancelAssignJiraItemToAgent") {
                panel.dispose();
                return;
            }
            if (message.type !== "submitAssignJiraItemToAgent")
                return;
            const payload = message.payload || {};
            const action = payload.action === "grillMe" ? "grillMe" : "assign";
            const issueKey = typeof payload.issueKey === "string" ? payload.issueKey.trim() : "";
            const backlogItemPath = typeof payload.backlogItemPath === "string" ? payload.backlogItemPath.trim() : "";
            const agentCommand = typeof payload.agentCommand === "string" ? payload.agentCommand.trim() : "";
            if (!issueKey || !issues.some((issue) => issue.key === issueKey)) {
                void panel.webview.postMessage({
                    type: "assignJiraItemToAgentError",
                    payload: { message: "Select a Jira item." }
                });
                return;
            }
            if (!agentCommand) {
                void panel.webview.postMessage({
                    type: "assignJiraItemToAgentError",
                    payload: { message: "Enter an agent harness command." }
                });
                return;
            }
            resolveOnce({
                action,
                backlogItemPath,
                issueKey,
                agentCommand
            });
            panel.dispose();
        }, undefined, context.subscriptions);
    });
    const buildIssueSummaryForAgent = (originalSummary, agentLabel) => {
        const baseSummary = originalSummary.replace(/\s+- By Agent .+$/i, "").trim();
        return `${baseSummary} - By Agent ${agentLabel}`;
    };
    const buildAgentJiraLabel = (agentLabel) => `developed-by-agent-${agentLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
    const buildJiraAgentPrompt = (issue, agentLabel, backlogItem) => {
        const jiraEmail = (vscode.workspace
            .getConfiguration("antigravity")
            .get("jiraEmail") || "").trim();
        return (0, assignBacklogItemToAgent_1.buildAssignBacklogItemToAgentPrompt)(issue, agentLabel, jiraEmail, backlogItem);
    };
    const writeAgentLaunchScript = (scriptPrefix, command) => {
        const sanitizedPrefix = scriptPrefix.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "") || "agent-launch";
        const scriptDirectory = fs.mkdtempSync(path.join(os.tmpdir(), `${sanitizedPrefix}-`));
        const scriptPath = path.join(scriptDirectory, "launch.sh");
        fs.writeFileSync(scriptPath, `#!/bin/zsh\nset -e\n${command}\n`, {
            encoding: "utf8",
            mode: 0o700
        });
        return scriptPath;
    };
    const writeAgentPromptFile = (filePrefix, prompt) => {
        const sanitizedPrefix = filePrefix.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "") || "agent-prompt";
        const promptDirectory = fs.mkdtempSync(path.join(os.tmpdir(), `${sanitizedPrefix}-`));
        const promptFilePath = path.join(promptDirectory, "prompt.txt");
        fs.writeFileSync(promptFilePath, prompt, "utf8");
        return promptFilePath;
    };
    const launchAgentForJiraItem = async (repoRoot, agentLabel, issue, agentCommand, backlogItem) => {
        const prompt = buildJiraAgentPrompt(issue, agentLabel, backlogItem);
        const promptFilePath = writeAgentPromptFile(`assign-jira-item-to-agent-${agentLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, prompt);
        const command = (0, agenticHarnessCommand_1.buildAgenticHarnessFileCommandForCommand)(agentCommand, repoRoot, promptFilePath, "unattended");
        const lines = command.includes("\n")
            ? [
                `zsh ${(0, utils_1.quoteShellArg)(writeAgentLaunchScript(`antigravity-${agentLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-jira`, `cd ${(0, utils_1.quoteShellArg)(repoRoot)}\n${command}`))}`
            ]
            : [`cd ${(0, utils_1.quoteShellArg)(repoRoot)}`, command];
        (0, terminal_1.runInPersistentTerminal)(`${agentLabel}: ${issue.key}`, lines, {
            iconPath: new vscode.ThemeIcon("robot", terminal_1.CLAUDE_ACTION_COLOR),
            color: terminal_1.CLAUDE_ACTION_COLOR
        });
    };
    const execInRepo = async (command, cwd) => new Promise((resolve, reject) => {
        (0, child_process_1.exec)(command, { cwd }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr.trim() || stdout.trim() || error.message));
                return;
            }
            resolve(stdout);
        });
    });
    const parseGitNameStatus = (output) => output
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
    const describeCommitPath = (filePath) => {
        const normalized = filePath.replace(/\\/g, "/");
        const segments = normalized.split("/").filter(Boolean);
        if (segments.length === 0)
            return "project files";
        const fileName = segments[segments.length - 1];
        const parent = segments.length > 1 ? segments[segments.length - 2] : undefined;
        if (!parent || parent === "." || fileName === parent)
            return fileName;
        return `${parent}/${fileName}`;
    };
    const buildGeneratedCommitMessage = async (repoRoot) => {
        const statusOutput = await execInRepo("git diff --cached --name-status --find-renames", repoRoot);
        const entries = parseGitNameStatus(statusOutput);
        if (entries.length === 0)
            return "";
        if (entries.length === 1) {
            const [entry] = entries;
            const subject = describeCommitPath(entry.path);
            if (entry.status.startsWith("A"))
                return `Add ${subject}`;
            if (entry.status.startsWith("D"))
                return `Remove ${subject}`;
            if (entry.status.startsWith("R") && entry.previousPath) {
                return `Rename ${describeCommitPath(entry.previousPath)} to ${describeCommitPath(entry.path)}`;
            }
            return `Update ${subject}`;
        }
        const firstSegmentCounts = new Map();
        for (const entry of entries) {
            const [firstSegment] = entry.path.replace(/\\/g, "/").split("/");
            if (!firstSegment)
                continue;
            firstSegmentCounts.set(firstSegment, (firstSegmentCounts.get(firstSegment) ?? 0) + 1);
        }
        const dominantArea = [...firstSegmentCounts.entries()]
            .sort((left, right) => right[1] - left[1])[0]?.[0];
        const prefixSet = new Set(entries.map((entry) => entry.status.charAt(0)));
        if (dominantArea && firstSegmentCounts.size === 1) {
            if (prefixSet.size === 1 && prefixSet.has("A"))
                return `Add ${dominantArea} files`;
            if (prefixSet.size === 1 && prefixSet.has("D"))
                return `Remove ${dominantArea} files`;
            return `Update ${dominantArea} files`;
        }
        if (prefixSet.size === 1 && prefixSet.has("A"))
            return `Add ${entries.length} files`;
        if (prefixSet.size === 1 && prefixSet.has("D"))
            return `Remove ${entries.length} files`;
        return `Update ${entries.length} files`;
    };
    const AUTOMATED_COMMIT_PROTECTED_PATHS = new Set([".env", "config/.env"]);
    const normalizeGitPath = (filePath) => filePath
        .trim()
        .replace(/^"(.*)"$/, "$1")
        .replace(/\\/g, "/")
        .replace(/^\.\/+/, "");
    const isProtectedAutomatedCommitPath = (filePath) => AUTOMATED_COMMIT_PROTECTED_PATHS.has(normalizeGitPath(filePath));
    const parseGitStatusPorcelain = (output) => output
        .split(/\r?\n/)
        .map((line) => line.replace(/\r/g, ""))
        .filter((line) => line.length >= 4)
        .map((line) => {
        const indexStatus = line.charAt(0);
        const workTreeStatus = line.charAt(1);
        const pathSection = line.slice(3).trim();
        const renameSeparator = " -> ";
        const isRename = (indexStatus === "R" || workTreeStatus === "R" || indexStatus === "C" || workTreeStatus === "C") &&
            pathSection.includes(renameSeparator);
        if (isRename) {
            const [previousPath = "", nextPath = ""] = pathSection.split(renameSeparator);
            return {
                indexStatus,
                workTreeStatus,
                path: nextPath,
                previousPath
            };
        }
        return {
            indexStatus,
            workTreeStatus,
            path: pathSection
        };
    })
        .filter((entry) => entry.path.length > 0);
    const hasNonProtectedUncommittedChanges = async (repoRoot) => {
        const statusOutput = await execInRepo("git status --porcelain", repoRoot);
        return parseGitStatusPorcelain(statusOutput).some((entry) => {
            const candidatePaths = [entry.path, entry.previousPath].filter((value) => Boolean(value));
            return candidatePaths.some((candidatePath) => !isProtectedAutomatedCommitPath(candidatePath));
        });
    };
    const getHeadCommitSha = async (repoRoot) => {
        try {
            return (await execInRepo("git rev-parse HEAD", repoRoot)).trim();
        }
        catch {
            return "";
        }
    };
    const waitForTaskProcessExit = async (taskExecution, taskName) => new Promise((resolve) => {
        const disposable = vscode.tasks.onDidEndTaskProcess((event) => {
            if (event.execution === taskExecution || event.execution.task.name === taskName) {
                disposable.dispose();
                resolve(event.exitCode);
            }
        });
    });
    const runCommitChangesFlow = async (repoRoot, options) => {
        await focusSourceControlChanges();
        await vscode.workspace.saveAll(false);
        const statusOutput = await execInRepo("git status --porcelain", repoRoot);
        if (statusOutput.trim().length === 0) {
            (0, logger_1.logAlways)("[commitChanges] no changes detected");
            return { kind: "no_changes" };
        }
        const shouldUseAgenticHarness = options.forceAgenticHarness === true || (0, settings_1.getUseAgentForGithubRepositoryManagement)();
        if (shouldUseAgenticHarness) {
            const prompt = "commit all changes and automatically generate the commit message";
            const taskName = `Agentic Harness Commit ${Date.now()}`;
            const preCommitHead = await getHeadCommitSha(repoRoot);
            (0, logger_1.logAlways)("[commitChanges] delegating commit to Agentic Harness task");
            const taskExecution = await (0, terminal_1.runCommandInTaskTerminal)(taskName, (0, terminal_1.buildLightAgenticHarnessPromptCommand)(repoRoot, prompt, "prompt"), { cwd: repoRoot });
            if (!options.awaitAgenticHarness) {
                return { kind: "delegated" };
            }
            const exitCode = await waitForTaskProcessExit(taskExecution, taskName);
            if (exitCode !== 0) {
                return {
                    kind: "failed",
                    message: `The Agentic Harness commit exited with code ${exitCode ?? "unknown"}.`
                };
            }
            const postCommitHead = await getHeadCommitSha(repoRoot);
            const remainingStatusOutput = await execInRepo("git status --porcelain", repoRoot);
            const blockingChangesRemain = await hasNonProtectedUncommittedChanges(repoRoot);
            provider.refresh();
            if (postCommitHead && postCommitHead !== preCommitHead) {
                if (blockingChangesRemain) {
                    return {
                        kind: "failed",
                        message: "The Agentic Harness commit finished, but some non-protected changes are still uncommitted."
                    };
                }
                const latestSubject = (await execInRepo("git log -1 --pretty=%s", repoRoot)).trim();
                return {
                    kind: "committed",
                    message: latestSubject || "Agentic Harness commit"
                };
            }
            if (blockingChangesRemain) {
                return {
                    kind: "failed",
                    message: "The Agentic Harness finished without creating a commit for the remaining changes."
                };
            }
            if (remainingStatusOutput.trim().length > 0) {
                return { kind: "nothing_committable" };
            }
            return {
                kind: "failed",
                message: "The Agentic Harness finished without creating a commit."
            };
        }
        const secretCandidateOutput = await execInRepo("git status --porcelain -- .env config/.env", repoRoot);
        if (secretCandidateOutput.trim().length > 0) {
            (0, logger_1.logAlways)("[commitChanges] excluding .env/config/.env from automated commit");
            void vscode.window.showWarningMessage("Excluded .env and config/.env from this automated commit for safety.");
        }
        await execInRepo("git add -A -- . && git rm -q --cached --ignore-unmatch .env config/.env", repoRoot);
        const repository = await getGitRepository(repoRoot);
        if (!repository) {
            (0, logger_1.logAlways)("[commitChanges] ERROR: VS Code Git repository not found");
            return {
                kind: "failed",
                message: "VS Code Git integration could not find the current repository."
            };
        }
        const commitMessage = await buildGeneratedCommitMessage(repoRoot);
        if (!commitMessage.trim()) {
            (0, logger_1.logAlways)("[commitChanges] no commit message generated");
            return { kind: "nothing_committable" };
        }
        (0, logger_1.logAlways)(`[commitChanges] generated message: ${commitMessage}`);
        repository.inputBox.value = commitMessage;
        await repository.commit(commitMessage, { all: false });
        provider.refresh();
        (0, logger_1.logAlways)("[commitChanges] commit completed");
        return {
            kind: "committed",
            message: commitMessage
        };
    };
    const getGitApi = async () => {
        const gitExtension = vscode.extensions.getExtension("vscode.git");
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
    const getGitRepository = async (repoRoot) => {
        const api = await getGitApi();
        const repoUri = vscode.Uri.file(repoRoot);
        const fromApi = api.getRepository?.(repoUri);
        if (fromApi)
            return fromApi;
        const normalizedRepoRoot = path.normalize(repoUri.fsPath);
        const resolvedRepoRoot = (() => {
            try {
                return fs.realpathSync.native(repoUri.fsPath);
            }
            catch {
                return normalizedRepoRoot;
            }
        })();
        return api.repositories.find((repository) => {
            const candidatePath = path.normalize(repository.rootUri.fsPath);
            if (candidatePath === normalizedRepoRoot)
                return true;
            try {
                return fs.realpathSync.native(repository.rootUri.fsPath) === resolvedRepoRoot;
            }
            catch {
                return false;
            }
        });
    };
    const watchGitRepositoriesForTreeRefresh = async () => {
        try {
            const api = await getGitApi();
            const watchedRepoRoots = new Set();
            const watchRepository = (repository) => {
                if (!repository.state)
                    return;
                const repoKey = path.normalize(repository.rootUri.fsPath);
                if (watchedRepoRoots.has(repoKey))
                    return;
                watchedRepoRoots.add(repoKey);
                context.subscriptions.push(repository.state.onDidChange(() => {
                    provider.refresh();
                }));
            };
            for (const repository of api.repositories) {
                watchRepository(repository);
            }
            if (api.onDidOpenRepository) {
                context.subscriptions.push(api.onDidOpenRepository((repository) => {
                    watchRepository(repository);
                    provider.refresh();
                }));
            }
            if (api.onDidCloseRepository) {
                context.subscriptions.push(api.onDidCloseRepository(() => {
                    provider.refresh();
                }));
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            (0, logger_1.log)(`[activate] Git tree refresh watcher unavailable: ${message}`);
        }
    };
    const focusSourceControlChanges = async () => {
        await vscode.commands.executeCommand("workbench.view.scm");
        try {
            await vscode.commands.executeCommand("workbench.scm.action.focusNextResourceGroup");
        }
        catch {
            // Focusing the SCM view is sufficient if the resource-group command is unavailable.
        }
    };
    const getAvailablePullRequestBranches = async (repoRoot) => {
        const stdout = await execInRepo("git for-each-ref --format='%(refname:short)' refs/remotes/origin", repoRoot);
        return stdout
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .filter((line) => line !== "origin/HEAD")
            .filter((line) => line !== "origin/main")
            .map((line) => line.replace(/^origin\//, ""))
            .sort((a, b) => a.localeCompare(b));
    };
    const getCurrentBranchName = async (repoRoot) => {
        const stdout = await execInRepo("git branch --show-current", repoRoot);
        const branchName = stdout.trim();
        return branchName || "detached HEAD";
    };
    const getAvailableCheckoutBranches = async (repoRoot) => {
        const stdout = await execInRepo("git for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin/main", repoRoot);
        const branches = new Set(stdout
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .filter((line) => line !== "origin/HEAD")
            .map((line) => line.replace(/^origin\//, "")));
        return Array.from(branches).sort((a, b) => {
            if (a === "main")
                return -1;
            if (b === "main")
                return 1;
            return a.localeCompare(b);
        });
    };
    const renderReviewPullRequestHtml = (webview, branches) => {
        const nonce = (0, settings_1.getNonce)();
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
    const showReviewPullRequestDialog = async (branches) => new Promise((resolve) => {
        const panel = vscode.window.createWebviewPanel("reviewPullRequest", "Review a Pull Request", vscode.ViewColumn.Active, { enableScripts: true });
        panel.webview.html = renderReviewPullRequestHtml(panel.webview, branches);
        let settled = false;
        const resolveOnce = (value) => {
            if (settled)
                return;
            settled = true;
            resolve(value);
        };
        panel.onDidDispose(() => resolveOnce(undefined), undefined, context.subscriptions);
        panel.webview.onDidReceiveMessage((message) => {
            if (!message)
                return;
            if (message.type === "cancelReviewPullRequest") {
                panel.dispose();
                return;
            }
            if (message.type !== "submitReviewPullRequest")
                return;
            const branchName = typeof message.payload?.branchName === "string" ? message.payload.branchName : "";
            if (!branchName)
                return;
            resolveOnce(branchName);
            panel.dispose();
        }, undefined, context.subscriptions);
    });
    const renderCheckoutBranchHtml = (webview, currentBranch, branches) => {
        const nonce = (0, settings_1.getNonce)();
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
    const showCheckoutBranchDialog = async (currentBranch, branches) => new Promise((resolve) => {
        const panel = vscode.window.createWebviewPanel("checkoutBranch", `Current Branch: ${currentBranch}`, vscode.ViewColumn.Active, { enableScripts: true });
        panel.webview.html = renderCheckoutBranchHtml(panel.webview, currentBranch, branches);
        let settled = false;
        const resolveOnce = (value) => {
            if (settled)
                return;
            settled = true;
            resolve(value);
        };
        panel.onDidDispose(() => resolveOnce(undefined), undefined, context.subscriptions);
        panel.webview.onDidReceiveMessage((message) => {
            if (!message)
                return;
            if (message.type === "cancelCheckoutBranch") {
                panel.dispose();
                return;
            }
            if (message.type !== "submitCheckoutBranch")
                return;
            const branchName = typeof message.payload?.branchName === "string" ? message.payload.branchName : "";
            if (!branchName)
                return;
            resolveOnce(branchName);
            panel.dispose();
        }, undefined, context.subscriptions);
    });
    const prepareCommitBeforeCheckout = async (repoRoot, targetBranch) => {
        const statusOutput = await execInRepo("git status --porcelain", repoRoot);
        if (statusOutput.trim().length === 0)
            return true;
        const selection = await vscode.window.showWarningMessage(`You have uncommitted changes that could be overwritten when checking out ${targetBranch}. Commit them with a message or cancel the checkout.`, { modal: true }, "Commit Changes", "Discard All Changes");
        if (selection === "Commit Changes") {
            const commitMessage = await vscode.window.showInputBox({
                title: "Commit Changes Before Checkout",
                prompt: "Enter a commit message for the uncommitted changes.",
                ignoreFocusOut: true,
                validateInput: (value) => value.trim().length === 0 ? "Commit message is required." : undefined
            });
            if (commitMessage === undefined)
                return false;
            await execInRepo(`git add -A && git commit -m ${(0, utils_1.quoteShellArg)(commitMessage.trim())}`, repoRoot);
            return true;
        }
        if (selection !== "Discard All Changes")
            return false;
        const confirmDiscard = await vscode.window.showWarningMessage(`Warning: you are going to lose all uncommitted and untracked changes before checking out ${targetBranch}. Are you sure?`, { modal: true }, { title: "No", isCloseAffordance: true }, { title: "Yes, Discard Changes" });
        if (confirmDiscard?.title !== "Yes, Discard Changes")
            return false;
        await execInRepo("git reset --hard HEAD && git clean -fd", repoRoot);
        return true;
    };
    context.subscriptions.push(vscode.window.registerTreeDataProvider("antigravityView", provider));
    void watchGitRepositoriesForTreeRefresh();
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openSettings", async () => {
        const panel = vscode.window.createWebviewPanel("antigravitySettings", "Antigravity Settings", vscode.ViewColumn.Active, { enableScripts: true });
        panel.webview.html = (0, settings_1.renderAntigravitySettingsHtml)(panel.webview);
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message || message.type !== "applySettings")
                return;
            const payload = message.payload || {};
            const values = payload.values || {};
            const target = payload.target === "workspace" && vscode.workspace.workspaceFolders
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
                        .filter((item) => typeof item === "string")
                        .map((item) => item.trim())
                        .filter((item) => item.length > 0);
                    await config.update(key, normalized, target);
                    continue;
                }
                const normalized = typeof rawValue === "string" ? rawValue.trim() : "";
                if (normalized === "") {
                    await config.update(key, undefined, target);
                }
                else {
                    await config.update(key, normalized, target);
                }
            }
            provider.refresh();
            void vscode.window.showInformationMessage("Antigravity settings updated.");
        }, undefined, context.subscriptions);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openHelpDoc", async () => {
        let helpDocPath;
        try {
            helpDocPath = await resourceProvider.ensureFile("help.md");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Failed to download the Task Runner help document: ${message}`);
            return;
        }
        await vscode.commands.executeCommand("markdown.showPreview", vscode.Uri.file(helpDocPath));
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.runClaudeAgent", async (agentName) => {
        (0, logger_1.log)(`[runClaudeAgent] agentName: ${agentName}`);
        if (!agentName) {
            (0, logger_1.log)(`[runClaudeAgent] ERROR: agent name missing`);
            void vscode.window.showErrorMessage("Agent name is missing.");
            return;
        }
        const rootPath = (0, utils_1.getRootPath)();
        const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : process.cwd();
        (0, logger_1.log)(`[runClaudeAgent] repoRoot: ${repoRoot}`);
        const runString = `claude --agent ${(0, utils_1.quoteShellArg)(agentName)}`;
        (0, logger_1.logAlways)(`[runClaudeAgent] runString: ${runString}`);
        (0, terminal_1.runInPersistentTerminal)(`Agent: ${agentName}`, [
            `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
            runString
        ], {
            iconPath: new vscode.ThemeIcon("robot", terminal_1.CLAUDE_ACTION_COLOR),
            color: terminal_1.CLAUDE_ACTION_COLOR
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.runAgent", async (agentName, filePath) => {
        (0, logger_1.log)(`[runAgent] agentName: ${agentName}, filePath: ${filePath}`);
        if (!agentName) {
            (0, logger_1.log)(`[runAgent] ERROR: agent name missing`);
            void vscode.window.showErrorMessage("Agent name is missing.");
            return;
        }
        if (!filePath || !fs.existsSync(filePath)) {
            (0, logger_1.log)(`[runAgent] ERROR: agent file not found: ${filePath}`);
            void vscode.window.showErrorMessage("Agent file not found.");
            return;
        }
        (0, logger_1.log)(`[runAgent] running agent`);
        await (0, scripts_1.runAgent)(agentName, filePath);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openAgent", async (filePath) => {
        if (!filePath || !fs.existsSync(filePath)) {
            void vscode.window.showErrorMessage("Agent file not found.");
            return;
        }
        await (0, scripts_1.openFile)(filePath);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.copyPath", async (item) => {
        const filePath = item?.filePath;
        if (!filePath) {
            void vscode.window.showErrorMessage("No path available.");
            return;
        }
        await vscode.env.clipboard.writeText(filePath);
        void vscode.window.showInformationMessage(`Copied: ${filePath}`);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openPath", async (item) => {
        const filePath = item?.filePath;
        if (!filePath || !fs.existsSync(filePath)) {
            void vscode.window.showErrorMessage("Path not found.");
            return;
        }
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            await vscode.env.openExternal(vscode.Uri.file(filePath));
        }
        else {
            await (0, scripts_1.openFile)(filePath);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.addToProject", async (item) => {
        const filePath = item?.filePath;
        if (!filePath || !fs.existsSync(filePath)) {
            void vscode.window.showErrorMessage("Path not found.");
            return;
        }
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const projectRoot = (0, utils_1.getRepoRoot)(rootPath);
        try {
            const sourceFolder = (0, deployAgenticLib_1.resolveDeployAgenticLibSourceFolder)(filePath);
            await (0, scripts_1.runRepoScript)(deployAgenticLib_1.DEPLOY_AGENTIC_LIB_TO_PROJECT_SCRIPT_NAME, [sourceFolder], {
                cwd: projectRoot,
                scriptDir: path.join(extensionRoot, "scripts")
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Failed to add folder to project: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.addToAgent", async (item) => {
        const filePath = item?.filePath;
        if (!filePath || !fs.existsSync(filePath)) {
            void vscode.window.showErrorMessage("Path not found.");
            return;
        }
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const projectRoot = (0, utils_1.getRepoRoot)(rootPath);
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
        }
        catch {
            // path doesn't exist at all
        }
        if (linkExists) {
            void vscode.window.showErrorMessage(`"${linkName}" already exists in .agent.`);
            return;
        }
        try {
            fs.symlinkSync(filePath, linkPath);
            void vscode.window.showInformationMessage(`Symlink created: .agent/${linkName} → ${filePath}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Failed to create symlink: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.addToCustomSkills", async (item) => {
        const filePath = item?.filePath;
        if (!filePath || !fs.existsSync(filePath)) {
            void vscode.window.showErrorMessage("Path not found.");
            return;
        }
        // If item is a SKILL.md file, symlink its parent folder; if it's a folder, symlink it directly
        const stat = fs.statSync(filePath);
        const skillSource = stat.isDirectory() ? filePath : path.dirname(filePath);
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const projectRoot = (0, utils_1.getRepoRoot)(rootPath);
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
        }
        catch {
            // path doesn't exist at all
        }
        if (linkExists) {
            void vscode.window.showErrorMessage(`"${linkName}" already exists in .agent/skills.`);
            return;
        }
        try {
            fs.symlinkSync(skillSource, linkPath);
            void vscode.window.showInformationMessage(`Symlink created: .agent/skills/${linkName} → ${skillSource}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Failed to create symlink: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.addToCustomAgents", async (item) => {
        const filePath = item?.filePath;
        if (!filePath || !fs.existsSync(filePath)) {
            void vscode.window.showErrorMessage("Path not found.");
            return;
        }
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const projectRoot = (0, utils_1.getRepoRoot)(rootPath);
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
        }
        catch {
            // path doesn't exist at all
        }
        if (linkExists) {
            void vscode.window.showErrorMessage(`"${linkName}" already exists in .agent/agents.`);
            return;
        }
        try {
            fs.symlinkSync(agentSource, linkPath);
            void vscode.window.showInformationMessage(`Symlink created: .agent/agents/${linkName} → ${agentSource}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Failed to create symlink: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.enablePlugin", async (item) => {
        const pluginName = item?.filePath;
        if (!pluginName)
            return;
        await (0, terminal_1.runInSecondaryTerminal)([`claude plugin enable ${(0, utils_1.quoteShellArg)(pluginName)}`]);
        setTimeout(() => provider.refresh(), 1500);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.disablePlugin", async (item) => {
        const pluginName = item?.filePath;
        if (!pluginName)
            return;
        await (0, terminal_1.runInSecondaryTerminal)([`claude plugin disable ${(0, utils_1.quoteShellArg)(pluginName)}`]);
        setTimeout(() => provider.refresh(), 1500);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.runWorkflow", async (filePath) => {
        (0, logger_1.log)(`[runWorkflow] filePath: ${filePath}`);
        if (!filePath || !fs.existsSync(filePath)) {
            (0, logger_1.log)(`[runWorkflow] ERROR: workflow file not found: ${filePath}`);
            void vscode.window.showErrorMessage("Workflow file not found.");
            return;
        }
        (0, logger_1.log)(`[runWorkflow] running workflow`);
        await (0, scripts_1.runWorkflow)(filePath);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openClaudeTerminal", async () => {
        (0, logger_1.log)(`[openClaudeTerminal] triggered`);
        try {
            const rootPath = (0, utils_1.getRootPath)();
            if (!rootPath) {
                (0, logger_1.log)(`[openClaudeTerminal] ERROR: rootPath not set`);
                void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
                return;
            }
            const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
            (0, logger_1.log)(`[openClaudeTerminal] repoRoot: ${repoRoot}`);
            const baseUrl = await (0, settings_1.readClaudeAnthropicBaseUrl)(repoRoot);
            if ((0, settings_1.isLocalLiteLLMBaseUrl)(baseUrl)) {
                await vscode.commands.executeCommand("antigravity.runLiteLLMOpenAI");
                const ready = await (0, utils_1.waitForUrlReady)(settings_1.LOCAL_LITELLM_READY_URL);
                if (!ready) {
                    void vscode.window.showErrorMessage(`liteLLM did not become ready at ${settings_1.LOCAL_LITELLM_READY_URL}.`);
                    return;
                }
            }
            await (0, terminal_1.openCommandInExternalTerminal)(repoRoot, "claude");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Claude Terminal failed: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openOllamaClaudeTerminal", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        (0, terminal_1.runInPersistentTerminal)((0, terminal_1.getAgentTerminalName)(), [`cd ${(0, utils_1.quoteShellArg)(repoRoot)}`, "ollama launch claude"], {
            iconPath: new vscode.ThemeIcon("robot", terminal_1.CLAUDE_ACTION_COLOR),
            color: terminal_1.CLAUDE_ACTION_COLOR
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openOpenClaudeTerminal", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        (0, terminal_1.runInPersistentTerminal)((0, terminal_1.getAgentTerminalName)(), [`cd ${(0, utils_1.quoteShellArg)(repoRoot)}`, "openclaude"], {
            iconPath: new vscode.ThemeIcon("robot", terminal_1.CLAUDE_ACTION_COLOR),
            color: terminal_1.CLAUDE_ACTION_COLOR
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.setClaudeModel", async () => {
        const routerConfigPath = path.join(os.homedir(), ".claude", "routerconfig.json");
        if (!fs.existsSync(routerConfigPath)) {
            const rootPath = (0, utils_1.getRootPath)();
            const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : undefined;
            const repTemplatePath = repoRoot ? path.join(repoRoot, "routerconfig.example.json") : undefined;
            const templatePath = (repTemplatePath && fs.existsSync(repTemplatePath))
                ? repTemplatePath
                : path.join(extensionRoot, "routerconfig.example.json");
            if (fs.existsSync(templatePath)) {
                fs.mkdirSync(path.dirname(routerConfigPath), { recursive: true });
                fs.copyFileSync(templatePath, routerConfigPath);
                await vscode.window.showTextDocument(vscode.Uri.file(routerConfigPath));
            }
            else {
                void vscode.window.showErrorMessage("Could not create ~/.claude/routerconfig.json: template routerconfig.example.json not found.");
            }
            return;
        }
        const config = await (0, settings_1.loadOpenRouterConfig)();
        if (!config)
            return;
        const routers = (0, settings_1.normalizeStringArray)(config.routers);
        if (routers.length === 0) {
            void vscode.window.showErrorMessage("routerconfig.json is missing a routers array.");
            return;
        }
        const panel = vscode.window.createWebviewPanel("antigravitySetClaudeModel", "Set Claude Model", vscode.ViewColumn.Active, { enableScripts: true });
        const claudeSettings = await (0, settings_1.loadClaudeSettings)();
        panel.webview.html = (0, settings_1.renderClaudeModelConfigHtml)(panel.webview, config, claudeSettings);
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message || message.type !== "applyClaudeModel")
                return;
            const { router, model, effortLevel, internalBehaviour } = message.payload || {};
            if (typeof router !== "string" ||
                typeof model !== "string" ||
                typeof effortLevel !== "string" ||
                typeof internalBehaviour !== "string") {
                void vscode.window.showErrorMessage("Invalid Claude model selection.");
                return;
            }
            const baseSettings = (0, settings_1.getRouterSettings)(config, router);
            if (!baseSettings) {
                void vscode.window.showErrorMessage(`routerconfig.json is missing ${router}-settings configuration.`);
                return;
            }
            const settings = baseSettings;
            const missingKeys = [];
            const mandatory = new Set((settings.mandatory_params || []).map((value) => value.trim()));
            if (mandatory.has("api_key") && !settings.apikey)
                missingKeys.push("api_key");
            if (mandatory.has("auth_token") && !settings.auth_token)
                missingKeys.push("auth_token");
            if (missingKeys.length > 0) {
                void vscode.window.showErrorMessage(`Missing ${missingKeys.join(", ")} for ${router}. ` +
                    "Set it in ~/.claude/routerconfig.json.");
                return;
            }
            const rootPath = (0, utils_1.getRootPath)();
            if (!rootPath) {
                void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
                return;
            }
            const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
            const command = (0, utils_1.quoteShellArg)(path.join(extensionRoot, "src", "Switch-ClaudeCode-Model.sh")) +
                ` --model ${(0, utils_1.quoteShellArg)(model)}` +
                ` --baseurl ${(0, utils_1.quoteShellArg)(settings.baseurl)}` +
                ` --auth-token ${(0, utils_1.quoteShellArg)(settings.auth_token)}` +
                ` --api-key ${(0, utils_1.quoteShellArg)(settings.apikey)}` +
                ` --effort-level ${(0, utils_1.quoteShellArg)(effortLevel)}` +
                ` --internal-model ${(0, utils_1.quoteShellArg)(internalBehaviour)}`;
            const commands = [`cd ${(0, utils_1.quoteShellArg)(repoRoot)}`, command];
            const postRun = settings.post_run?.trim();
            const toolRunCommand = postRun ? (0, settings_1.getToolRunCommand)(config, postRun) : undefined;
            if (postRun && !toolRunCommand) {
                commands.push(`nohup sh -c ${(0, utils_1.quoteShellArg)(postRun)} >/dev/null 2>&1 &`);
            }
            await (0, terminal_1.runInSecondaryTerminal)(commands);
            if (toolRunCommand) {
                await (0, terminal_1.runInSecondaryTerminal)([`cd ${(0, utils_1.quoteShellArg)(repoRoot)}`, toolRunCommand]);
            }
            panel.dispose();
        }, undefined, context.subscriptions);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.setupWorkspace", async () => {
        (0, logger_1.showOutputChannel)();
        (0, logger_1.logAlways)("[Setup Workspace] Command triggered");
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            (0, logger_1.logAlways)("[Setup Workspace] ERROR: No workspace folder is open");
            void vscode.window.showErrorMessage("No workspace folder is open.");
            return;
        }
        const repoRoot = workspaceRoot;
        const workspaceDir = (0, utils_1.getWorkspaceProjectPath)(repoRoot);
        (0, logger_1.logAlways)(`[Setup Workspace] workspaceDir: ${workspaceDir}`);
        let projectTemplates;
        try {
            projectTemplates = await (0, projectTemplates_1.loadProjectTemplates)(path.join(extensionRoot, "Resources"), resourceProvider);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            (0, logger_1.logAlways)(`[Setup Workspace] ERROR loading templates: ${message}`);
            void vscode.window.showErrorMessage(`Unable to load Resources/project-templates.json: ${message}`);
            return;
        }
        if (projectTemplates.length === 0) {
            (0, logger_1.logAlways)("[Setup Workspace] ERROR: No valid project templates found");
            void vscode.window.showErrorMessage("Resources/project-templates.json does not contain any valid project templates.");
            return;
        }
        const selectedTemplate = await showSetupWorkspaceDialog(workspaceDir, projectTemplates);
        if (!selectedTemplate) {
            (0, logger_1.logAlways)("[Setup Workspace] Selection cancelled");
            return;
        }
        fs.mkdirSync(workspaceDir, { recursive: true });
        let createdSupportPaths;
        try {
            createdSupportPaths = await (0, projectTemplates_1.ensureSetupWorkspaceDirectories)(workspaceDir);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            (0, logger_1.logAlways)(`[Setup Workspace] ERROR preparing support folders: ${message}`);
            void vscode.window.showErrorMessage(`Failed to prepare workspace support folders in ${workspaceDir}: ${message}`);
            return;
        }
        (0, logger_1.logAlways)(`[Setup Workspace] support folders ready in ${workspaceDir}: ${createdSupportPaths.length > 0 ? createdSupportPaths.join(", ") : "already present"}`);
        const prompt = (0, projectTemplates_1.buildSetupWorkspacePrompt)(selectedTemplate, workspaceDir);
        const commandLine = (0, terminal_1.buildAgenticHarnessPromptCommand)(workspaceDir, prompt, "unattended");
        const taskName = `Agentic Harness Setup Workspace ${Date.now()}`;
        try {
            await (0, terminal_1.runCommandInTaskTerminal)(taskName, commandLine, { cwd: workspaceDir });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            (0, logger_1.logAlways)(`[Setup Workspace] ERROR launching harness: ${message}`);
            void vscode.window.showErrorMessage(`Failed to launch the Agentic Harness terminal: ${message}`);
            return;
        }
        (0, logger_1.logAlways)(`[Setup Workspace] Opened harness for template ${selectedTemplate.name} in ${workspaceDir}`);
        void vscode.window.showInformationMessage(`Opened Agentic Harness to download ${selectedTemplate.name} into ${workspaceDir}.`);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.updateWorkspaceAgentsMd", async () => {
        (0, logger_1.showOutputChannel)();
        (0, logger_1.logAlways)("[updateWorkspaceAgentsMd] Command triggered");
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            (0, logger_1.logAlways)("[updateWorkspaceAgentsMd] ERROR: No workspace folder is open");
            void vscode.window.showErrorMessage("No workspace folder is open.");
            return;
        }
        const repoRoot = workspaceRoot;
        const workspaceDir = (0, utils_1.getWorkspaceProjectPath)(repoRoot);
        const agentsFilePath = path.join(workspaceDir, "AGENTS.md");
        if (!fs.existsSync(agentsFilePath)) {
            (0, logger_1.logAlways)(`[updateWorkspaceAgentsMd] ERROR: Missing AGENTS.md at ${agentsFilePath}`);
            void vscode.window.showErrorMessage(`AGENTS.md was not found at ${agentsFilePath}. Create or restore it before running Update AGENTS.md.`);
            return;
        }
        const taskName = `Agentic Harness Update AGENTS.md ${Date.now()}`;
        const promptFilePath = await (0, projectTemplates_1.buildUpdateAgentsMdPromptFilePath)(extensionRoot, resourceProvider);
        const commandLine = (0, terminal_1.buildAgenticHarnessFileCommand)(workspaceDir, promptFilePath, "unattended");
        try {
            await (0, terminal_1.runCommandInTaskTerminal)(taskName, commandLine, { cwd: workspaceDir });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            (0, logger_1.logAlways)(`[updateWorkspaceAgentsMd] ERROR launching harness: ${message}`);
            void vscode.window.showErrorMessage(`Failed to launch the Agentic Harness terminal: ${message}`);
            return;
        }
        (0, logger_1.logAlways)(`[updateWorkspaceAgentsMd] Opened harness for ${agentsFilePath}`);
        void vscode.window.showInformationMessage(`Opened Agentic Harness to update AGENTS.md in ${workspaceDir}.`);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.auditSecretsAndVariables", async () => {
        (0, logger_1.showOutputChannel)();
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            void vscode.window.showErrorMessage("No workspace folder is open.");
            return;
        }
        await (0, secrets_audit_1.runSecretsAudit)(workspaceRoot);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.workspaceSetup", async () => {
        (0, logger_1.showOutputChannel)();
        (0, logger_1.logAlways)("[Workspace Setup] Command triggered");
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            (0, logger_1.logAlways)("[Workspace Setup] ERROR: No workspace folder is open");
            void vscode.window.showErrorMessage("No workspace folder is open.");
            return;
        }
        (0, logger_1.logAlways)(`[Workspace Setup] workspaceRoot: ${workspaceRoot}`);
        const repoRoot = workspaceRoot;
        const workspaceDir = (0, utils_1.getWorkspaceProjectPath)(repoRoot);
        (0, logger_1.logAlways)(`[Workspace Setup] workspaceDir: ${workspaceDir}`);
        if (!fs.existsSync(workspaceDir)) {
            (0, logger_1.logAlways)(`[Workspace Setup] workspaceDir does not exist, creating: ${workspaceDir}`);
            fs.mkdirSync(path.join(workspaceDir, "scripts"), { recursive: true });
        }
        const scriptPath = path.join(extensionRoot, "src", "workspace-setup.sh");
        (0, logger_1.logAlways)(`[Workspace Setup] scriptPath: ${scriptPath}`);
        if (!fs.existsSync(scriptPath)) {
            (0, logger_1.logAlways)(`[Workspace Setup] ERROR: workspace-setup.sh not found at: ${scriptPath}`);
            void vscode.window.showErrorMessage(`workspace-setup.sh not found in extension at: ${scriptPath}`);
            return;
        }
        (0, logger_1.logAlways)(`[Workspace Setup] workspace-setup.sh found, making executable`);
        await fs.promises.chmod(scriptPath, 0o755).catch((e) => (0, logger_1.logAlways)(`[Workspace Setup] chmod failed: ${e}`));
        (0, logger_1.logAlways)(`[Workspace Setup] running workspace-setup.sh in: ${workspaceDir}`);
        const exitCode = await new Promise((resolve) => {
            const proc = (0, child_process_1.spawn)(scriptPath, ["--force"], { cwd: workspaceDir, shell: false });
            proc.stdout.on("data", (data) => {
                for (const line of data.toString().split("\n")) {
                    if (line.trim())
                        (0, logger_1.logAlways)(`[workspace-setup.sh] ${line}`);
                }
            });
            proc.stderr.on("data", (data) => {
                for (const line of data.toString().split("\n")) {
                    if (line.trim())
                        (0, logger_1.logAlways)(`[workspace-setup.sh STDERR] ${line}`);
                }
            });
            proc.on("close", (code) => resolve(code ?? 1));
            proc.on("error", (err) => {
                (0, logger_1.logAlways)(`[Workspace Setup] spawn error: ${err.message}`);
                resolve(1);
            });
        });
        (0, logger_1.logAlways)(`[Workspace Setup] workspace-setup.sh exited with code: ${exitCode}`);
        if (exitCode !== 0) {
            void vscode.window.showErrorMessage(`workspace-setup.sh failed (exit ${exitCode}). Check the Antigravity Task Runner output panel.`);
            return;
        }
        // logAlways(`[Workspace Setup] launching AGENTS.md init`);
        // await launchAgentInit(repoRoot);
        // await launchClaudeInit(repoRoot);
        // logAlways(`[Workspace Setup] AGENTS.md init launched`);
        (0, logger_1.logAlways)(`[Workspace Setup] Done`);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.initRepository", async () => {
        (0, logger_1.showOutputChannel)();
        (0, logger_1.logAlways)(`[initRepository] triggered`);
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            (0, logger_1.logAlways)(`[initRepository] ERROR: rootPath not set`);
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        (0, logger_1.logAlways)(`[initRepository] repoRoot: ${repoRoot}`);
        if (fs.existsSync(path.join(repoRoot, ".git"))) {
            (0, logger_1.logAlways)(`[initRepository] existing .git directory found at ${path.join(repoRoot, ".git")}`);
            void vscode.window.showWarningMessage("A Git repository already exists in this project.");
            return;
        }
        const repoName = await vscode.window.showInputBox({
            title: "Init Repository",
            prompt: "Enter the repository name",
            placeHolder: "my-repository"
        });
        if (!repoName || repoName.trim() === "") {
            (0, logger_1.logAlways)("[initRepository] cancelled before repository name was provided");
            return;
        }
        const trimmedRepoName = repoName.trim();
        (0, logger_1.logAlways)(`[initRepository] requested repoName: ${trimmedRepoName}`);
        const nestedGitFolders = (0, utils_1.findNestedGitFolders)(repoRoot);
        (0, logger_1.logAlways)(`[initRepository] nested .git folders found: ${nestedGitFolders.length}`);
        if (nestedGitFolders.length > 0) {
            const relPaths = nestedGitFolders.map((p) => path.relative(repoRoot, p));
            (0, logger_1.logAlways)(`[initRepository] nested .git relative paths: ${relPaths.join(", ")}`);
            const selection = await vscode.window.showWarningMessage(`Found ${nestedGitFolders.length} nested .git folder(s):\n${relPaths.join(", ")}\n\nRemove them and absorb into one repo?`, { modal: true }, "Yes", "No");
            (0, logger_1.logAlways)(`[initRepository] nested .git removal selection: ${selection ?? "dismissed"}`);
            if (selection !== "Yes") {
                (0, logger_1.logAlways)("[initRepository] cancelled because nested .git folders were not approved for removal");
                return;
            }
            for (const gitDir of nestedGitFolders) {
                (0, logger_1.logAlways)(`[initRepository] removing nested .git folder: ${gitDir}`);
                fs.rmSync(gitDir, { recursive: true, force: true });
            }
        }
        (0, logger_1.logAlways)(`[initRepository] invoking create-repo and init-repo scripts from ${path.join(extensionRoot, "src")}`);
        await (0, scripts_1.runRepoScript)("create-repo", [trimmedRepoName], { scriptDir: path.join(extensionRoot, "src") });
        await (0, scripts_1.runRepoScript)("init-repo", [trimmedRepoName], { scriptDir: path.join(extensionRoot, "src") });
        (0, logger_1.logAlways)("[initRepository] scripts invocation completed");
        provider.refresh();
        (0, logger_1.logAlways)("[initRepository] tree provider refreshed");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.initRepositoryConfigUpdate", async () => {
        (0, logger_1.showOutputChannel)();
        (0, logger_1.logAlways)(`[initRepositoryConfigUpdate] triggered`);
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            (0, logger_1.logAlways)(`[initRepositoryConfigUpdate] ERROR: rootPath not set`);
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        (0, logger_1.logAlways)(`[initRepositoryConfigUpdate] repoRoot: ${repoRoot}`);
        (0, logger_1.logAlways)(`[initRepositoryConfigUpdate] invoking init-repo script from ${path.join(extensionRoot, "src")}`);
        // Passing empty string for repo name to trigger detection in the script
        await (0, scripts_1.runRepoScript)("init-repo", [""], { scriptDir: path.join(extensionRoot, "src") });
        (0, logger_1.logAlways)("[initRepositoryConfigUpdate] script invocation completed");
        provider.refresh();
        (0, logger_1.logAlways)("[initRepositoryConfigUpdate] tree provider refreshed");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.commitChanges", async () => {
        (0, logger_1.showOutputChannel)();
        (0, logger_1.logAlways)("[commitChanges] triggered");
        let repoRoot = "";
        try {
            const rootPath = (0, utils_1.getRootPath)();
            if (!rootPath) {
                (0, logger_1.logAlways)("[commitChanges] ERROR: rootPath not set");
                void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
                return;
            }
            repoRoot = (0, utils_1.getRepoRoot)(rootPath);
            (0, logger_1.logAlways)(`[commitChanges] repoRoot: ${repoRoot}`);
            if (!fs.existsSync(path.join(repoRoot, ".git"))) {
                (0, logger_1.logAlways)("[commitChanges] ERROR: repository not initialized");
                void vscode.window.showWarningMessage("Initialize a Git repository before using Commit.");
                return;
            }
            const result = await runCommitChangesFlow(repoRoot, {
                awaitAgenticHarness: false
            });
            if (result.kind === "no_changes") {
                void vscode.window.showInformationMessage("No changes to commit.");
                return;
            }
            if (result.kind === "delegated") {
                void vscode.window.showInformationMessage("Opened Agentic Harness Commit terminal.");
                return;
            }
            if (result.kind === "nothing_committable") {
                void vscode.window.showWarningMessage("Nothing commitable was staged.");
                return;
            }
            if (result.kind === "committed") {
                void vscode.window.showInformationMessage(`Committed changes: ${result.message}`);
                return;
            }
            throw new Error(result.message);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            (0, logger_1.logAlways)(`[commitChanges] ERROR${repoRoot ? ` (${repoRoot})` : ""}: ${message}`);
            void vscode.window.showErrorMessage(`Commit failed: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.buildVersion", async () => {
        await (0, scripts_1.runRepoScript)("build-version");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.runLiteLLMOpenAI", async () => {
        const config = await (0, settings_1.loadOpenRouterConfig)();
        if (!config)
            return;
        const command = (0, settings_1.getToolRunCommand)(config, "litellm-openai");
        if (!command) {
            void vscode.window.showErrorMessage('routerconfig.json is missing "tool-run.litellm-openai".');
            return;
        }
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        await (0, terminal_1.runInSecondaryTerminal)([`cd ${(0, utils_1.quoteShellArg)(repoRoot)}`, command]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.buildProject", async () => {
        await runConfiguredProjectCommand("Build Project", (0, settings_1.getBuildCommand)(), "Build Command");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.runProjectTests", async () => {
        await runConfiguredProjectCommand("Run Project Tests", (0, settings_1.getProjectTestingCommand)(), "Project Testing Command");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.createClaudeMd", async () => {
        (0, logger_1.log)(`[createClaudeMd] triggered`);
        try {
            const rootPath = (0, utils_1.getRootPath)();
            const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!repoRoot) {
                (0, logger_1.log)(`[createClaudeMd] ERROR: no workspace folder or rootPath`);
                void vscode.window.showErrorMessage("No workspace folder is open.");
                return;
            }
            (0, logger_1.log)(`[createClaudeMd] repoRoot: ${repoRoot}`);
            await launchClaudeInit(repoRoot, "Project Level AGENT.md Guidelines.txt");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            (0, logger_1.log)(`[createClaudeMd] ERROR: ${message}`);
            void vscode.window.showErrorMessage(`Create CLAUDE.md failed: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.createAgentMd", async () => {
        (0, logger_1.log)(`[createAgentMd] triggered`);
        try {
            const rootPath = (0, utils_1.getRootPath)();
            const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!repoRoot) {
                (0, logger_1.log)(`[createAgentMd] ERROR: no workspace folder or rootPath`);
                void vscode.window.showErrorMessage("No workspace folder is open.");
                return;
            }
            (0, logger_1.log)(`[createAgentMd] repoRoot: ${repoRoot}`);
            await launchAgentInit(repoRoot);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            (0, logger_1.log)(`[createAgentMd] ERROR: ${message}`);
            void vscode.window.showErrorMessage(`Create AGENTS.md failed: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.createRepository", async () => {
        await (0, scripts_1.runRepoScript)("create-repo");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.createInfrastructure", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const infraFiles = await (0, utils_1.listInfrastructureYamlFiles)(repoRoot);
        if (infraFiles.length === 0) {
            void vscode.window.showErrorMessage(`No infrastructure YAML files found under ${path.join(repoRoot, "config", "Infrastructure")}.`);
            return;
        }
        const selection = await vscode.window.showQuickPick(infraFiles.map((filePath) => {
            const relativePath = path.relative(repoRoot, filePath);
            return { label: relativePath, value: relativePath };
        }), {
            title: "Create Infrastructure",
            placeHolder: "Select infra yaml path"
        });
        if (!selection)
            return;
        await (0, scripts_1.runRepoScript)("create-infra", [selection.value], { cwd: repoRoot });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.deploy", async () => {
        await (0, scripts_1.runRepoScript)("deploy");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.selectOrCreateJiraProject", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const credentials = await getValidatedJiraCredentials(repoRoot);
        if (!credentials) {
            return;
        }
        const projectKey = await ensureSavedJiraProjectKey(repoRoot, credentials);
        if (!projectKey) {
            return;
        }
        void vscode.window.showInformationMessage(`Jira project ${projectKey} is now selected.`);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.addJiraItem", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const credentials = await getValidatedJiraCredentials(repoRoot);
        if (!credentials) {
            return;
        }
        const projectKey = await ensureSavedJiraProjectKey(repoRoot, credentials);
        if (!projectKey)
            return;
        let issueTypes;
        try {
            issueTypes = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Loading Jira item types",
                cancellable: false
            }, async () => (0, jira_1.getJiraIssueTypes)(credentials, projectKey));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const hint = /log in|not authorized|cannot create/i.test(message)
                ? ` Verify that your Jira account has "Create Issues" permission in project ${projectKey}. You can check this under Project settings → Access in Jira.`
                : "";
            void vscode.window.showErrorMessage(`Failed to load Jira item types for project ${projectKey}: ${message}${hint}`);
            return;
        }
        if (issueTypes.length === 0) {
            void vscode.window.showErrorMessage(`No Jira item types are available for project ${projectKey}.`);
            return;
        }
        const defaultBacklogDir = path.join(repoRoot, "docs", "backlog");
        const jiraItem = await showCreateJiraItemDialog(projectKey, issueTypes, defaultBacklogDir);
        if (!jiraItem)
            return;
        if (jiraItem.action === "grillMe") {
            try {
                const copiedSkillPaths = await (0, grillMe_1.copyGrillMeSkill)(extensionRoot, repoRoot, resourceProvider);
                (0, logger_1.logAlways)(`[createJiraItemGrillMe] skill locations ready: ${copiedSkillPaths.length > 0 ? copiedSkillPaths.join(", ") : "already present"}`);
                provider.refresh();
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                (0, logger_1.logAlways)(`[createJiraItemGrillMe] ERROR preparing skill: ${message}`);
                void vscode.window.showErrorMessage(`Failed to prepare the grill-me skill: ${message}`);
                return;
            }
            const featureDetails = (0, grillMe_1.buildJiraDraftFeatureDetails)(projectKey, jiraItem.issueType, jiraItem.summary, jiraItem.description);
            const prompt = (0, grillMe_1.buildFeatureGrillMePrompt)(featureDetails);
            const promptFilePath = writeAgentPromptFile("create-jira-item-grill-me", prompt);
            const commandLine = (0, terminal_1.buildAgenticHarnessFileCommand)(repoRoot, promptFilePath, "prompt");
            (0, logger_1.logAlways)("[createJiraItemGrillMe] launching Agentic Harness for Jira draft review");
            (0, terminal_1.runInPersistentTerminal)("Create Jira Item Grill Me", [
                `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
                commandLine
            ], {
                iconPath: FEATURE_ESTIMATOR_ICON_PATH,
                color: FEATURE_ESTIMATOR_ACTION_COLOR
            });
            void vscode.window.showInformationMessage(`Opened Grill Me for the ${jiraItem.issueType} draft in project ${projectKey}.`);
            return;
        }
        const resolvedBacklogDir = path.resolve(repoRoot, jiraItem.backlogDir);
        const backlogFileName = (0, backlogItem_1.buildBacklogItemFileName)(jiraItem.issueType, jiraItem.summary);
        if (!backlogFileName) {
            void vscode.window.showErrorMessage("Failed to create a local backlog file because the item type or name cannot be converted into a filename.");
            return;
        }
        const backlogFilePath = (0, backlogItem_1.resolveBacklogItemFilePath)(resolvedBacklogDir, jiraItem.issueType, jiraItem.summary);
        if (!backlogFilePath) {
            void vscode.window.showErrorMessage("Failed to resolve the local backlog file path.");
            return;
        }
        if (fs.existsSync(resolvedBacklogDir) && !fs.statSync(resolvedBacklogDir).isDirectory()) {
            void vscode.window.showErrorMessage(`Local backlog folder is not a directory: ${resolvedBacklogDir}`);
            return;
        }
        if (fs.existsSync(backlogFilePath)) {
            void vscode.window.showErrorMessage(`A backlog file named ${backlogFileName} already exists in ${resolvedBacklogDir}.`);
            return;
        }
        let createdIssue;
        if (jiraItem.createOnJira) {
            try {
                createdIssue = await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "Creating Jira item",
                    cancellable: false
                }, async () => (0, jira_1.createJiraIssue)(credentials, {
                    projectKey,
                    issueTypeName: jiraItem.issueType,
                    summary: jiraItem.summary,
                    description: jiraItem.description
                }));
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                void vscode.window.showErrorMessage(`Failed to create Jira item: ${message}`);
                return;
            }
        }
        try {
            await fs.promises.mkdir(resolvedBacklogDir, { recursive: true });
            await fs.promises.writeFile(backlogFilePath, (0, backlogItem_1.buildBacklogItemTemplate)({
                issueType: jiraItem.issueType,
                summary: jiraItem.summary,
                description: jiraItem.description
            }), "utf8");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const prefix = createdIssue
                ? `Created Jira ${jiraItem.issueType} ${createdIssue.key}, but failed to create ${backlogFileName}:`
                : `Failed to create ${backlogFileName}:`;
            void vscode.window.showErrorMessage(`${prefix} ${message}`);
            return;
        }
        const successMessage = createdIssue
            ? `Created Jira ${jiraItem.issueType} ${createdIssue.key} in project ${projectKey} and added ${backlogFileName}.`
            : `Added ${backlogFileName} without creating a Jira item.`;
        void vscode.window.showInformationMessage(successMessage);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.takeJiraItemAssign", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const projectKey = getSavedJiraProjectKey(repoRoot);
        const credentials = await getValidatedJiraCredentials(repoRoot);
        if (!credentials) {
            return;
        }
        if (!projectKey) {
            void vscode.window.showErrorMessage("Take Jira Item (Assign) is disabled because JIRA_PROJECT_KEY is not set for this repository.");
            provider.refresh();
            return;
        }
        let issues;
        try {
            issues = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Loading available Jira items from ${projectKey.trim().toUpperCase()}`,
                cancellable: false
            }, async () => (0, jira_1.searchOpenUnassignedTodoJiraIssuesForAssignment)(credentials, projectKey));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Failed to load Jira items: ${message}`);
            return;
        }
        if (issues.length === 0) {
            void vscode.window.showInformationMessage(`No unassigned To Do Jira items are currently available in ${projectKey.trim().toUpperCase()}. Items blocked by work that is not In Review or Done are hidden.`);
            return;
        }
        const selection = await vscode.window.showQuickPick(issues.map((issue) => ({
            label: issue.key,
            description: issue.summary,
            detail: [issue.projectKey || issue.projectName, issue.issueTypeName, issue.statusName]
                .filter(Boolean)
                .join(" • "),
            issue
        })), {
            title: "Take Jira Item (Assign)",
            placeHolder: `Select an unassigned To Do Jira item from ${projectKey.trim().toUpperCase()} that is not blocked by unfinished work`,
            matchOnDescription: true,
            matchOnDetail: true
        });
        if (!selection)
            return;
        const confirm = await vscode.window.showInformationMessage(`Assign ${selection.issue.key} to ${credentials.email}?`, { modal: true }, "Assign To Me");
        if (confirm !== "Assign To Me")
            return;
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Assigning ${selection.issue.key} to you and moving it to In Progress`,
                cancellable: false
            }, async () => {
                await (0, jira_1.assignJiraIssueToCurrentUser)(credentials, selection.issue.key);
                await (0, jira_1.transitionJiraIssueToStatus)(credentials, selection.issue.key, "In Progress");
            });
            void vscode.window.showInformationMessage(`Assigned Jira item ${selection.issue.key} to ${credentials.email} and moved it to In Progress.`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Failed to assign Jira item: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.assignJiraItemToAgent", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const projectKey = getSavedJiraProjectKey(repoRoot);
        const credentials = await getValidatedJiraCredentials(repoRoot);
        if (!credentials) {
            return;
        }
        if (!projectKey) {
            void vscode.window.showErrorMessage("Assign Backlog Item to Agent is disabled because JIRA_PROJECT_KEY is not set for this repository.");
            provider.refresh();
            return;
        }
        let issues;
        try {
            issues = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Loading assignable unassigned Jira items in ${projectKey}`,
                cancellable: false
            }, async () => (0, jira_1.searchOpenUnassignedTodoJiraIssuesForAssignment)(credentials, projectKey));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Failed to load Jira items: ${message}`);
            return;
        }
        if (issues.length === 0) {
            void vscode.window.showInformationMessage(`No unassigned Jira tickets in To Do that are not blocked by unfinished Jira items were found for project ${projectKey}.`);
            return;
        }
        const backlogDir = path.join(repoRoot, "docs", "backlog");
        let backlogItems = [];
        let backlogStatusMessage = "";
        try {
            backlogItems = (0, backlogItemCompleted_1.loadBacklogItemsForCompletion)(backlogDir);
        }
        catch (error) {
            backlogStatusMessage = error instanceof Error ? error.message : String(error);
        }
        const selectedIssueKey = issues[0]?.key ?? "";
        const initialIssue = issues.find((candidate) => candidate.key === selectedIssueKey);
        const selectedBacklogItemPath = (0, backlogItemCompleted_1.findMatchingBacklogItemForJiraIssue)(initialIssue, backlogItems)?.filePath ?? "";
        const selection = await showAssignJiraItemToAgentDialog(projectKey, issues, backlogItems, selectedIssueKey, selectedBacklogItemPath, backlogStatusMessage);
        if (!selection)
            return;
        const issue = issues.find((candidate) => candidate.key === selection.issueKey);
        if (!issue) {
            void vscode.window.showErrorMessage("The selected Jira item is no longer available.");
            return;
        }
        let selectedBacklogItem;
        if (selection.backlogItemPath) {
            let latestBacklogItems;
            try {
                latestBacklogItems = (0, backlogItemCompleted_1.loadBacklogItemsForCompletion)(backlogDir);
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                void vscode.window.showErrorMessage(`Failed to load local backlog items: ${message}`);
                return;
            }
            selectedBacklogItem = latestBacklogItems.find((candidate) => candidate.filePath === selection.backlogItemPath);
            if (!selectedBacklogItem) {
                void vscode.window.showErrorMessage("The selected local backlog item is no longer available. Reopen the page and try again.");
                return;
            }
        }
        if (selection.action === "grillMe") {
            try {
                const copiedSkillPaths = await (0, grillMe_1.copyGrillMeSkill)(extensionRoot, repoRoot, resourceProvider);
                (0, logger_1.logAlways)(`[assignJiraItemToAgentGrillMe] skill locations ready: ${copiedSkillPaths.length > 0 ? copiedSkillPaths.join(", ") : "already present"}`);
                provider.refresh();
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                (0, logger_1.logAlways)(`[assignJiraItemToAgentGrillMe] ERROR preparing skill: ${message}`);
                void vscode.window.showErrorMessage(`Failed to prepare the grill-me skill: ${message}`);
                return;
            }
            const featureDetails = (0, assignBacklogItemToAgent_1.buildAssignBacklogItemToAgentFeatureDetails)(issue, selectedBacklogItem);
            const prompt = (0, grillMe_1.buildFeatureGrillMePrompt)(featureDetails);
            const promptFilePath = writeAgentPromptFile("assign-jira-item-grill-me", prompt);
            const commandLine = (0, agenticHarnessCommand_1.buildAgenticHarnessFileCommandForCommand)(selection.agentCommand, repoRoot, promptFilePath, "prompt");
            (0, logger_1.logAlways)(`[assignJiraItemToAgentGrillMe] runString (file): ${commandLine}`);
            (0, logger_1.logAlways)(`[assignJiraItemToAgentGrillMe] launching Agentic Harness for ${issue.key} with selected command`);
            (0, terminal_1.runInPersistentTerminal)("Assign Backlog Item Grill Me", [
                `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
                commandLine
            ], {
                iconPath: FEATURE_ESTIMATOR_ICON_PATH,
                color: FEATURE_ESTIMATOR_ACTION_COLOR
            });
            void vscode.window.showInformationMessage(selectedBacklogItem
                ? `Opened Grill Me for Jira item ${issue.key} and local backlog item ${path.basename(selectedBacklogItem.filePath)} with the selected agent harness command.`
                : `Opened Grill Me for Jira item ${issue.key} with the selected agent harness command.`);
            return;
        }
        const agentLabel = (0, agentRunCommand_1.inferAssignableAgentLabelFromCommand)(selection.agentCommand);
        const updatedSummary = buildIssueSummaryForAgent(issue.summary, agentLabel);
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Assigning ${issue.key}`,
                cancellable: false
            }, async () => {
                await (0, jira_1.updateJiraIssueSummaryAndLabels)(credentials, issue.key, updatedSummary, [buildAgentJiraLabel(agentLabel)]);
                await (0, jira_1.assignJiraIssueToCurrentUser)(credentials, issue.key);
                await (0, jira_1.transitionJiraIssueToStatus)(credentials, issue.key, "In Progress");
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Failed to assign Jira item to agent: ${message}`);
            return;
        }
        await launchAgentForJiraItem(repoRoot, agentLabel, issue, selection.agentCommand, selectedBacklogItem);
        void vscode.window.showInformationMessage(selectedBacklogItem
            ? `${issue.key} was assigned to ${credentials.email}, moved to In Progress, and launched with local backlog item ${path.basename(selectedBacklogItem.filePath)} in the agent context.`
            : `${issue.key} was assigned to ${credentials.email}, moved to In Progress, and launched with the selected agent harness command.`);
    }));
    context.subscriptions.push(vscode.commands.registerCommand(backlogItemCompleted_1.BACKLOG_ITEM_COMPLETED_COMMAND, async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const projectKey = getSavedJiraProjectKey(repoRoot);
        const credentials = await getValidatedJiraCredentials(repoRoot);
        if (!credentials) {
            return;
        }
        if (!projectKey) {
            void vscode.window.showErrorMessage("Backlog Item Completed is disabled because JIRA_PROJECT_KEY is not set for this repository.");
            provider.refresh();
            return;
        }
        let issues;
        try {
            issues = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Loading Jira items in ${projectKey}`,
                cancellable: false
            }, async () => (0, jira_1.searchOpenTodoOrInProgressJiraIssuesForProject)(credentials, projectKey));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Failed to load Jira items: ${message}`);
            return;
        }
        const defaultValues = (0, backlogItemCompleted_1.getDefaultBacklogItemCompletedValues)(projectKey, repoRoot);
        const savedValues = context.workspaceState.get(getProjectScopedStateKey("backlogItemCompletedForm"));
        const initialValues = (0, backlogItemCompleted_1.sanitizeBacklogItemCompletedFormValues)(savedValues, projectKey, repoRoot);
        let initialBacklogItems = [];
        let backlogLoadError = "";
        try {
            initialBacklogItems = (0, backlogItemCompleted_1.loadBacklogItemsForCompletion)(initialValues.backlogDir);
        }
        catch (error) {
            backlogLoadError = error instanceof Error ? error.message : String(error);
        }
        if (issues.length === 0 && initialBacklogItems.length === 0) {
            void vscode.window.showInformationMessage(backlogLoadError
                ? `No Jira or local backlog items are ready to complete. ${backlogLoadError}`
                : `No Jira items in To Do or In Progress or eligible local backlog items were found for project ${projectKey}.`);
            return;
        }
        const savedBacklogItem = initialBacklogItems.find((item) => item.filePath === initialValues.backlogItemPath);
        const matchedIssueForSavedBacklogItem = (0, backlogItemCompleted_1.findMatchingJiraIssueForBacklogItem)(savedBacklogItem, issues);
        const selectedIssueKey = issues.some((issue) => issue.key === initialValues.issueKey)
            ? initialValues.issueKey
            : matchedIssueForSavedBacklogItem?.key ?? issues[0]?.key ?? "";
        const initialIssue = issues.find((issue) => issue.key === selectedIssueKey);
        const matchedBacklogItem = (0, backlogItemCompleted_1.findMatchingBacklogItemForJiraIssue)(initialIssue, initialBacklogItems);
        const selectedBacklogItemPath = matchedBacklogItem?.filePath ??
            savedBacklogItem?.filePath ??
            "";
        const panel = vscode.window.createWebviewPanel("antigravityBacklogItemCompleted", "Backlog Item Completed", vscode.ViewColumn.Active, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = (0, backlogItemCompleted_1.renderBacklogItemCompletedHtml)(panel.webview, {
            ...defaultValues,
            ...initialValues,
            backlogItemPath: selectedBacklogItemPath,
            issueKey: selectedIssueKey
        }, issues, initialBacklogItems, backlogLoadError);
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message)
                return;
            if (message.type === "cancelBacklogItemCompleted") {
                panel.dispose();
                return;
            }
            if (message.type === "saveBacklogItemCompletedDraft") {
                const draftValues = (0, backlogItemCompleted_1.sanitizeBacklogItemCompletedFormValues)(message.payload, projectKey, repoRoot);
                await context.workspaceState.update(getProjectScopedStateKey("backlogItemCompletedForm"), draftValues);
                return;
            }
            if (message.type === "loadBacklogItemCompletedBacklogItems") {
                const draftValues = (0, backlogItemCompleted_1.sanitizeBacklogItemCompletedFormValues)(message.payload, projectKey, repoRoot);
                try {
                    const backlogItems = (0, backlogItemCompleted_1.loadBacklogItemsForCompletion)(draftValues.backlogDir);
                    void panel.webview.postMessage({
                        type: "backlogItemCompletedBacklogItemsLoaded",
                        payload: {
                            items: backlogItems
                        }
                    });
                }
                catch (error) {
                    const messageText = error instanceof Error ? error.message : String(error);
                    void panel.webview.postMessage({
                        type: "backlogItemCompletedBacklogItemsError",
                        payload: {
                            message: messageText
                        }
                    });
                }
                return;
            }
            if (message.type !== "runBacklogItemCompleted") {
                return;
            }
            const values = (0, backlogItemCompleted_1.sanitizeBacklogItemCompletedFormValues)(message.payload, projectKey, repoRoot);
            const missingFields = (0, backlogItemCompleted_1.getMissingBacklogItemCompletedFields)(values);
            if (missingFields.length > 0) {
                void panel.webview.postMessage({
                    type: "backlogItemCompletedError",
                    payload: {
                        message: `Fill in the required fields: ${missingFields.join(", ")}.`
                    }
                });
                return;
            }
            const selectedIssue = values.issueKey
                ? issues.find((issue) => issue.key === values.issueKey)
                : undefined;
            if (values.issueKey && !selectedIssue) {
                void panel.webview.postMessage({
                    type: "backlogItemCompletedError",
                    payload: {
                        message: "The selected Jira item is no longer available. Reopen the page and try again."
                    }
                });
                return;
            }
            try {
                const backlogItems = values.backlogItemPath
                    ? (0, backlogItemCompleted_1.loadBacklogItemsForCompletion)(values.backlogDir)
                    : [];
                const selectedBacklogItem = values.backlogItemPath
                    ? backlogItems.find((item) => item.filePath === values.backlogItemPath)
                    : undefined;
                if (values.backlogItemPath && !selectedBacklogItem) {
                    void panel.webview.postMessage({
                        type: "backlogItemCompletedError",
                        payload: {
                            message: "The selected local backlog item is no longer available. Reopen the page and try again."
                        }
                    });
                    return;
                }
                await context.workspaceState.update(getProjectScopedStateKey("backlogItemCompletedForm"), values);
                const completionMessage = await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: selectedIssue && selectedBacklogItem
                        ? `Completing ${selectedIssue.key} and ${path.basename(selectedBacklogItem.filePath)}`
                        : selectedIssue
                            ? `Completing ${selectedIssue.key} in Jira`
                            : `Updating ${path.basename(selectedBacklogItem?.filePath ?? "backlog item")}`,
                    cancellable: false
                }, async () => {
                    const messages = [];
                    if (selectedIssue) {
                        const transitionResult = await (0, jira_1.transitionJiraIssueToReviewOrDone)(credentials, projectKey, selectedIssue.key);
                        messages.push(transitionResult.statusName === "In Review"
                            ? `Moved Jira item ${selectedIssue.key} to In Review.`
                            : transitionResult.fallbackReason
                                ? `Moved Jira item ${selectedIssue.key} to Done because ${transitionResult.fallbackReason}`
                                : `Moved Jira item ${selectedIssue.key} to Done.`);
                    }
                    if (selectedBacklogItem) {
                        const existingMarkdown = fs.readFileSync(selectedBacklogItem.filePath, "utf8");
                        fs.writeFileSync(selectedBacklogItem.filePath, (0, backlogItemCompleted_1.upsertBacklogItemCompletedStatus)(existingMarkdown, "In Review"), "utf8");
                        messages.push(`Updated local backlog item ${path.basename(selectedBacklogItem.filePath)} to In Review.`);
                    }
                    return messages.join(" ");
                });
                void vscode.window.showInformationMessage(completionMessage);
                panel.dispose();
            }
            catch (error) {
                const messageText = error instanceof Error ? error.message : String(error);
                void panel.webview.postMessage({
                    type: "backlogItemCompletedError",
                    payload: { message: `Failed to update backlog item: ${messageText}` }
                });
            }
        }, undefined, context.subscriptions);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.incrementMajorVersion", async () => {
        await (0, scripts_1.runRepoScript)("bump-version", ["major"]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.incrementMinorVersion", async () => {
        await (0, scripts_1.runRepoScript)("bump-version", ["minor"]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.incrementPatchVersion", async () => {
        await (0, scripts_1.runRepoScript)("bump-version", ["patch"]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.cloudArchitectReview", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const cloudInfrastructureSignals = (0, cloudArchitectReview_1.detectCloudInfrastructureSignals)(repoRoot, 3);
        if (cloudInfrastructureSignals.length === 0) {
            void vscode.window.showInformationMessage("Cloud Architect Review stays visible for this project, but it is disabled until cloud infrastructure signals are detected.");
            return;
        }
        try {
            const copiedSkillPaths = await (0, cloudArchitectReview_1.copyCloudArchitectSkill)(extensionRoot, repoRoot, resourceProvider);
            (0, logger_1.logAlways)(`[cloudArchitectReview] skill locations ready: ${copiedSkillPaths.length > 0 ? copiedSkillPaths.join(", ") : "already present"}`);
            provider.refresh();
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            (0, logger_1.logAlways)(`[cloudArchitectReview] ERROR preparing skill: ${message}`);
            void vscode.window.showErrorMessage(`Failed to prepare the cloud-architect skill: ${message}`);
            return;
        }
        const commandLine = (0, terminal_1.buildAgenticHarnessPromptCommand)(repoRoot, cloudArchitectReview_1.CLOUD_ARCHITECT_REVIEW_PROMPT, "prompt");
        (0, logger_1.logAlways)(`[cloudArchitectReview] launching Agentic Harness with signals: ${cloudInfrastructureSignals.join(", ")}`);
        (0, terminal_1.runInPersistentTerminal)("Cloud Architect Review", [
            `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
            commandLine
        ], {
            iconPath: new vscode.ThemeIcon("cloud", CLOUD_ARCHITECT_ACTION_COLOR),
            color: CLOUD_ARCHITECT_ACTION_COLOR
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.featureEstimator", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const selection = await showFeatureEstimatorDialog(repoRoot);
        if (!selection)
            return;
        const featureDetails = selection.source === "jira"
            ? buildFeatureEstimatorDetailsFromIssue(selection.issue)
            : selection.featureDetails;
        const isGrillMeAction = selection.action === "grillMe";
        const actionKey = isGrillMeAction ? "featureGrillMe" : "featureEstimator";
        const skillDisplayName = isGrillMeAction ? "grill-me" : "estimator";
        const prompt = isGrillMeAction
            ? (0, grillMe_1.buildFeatureGrillMePrompt)(featureDetails)
            : (0, featureEstimator_1.buildFeatureEstimatorPrompt)(featureDetails);
        const promptFilePath = writeAgentPromptFile(isGrillMeAction ? "feature-grill-me" : "feature-estimator", prompt);
        const terminalName = isGrillMeAction ? "Feature Grill Me" : "Feature Estimator";
        try {
            const copiedSkillPaths = isGrillMeAction
                ? await (0, grillMe_1.copyGrillMeSkill)(extensionRoot, repoRoot, resourceProvider)
                : await (0, featureEstimator_1.copyFeatureEstimatorSkill)(extensionRoot, repoRoot, resourceProvider);
            (0, logger_1.logAlways)(`[${actionKey}] skill locations ready: ${copiedSkillPaths.length > 0 ? copiedSkillPaths.join(", ") : "already present"}`);
            provider.refresh();
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            (0, logger_1.logAlways)(`[${actionKey}] ERROR preparing skill: ${message}`);
            void vscode.window.showErrorMessage(`Failed to prepare the ${skillDisplayName} skill: ${message}`);
            return;
        }
        const commandLine = (0, terminal_1.buildAgenticHarnessFileCommand)(repoRoot, promptFilePath, "prompt");
        (0, logger_1.logAlways)(`[${actionKey}] launching Agentic Harness for ${selection.source === "jira" ? selection.issue.key : "free-text request"}`);
        (0, terminal_1.runInPersistentTerminal)(terminalName, [
            `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
            commandLine
        ], {
            iconPath: FEATURE_ESTIMATOR_ICON_PATH,
            color: FEATURE_ESTIMATOR_ACTION_COLOR
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.explainMe", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        try {
            const copiedSkillPaths = await (0, explainMe_1.copyExplainMeSkill)(extensionRoot, repoRoot, resourceProvider);
            (0, logger_1.logAlways)(`[explainMe] skill locations ready: ${copiedSkillPaths.length > 0 ? copiedSkillPaths.join(", ") : "already present"}`);
            provider.refresh();
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            (0, logger_1.logAlways)(`[explainMe] ERROR preparing skill: ${message}`);
            void vscode.window.showErrorMessage(`Failed to prepare the explain-me skill: ${message}`);
            return;
        }
        const commandLine = (0, terminal_1.buildAgenticHarnessPromptCommand)(repoRoot, explainMe_1.EXPLAIN_ME_PROMPT, "prompt");
        (0, logger_1.logAlways)("[explainMe] launching Agentic Harness for project explanation");
        (0, terminal_1.runInPersistentTerminal)("Explain Me", [
            `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
            commandLine
        ], {
            iconPath: new vscode.ThemeIcon("comment-discussion", EXPLAIN_ME_ACTION_COLOR),
            color: EXPLAIN_ME_ACTION_COLOR
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.createRepoTagVersion", async () => {
        (0, logger_1.log)(`[createRepoTagVersion] triggered`);
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const branch = (await execInRepo("git branch --show-current", repoRoot)).trim();
        const pkgPath = path.join(repoRoot, "package.json");
        let label;
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
            const parts = (pkg.version ?? "0.0.0").split(".").map(Number);
            parts[2] = (parts[2] ?? 0) + 1;
            label = `v${parts.join(".")}`;
        }
        catch {
            label = "release";
        }
        if (branch && branch !== "main") {
            label += ` (from ${branch})`;
        }
        (0, logger_1.log)(`[createRepoTagVersion] label: "${label}"`);
        const createReleaseBranch = vscode.workspace
            .getConfiguration("antigravity")
            .get("createReleaseBranchWhenCreatingReleases") ?? true;
        await (0, scripts_1.runRepoScript)("commit-push-tag", [label], {
            scriptDir: path.join(extensionRoot, "src"),
            env: {
                CREATE_RELEASE_BRANCH: createReleaseBranch ? "1" : "0"
            }
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.createFeatureBranch", async () => {
        (0, logger_1.log)("[createFeatureBranch] triggered");
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const dialogResult = await showCreateFeatureBranchDialog(repoRoot);
        if (!dialogResult)
            return;
        const { branchType, branchName } = dialogResult;
        (0, logger_1.log)(`[createFeatureBranch] branchName: ${branchName}`);
        if (branchType.label) {
            (0, logger_1.log)(`[createFeatureBranch] branchType: ${branchType.label}`);
        }
        const scriptPath = path.join(extensionRoot, "src", "create_feature_branch.sh");
        if (!fs.existsSync(scriptPath)) {
            void vscode.window.showErrorMessage("Create feature branch script not found in the extension package.");
            return;
        }
        (0, terminal_1.runInPersistentTerminal)("Create Feature Branch", [
            `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
            `${(0, utils_1.quoteShellArg)(scriptPath)} ${(0, utils_1.quoteShellArg)(branchName)}`
        ], {
            iconPath: new vscode.ThemeIcon("git-branch")
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.createPullRequest", async () => {
        (0, logger_1.log)("[createPullRequest] triggered");
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const defaultGithubCodeReviewer = (0, settings_1.getDefaultGithubCodeReviewer)();
        const projectTestingCommand = (0, settings_1.getProjectTestingCommand)();
        const scriptPath = path.join(extensionRoot, "src", "create_pull_requrest.sh");
        if (!fs.existsSync(scriptPath)) {
            void vscode.window.showErrorMessage("Create pull request script not found in the extension package.");
            return;
        }
        let prBranch = "";
        try {
            prBranch = await getCurrentBranchName(repoRoot);
        }
        catch {
            // best-effort
        }
        const branchLabel = prBranch ? `'${prBranch}'` : "your feature branch";
        try {
            await vscode.workspace.saveAll(false);
            const statusOutput = await execInRepo("git status --porcelain", repoRoot);
            if (statusOutput.trim().length > 0) {
                (0, logger_1.logAlways)("[createPullRequest] uncommitted changes detected; running commit flow first");
                const commitResult = await runCommitChangesFlow(repoRoot, {
                    awaitAgenticHarness: true
                });
                if (commitResult.kind === "failed") {
                    void vscode.window.showErrorMessage(`Create Pull Request stopped before launch: ${commitResult.message}`);
                    return;
                }
                if (commitResult.kind === "nothing_committable") {
                    void vscode.window.showWarningMessage("Only protected .env changes remained uncommitted, so PR creation will continue without a new commit.");
                }
                else if (commitResult.kind === "committed") {
                    void vscode.window.showInformationMessage(`Committed changes before opening the pull request: ${commitResult.message}`);
                }
                if (await hasNonProtectedUncommittedChanges(repoRoot)) {
                    void vscode.window.showErrorMessage(`Create Pull Request stopped because ${branchLabel} still has uncommitted changes after the commit step.`);
                    return;
                }
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Create Pull Request couldn't complete the pre-flight commit step: ${message}`);
            return;
        }
        (0, terminal_1.runInPersistentTerminal)("Create Pull Request", [
            `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
            `${(0, utils_1.quoteShellArg)(scriptPath)}`
        ], {
            iconPath: new vscode.ThemeIcon("git-pull-request"),
            env: {
                ANTIGRAVITY_DEFAULT_GITHUB_REVIEWER: defaultGithubCodeReviewer,
                ANTIGRAVITY_SKIP_PRE_PR_COMMIT: "1",
                ...(projectTestingCommand
                    ? { ANTIGRAVITY_PROJECT_TESTING_COMMAND: projectTestingCommand }
                    : {})
            }
        });
        void vscode.window.showInformationMessage(`PR creation started on ${branchLabel}. The workflow will verify that local main is already up to date and that ${branchLabel} already includes main before it opens the pull request.`);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.mergeBranchToMain", async () => {
        (0, logger_1.log)("[mergeBranchToMain] triggered");
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        try {
            const currentBranch = await getCurrentBranchName(repoRoot);
            if (currentBranch === "main") {
                void vscode.window.showInformationMessage("Merge branch to main is only available when you are on a branch other than main.");
                return;
            }
            if (currentBranch === "detached HEAD") {
                void vscode.window.showErrorMessage("Merge branch to main is unavailable while Git is in a detached HEAD state.");
                return;
            }
            await vscode.workspace.saveAll(false);
            const statusOutput = await execInRepo("git status --porcelain", repoRoot);
            if (statusOutput.trim().length > 0) {
                (0, logger_1.logAlways)("[mergeBranchToMain] uncommitted changes detected; running Agentic Harness commit first");
                const commitResult = await runCommitChangesFlow(repoRoot, {
                    awaitAgenticHarness: true,
                    forceAgenticHarness: true
                });
                if (commitResult.kind === "failed") {
                    void vscode.window.showErrorMessage(`Merge branch to main stopped before launch: ${commitResult.message}`);
                    return;
                }
                if (commitResult.kind === "committed") {
                    void vscode.window.showInformationMessage(`Committed changes before merging to main: ${commitResult.message}`);
                }
                const remainingStatusOutput = await execInRepo("git status --porcelain", repoRoot);
                if (remainingStatusOutput.trim().length > 0) {
                    const branchLabel = `'${currentBranch}'`;
                    const remainingMessage = commitResult.kind === "nothing_committable"
                        ? `${branchLabel} still has changes that were not committed by the Agentic Harness.`
                        : `${branchLabel} still has uncommitted changes after the commit step.`;
                    void vscode.window.showErrorMessage(`Merge branch to main stopped because ${remainingMessage}`);
                    return;
                }
            }
            const scriptPath = path.join(extensionRoot, "src", "merge_branch_to_main.sh");
            if (!fs.existsSync(scriptPath)) {
                void vscode.window.showErrorMessage("Merge branch to main script not found in the extension package.");
                return;
            }
            (0, terminal_1.runInPersistentTerminal)("Merge Branch to Main", [
                `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
                `${(0, utils_1.quoteShellArg)(scriptPath)} ${(0, utils_1.quoteShellArg)(currentBranch)}`
            ], {
                iconPath: new vscode.ThemeIcon("git-merge")
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Merge branch to main failed: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.checkoutMain", async () => {
        (0, logger_1.log)("[checkoutMain] triggered");
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        try {
            const currentBranch = await getCurrentBranchName(repoRoot);
            const branches = await getAvailableCheckoutBranches(repoRoot);
            if (branches.length === 0) {
                void vscode.window.showInformationMessage("No branches were found for checkout.");
                return;
            }
            const selectedBranch = await showCheckoutBranchDialog(currentBranch, branches);
            if (!selectedBranch)
                return;
            const canProceed = await prepareCommitBeforeCheckout(repoRoot, selectedBranch);
            if (!canProceed)
                return;
            const scriptPath = path.join(extensionRoot, "src", "checkout_branch.sh");
            if (!fs.existsSync(scriptPath)) {
                void vscode.window.showErrorMessage("Checkout branch script not found in the extension package.");
                return;
            }
            (0, terminal_1.runInPersistentTerminal)("Checkout Branch", [
                `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
                `${(0, utils_1.quoteShellArg)(scriptPath)} ${(0, utils_1.quoteShellArg)(selectedBranch)}`
            ], {
                iconPath: new vscode.ThemeIcon("source-control")
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Checkout branch failed: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.pullRemoteAndMerge", async () => {
        (0, logger_1.log)("[pullRemoteAndMerge] triggered");
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        try {
            const currentBranch = await getCurrentBranchName(repoRoot);
            if (currentBranch === "main") {
                void vscode.window.showInformationMessage("Pull Remote and merge is only available when you are on a branch other than main.");
                return;
            }
            if (currentBranch === "detached HEAD") {
                void vscode.window.showErrorMessage("Pull Remote and merge is unavailable while Git is in a detached HEAD state.");
                return;
            }
            const scriptPath = path.join(extensionRoot, "src", "pull_remote_and_merge.sh");
            if (!fs.existsSync(scriptPath)) {
                void vscode.window.showErrorMessage("Pull Remote and merge script not found in the extension package.");
                return;
            }
            const projectTestingCommand = (0, settings_1.getProjectTestingCommand)();
            (0, terminal_1.runInPersistentTerminal)("Pull Remote and Merge", [
                `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
                `${(0, utils_1.quoteShellArg)(scriptPath)} ${(0, utils_1.quoteShellArg)(currentBranch)}`
            ], {
                iconPath: new vscode.ThemeIcon("cloud-download", PULL_REMOTE_AND_MERGE_ACTION_COLOR),
                color: PULL_REMOTE_AND_MERGE_ACTION_COLOR,
                ...(projectTestingCommand
                    ? {
                        env: {
                            ANTIGRAVITY_PROJECT_TESTING_COMMAND: projectTestingCommand
                        }
                    }
                    : {})
            });
            void vscode.window.showInformationMessage(`Pull Remote and merge started on '${currentBranch}'. The workflow will update local main, merge it into '${currentBranch}', run tests, and push the branch.`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Pull Remote and merge failed: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.agenticReviewOfMerge", async () => {
        (0, logger_1.log)("[agenticReviewOfMerge] triggered");
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        try {
            const currentBranch = await getCurrentBranchName(repoRoot);
            if (currentBranch === "main") {
                void vscode.window.showInformationMessage("Agentic review of Merge is only available when you are on a branch other than main.");
                return;
            }
            if (currentBranch === "detached HEAD") {
                void vscode.window.showErrorMessage("Agentic review of Merge is unavailable while Git is in a detached HEAD state.");
                return;
            }
            const statusOutput = await execInRepo("git status --porcelain", repoRoot);
            if (statusOutput.trim().length > 0) {
                void vscode.window.showWarningMessage("Commit or stash your local changes before running Agentic review of Merge so the review covers a clean merge result.");
                return;
            }
            const prompt = (0, mergeReviewPrompt_1.buildMergeReviewPrompt)({
                currentBranch,
                projectTestingCommand: (0, settings_1.getProjectTestingCommand)()
            });
            (0, logger_1.logAlways)("[agenticReviewOfMerge] delegating review to Agentic Harness");
            (0, terminal_1.runInPersistentTerminal)("Agentic Review of Merge", [
                `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
                (0, terminal_1.buildAgenticHarnessPromptCommand)(repoRoot, prompt, "prompt")
            ], {
                iconPath: new vscode.ThemeIcon("warning", new vscode.ThemeColor("terminal.ansiRed")),
                color: new vscode.ThemeColor("terminal.ansiRed")
            });
            void vscode.window.showInformationMessage(`Opened Agentic review of Merge for '${currentBranch}' using the selected Agent Harness.`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Agentic review of Merge failed: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.setFeatureFlag", async () => {
        (0, logger_1.log)("[setFeatureFlag] triggered");
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const prompt = [
            "Compare the current branch against origin/main.",
            "For every new or modified code path that introduces a behavior change,",
            "wrap it in a feature flag that can be toggled on or off via the .env file.",
            "Name each flag using the format FEATURE_<JIRA_TICKET_OR_BRANCH_SLUG>_<SHORT_DESCRIPTION> (all caps, underscores).",
            "Add each flag with a default value of false (disabled) to .env.example.",
            "If a .env file already exists in the repo root, add the same flags there too.",
            "Do not alter existing flags or unrelated code."
        ].join(" ");
        (0, logger_1.logAlways)("[setFeatureFlag] delegating to Agentic Harness");
        try {
            await (0, terminal_1.runCommandInTaskTerminal)("Set Feature Flags", (0, terminal_1.buildAgenticHarnessPromptCommand)(repoRoot, prompt, "prompt"), { cwd: repoRoot });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Set Feature Flag failed: ${message}`);
            return;
        }
        void vscode.window.showInformationMessage("Opened Feature Flag setup terminal.");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.updateGithubActions", async () => {
        launchUpdateProjectConfigPrompt("updateGithubActions", "Update Github Actions", updateProjectConfig_1.UPDATE_GITHUB_ACTIONS_PROMPT, "github-action", "Opened GitHub Actions update terminal.");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.updateTests", async () => {
        launchUpdateProjectConfigPrompt("updateTests", "Update Tests", updateProjectConfig_1.UPDATE_TESTS_PROMPT, "beaker", "Opened test update terminal.");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.reviewPullRequest", async () => {
        (0, logger_1.log)("[reviewPullRequest] triggered");
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        try {
            const statusOutput = await execInRepo("git status --porcelain", repoRoot);
            if (statusOutput.trim().length > 0) {
                void vscode.window.showWarningMessage("Commit or stash your local changes before reviewing a pull request so nothing gets lost.");
                return;
            }
            const branches = await getAvailablePullRequestBranches(repoRoot);
            if (branches.length === 0) {
                void vscode.window.showInformationMessage("No pull request branches were found on origin.");
                return;
            }
            const selectedBranch = await showReviewPullRequestDialog(branches);
            if (!selectedBranch)
                return;
            (0, terminal_1.runInPersistentTerminal)("Review Pull Request", [
                `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
                `git rev-parse --verify ${(0, utils_1.quoteShellArg)(`refs/heads/${selectedBranch}`)} >/dev/null 2>&1 && git checkout ${(0, utils_1.quoteShellArg)(selectedBranch)} || git checkout --track ${(0, utils_1.quoteShellArg)(`origin/${selectedBranch}`)}`
            ], {
                iconPath: new vscode.ThemeIcon("git-pull-request")
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Review Pull Request failed: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.approvePullRequest", async () => {
        (0, logger_1.log)("[approvePullRequest] triggered");
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const workflowFile = resolveClaudeWorkflowFile("approve_pull_request");
        if (!workflowFile) {
            void vscode.window.showErrorMessage("Approve pull request workflow not found in the configured Antigravity Workflows Folder or the bundled extension files.");
            return;
        }
        (0, terminal_1.runInPersistentTerminal)("Agentic Harness Approve Pull Request", [
            `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
            (0, terminal_1.buildAgenticHarnessPromptCommand)(repoRoot, `run this workflow ${workflowFile}`)
        ], {
            iconPath: new vscode.ThemeIcon("pass", terminal_1.CLAUDE_ACTION_COLOR),
            color: terminal_1.CLAUDE_ACTION_COLOR
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.feedbackOnPullRequest", async () => {
        void vscode.window.showInformationMessage("Feedback on Pull Request is added to the sidebar. Detailed functionality will be wired in later.");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.createRepoTag", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const version = getRepoPackageVersion(repoRoot);
        if (!version) {
            void vscode.window.showErrorMessage("Could not read the version from package.json for this repository.");
            return;
        }
        const tag = `v${version}`;
        const currentBranch = (0, git_1.getCurrentBranchNameSync)(repoRoot);
        const message = await vscode.window.showInputBox({
            title: "Create Repo Tag",
            prompt: `Tag notes for ${tag} (optional)`
        });
        if (message === undefined)
            return;
        const notes = [];
        const trimmedMessage = message.trim();
        if (trimmedMessage) {
            notes.push(trimmedMessage);
        }
        if (currentBranch && currentBranch !== "main") {
            notes.push(`Created from branch: ${currentBranch}`);
        }
        const msg = notes.join("\n\n") || tag;
        (0, terminal_1.runInPersistentTerminal)("Antigravity", [
            `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
            `git tag -a ${(0, utils_1.quoteShellArg)(tag)} -m ${(0, utils_1.quoteShellArg)(msg)} && git push origin ${(0, utils_1.quoteShellArg)(tag)} && echo "[antigravity] tag ${tag} pushed"`,
        ]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.autocommitCheckpoint", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const action = (0, git_1.isAutocommitRunning)(repoRoot) ? "stop" : "start";
        if (action === "start") {
            const hasGithub = await (0, git_1.hasGitHubRemote)(repoRoot);
            if (!hasGithub) {
                void vscode.window.showErrorMessage("No GitHub remote found for this project. Set up a GitHub repository before starting autocommit.");
                return;
            }
        }
        // Ensure both autocommit scripts are present, using bundled src/ versions.
        const srcDir = path.join(extensionRoot, "src");
        const scriptPath = await (0, scripts_1.ensureScriptFile)(repoRoot, "autocommit_changes.sh", srcDir);
        if (!scriptPath)
            return;
        await (0, scripts_1.ensureScriptFile)(repoRoot, "autocommit_revert.sh", srcDir);
        await (0, terminal_1.runInSecondaryTerminal)([
            `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
            `${(0, utils_1.quoteShellArg)(scriptPath)} ${action}`
        ]);
        refreshAutocommitUiWhenStateChanges(repoRoot, action === "start");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.autocommitRevert", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const scriptPath = await (0, scripts_1.ensureScriptFile)(repoRoot, "autocommit_revert.sh", path.join(extensionRoot, "src"));
        if (!scriptPath)
            return;
        await (0, terminal_1.runInSecondaryTerminal)([
            `cd ${(0, utils_1.quoteShellArg)(repoRoot)}`,
            `${(0, utils_1.quoteShellArg)(scriptPath)}`
        ]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.switchEnvironment", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const workspaceDir = (0, utils_1.getWorkspaceProjectPath)(repoRoot);
        const selection = await vscode.window.showQuickPick([
            { label: "DEV", value: "DEV" },
            { label: "QA", value: "QA" },
            { label: "UAT", value: "UAT" },
            { label: "PROD", value: "PROD" }
        ], {
            title: "Switch Environment",
            placeHolder: "Select target environment"
        });
        if (!selection)
            return;
        // Ensure switch-env.sh is present, downloading from the built-in GitHub fallback if missing.
        const scriptPath = await (0, scripts_1.ensureScriptFile)(repoRoot, "switch-env.sh", path.join(workspaceDir, "scripts"));
        if (!scriptPath)
            return;
        // Offer to download missing config files from the built-in GitHub fallback.
        // Files live in workspace/config/ so pass workspaceDir as the root.
        const settingsFileName = `${selection.value.toLowerCase()}-settings.yaml`;
        await (0, scripts_1.downloadConfigFileIfMissing)(workspaceDir, settingsFileName);
        await (0, scripts_1.downloadInfrastructureFileIfMissing)(workspaceDir, settingsFileName);
        await (0, scripts_1.downloadConfigFileIfMissing)(workspaceDir, ".env");
        await (0, terminal_1.runInSecondaryTerminal)([
            `cd ${(0, utils_1.quoteShellArg)(workspaceDir)}`,
            `${(0, utils_1.quoteShellArg)(scriptPath)} ${(0, utils_1.quoteShellArg)(selection.value)}`
        ]);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.openSopManual", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : undefined;
        const projectSopManualPath = repoRoot ? getProjectSopManualPath(repoRoot) : undefined;
        if (projectSopManualPath && fs.existsSync(projectSopManualPath)) {
            await (0, scripts_1.openFile)(projectSopManualPath);
            return;
        }
        try {
            const localPath = await resourceProvider.ensureFile("sop.md");
            await (0, scripts_1.openFile)(localPath);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Failed to open SOP manual: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.bringSopManualToProject", async () => {
        const rootPath = (0, utils_1.getRootPath)();
        if (!rootPath) {
            void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
            return;
        }
        const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
        const projectSopManualPath = getProjectSopManualPath(repoRoot);
        try {
            const downloadedPath = await resourceProvider.ensureFile("sop.md");
            await fs.promises.mkdir(path.dirname(projectSopManualPath), { recursive: true });
            await fs.promises.copyFile(downloadedPath, projectSopManualPath);
            void vscode.window.showInformationMessage(`Copied SOP manual to ${projectSopManualPath}.`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Failed to bring SOP manual to project: ${message}`);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.updateAgenticWorkspace", async () => {
        const rawWorkspaceProjectDir = vscode.workspace.getConfiguration("antigravity").get("antigravityWorkspaceProject") || "~/antigravity-workspace";
        const workspaceProjectDir = rawWorkspaceProjectDir.replace(/^~/, os.homedir());
        await (0, scripts_1.runRepoScript)("update-agentic-workspace", [workspaceProjectDir], { scriptDir: path.join(extensionRoot, "src") });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.updateAgenticSetup", async () => {
        const config = vscode.workspace.getConfiguration("antigravity");
        const initialValues = {
            claudeGithub: config.get("claudeSetupGithub") || "",
            geminiGithub: config.get("geminiSetupGithub") || "",
            codexGithub: config.get("codexSetupGithub") || ""
        };
        const panel = vscode.window.createWebviewPanel("antigravityAgenticSetup", "Update Agentic Setup", vscode.ViewColumn.Active, { enableScripts: true });
        panel.webview.html = (0, settings_1.renderAgenticSetupHtml)(panel.webview, initialValues);
        panel.webview.onDidReceiveMessage(async (message) => {
            try {
                await (0, terminal_1.runInSecondaryTerminal)([`echo "[antigravity] message received: ${JSON.stringify(message)}"`]);
                if (!message || message.type !== "agenticSetupUpdate") {
                    await (0, terminal_1.runInSecondaryTerminal)([`echo "[antigravity] ignored message type: ${message?.type}"`]);
                    return;
                }
                const { tool, url, all } = message;
                await (0, terminal_1.runInSecondaryTerminal)([`echo "[antigravity] update triggered: tool=${tool} url=${url}"`]);
                // Save all three values every time any Update is clicked
                if (all.claudeGithub)
                    await config.update("claudeSetupGithub", all.claudeGithub, vscode.ConfigurationTarget.Global);
                if (all.geminiGithub)
                    await config.update("geminiSetupGithub", all.geminiGithub, vscode.ConfigurationTarget.Global);
                if (all.codexGithub)
                    await config.update("codexSetupGithub", all.codexGithub, vscode.ConfigurationTarget.Global);
                await (0, terminal_1.runInSecondaryTerminal)([`echo "[antigravity] config saved, running script..."`]);
                await (0, scripts_1.runRepoScript)("update-agent-setup", url ? [tool, url] : [tool], { scriptDir: path.join(extensionRoot, "src") });
            }
            catch (err) {
                await (0, terminal_1.runInSecondaryTerminal)([`echo "[antigravity] ERROR: ${String(err)}"`]);
            }
        }, undefined, context.subscriptions);
    }));
    context.subscriptions.push(vscode.commands.registerCommand(productDesigner_1.PRODUCT_DESIGNER_COMMAND, async () => {
        const openWorkspaceRoot = (0, utils_1.getWorkspaceRoot)();
        const rootPath = (0, utils_1.getRootPath)();
        const workspaceRoot = rootPath
            ? (0, utils_1.resolveProjectWorkspaceRoot)((0, utils_1.getRepoRoot)(rootPath))
            : (0, utils_1.resolveProjectWorkspaceRoot)(openWorkspaceRoot);
        const savedValues = context.workspaceState.get(getProjectScopedStateKey("productDesignerForm"));
        const initialValues = (0, productDesigner_1.sanitizeProductDesignerFormValues)(savedValues, workspaceRoot);
        const panel = vscode.window.createWebviewPanel("antigravityProductDesigner", "Product Designer", vscode.ViewColumn.Active, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = (0, productDesigner_1.renderProductDesignerHtml)(panel.webview, initialValues);
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message)
                return;
            if (message.type === "cancelProductDesigner") {
                panel.dispose();
                return;
            }
            if (message.type !== "runProductDesigner") {
                return;
            }
            const values = (0, productDesigner_1.sanitizeProductDesignerFormValues)(message.payload, workspaceRoot);
            const missingFields = (0, productDesigner_1.getMissingProductDesignerFields)(values);
            if (missingFields.length > 0) {
                void panel.webview.postMessage({
                    type: "productDesignerError",
                    payload: {
                        message: `Fill in the required fields: ${missingFields.join(", ")}.`
                    }
                });
                return;
            }
            try {
                await context.workspaceState.update(getProjectScopedStateKey("productDesignerForm"), values);
                launchProductDesignerInNewTerminal(values);
                void vscode.window.showInformationMessage("Opened Product Designer terminal.");
                panel.dispose();
            }
            catch (error) {
                const messageText = error instanceof Error ? error.message : String(error);
                void panel.webview.postMessage({
                    type: "productDesignerError",
                    payload: { message: `Failed to open Product Designer terminal: ${messageText}` }
                });
            }
        }, undefined, context.subscriptions);
    }));
    context.subscriptions.push(vscode.commands.registerCommand(businessAnalyst_1.BUSINESS_ANALYST_COMMAND, async () => {
        const openWorkspaceRoot = (0, utils_1.getWorkspaceRoot)();
        const rootPath = (0, utils_1.getRootPath)();
        const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : openWorkspaceRoot;
        const workspaceRoot = rootPath
            ? (0, utils_1.resolveProjectWorkspaceRoot)((0, utils_1.getRepoRoot)(rootPath))
            : (0, utils_1.resolveProjectWorkspaceRoot)(openWorkspaceRoot);
        const savedJiraProjectKey = repoRoot ? getSavedJiraProjectKey(repoRoot) : "";
        const savedValues = context.workspaceState.get(getProjectScopedStateKey("businessAnalystForm"));
        const initialValues = applySavedJiraProjectKey((0, businessAnalyst_1.sanitizeBusinessAnalystFormValues)(savedValues, workspaceRoot), savedJiraProjectKey);
        const panel = vscode.window.createWebviewPanel("antigravityBusinessAnalyst", "Business Analyst", vscode.ViewColumn.Active, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = (0, businessAnalyst_1.renderBusinessAnalystHtml)(panel.webview, initialValues, savedJiraProjectKey);
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message)
                return;
            if (message.type === "cancelBusinessAnalyst") {
                panel.dispose();
                return;
            }
            if (message.type === "saveBusinessAnalystDraft") {
                const draftValues = applySavedJiraProjectKey((0, businessAnalyst_1.sanitizeBusinessAnalystFormValues)(message.payload, workspaceRoot), savedJiraProjectKey);
                await context.workspaceState.update(getProjectScopedStateKey("businessAnalystForm"), draftValues);
                return;
            }
            if (message.type !== "runBusinessAnalyst") {
                return;
            }
            const values = applySavedJiraProjectKey((0, businessAnalyst_1.sanitizeBusinessAnalystFormValues)(message.payload, workspaceRoot), savedJiraProjectKey);
            const missingFields = (0, businessAnalyst_1.getMissingBusinessAnalystFields)(values);
            if (missingFields.length > 0) {
                void panel.webview.postMessage({
                    type: "businessAnalystError",
                    payload: {
                        message: `Fill in the required fields: ${missingFields.join(", ")}.`
                    }
                });
                return;
            }
            try {
                await context.workspaceState.update(getProjectScopedStateKey("businessAnalystForm"), values);
                launchBusinessAnalystInNewTerminal(values);
                void vscode.window.showInformationMessage("Opened Business Analyst terminal.");
                panel.dispose();
            }
            catch (error) {
                const messageText = error instanceof Error ? error.message : String(error);
                void panel.webview.postMessage({
                    type: "businessAnalystError",
                    payload: { message: `Failed to open Business Analyst terminal: ${messageText}` }
                });
            }
        }, undefined, context.subscriptions);
    }));
    context.subscriptions.push(vscode.commands.registerCommand(solutionArchitect_1.SOLUTION_ARCHITECT_COMMAND, async () => {
        const openWorkspaceRoot = (0, utils_1.getWorkspaceRoot)();
        const rootPath = (0, utils_1.getRootPath)();
        const workspaceRoot = rootPath
            ? (0, utils_1.resolveProjectWorkspaceRoot)((0, utils_1.getRepoRoot)(rootPath))
            : (0, utils_1.resolveProjectWorkspaceRoot)(openWorkspaceRoot);
        const savedValues = context.workspaceState.get(getProjectScopedStateKey("solutionArchitectForm"));
        const initialValues = (0, solutionArchitect_1.sanitizeSolutionArchitectFormValues)(savedValues, workspaceRoot);
        const panel = vscode.window.createWebviewPanel("antigravitySolutionArchitect", "Solution Architect", vscode.ViewColumn.Active, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = (0, solutionArchitect_1.renderSolutionArchitectHtml)(panel.webview, initialValues);
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message)
                return;
            if (message.type === "cancelSolutionArchitect") {
                panel.dispose();
                return;
            }
            if (message.type === "saveSolutionArchitectDraft") {
                const draftValues = (0, solutionArchitect_1.sanitizeSolutionArchitectFormValues)(message.payload, workspaceRoot);
                await context.workspaceState.update(getProjectScopedStateKey("solutionArchitectForm"), draftValues);
                return;
            }
            if (message.type !== "runSolutionArchitect") {
                return;
            }
            const values = (0, solutionArchitect_1.sanitizeSolutionArchitectFormValues)(message.payload, workspaceRoot);
            const missingFields = (0, solutionArchitect_1.getMissingSolutionArchitectFields)(values);
            if (missingFields.length > 0) {
                void panel.webview.postMessage({
                    type: "solutionArchitectError",
                    payload: {
                        message: `Fill in the required fields: ${missingFields.join(", ")}.`
                    }
                });
                return;
            }
            try {
                await context.workspaceState.update(getProjectScopedStateKey("solutionArchitectForm"), values);
                launchSolutionArchitectInNewTerminal(values);
                void vscode.window.showInformationMessage("Opened Solution Architect terminal.");
                panel.dispose();
            }
            catch (error) {
                const messageText = error instanceof Error ? error.message : String(error);
                void panel.webview.postMessage({
                    type: "solutionArchitectError",
                    payload: { message: `Failed to open Solution Architect terminal: ${messageText}` }
                });
            }
        }, undefined, context.subscriptions);
    }));
    context.subscriptions.push(vscode.commands.registerCommand(estimator_1.ESTIMATOR_COMMAND, async () => {
        const openWorkspaceRoot = (0, utils_1.getWorkspaceRoot)();
        const rootPath = (0, utils_1.getRootPath)();
        const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : openWorkspaceRoot;
        const workspaceRoot = rootPath
            ? (0, utils_1.resolveProjectWorkspaceRoot)((0, utils_1.getRepoRoot)(rootPath))
            : (0, utils_1.resolveProjectWorkspaceRoot)(openWorkspaceRoot);
        const savedJiraProjectKey = repoRoot ? getSavedJiraProjectKey(repoRoot) : "";
        const savedValues = context.workspaceState.get(getProjectScopedStateKey("estimatorForm"));
        const initialValues = applySavedJiraProjectKey((0, estimator_1.sanitizeEstimatorFormValues)(savedValues, workspaceRoot), savedJiraProjectKey);
        const panel = vscode.window.createWebviewPanel("antigravityEstimator", "Estimate Project", vscode.ViewColumn.Active, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = (0, estimator_1.renderEstimatorHtml)(panel.webview, initialValues, savedJiraProjectKey);
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message)
                return;
            if (message.type === "cancelEstimator") {
                panel.dispose();
                return;
            }
            if (message.type === "saveEstimatorDraft") {
                const draftValues = applySavedJiraProjectKey((0, estimator_1.sanitizeEstimatorFormValues)(message.payload, workspaceRoot), savedJiraProjectKey);
                await context.workspaceState.update(getProjectScopedStateKey("estimatorForm"), draftValues);
                return;
            }
            if (message.type !== "runEstimator") {
                return;
            }
            const values = applySavedJiraProjectKey((0, estimator_1.sanitizeEstimatorFormValues)(message.payload, workspaceRoot), savedJiraProjectKey);
            const missingFields = (0, estimator_1.getMissingEstimatorFields)(values);
            if (missingFields.length > 0) {
                void panel.webview.postMessage({
                    type: "estimatorError",
                    payload: {
                        message: `Fill in the required fields: ${missingFields.join(", ")}.`
                    }
                });
                return;
            }
            try {
                await context.workspaceState.update(getProjectScopedStateKey("estimatorForm"), values);
                launchEstimatorInNewTerminal(values);
                void vscode.window.showInformationMessage("Opened Estimate Project terminal.");
                panel.dispose();
            }
            catch (error) {
                const messageText = error instanceof Error ? error.message : String(error);
                void panel.webview.postMessage({
                    type: "estimatorError",
                    payload: { message: `Failed to open Estimate Project terminal: ${messageText}` }
                });
            }
        }, undefined, context.subscriptions);
    }));
    context.subscriptions.push(vscode.commands.registerCommand(planExecution_1.PLAN_EXECUTION_COMMAND, async () => {
        const openWorkspaceRoot = (0, utils_1.getWorkspaceRoot)();
        const rootPath = (0, utils_1.getRootPath)();
        const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : openWorkspaceRoot;
        const workspaceRoot = rootPath
            ? (0, utils_1.resolveProjectWorkspaceRoot)((0, utils_1.getRepoRoot)(rootPath))
            : (0, utils_1.resolveProjectWorkspaceRoot)(openWorkspaceRoot);
        const savedJiraProjectKey = repoRoot ? getSavedJiraProjectKey(repoRoot) : "";
        const savedValues = context.workspaceState.get(getProjectScopedStateKey("planExecutionForm"));
        const initialValues = applySavedJiraProjectKey((0, planExecution_1.sanitizePlanExecutionFormValues)(savedValues, workspaceRoot), savedJiraProjectKey);
        const panel = vscode.window.createWebviewPanel("antigravityPlanExecution", "Create Execution Plan", vscode.ViewColumn.Active, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = (0, planExecution_1.renderPlanExecutionHtml)(panel.webview, initialValues, savedJiraProjectKey);
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message)
                return;
            if (message.type === "cancelPlanExecution") {
                panel.dispose();
                return;
            }
            if (message.type === "savePlanExecutionDraft") {
                const draftValues = applySavedJiraProjectKey((0, planExecution_1.sanitizePlanExecutionFormValues)(message.payload, workspaceRoot), savedJiraProjectKey);
                await context.workspaceState.update(getProjectScopedStateKey("planExecutionForm"), draftValues);
                return;
            }
            if (message.type !== "runPlanExecution") {
                return;
            }
            const values = applySavedJiraProjectKey((0, planExecution_1.sanitizePlanExecutionFormValues)(message.payload, workspaceRoot), savedJiraProjectKey);
            const missingFields = (0, planExecution_1.getMissingPlanExecutionFields)(values);
            if (missingFields.length > 0) {
                void panel.webview.postMessage({
                    type: "planExecutionError",
                    payload: {
                        message: `Fill in the required fields: ${missingFields.join(", ")}.`
                    }
                });
                return;
            }
            try {
                await context.workspaceState.update(getProjectScopedStateKey("planExecutionForm"), values);
                launchPlanExecutionInNewTerminal(values);
                void vscode.window.showInformationMessage("Opened Create Execution Plan terminal.");
                panel.dispose();
            }
            catch (error) {
                const messageText = error instanceof Error ? error.message : String(error);
                void panel.webview.postMessage({
                    type: "planExecutionError",
                    payload: { message: `Failed to open Create Execution Plan terminal: ${messageText}` }
                });
            }
        }, undefined, context.subscriptions);
    }));
    context.subscriptions.push(vscode.commands.registerCommand(developer_1.DEVELOPER_COMMAND, async () => {
        const openWorkspaceRoot = (0, utils_1.getWorkspaceRoot)();
        const rootPath = (0, utils_1.getRootPath)();
        const repoRoot = rootPath ? (0, utils_1.getRepoRoot)(rootPath) : openWorkspaceRoot;
        const workspaceRoot = rootPath
            ? (0, utils_1.resolveProjectWorkspaceRoot)((0, utils_1.getRepoRoot)(rootPath))
            : (0, utils_1.resolveProjectWorkspaceRoot)(openWorkspaceRoot);
        const savedJiraProjectKey = repoRoot ? getSavedJiraProjectKey(repoRoot) : "";
        const savedValues = context.workspaceState.get(getProjectScopedStateKey("developerForm"));
        const initialValues = applySavedJiraProjectKey((0, developer_1.sanitizeDeveloperFormValues)(savedValues, workspaceRoot), savedJiraProjectKey);
        const panel = vscode.window.createWebviewPanel("antigravityDeveloper", "Develop Execution Plan", vscode.ViewColumn.Active, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = (0, developer_1.renderDeveloperHtml)(panel.webview, initialValues, savedJiraProjectKey);
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message)
                return;
            if (message.type === "cancelDeveloper") {
                panel.dispose();
                return;
            }
            if (message.type === "saveDeveloperDraft") {
                const draftValues = applySavedJiraProjectKey((0, developer_1.sanitizeDeveloperFormValues)(message.payload, workspaceRoot), savedJiraProjectKey);
                await context.workspaceState.update(getProjectScopedStateKey("developerForm"), draftValues);
                return;
            }
            if (message.type !== "runDeveloper") {
                return;
            }
            const values = applySavedJiraProjectKey((0, developer_1.sanitizeDeveloperFormValues)(message.payload, workspaceRoot), savedJiraProjectKey);
            const missingFields = (0, developer_1.getMissingDeveloperFields)(values);
            if (missingFields.length > 0) {
                void panel.webview.postMessage({
                    type: "developerError",
                    payload: {
                        message: `Fill in the required fields: ${missingFields.join(", ")}.`
                    }
                });
                return;
            }
            try {
                await context.workspaceState.update(getProjectScopedStateKey("developerForm"), values);
                launchDeveloperInNewTerminal(values);
                void vscode.window.showInformationMessage("Opened Develop Execution Plan terminal.");
                panel.dispose();
            }
            catch (error) {
                const messageText = error instanceof Error ? error.message : String(error);
                void panel.webview.postMessage({
                    type: "developerError",
                    payload: { message: `Failed to open Develop Execution Plan terminal: ${messageText}` }
                });
            }
        }, undefined, context.subscriptions);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.backupCompress", async (uri) => {
        const targetPath = uri?.fsPath;
        if (!targetPath) {
            void vscode.window.showErrorMessage("No file or folder selected.");
            return;
        }
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        const dir = path.dirname(targetPath);
        const base = path.basename(targetPath);
        const zipName = `${base} [${timestamp}].zip`;
        const zipPath = path.join(dir, zipName);
        const isDir = fs.statSync(targetPath).isDirectory();
        const flag = isDir ? "-r" : "";
        const cmd = `zip ${flag} ${(0, utils_1.quoteShellArg)(zipPath)} ${(0, utils_1.quoteShellArg)(base)}`.trim();
        (0, child_process_1.exec)(cmd, { cwd: dir }, (error) => {
            if (error) {
                void vscode.window.showErrorMessage(`Backup-Compress failed: ${error.message}`);
            }
            else {
                void vscode.window.showInformationMessage(`Backup created: ${zipName}`);
            }
        });
    }));
    const runDiffMerge = async (uri, uris) => {
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
            .filter((item) => Boolean(item));
        const invalidPath = filePaths.find((filePath) => {
            try {
                return fs.statSync(filePath).isDirectory();
            }
            catch {
                return true;
            }
        });
        if (invalidPath) {
            void vscode.window.showErrorMessage("DiffMerge can only be launched with existing files.");
            return;
        }
        const proc = (0, child_process_1.spawn)("open", ["-a", "/Applications/DiffMerge.app", "--args", ...filePaths], { shell: false });
        proc.on("error", (error) => {
            void vscode.window.showErrorMessage(`DiffMerge failed: ${error.message}`);
        });
        proc.on("exit", (code) => {
            if (code && code !== 0) {
                void vscode.window.showErrorMessage(`DiffMerge exited with code ${code}.`);
            }
        });
    };
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.diffMergeSingle", runDiffMerge));
    context.subscriptions.push(vscode.commands.registerCommand("antigravity.diffMergeFiles", runDiffMerge));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map