const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildCreateJiraProjectAgenticHarnessEnvironment,
  buildCreateJiraProjectAgenticHarnessPrompt,
  JIRA_COMPANY_MANAGED_WORKFLOW_SCHEME
} = require("../out/jiraProjectHarness.js");

test("buildCreateJiraProjectAgenticHarnessPrompt requires a company-managed project and workflow scheme", () => {
  const prompt = buildCreateJiraProjectAgenticHarnessPrompt({
    projectName: "Task Runner",
    projectKey: "TASK",
    description: "Created from Antigravity",
    agenticHarnessCommand: "claude",
    skillSourcePath: "Resources/jira-project-creation"
  });

  assert.match(prompt, /As the first step, check whether the skill "jira-project-creation" is already available/);
  assert.match(prompt, /\.agent\/skills\/jira-project-creation/);
  assert.match(prompt, /\.claude\/skills\/jira-project-creation/);
  assert.match(prompt, /~\/\.claude\/skills\/jira-project-creation/);
  assert.match(prompt, /If the skill exists in any of those locations, do not install it/);
  assert.match(prompt, /If the skill is missing everywhere, create \.agent\/skills if needed, then copy the entire skill folder from Resources\/jira-project-creation to \.agent\/skills\/jira-project-creation\./);
  assert.match(prompt, /If \.claude\/skills does not exist locally, create it as a symlink to \.\.\/\.agent\/skills/);
  assert.match(prompt, /use that skill for the Jira project creation in this same run/i);
  assert.match(prompt, /company-managed project/i);
  assert.match(prompt, /JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN/);
  assert.match(prompt, new RegExp(JIRA_COMPANY_MANAGED_WORKFLOW_SCHEME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(prompt, /Project name: Task Runner\./);
  assert.match(prompt, /Project key: TASK\./);
  assert.match(prompt, /Use this project description: Created from Antigravity\./);
  assert.match(prompt, /Do not tell the user to create the project manually/i);
});

test("buildCreateJiraProjectAgenticHarnessPrompt allows an empty description", () => {
  const prompt = buildCreateJiraProjectAgenticHarnessPrompt({
    projectName: "Task Runner",
    projectKey: "TASK",
    agenticHarnessCommand: "claude",
    skillSourcePath: "Resources/jira-project-creation"
  });

  assert.match(prompt, /Leave the project description blank unless Jira requires one\./);
});

test("buildCreateJiraProjectAgenticHarnessEnvironment maps Jira settings to terminal env vars", () => {
  const env = buildCreateJiraProjectAgenticHarnessEnvironment({
    baseUrl: "https://example.atlassian.net",
    email: "person@example.com",
    apiToken: "secret-token"
  });

  assert.deepEqual(env, {
    JIRA_BASE_URL: "https://example.atlassian.net",
    JIRA_EMAIL: "person@example.com",
    JIRA_API_TOKEN: "secret-token"
  });
});
