import * as vscode from "vscode";
import { type AssignableAgentLabel } from "./agentRunCommand";
import { type BacklogItemCompletedLocalItem } from "./backlogItemCompleted";
import { type JiraIssueSummary } from "./jira";
import { getNonce } from "./settings";

export type AssignBacklogItemToAgentDialogAction = "assign" | "grillMe";

export type AssignBacklogItemToAgentDialogResult = {
  action: AssignBacklogItemToAgentDialogAction;
  agentCommand: string;
  backlogItemPath: string;
  issueKey: string;
  useJira: boolean;
};

type RenderAssignBacklogItemToAgentHtmlOptions = {
  agentCommandOptions: string[];
  backlogItems: BacklogItemCompletedLocalItem[];
  backlogStatusMessage?: string;
  initialAgentCommand: string;
  projectKey: string;
  selectedBacklogItemPath?: string;
  selectedIssueKey?: string;
  useJira?: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildAssignBacklogItemToAgentFeatureDetails(
  issue: JiraIssueSummary | undefined,
  backlogItem?: BacklogItemCompletedLocalItem
): string {
  const sections: string[] = [];

  if (issue) {
    const metadata = [issue.issueTypeName, issue.statusName].filter(Boolean).join(", ");
    sections.push(
      metadata
        ? `Jira item ${issue.key} (${metadata}): ${issue.summary}`
        : `Jira item ${issue.key}: ${issue.summary}`
    );

    if (issue.description?.trim()) {
      sections.push(`Jira description:\n${issue.description.trim()}`);
    }
  }

  if (backlogItem) {
    sections.push(
      `Local backlog item ${backlogItem.displayName} (${backlogItem.fileName}) at ${backlogItem.filePath}`
    );
    if (backlogItem.description.trim()) {
      sections.push(`Local backlog description:\n${backlogItem.description.trim()}`);
    }
  }

  return sections.join("\n\n");
}

export function buildAssignBacklogItemToAgentPrompt(
  issue: JiraIssueSummary | undefined,
  agentLabel: AssignableAgentLabel,
  jiraEmail = "",
  backlogItem?: BacklogItemCompletedLocalItem
): string {
  const trimmedJiraEmail = jiraEmail.trim();
  const backlogInstructions = backlogItem
    ? ` Also inspect local backlog item ${backlogItem.displayName} (${backlogItem.fileName}) at ${backlogItem.filePath}. Use that markdown file as part of the task context. Add each assumption you make to its ## Notes section using lines that start with AGENT ASSUMPTION:. If you finish successfully, add an AGENT SOLUTION: note describing briefly how you solved it and update that local backlog item's ## Status section to In Review.`
    : "";
  const jiraAccessInstructions =
    issue && agentLabel === "Codex" && trimmedJiraEmail
      ? ` Jira access for this environment is available through the configured Jira MCP server. Use Jira MCP tools for all Jira actions in this task instead of shelling out to the Atlassian CLI. All Jira comments and transitions for this Codex flow must be performed while authenticated to Jira MCP as ${trimmedJiraEmail}, because Jira will attribute the actions to the currently authenticated Atlassian account. Before making Jira changes, verify the Jira MCP session is using ${trimmedJiraEmail}. If Jira MCP is not authenticated yet or is authenticated as a different Atlassian user, run \`codex mcp login jira\` and sign in as ${trimmedJiraEmail}, then continue with the MCP-backed Jira actions.`
      : "";

  if (issue) {
    return `work on Jira Item ${issue.key} - ${issue.summary}.${backlogInstructions} Do not ask follow-up questions unless you are truly blocked by missing critical information or permissions. Make reasonable assumptions, proceed, and add each assumption you make to the Jira ticket using comment lines that start with AGENT ASSUMPTION:. If you finish the work successfully, commit your changes using the commit message format Jira Item ${issue.key} by Agent ${agentLabel}, add a Jira comment starting with AGENT SOLUTION: describing briefly how you solved it, and transition Jira item ${issue.key} to In Review; if In Review is not visible on the Jira board or that transition fails, move it to Done instead.${jiraAccessInstructions} Do not merge the work away from the active branch. The completed work should remain on the branch that was active when you were called. If you created a separate temporary branch to do the work, merge it back into the original active branch so the final work lives there.`;
  }

  if (!backlogItem) {
    return `work on the selected local backlog item only. Do not ask follow-up questions unless you are truly blocked by missing critical information or permissions. Make reasonable assumptions, proceed, and keep the completed work on the current branch.`;
  }

  return `work on local backlog item ${backlogItem.displayName} (${backlogItem.fileName}) at ${backlogItem.filePath}. Use that markdown file as the source of truth for the task context. Do not ask follow-up questions unless you are truly blocked by missing critical information or permissions. Make reasonable assumptions, proceed, and add each assumption you make to its ## Notes section using lines that start with AGENT ASSUMPTION:. If you finish successfully, commit your changes using the commit message format Backlog Item ${backlogItem.fileName} by Agent ${agentLabel}, add an AGENT SOLUTION: note describing briefly how you solved it, and update that local backlog item's ## Status section to In Review. Do not merge the work away from the active branch. The completed work should remain on the branch that was active when you were called. If you created a separate temporary branch to do the work, merge it back into the original active branch so the final work lives there.`;
}

export function renderAssignBacklogItemToAgentHtml(
  webview: vscode.Webview,
  issues: JiraIssueSummary[],
  options: RenderAssignBacklogItemToAgentHtmlOptions
): string {
  const nonce = getNonce();
  const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
  const selectedIssueKey =
    options.selectedIssueKey && issues.some((issue) => issue.key === options.selectedIssueKey)
      ? options.selectedIssueKey
      : "";
  const selectedBacklogItemPath =
    options.selectedBacklogItemPath &&
    options.backlogItems.some((item) => item.filePath === options.selectedBacklogItemPath)
      ? options.selectedBacklogItemPath
      : "";
  const useJira = options.useJira !== false;
  const backlogStatusMessage =
    options.backlogStatusMessage ||
    (options.backlogItems.length > 0
      ? `Eligible local backlog items: ${String(options.backlogItems.length)}.`
      : "No eligible local backlog items found.");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Assign Backlog Item to Agent</title>
    <style>
      :root { color-scheme: light dark; font-family: var(--vscode-font-family); }
      body { margin: 0; padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
      form { display: grid; gap: 16px; }
      label { display: grid; gap: 6px; font-size: 13px; }
      select, input, button { font: inherit; }
      select, input {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        color: var(--vscode-input-foreground);
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border, transparent);
        border-radius: 6px;
      }
      .command-list-controls { display: grid; gap: 8px; }
      .current-branch-title { font-size: 18px; font-weight: 600; }
      .current-branch-value { color: #7cc7ff; }
      .header-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
      .header-toggle { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; }
      .panel-section {
        display: grid;
        gap: 10px;
        padding: 14px;
        border: 1px solid var(--vscode-panel-border, var(--vscode-input-border, transparent));
        border-radius: 10px;
        background: color-mix(in srgb, var(--vscode-editorWidget-background, var(--vscode-sideBar-background)) 82%, transparent);
      }
      .panel-section.is-disabled { opacity: 0.65; }
      .section-title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--vscode-descriptionForeground); }
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
    <form id="assign-jira-item-to-agent-form">
      <div class="header-row">
        <div class="current-branch-title">Jira Project: <span class="current-branch-value">${escapeHtml(options.projectKey)}</span></div>
        <label class="header-toggle" for="use-jira">
          <input id="use-jira" type="checkbox" ${useJira ? "checked" : ""} />
          <span>Use Jira</span>
        </label>
      </div>
      <label>
        Agent Harness Command
        <div class="command-list-controls">
          <select id="agent-command-preset"></select>
          <input id="agent-command-input" type="text" autocomplete="off" />
        </div>
        <span class="hint">Starts with the selected Agentic Harness execution command from settings. Pick a saved command or type your own for this Jira assignment.</span>
      </label>
      <section class="panel-section${useJira ? "" : " is-disabled"}" id="jira-section" ${useJira ? "" : 'hidden'}>
        <div class="section-title">Jira Backlog Item</div>
        <label>
          Jira Item
          <select id="issue-select"></select>
        </label>
        <div class="hint" id="issue-hint"></div>
      </section>
      <section class="panel-section">
        <div class="section-title">Local Backlog Item</div>
        <div class="hint" id="backlog-status">${escapeHtml(backlogStatusMessage)}</div>
        <label>
          Local Item
          <select id="backlog-item-select"></select>
        </label>
        <div class="hint" id="backlog-hint"></div>
      </section>
      <div class="hint">Selecting either item auto-selects a unique description match on the other side. If no unique match exists, the other selection is cleared.</div>
      <div class="hint">Assign updates the Jira item and launches the selected agent. Grill Me reviews the selected Jira item with the same harness command without changing Jira first.</div>
      <div class="error" id="error-message"></div>
      <div class="actions">
        <button type="button" id="cancel-button">Cancel</button>
        <button type="submit" data-action="assign">Assign</button>
        <button type="submit" data-action="grillMe">Grill Me</button>
      </div>
    </form>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const issues = ${JSON.stringify(issues)};
      const backlogItems = ${JSON.stringify(options.backlogItems)};
      const initialAgentCommand = ${JSON.stringify(options.initialAgentCommand)};
      const agentCommandOptions = ${JSON.stringify(options.agentCommandOptions)};
      const initialSelectedIssueKey = ${JSON.stringify(selectedIssueKey)};
      const initialSelectedBacklogItemPath = ${JSON.stringify(selectedBacklogItemPath)};
      const fallbackBacklogStatusMessage = ${JSON.stringify(backlogStatusMessage)};
      const form = document.getElementById("assign-jira-item-to-agent-form");
      const agentCommandPresetSelect = document.getElementById("agent-command-preset");
      const agentCommandInput = document.getElementById("agent-command-input");
      const issueSelect = document.getElementById("issue-select");
      const issueHint = document.getElementById("issue-hint");
      const backlogItemSelect = document.getElementById("backlog-item-select");
      const backlogHint = document.getElementById("backlog-hint");
      const useJiraInput = document.getElementById("use-jira");
      const jiraSection = document.getElementById("jira-section");
      const cancelButton = document.getElementById("cancel-button");
      const errorMessage = document.getElementById("error-message");

      function normalizeMatchText(value) {
        return String(value || "")
          .replace(/\\r\\n/g, "\\n")
          .replace(/^\\s*[-*+]\\s+/gm, "")
          .replace(/^\\s*\\d+\\.\\s+/gm, "")
          .replace(/\\s+/g, " ")
          .trim()
          .toLowerCase();
      }

      function getSelectedIssue() {
        return issues.find((issue) => issue.key === issueSelect.value);
      }

      function getSelectedBacklogItem() {
        return backlogItems.find((item) => item.filePath === backlogItemSelect.value);
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
        return findUniqueDescriptionMatch(backlogItems, issue?.description, (item) => item.description);
      }

      function findMatchingIssue(backlogItem) {
        return findUniqueDescriptionMatch(issues, backlogItem?.description, (issue) => issue.description);
      }

      function updateIssueHint() {
        const selected = getSelectedIssue();
        issueHint.textContent = selected
          ? [selected.summary, [selected.issueTypeName, selected.statusName].filter(Boolean).join(" • ")].filter(Boolean).join(" • ")
          : "Choose an unassigned Jira item that is currently in To Do and not blocked by unfinished Jira items.";
      }

      function updateBacklogHint() {
        const selected = getSelectedBacklogItem();
        backlogHint.textContent = selected
          ? [selected.fileName, selected.statusName || "No status"].filter(Boolean).join(" • ")
          : fallbackBacklogStatusMessage;
      }

      function renderIssueOptions(preferredValue) {
        const currentValue =
          preferredValue && issues.some((issue) => issue.key === preferredValue)
            ? preferredValue
            : "";
        issueSelect.replaceChildren();

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = issues.length > 0
          ? "— No Jira item selected —"
          : "— No Jira items available —";
        issueSelect.appendChild(placeholder);

        issues.forEach((issue) => {
          const option = document.createElement("option");
          option.value = issue.key;
          option.textContent = issue.key + " - " + issue.summary;
          issueSelect.appendChild(option);
        });

        issueSelect.value = currentValue;
      }

      function renderBacklogOptions(preferredValue) {
        const currentValue =
          preferredValue && backlogItems.some((item) => item.filePath === preferredValue)
            ? preferredValue
            : "";
        backlogItemSelect.replaceChildren();

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = backlogItems.length > 0
          ? "— No local backlog item selected —"
          : "— No eligible local backlog items found —";
        backlogItemSelect.appendChild(placeholder);

        backlogItems.forEach((item) => {
          const option = document.createElement("option");
          option.value = item.filePath;
          option.textContent = item.displayName + " (" + item.fileName + ")";
          backlogItemSelect.appendChild(option);
        });

        backlogItemSelect.value = currentValue;
      }

      function syncSelections(origin) {
        if (!useJiraInput.checked && origin === "backlog") {
          return;
        }

        if (origin === "issue") {
          backlogItemSelect.value = findMatchingBacklogItem(getSelectedIssue())?.filePath || "";
          updateBacklogHint();
          return;
        }

        if (origin === "backlog") {
          issueSelect.value = findMatchingIssue(getSelectedBacklogItem())?.key || "";
          updateIssueHint();
        }
      }

      function syncJiraState() {
        jiraSection.hidden = !useJiraInput.checked;
        jiraSection.classList.toggle("is-disabled", !useJiraInput.checked);
        issueSelect.disabled = !useJiraInput.checked;
        updateIssueHint();
      }

      const customCommandOption = document.createElement("option");
      customCommandOption.value = "__custom__";
      customCommandOption.textContent = "Custom value";
      agentCommandPresetSelect.appendChild(customCommandOption);

      for (const command of agentCommandOptions) {
        const option = document.createElement("option");
        option.value = command;
        option.textContent = command;
        agentCommandPresetSelect.appendChild(option);
      }

      const syncCommandPresetFromInput = () => {
        const selectedPreset = agentCommandOptions.find((optionValue) => optionValue === agentCommandInput.value);
        agentCommandPresetSelect.value = selectedPreset || "__custom__";
      };

      agentCommandPresetSelect.addEventListener("change", () => {
        if (agentCommandPresetSelect.value !== "__custom__") {
          agentCommandInput.value = agentCommandPresetSelect.value;
        }
        syncCommandPresetFromInput();
      });

      agentCommandInput.addEventListener("input", syncCommandPresetFromInput);

      cancelButton.addEventListener("click", () => {
        vscode.postMessage({ type: "cancelAssignJiraItemToAgent" });
      });

      issueSelect.addEventListener("change", () => {
        errorMessage.textContent = "";
        updateIssueHint();
        syncSelections("issue");
      });

      backlogItemSelect.addEventListener("change", () => {
        errorMessage.textContent = "";
        updateBacklogHint();
        syncSelections("backlog");
      });

      useJiraInput.addEventListener("change", () => {
        errorMessage.textContent = "";
        syncJiraState();
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const action = event.submitter?.dataset?.action === "grillMe" ? "grillMe" : "assign";
        if (!agentCommandInput.value.trim()) {
          errorMessage.textContent = "Enter an agent harness command.";
          agentCommandInput.focus();
          return;
        }
        if (useJiraInput.checked && !issueSelect.value) {
          errorMessage.textContent = "Select a Jira item.";
          issueSelect.focus();
          return;
        }
        if (!useJiraInput.checked && !backlogItemSelect.value) {
          errorMessage.textContent = "Select a local backlog item.";
          backlogItemSelect.focus();
          return;
        }
        vscode.postMessage({
          type: "submitAssignJiraItemToAgent",
          payload: {
            action,
            issueKey: useJiraInput.checked ? issueSelect.value : "",
            backlogItemPath: String(backlogItemSelect.value || "").trim(),
            agentCommand: agentCommandInput.value.trim(),
            useJira: useJiraInput.checked
          }
        });
      });

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (message?.type === "assignJiraItemToAgentError") {
          errorMessage.textContent = message.payload?.message || "Unable to assign the Jira item.";
        }
      });

      renderIssueOptions(initialSelectedIssueKey || issues[0]?.key || "");
      renderBacklogOptions(initialSelectedBacklogItemPath || "");
      if (!initialSelectedBacklogItemPath && issueSelect.value) {
        syncSelections("issue");
      }
      syncJiraState();
      updateIssueHint();
      updateBacklogHint();
      agentCommandInput.value = initialAgentCommand || "";
      syncCommandPresetFromInput();
      issueSelect.focus();
    </script>
  </body>
</html>`;
}
