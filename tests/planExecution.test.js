const test = require("node:test");
const assert = require("node:assert/strict");

function createVscodeMock(configValues = {}) {
  return {
    workspace: {
      getConfiguration: () => ({
        get: (key) => configValues[key]
      })
    }
  };
}

function setupPlanExecutionModule(configValues = {}) {
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === "vscode") return createVscodeMock(configValues);
    if (id === "./settings") {
      return { getNonce: () => "nonce" };
    }
    if (id === "./utils") {
      return {
        quoteShellArg: (value) => `"${String(value).replace(/["\\$`]/g, "\\$&")}"`
      };
    }
    return originalRequire.apply(this, arguments);
  };
  delete require.cache[require.resolve("../out/planExecution.js")];
  delete require.cache[require.resolve("../out/jiraRunner.js")];
  const planExecution = require("../out/planExecution.js");
  Module.prototype.require = originalRequire;
  return planExecution;
}

test("getDefaultPlanExecutionValues derives project inputs from workspace", () => {
  const planExecution = setupPlanExecutionModule();
  const defaults = planExecution.getDefaultPlanExecutionValues("/tmp/project");

  assert.deepEqual(defaults, {
    agentHarness: "Codex",
    agentModel: "",
    agentIntelligence: "",
    workspace: "/tmp/project",
    projectDescriptionDir: "/tmp/project/docs/project_description",
    architectureDir: "/tmp/project/docs/architecture",
    backlogDir: "/tmp/project/docs/backlog",
    enableJira: false,
    jiraProjectName: "",
    agentScriptPath: ""
  });
});

test("sanitizePlanExecutionFormValues trims values and preserves explicit overrides", () => {
  const planExecution = setupPlanExecutionModule();
  const values = planExecution.sanitizePlanExecutionFormValues(
    {
      agentHarness: " Codex ",
      agentModel: " gpt-5 ",
      agentIntelligence: " high ",
      workspace: " /tmp/project ",
      projectDescriptionDir: " /docs/project_description ",
      architectureDir: " /docs/architecture ",
      backlogDir: " /docs/backlog ",
      enableJira: true,
      jiraProjectName: " Project Beta ",
      agentScriptPath: " ./plan-execution.sh "
    },
    "/tmp/project"
  );

  assert.deepEqual(values, {
    agentHarness: "Codex",
    agentModel: "gpt-5",
    agentIntelligence: "high",
    workspace: "/tmp/project",
    projectDescriptionDir: "/docs/project_description",
    architectureDir: "/docs/architecture",
    backlogDir: "/docs/backlog",
    enableJira: true,
    jiraProjectName: "Project Beta",
    agentScriptPath: "./plan-execution.sh"
  });
});

test("getMissingPlanExecutionFields includes Jira settings when enabled", () => {
  const planExecution = setupPlanExecutionModule();
  const missing = planExecution.getMissingPlanExecutionFields({
    agentHarness: "Codex",
    agentModel: "",
    agentIntelligence: "",
    workspace: "/tmp/project",
    projectDescriptionDir: "/tmp/project/docs/project_description",
    architectureDir: "/tmp/project/docs/architecture",
    backlogDir: "/tmp/project/docs/backlog",
    enableJira: true,
    jiraProjectName: "",
    agentScriptPath: "./plan-execution.sh"
  });

  assert.deepEqual(missing, [
    "Jira Project Name",
    "Jira Username setting",
    "Jira URL setting",
    "Jira API Token setting"
  ]);
});

test("buildPlanExecutionCommand includes Jira flags when enabled", () => {
  const planExecution = setupPlanExecutionModule({
    jiraEmail: "jira-user@example.com",
    jiraBaseUrl: "https://jira.example.com",
    jiraApiToken: "secret-token"
  });
  const command = planExecution.buildPlanExecutionCommand({
    agentHarness: "Codex",
    agentModel: "gpt-5",
    agentIntelligence: "",
    workspace: "/tmp/project",
    projectDescriptionDir: "/tmp/project/docs/project_description",
    architectureDir: "/tmp/project/docs/architecture",
    backlogDir: "",
    enableJira: true,
    jiraProjectName: "Project Beta",
    agentScriptPath: "./plan-execution.sh"
  });

  assert.equal(
    command,
    [
      "\"./plan-execution.sh\"",
      "--project-description-dir",
      "\"/tmp/project/docs/project_description\"",
      "--architecture-dir",
      "\"/tmp/project/docs/architecture\"",
      "--workspace",
      "\"/tmp/project\"",
      "--harness",
      "\"Codex\"",
      "--model",
      "\"gpt-5\"",
      "--jira-username",
      "\"jira-user@example.com\"",
      "--jira-url",
      "\"https://jira.example.com\"",
      "--jira-api-token",
      "\"secret-token\"",
      "--jira-project",
      "\"Project Beta\""
    ].join(" ")
  );
});

test("renderPlanExecutionHtml includes Jira controls", () => {
  const planExecution = setupPlanExecutionModule();
  const html = planExecution.renderPlanExecutionHtml(
    { cspSource: "vscode-resource:" },
    planExecution.getDefaultPlanExecutionValues("/tmp/project")
  );

  assert.match(html, /savePlanExecutionDraft/);
  assert.match(html, /syncProjectFolderDefaults/);
  assert.match(html, /Enable Jira using configured credentials/);
  assert.match(html, /<span>Jira Project<\/span>/);
  assert.match(html, /type="hidden"/);
  assert.match(html, /Agent Script Path/);
});

test("renderPlanExecutionHtml shows configured Jira project key as a label", () => {
  const planExecution = setupPlanExecutionModule();
  const html = planExecution.renderPlanExecutionHtml(
    { cspSource: "vscode-resource:" },
    {
      ...planExecution.getDefaultPlanExecutionValues("/tmp/project"),
      enableJira: true
    },
    "TASK"
  );

  assert.match(html, /<span>Jira Project<\/span>/);
  assert.match(html, /<div class="jira-project-value">TASK<\/div>/);
  assert.match(html, /jiraProjectNameRow.hidden = !enableJiraInput.checked;/);
  assert.match(html, /const configuredJiraProjectKey = "TASK";/);
  assert.match(html, /type="hidden"/);
  assert.doesNotMatch(html, /<span>Jira Project Name<\/span>/);
});
