import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { getNonce } from "./settings";
import type { JiraIssueSummary } from "./jira";

export const BACKLOG_ITEM_COMPLETED_COMMAND = "antigravity.completeJiraItem";
const STATUS_SECTION_PATTERN = /^##\s*status(?:\s+change)?\s*$/i;

export type BacklogItemCompletedLocalItem = {
  description: string;
  displayName: string;
  fileName: string;
  filePath: string;
  statusName: string;
  summary: string;
  typeName: string;
};

export type BacklogItemCompletedFormValues = {
  backlogDir: string;
  backlogItemPath: string;
  issueKey: string;
  projectKey: string;
  useJira: boolean;
};

export function getDefaultBacklogItemCompletedValues(
  projectKey = "",
  workspacePath = ""
): BacklogItemCompletedFormValues {
  return {
    backlogDir: workspacePath ? path.join(workspacePath, "docs", "backlog") : "",
    backlogItemPath: "",
    issueKey: "",
    projectKey: projectKey.trim(),
    useJira: Boolean(projectKey.trim())
  };
}

export function sanitizeBacklogItemCompletedFormValues(
  values: Partial<BacklogItemCompletedFormValues> | undefined,
  projectKey = "",
  workspacePath = ""
): BacklogItemCompletedFormValues {
  const defaults = getDefaultBacklogItemCompletedValues(projectKey, workspacePath);
  return {
    backlogDir: typeof values?.backlogDir === "string" ? values.backlogDir.trim() : defaults.backlogDir,
    backlogItemPath:
      typeof values?.backlogItemPath === "string"
        ? values.backlogItemPath.trim()
        : defaults.backlogItemPath,
    issueKey: typeof values?.issueKey === "string" ? values.issueKey.trim() : defaults.issueKey,
    projectKey: typeof values?.projectKey === "string" ? values.projectKey.trim() : defaults.projectKey,
    useJira: typeof values?.useJira === "boolean" ? values.useJira : defaults.useJira
  };
}

export function getMissingBacklogItemCompletedFields(values: BacklogItemCompletedFormValues): string[] {
  const missing: string[] = [];
  if (values.useJira && !values.projectKey) missing.push("Jira Project");
  if (!values.backlogItemPath && (!values.useJira || !values.issueKey)) {
    missing.push(values.useJira ? "Assigned Jira item or local backlog item" : "Local backlog item");
  }
  return missing;
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

function extractMarkdownSection(markdown: string, headingPattern: RegExp): string {
  const lines = normalizeLineEndings(markdown).split("\n");
  const headingIndex = lines.findIndex((line) => headingPattern.test(line.trim()));
  if (headingIndex === -1) {
    return "";
  }

  const contentLines: string[] = [];
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index].trim())) {
      break;
    }
    contentLines.push(lines[index]);
  }

  return contentLines.join("\n").trim();
}

function extractMarkdownTitle(markdown: string, fileName: string): string {
  const titleLine = normalizeLineEndings(markdown)
    .split("\n")
    .find((line) => /^#\s+/.test(line.trim()));
  if (!titleLine) {
    return fileName.replace(/\.md$/i, "");
  }
  return titleLine.replace(/^#\s+/, "").trim() || fileName.replace(/\.md$/i, "");
}

function extractBacklogItemType(displayName: string, fileName: string): string {
  const titlePrefix = displayName.match(/^([^:]+):\s*/)?.[1]?.trim();
  if (titlePrefix) {
    return titlePrefix;
  }

  const filePrefix = path.basename(fileName, path.extname(fileName)).match(/^([^-]+)/)?.[1]?.trim();
  if (!filePrefix) {
    return "";
  }

  return filePrefix.charAt(0).toUpperCase() + filePrefix.slice(1).toLowerCase();
}

function normalizeStatusName(value: string): string {
  return value.trim().toLowerCase();
}

export function parseBacklogItemCompletedLocalItem(
  filePath: string,
  markdown: string
): BacklogItemCompletedLocalItem {
  const fileName = path.basename(filePath);
  const displayName = extractMarkdownTitle(markdown, fileName);
  const summary = extractMarkdownSection(markdown, /^##\s*summary\s*$/i);
  const description = extractMarkdownSection(markdown, /^##\s*description\s*$/i);
  const statusName = extractMarkdownSection(markdown, STATUS_SECTION_PATTERN)
    .split(/\r?\n/, 1)[0]
    .trim();

  return {
    description,
    displayName,
    fileName,
    filePath,
    statusName,
    summary,
    typeName: extractBacklogItemType(displayName, fileName)
  };
}

export function isBacklogItemEligibleForCompletion(item: BacklogItemCompletedLocalItem): boolean {
  const normalizedStatus = normalizeStatusName(item.statusName);
  return !normalizedStatus || normalizedStatus === "to do" || normalizedStatus === "in progress";
}

export function loadBacklogItemsForCompletion(backlogDir: string): BacklogItemCompletedLocalItem[] {
  const trimmedBacklogDir = backlogDir.trim();
  if (!trimmedBacklogDir) {
    return [];
  }

  if (!fs.existsSync(trimmedBacklogDir)) {
    throw new Error(`Backlog folder does not exist: ${trimmedBacklogDir}`);
  }

  const stats = fs.statSync(trimmedBacklogDir);
  if (!stats.isDirectory()) {
    throw new Error(`Backlog folder is not a directory: ${trimmedBacklogDir}`);
  }

  return fs
    .readdirSync(trimmedBacklogDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => {
      const filePath = path.join(trimmedBacklogDir, entry.name);
      return parseBacklogItemCompletedLocalItem(filePath, fs.readFileSync(filePath, "utf8"));
    })
    .filter(isBacklogItemEligibleForCompletion)
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export function normalizeBacklogItemCompletedMatchText(value: string | undefined): string {
  return (value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findUniqueMatch<T>(items: T[], predicate: (item: T) => boolean): T | undefined {
  const matches = items.filter(predicate);
  return matches.length === 1 ? matches[0] : undefined;
}

function findUniqueDescriptionMatch<T>(
  items: T[],
  description: string | undefined,
  getDescription: (item: T) => string | undefined
): T | undefined {
  const normalizedDescription = normalizeBacklogItemCompletedMatchText(description);
  if (!normalizedDescription) {
    return undefined;
  }

  const exactMatch = findUniqueMatch(
    items,
    (item) => normalizeBacklogItemCompletedMatchText(getDescription(item)) === normalizedDescription
  );
  if (exactMatch) {
    return exactMatch;
  }

  return findUniqueMatch(items, (item) => {
    const normalizedItemDescription = normalizeBacklogItemCompletedMatchText(getDescription(item));
    return Boolean(normalizedItemDescription) &&
      (normalizedItemDescription.includes(normalizedDescription) ||
        normalizedDescription.includes(normalizedItemDescription));
  });
}

export function findMatchingBacklogItemForJiraIssue(
  issue: Pick<JiraIssueSummary, "description" | "summary"> | undefined,
  backlogItems: BacklogItemCompletedLocalItem[]
): BacklogItemCompletedLocalItem | undefined {
  const descriptionMatch = findUniqueDescriptionMatch(
    backlogItems,
    issue?.description,
    (item) => item.description
  );
  return descriptionMatch;
}

export function findMatchingJiraIssueForBacklogItem(
  backlogItem: Pick<BacklogItemCompletedLocalItem, "description"> | undefined,
  issues: JiraIssueSummary[]
): JiraIssueSummary | undefined {
  const descriptionMatch = findUniqueDescriptionMatch(
    issues,
    backlogItem?.description,
    (issue) => issue.description
  );
  return descriptionMatch;
}

export function upsertBacklogItemCompletedStatus(markdown: string, statusName = "In Review"): string {
  const normalizedMarkdown = normalizeLineEndings(markdown).trimEnd();
  const lines = normalizedMarkdown.split("\n");
  const headingIndex = lines.findIndex((line) => STATUS_SECTION_PATTERN.test(line.trim()));

  if (headingIndex !== -1) {
    let sectionEndIndex = lines.length;
    for (let index = headingIndex + 1; index < lines.length; index += 1) {
      if (/^##\s+/.test(lines[index].trim())) {
        sectionEndIndex = index;
        break;
      }
    }

    const updatedLines = [
      ...lines.slice(0, headingIndex + 1),
      statusName,
      "",
      ...lines.slice(sectionEndIndex)
    ];
    return `${updatedLines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
  }

  const suffix = normalizedMarkdown ? "\n\n" : "";
  return `${normalizedMarkdown}${suffix}## Status\n${statusName}\n`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderBacklogItemCompletedHtml(
  webview: vscode.Webview,
  initialValues: BacklogItemCompletedFormValues,
  issues: JiraIssueSummary[],
  backlogItems: BacklogItemCompletedLocalItem[],
  backlogLoadError = ""
): string {
  const nonce = getNonce();
  const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
  const values = JSON.stringify(initialValues);
  const issueList = JSON.stringify(issues);
  const backlogItemList = JSON.stringify(backlogItems);
  const selectedIssueKey =
    initialValues.issueKey && issues.some((issue) => issue.key === initialValues.issueKey)
      ? initialValues.issueKey
      : "";
  const options = issues
    .map(
      (issue) =>
        `<option value="${escapeHtml(issue.key)}" ${issue.key === selectedIssueKey ? "selected" : ""}>${escapeHtml(issue.key)} - ${escapeHtml(issue.summary)}</option>`
    )
    .join("");
  const selectedBacklogItemPath =
    initialValues.backlogItemPath &&
    backlogItems.some((item) => item.filePath === initialValues.backlogItemPath)
      ? initialValues.backlogItemPath
      : "";
  const backlogOptions = backlogItems
    .map(
      (item) =>
        `<option value="${escapeHtml(item.filePath)}" ${item.filePath === selectedBacklogItemPath ? "selected" : ""}>${escapeHtml(item.displayName)} (${escapeHtml(item.fileName)})</option>`
    )
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
      .section.is-disabled {
        opacity: 0.55;
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
      .detail-grid,
      .detail-grid-split,
      .detail-stack {
        display: grid;
        gap: 6px;
        font-size: 13px;
      }
      .detail-grid {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
      .detail-grid-split {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 16px;
        align-items: start;
      }
      .detail-stack {
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 16px;
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
      pre.detail-value {
        margin: 0;
        white-space: pre-wrap;
        font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
        overflow-x: auto;
      }
      input,
      select,
      button {
        font: inherit;
      }
      input,
      select {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        color: var(--vscode-input-foreground);
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border, transparent);
        border-radius: 6px;
      }
      input[type="checkbox"] {
        width: auto;
        justify-self: start;
      }
      .current-branch-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 18px;
        font-weight: 600;
      }
      .current-branch-title.is-disabled {
        opacity: 0.45;
      }
      .current-branch-value {
        color: var(--vscode-textLink-foreground, var(--vscode-foreground));
      }
      .inline-checkbox {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 400;
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
      @media (max-width: 900px) {
        .detail-grid-split {
          grid-template-columns: 1fr;
        }
        .current-branch-title {
          align-items: start;
          flex-direction: column;
        }
      }
    </style>
  </head>
  <body>
    <form id="backlogItemCompletedForm">
      <div id="jiraSection" class="current-branch-title">
        <span>Jira Project: <span class="current-branch-value">${escapeHtml(initialValues.projectKey)}</span></span>
        <label class="inline-checkbox">
          <input id="useJira" name="useJira" type="checkbox" ${initialValues.useJira ? "checked" : ""} />
          <span>Use Jira</span>
        </label>
      </div>

      <section class="section">
        <p class="section-title">JIRA Backlog Item</p>
        <label>
          <span class="required">JIRA Item to Mark Completed</span>
          <select id="issueKey" name="issueKey">
            <option value="">— No Jira item selected —</option>
            ${options}
          </select>
        </label>
        <div class="hint">Eligible Jira backlog items: ${String(issues.length)}.</div>
        <div class="detail-grid-split">
          <div class="detail-card">
            <span class="detail-label">Description</span>
            <span id="issueSummary" class="detail-value"></span>
          </div>
          <div class="detail-stack">
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
        </div>
      </section>

      <section class="section">
        <p class="section-title">Local Backlog Item</p>
        <label>
          <span>Backlog Folder</span>
          <input id="backlogDir" name="backlogDir" type="text" value="${escapeHtml(initialValues.backlogDir)}" autocomplete="off" />
        </label>
        <div class="hint" id="backlogFolderStatus">${escapeHtml(backlogLoadError || `Eligible local backlog items: ${String(backlogItems.length)}`)}</div>
        <label>
          <span>Local Item to Mark Completed</span>
          <select id="backlogItemPath" name="backlogItemPath">
            <option value="">— No local backlog item selected —</option>
            ${backlogOptions}
          </select>
        </label>
        <div class="detail-grid-split">
          <div class="detail-card">
            <span class="detail-label">Description</span>
            <span id="backlogItemDescription" class="detail-value"></span>
          </div>
          <div class="detail-stack">
            <div class="detail-card">
              <span class="detail-label">Local Type</span>
              <span id="backlogItemType" class="detail-value"></span>
            </div>
            <div class="detail-card">
              <span class="detail-label">Current Local Status</span>
              <span id="backlogItemStatus" class="detail-value"></span>
            </div>
          </div>
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
      let backlogItems = ${backlogItemList};
      const form = document.getElementById("backlogItemCompletedForm");
      const errorMessage = document.getElementById("errorMessage");
      const runButton = document.getElementById("runButton");
      const cancelButton = document.getElementById("cancelButton");
      const backlogDirInput = document.getElementById("backlogDir");
      const backlogFolderStatus = document.getElementById("backlogFolderStatus");
      const backlogItemDescription = document.getElementById("backlogItemDescription");
      const backlogItemPathInput = document.getElementById("backlogItemPath");
      const backlogItemStatus = document.getElementById("backlogItemStatus");
      const backlogItemType = document.getElementById("backlogItemType");
      const jiraSection = document.getElementById("jiraSection");
      const issueKeyInput = document.getElementById("issueKey");
      const useJiraInput = document.getElementById("useJira");
      const issueSummary = document.getElementById("issueSummary");
      const issueType = document.getElementById("issueType");
      const issueStatus = document.getElementById("issueStatus");
      const issueProject = document.getElementById("issueProject");
      let draftSaveTimer;
      let backlogReloadTimer;

      function getSelectedIssue() {
        if (!useJiraInput.checked) {
          return undefined;
        }
        return issues.find((issue) => issue.key === issueKeyInput.value);
      }

      function getSelectedBacklogItem() {
        return backlogItems.find((item) => item.filePath === backlogItemPathInput.value);
      }

      function normalizeMatchText(value) {
        return String(value || "")
          .replace(/\\r\\n/g, "\\n")
          .replace(/^\\s*[-*+]\\s+/gm, "")
          .replace(/^\\s*\\d+\\.\\s+/gm, "")
          .replace(/\\s+/g, " ")
          .trim()
          .toLowerCase();
      }

      function findUniqueMatch(items, predicate) {
        const matches = items.filter(predicate);
        return matches.length === 1 ? matches[0] : undefined;
      }

      function findUniqueDescriptionMatch(items, description, getDescription) {
        const normalizedDescription = normalizeMatchText(description);
        if (!normalizedDescription) {
          return undefined;
        }

        const exactMatch = findUniqueMatch(
          items,
          (item) => normalizeMatchText(getDescription(item)) === normalizedDescription
        );
        if (exactMatch) {
          return exactMatch;
        }

        return findUniqueMatch(items, (item) => {
          const normalizedItemDescription = normalizeMatchText(getDescription(item));
          return Boolean(normalizedItemDescription) &&
            (normalizedItemDescription.includes(normalizedDescription) ||
              normalizedDescription.includes(normalizedItemDescription));
        });
      }

      function findMatchingBacklogItem(issue) {
        const descriptionMatch = findUniqueDescriptionMatch(
          backlogItems,
          issue?.description,
          (item) => item.description
        );
        return descriptionMatch;
      }

      function findMatchingIssue(backlogItem) {
        const descriptionMatch = findUniqueDescriptionMatch(
          issues,
          backlogItem?.description,
          (issue) => issue.description
        );
        return descriptionMatch;
      }

      function updateSelectedIssueDetails() {
        const selectedIssue = getSelectedIssue();
        issueSummary.textContent = selectedIssue?.description || "";
        issueType.textContent = selectedIssue?.issueTypeName || "";
        issueStatus.textContent = selectedIssue?.statusName || "";
        issueProject.textContent = selectedIssue?.projectName || selectedIssue?.projectKey || initialValues.projectKey || "";
      }

      function updateSelectedBacklogItemDetails() {
        const selectedBacklogItem = getSelectedBacklogItem();
        backlogItemDescription.textContent = selectedBacklogItem?.description || "";
        backlogItemType.textContent = selectedBacklogItem?.typeName || "";
        backlogItemStatus.textContent = selectedBacklogItem?.statusName || "No status";
      }

      function renderBacklogItemOptions(preferredValue) {
        const currentValue =
          preferredValue && backlogItems.some((item) => item.filePath === preferredValue)
            ? preferredValue
            : "";
        backlogItemPathInput.replaceChildren();

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = backlogItems.length > 0
          ? "— No local backlog item selected —"
          : "— No eligible local backlog items found —";
        backlogItemPathInput.appendChild(placeholder);

        backlogItems.forEach((item) => {
          const option = document.createElement("option");
          option.value = item.filePath;
          option.textContent = item.displayName + " (" + item.fileName + ")";
          backlogItemPathInput.appendChild(option);
        });

        backlogItemPathInput.value = currentValue;
        backlogFolderStatus.textContent = backlogItems.length > 0
          ? "Eligible local backlog items: " + backlogItems.length + "."
          : "No eligible local backlog items found in the selected folder.";
      }

      function syncSelections(origin) {
        if (origin === "issue") {
          const matchingBacklogItem = findMatchingBacklogItem(getSelectedIssue());
          backlogItemPathInput.value = matchingBacklogItem?.filePath || "";
          updateSelectedBacklogItemDetails();
          return;
        }

        if (origin === "backlog") {
          const matchingIssue = findMatchingIssue(getSelectedBacklogItem());
          issueKeyInput.value = matchingIssue?.key || "";
          updateSelectedIssueDetails();
        }
      }

      function getPayload() {
        return {
          backlogDir: String(backlogDirInput.value || "").trim(),
          backlogItemPath: String(backlogItemPathInput.value || "").trim(),
          issueKey: useJiraInput.checked ? String(issueKeyInput.value || "").trim() : "",
          projectKey: String(initialValues.projectKey || "").trim(),
          useJira: useJiraInput.checked
        };
      }

      function syncJiraState() {
        jiraSection.classList.toggle("is-disabled", !useJiraInput.checked);
        issueKeyInput.disabled = !useJiraInput.checked;
        updateSelectedIssueDetails();
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

      function queueBacklogReload() {
        window.clearTimeout(backlogReloadTimer);
        backlogReloadTimer = window.setTimeout(() => {
          vscode.postMessage({
            type: "loadBacklogItemCompletedBacklogItems",
            payload: {
              backlogDir: String(backlogDirInput.value || "").trim()
            }
          });
        }, 200);
      }

      function syncRunButton() {
        runButton.disabled =
          !backlogItemPathInput.value && (!useJiraInput.checked || !issueKeyInput.value);
      }

      issueKeyInput.addEventListener("change", () => {
        errorMessage.textContent = "";
        updateSelectedIssueDetails();
        syncSelections("issue");
        syncRunButton();
        queueDraftSave();
      });

      useJiraInput.addEventListener("change", () => {
        errorMessage.textContent = "";
        syncJiraState();
        syncRunButton();
        queueDraftSave();
      });

      backlogDirInput.addEventListener("input", () => {
        errorMessage.textContent = "";
        queueDraftSave();
        queueBacklogReload();
      });

      backlogItemPathInput.addEventListener("change", () => {
        errorMessage.textContent = "";
        updateSelectedBacklogItemDetails();
        syncSelections("backlog");
        syncRunButton();
        queueDraftSave();
      });

      cancelButton.addEventListener("click", () => {
        vscode.postMessage({ type: "cancelBacklogItemCompleted" });
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const payload = getPayload();
        if (!payload.backlogItemPath && (!payload.useJira || !payload.issueKey)) {
          errorMessage.textContent = payload.useJira
            ? "Choose a Jira item, a local backlog item, or both before continuing."
            : "Choose a local backlog item before continuing with Jira disabled.";
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
          return;
        }

        if (message?.type === "backlogItemCompletedBacklogItemsLoaded") {
          backlogItems = Array.isArray(message.payload?.items) ? message.payload.items : [];
          renderBacklogItemOptions(backlogItemPathInput.value);
          if (issueKeyInput.value) {
            syncSelections("issue");
          } else if (backlogItemPathInput.value) {
            syncSelections("backlog");
          } else {
            updateSelectedBacklogItemDetails();
          }
          syncRunButton();
          queueDraftSave();
          return;
        }

        if (message?.type === "backlogItemCompletedBacklogItemsError") {
          backlogItems = [];
          renderBacklogItemOptions("");
          backlogFolderStatus.textContent = message.payload?.message || "Unable to load local backlog items.";
          updateSelectedBacklogItemDetails();
          syncRunButton();
        }
      });

      renderBacklogItemOptions(initialValues.backlogItemPath);
      syncJiraState();
      updateSelectedIssueDetails();
      if (issueKeyInput.value) {
        syncSelections("issue");
      } else if (backlogItemPathInput.value) {
        syncSelections("backlog");
      }
      updateSelectedBacklogItemDetails();
      syncRunButton();
    </script>
  </body>
</html>`;
}
