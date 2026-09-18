const test = require("node:test");
const assert = require("node:assert/strict");

function createVscodeMock() {
  return {};
}

function setupSolutionArchitectModule() {
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
  delete require.cache[require.resolve("../out/solutionArchitect.js")];
  const solutionArchitect = require("../out/solutionArchitect.js");
  Module.prototype.require = originalRequire;
  return solutionArchitect;
}

test("getDefaultSolutionArchitectValues derives project inputs from workspace", () => {
  const solutionArchitect = setupSolutionArchitectModule();
  const defaults = solutionArchitect.getDefaultSolutionArchitectValues("/tmp/project");

  assert.deepEqual(defaults, {
    agentHarness: "Codex",
    agentModel: "",
    agentIntelligence: "",
    workspace: "/tmp/project",
    projectDescriptionDir: "/tmp/project/docs/project_description",
    specsDir: "/tmp/project/docs/specs",
    architectureGuidelinesFolder: "/tmp/project/docs/architecture/architecture_guidelines",
    backlogDir: "/tmp/project/docs/backlog",
    agentScriptPath: ""
  });
});

test("sanitizeSolutionArchitectFormValues trims values and preserves overrides", () => {
  const solutionArchitect = setupSolutionArchitectModule();
  const values = solutionArchitect.sanitizeSolutionArchitectFormValues(
    {
      agentHarness: " Codex ",
      agentModel: " gpt-5 ",
      agentIntelligence: " high ",
      workspace: " /tmp/project ",
      projectDescriptionDir: " /docs/project_description ",
      specsDir: " /docs/specs ",
      architectureGuidelinesFolder: " /docs/architecture ",
      backlogDir: " /docs/backlog ",
      agentScriptPath: " ./solution-architect.sh "
    },
    "/tmp/project"
  );

  assert.deepEqual(values, {
    agentHarness: "Codex",
    agentModel: "gpt-5",
    agentIntelligence: "high",
    workspace: "/tmp/project",
    projectDescriptionDir: "/docs/project_description",
    specsDir: "/docs/specs",
    architectureGuidelinesFolder: "/docs/architecture",
    backlogDir: "/docs/backlog",
    agentScriptPath: "./solution-architect.sh"
  });
});

test("getMissingSolutionArchitectFields returns only required empty values", () => {
  const solutionArchitect = setupSolutionArchitectModule();
  const missing = solutionArchitect.getMissingSolutionArchitectFields({
    agentHarness: "",
    agentModel: "",
    agentIntelligence: "",
    workspace: "",
    projectDescriptionDir: "",
    specsDir: "",
    architectureGuidelinesFolder: "",
    backlogDir: "",
    agentScriptPath: ""
  });

  assert.deepEqual(missing, [
    "Agent Harness",
    "Project Workspace folder",
    "Project Description folder",
    "Project Specs folder",
    "Agent Script Path"
  ]);
});

test("buildSolutionArchitectCommand includes required flags and non-empty optional flags", () => {
  const solutionArchitect = setupSolutionArchitectModule();
  const command = solutionArchitect.buildSolutionArchitectCommand({
    agentHarness: "Codex",
    agentModel: "gpt-5",
    agentIntelligence: "",
    workspace: "/tmp/project",
    projectDescriptionDir: "/tmp/project/docs/project_description",
    specsDir: "/tmp/project/docs/specs",
    architectureGuidelinesFolder: "/tmp/project/docs/architecture/architecture_guidelines",
    backlogDir: "",
    agentScriptPath: "./solution-architect.sh"
  });

  assert.equal(
    command,
    [
      "\"./solution-architect.sh\"",
      "--specs-dir",
      "\"/tmp/project/docs/specs\"",
      "--workspace",
      "\"/tmp/project\"",
      "--project-description-dir",
      "\"/tmp/project/docs/project_description\"",
      "--harness",
      "\"Codex\"",
      "--architecture-guidelines-folder",
      "\"/tmp/project/docs/architecture/architecture_guidelines\"",
      "--model",
      "\"gpt-5\""
    ].join(" ")
  );
  assert.equal(command.includes("--backlog-dir"), false);
  assert.equal(command.includes("--intelligence"), false);
});

test("renderSolutionArchitectHtml includes draft save and workspace-derived folder sync", () => {
  const solutionArchitect = setupSolutionArchitectModule();
  const html = solutionArchitect.renderSolutionArchitectHtml(
    { cspSource: "vscode-resource:" },
    solutionArchitect.getDefaultSolutionArchitectValues("/tmp/project")
  );

  assert.match(html, /saveSolutionArchitectDraft/);
  assert.match(html, /syncProjectFolderDefaults/);
  assert.match(html, /Project Description folder/);
  assert.match(html, /Project Specs folder/);
  assert.match(html, /Project Architecture guidelines folder/);
  assert.match(html, /Agent Script Path/);
});
