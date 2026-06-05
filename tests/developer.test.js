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

function setupDeveloperModule(configValues = {}) {
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
  delete require.cache[require.resolve("../out/developer.js")];
  delete require.cache[require.resolve("../out/jiraRunner.js")];
  const developer = require("../out/developer.js");
  Module.prototype.require = originalRequire;
  return developer;
}

test("getDefaultDeveloperValues derives project inputs from workspace", () => {
  const developer = setupDeveloperModule();
  const defaults = developer.getDefaultDeveloperValues("/tmp/project");

  assert.deepEqual(defaults, {
    agentHarness: "Codex",
    agentModel: "",
    agentIntelligence: "",
    workspace: "/tmp/project",
    projectDescriptionDir: "/tmp/project/docs/project_description",
    sourceOutputFolder: "/tmp/project/src",
    executionPlanFile: "/tmp/project/docs/project-execution-plan.md",
    backlogDir: "/tmp/project/docs/backlog",
    architectureDir: "/tmp/project/docs/architecture",
    enableJira: false,
    jiraProjectName: "",
    agentScriptPath: ""
  });
});

test("sanitizeDeveloperFormValues trims values and preserves explicit overrides", () => {
  const developer = setupDeveloperModule();
  const values = developer.sanitizeDeveloperFormValues(
    {
      agentHarness: " Codex ",
      agentModel: " gpt-5 ",
      agentIntelligence: " high ",
      workspace: " /tmp/project ",
      projectDescriptionDir: " /docs/project_description ",
      sourceOutputFolder: " /docs/project_description/custom-src ",
      executionPlanFile: " /docs/project-execution-plan.md ",
      backlogDir: " /docs/backlog ",
      architectureDir: " /docs/architecture ",
      enableJira: true,
      jiraProjectName: " Project Gamma ",
      agentScriptPath: " ./developer.sh "
    },
    "/tmp/project"
  );

  assert.deepEqual(values, {
    agentHarness: "Codex",
    agentModel: "gpt-5",
    agentIntelligence: "high",
    workspace: "/tmp/project",
    projectDescriptionDir: "/docs/project_description",
    sourceOutputFolder: "/docs/project_description/custom-src",
    executionPlanFile: "/docs/project-execution-plan.md",
    backlogDir: "/docs/backlog",
    architectureDir: "/docs/architecture",
    enableJira: true,
    jiraProjectName: "Project Gamma",
    agentScriptPath: "./developer.sh"
  });
});

test("sanitizeDeveloperFormValues derives source output folder from workspace when omitted", () => {
  const developer = setupDeveloperModule();
  const values = developer.sanitizeDeveloperFormValues(
    {
      workspace: " /tmp/project ",
      projectDescriptionDir: " /docs/project_description "
    },
    "/tmp/project"
  );

  assert.equal(values.sourceOutputFolder, "/tmp/project/src");
});

test("getMissingDeveloperFields returns only required empty values", () => {
  const developer = setupDeveloperModule();
  const missing = developer.getMissingDeveloperFields({
    agentHarness: "",
    agentModel: "",
    agentIntelligence: "",
    workspace: "",
    projectDescriptionDir: "",
    sourceOutputFolder: "",
    executionPlanFile: "",
    backlogDir: "",
    architectureDir: "",
    enableJira: false,
    jiraProjectName: "",
    agentScriptPath: ""
  });

  assert.deepEqual(missing, [
    "Agent Harness",
    "Project Workspace folder",
    "Project Description folder",
    "Project Execution Plan file",
    "Project Backlog folder",
    "Project Architecture folder",
    "Agent Script Path"
  ]);
});

test("getMissingDeveloperFields requires Jira settings when enabled", () => {
  const developer = setupDeveloperModule();
  const missing = developer.getMissingDeveloperFields({
    agentHarness: "Codex",
    agentModel: "",
    agentIntelligence: "",
    workspace: "/tmp/project",
    projectDescriptionDir: "/tmp/project/docs/project_description",
    sourceOutputFolder: "/tmp/project/src",
    executionPlanFile: "/tmp/project/docs/project-execution-plan.md",
    backlogDir: "/tmp/project/docs/backlog",
    architectureDir: "/tmp/project/docs/architecture",
    enableJira: true,
    jiraProjectName: "",
    agentScriptPath: "./developer.sh"
  });

  assert.deepEqual(missing, [
    "Jira Project Name",
    "Jira Username setting",
    "Jira URL setting",
    "Jira API Token setting"
  ]);
});

test("buildDeveloperCommand includes Jira flags when enabled", () => {
  const developer = setupDeveloperModule({
    jiraEmail: "jira-user@example.com",
    jiraBaseUrl: "https://jira.example.com",
    jiraApiToken: "secret-token"
  });
  const command = developer.buildDeveloperCommand({
    agentHarness: "Codex",
    agentModel: "gpt-5",
    agentIntelligence: "",
    workspace: "/tmp/project",
    projectDescriptionDir: "/tmp/project/docs/project_description",
    sourceOutputFolder: "/tmp/project/src",
    executionPlanFile: "/tmp/project/docs/project-execution-plan.md",
    backlogDir: "",
    architectureDir: "/tmp/project/docs/architecture",
    enableJira: true,
    jiraProjectName: "Project Gamma",
    agentScriptPath: "./developer.sh"
  });

  assert.equal(
    command,
    [
      "\"./developer.sh\"",
      "--execution-plan",
      "\"/tmp/project/docs/project-execution-plan.md\"",
      "--project-description-dir",
      "\"/tmp/project/docs/project_description\"",
      "--src-output-folder",
      "\"/tmp/project/src\"",
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
      "\"Project Gamma\""
    ].join(" ")
  );
  assert.equal(command.includes("--backlog-dir"), false);
  assert.equal(command.includes("--intelligence"), false);
});

test("renderDeveloperHtml includes draft save and workspace-derived input sync", () => {
  const developer = setupDeveloperModule();
  const html = developer.renderDeveloperHtml(
    { cspSource: "vscode-resource:" },
    developer.getDefaultDeveloperValues("/tmp/project")
  );

  assert.match(html, /saveDeveloperDraft/);
  assert.match(html, /syncProjectFolderDefaults/);
  assert.match(html, /Sourcecode Output folder/);
  assert.match(html, /Project Execution Plan file/);
  assert.match(html, /Project Backlog folder/);
  assert.match(html, /Project Architecture folder/);
  assert.match(html, /Enable Jira using configured credentials/);
  assert.match(html, /Jira Project Name/);
  assert.match(html, /Agent Script Path/);
});
