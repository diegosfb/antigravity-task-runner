"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRODUCT_DESIGNER_COMMAND = void 0;
exports.getDefaultProductDesignerValues = getDefaultProductDesignerValues;
exports.sanitizeProductDesignerFormValues = sanitizeProductDesignerFormValues;
exports.getMissingProductDesignerFields = getMissingProductDesignerFields;
exports.buildProductDesignerCommand = buildProductDesignerCommand;
exports.renderProductDesignerHtml = renderProductDesignerHtml;
const settings_1 = require("./settings");
const utils_1 = require("./utils");
exports.PRODUCT_DESIGNER_COMMAND = "antigravity.openProductDesigner";
function getDefaultProductDesignerValues(workspaceRoot) {
    return {
        agentHarness: "Codex",
        agentModel: "",
        agentIntelligence: "",
        projectDescriptionDir: "",
        meetingsRecordingsFolder: "",
        workspace: workspaceRoot ?? "",
        projectConfluence: "",
        agentScriptPath: ""
    };
}
function sanitizeProductDesignerFormValues(values, workspaceRoot) {
    const defaults = getDefaultProductDesignerValues(workspaceRoot);
    return {
        agentHarness: typeof values?.agentHarness === "string" ? values.agentHarness.trim() : defaults.agentHarness,
        agentModel: typeof values?.agentModel === "string" ? values.agentModel.trim() : defaults.agentModel,
        agentIntelligence: typeof values?.agentIntelligence === "string" ? values.agentIntelligence.trim() : defaults.agentIntelligence,
        projectDescriptionDir: typeof values?.projectDescriptionDir === "string" ? values.projectDescriptionDir.trim() : defaults.projectDescriptionDir,
        meetingsRecordingsFolder: typeof values?.meetingsRecordingsFolder === "string" ? values.meetingsRecordingsFolder.trim() : defaults.meetingsRecordingsFolder,
        workspace: typeof values?.workspace === "string" ? values.workspace.trim() : defaults.workspace,
        projectConfluence: typeof values?.projectConfluence === "string" ? values.projectConfluence.trim() : defaults.projectConfluence,
        agentScriptPath: typeof values?.agentScriptPath === "string" ? values.agentScriptPath.trim() : defaults.agentScriptPath
    };
}
function getMissingProductDesignerFields(values) {
    const missing = [];
    if (!values.agentHarness)
        missing.push("Agent Harness");
    if (!values.projectDescriptionDir)
        missing.push("Project Description folder");
    if (!values.workspace)
        missing.push("Project Workspace folder");
    if (!values.agentScriptPath)
        missing.push("Agent Script Path");
    return missing;
}
function buildProductDesignerCommand(values) {
    const parts = [
        (0, utils_1.quoteShellArg)(values.agentScriptPath),
        "--project-description-dir",
        (0, utils_1.quoteShellArg)(values.projectDescriptionDir),
        "--workspace",
        (0, utils_1.quoteShellArg)(values.workspace),
        "--harness",
        (0, utils_1.quoteShellArg)(values.agentHarness)
    ];
    if (values.meetingsRecordingsFolder) {
        parts.push("--meetings-recordings-folder", (0, utils_1.quoteShellArg)(values.meetingsRecordingsFolder));
    }
    if (values.projectConfluence) {
        parts.push("--project-confluence", (0, utils_1.quoteShellArg)(values.projectConfluence));
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
function renderProductDesignerHtml(webview, initialValues) {
    const nonce = (0, settings_1.getNonce)();
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
    const values = JSON.stringify(initialValues);
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Product Designer</title>
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
    </style>
  </head>
  <body>
    <form id="productDesignerForm">
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
          <span class="required">Project Description folder</span>
          <input id="projectDescriptionDir" name="projectDescriptionDir" value="${escapeHtml(initialValues.projectDescriptionDir)}" required />
        </label>

        <label>
          <span>Project Meeting notes folder</span>
          <input id="meetingsRecordingsFolder" name="meetingsRecordingsFolder" value="${escapeHtml(initialValues.meetingsRecordingsFolder)}" />
        </label>

        <label>
          <span class="required">Project Workspace folder</span>
          <input id="workspace" name="workspace" value="${escapeHtml(initialValues.workspace)}" required />
          <span class="hint">Defaults to the current project root when a workspace is open.</span>
        </label>

        <label>
          <span>Project Confluence</span>
          <input id="projectConfluence" name="projectConfluence" value="${escapeHtml(initialValues.projectConfluence)}" />
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
      const form = document.getElementById("productDesignerForm");
      const errorMessage = document.getElementById("errorMessage");
      const runButton = document.getElementById("runButton");
      const cancelButton = document.getElementById("cancelButton");
      const requiredFields = [
        document.getElementById("agentHarness"),
        document.getElementById("projectDescriptionDir"),
        document.getElementById("workspace"),
        document.getElementById("agentScriptPath")
      ];

      function getPayload() {
        const data = new FormData(form);
        return {
          agentHarness: String(data.get("agentHarness") || "").trim(),
          agentModel: String(data.get("agentModel") || "").trim(),
          agentIntelligence: String(data.get("agentIntelligence") || "").trim(),
          projectDescriptionDir: String(data.get("projectDescriptionDir") || "").trim(),
          meetingsRecordingsFolder: String(data.get("meetingsRecordingsFolder") || "").trim(),
          workspace: String(data.get("workspace") || "").trim(),
          projectConfluence: String(data.get("projectConfluence") || "").trim(),
          agentScriptPath: String(data.get("agentScriptPath") || "").trim()
        };
      }

      function syncRunButton() {
        runButton.disabled = requiredFields.some((field) => !field.value.trim());
      }

      form.addEventListener("input", () => {
        errorMessage.textContent = "";
        syncRunButton();
      });

      cancelButton.addEventListener("click", () => {
        vscode.postMessage({ type: "cancelProductDesigner" });
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const payload = getPayload();
        if (!payload.agentHarness || !payload.projectDescriptionDir || !payload.workspace || !payload.agentScriptPath) {
          errorMessage.textContent = "Fill in all mandatory fields before running.";
          syncRunButton();
          return;
        }
        vscode.setState(payload);
        vscode.postMessage({
          type: "runProductDesigner",
          payload
        });
      });

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (message?.type === "productDesignerError") {
          errorMessage.textContent =
            message.payload?.message || "Unable to start Product Designer.";
        }
      });

      vscode.setState(initialValues);
      syncRunButton();
    </script>
  </body>
</html>`;
}
//# sourceMappingURL=productDesigner.js.map