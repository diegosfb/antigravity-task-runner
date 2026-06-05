const test = require("node:test");
const assert = require("node:assert/strict");

function createVscodeMock() {
  return {
    workspace: { getConfiguration: () => ({ get: () => undefined }) }
  };
}

function setupBusinessAnalystModule() {
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === "vscode") return createVscodeMock();
    return originalRequire.apply(this, arguments);
  };
  delete require.cache[require.resolve("../out/businessAnalyst.js")];
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
    jiraProjectKey: "",
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
      jiraProjectKey: " PROJ ",
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
    jiraProjectKey: "PROJ",
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
    jiraProjectKey: "",
    agentScriptPath: ""
  });

  assert.deepEqual(missing, [
    "Agent Harness",
    "Project Workspace folder",
    "Project Specs folder",
    "Agent Script Path"
  ]);
});

test("buildBusinessAnalystCommand includes required and non-empty optional flags", () => {
  const { buildBusinessAnalystCommand } = setupBusinessAnalystModule();
  const command = buildBusinessAnalystCommand({
    agentHarness: "Codex",
    agentModel: "gpt-5",
    agentIntelligence: "",
    workspace: "/tmp/project/workspace",
    specsDir: "/tmp/project/workspace/docs/specs",
    backlogDir: "",
    jiraProjectKey: "PROJ",
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
      "--jira-project-key",
      "\"PROJ\""
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
  assert.match(html, /Agent Script Path/);
});
