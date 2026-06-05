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

function setupBusinessAnalystModule(configValues = {}) {
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === "vscode") return createVscodeMock(configValues);
    return originalRequire.apply(this, arguments);
  };
  delete require.cache[require.resolve("../out/businessAnalyst.js")];
  delete require.cache[require.resolve("../out/jiraRunner.js")];
  const moduleExports = require("../out/businessAnalyst.js");
  Module.prototype.require = originalRequire;
  return moduleExports;
}

test("getDefaultBusinessAnalystValues derives project folders from workspace", () => {
  const { getDefaultBusinessAnalystValues } = setupBusinessAnalystModule();
  const values = getDefaultBusinessAnalystValues("/tmp/project/workspace");

  assert.deepEqual(values, {
    agentHarness: "Codex",
    agentModel: "",
    agentIntelligence: "",
    workspace: "/tmp/project/workspace",
    specsDir: "/tmp/project/workspace/docs/specs",
    backlogDir: "/tmp/project/workspace/docs/backlog",
    enableJira: false,
    jiraProjectName: "",
    agentScriptPath: ""
  });
});

test("sanitizeBusinessAnalystFormValues trims input and preserves explicit overrides", () => {
  const { sanitizeBusinessAnalystFormValues } = setupBusinessAnalystModule();
  const values = sanitizeBusinessAnalystFormValues(
    {
      agentHarness: " Codex ",
      agentModel: " gpt-5 ",
      agentIntelligence: " high ",
      workspace: " /tmp/project/workspace ",
      specsDir: " /custom/specs ",
      backlogDir: " /custom/backlog ",
      enableJira: true,
      jiraProjectName: " Project Alpha ",
      agentScriptPath: " ./workspace/scripts/ba-agent "
    },
    "/tmp/project/workspace"
  );

  assert.deepEqual(values, {
    agentHarness: "Codex",
    agentModel: "gpt-5",
    agentIntelligence: "high",
    workspace: "/tmp/project/workspace",
    specsDir: "/custom/specs",
    backlogDir: "/custom/backlog",
    enableJira: true,
    jiraProjectName: "Project Alpha",
    agentScriptPath: "./workspace/scripts/ba-agent"
  });
});

test("sanitizeBusinessAnalystFormValues repairs legacy duplicated workspace defaults", () => {
  const { sanitizeBusinessAnalystFormValues } = setupBusinessAnalystModule();
  const workspaceRoot = "/tmp/project/workspace";
  const values = sanitizeBusinessAnalystFormValues(
    {
      workspace: workspaceRoot,
      specsDir: "/tmp/project/workspace/workspace/docs/specs",
      backlogDir: "/tmp/project/workspace/workspace/docs/backlog"
    },
    workspaceRoot
  );

  assert.equal(values.workspace, workspaceRoot);
  assert.equal(values.specsDir, "/tmp/project/workspace/docs/specs");
  assert.equal(values.backlogDir, "/tmp/project/workspace/docs/backlog");
});

test("getMissingBusinessAnalystFields lists only mandatory fields", () => {
  const { getMissingBusinessAnalystFields } = setupBusinessAnalystModule();
  const missing = getMissingBusinessAnalystFields({
    agentHarness: "",
    agentModel: "",
    agentIntelligence: "",
    workspace: "",
    specsDir: "",
    backlogDir: "",
    enableJira: false,
    jiraProjectName: "",
    agentScriptPath: ""
  });

  assert.deepEqual(missing, [
    "Agent Harness",
    "Project Workspace folder",
    "Project Specs folder",
    "Agent Script Path"
  ]);
});

test("getMissingBusinessAnalystFields requires Jira settings when Jira is enabled", () => {
  const { getMissingBusinessAnalystFields } = setupBusinessAnalystModule();
  const missing = getMissingBusinessAnalystFields({
    agentHarness: "Codex",
    agentModel: "",
    agentIntelligence: "",
    workspace: "/tmp/project/workspace",
    specsDir: "/tmp/project/workspace/docs/specs",
    backlogDir: "",
    enableJira: true,
    jiraProjectName: "",
    agentScriptPath: "./workspace/scripts/ba-agent"
  });

  assert.deepEqual(missing, [
    "Jira Project Name",
    "Jira Username setting",
    "Jira URL setting",
    "Jira API Token setting"
  ]);
});

test("buildBusinessAnalystCommand includes Jira flags when enabled", () => {
  const { buildBusinessAnalystCommand } = setupBusinessAnalystModule({
    jiraEmail: "jira-user@example.com",
    jiraBaseUrl: "https://jira.example.com",
    jiraApiToken: "secret-token"
  });
  const command = buildBusinessAnalystCommand({
    agentHarness: "Codex",
    agentModel: "gpt-5",
    agentIntelligence: "",
    workspace: "/tmp/project/workspace",
    specsDir: "/tmp/project/workspace/docs/specs",
    backlogDir: "",
    enableJira: true,
    jiraProjectName: "Project Alpha",
    agentScriptPath: "./workspace/scripts/ba-agent"
  });

  assert.equal(
    command,
    [
      "\"./workspace/scripts/ba-agent\"",
      "--specs-dir",
      "\"/tmp/project/workspace/docs/specs\"",
      "--workspace",
      "\"/tmp/project/workspace\"",
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
      "\"Project Alpha\""
    ].join(" ")
  );
  assert.doesNotMatch(command, /--backlog-dir/);
  assert.doesNotMatch(command, /--intelligence/);
});

test("renderBusinessAnalystHtml includes draft save and workspace-derived folder sync", () => {
  const {
    renderBusinessAnalystHtml,
    getDefaultBusinessAnalystValues
  } = setupBusinessAnalystModule();
  const html = renderBusinessAnalystHtml(
    { cspSource: "vscode-resource:" },
    getDefaultBusinessAnalystValues("/tmp/project/workspace")
  );

  assert.match(html, /saveBusinessAnalystDraft/);
  assert.match(html, /syncProjectFolderDefaults/);
  assert.match(html, /Project Workspace folder/);
  assert.match(html, /Project Specs folder/);
  assert.match(html, /Enable Jira using configured credentials/);
  assert.match(html, /<span>Jira Project<\/span>/);
  assert.match(html, /type="hidden"/);
  assert.match(html, /Agent Script Path/);
});

test("renderBusinessAnalystHtml shows configured Jira project key as a label", () => {
  const {
    renderBusinessAnalystHtml,
    getDefaultBusinessAnalystValues
  } = setupBusinessAnalystModule();
  const html = renderBusinessAnalystHtml(
    { cspSource: "vscode-resource:" },
    {
      ...getDefaultBusinessAnalystValues("/tmp/project/workspace"),
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
