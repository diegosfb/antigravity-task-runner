const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildCreateJiraProjectAgenticHarnessEnvironment,
  buildCreateJiraProjectAgenticHarnessPrompt,
  copyJiraProjectCreationSkill,
  JIRA_COMPANY_MANAGED_WORKFLOW_SCHEME,
  JIRA_PROJECT_CREATION_SKILL_NAME
} = require("../out/jiraProjectHarness.js");

test("buildCreateJiraProjectAgenticHarnessPrompt requires a company-managed project and workflow scheme", () => {
  const prompt = buildCreateJiraProjectAgenticHarnessPrompt({
    projectName: "Task Runner",
    projectKey: "TASK",
    description: "Created from Antigravity"
  });

  assert.match(prompt, /use skill jira-project-creation for the Jira project creation in this same run/i);
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
    projectKey: "TASK"
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

test("JIRA_PROJECT_CREATION_SKILL_NAME matches the bundled skill folder", () => {
  assert.equal(JIRA_PROJECT_CREATION_SKILL_NAME, "jira-project-creation");
});

test("copyJiraProjectCreationSkill copies the skill into .agent/skills and .claude/skills", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-jira-project-skill-"));
  const extensionRoot = path.join(tempRoot, "extension");
  const projectRoot = path.join(tempRoot, "project");
  const sourceRoot = path.join(extensionRoot, "Resources", "jira-project-creation");

  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, "SKILL.md"), "# Jira Project Creation\n");

  const copiedPaths = await copyJiraProjectCreationSkill(extensionRoot, projectRoot);

  assert.deepEqual(copiedPaths, [
    ".agent/skills/jira-project-creation",
    ".claude/skills/jira-project-creation"
  ]);
  assert.equal(
    fs.readFileSync(
      path.join(projectRoot, ".agent", "skills", "jira-project-creation", "SKILL.md"),
      "utf8"
    ),
    "# Jira Project Creation\n"
  );
  assert.equal(
    fs.readFileSync(
      path.join(projectRoot, ".claude", "skills", "jira-project-creation", "SKILL.md"),
      "utf8"
    ),
    "# Jira Project Creation\n"
  );
});

test("copyJiraProjectCreationSkill does not overwrite an existing bundled skill", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-jira-project-skill-"));
  const extensionRoot = path.join(tempRoot, "extension");
  const projectRoot = path.join(tempRoot, "project");
  const sourceRoot = path.join(extensionRoot, "Resources", "jira-project-creation");
  const existingAgentSkill = path.join(
    projectRoot,
    ".agent",
    "skills",
    "jira-project-creation",
    "SKILL.md"
  );
  const existingClaudeSkill = path.join(
    projectRoot,
    ".claude",
    "skills",
    "jira-project-creation",
    "SKILL.md"
  );

  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, "SKILL.md"), "# New Jira Project Skill\n");
  fs.mkdirSync(path.dirname(existingAgentSkill), { recursive: true });
  fs.mkdirSync(path.dirname(existingClaudeSkill), { recursive: true });
  fs.writeFileSync(existingAgentSkill, "# Existing Agent Jira Project Skill\n");
  fs.writeFileSync(existingClaudeSkill, "# Existing Claude Jira Project Skill\n");

  const copiedPaths = await copyJiraProjectCreationSkill(extensionRoot, projectRoot);

  assert.deepEqual(copiedPaths, []);
  assert.equal(
    fs.readFileSync(existingAgentSkill, "utf8"),
    "# Existing Agent Jira Project Skill\n"
  );
  assert.equal(
    fs.readFileSync(existingClaudeSkill, "utf8"),
    "# Existing Claude Jira Project Skill\n"
  );
});
