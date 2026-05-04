const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildCreateJiraProjectAgenticHarnessPrompt,
  JIRA_COMPANY_MANAGED_WORKFLOW_SCHEME
} = require("../out/jiraProjectHarness.js");

test("buildCreateJiraProjectAgenticHarnessPrompt requires a company-managed project and workflow scheme", () => {
  const prompt = buildCreateJiraProjectAgenticHarnessPrompt({
    projectName: "Task Runner",
    projectKey: "TASK",
    description: "Created from Antigravity"
  });

  assert.match(prompt, /company-managed project/i);
  assert.match(prompt, new RegExp(JIRA_COMPANY_MANAGED_WORKFLOW_SCHEME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(prompt, /Project name: Task Runner\./);
  assert.match(prompt, /Project key: TASK\./);
  assert.match(prompt, /Use this project description: Created from Antigravity\./);
  assert.match(prompt, /Do not tell the user to create the project manually/i);
});

test("buildCreateJiraProjectAgenticHarnessPrompt allows an empty description", () => {
  const prompt = buildCreateJiraProjectAgenticHarnessPrompt({
    projectName: "Task Runner",
    projectKey: "TASK"
  });

  assert.match(prompt, /Leave the project description blank unless Jira requires one\./);
});
