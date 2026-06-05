const test = require("node:test");
const assert = require("node:assert/strict");

function createVscodeMock() {
  return {};
}

function setupProductDesignerModule() {
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
  delete require.cache[require.resolve("../out/productDesigner.js")];
  const productDesigner = require("../out/productDesigner.js");
  Module.prototype.require = originalRequire;
  return productDesigner;
}

test("getDefaultProductDesignerValues defaults harness to Codex and the provided workspace path", () => {
  const productDesigner = setupProductDesignerModule();
  const defaults = productDesigner.getDefaultProductDesignerValues("/tmp/project");

  assert.deepEqual(defaults, {
    agentHarness: "Codex",
    agentModel: "",
    agentIntelligence: "",
    projectDescriptionDir: "",
    meetingsRecordingsFolder: "",
    workspace: "/tmp/project",
    projectConfluence: "",
    agentScriptPath: ""
  });
});

test("getMissingProductDesignerFields returns only mandatory fields that are blank", () => {
  const productDesigner = setupProductDesignerModule();
  const missing = productDesigner.getMissingProductDesignerFields({
    agentHarness: "Codex",
    agentModel: "",
    agentIntelligence: "",
    projectDescriptionDir: "",
    meetingsRecordingsFolder: "",
    workspace: "",
    projectConfluence: "",
    agentScriptPath: ""
  });

  assert.deepEqual(missing, [
    "Project Description folder",
    "Project Workspace folder",
    "Agent Script Path"
  ]);
});

test("buildProductDesignerCommand includes required flags first and omits blank optional flags", () => {
  const productDesigner = setupProductDesignerModule();
  const command = productDesigner.buildProductDesignerCommand({
    agentHarness: "Codex",
    agentModel: "",
    agentIntelligence: "high",
    projectDescriptionDir: "/tmp/project-description",
    meetingsRecordingsFolder: "",
    workspace: "/tmp/workspace",
    projectConfluence: "https://confluence.example/doc",
    agentScriptPath: "/tmp/product-designer.sh"
  });

  assert.equal(
    command,
    [
      '"/tmp/product-designer.sh"',
      "--project-description-dir",
      '"/tmp/project-description"',
      "--workspace",
      '"/tmp/workspace"',
      "--harness",
      '"Codex"',
      "--project-confluence",
      '"https://confluence.example/doc"',
      "--intelligence",
      '"high"'
    ].join(" ")
  );
  assert.equal(command.includes("--model"), false);
  assert.equal(command.includes("--meetings-recordings-folder"), false);
});
