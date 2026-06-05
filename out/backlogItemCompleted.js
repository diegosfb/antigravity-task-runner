"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BACKLOG_ITEM_COMPLETED_COMMAND = void 0;
exports.getDefaultBacklogItemCompletedValues = getDefaultBacklogItemCompletedValues;
exports.sanitizeBacklogItemCompletedFormValues = sanitizeBacklogItemCompletedFormValues;
exports.getMissingBacklogItemCompletedFields = getMissingBacklogItemCompletedFields;
exports.renderBacklogItemCompletedHtml = renderBacklogItemCompletedHtml;
const settings_1 = require("./settings");
exports.BACKLOG_ITEM_COMPLETED_COMMAND = "antigravity.completeJiraItem";
function getDefaultBacklogItemCompletedValues(projectKey = "") {
    return {
        issueKey: "",
        projectKey: projectKey.trim()
    };
}
function sanitizeBacklogItemCompletedFormValues(values, projectKey = "") {
    const defaults = getDefaultBacklogItemCompletedValues(projectKey);
    return {
        issueKey: typeof values?.issueKey === "string" ? values.issueKey.trim() : defaults.issueKey,
        projectKey: typeof values?.projectKey === "string" ? values.projectKey.trim() : defaults.projectKey
    };
}
function getMissingBacklogItemCompletedFields(values) {
    const missing = [];
    if (!values.projectKey)
        missing.push("Jira Project");
    if (!values.issueKey)
        missing.push("Backlog Item");
    return missing;
}
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function renderBacklogItemCompletedHtml(webview, initialValues, issues) {
    const nonce = (0, settings_1.getNonce)();
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
    const values = JSON.stringify(initialValues);
    const issueList = JSON.stringify(issues);
    const selectedIssueKey = initialValues.issueKey && issues.some((issue) => issue.key === initialValues.issueKey)
        ? initialValues.issueKey
        : (issues[0]?.key ?? "");
    const options = issues
        .map((issue) => `<option value="${escapeHtml(issue.key)}" ${issue.key === selectedIssueKey ? "selected" : ""}>${escapeHtml(issue.key)} - ${escapeHtml(issue.summary)}</option>`)
        .join("");
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Backlog Item Completed</title>
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
      label,
      .detail-grid {
        display: grid;
        gap: 6px;
        font-size: 13px;
      }
      .detail-grid {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
      .detail-card {
        display: grid;
        gap: 6px;
        padding: 12px;
        border-radius: 8px;
        background: var(--vscode-editor-inactiveSelectionBackground, rgba(127, 127, 127, 0.12));
      }
      .detail-label {
        font-size: 11px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--vscode-descriptionForeground);
      }
      .detail-value {
        font-size: 13px;
        word-break: break-word;
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
    <form id="backlogItemCompletedForm">
      <section class="section">
        <p class="section-title">Jira</p>
        <div class="detail-grid">
          <div class="detail-card">
            <span class="detail-label">Jira Project</span>
            <span class="detail-value">${escapeHtml(initialValues.projectKey)}</span>
          </div>
          <div class="detail-card">
            <span class="detail-label">Available Assigned Items</span>
            <span class="detail-value">${String(issues.length)}</span>
          </div>
        </div>
        <span class="hint">Select one of your assigned backlog items below. Completing it will move it to In Review, or Done if review is unavailable.</span>
      </section>

      <section class="section">
        <p class="section-title">Backlog Item</p>
        <label>
          <span class="required">Assigned Item</span>
          <select id="issueKey" name="issueKey" required>
            ${options}
          </select>
        </label>
        <div class="detail-grid">
          <div class="detail-card">
            <span class="detail-label">Summary</span>
            <span id="issueSummary" class="detail-value"></span>
          </div>
          <div class="detail-card">
            <span class="detail-label">Type</span>
            <span id="issueType" class="detail-value"></span>
          </div>
          <div class="detail-card">
            <span class="detail-label">Current Status</span>
            <span id="issueStatus" class="detail-value"></span>
          </div>
          <div class="detail-card">
            <span class="detail-label">Project</span>
            <span id="issueProject" class="detail-value"></span>
          </div>
        </div>
      </section>

      <section class="section">
        <p class="section-title">Execution</p>
        <div class="detail-card">
          <span class="detail-label">Transition Rule</span>
          <span class="detail-value">The selected item will move to In Review, or Done when review is unavailable.</span>
        </div>
      </section>

      <div id="errorMessage" class="error" aria-live="polite"></div>

      <div class="actions">
        <button type="button" id="cancelButton">Cancel</button>
        <button type="submit" id="runButton">Mark Completed</button>
      </div>
    </form>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const initialValues = ${values};
      const issues = ${issueList};
      const form = document.getElementById("backlogItemCompletedForm");
      const errorMessage = document.getElementById("errorMessage");
      const runButton = document.getElementById("runButton");
      const cancelButton = document.getElementById("cancelButton");
      const issueKeyInput = document.getElementById("issueKey");
      const issueSummary = document.getElementById("issueSummary");
      const issueType = document.getElementById("issueType");
      const issueStatus = document.getElementById("issueStatus");
      const issueProject = document.getElementById("issueProject");
      let draftSaveTimer;

      function getSelectedIssue() {
        return issues.find((issue) => issue.key === issueKeyInput.value);
      }

      function updateSelectedIssueDetails() {
        const selectedIssue = getSelectedIssue();
        issueSummary.textContent = selectedIssue?.summary || "";
        issueType.textContent = selectedIssue?.issueTypeName || "";
        issueStatus.textContent = selectedIssue?.statusName || "";
        issueProject.textContent = selectedIssue?.projectName || selectedIssue?.projectKey || initialValues.projectKey || "";
      }

      function getPayload() {
        return {
          issueKey: String(issueKeyInput.value || "").trim(),
          projectKey: String(initialValues.projectKey || "").trim()
        };
      }

      function queueDraftSave() {
        window.clearTimeout(draftSaveTimer);
        draftSaveTimer = window.setTimeout(() => {
          const payload = getPayload();
          vscode.setState(payload);
          vscode.postMessage({
            type: "saveBacklogItemCompletedDraft",
            payload
          });
        }, 150);
      }

      function syncRunButton() {
        runButton.disabled = !issueKeyInput.value;
      }

      issueKeyInput.addEventListener("change", () => {
        errorMessage.textContent = "";
        updateSelectedIssueDetails();
        syncRunButton();
        queueDraftSave();
      });

      cancelButton.addEventListener("click", () => {
        vscode.postMessage({ type: "cancelBacklogItemCompleted" });
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const payload = getPayload();
        if (!payload.issueKey) {
          errorMessage.textContent = "Choose a backlog item before continuing.";
          syncRunButton();
          return;
        }
        vscode.setState(payload);
        vscode.postMessage({
          type: "runBacklogItemCompleted",
          payload
        });
      });

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (message?.type === "backlogItemCompletedError") {
          errorMessage.textContent = message.payload?.message || "Unable to complete the backlog item.";
        }
      });

      if (!issueKeyInput.value && issues.length > 0) {
        issueKeyInput.value = issues[0].key;
      }

      updateSelectedIssueDetails();
      syncRunButton();
    </script>
  </body>
</html>`;
}
//# sourceMappingURL=backlogItemCompleted.js.map