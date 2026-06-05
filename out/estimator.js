"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ESTIMATOR_COMMAND = void 0;
exports.getDefaultEstimatorValues = getDefaultEstimatorValues;
exports.sanitizeEstimatorFormValues = sanitizeEstimatorFormValues;
exports.getMissingEstimatorFields = getMissingEstimatorFields;
exports.buildEstimatorCommand = buildEstimatorCommand;
exports.renderEstimatorHtml = renderEstimatorHtml;
const path = require("path");
const jiraRunner_1 = require("./jiraRunner");
const settings_1 = require("./settings");
const utils_1 = require("./utils");
exports.ESTIMATOR_COMMAND = "antigravity.openEstimator";
function getDefaultProjectInputs(workspace) {
    return {
        projectDescriptionDir: workspace ? path.join(workspace, "docs", "project_description") : "",
        architectureDir: workspace ? path.join(workspace, "docs", "architecture") : "",
        backlogDir: workspace ? path.join(workspace, "docs", "backlog") : ""
    };
}
function getDefaultEstimatorValues(workspaceRoot) {
    const workspace = workspaceRoot ?? "";
    const projectInputs = getDefaultProjectInputs(workspace);
    return {
        agentHarness: "Codex",
        agentModel: "",
        agentIntelligence: "",
        workspace,
        projectDescriptionDir: projectInputs.projectDescriptionDir,
        architectureDir: projectInputs.architectureDir,
        backlogDir: projectInputs.backlogDir,
        ...(0, jiraRunner_1.getDefaultJiraRunnerValues)(),
        agentScriptPath: ""
    };
}
function sanitizeEstimatorFormValues(values, workspaceRoot) {
    const defaults = getDefaultEstimatorValues(workspaceRoot);
    const workspace = typeof values?.workspace === "string" ? values.workspace.trim() : defaults.workspace;
    const jiraValues = (0, jiraRunner_1.sanitizeJiraRunnerValues)({
        enableJira: values?.enableJira === true ||
            (typeof values?.jiraProjectName === "string" && values.jiraProjectName.trim().length > 0),
        jiraProjectName: values?.jiraProjectName
    });
    return {
        agentHarness: typeof values?.agentHarness === "string" ? values.agentHarness.trim() : defaults.agentHarness,
        agentModel: typeof values?.agentModel === "string" ? values.agentModel.trim() : defaults.agentModel,
        agentIntelligence: typeof values?.agentIntelligence === "string"
            ? values.agentIntelligence.trim()
            : defaults.agentIntelligence,
        workspace,
        projectDescriptionDir: typeof values?.projectDescriptionDir === "string"
            ? values.projectDescriptionDir.trim()
            : getDefaultProjectInputs(workspace).projectDescriptionDir,
        architectureDir: typeof values?.architectureDir === "string"
            ? values.architectureDir.trim()
            : getDefaultProjectInputs(workspace).architectureDir,
        backlogDir: typeof values?.backlogDir === "string"
            ? values.backlogDir.trim()
            : getDefaultProjectInputs(workspace).backlogDir,
        ...jiraValues,
        agentScriptPath: typeof values?.agentScriptPath === "string" ? values.agentScriptPath.trim() : defaults.agentScriptPath
    };
}
function getMissingEstimatorFields(values) {
    const missing = [];
    if (!values.agentHarness)
        missing.push("Agent Harness");
    if (!values.workspace)
        missing.push("Project Workspace folder");
    if (!values.projectDescriptionDir)
        missing.push("Project Description folder");
    if (!values.architectureDir)
        missing.push("Project Architecture folder");
    if (!values.backlogDir)
        missing.push("Project Backlog folder");
    if (!values.agentScriptPath)
        missing.push("Agent Script Path");
    missing.push(...(0, jiraRunner_1.getMissingJiraRunnerFields)(values));
    return missing;
}
function buildEstimatorCommand(values) {
    const parts = [
        (0, utils_1.quoteShellArg)(values.agentScriptPath),
        ...(values.projectDescriptionDir
            ? ["--project-description-dir", (0, utils_1.quoteShellArg)(values.projectDescriptionDir)]
            : []),
        ...(values.architectureDir ? ["--architecture-dir", (0, utils_1.quoteShellArg)(values.architectureDir)] : []),
        ...(values.backlogDir ? ["--backlog-dir", (0, utils_1.quoteShellArg)(values.backlogDir)] : []),
        "--workspace",
        (0, utils_1.quoteShellArg)(values.workspace),
        "--harness",
        (0, utils_1.quoteShellArg)(values.agentHarness)
    ];
    if (values.agentModel) {
        parts.push("--model", (0, utils_1.quoteShellArg)(values.agentModel));
    }
    if (values.agentIntelligence) {
        parts.push("--intelligence", (0, utils_1.quoteShellArg)(values.agentIntelligence));
    }
    parts.push(...(0, jiraRunner_1.buildJiraRunnerArgs)(values));
    return parts.join(" ");
}
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function renderEstimatorHtml(webview, initialValues) {
    const nonce = (0, settings_1.getNonce)();
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
    const values = JSON.stringify(initialValues);
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Estimate Project</title>
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
      .section {
        display: grid;
        gap: 16px;
        padding: 16px;
        border: 1px solid var(--vscode-panel-border, var(--vscode-input-border, transparent));
        border-radius: 10px;
        background: var(--vscode-sideBar-background, var(--vscode-editorWidget-background, transparent));
      }
      .section-title {
        margin: 0;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--vscode-descriptionForeground);
      }
      .grid {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }
      .grid.two-column {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      label {
        display: grid;
        gap: 6px;
        font-size: 13px;
      }
      input,
      button {
        font: inherit;
      }
      input[type="checkbox"] {
        width: auto;
        margin: 0;
      }
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
      .required::after {
        content: " *";
        color: var(--vscode-errorForeground);
      }
      .checkbox-label {
        grid-template-columns: auto 1fr;
        align-items: center;
        column-gap: 10px;
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
      button[type="submit"]:disabled {
        cursor: not-allowed;
        color: var(--vscode-button-secondaryForeground);
        background: var(--vscode-button-secondaryBackground);
        opacity: 0.65;
      }
      button[type="button"] {
        color: var(--vscode-button-secondaryForeground);
        background: var(--vscode-button-secondaryBackground);
      }
      @media (max-width: 720px) {
        .grid.two-column {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <form id="estimatorForm">
      <section class="section">
        <p class="section-title">Agent Settings</p>
        <label>
          <span class="required">Agent Harness</span>
          <input id="agentHarness" name="agentHarness" value="${escapeHtml(initialValues.agentHarness)}" required />
        </label>
        <div class="grid two-column">
          <label>
            <span>Agent Model</span>
            <input id="agentModel" name="agentModel" value="${escapeHtml(initialValues.agentModel)}" />
          </label>
          <label>
            <span>Agent Intelligence</span>
            <input id="agentIntelligence" name="agentIntelligence" value="${escapeHtml(initialValues.agentIntelligence)}" />
          </label>
        </div>
      </section>

      <section class="section">
        <p class="section-title">Project Inputs</p>
        <label>
          <span class="required">Project Workspace folder</span>
          <input id="workspace" name="workspace" value="${escapeHtml(initialValues.workspace)}" required />
          <span class="hint">Defaults to the project root folder when a project is open.</span>
        </label>

        <label>
          <span class="required">Project Description folder</span>
          <input id="projectDescriptionDir" name="projectDescriptionDir" value="${escapeHtml(initialValues.projectDescriptionDir)}" required />
        </label>

        <label>
          <span class="required">Project Architecture folder</span>
          <input id="architectureDir" name="architectureDir" value="${escapeHtml(initialValues.architectureDir)}" required />
        </label>

        <label>
          <span class="required">Project Backlog folder</span>
          <input id="backlogDir" name="backlogDir" value="${escapeHtml(initialValues.backlogDir)}" required />
        </label>
      </section>

      <section class="section">
        <p class="section-title">Jira</p>
        <label class="checkbox-label">
          <input
            id="enableJira"
            name="enableJira"
            type="checkbox"
            ${initialValues.enableJira ? "checked" : ""}
          />
          <span>Enable Jira using configured credentials</span>
        </label>
        <label>
          <span>Jira Project Name</span>
          <input
            id="jiraProjectName"
            name="jiraProjectName"
            value="${escapeHtml(initialValues.jiraProjectName)}"
            ${initialValues.enableJira ? "" : "disabled"}
          />
          <span class="hint">Uses Jira Username, Jira URL, and Jira API Token from the Antigravity settings.</span>
        </label>
      </section>

      <section class="section">
        <p class="section-title">Execution</p>
        <label>
          <span class="required">Agent Script Path</span>
          <input id="agentScriptPath" name="agentScriptPath" value="${escapeHtml(initialValues.agentScriptPath)}" required />
        </label>
      </section>

      <div id="errorMessage" class="error" aria-live="polite"></div>

      <div class="actions">
        <button type="button" id="cancelButton">Cancel</button>
        <button type="submit" id="runButton">Run</button>
      </div>
    </form>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const initialValues = ${values};
      const form = document.getElementById("estimatorForm");
      const errorMessage = document.getElementById("errorMessage");
      const runButton = document.getElementById("runButton");
      const cancelButton = document.getElementById("cancelButton");
      const agentHarnessInput = document.getElementById("agentHarness");
      const workspaceInput = document.getElementById("workspace");
      const projectDescriptionDirInput = document.getElementById("projectDescriptionDir");
      const architectureDirInput = document.getElementById("architectureDir");
      const backlogDirInput = document.getElementById("backlogDir");
      const enableJiraInput = document.getElementById("enableJira");
      const jiraProjectNameInput = document.getElementById("jiraProjectName");
      const agentScriptPathInput = document.getElementById("agentScriptPath");
      const requiredFields = [
        agentHarnessInput,
        workspaceInput,
        projectDescriptionDirInput,
        architectureDirInput,
        backlogDirInput,
        agentScriptPathInput
      ];
      let draftSaveTimer;

      function joinPath(base, ...parts) {
        if (!base) return "";
        const trailingSlash = /[\\\\/]$/.test(base);
        const separator = base.includes("\\\\") ? "\\\\" : "/";
        const normalizedBase = trailingSlash ? base.slice(0, -1) : base;
        return [normalizedBase, ...parts].join(separator);
      }

      function getDefaultFolders(workspace) {
        return {
          projectDescriptionDir: workspace ? joinPath(workspace, "docs", "project_description") : "",
          architectureDir: workspace ? joinPath(workspace, "docs", "architecture") : "",
          backlogDir: workspace ? joinPath(workspace, "docs", "backlog") : ""
        };
      }

      function syncProjectFolderDefaults() {
        const defaults = getDefaultFolders(workspaceInput.value.trim());
        if (projectDescriptionDirInput.dataset.userModified !== "true") {
          projectDescriptionDirInput.value = defaults.projectDescriptionDir;
        }
        if (architectureDirInput.dataset.userModified !== "true") {
          architectureDirInput.value = defaults.architectureDir;
        }
        if (backlogDirInput.dataset.userModified !== "true") {
          backlogDirInput.value = defaults.backlogDir;
        }
      }

      function refreshProjectFolderFlags() {
        const defaults = getDefaultFolders(workspaceInput.value.trim());
        projectDescriptionDirInput.dataset.userModified = String(
          projectDescriptionDirInput.value.trim() !== defaults.projectDescriptionDir
        );
        architectureDirInput.dataset.userModified = String(
          architectureDirInput.value.trim() !== defaults.architectureDir
        );
        backlogDirInput.dataset.userModified = String(
          backlogDirInput.value.trim() !== defaults.backlogDir
        );
      }

      function getPayload() {
        const data = new FormData(form);
        return {
          agentHarness: String(data.get("agentHarness") || "").trim(),
          agentModel: String(data.get("agentModel") || "").trim(),
          agentIntelligence: String(data.get("agentIntelligence") || "").trim(),
          workspace: String(data.get("workspace") || "").trim(),
          projectDescriptionDir: String(data.get("projectDescriptionDir") || "").trim(),
          architectureDir: String(data.get("architectureDir") || "").trim(),
          backlogDir: String(data.get("backlogDir") || "").trim(),
          enableJira: enableJiraInput.checked,
          jiraProjectName: String(data.get("jiraProjectName") || "").trim(),
          agentScriptPath: String(data.get("agentScriptPath") || "").trim()
        };
      }

      function syncJiraFields() {
        jiraProjectNameInput.disabled = !enableJiraInput.checked;
      }

      function queueDraftSave() {
        window.clearTimeout(draftSaveTimer);
        draftSaveTimer = window.setTimeout(() => {
          const payload = getPayload();
          vscode.setState(payload);
          vscode.postMessage({
            type: "saveEstimatorDraft",
            payload
          });
        }, 150);
      }

      function syncRunButton() {
        runButton.disabled =
          requiredFields.some((field) => !field.value.trim()) ||
          (enableJiraInput.checked && !jiraProjectNameInput.value.trim());
      }

      workspaceInput.addEventListener("input", () => {
        syncProjectFolderDefaults();
        refreshProjectFolderFlags();
      });

      projectDescriptionDirInput.addEventListener("input", () => {
        const defaults = getDefaultFolders(workspaceInput.value.trim());
        projectDescriptionDirInput.dataset.userModified = String(
          projectDescriptionDirInput.value.trim() !== defaults.projectDescriptionDir
        );
      });

      architectureDirInput.addEventListener("input", () => {
        const defaults = getDefaultFolders(workspaceInput.value.trim());
        architectureDirInput.dataset.userModified = String(
          architectureDirInput.value.trim() !== defaults.architectureDir
        );
      });

      backlogDirInput.addEventListener("input", () => {
        const defaults = getDefaultFolders(workspaceInput.value.trim());
        backlogDirInput.dataset.userModified = String(
          backlogDirInput.value.trim() !== defaults.backlogDir
        );
      });

      enableJiraInput.addEventListener("change", () => {
        syncJiraFields();
        syncRunButton();
        queueDraftSave();
      });

      form.addEventListener("input", () => {
        errorMessage.textContent = "";
        syncRunButton();
        queueDraftSave();
      });

      cancelButton.addEventListener("click", () => {
        vscode.postMessage({ type: "cancelEstimator" });
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const payload = getPayload();
        const missing = [];
        if (!payload.agentHarness) missing.push("Agent Harness");
        if (!payload.workspace) missing.push("Project Workspace folder");
        if (!payload.projectDescriptionDir) missing.push("Project Description folder");
        if (!payload.architectureDir) missing.push("Project Architecture folder");
        if (!payload.backlogDir) missing.push("Project Backlog folder");
        if (!payload.agentScriptPath) missing.push("Agent Script Path");
        if (payload.enableJira && !payload.jiraProjectName) missing.push("Jira Project Name");
        if (missing.length > 0) {
          errorMessage.textContent = "Fill in the required fields: " + missing.join(", ") + ".";
          syncRunButton();
          return;
        }

        vscode.postMessage({
          type: "runEstimator",
          payload
        });
      });

      Object.entries(vscode.getState() || initialValues).forEach(([key, value]) => {
        const input = form.elements.namedItem(key);
        if (input instanceof HTMLInputElement && input.type === "checkbox") {
          input.checked = value === true;
        } else if (input && "value" in input) {
          input.value = typeof value === "string" ? value : "";
        }
      });
      refreshProjectFolderFlags();
      syncProjectFolderDefaults();
      syncJiraFields();
      syncRunButton();

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (!message || typeof message !== "object") return;
        if (message.type === "estimatorError") {
          errorMessage.textContent =
            message.payload?.message || "Unable to start Estimate Project.";
        }
      });
    </script>
  </body>
</html>`;
}
//# sourceMappingURL=estimator.js.map