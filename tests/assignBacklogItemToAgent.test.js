const test = require("node:test");
const assert = require("node:assert/strict");

function createVscodeMock() {
  return {
    workspace: { getConfiguration: () => ({ get: () => undefined }) }
  };
}

function setupAssignBacklogItemToAgentModule() {
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === "vscode") return createVscodeMock();
    return originalRequire.apply(this, arguments);
  };
  delete require.cache[require.resolve("../out/assignBacklogItemToAgent.js")];
  const moduleExports = require("../out/assignBacklogItemToAgent.js");
  Module.prototype.require = originalRequire;
  return moduleExports;
}

function getFixtureIssue() {
  return {
    description: "Implement the shared backlog matching flow for assign-to-agent.",
    id: "123",
    issueTypeName: "Story",
    key: "ANTIGRAVIT-123",
    projectKey: "ANTIGRAVIT",
    projectName: "Antigravity",
    statusName: "To Do",
    summary: "Replicate backlog matching on assign flow"
  };
}

function getFixtureBacklogItem() {
  return {
    description: "Implement the shared backlog matching flow for assign-to-agent.",
    displayName: "Feature: Replicate backlog matching on assign flow",
    fileName: "feature-replicate-backlog-matching-on-assign-flow.md",
    filePath:
      "/tmp/docs/backlog/feature-replicate-backlog-matching-on-assign-flow.md",
    statusName: "To Do",
    summary: "",
    typeName: "Feature"
  };
}

test("buildAssignBacklogItemToAgentPrompt includes Jira and local backlog update instructions", () => {
  const assignBacklogItemToAgent = setupAssignBacklogItemToAgentModule();
  const prompt = assignBacklogItemToAgent.buildAssignBacklogItemToAgentPrompt(
    getFixtureIssue(),
    "Codex",
    "agent@example.com",
    getFixtureBacklogItem()
  );

  assert.match(prompt, /work on Jira Item ANTIGRAVIT-123 - Replicate backlog matching on assign flow\./);
  assert.match(prompt, /local backlog item Feature: Replicate backlog matching on assign flow/);
  assert.match(prompt, /## Notes section using lines that start with AGENT ASSUMPTION:/);
  assert.match(prompt, /AGENT SOLUTION: note/);
  assert.match(prompt, /## Status section to In Review/);
  assert.match(prompt, /Use Jira MCP tools/);
});

test("buildAssignBacklogItemToAgentPrompt supports local backlog only mode", () => {
  const assignBacklogItemToAgent = setupAssignBacklogItemToAgentModule();
  const prompt = assignBacklogItemToAgent.buildAssignBacklogItemToAgentPrompt(
    undefined,
    "Codex",
    "agent@example.com",
    getFixtureBacklogItem()
  );

  assert.match(
    prompt,
    /work on local backlog item Feature: Replicate backlog matching on assign flow/
  );
  assert.doesNotMatch(prompt, /Use Jira MCP tools/);
  assert.doesNotMatch(prompt, /transition Jira item/);
  assert.match(prompt, /## Notes section using lines that start with AGENT ASSUMPTION:/);
  assert.match(prompt, /## Status section to In Review/);
});

test("buildAssignBacklogItemToAgentFeatureDetails includes both Jira and local backlog context", () => {
  const assignBacklogItemToAgent = setupAssignBacklogItemToAgentModule();
  const details = assignBacklogItemToAgent.buildAssignBacklogItemToAgentFeatureDetails(
    getFixtureIssue(),
    getFixtureBacklogItem()
  );

  assert.match(details, /Jira item ANTIGRAVIT-123 \(Story, To Do\): Replicate backlog matching on assign flow/);
  assert.match(details, /Jira description:/);
  assert.match(
    details,
    /Local backlog item Feature: Replicate backlog matching on assign flow \(feature-replicate-backlog-matching-on-assign-flow\.md\)/
  );
  assert.match(details, /Local backlog description:/);
});

test("buildAssignBacklogItemToAgentFeatureDetails supports local backlog only mode", () => {
  const assignBacklogItemToAgent = setupAssignBacklogItemToAgentModule();
  const details = assignBacklogItemToAgent.buildAssignBacklogItemToAgentFeatureDetails(
    undefined,
    getFixtureBacklogItem()
  );

  assert.doesNotMatch(details, /Jira item ANTIGRAVIT-123/);
  assert.match(
    details,
    /Local backlog item Feature: Replicate backlog matching on assign flow \(feature-replicate-backlog-matching-on-assign-flow\.md\)/
  );
});

test("renderAssignBacklogItemToAgentHtml renders both selects and matching sync logic", () => {
  const assignBacklogItemToAgent = setupAssignBacklogItemToAgentModule();
  const html = assignBacklogItemToAgent.renderAssignBacklogItemToAgentHtml(
    { cspSource: "vscode-webview:" },
    [getFixtureIssue()],
    {
      agentCommandOptions: ["codex", "claude"],
      backlogItems: [getFixtureBacklogItem()],
      initialAgentCommand: "codex",
      projectKey: "ANTIGRAVIT",
      selectedBacklogItemPath: getFixtureBacklogItem().filePath,
      selectedIssueKey: getFixtureIssue().key
    }
  );

  assert.match(html, /Assign Backlog Item to Agent/);
  assert.match(html, /Jira Backlog Item/);
  assert.match(html, /Local Backlog Item/);
  assert.match(html, /id="use-jira" type="checkbox"[^>]*checked[^>]*>/);
  assert.match(html, /id="issue-select"/);
  assert.match(html, /id="backlog-item-select"/);
  assert.match(html, /Eligible local backlog items: 1\./);
  assert.match(html, /function findMatchingBacklogItem\(issue\)/);
  assert.match(html, /function findMatchingIssue\(backlogItem\)/);
  assert.match(html, /function syncJiraState\(\)/);
  assert.match(html, /syncSelections\("issue"\)/);
  assert.match(html, /syncSelections\("backlog"\)/);
  assert.match(html, /issueKey: useJiraInput\.checked \? issueSelect\.value : ""/);
  assert.match(html, /useJira: useJiraInput\.checked/);
  assert.match(html, /backlogItemPath: String\(backlogItemSelect\.value \|\| ""\)\.trim\(\)/);
});

test("renderAssignBacklogItemToAgentHtml hides the Jira section when Jira is disabled", () => {
  const assignBacklogItemToAgent = setupAssignBacklogItemToAgentModule();
  const html = assignBacklogItemToAgent.renderAssignBacklogItemToAgentHtml(
    { cspSource: "vscode-webview:" },
    [getFixtureIssue()],
    {
      agentCommandOptions: ["codex"],
      backlogItems: [getFixtureBacklogItem()],
      initialAgentCommand: "codex",
      projectKey: "ANTIGRAVIT",
      selectedBacklogItemPath: getFixtureBacklogItem().filePath,
      selectedIssueKey: "",
      useJira: false
    }
  );

  assert.match(html, /id="use-jira" type="checkbox"[^>]*>/);
  assert.match(html, /id="jira-section" hidden/);
  assert.match(html, /issueSelect\.disabled = !useJiraInput\.checked/);
});

test("renderAssignBacklogItemToAgentHtml emits a syntactically valid webview script", () => {
  const assignBacklogItemToAgent = setupAssignBacklogItemToAgentModule();
  const html = assignBacklogItemToAgent.renderAssignBacklogItemToAgentHtml(
    { cspSource: "vscode-webview:" },
    [getFixtureIssue()],
    {
      agentCommandOptions: ["codex"],
      backlogItems: [getFixtureBacklogItem()],
      initialAgentCommand: "codex",
      projectKey: "ANTIGRAVIT",
      selectedBacklogItemPath: "",
      selectedIssueKey: getFixtureIssue().key
    }
  );
  const scriptMatch = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);

  assert.ok(scriptMatch, "expected an inline script block");
  assert.doesNotThrow(() => new Function(scriptMatch[1]));
});
