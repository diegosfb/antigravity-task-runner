const test = require("node:test");
const assert = require("node:assert/strict");

function createVscodeMock() {
  return {};
}

function setupDeveloperModule() {
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
  delete require.cache[require.resolve("../out/developer.js")];
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
    executionPlanFile: "/tmp/project/docs/project-execution-plan.md",
    backlogDir: "/tmp/project/docs/backlog",
    architectureDir: "/tmp/project/docs/architecture",
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
      executionPlanFile: " /docs/project-execution-plan.md ",
      backlogDir: " /docs/backlog ",
      architectureDir: " /docs/architecture ",
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
    executionPlanFile: "/docs/project-execution-plan.md",
    backlogDir: "/docs/backlog",
    architectureDir: "/docs/architecture",
    agentScriptPath: "./developer.sh"
  });
});

test("getMissingDeveloperFields returns only required empty values", () => {
  const developer = setupDeveloperModule();
  const missing = developer.getMissingDeveloperFields({
    agentHarness: "",
    agentModel: "",
    agentIntelligence: "",
    workspace: "",
    projectDescriptionDir: "",
    executionPlanFile: "",
    backlogDir: "",
    architectureDir: "",
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

test("buildDeveloperCommand includes required flags and non-empty optional flags", () => {
  const developer = setupDeveloperModule();
  const command = developer.buildDeveloperCommand({
    agentHarness: "Codex",
    agentModel: "gpt-5",
    agentIntelligence: "",
    workspace: "/tmp/project",
    projectDescriptionDir: "/tmp/project/docs/project_description",
    executionPlanFile: "/tmp/project/docs/project-execution-plan.md",
    backlogDir: "",
    architectureDir: "/tmp/project/docs/architecture",
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

test("renderDeveloperHtml includes draft save and workspace-derived input sync", () => {
  const developer = setupDeveloperModule();
  const html = developer.renderDeveloperHtml(
    { cspSource: "vscode-resource:" },
    developer.getDefaultDeveloperValues("/tmp/project")
  );

  assert.match(html, /saveDeveloperDraft/);
  assert.match(html, /syncProjectFolderDefaults/);
  assert.match(html, /Project Execution Plan file/);
  assert.match(html, /Project Backlog folder/);
  assert.match(html, /Project Architecture folder/);
  assert.match(html, /Agent Script Path/);
});
