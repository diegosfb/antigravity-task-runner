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

function setupEstimatorModule(configValues = {}) {
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
  delete require.cache[require.resolve("../out/estimator.js")];
  delete require.cache[require.resolve("../out/jiraRunner.js")];
  const estimator = require("../out/estimator.js");
  Module.prototype.require = originalRequire;
  return estimator;
}

test("getDefaultEstimatorValues derives project inputs from workspace", () => {
  const estimator = setupEstimatorModule();
  const defaults = estimator.getDefaultEstimatorValues("/tmp/project");

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

test("sanitizeEstimatorFormValues trims values and preserves explicit overrides", () => {
  const estimator = setupEstimatorModule();
  const values = estimator.sanitizeEstimatorFormValues(
    {
      agentHarness: " Codex ",
      agentModel: " gpt-5 ",
      agentIntelligence: " high ",
      workspace: " /tmp/project ",
      projectDescriptionDir: " /docs/project_description ",
      architectureDir: " /docs/architecture ",
      backlogDir: " /docs/backlog ",
      enableJira: true,
      jiraProjectName: " Project Estimate ",
      agentScriptPath: " ./estimator.sh "
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
    jiraProjectName: "Project Estimate",
    agentScriptPath: "./estimator.sh"
  });
});

test("getMissingEstimatorFields returns only required empty values", () => {
  const estimator = setupEstimatorModule();
  const missing = estimator.getMissingEstimatorFields({
    agentHarness: "",
    agentModel: "",
    agentIntelligence: "",
    workspace: "",
    projectDescriptionDir: "",
    architectureDir: "",
    backlogDir: "",
    enableJira: false,
    jiraProjectName: "",
    agentScriptPath: ""
  });

  assert.deepEqual(missing, [
    "Agent Harness",
    "Project Workspace folder",
    "Project Description folder",
    "Project Architecture folder",
    "Project Backlog folder",
    "Agent Script Path"
  ]);
});

test("getMissingEstimatorFields requires Jira settings when enabled", () => {
  const estimator = setupEstimatorModule();
  const missing = estimator.getMissingEstimatorFields({
    agentHarness: "Codex",
    agentModel: "",
    agentIntelligence: "",
    workspace: "/tmp/project",
    projectDescriptionDir: "/tmp/project/docs/project_description",
    architectureDir: "/tmp/project/docs/architecture",
    backlogDir: "/tmp/project/docs/backlog",
    enableJira: true,
    jiraProjectName: "",
    agentScriptPath: "./estimator.sh"
  });

  assert.deepEqual(missing, [
    "Jira Project Name",
    "Jira Username setting",
    "Jira URL setting",
    "Jira API Token setting"
  ]);
});

test("buildEstimatorCommand includes Jira flags when enabled", () => {
  const estimator = setupEstimatorModule({
    jiraEmail: "jira-user@example.com",
    jiraBaseUrl: "https://jira.example.com",
    jiraApiToken: "secret-token"
  });
  const command = estimator.buildEstimatorCommand({
    agentHarness: "Codex",
    agentModel: "gpt-5",
    agentIntelligence: "",
    workspace: "/tmp/project",
    projectDescriptionDir: "/tmp/project/docs/project_description",
    architectureDir: "/tmp/project/docs/architecture",
    backlogDir: "",
    enableJira: true,
    jiraProjectName: "Project Estimate",
    agentScriptPath: "./estimator.sh"
  });

  assert.equal(
    command,
    [
      "\"./estimator.sh\"",
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
      "\"Project Estimate\""
    ].join(" ")
  );
  assert.equal(command.includes("--backlog-dir"), false);
  assert.equal(command.includes("--intelligence"), false);
});

test("renderEstimatorHtml includes draft save and workspace-derived folder sync", () => {
  const estimator = setupEstimatorModule();
  const html = estimator.renderEstimatorHtml(
    { cspSource: "vscode-resource:" },
    estimator.getDefaultEstimatorValues("/tmp/project")
  );

  assert.match(html, /saveEstimatorDraft/);
  assert.match(html, /syncProjectFolderDefaults/);
  assert.match(html, /Project Workspace folder/);
  assert.match(html, /Project Architecture folder/);
  assert.match(html, /Enable Jira using configured credentials/);
  assert.match(html, /Jira Project Name/);
  assert.match(html, /Agent Script Path/);
});

test("renderEstimatorHtml shows configured Jira project key as a label", () => {
  const estimator = setupEstimatorModule();
  const html = estimator.renderEstimatorHtml(
    { cspSource: "vscode-resource:" },
    {
      ...estimator.getDefaultEstimatorValues("/tmp/project"),
      enableJira: true
    },
    "TASK"
  );

  assert.match(html, /Jira Project: <strong>TASK<\/strong>/);
  assert.match(html, /jiraProjectNameRow.hidden = !enableJiraInput.checked;/);
  assert.match(html, /const configuredJiraProjectKey = "TASK";/);
  assert.doesNotMatch(html, /<span>Jira Project Name<\/span>/);
});
