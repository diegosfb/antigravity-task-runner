const test = require("node:test");
const assert = require("node:assert/strict");

function createVscodeMock() {
  return {};
}

function setupEstimatorModule() {
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === "vscode") return createVscodeMock();
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

test("buildEstimatorCommand includes required flags and non-empty optional flags", () => {
  const estimator = setupEstimatorModule();
  const command = estimator.buildEstimatorCommand({
    agentHarness: "Codex",
    agentModel: "gpt-5",
    agentIntelligence: "",
    workspace: "/tmp/project",
    projectDescriptionDir: "/tmp/project/docs/project_description",
    architectureDir: "/tmp/project/docs/architecture",
    backlogDir: "",
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
      "\"gpt-5\""
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
  assert.match(html, /Agent Script Path/);
});
