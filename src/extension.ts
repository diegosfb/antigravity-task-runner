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
  normalizeStringArray,
  readClaudeAnthropicBaseUrl,
  isLocalLiteLLMBaseUrl,
  LOCAL_LITELLM_READY_URL
} from "./settings";
import { runRepoScript, runWorkflow, runAgent, openFile, ensureScriptFile, downloadConfigFileIfMissing, downloadInfrastructureFileIfMissing } from "./scripts";
import {
  getRootPath,
  getRepoRoot,
  getWorkspaceProjectPath,
  listInfrastructureYamlFiles,
  findNestedGitFolders,
  quoteShellArg,
  waitForUrlReady
} from "./utils";
import { initLogger, log, logAlways, showOutputChannel } from "./logger";

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Antigravity Task Runner");
  context.subscriptions.push(outputChannel);
  initLogger(outputChannel);

  const provider = new AntigravityViewProvider();
  const extensionRoot = context.extensionPath;
  log(`[activate] Extension root: ${extensionRoot}`);

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
    const primaryPath = path.join(
      os.homedir(),
      ".gemini",
      "workflows",
      workflowName,
      "WORKFLOW.md"
    );
    if (fs.existsSync(primaryPath)) return primaryPath;

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
      runInNewTerminal(`Agent: ${agentName}`, [
        `cd ${quoteShellArg(repoRoot)}`,
        `claude --agent ${quoteShellArg(agentName)}`
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
      const workflowFile = resolveClaudeWorkflowFile("create_feature_branch");
      if (!workflowFile) {
        void vscode.window.showErrorMessage(
          "Create feature branch workflow not found in ~/.gemini or the bundled extension files."
        );
        return;
      }
      const dialogResult = await showCreateFeatureBranchDialog();
      if (!dialogResult) return;
      const { branchType, branchName } = dialogResult;
      log(`[createFeatureBranch] branchName: ${branchName}`);
      runInNewTerminal(
        "Claude Feature Branch",
        [
          `cd ${quoteShellArg(repoRoot)}`,
          `claude --dangerously-skip-permissions ${quoteShellArg(
            `run this workflow ${workflowFile}. Use branch type ${branchType.label} and branch name ${branchName}. Do not ask for them again.`
          )}`
        ],
        {
          iconPath: new vscode.ThemeIcon("git-branch", CLAUDE_ACTION_COLOR),
          color: CLAUDE_ACTION_COLOR
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
      const workflowFile = resolveClaudeWorkflowFile("create_pull_request");
      if (!workflowFile) {
        void vscode.window.showErrorMessage(
          "Create pull request workflow not found in ~/.gemini or the bundled extension files."
        );
        return;
      }
      runInNewTerminal(
        "Claude Pull Request",
        [
          `cd ${quoteShellArg(repoRoot)}`,
          `claude --dangerously-skip-permissions ${quoteShellArg(`run this workflow ${workflowFile}`)}`
        ],
        {
          iconPath: new vscode.ThemeIcon("git-pull-request", CLAUDE_ACTION_COLOR),
          color: CLAUDE_ACTION_COLOR
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

        const commands = [
          `cd ${quoteShellArg(repoRoot)}`,
          `git rev-parse --verify ${quoteShellArg(`refs/heads/${selectedBranch}`)} >/dev/null 2>&1 && git checkout ${quoteShellArg(selectedBranch)} || git checkout --track ${quoteShellArg(`origin/${selectedBranch}`)}`
        ];
        if (selectedBranch === "main") {
          commands.push("git pull origin main");
        }

        runInNewTerminal(
          "Checkout Branch",
          commands,
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
          "Approve pull request workflow not found in ~/.gemini or the bundled extension files."
        );
        return;
      }
      runInNewTerminal(
        "Claude Approve Pull Request",
        [
          `cd ${quoteShellArg(repoRoot)}`,
          `claude --dangerously-skip-permissions ${quoteShellArg(`run this workflow ${workflowFile}`)}`
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
      provider.refresh();
      setTimeout(() => {
        provider.refresh();
      }, 1000);
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
