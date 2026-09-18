const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function createVscodeMock() {
  return {
    workspace: { getConfiguration: () => ({ get: () => undefined }) }
  };
}

function setupAdlcAgentsModule() {
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === "vscode") return createVscodeMock();
    return originalRequire.apply(this, arguments);
  };
  delete require.cache[require.resolve("../out/adlcAgents.js")];
  const moduleExports = require("../out/adlcAgents.js");
  Module.prototype.require = originalRequire;
  return moduleExports;
}

const FIXTURE_AGENT_MARKDOWN = `---
name: ba-agent
role: agent
description: Owns the WHAT of the project - translates product vision into concrete, testable requirements.
version: "2.0.1"
inputs:
  required:
    - name: approved_prd
      description: Approved product requirements and decisions.
      type: file
    - name: workflow_configuration
      description: Specifications approval-gate configuration.
      type: file
  optional:
    - name: existing_specifications
      description: Existing specifications to reconcile or update.
      type: directory
outputs:
  - name: feature_specifications
    description: Validated specifications for every in-scope feature.
    type: directory
---

# BA agent
`;

test("parseAdlcAgentFrontmatter extracts description and required/optional inputs", () => {
  const { parseAdlcAgentFrontmatter } = setupAdlcAgentsModule();
  const parsed = parseAdlcAgentFrontmatter(FIXTURE_AGENT_MARKDOWN);

  assert.equal(parsed.description, "Owns the WHAT of the project - translates product vision into concrete, testable requirements.");
  assert.deepEqual(parsed.inputs, [
    { name: "approved_prd", description: "Approved product requirements and decisions.", type: "file", required: true },
    { name: "workflow_configuration", description: "Specifications approval-gate configuration.", type: "file", required: true },
    { name: "existing_specifications", description: "Existing specifications to reconcile or update.", type: "directory", required: false }
  ]);
});

test("parseAdlcAgentFrontmatter tolerates agents without inputs or frontmatter", () => {
  const { parseAdlcAgentFrontmatter } = setupAdlcAgentsModule();
  assert.deepEqual(parseAdlcAgentFrontmatter("---\nname: product-agent\ndescription: Owns the WHY.\n---\n# Product"), {
    description: "Owns the WHY.",
    inputs: []
  });
  assert.deepEqual(parseAdlcAgentFrontmatter("# No frontmatter"), { description: "", inputs: [] });
});

test("buildAdlcHarnessCommand composes harness-specific model flags", () => {
  const { buildAdlcHarnessCommand } = setupAdlcAgentsModule();
  assert.equal(buildAdlcHarnessCommand("claude", ""), "claude");
  assert.equal(buildAdlcHarnessCommand("claude", "claude-sonnet-5"), "claude --model claude-sonnet-5");
  assert.equal(buildAdlcHarnessCommand("codex", "gpt-5-codex"), "codex -m gpt-5-codex");
  assert.equal(buildAdlcHarnessCommand("opencode", "ollama/qwen3-coder:30b"), "opencode run -m ollama/qwen3-coder:30b");
  assert.equal(buildAdlcHarnessCommand("gemini", "  gemini-2.5-pro  "), "gemini -m gemini-2.5-pro");
});

test("getAdlcInputBrowseKind maps declared input types to picker kinds", () => {
  const { getAdlcInputBrowseKind } = setupAdlcAgentsModule();
  assert.equal(getAdlcInputBrowseKind("file"), "file");
  assert.equal(getAdlcInputBrowseKind("directory"), "folder");
  assert.equal(getAdlcInputBrowseKind("file_or_directory"), "any");
  assert.equal(getAdlcInputBrowseKind("text_or_structured_data"), "any");
});

test("getMissingRequiredAdlcInputs reports only empty required inputs", () => {
  const { parseAdlcAgentFrontmatter, getMissingRequiredAdlcInputs } = setupAdlcAgentsModule();
  const definition = { ...parseAdlcAgentFrontmatter(FIXTURE_AGENT_MARKDOWN), id: "ba", label: "BA Agent", folder: "ba-agent", filePath: "" };
  assert.deepEqual(getMissingRequiredAdlcInputs(definition, { approved_prd: "docs/PRD.md" }), ["workflow_configuration"]);
  assert.deepEqual(
    getMissingRequiredAdlcInputs(definition, { approved_prd: "docs/PRD.md", workflow_configuration: "ADLC_workflow_settings.json" }),
    []
  );
});

test("buildAdlcAgentPrompt references the agent file, inputs, hint, and instructions", () => {
  const { parseAdlcAgentFrontmatter, buildAdlcAgentPrompt } = setupAdlcAgentsModule();
  const definition = {
    ...parseAdlcAgentFrontmatter(FIXTURE_AGENT_MARKDOWN),
    id: "architecture-review",
    label: "Architecture Review Agent",
    folder: "architect-agent",
    filePath: "",
    promptHint: "Operate in review mode."
  };
  const prompt = buildAdlcAgentPrompt(definition, {
    harness: "claude",
    model: "",
    inputs: { approved_prd: "docs/PRD.md", workflow_configuration: "ADLC_workflow_settings.json" },
    additionalInstructions: "Focus on the payments module."
  });

  assert.match(prompt, /`architect-agent` ADLC agent/);
  assert.match(prompt, /\.agents\/agents\/architect-agent\/architect-agent\.md/);
  assert.match(prompt, /Operate in review mode\./);
  assert.match(prompt, /- approved_prd \(required\): docs\/PRD\.md/);
  assert.match(prompt, /- existing_specifications \(optional\): not provided/);
  assert.match(prompt, /Focus on the payments module\./);
  assert.match(prompt, /approval gate/i);
});

test("catalog maps story labels to agent folders and detects deployed agents", () => {
  const { ADLC_AGENT_CATALOG, findAdlcAgentCatalogEntry, adlcAgentExists } = setupAdlcAgentsModule();

  assert.equal(ADLC_AGENT_CATALOG.length, 13);
  assert.equal(findAdlcAgentCatalogEntry("coding").folder, "developer-agent");
  assert.equal(findAdlcAgentCatalogEntry("architecture-review").folder, "architect-agent");
  assert.equal(findAdlcAgentCatalogEntry("documentation").folder, "documentation-agent");
  assert.equal(findAdlcAgentCatalogEntry("unknown"), undefined);

  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "adlc-agents-test-"));
  try {
    fs.mkdirSync(path.join(repoRoot, ".agents", "agents", "ba-agent"), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, ".agents", "agents", "ba-agent", "ba-agent.md"), FIXTURE_AGENT_MARKDOWN);

    assert.equal(adlcAgentExists(repoRoot, "ba-agent"), true);
    assert.equal(adlcAgentExists(repoRoot, "documentation-agent"), false);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("isAdlcAutoConfigInput and filterUserFacingAdlcInputs hide fixed-path settings/config inputs", () => {
  const { isAdlcAutoConfigInput, filterUserFacingAdlcInputs } = setupAdlcAgentsModule();

  assert.equal(isAdlcAutoConfigInput("workflow_configuration"), true);
  assert.equal(isAdlcAutoConfigInput("routing_registry"), true);
  assert.equal(isAdlcAutoConfigInput("approved_prd"), false);

  const inputs = [
    { name: "approved_prd", description: "", type: "file", required: true },
    { name: "workflow_configuration", description: "", type: "file", required: true },
    { name: "routing_registry", description: "", type: "file", required: true },
    { name: "existing_specifications", description: "", type: "directory", required: false }
  ];
  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs).map((input) => input.name),
    ["approved_prd", "existing_specifications"]
  );
});

test("loadAdlcAgentDefinition excludes workflow_configuration and routing_registry from user-facing inputs", () => {
  const { loadAdlcAgentDefinition } = setupAdlcAgentsModule();
  const orchestratorMarkdown = `---
name: sdlc-orchestrator
description: Entry-point orchestrator.
inputs:
  required:
    - name: request
      description: User intent, scope, constraints, and authorization.
      type: text_or_structured_data
    - name: routing_registry
      description: Canonical targets, triggers, paths, and handoffs.
      type: file
    - name: workflow_configuration
      description: Approval, validation, security, and automation settings.
      type: file
---
# SDLC orchestrator
`;
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "adlc-agents-test-"));
  try {
    fs.mkdirSync(path.join(repoRoot, ".agents", "agents", "sdlc-orchestrator"), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, ".agents", "agents", "sdlc-orchestrator", "sdlc-orchestrator.md"),
      orchestratorMarkdown
    );
    fs.writeFileSync(path.join(repoRoot, "ADLC_workflow_settings.json"), "{}");
    fs.writeFileSync(path.join(repoRoot, "routing-registry.yaml"), "targets: []\n");

    const definition = loadAdlcAgentDefinition(repoRoot, {
      id: "sdlc-orchestrator",
      label: "SDLC Orchestrator Agent",
      folder: "sdlc-orchestrator"
    });

    assert.deepEqual(definition.inputs.map((input) => input.name), ["request"]);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("renderAdlcAgentRunHtml renders harness, model, input fields, and actions", () => {
  const { parseAdlcAgentFrontmatter, renderAdlcAgentRunHtml } = setupAdlcAgentsModule();
  const definition = { ...parseAdlcAgentFrontmatter(FIXTURE_AGENT_MARKDOWN), id: "ba", label: "BA Agent", folder: "ba-agent", filePath: "" };
  const html = renderAdlcAgentRunHtml({ cspSource: "vscode-resource:" }, definition, {
    defaultHarness: "codex",
    defaultModel: "gpt-5-codex"
  });

  assert.match(html, /<option value="codex" selected>/);
  assert.match(html, /id="model-input"[^>]*value="gpt-5-codex"/);
  assert.match(html, /data-input-name="approved_prd" data-required="true"/);
  assert.match(html, /data-browse="existing_specifications" data-kind="folder"/);
  assert.match(html, /id="cancel-button"/);
  assert.match(html, /<button type="submit">Execute<\/button>/);
  assert.match(html, /type: "adlcAgentExecute"/);
});
