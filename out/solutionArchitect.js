"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOLUTION_ARCHITECT_COMMAND = void 0;
exports.getDefaultSolutionArchitectValues = getDefaultSolutionArchitectValues;
exports.sanitizeSolutionArchitectFormValues = sanitizeSolutionArchitectFormValues;
exports.getMissingSolutionArchitectFields = getMissingSolutionArchitectFields;
exports.buildSolutionArchitectCommand = buildSolutionArchitectCommand;
exports.renderSolutionArchitectHtml = renderSolutionArchitectHtml;
const path = require("path");
const settings_1 = require("./settings");
const utils_1 = require("./utils");
exports.SOLUTION_ARCHITECT_COMMAND = "antigravity.openSolutionArchitect";
function getDefaultProjectInputs(workspace) {
    return {
        projectDescriptionDir: workspace ? path.join(workspace, "docs", "project_description") : "",
        specsDir: workspace ? path.join(workspace, "docs", "specs") : "",
        architectureGuidelinesFolder: workspace
            ? path.join(workspace, "docs", "architecture", "architecture_guidelines")
            : "",
        backlogDir: workspace ? path.join(workspace, "docs", "backlog") : ""
    };
}
function getDefaultSolutionArchitectValues(workspaceRoot) {
    const workspace = workspaceRoot ?? "";
    const projectInputs = getDefaultProjectInputs(workspace);
    return {
        agentHarness: "Codex",
        agentModel: "",
        agentIntelligence: "",
        workspace,
        projectDescriptionDir: projectInputs.projectDescriptionDir,
        specsDir: projectInputs.specsDir,
        architectureGuidelinesFolder: projectInputs.architectureGuidelinesFolder,
        backlogDir: projectInputs.backlogDir,
        agentScriptPath: ""
    };
}
function sanitizeSolutionArchitectFormValues(values, workspaceRoot) {
    const defaults = getDefaultSolutionArchitectValues(workspaceRoot);
    const workspace = typeof values?.workspace === "string" ? values.workspace.trim() : defaults.workspace;
    const defaultProjectInputs = getDefaultProjectInputs(workspace);
    const legacyArchitectureGuidelinesFile = typeof values?.architectureGuidelinesFile === "string"
        ? values.architectureGuidelinesFile.trim()
        : "";
    return {
        agentHarness: typeof values?.agentHarness === "string" ? values.agentHarness.trim() : defaults.agentHarness,
        agentModel: typeof values?.agentModel === "string" ? values.agentModel.trim() : defaults.agentModel,
        agentIntelligence: typeof values?.agentIntelligence === "string" ? values.agentIntelligence.trim() : defaults.agentIntelligence,
        workspace,
        projectDescriptionDir: typeof values?.projectDescriptionDir === "string"
            ? values.projectDescriptionDir.trim()
            : defaultProjectInputs.projectDescriptionDir,
        specsDir: typeof values?.specsDir === "string"
            ? values.specsDir.trim()
            : defaultProjectInputs.specsDir,
        architectureGuidelinesFolder: typeof values?.architectureGuidelinesFolder === "string"
            ? values.architectureGuidelinesFolder.trim()
            : legacyArchitectureGuidelinesFile || defaultProjectInputs.architectureGuidelinesFolder,
        backlogDir: typeof values?.backlogDir === "string"
            ? values.backlogDir.trim()
            : defaultProjectInputs.backlogDir,
        agentScriptPath: typeof values?.agentScriptPath === "string" ? values.agentScriptPath.trim() : defaults.agentScriptPath
    };
}
function getMissingSolutionArchitectFields(values) {
    const missing = [];
    if (!values.agentHarness)
        missing.push("Agent Harness");
    if (!values.workspace)
        missing.push("Project Workspace folder");
    if (!values.projectDescriptionDir)
        missing.push("Project Description folder");
    if (!values.specsDir)
        missing.push("Project Specs folder");
    if (!values.agentScriptPath)
        missing.push("Agent Script Path");
    return missing;
}
function buildSolutionArchitectCommand(values) {
    const parts = [
        (0, utils_1.quoteShellArg)(values.agentScriptPath),
        ...(values.specsDir ? ["--specs-dir", (0, utils_1.quoteShellArg)(values.specsDir)] : []),
        ...(values.backlogDir ? ["--backlog-dir", (0, utils_1.quoteShellArg)(values.backlogDir)] : []),
        "--workspace",
        (0, utils_1.quoteShellArg)(values.workspace),
        "--project-description-dir",
        (0, utils_1.quoteShellArg)(values.projectDescriptionDir),
        "--harness",
        (0, utils_1.quoteShellArg)(values.agentHarness)
    ];
    if (values.architectureGuidelinesFolder) {
        parts.push("--architecture-guidelines-folder", (0, utils_1.quoteShellArg)(values.architectureGuidelinesFolder));
    }
    if (values.agentModel) {
        parts.push("--model", (0, utils_1.quoteShellArg)(values.agentModel));
    }
    if (values.agentIntelligence) {
        parts.push("--intelligence", (0, utils_1.quoteShellArg)(values.agentIntelligence));
    }
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
function renderSolutionArchitectHtml(webview, initialValues) {
    const nonce = (0, settings_1.getNonce)();
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
    const values = JSON.stringify(initialValues);
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Solution Architect</title>
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
    <form id="solutionArchitectForm">
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
          <span class="required">Project Specs folder</span>
          <input id="specsDir" name="specsDir" value="${escapeHtml(initialValues.specsDir)}" required />
        </label>

        <label>
          <span>Project Architecture guidelines folder</span>
          <input id="architectureGuidelinesFolder" name="architectureGuidelinesFolder" value="${escapeHtml(initialValues.architectureGuidelinesFolder)}" />
        </label>

        <label>
          <span>Project Backlog folder</span>
          <input id="backlogDir" name="backlogDir" value="${escapeHtml(initialValues.backlogDir)}" />
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
      const form = document.getElementById("solutionArchitectForm");
      const errorMessage = document.getElementById("errorMessage");
      const runButton = document.getElementById("runButton");
      const cancelButton = document.getElementById("cancelButton");
      const agentHarnessInput = document.getElementById("agentHarness");
      const workspaceInput = document.getElementById("workspace");
      const projectDescriptionDirInput = document.getElementById("projectDescriptionDir");
      const specsDirInput = document.getElementById("specsDir");
      const architectureGuidelinesFolderInput = document.getElementById("architectureGuidelinesFolder");
      const backlogDirInput = document.getElementById("backlogDir");
      const agentScriptPathInput = document.getElementById("agentScriptPath");
      const requiredFields = [
        agentHarnessInput,
        workspaceInput,
        projectDescriptionDirInput,
        specsDirInput,
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
          specsDir: workspace ? joinPath(workspace, "docs", "specs") : "",
          architectureGuidelinesFolder: workspace ? joinPath(workspace, "docs", "architecture", "architecture_guidelines") : "",
          backlogDir: workspace ? joinPath(workspace, "docs", "backlog") : ""
        };
      }

      function syncProjectFolderDefaults() {
        const defaults = getDefaultFolders(workspaceInput.value.trim());
        if (projectDescriptionDirInput.dataset.userModified !== "true") {
          projectDescriptionDirInput.value = defaults.projectDescriptionDir;
        }
        if (specsDirInput.dataset.userModified !== "true") {
          specsDirInput.value = defaults.specsDir;
        }
        if (architectureGuidelinesFolderInput.dataset.userModified !== "true") {
          architectureGuidelinesFolderInput.value = defaults.architectureGuidelinesFolder;
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
        specsDirInput.dataset.userModified = String(specsDirInput.value.trim() !== defaults.specsDir);
        architectureGuidelinesFolderInput.dataset.userModified = String(
          architectureGuidelinesFolderInput.value.trim() !== defaults.architectureGuidelinesFolder
        );
        backlogDirInput.dataset.userModified = String(backlogDirInput.value.trim() !== defaults.backlogDir);
      }

      function getPayload() {
        const data = new FormData(form);
        return {
          agentHarness: String(data.get("agentHarness") || "").trim(),
          agentModel: String(data.get("agentModel") || "").trim(),
          agentIntelligence: String(data.get("agentIntelligence") || "").trim(),
          workspace: String(data.get("workspace") || "").trim(),
          projectDescriptionDir: String(data.get("projectDescriptionDir") || "").trim(),
          specsDir: String(data.get("specsDir") || "").trim(),
          architectureGuidelinesFolder: String(data.get("architectureGuidelinesFolder") || "").trim(),
          backlogDir: String(data.get("backlogDir") || "").trim(),
          agentScriptPath: String(data.get("agentScriptPath") || "").trim()
        };
      }

      function queueDraftSave() {
        window.clearTimeout(draftSaveTimer);
        draftSaveTimer = window.setTimeout(() => {
          const payload = getPayload();
          vscode.setState(payload);
          vscode.postMessage({
            type: "saveSolutionArchitectDraft",
            payload
          });
        }, 150);
      }

      function syncRunButton() {
        runButton.disabled = requiredFields.some((field) => !field.value.trim());
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

      specsDirInput.addEventListener("input", () => {
        const defaults = getDefaultFolders(workspaceInput.value.trim());
        specsDirInput.dataset.userModified = String(specsDirInput.value.trim() !== defaults.specsDir);
      });

      architectureGuidelinesFolderInput.addEventListener("input", () => {
        const defaults = getDefaultFolders(workspaceInput.value.trim());
        architectureGuidelinesFolderInput.dataset.userModified = String(
          architectureGuidelinesFolderInput.value.trim() !== defaults.architectureGuidelinesFolder
        );
      });

      backlogDirInput.addEventListener("input", () => {
        const defaults = getDefaultFolders(workspaceInput.value.trim());
        backlogDirInput.dataset.userModified = String(backlogDirInput.value.trim() !== defaults.backlogDir);
      });

      form.addEventListener("input", () => {
        errorMessage.textContent = "";
        syncRunButton();
        queueDraftSave();
      });

      cancelButton.addEventListener("click", () => {
        vscode.postMessage({ type: "cancelSolutionArchitect" });
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const payload = getPayload();
        if (
          !payload.agentHarness ||
          !payload.workspace ||
          !payload.projectDescriptionDir ||
          !payload.specsDir ||
          !payload.agentScriptPath
        ) {
          errorMessage.textContent = "Fill in all mandatory fields before running.";
          syncRunButton();
          return;
        }
        vscode.setState(payload);
        vscode.postMessage({
          type: "runSolutionArchitect",
          payload
        });
      });

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (message?.type === "solutionArchitectError") {
          errorMessage.textContent =
            message.payload?.message || "Unable to start Solution Architect.";
        }
      });

      refreshProjectFolderFlags();
      vscode.setState(initialValues);
      syncRunButton();
    </script>
  </body>
</html>`;
}
//# sourceMappingURL=solutionArchitect.js.map