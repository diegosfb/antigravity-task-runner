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

function normalizeStatusName(value: string): string {
  return value.trim().toLowerCase();
}

export function parseBacklogItemCompletedLocalItem(
  filePath: string,
  markdown: string
): BacklogItemCompletedLocalItem {
  const fileName = path.basename(filePath);
  const summary = extractMarkdownSection(markdown, /^##\s*summary\s*$/i);
  const description = extractMarkdownSection(markdown, /^##\s*description\s*$/i);
  const statusName = extractMarkdownSection(markdown, STATUS_SECTION_PATTERN)
    .split(/\r?\n/, 1)[0]
    .trim();

  return {
    description,
    displayName: extractMarkdownTitle(markdown, fileName),
    fileName,
    filePath,
    statusName,
    summary
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
      <section id="jiraSection" class="section">
        <p class="section-title">Jira</p>
        <label>
          <span>Use Jira</span>
          <input id="useJira" name="useJira" type="checkbox" ${initialValues.useJira ? "checked" : ""} />
        </label>
        <div class="detail-grid">
          <div class="detail-card">
            <span class="detail-label">Jira Project</span>
            <span class="detail-value">${escapeHtml(initialValues.projectKey)}</span>
          </div>
          <div class="detail-card">
            <span class="detail-label">Available Jira Items</span>
            <span class="detail-value">${String(issues.length)}</span>
          </div>
        </div>
        <span class="hint">Select any Jira item in To Do or In Progress, including unassigned items. Completing it will move it to In Review, or Done if review is unavailable.</span>
      </section>

      <section class="section">
        <p class="section-title">Backlog Item</p>
        <label>
          <span class="required">Assigned Item</span>
          <select id="issueKey" name="issueKey">
            <option value="">— No Jira item selected —</option>
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
        <p class="section-title">Local Backlog</p>
        <label>
          <span>Backlog Folder</span>
          <input id="backlogDir" name="backlogDir" type="text" value="${escapeHtml(initialValues.backlogDir)}" autocomplete="off" />
        </label>
        <div class="hint" id="backlogFolderStatus">${escapeHtml(backlogLoadError || `Eligible local backlog items: ${String(backlogItems.length)}`)}</div>
        <label>
          <span>Item to Mark Completed</span>
          <select id="backlogItemPath" name="backlogItemPath">
            <option value="">— No local backlog item selected —</option>
            ${backlogOptions}
          </select>
        </label>
        <div class="detail-grid">
          <div class="detail-card">
            <span class="detail-label">Local Description</span>
            <span id="backlogItemDescription" class="detail-value"></span>
          </div>
          <div class="detail-card">
            <span class="detail-label">Current Local Status</span>
            <span id="backlogItemStatus" class="detail-value"></span>
          </div>
        </div>
      </section>

      <section class="section">
        <p class="section-title">Execution</p>
        <div class="detail-card">
          <span class="detail-label">Transition Rule</span>
          <span class="detail-value">Selected Jira items move to In Review, or Done when review is unavailable. Selected local backlog files get a Status of In Review.</span>
        </div>
      </section>

      <section class="section">
        <p class="section-title">Compared Result</p>
        <div class="detail-card">
          <span class="detail-label">Compared Result</span>
          <pre id="comparedResult" class="detail-value"></pre>
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
      const jiraSection = document.getElementById("jiraSection");
      const issueKeyInput = document.getElementById("issueKey");
      const useJiraInput = document.getElementById("useJira");
      const issueSummary = document.getElementById("issueSummary");
      const issueType = document.getElementById("issueType");
      const issueStatus = document.getElementById("issueStatus");
      const issueProject = document.getElementById("issueProject");
      const comparedResult = document.getElementById("comparedResult");
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
          .replace(/\r\n/g, "\n")
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

      function formatComparedValue(value) {
        return value ? value : "(empty)";
      }

      function buildComparisonLine(leftValue, rightValue) {
        const normalizedLeft = normalizeMatchText(leftValue);
        const normalizedRight = normalizeMatchText(rightValue);
        const exactMatch = Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
        const containsMatch = Boolean(
          normalizedLeft &&
          normalizedRight &&
          (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
        );

        return [
          "raw left: " + formatComparedValue(leftValue),
          "normalized left: " + formatComparedValue(normalizedLeft),
          "raw right: " + formatComparedValue(rightValue),
          "normalized right: " + formatComparedValue(normalizedRight),
          "exact match: " + (exactMatch ? "yes" : "no"),
          "contains match: " + (containsMatch ? "yes" : "no")
        ].join("\\n");
      }

      function updateComparedResult(origin) {
        const selectedIssue = getSelectedIssue();
        const selectedBacklogItem = getSelectedBacklogItem();
        const matchingBacklogItem = selectedIssue ? findMatchingBacklogItem(selectedIssue) : undefined;
        const matchingIssue = selectedBacklogItem ? findMatchingIssue(selectedBacklogItem) : undefined;
        comparedResult.textContent = [
          "origin: " + origin,
          "",
          "selected jira item: " + (selectedIssue ? selectedIssue.key + " - " + selectedIssue.summary : "(none)"),
          "selected local backlog item: " + (selectedBacklogItem ? selectedBacklogItem.displayName + " (" + selectedBacklogItem.fileName + ")" : "(none)"),
          "",
          "selected jira description vs selected md ## Description:",
          buildComparisonLine(selectedIssue?.description, selectedBacklogItem?.description),
          "",
          "unique local match from selected jira description: " +
            (matchingBacklogItem
              ? matchingBacklogItem.displayName + " (" + matchingBacklogItem.fileName + ")"
              : "(none)"),
          "unique jira match from selected md description: " +
            (matchingIssue ? matchingIssue.key + " - " + matchingIssue.summary : "(none)")
        ].join("\\n");
      }

      function updateSelectedIssueDetails() {
        const selectedIssue = getSelectedIssue();
        issueSummary.textContent = selectedIssue?.summary || "";
        issueType.textContent = selectedIssue?.issueTypeName || "";
        issueStatus.textContent = selectedIssue?.statusName || "";
        issueProject.textContent = selectedIssue?.projectName || selectedIssue?.projectKey || initialValues.projectKey || "";
      }

      function updateSelectedBacklogItemDetails() {
        const selectedBacklogItem = getSelectedBacklogItem();
        backlogItemDescription.textContent = selectedBacklogItem?.description || "";
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
          updateComparedResult(origin);
          return;
        }

        if (origin === "backlog") {
          const matchingIssue = findMatchingIssue(getSelectedBacklogItem());
          issueKeyInput.value = matchingIssue?.key || "";
          updateSelectedIssueDetails();
          updateComparedResult(origin);
          return;
        }

        updateComparedResult(origin);
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
        updateComparedResult("jira-state");
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
            updateComparedResult("backlog-reload");
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
          updateComparedResult("backlog-error");
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
      } else {
        updateComparedResult("initial");
      }
      updateSelectedBacklogItemDetails();
      syncRunButton();
    </script>
  </body>
</html>`;
}
