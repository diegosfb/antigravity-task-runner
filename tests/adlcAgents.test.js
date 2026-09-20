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
    - name: supporting_evidence
      description: Reviewed research, meeting analysis, and project context.
      type: file_or_directory
    - name: existing_specifications
      description: Existing specifications to reconcile or update.
      type: directory
    - name: alternative_input_contract
      description: Developed conversation and verified repository evidence for explicit to-spec runs.
      type: text_or_files
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
    { name: "supporting_evidence", description: "Reviewed research, meeting analysis, and project context.", type: "file_or_directory", required: false },
    { name: "existing_specifications", description: "Existing specifications to reconcile or update.", type: "directory", required: false },
    { name: "alternative_input_contract", description: "Developed conversation and verified repository evidence for explicit to-spec runs.", type: "text_or_files", required: false }
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

test("detectArchitectArchitectureMode detects expansion only when architecture and ADR outputs both exist", () => {
  const { detectArchitectArchitectureMode } = setupAdlcAgentsModule();
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "architect-mode-test-"));
  try {
    assert.equal(detectArchitectArchitectureMode(repoRoot).mode, "new_architecture");

    fs.mkdirSync(path.join(repoRoot, "docs", "architecture"), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, "docs", "architecture", "architecture.md"), "# Architecture\n");
    assert.equal(detectArchitectArchitectureMode(repoRoot).mode, "new_architecture");

    fs.mkdirSync(path.join(repoRoot, "docs", "architecture", "adrs"), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, "docs", "architecture", "adrs", "0001-platform.md"), "# ADR\n");
    assert.equal(detectArchitectArchitectureMode(repoRoot).mode, "existing_architecture_expansion");
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
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

test("getMissingRequiredAdlcInputs requires the Architect specification directory or file", () => {
  const { getMissingRequiredAdlcInputs } = setupAdlcAgentsModule();
  const definition = {
    id: "architect",
    label: "Architect Agent",
    folder: "architect-agent",
    filePath: "",
    description: "",
    inputs: [{ name: "specification_source", description: "", type: "file_or_directory", required: true }]
  };

  assert.deepEqual(getMissingRequiredAdlcInputs(definition, {}), ["specification_source"]);
  assert.deepEqual(getMissingRequiredAdlcInputs(definition, { specification_source: "docs/specs" }), []);
});

test("getMissingRequiredAdlcInputs requires either a backlog or a user story/specification for Create Tests", () => {
  const { getMissingRequiredAdlcInputs } = setupAdlcAgentsModule();
  const definition = {
    id: "test",
    label: "Create Tests Agent",
    folder: "test-agent",
    filePath: "",
    description: "",
    inputs: [
      { name: "backlog", description: "", type: "directory", required: false },
      { name: "user_story_or_specification", description: "", type: "file_or_directory", required: false }
    ]
  };

  assert.deepEqual(getMissingRequiredAdlcInputs(definition, {}), ["backlog or user_story_or_specification"]);
  assert.deepEqual(getMissingRequiredAdlcInputs(definition, { backlog: "docs/backlog" }), []);
  assert.deepEqual(
    getMissingRequiredAdlcInputs(definition, { user_story_or_specification: "docs/specs/login.md" }),
    []
  );
});

test("getMissingRequiredAdlcInputs requires either a backlog or a user story/specification for Coding", () => {
  const { getMissingRequiredAdlcInputs } = setupAdlcAgentsModule();
  const definition = {
    id: "coding",
    label: "Coding Agent",
    folder: "developer-agent",
    filePath: "",
    description: "",
    inputs: [
      { name: "backlog_item", description: "", type: "file_or_structured_data", required: false },
      { name: "user_story_or_specification", description: "", type: "file_or_directory", required: false }
    ]
  };

  assert.deepEqual(getMissingRequiredAdlcInputs(definition, {}), ["backlog_item or user_story_or_specification"]);
  assert.deepEqual(getMissingRequiredAdlcInputs(definition, { backlog_item: "docs/backlog" }), []);
  assert.deepEqual(
    getMissingRequiredAdlcInputs(definition, { user_story_or_specification: "docs/specs/login.md" }),
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

test("buildAdlcAgentPrompt lists the Product Agent's canonical required and optional inputs", () => {
  const { buildAdlcAgentPrompt } = setupAdlcAgentsModule();
  const definition = {
    id: "product",
    label: "Product Agent",
    folder: "product-agent",
    filePath: "",
    description: "",
    inputs: [
      {
        name: "product_definition_source",
        description: "Product definition directory or file.",
        type: "file_or_directory",
        required: true,
        defaultValue: "docs/product-definition"
      },
      {
        name: "supporting_evidence",
        description: "Supporting product evidence.",
        type: "file_or_directory",
        required: false
      }
    ]
  };
  const prompt = buildAdlcAgentPrompt(definition, {
    harness: "claude",
    model: "",
    inputs: { product_definition_source: "docs/product-definition", supporting_evidence: "" },
    additionalInstructions: ""
  });

  assert.match(prompt, /- product_definition_source \(required\): docs\/product-definition/);
  assert.match(prompt, /- supporting_evidence \(optional\): not provided/);
});

test("buildAdlcAgentPrompt ignores Create Tests backlog when a user story or specification is provided", () => {
  const { buildAdlcAgentPrompt, getAdlcAgentSyntheticInputs } = setupAdlcAgentsModule();
  const definition = {
    id: "test",
    label: "Create Tests Agent",
    folder: "test-agent",
    filePath: "",
    description: "",
    inputs: getAdlcAgentSyntheticInputs("test")
  };

  const targetedPrompt = buildAdlcAgentPrompt(definition, {
    harness: "claude",
    model: "",
    inputs: { backlog: "docs/backlog", user_story_or_specification: "docs/specs/login.md" },
    additionalInstructions: ""
  });
  assert.doesNotMatch(targetedPrompt, /- backlog \(optional\):/);
  assert.match(
    targetedPrompt,
    /- user_story_or_specification \(optional\): docs\/specs\/login\.md/
  );

  const backlogPrompt = buildAdlcAgentPrompt(definition, {
    harness: "claude",
    model: "",
    inputs: { backlog: "docs/backlog", user_story_or_specification: "" },
    additionalInstructions: ""
  });
  assert.match(backlogPrompt, /- backlog \(optional\): docs\/backlog/);
});

test("buildAdlcAgentPrompt ignores Coding backlog when a user story or specification is provided", () => {
  const { buildAdlcAgentPrompt } = setupAdlcAgentsModule();
  const definition = {
    id: "coding",
    label: "Coding Agent",
    folder: "developer-agent",
    filePath: "",
    description: "",
    inputs: [
      { name: "backlog_item", description: "", type: "file_or_structured_data", required: false },
      { name: "user_story_or_specification", description: "", type: "file_or_directory", required: false }
    ]
  };

  const targetedPrompt = buildAdlcAgentPrompt(definition, {
    harness: "claude",
    model: "",
    inputs: { backlog_item: "docs/backlog", user_story_or_specification: "docs/specs/login.md" },
    additionalInstructions: ""
  });
  assert.doesNotMatch(targetedPrompt, /- backlog_item \(optional\):/);
  assert.match(
    targetedPrompt,
    /- user_story_or_specification \(optional\): docs\/specs\/login\.md/
  );

  const backlogPrompt = buildAdlcAgentPrompt(definition, {
    harness: "claude",
    model: "",
    inputs: { backlog_item: "docs/backlog", user_story_or_specification: "" },
    additionalInstructions: ""
  });
  assert.match(backlogPrompt, /- backlog_item \(optional\): docs\/backlog/);
});

test("buildAdlcAgentPrompt includes the internally detected Architect mode", () => {
  const { buildAdlcAgentPrompt } = setupAdlcAgentsModule();
  const prompt = buildAdlcAgentPrompt(
    {
      id: "architect",
      label: "Architect Agent",
      folder: "architect-agent",
      filePath: "",
      description: "",
      architectureMode: "existing_architecture_expansion",
      inputs: [{ name: "specification_source", description: "", type: "file_or_directory", required: true }]
    },
    {
      harness: "codex",
      model: "",
      inputs: { specification_source: "docs/specs/feature.md" },
      additionalInstructions: ""
    }
  );

  assert.match(prompt, /Internally detected architecture mode: `existing_architecture_expansion`/);
  assert.doesNotMatch(prompt, /architecture_mode \(required\)/);
});

test("getAdlcAgentSyntheticInputs returns only agents whose canonical contract needs replacement fields", () => {
  const { getAdlcAgentSyntheticInputs } = setupAdlcAgentsModule();

  assert.deepEqual(getAdlcAgentSyntheticInputs("product"), []);

  const testInputs = getAdlcAgentSyntheticInputs("test");
  assert.deepEqual(testInputs.map((i) => i.name), ["backlog", "user_story_or_specification"]);
  const backlog = testInputs.find((i) => i.name === "backlog");
  assert.equal(backlog.label, "Backlog");
  assert.equal(backlog.description, "The backlog contains user stories sequenced by dependencies.");
  assert.equal(backlog.type, "directory");
  assert.equal(backlog.required, false);
  assert.equal(backlog.defaultValue, "docs/backlog");
  const targetedSource = testInputs.find((i) => i.name === "user_story_or_specification");
  assert.equal(targetedSource.label, "User Story or Specification");
  assert.equal(targetedSource.type, "file_or_directory");
  assert.equal(targetedSource.required, false);

  assert.deepEqual(getAdlcAgentSyntheticInputs("ba"), []);
});

test("loadAdlcAgentDefinition exposes the Product Agent's canonical inputs in display order", () => {
  const { loadAdlcAgentDefinition } = setupAdlcAgentsModule();
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "adlc-agents-test-"));
  try {
    fs.mkdirSync(path.join(repoRoot, ".agents", "agents", "product-agent"), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, ".agents", "agents", "product-agent", "product-agent.md"),
      `---
name: product-agent
description: Owns the WHY.
inputs:
  required:
    - name: product_definition_source
      description: Product definition directory or file.
      type: file_or_directory
  optional:
    - name: supporting_evidence
      description: Supporting product evidence.
      type: file_or_directory
---
# Product
`
    );

    const definition = loadAdlcAgentDefinition(repoRoot, { id: "product", label: "Product Agent", folder: "product-agent" });

    assert.deepEqual(definition.inputs.map((i) => i.name), ["product_definition_source", "supporting_evidence"]);
    const productDefinitionSource = definition.inputs[0];
    assert.equal(productDefinitionSource.defaultValue, "docs/product-definition");
    assert.equal(productDefinitionSource.required, true);
    assert.equal(productDefinitionSource.type, "file_or_directory");
    assert.equal(productDefinitionSource.label, "Product Definition");
    assert.equal(definition.inputs[1].label, "Supporting Evidence");
    assert.match(definition.diagramHtml, /Product Definition/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("getAdlcAgentDiagramHtml returns diagrams for every customized agent, and undefined for other agents", () => {
  const { getAdlcAgentDiagramHtml } = setupAdlcAgentsModule();
  assert.match(getAdlcAgentDiagramHtml("product"), /class="diagram diagram-product"/);
  assert.match(getAdlcAgentDiagramHtml("product"), /diagram-box diagram-box-required">Product Definition/);
  assert.match(getAdlcAgentDiagramHtml("product"), /diagram-box diagram-box-optional">Supporting Evidence/);
  assert.match(getAdlcAgentDiagramHtml("product"), /Product Agent/);
  assert.match(getAdlcAgentDiagramHtml("product"), /diagram-box diagram-box-output">PRD/);

  assert.match(getAdlcAgentDiagramHtml("ba"), /class="diagram diagram-ba"/);
  assert.match(getAdlcAgentDiagramHtml("ba"), /diagram-box diagram-box-required">Approved PRD/);
  assert.match(getAdlcAgentDiagramHtml("ba"), /diagram-box diagram-box-optional">Existing Specifications/);
  assert.match(getAdlcAgentDiagramHtml("ba"), /diagram-box diagram-box-optional">Supporting Evidence/);
  assert.ok(
    getAdlcAgentDiagramHtml("ba").indexOf("Approved PRD") <
      getAdlcAgentDiagramHtml("ba").indexOf("Existing Specifications")
  );
  assert.ok(
    getAdlcAgentDiagramHtml("ba").indexOf("Existing Specifications") <
      getAdlcAgentDiagramHtml("ba").indexOf("Supporting Evidence")
  );
  assert.match(getAdlcAgentDiagramHtml("ba"), /BA Agent/);
  assert.match(getAdlcAgentDiagramHtml("ba"), /diagram-box diagram-box-output">Specifications/);

  assert.match(getAdlcAgentDiagramHtml("ux"), /class="diagram diagram-ux"/);
  assert.match(getAdlcAgentDiagramHtml("ux"), /diagram-box diagram-box-required">Specifications Directory/);
  assert.match(getAdlcAgentDiagramHtml("ux"), /diagram-box diagram-box-optional">Architecture Package/);
  assert.match(getAdlcAgentDiagramHtml("ux"), /diagram-box diagram-box-optional">Research and Evidence/);
  assert.match(getAdlcAgentDiagramHtml("ux"), /diagram-box diagram-box-optional">Existing Experience System/);
  assert.match(getAdlcAgentDiagramHtml("ux"), /UX Agent/);
  assert.match(getAdlcAgentDiagramHtml("ux"), /diagram-group diagram-group-output/);
  assert.match(getAdlcAgentDiagramHtml("ux"), /diagram-group-label">Design Package/);
  assert.match(getAdlcAgentDiagramHtml("ux"), /diagram-box diagram-box-output">Design Document/);
  assert.match(getAdlcAgentDiagramHtml("ux"), /diagram-box diagram-box-output">Wireframes/);
  assert.match(getAdlcAgentDiagramHtml("ux"), /diagram-box diagram-box-output">Specs Updated with UX Design/);
  assert.doesNotMatch(getAdlcAgentDiagramHtml("ux"), /Experience Disposition/);

  assert.match(getAdlcAgentDiagramHtml("architect"), /class="diagram diagram-architect"/);
  assert.match(getAdlcAgentDiagramHtml("architect"), /diagram-group-label">Inputs/);
  assert.match(getAdlcAgentDiagramHtml("architect"), /Specification Directory or File/);
  assert.match(getAdlcAgentDiagramHtml("architect"), /PRD/);
  assert.match(getAdlcAgentDiagramHtml("architect"), /Architecture Guidelines/);
  assert.match(getAdlcAgentDiagramHtml("architect"), /Existing Architecture Folder/);
  assert.doesNotMatch(getAdlcAgentDiagramHtml("architect"), /New Architecture/);
  assert.doesNotMatch(getAdlcAgentDiagramHtml("architect"), /Existing Architecture Expansion/);
  assert.doesNotMatch(getAdlcAgentDiagramHtml("architect"), /Development Guidelines/);
  assert.doesNotMatch(getAdlcAgentDiagramHtml("architect"), /Automatic Configuration/);
  assert.doesNotMatch(getAdlcAgentDiagramHtml("architect"), /Project-root ADLC_workflow_settings\.json/);
  assert.doesNotMatch(getAdlcAgentDiagramHtml("architect"), /Defaults if missing/);
  assert.match(
    getAdlcAgentDiagramHtml("architect"),
    /diagram-box diagram-box-required">Specification Directory or File/
  );
  assert.match(
    getAdlcAgentDiagramHtml("architect"),
    /diagram-box diagram-box-optional">Existing Architecture Folder/
  );
  assert.ok(
    getAdlcAgentDiagramHtml("architect").indexOf("Specification Directory or File") <
      getAdlcAgentDiagramHtml("architect").indexOf("Existing Architecture Folder")
  );
  assert.match(getAdlcAgentDiagramHtml("architect"), /diagram-box diagram-box-optional">PRD/);
  assert.match(getAdlcAgentDiagramHtml("architect"), /diagram-box diagram-box-optional">Architecture Guidelines/);
  assert.match(getAdlcAgentDiagramHtml("architect"), /Architect Agent/);
  assert.match(getAdlcAgentDiagramHtml("architect"), /class="diagram-group diagram-group-output"/);
  assert.match(getAdlcAgentDiagramHtml("architect"), /diagram-group-label">Architecture Folder/);
  assert.match(getAdlcAgentDiagramHtml("architect"), /diagram-box diagram-box-output">Architecture Document/);
  assert.match(getAdlcAgentDiagramHtml("architect"), /diagram-box diagram-box-output">ADRs/);
  assert.ok(
    getAdlcAgentDiagramHtml("architect").indexOf("Architecture Document") <
      getAdlcAgentDiagramHtml("architect").indexOf("ADRs")
  );

  assert.match(getAdlcAgentDiagramHtml("architecture-review"), /class="diagram diagram-architecture-review"/);
  assert.match(getAdlcAgentDiagramHtml("architecture-review"), /diagram-box diagram-box-required">Existing Architecture Folder/);
  assert.match(getAdlcAgentDiagramHtml("architecture-review"), /diagram-box diagram-box-required">Specification Directory or File/);
  assert.match(getAdlcAgentDiagramHtml("architecture-review"), /diagram-box diagram-box-optional">PRD/);
  assert.match(getAdlcAgentDiagramHtml("architecture-review"), /diagram-box diagram-box-optional">Architecture Guidelines/);
  assert.match(getAdlcAgentDiagramHtml("architecture-review"), /Architecture Review Agent/);
  assert.match(getAdlcAgentDiagramHtml("architecture-review"), /diagram-box diagram-box-output">Review Findings/);
  assert.ok(
    getAdlcAgentDiagramHtml("architecture-review").indexOf("Existing Architecture Folder") <
      getAdlcAgentDiagramHtml("architecture-review").indexOf("Specification Directory or File")
  );

  assert.match(getAdlcAgentDiagramHtml("project-planner"), /class="diagram diagram-project-planner"/);
  assert.match(getAdlcAgentDiagramHtml("project-planner"), /diagram-box diagram-box-required">Specifications Directory/);
  assert.match(getAdlcAgentDiagramHtml("project-planner"), /diagram-box diagram-box-required">Architecture Folder/);
  assert.match(getAdlcAgentDiagramHtml("project-planner"), /diagram-box diagram-box-optional">Design Package/);
  assert.match(getAdlcAgentDiagramHtml("project-planner"), /diagram-box diagram-box-optional">Existing Backlog/);
  assert.match(getAdlcAgentDiagramHtml("project-planner"), /Project Planner Agent/);
  assert.match(getAdlcAgentDiagramHtml("project-planner"), /diagram-box diagram-box-output">Backlog/);

  assert.match(getAdlcAgentDiagramHtml("test"), /class="diagram diagram-test"/);
  assert.match(getAdlcAgentDiagramHtml("test"), /diagram-box diagram-box-optional">Backlog/);
  assert.match(getAdlcAgentDiagramHtml("test"), /diagram-box diagram-box-optional">User Story or Specification/);
  assert.match(getAdlcAgentDiagramHtml("test"), /Create Tests Agent/);
  assert.match(getAdlcAgentDiagramHtml("test"), /diagram-group diagram-group-output/);
  assert.match(getAdlcAgentDiagramHtml("test"), /diagram-group-label">src/);
  assert.match(getAdlcAgentDiagramHtml("test"), /diagram-box diagram-box-output">Tests/);
  assert.doesNotMatch(getAdlcAgentDiagramHtml("test"), /Test Suite/);

  assert.match(getAdlcAgentDiagramHtml("coding"), /diagram-box diagram-box-optional">Backlog/);
  assert.match(getAdlcAgentDiagramHtml("coding"), /diagram-box diagram-box-optional">User Story or Specification/);
  assert.match(getAdlcAgentDiagramHtml("coding"), /diagram-group-label">Inputs \(one required\)/);
  assert.doesNotMatch(getAdlcAgentDiagramHtml("coding"), /src Tests/);
  assert.match(getAdlcAgentDiagramHtml("coding"), /Coding Agent/);
  assert.match(getAdlcAgentDiagramHtml("coding"), /diagram-group diagram-group-output/);
  assert.match(getAdlcAgentDiagramHtml("coding"), /diagram-group-label">src/);
  assert.match(
    getAdlcAgentDiagramHtml("coding"),
    /diagram-group-boxes">\s*<div class="diagram-box diagram-box-output">Source Code<\/div>\s*<div class="diagram-box diagram-box-output">Pull Request<\/div>\s*<\/div>\s*<\/div>/
  );
  assert.ok(
    getAdlcAgentDiagramHtml("coding").indexOf("Backlog") <
      getAdlcAgentDiagramHtml("coding").indexOf("User Story or Specification")
  );

  assert.match(getAdlcAgentDiagramHtml("code-review"), /class="diagram diagram-code-review"/);
  assert.match(getAdlcAgentDiagramHtml("code-review"), /diagram-box diagram-box-required">Pull Request/);
  assert.match(getAdlcAgentDiagramHtml("code-review"), /Code Review Agent/);
  assert.match(getAdlcAgentDiagramHtml("code-review"), /diagram-box diagram-box-output">PR Merge/);

  assert.match(getAdlcAgentDiagramHtml("deployment"), /class="diagram diagram-deployment"/);
  assert.match(getAdlcAgentDiagramHtml("deployment"), /diagram-box diagram-box-required">Approved Merged PR/);
  assert.match(getAdlcAgentDiagramHtml("deployment"), /diagram-box diagram-box-required">Release Configuration/);
  assert.match(getAdlcAgentDiagramHtml("deployment"), /diagram-box diagram-box-optional">Pre-Deployment Script/);
  assert.match(getAdlcAgentDiagramHtml("deployment"), /diagram-box diagram-box-optional">Post-Deployment Script/);
  assert.match(getAdlcAgentDiagramHtml("deployment"), /diagram-box diagram-box-optional">Prior Release State/);
  assert.match(getAdlcAgentDiagramHtml("deployment"), /diagram-box diagram-box-optional">Pre-Release Evidence/);
  assert.match(getAdlcAgentDiagramHtml("deployment"), /Deployment Agent/);
  assert.match(getAdlcAgentDiagramHtml("deployment"), /diagram-group-label">Outputs/);
  assert.match(getAdlcAgentDiagramHtml("deployment"), /diagram-box diagram-box-output">Live Release/);
  assert.match(getAdlcAgentDiagramHtml("deployment"), /diagram-box diagram-box-output">Deployment Record/);
  assert.match(getAdlcAgentDiagramHtml("deployment"), /diagram-box diagram-box-output">Rollback Artifact/);
  assert.match(getAdlcAgentDiagramHtml("deployment"), /diagram-box diagram-box-output">Post-Deploy Evidence/);

  assert.match(getAdlcAgentDiagramHtml("sdlc-orchestrator"), /class="diagram diagram-sdlc-orchestrator"/);
  assert.match(
    getAdlcAgentDiagramHtml("sdlc-orchestrator"),
    /diagram-box diagram-box-required">User Request/
  );
  assert.match(getAdlcAgentDiagramHtml("sdlc-orchestrator"), /SDLC Orchestrator Agent/);
  assert.match(
    getAdlcAgentDiagramHtml("sdlc-orchestrator"),
    /diagram-box diagram-box-output">Delegation to Appropriate Agent\(s\)/
  );

  assert.equal(getAdlcAgentDiagramHtml("documentation"), undefined);
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

test("applyAdlcAgentInputDefaults prefills known BA Agent conventions and leaves other agents/inputs untouched", () => {
  const { applyAdlcAgentInputDefaults } = setupAdlcAgentsModule();
  const inputs = [
    { name: "approved_prd", description: "", type: "file", required: true },
    { name: "existing_specifications", description: "", type: "directory", required: false },
    { name: "supporting_evidence", description: "", type: "file_or_directory", required: false }
  ];

  const withDefaults = applyAdlcAgentInputDefaults("ba", inputs);
  assert.equal(withDefaults.find((i) => i.name === "approved_prd").defaultValue, "docs/project_description/PRD.md");
  assert.equal(withDefaults.find((i) => i.name === "existing_specifications").defaultValue, "docs/specs");
  assert.equal(withDefaults.find((i) => i.name === "supporting_evidence").defaultValue, undefined);

  const withoutDefaults = applyAdlcAgentInputDefaults("architect", inputs);
  assert.deepEqual(withoutDefaults, inputs);
});

test("applyAdlcAgentInputDefaults prefills UX Agent's approved_product_context and architecture_package", () => {
  const { applyAdlcAgentInputDefaults } = setupAdlcAgentsModule();
  const inputs = [
    { name: "approved_product_context", description: "", type: "files", required: true },
    { name: "architecture_package", description: "", type: "files_or_directory", required: true },
    { name: "research_and_evidence", description: "", type: "files_or_structured_data", required: false }
  ];

  const withDefaults = applyAdlcAgentInputDefaults("ux", inputs);
  assert.equal(withDefaults.find((i) => i.name === "approved_product_context").defaultValue, "docs/specs");
  assert.equal(withDefaults.find((i) => i.name === "architecture_package").defaultValue, "docs/architecture");
  assert.equal(withDefaults.find((i) => i.name === "research_and_evidence").defaultValue, undefined);
});

test("applyAdlcAgentInputDefaults prefills Architect Agent's conventional input paths", () => {
  const { applyAdlcAgentInputDefaults } = setupAdlcAgentsModule();
  const inputs = [
    { name: "specification_source", description: "", type: "file_or_directory", required: true },
    { name: "existing_architecture_package", description: "", type: "directory_or_files", required: false },
    { name: "prd_file", description: "", type: "file", required: false },
    { name: "architecture_guidelines", description: "", type: "file", required: false }
  ];

  const withDefaults = applyAdlcAgentInputDefaults("architect", inputs);
  assert.equal(withDefaults.find((i) => i.name === "specification_source").defaultValue, "docs/specs");
  assert.equal(withDefaults.find((i) => i.name === "existing_architecture_package").defaultValue, "docs/architecture");
  assert.equal(withDefaults.find((i) => i.name === "prd_file").defaultValue, "docs/project_description/PRD.md");
  assert.equal(withDefaults.find((i) => i.name === "architecture_guidelines").defaultValue, undefined);
});

test("applyAdlcAgentInputDefaults prefills Project Planner Agent's specifications, architecture, design package, and backlog", () => {
  const { applyAdlcAgentInputDefaults } = setupAdlcAgentsModule();
  const inputs = [
    { name: "requirements_stream", description: "", type: "files_or_structured_data", required: true },
    { name: "technical_stream", description: "", type: "files_or_structured_data", required: true },
    { name: "design_package", description: "", type: "directory", required: false },
    { name: "existing_backlog", description: "", type: "files_or_structured_data", required: false }
  ];

  const withDefaults = applyAdlcAgentInputDefaults("project-planner", inputs);
  assert.equal(withDefaults.find((i) => i.name === "requirements_stream").defaultValue, "docs/specs");
  assert.equal(withDefaults.find((i) => i.name === "technical_stream").defaultValue, "docs/architecture");
  assert.equal(withDefaults.find((i) => i.name === "design_package").defaultValue, "docs/design");
  assert.equal(withDefaults.find((i) => i.name === "existing_backlog").defaultValue, "docs/backlog");
});

test("applyAdlcAgentInputDefaults prefills Coding Agent's backlog_item", () => {
  const { applyAdlcAgentInputDefaults } = setupAdlcAgentsModule();
  const inputs = [
    { name: "backlog_item", description: "", type: "file_or_structured_data", required: true },
    { name: "repository_state", description: "", type: "repository_state", required: true }
  ];

  const withDefaults = applyAdlcAgentInputDefaults("coding", inputs);
  assert.equal(withDefaults.find((i) => i.name === "backlog_item").defaultValue, "docs/backlog");
  assert.equal(withDefaults.find((i) => i.name === "repository_state").defaultValue, undefined);
});

test("applyAdlcAgentInputLabelOverrides labels Coding Agent's backlog_item as Backlog", () => {
  const { applyAdlcAgentInputLabelOverrides } = setupAdlcAgentsModule();
  const inputs = [
    { name: "backlog_item", description: "", type: "file_or_structured_data", required: true },
    { name: "repository_state", description: "", type: "repository_state", required: true }
  ];

  const overridden = applyAdlcAgentInputLabelOverrides("coding", inputs);
  assert.equal(overridden.find((i) => i.name === "backlog_item").label, "Backlog");
  assert.equal(overridden.find((i) => i.name === "repository_state").label, undefined);
});

test("filterUserFacingAdlcInputs hides Coding Agent's repository_state and feedback_context, and only for coding", () => {
  const { isAdlcAgentHiddenInput, filterUserFacingAdlcInputs } = setupAdlcAgentsModule();
  const inputs = [
    { name: "backlog_item", description: "", type: "file_or_structured_data", required: true },
    { name: "repository_state", description: "", type: "repository_state", required: true },
    { name: "feedback_context", description: "", type: "structured_data", required: false }
  ];

  assert.equal(isAdlcAgentHiddenInput("coding", "repository_state"), true);
  assert.equal(isAdlcAgentHiddenInput("coding", "feedback_context"), true);
  assert.equal(isAdlcAgentHiddenInput("coding", "backlog_item"), false);
  assert.equal(isAdlcAgentHiddenInput("ux", "repository_state"), false);

  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "coding").map((input) => input.name),
    ["backlog_item"]
  );
  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "ux").map((input) => input.name),
    inputs.map((input) => input.name)
  );
});

test("filterUserFacingAdlcInputs exposes Code Review Agent's PR and hides its implicit context", () => {
  const { isAdlcAgentHiddenInput, filterUserFacingAdlcInputs } = setupAdlcAgentsModule();
  const inputs = [
    { name: "review_candidate", description: "", type: "repository_state", required: true },
    { name: "verification_evidence", description: "", type: "structured_data", required: true },
    { name: "governing_contracts", description: "", type: "files_or_structured_data", required: true },
    { name: "prior_review_context", description: "", type: "structured_data", required: false }
  ];

  assert.equal(isAdlcAgentHiddenInput("code-review", "review_candidate"), false);
  for (const input of inputs.slice(1)) {
    assert.equal(isAdlcAgentHiddenInput("code-review", input.name), true, `${input.name} should be hidden for code-review`);
  }
  assert.equal(isAdlcAgentHiddenInput("ux", "review_candidate"), false);

  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "code-review").map((input) => input.name),
    ["review_candidate"]
  );
  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "ux").map((input) => input.name),
    inputs.map((input) => input.name)
  );
});

test("loadAdlcAgentDefinition exposes Code Review Agent's required Pull Request", () => {
  const { loadAdlcAgentDefinition } = setupAdlcAgentsModule();
  const codeReviewAgentMarkdown = `---
name: code-review-agent
description: The quality gate.
inputs:
  required:
    - name: review_candidate
      description: Tested branch or pull request and complete diff.
      type: repository_state
    - name: verification_evidence
      description: Test PASS and required validation results.
      type: structured_data
    - name: governing_contracts
      description: Backlog scope, specifications, acceptance criteria, ADRs, and design constraints.
      type: files_or_structured_data
    - name: workflow_configuration
      description: Pull-request merge gate and repository workflow configuration.
      type: file
  optional:
    - name: prior_review_context
      description: Earlier findings, responses, and tracked defect references.
      type: structured_data
---
# Code review agent
`;
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "adlc-agents-test-"));
  try {
    fs.mkdirSync(path.join(repoRoot, ".agents", "agents", "code-review-agent"), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, ".agents", "agents", "code-review-agent", "code-review-agent.md"),
      codeReviewAgentMarkdown
    );

    const definition = loadAdlcAgentDefinition(repoRoot, {
      id: "code-review",
      label: "Code Review Agent",
      folder: "code-review-agent"
    });

    assert.deepEqual(definition.inputs.map((input) => input.name), ["review_candidate"]);
    assert.equal(definition.inputs[0].label, "Pull Request");
    assert.equal(definition.inputs[0].required, true);
    assert.match(definition.diagramHtml, /diagram-box diagram-box-required">Pull Request/);
    assert.match(definition.diagramHtml, /Code Review Agent/);
    assert.match(definition.diagramHtml, /diagram-box diagram-box-output">PR Merge/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("loadAdlcAgentDefinition exposes alternative Coding scopes and hides implicit repository context", () => {
  const { loadAdlcAgentDefinition } = setupAdlcAgentsModule();
  const developerAgentMarkdown = `---
name: developer-agent
description: The orchestrator of implementation.
inputs:
  required:
    - name: repository_state
      description: Current codebase, task branch, and existing delivery state.
      type: repository_state
    - name: workflow_configuration
      description: Plan, Git, security, judge, and PR gate configuration.
      type: file
  optional:
    - name: backlog_item
      description: Approved item and complete requirements traceability.
      type: file_or_structured_data
    - name: user_story_or_specification
      description: A single user story or specification to implement instead of the backlog.
      type: file_or_directory
    - name: feedback_context
      description: Test, security, specification, or review findings for a revision.
      type: structured_data
---
# Developer agent
`;
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "adlc-agents-test-"));
  try {
    fs.mkdirSync(path.join(repoRoot, ".agents", "agents", "developer-agent"), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, ".agents", "agents", "developer-agent", "developer-agent.md"),
      developerAgentMarkdown
    );

    const definition = loadAdlcAgentDefinition(repoRoot, { id: "coding", label: "Coding Agent", folder: "developer-agent" });

    assert.deepEqual(definition.inputs.map((i) => i.name), ["backlog_item", "user_story_or_specification"]);
    const backlogItem = definition.inputs[0];
    assert.equal(backlogItem.label, "Backlog");
    assert.equal(backlogItem.defaultValue, "docs/backlog");
    assert.equal(backlogItem.required, false);
    const targetedSource = definition.inputs[1];
    assert.equal(targetedSource.label, "User Story or Specification");
    assert.equal(targetedSource.required, false);

    assert.match(definition.diagramHtml, /Coding Agent/);
    assert.match(definition.diagramHtml, /diagram-group-label">src/);
    assert.match(
      definition.diagramHtml,
      /diagram-group-boxes">\s*<div class="diagram-box diagram-box-output">Source Code<\/div>\s*<div class="diagram-box diagram-box-output">Pull Request<\/div>\s*<\/div>\s*<\/div>/
    );
    assert.doesNotMatch(definition.diagramHtml, /src Tests/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("applyAdlcAgentInputLabelOverrides labels all visible Project Planner Agent inputs", () => {
  const { applyAdlcAgentInputLabelOverrides } = setupAdlcAgentsModule();
  const inputs = [
    { name: "requirements_stream", description: "", type: "files_or_structured_data", required: true },
    { name: "technical_stream", description: "", type: "files_or_structured_data", required: true },
    { name: "design_package", description: "", type: "directory", required: false },
    { name: "existing_backlog", description: "", type: "files_or_structured_data", required: false }
  ];

  const overridden = applyAdlcAgentInputLabelOverrides("project-planner", inputs);
  assert.equal(overridden.find((i) => i.name === "requirements_stream").label, "Specifications Directory");
  assert.equal(overridden.find((i) => i.name === "technical_stream").label, "Architecture Folder");
  assert.equal(overridden.find((i) => i.name === "design_package").label, "Design Package");
  assert.equal(overridden.find((i) => i.name === "existing_backlog").label, "Existing Backlog");
});

test("applyAdlcAgentInputDefaults prefills Architecture Review Agent's modern Architect inputs", () => {
  const { applyAdlcAgentInputDefaults } = setupAdlcAgentsModule();
  const inputs = [
    { name: "specification_source", description: "", type: "file_or_directory", required: true },
    { name: "existing_architecture_package", description: "", type: "directory", required: false },
    { name: "prd_file", description: "", type: "file", required: false },
    { name: "architecture_guidelines", description: "", type: "file", required: false }
  ];

  const withDefaults = applyAdlcAgentInputDefaults("architecture-review", inputs);
  assert.equal(withDefaults.find((i) => i.name === "specification_source").defaultValue, "docs/specs");
  assert.equal(
    withDefaults.find((i) => i.name === "existing_architecture_package").defaultValue,
    "docs/architecture"
  );
  assert.equal(withDefaults.find((i) => i.name === "prd_file").defaultValue, "docs/project_description/PRD.md");
});

test("applyAdlcAgentInputRequiredOverrides relaxes UX Agent's architecture_package to optional, others untouched", () => {
  const { applyAdlcAgentInputRequiredOverrides } = setupAdlcAgentsModule();
  const inputs = [
    { name: "approved_product_context", description: "", type: "files", required: true },
    { name: "architecture_package", description: "", type: "files_or_directory", required: true },
    { name: "research_and_evidence", description: "", type: "files_or_structured_data", required: false }
  ];

  const overridden = applyAdlcAgentInputRequiredOverrides("ux", inputs);
  assert.equal(overridden.find((i) => i.name === "approved_product_context").required, true);
  assert.equal(overridden.find((i) => i.name === "architecture_package").required, false);
  assert.equal(overridden.find((i) => i.name === "research_and_evidence").required, false);

  const untouched = applyAdlcAgentInputRequiredOverrides("architect", inputs);
  assert.deepEqual(untouched, inputs);
});

test("applyAdlcAgentInputRequiredOverrides tightens Architecture Review Agent's existing_architecture_package to required", () => {
  const { applyAdlcAgentInputRequiredOverrides } = setupAdlcAgentsModule();
  const inputs = [
    { name: "specifications_directory", description: "", type: "directory", required: true },
    { name: "existing_architecture_package", description: "", type: "directory_or_files", required: false }
  ];

  const overridden = applyAdlcAgentInputRequiredOverrides("architecture-review", inputs);
  assert.equal(overridden.find((i) => i.name === "specifications_directory").required, true);
  assert.equal(overridden.find((i) => i.name === "existing_architecture_package").required, true);
});

test("applyAdlcAgentInputOrder moves the specification first for Architect Agent and existing architecture first for Architecture Review", () => {
  const { applyAdlcAgentInputOrder } = setupAdlcAgentsModule();
  const inputs = [
    { name: "specification_source", description: "", type: "file_or_directory", required: true },
    { name: "existing_architecture_package", description: "", type: "directory_or_files", required: true },
    { name: "prd_file", description: "", type: "file", required: false },
    { name: "architecture_guidelines", description: "", type: "file", required: false }
  ];

  const ordered = applyAdlcAgentInputOrder("architecture-review", inputs);
  assert.deepEqual(
    ordered.map((i) => i.name),
    ["existing_architecture_package", "specification_source", "prd_file", "architecture_guidelines"]
  );

  const architectOrdered = applyAdlcAgentInputOrder("architect", inputs);
  assert.deepEqual(
    architectOrdered.map((i) => i.name),
    ["specification_source", "existing_architecture_package", "prd_file", "architecture_guidelines"]
  );
});

test("applyAdlcAgentInputOrder keeps unlisted inputs in their original relative order, after the listed ones", () => {
  const { applyAdlcAgentInputOrder } = setupAdlcAgentsModule();
  const inputs = [
    { name: "extra_one", description: "", type: "file", required: false },
    { name: "specification_source", description: "", type: "file_or_directory", required: true },
    { name: "extra_two", description: "", type: "file", required: false },
    { name: "existing_architecture_package", description: "", type: "directory", required: true }
  ];

  const ordered = applyAdlcAgentInputOrder("architecture-review", inputs);
  assert.deepEqual(
    ordered.map((i) => i.name),
    ["existing_architecture_package", "specification_source", "extra_one", "extra_two"]
  );
});

test("loadAdlcAgentDefinition prefills BA Agent's approved_prd and existing_specifications defaults", () => {
  const { loadAdlcAgentDefinition } = setupAdlcAgentsModule();
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "adlc-agents-test-"));
  try {
    fs.mkdirSync(path.join(repoRoot, ".agents", "agents", "ba-agent"), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, ".agents", "agents", "ba-agent", "ba-agent.md"), FIXTURE_AGENT_MARKDOWN);

    const definition = loadAdlcAgentDefinition(repoRoot, { id: "ba", label: "BA Agent", folder: "ba-agent" });

    assert.equal(
      definition.inputs.find((i) => i.name === "approved_prd").defaultValue,
      "docs/project_description/PRD.md"
    );
    assert.equal(
      definition.inputs.find((i) => i.name === "existing_specifications").defaultValue,
      "docs/specs"
    );
    assert.deepEqual(
      definition.inputs.map((i) => i.name),
      ["approved_prd", "existing_specifications", "supporting_evidence"]
    );
    assert.match(definition.diagramHtml, /BA Agent/);
    assert.match(definition.diagramHtml, /Approved PRD/);
    assert.match(definition.diagramHtml, /Existing Specifications/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("loadAdlcAgentDefinition defaults UX Agent's inputs and relaxes architecture_package to optional", () => {
  const { loadAdlcAgentDefinition } = setupAdlcAgentsModule();
  const uxAgentMarkdown = `---
name: ux-agent
description: Owns the user experience.
inputs:
  required:
    - name: approved_product_context
      description: Approved PRD and relevant feature specifications.
      type: files
    - name: workflow_configuration
      description: UX/UI design approval-gate configuration.
      type: file
  optional:
    - name: architecture_package
      description: Approved architecture, diagrams, and applicable ADRs.
      type: files_or_directory
    - name: research_and_evidence
      description: Reviewed user research, meeting analysis, and feedback.
      type: files_or_structured_data
    - name: existing_experience_system
      description: Current UI, design system, patterns, and prior design artifacts.
      type: files_or_repository_state
---
# UX agent
`;
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "adlc-agents-test-"));
  try {
    fs.mkdirSync(path.join(repoRoot, ".agents", "agents", "ux-agent"), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, ".agents", "agents", "ux-agent", "ux-agent.md"), uxAgentMarkdown);

    const definition = loadAdlcAgentDefinition(repoRoot, { id: "ux", label: "UX Agent", folder: "ux-agent" });

    assert.deepEqual(
      definition.inputs.map((i) => i.name),
      ["approved_product_context", "architecture_package", "research_and_evidence", "existing_experience_system"]
    );
    const approvedProductContext = definition.inputs.find((i) => i.name === "approved_product_context");
    assert.equal(approvedProductContext.defaultValue, "docs/specs");
    assert.equal(approvedProductContext.required, true);
    assert.equal(approvedProductContext.type, "directory");
    assert.equal(approvedProductContext.label, "Specifications Directory");

    const architecturePackage = definition.inputs.find((i) => i.name === "architecture_package");
    assert.equal(architecturePackage.defaultValue, "docs/architecture");
    assert.equal(architecturePackage.required, false);

    assert.equal(definition.inputs.find((i) => i.name === "research_and_evidence").required, false);
    assert.equal(definition.inputs.find((i) => i.name === "research_and_evidence").label, "Research and Evidence");
    assert.equal(definition.inputs.find((i) => i.name === "existing_experience_system").required, false);
    assert.equal(definition.inputs.find((i) => i.name === "existing_experience_system").label, "Existing Experience System");

    assert.match(definition.diagramHtml, /UX Agent/);
    assert.match(definition.diagramHtml, /diagram-box diagram-box-required">Specifications Directory/);
    assert.match(definition.diagramHtml, /Architecture Package/);
    assert.match(definition.diagramHtml, /Research and Evidence/);
    assert.match(definition.diagramHtml, /Existing Experience System/);
    assert.match(definition.diagramHtml, /Design Package/);
    assert.match(definition.diagramHtml, /Design Document/);
    assert.match(definition.diagramHtml, /Wireframes/);
    assert.match(definition.diagramHtml, /Specs Updated with UX Design/);
    assert.doesNotMatch(definition.diagramHtml, /Experience Disposition/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("loadAdlcAgentDefinition exposes the unified Architect inputs in display order", () => {
  const { loadAdlcAgentDefinition } = setupAdlcAgentsModule();
  const architectAgentMarkdown = `---
name: architect-agent
description: Designs solution architecture from approved specifications.
inputs:
  required:
    - name: specification_source
      description: Approved specification directory or file.
      type: file_or_directory
  optional:
    - name: existing_architecture_package
      description: Existing architecture, diagrams, and ADRs.
      type: directory
    - name: prd_file
      description: Approved PRD.
      type: file
    - name: architecture_guidelines
      description: Binding architecture guidelines.
      type: file
---
# Architect agent
`;
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "adlc-agents-test-"));
  try {
    fs.mkdirSync(path.join(repoRoot, ".agents", "agents", "architect-agent"), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, ".agents", "agents", "architect-agent", "architect-agent.md"),
      architectAgentMarkdown
    );

    const definition = loadAdlcAgentDefinition(repoRoot, { id: "architect", label: "Architect Agent", folder: "architect-agent" });

    assert.deepEqual(
      definition.inputs.map((i) => i.name),
      ["specification_source", "existing_architecture_package", "prd_file", "architecture_guidelines"]
    );
    assert.equal(
      definition.inputs.find((i) => i.name === "existing_architecture_package").defaultValue,
      "docs/architecture"
    );
    assert.equal(definition.inputs.find((i) => i.name === "specification_source").defaultValue, "docs/specs");
    assert.equal(definition.inputs.find((i) => i.name === "specification_source").label, "Specification Directory or File");
    assert.equal(definition.inputs.find((i) => i.name === "prd_file").label, "PRD");
    assert.equal(definition.architectureMode, "new_architecture");
    assert.match(definition.diagramHtml, /Architect Agent/);
    assert.match(definition.diagramHtml, /Specification Directory or File/);
    assert.match(definition.diagramHtml, /Architecture Document/);
    assert.match(definition.diagramHtml, /<div class="diagram-box diagram-box-optional">PRD<\/div>/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("loadAdlcAgentDefinition internally detects an existing architecture expansion", () => {
  const { loadAdlcAgentDefinition } = setupAdlcAgentsModule();
  const architectAgentMarkdown = `---
name: architect-agent
description: Designs solution architecture from approved specifications.
inputs:
  required:
    - name: specification_source
      description: Approved specification directory or file.
      type: file_or_directory
  optional:
    - name: existing_architecture_package
      description: Existing architecture.
      type: directory
---
# Architect agent
`;
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "adlc-agents-test-"));
  try {
    fs.mkdirSync(path.join(repoRoot, ".agents", "agents", "architect-agent"), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, ".agents", "agents", "architect-agent", "architect-agent.md"),
      architectAgentMarkdown
    );
    fs.mkdirSync(path.join(repoRoot, "docs", "architecture", "adrs"), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, "docs", "architecture", "architecture.md"), "# Architecture\n");
    fs.writeFileSync(path.join(repoRoot, "docs", "architecture", "adrs", "0001-platform.md"), "# ADR\n");

    const definition = loadAdlcAgentDefinition(repoRoot, {
      id: "architect",
      label: "Architect Agent",
      folder: "architect-agent"
    });
    assert.equal(definition.architectureMode, "existing_architecture_expansion");
    assert.doesNotMatch(definition.inputs.map((input) => input.name).join(" "), /architecture_mode/);
    assert.equal(
      definition.inputs.find((input) => input.name === "existing_architecture_package").defaultValue,
      "docs/architecture"
    );
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("loadAdlcAgentDefinition keeps existing_architecture_package, required and defaulted, for Architecture Review Agent", () => {
  const { loadAdlcAgentDefinition } = setupAdlcAgentsModule();
  const architectAgentMarkdown = `---
name: architect-agent
description: Designs solution architecture from approved specifications.
inputs:
  required:
    - name: specification_source
      description: Approved specification directory or file.
      type: file_or_directory
  optional:
    - name: existing_architecture_package
      description: Existing architecture, diagrams, and ADRs.
      type: directory
    - name: prd_file
      description: Approved PRD.
      type: file
    - name: architecture_guidelines
      description: Binding architecture guidelines.
      type: file
---
# Architect agent
`;
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "adlc-agents-test-"));
  try {
    fs.mkdirSync(path.join(repoRoot, ".agents", "agents", "architect-agent"), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, ".agents", "agents", "architect-agent", "architect-agent.md"),
      architectAgentMarkdown
    );

    const definition = loadAdlcAgentDefinition(repoRoot, {
      id: "architecture-review",
      label: "Architecture Review Agent",
      folder: "architect-agent"
    });

    assert.deepEqual(
      definition.inputs.map((i) => i.name),
      ["existing_architecture_package", "specification_source", "prd_file", "architecture_guidelines"]
    );
    const existingArchitecturePackage = definition.inputs.find((i) => i.name === "existing_architecture_package");
    assert.equal(existingArchitecturePackage.required, true);
    assert.equal(existingArchitecturePackage.defaultValue, "docs/architecture");
    assert.equal(existingArchitecturePackage.label, "Existing Architecture Folder");

    const specificationSource = definition.inputs.find((i) => i.name === "specification_source");
    assert.equal(specificationSource.defaultValue, "docs/specs");
    assert.equal(specificationSource.label, "Specification Directory or File");

    const prdFile = definition.inputs.find((i) => i.name === "prd_file");
    assert.equal(prdFile.defaultValue, "docs/project_description/PRD.md");
    assert.equal(prdFile.label, "PRD");

    assert.equal(definition.inputs.find((i) => i.name === "architecture_guidelines").label, "Architecture Guidelines");

    assert.match(definition.diagramHtml, /Architecture Review Agent/);
    assert.match(definition.diagramHtml, /Existing Architecture Folder/);
    assert.match(definition.diagramHtml, /Review Findings/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("applyAdlcAgentInputTypeOverrides narrows product_context to file for both Architect Agent and Architecture Review Agent", () => {
  const { applyAdlcAgentInputTypeOverrides } = setupAdlcAgentsModule();
  const inputs = [
    { name: "specifications_directory", description: "", type: "directory", required: true },
    { name: "product_context", description: "", type: "file_or_directory", required: false }
  ];

  const overriddenForReview = applyAdlcAgentInputTypeOverrides("architecture-review", inputs);
  assert.equal(overriddenForReview.find((i) => i.name === "specifications_directory").type, "directory");
  assert.equal(overriddenForReview.find((i) => i.name === "product_context").type, "file");

  const overriddenForArchitect = applyAdlcAgentInputTypeOverrides("architect", inputs);
  assert.equal(overriddenForArchitect.find((i) => i.name === "specifications_directory").type, "directory");
  assert.equal(overriddenForArchitect.find((i) => i.name === "product_context").type, "file");

  const untouched = applyAdlcAgentInputTypeOverrides("ux", inputs);
  assert.deepEqual(untouched, inputs);
});

test("applyAdlcAgentInputLabelOverrides labels product_context as PRD for both Architect Agent and Architecture Review Agent", () => {
  const { applyAdlcAgentInputLabelOverrides } = setupAdlcAgentsModule();
  const inputs = [
    { name: "specifications_directory", description: "", type: "directory", required: true },
    { name: "product_context", description: "", type: "file", required: false }
  ];

  const overriddenForReview = applyAdlcAgentInputLabelOverrides("architecture-review", inputs);
  assert.equal(overriddenForReview.find((i) => i.name === "specifications_directory").label, undefined);
  assert.equal(overriddenForReview.find((i) => i.name === "product_context").label, "PRD");

  const overriddenForArchitect = applyAdlcAgentInputLabelOverrides("architect", inputs);
  assert.equal(overriddenForArchitect.find((i) => i.name === "product_context").label, "PRD");

  const untouched = applyAdlcAgentInputLabelOverrides("ux", inputs);
  assert.deepEqual(untouched, inputs);
});

test("applyAdlcAgentInputTypeOverrides narrows UX Agent's approved_product_context to directory, others untouched", () => {
  const { applyAdlcAgentInputTypeOverrides } = setupAdlcAgentsModule();
  const inputs = [
    { name: "approved_product_context", description: "", type: "files", required: true },
    { name: "architecture_package", description: "", type: "files_or_directory", required: false }
  ];

  const overridden = applyAdlcAgentInputTypeOverrides("ux", inputs);
  assert.equal(overridden.find((i) => i.name === "approved_product_context").type, "directory");
  assert.equal(overridden.find((i) => i.name === "architecture_package").type, "files_or_directory");

  const untouched = applyAdlcAgentInputTypeOverrides("architect", inputs);
  assert.deepEqual(untouched, inputs);
});

test("applyAdlcAgentInputLabelOverrides applies the UX Agent's visible labels", () => {
  const { applyAdlcAgentInputLabelOverrides } = setupAdlcAgentsModule();
  const inputs = [
    { name: "approved_product_context", description: "", type: "directory", required: true },
    { name: "architecture_package", description: "", type: "files_or_directory", required: false },
    { name: "research_and_evidence", description: "", type: "files_or_structured_data", required: false },
    { name: "existing_experience_system", description: "", type: "files_or_repository_state", required: false }
  ];

  const overridden = applyAdlcAgentInputLabelOverrides("ux", inputs);
  assert.equal(overridden.find((i) => i.name === "approved_product_context").label, "Specifications Directory");
  assert.equal(overridden.find((i) => i.name === "architecture_package").label, "Architecture Package");
  assert.equal(overridden.find((i) => i.name === "research_and_evidence").label, "Research and Evidence");
  assert.equal(overridden.find((i) => i.name === "existing_experience_system").label, "Existing Experience System");

  const untouched = applyAdlcAgentInputLabelOverrides("architect", inputs);
  assert.deepEqual(untouched, inputs);
});

test("loadAdlcAgentDefinition exposes required planner sources and optional design package and backlog", () => {
  const { loadAdlcAgentDefinition } = setupAdlcAgentsModule();
  const projectPlannerMarkdown = `---
name: project-planner-agent
description: The arbiter and sequencer.
inputs:
  required:
    - name: requirements_stream
      description: Approved stories and acceptance criteria.
      type: files_or_structured_data
    - name: technical_stream
      description: Technical tasks and dependency edges.
      type: files_or_structured_data
    - name: backlog_destination
      description: Configured Jira or Markdown system of record.
      type: structured_data
    - name: workflow_configuration
      description: Backlog approval and failure-tracking configuration.
      type: file
  optional:
    - name: design_package
      description: Approved UX design document and wireframes when available.
      type: directory
    - name: existing_backlog
      description: Current items, dependencies, estimates, and statuses.
      type: files_or_structured_data
    - name: execution_evidence
      description: Test failures, verification results, and estimate-drift signals.
      type: structured_data
---
# Project planner agent
`;
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "adlc-agents-test-"));
  try {
    fs.mkdirSync(path.join(repoRoot, ".agents", "agents", "project-planner-agent"), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, ".agents", "agents", "project-planner-agent", "project-planner-agent.md"),
      projectPlannerMarkdown
    );

    const definition = loadAdlcAgentDefinition(repoRoot, {
      id: "project-planner",
      label: "Project Planner Agent",
      folder: "project-planner-agent"
    });

    const requirementsStream = definition.inputs.find((i) => i.name === "requirements_stream");
    assert.equal(requirementsStream.defaultValue, "docs/specs");
    assert.equal(requirementsStream.label, "Specifications Directory");

    const technicalStream = definition.inputs.find((i) => i.name === "technical_stream");
    assert.equal(technicalStream.defaultValue, "docs/architecture");
    assert.equal(technicalStream.label, "Architecture Folder");

    const designPackage = definition.inputs.find((i) => i.name === "design_package");
    assert.equal(designPackage.defaultValue, "docs/design");
    assert.equal(designPackage.label, "Design Package");
    assert.equal(designPackage.required, false);

    const existingBacklog = definition.inputs.find((i) => i.name === "existing_backlog");
    assert.equal(existingBacklog.defaultValue, "docs/backlog");

    assert.deepEqual(
      definition.inputs.map((i) => i.name),
      ["requirements_stream", "technical_stream", "design_package", "existing_backlog"]
    );

    assert.match(definition.diagramHtml, /Project Planner Agent/);
    assert.match(definition.diagramHtml, /Specifications Directory/);
    assert.match(definition.diagramHtml, /Architecture Folder/);
    assert.match(definition.diagramHtml, /Design Package/);
    assert.match(definition.diagramHtml, /diagram-box diagram-box-output">Backlog/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
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

test("renderAdlcAgentRunHtml renders harness, model, input fields, and a top-right Run action", () => {
  const {
    parseAdlcAgentFrontmatter,
    filterUserFacingAdlcInputs,
    applyAdlcAgentInputDefaults,
    applyAdlcAgentInputOrder,
    renderAdlcAgentRunHtml
  } = setupAdlcAgentsModule();
  const parsed = parseAdlcAgentFrontmatter(FIXTURE_AGENT_MARKDOWN);
  const definition = {
    ...parsed,
    inputs: applyAdlcAgentInputOrder(
      "ba",
      applyAdlcAgentInputDefaults("ba", filterUserFacingAdlcInputs(parsed.inputs, "ba"))
    ),
    id: "ba",
    label: "BA Agent",
    folder: "ba-agent",
    filePath: ""
  };
  const html = renderAdlcAgentRunHtml({ cspSource: "vscode-resource:" }, definition, {
    defaultHarness: "codex",
    defaultModel: "gpt-5-codex"
  });

  assert.match(html, /<option value="codex" selected>/);
  assert.match(html, /id="model-input"[^>]*value="gpt-5-codex"/);
  assert.match(
    html,
    /data-input-name="approved_prd" data-required="true" value="docs\/project_description\/PRD\.md"/
  );
  assert.match(
    html,
    /data-input-name="existing_specifications" data-required="false" value="docs\/specs"/
  );
  assert.match(html, /data-browse="existing_specifications" data-kind="folder"/);
  assert.match(html, /data-input-name="supporting_evidence" data-required="false"/);
  assert.doesNotMatch(html, /data-input-name="alternative_input_contract"/);
  assert.ok(html.indexOf('data-input-name="approved_prd"') < html.indexOf('data-input-name="existing_specifications"'));
  assert.ok(
    html.indexOf('data-input-name="existing_specifications"') < html.indexOf('data-input-name="supporting_evidence"')
  );
  assert.match(
    html,
    /<div class="page-header">\s*<div>\s*<div class="title">BA Agent<\/div>[\s\S]*?<button type="submit">Run<\/button>\s*<\/div>/
  );
  assert.doesNotMatch(html, /id="cancel-button"|>Cancel<\/button>|adlcAgentCancel/);
  assert.doesNotMatch(html, /<button type="submit">Execute<\/button>/);
  assert.match(html, /type: "adlcAgentExecute"/);
});

test("renderAdlcAgentRunHtml shows an input's label when set, while keeping data-input-name as the real name", () => {
  const { renderAdlcAgentRunHtml } = setupAdlcAgentsModule();
  const html = renderAdlcAgentRunHtml(
    { cspSource: "vscode-resource:" },
    {
      id: "architect",
      label: "Architect Agent",
      folder: "architect-agent",
      filePath: "",
      description: "",
      inputs: [
        {
          name: "product_context",
          description: "Approved PRD and supporting product context.",
          type: "file",
          required: false,
          defaultValue: "docs/project_description/PRD.md",
          label: "PRD"
        }
      ]
    },
    { defaultHarness: "claude", defaultModel: "" }
  );

  assert.match(html, /<code>PRD<\/code>/);
  assert.doesNotMatch(html, /<code>product_context<\/code>/);
  assert.match(html, /data-input-name="product_context"/);
  assert.match(html, /data-browse="product_context"/);
});

test("renderAdlcAgentRunHtml renders the unified Architect inputs without an architecture mode field", () => {
  const { renderAdlcAgentRunHtml } = setupAdlcAgentsModule();
  const html = renderAdlcAgentRunHtml(
    { cspSource: "vscode-resource:" },
    {
      id: "architect",
      label: "Architect Agent",
      folder: "architect-agent",
      filePath: "",
      description: "",
      architectureMode: "existing_architecture_expansion",
      inputs: [
        { name: "specification_source", label: "Specification Directory or File", description: "", type: "file_or_directory", required: true },
        { name: "existing_architecture_package", label: "Existing Architecture Folder", description: "", type: "directory", required: false },
        { name: "prd_file", label: "PRD", description: "", type: "file", required: false },
        { name: "architecture_guidelines", label: "Architecture Guidelines", description: "", type: "file", required: false }
      ]
    },
    { defaultHarness: "claude", defaultModel: "" }
  );

  assert.doesNotMatch(html, /data-input-name="architecture_mode"/);
  assert.doesNotMatch(html, /refreshArchitectureInputs/);
  assert.match(html, /data-input-name="specification_source" data-required="true"/);
  assert.match(html, /data-input-name="existing_architecture_package" data-required="false"/);
  assert.ok(html.indexOf("Specification Directory or File") < html.indexOf("Existing Architecture Folder"));
  assert.ok(html.indexOf("Existing Architecture Folder") < html.indexOf("PRD"));
  assert.ok(html.indexOf("PRD") < html.indexOf("Architecture Guidelines"));
});

test("filterUserFacingAdlcInputs exposes BA Agent's supporting evidence and hides only the alternative input contract", () => {
  const { isAdlcAgentHiddenInput, filterUserFacingAdlcInputs } = setupAdlcAgentsModule();
  const inputs = [
    { name: "approved_prd", description: "", type: "file", required: true },
    { name: "supporting_evidence", description: "", type: "file_or_directory", required: false },
    { name: "existing_specifications", description: "", type: "directory", required: false },
    { name: "alternative_input_contract", description: "", type: "text_or_files", required: false }
  ];

  assert.equal(isAdlcAgentHiddenInput("ba", "supporting_evidence"), false);
  assert.equal(isAdlcAgentHiddenInput("ba", "alternative_input_contract"), true);
  assert.equal(isAdlcAgentHiddenInput("ba", "existing_specifications"), false);
  assert.equal(isAdlcAgentHiddenInput("architect", "supporting_evidence"), false);

  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "ba").map((input) => input.name),
    ["approved_prd", "supporting_evidence", "existing_specifications"]
  );
  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "architect").map((input) => input.name),
    inputs.map((input) => input.name)
  );
});

test("filterUserFacingAdlcInputs exposes all UX Agent product, architecture, research, and existing-experience inputs", () => {
  const { isAdlcAgentHiddenInput, filterUserFacingAdlcInputs } = setupAdlcAgentsModule();
  const inputs = [
    { name: "approved_product_context", description: "", type: "files", required: true },
    { name: "architecture_package", description: "", type: "files_or_directory", required: true },
    { name: "research_and_evidence", description: "", type: "files_or_structured_data", required: false },
    { name: "existing_experience_system", description: "", type: "files_or_repository_state", required: false }
  ];

  assert.equal(isAdlcAgentHiddenInput("ux", "research_and_evidence"), false);
  assert.equal(isAdlcAgentHiddenInput("ux", "existing_experience_system"), false);
  assert.equal(isAdlcAgentHiddenInput("ux", "approved_product_context"), false);
  assert.equal(isAdlcAgentHiddenInput("architect", "research_and_evidence"), false);

  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "ux").map((input) => input.name),
    ["approved_product_context", "architecture_package", "research_and_evidence", "existing_experience_system"]
  );
  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "architect").map((input) => input.name),
    inputs.map((input) => input.name)
  );
});

test("filterUserFacingAdlcInputs hides legacy Architect mode and development guideline inputs", () => {
  const { isAdlcAgentHiddenInput, filterUserFacingAdlcInputs } = setupAdlcAgentsModule();
  const inputs = [
    { name: "architecture_mode", description: "", type: "mode", required: true },
    { name: "development_guidelines", description: "", type: "file", required: false },
    { name: "existing_architecture_package", description: "", type: "directory_or_files", required: false },
    { name: "specification_source", description: "", type: "file_or_directory", required: true },
    { name: "prd_file", description: "", type: "file", required: false },
    { name: "architecture_guidelines", description: "", type: "file", required: false }
  ];

  assert.equal(isAdlcAgentHiddenInput("architect", "existing_architecture_package"), false);
  assert.equal(isAdlcAgentHiddenInput("architect", "architecture_mode"), true);
  assert.equal(isAdlcAgentHiddenInput("architect", "development_guidelines"), true);
  assert.equal(isAdlcAgentHiddenInput("architecture-review", "existing_architecture_package"), false);
  assert.equal(isAdlcAgentHiddenInput("ux", "existing_architecture_package"), false);

  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "architect").map((input) => input.name),
    ["existing_architecture_package", "specification_source", "prd_file", "architecture_guidelines"]
  );
  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "architecture-review").map((input) => input.name),
    inputs.map((input) => input.name)
  );
});

test("filterUserFacingAdlcInputs exposes Project Planner Agent's design package and hides operational inputs", () => {
  const { isAdlcAgentHiddenInput, filterUserFacingAdlcInputs } = setupAdlcAgentsModule();
  const inputs = [
    { name: "requirements_stream", description: "", type: "files_or_structured_data", required: true },
    { name: "technical_stream", description: "", type: "files_or_structured_data", required: true },
    { name: "design_package", description: "", type: "directory", required: false },
    { name: "existing_backlog", description: "", type: "files_or_structured_data", required: false },
    { name: "backlog_destination", description: "", type: "structured_data", required: true },
    { name: "execution_evidence", description: "", type: "structured_data", required: false }
  ];

  assert.equal(isAdlcAgentHiddenInput("project-planner", "backlog_destination"), true);
  assert.equal(isAdlcAgentHiddenInput("project-planner", "execution_evidence"), true);
  assert.equal(isAdlcAgentHiddenInput("project-planner", "requirements_stream"), false);
  assert.equal(isAdlcAgentHiddenInput("project-planner", "design_package"), false);
  assert.equal(isAdlcAgentHiddenInput("ux", "execution_evidence"), false);

  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "project-planner").map((input) => input.name),
    ["requirements_stream", "technical_stream", "design_package", "existing_backlog"]
  );
  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "ux").map((input) => input.name),
    inputs.map((input) => input.name)
  );
});

test("canonical UX Agent outputs a design package with document and wireframes plus updated specifications", () => {
  const uxAgent = fs.readFileSync(path.join(__dirname, "..", ".agents", "agents", "ux-agent", "ux-agent.md"), "utf8");

  assert.match(uxAgent, /- name: design_package/);
  assert.match(uxAgent, /docs\/design\/design\.md/);
  assert.match(uxAgent, /docs\/design\/wireframes\//);
  assert.match(uxAgent, /- name: updated_specifications/);
  assert.doesNotMatch(uxAgent, /experience_disposition|planning_handoff|not-applicable decision/);
});

test("canonical Project Planner Agent outputs a backlog of dependency-sequenced user stories", () => {
  const plannerAgent = fs.readFileSync(
    path.join(__dirname, "..", ".agents", "agents", "project-planner-agent", "project-planner-agent.md"),
    "utf8"
  );

  assert.match(plannerAgent, /- name: backlog/);
  assert.match(plannerAgent, /Backlog containing user stories sequenced by dependencies/);
  assert.doesNotMatch(plannerAgent, /- name: sequenced_user_stories|- name: task_backlog/);
});

test("canonical Developer Agent outputs source code and invokes documentation after tests pass", () => {
  const developerAgent = fs.readFileSync(
    path.join(__dirname, "..", ".agents", "agents", "developer-agent", "developer-agent.md"),
    "utf8"
  );
  const backlogImplementationWorkflow = fs.readFileSync(
    path.join(__dirname, "..", ".agents", "workflows", "backlog-implementation-workflow.md"),
    "utf8"
  );

  assert.match(developerAgent, /- name: source_code/);
  assert.match(developerAgent, /Source code added or updated under `src\/`/);
  assert.match(developerAgent, /uses the existing code and tests as implicit inputs/i);
  assert.match(
    developerAgent,
    /responsible for invoking the Spec Validation Agent, then the Test Agent to run the test suite, and finally the Documentation Agent/i
  );
  assert.match(developerAgent, /- name: user_story_or_specification/);
  assert.match(developerAgent, /takes precedence over the backlog/i);
  assert.match(developerAgent, /After `test-agent` PASS, invoke `documentation-agent`/i);
  assert.match(backlogImplementationWorkflow, /Invoke `documentation-agent` after `test-agent` returns PASS/i);
  assert.ok(
    backlogImplementationWorkflow.indexOf("Invoke `documentation-agent` after `test-agent` returns PASS") >
      backlogImplementationWorkflow.indexOf("Pass the candidate branch and original BA acceptance criteria to `test-agent`")
  );
  assert.doesNotMatch(developerAgent, /- name: implementation\n/);
});

test("canonical Deployment Agent accepts a release configuration and optional deployment scripts", () => {
  const { loadAdlcAgentDefinition } = setupAdlcAgentsModule();
  const deploymentAgent = fs.readFileSync(
    path.join(__dirname, "..", ".agents", "agents", "deployment-agent", "deployment-agent.md"),
    "utf8"
  );
  const sample = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      ".agents",
      "agents",
      "deployment-agent",
      "references",
      "release_configuration_sample"
    ),
    "utf8"
  );

  assert.match(deploymentAgent, /- name: release_configuration/);
  assert.match(deploymentAgent, /references\/release_configuration_sample/);
  assert.match(deploymentAgent, /- name: pre_deployment_script/);
  assert.match(deploymentAgent, /- name: post_deployment_script/);
  assert.match(deploymentAgent, /Never execute a provided script merely because it was supplied/);

  const definition = loadAdlcAgentDefinition(path.join(__dirname, ".."), {
    id: "deployment",
    label: "Deployment Agent",
    folder: "deployment-agent"
  });
  assert.deepEqual(
    definition.inputs.map((input) => input.name),
    [
      "approved_merged_pr",
      "release_configuration",
      "pre_deployment_script",
      "post_deployment_script",
      "prior_release_state",
      "pre_release_evidence"
    ]
  );
  assert.equal(definition.inputs.find((input) => input.name === "release_configuration").required, true);
  assert.equal(definition.inputs.find((input) => input.name === "pre_deployment_script").required, false);
  assert.equal(definition.inputs.find((input) => input.name === "post_deployment_script").required, false);

  assert.match(sample, /^version:\s*1/m);
  assert.match(sample, /environment:/);
  assert.match(sample, /artifact:/);
  assert.match(sample, /infrastructure:/);
  assert.match(sample, /rollback:/);
  assert.match(sample, /verification:/);
  assert.doesNotMatch(sample, /(password|secret|token):\s*\S+/i);
});

test("canonical SDLC Orchestrator does not expose project_state as an input", () => {
  const { loadAdlcAgentDefinition } = setupAdlcAgentsModule();
  const orchestrator = fs.readFileSync(
    path.join(__dirname, "..", ".agents", "agents", "sdlc-orchestrator", "sdlc-orchestrator.md"),
    "utf8"
  );
  const definition = loadAdlcAgentDefinition(path.join(__dirname, ".."), {
    id: "sdlc-orchestrator",
    label: "SDLC Orchestrator Agent",
    folder: "sdlc-orchestrator"
  });

  assert.doesNotMatch(orchestrator, /- name: project_state/);
  assert.deepEqual(definition.inputs.map((input) => input.name), ["request"]);
  assert.match(definition.diagramHtml, /diagram-box diagram-box-required">User Request/);
  assert.match(definition.diagramHtml, /diagram-box diagram-box-output">Delegation to Appropriate Agent\(s\)/);
});

test("renderAdlcAgentRunHtml requires one Coding scope while both fields remain optional", () => {
  const { renderAdlcAgentRunHtml } = setupAdlcAgentsModule();
  const html = renderAdlcAgentRunHtml(
    { cspSource: "vscode-resource:" },
    {
      id: "coding",
      label: "Coding Agent",
      folder: "developer-agent",
      filePath: "/tmp/developer-agent.md",
      description: "Uses existing code and tests as implicit inputs.",
      inputs: [
        {
          name: "backlog_item",
          label: "Backlog",
          description: "Backlog to implement.",
          type: "file_or_structured_data",
          required: false,
          defaultValue: "docs/backlog"
        },
        {
          name: "user_story_or_specification",
          label: "User Story or Specification",
          description: "Targeted implementation scope.",
          type: "file_or_directory",
          required: false
        }
      ]
    },
    { defaultHarness: "claude", defaultModel: "" }
  );

  assert.match(html, /Provide either Backlog or User Story or Specification\./);
  assert.match(html, /data-input-name="backlog_item" data-required="false"/);
  assert.match(html, /data-input-name="user_story_or_specification" data-required="false"/);
});

test("filterUserFacingAdlcInputs hides all of Create Tests Agent's real inputs, and only for test", () => {
  const { isAdlcAgentHiddenInput, filterUserFacingAdlcInputs } = setupAdlcAgentsModule();
  const inputs = [
    { name: "candidate_revision", description: "", type: "repository_state", required: true },
    { name: "acceptance_criteria", description: "", type: "files_or_structured_data", required: true },
    { name: "governing_context", description: "", type: "files_or_structured_data", required: true },
    { name: "test_environment", description: "", type: "structured_data", required: true },
    { name: "prior_test_evidence", description: "", type: "files_or_structured_data", required: false },
    { name: "red_team_target", description: "", type: "structured_data", required: false }
  ];

  for (const input of inputs) {
    assert.equal(isAdlcAgentHiddenInput("test", input.name), true, `${input.name} should be hidden for test`);
  }
  assert.equal(isAdlcAgentHiddenInput("ux", "candidate_revision"), false);

  assert.deepEqual(filterUserFacingAdlcInputs(inputs, "test"), []);
  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "ux").map((input) => input.name),
    inputs.map((input) => input.name)
  );
});

test("loadAdlcAgentDefinition replaces Create Tests Agent's real inputs with the dependency-sequenced backlog", () => {
  const { loadAdlcAgentDefinition } = setupAdlcAgentsModule();
  const testAgentMarkdown = `---
name: test-agent
description: The verifier.
inputs:
  required:
    - name: candidate_revision
      description: Exact implementation revision and affected scope.
      type: repository_state
    - name: acceptance_criteria
      description: Original approved BA verification contract.
      type: files_or_structured_data
    - name: governing_context
      description: Backlog item, specifications, ADRs, and UX constraints.
      type: files_or_structured_data
    - name: test_environment
      description: Authorized environment, data, prerequisites, and commands.
      type: structured_data
    - name: workflow_configuration
      description: Test-plan, red-team, and failure-tracking configuration.
      type: file
  optional:
    - name: prior_test_evidence
      description: Approved plans, earlier failures, tracked IDs, and fix evidence.
      type: files_or_structured_data
    - name: red_team_target
      description: Ephemeral synthetic-data target for adversarial testing.
      type: structured_data
---
# Test agent
`;
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "adlc-agents-test-"));
  try {
    fs.mkdirSync(path.join(repoRoot, ".agents", "agents", "test-agent"), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, ".agents", "agents", "test-agent", "test-agent.md"), testAgentMarkdown);

    const definition = loadAdlcAgentDefinition(repoRoot, { id: "test", label: "Create Tests Agent", folder: "test-agent" });

    assert.deepEqual(
      definition.inputs.map((i) => i.name),
      ["backlog", "user_story_or_specification"]
    );
    const backlog = definition.inputs.find((i) => i.name === "backlog");
    assert.equal(backlog.label, "Backlog");
    assert.equal(backlog.description, "The backlog contains user stories sequenced by dependencies.");
    assert.equal(backlog.required, false);
    assert.equal(backlog.defaultValue, "docs/backlog");
    const targetedSource = definition.inputs.find((i) => i.name === "user_story_or_specification");
    assert.equal(targetedSource.label, "User Story or Specification");
    assert.equal(targetedSource.required, false);

    assert.match(definition.diagramHtml, /Create Tests Agent/);
    assert.match(definition.diagramHtml, /diagram-group-label">src/);
    assert.match(definition.diagramHtml, /diagram-box diagram-box-output">Tests/);
    assert.doesNotMatch(definition.diagramHtml, /Test Suite/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("canonical Test Agent treats sequenced user stories as governing context", () => {
  const testAgent = fs.readFileSync(path.join(__dirname, "..", ".agents", "agents", "test-agent", "test-agent.md"), "utf8");

  assert.match(testAgent, /Sequenced user stories, specifications, ADRs, and UX constraints/);
  assert.match(testAgent, /- name: user_story_or_specification/);
  assert.match(testAgent, /takes precedence over the backlog/);
  assert.match(testAgent, /Tests added or updated under `src\/`/);
});

test("renderAdlcAgentRunHtml requires one Create Tests source while both fields remain optional", () => {
  const { renderAdlcAgentRunHtml, getAdlcAgentSyntheticInputs } = setupAdlcAgentsModule();
  const html = renderAdlcAgentRunHtml(
    { cspSource: "vscode-resource:" },
    {
      id: "test",
      label: "Create Tests Agent",
      folder: "test-agent",
      filePath: "/tmp/test-agent.md",
      description: "The verifier.",
      inputs: getAdlcAgentSyntheticInputs("test")
    },
    { defaultHarness: "claude", defaultModel: "" }
  );

  assert.match(html, /Provide either Backlog or User Story or Specification\./);
  assert.match(html, /data-input-name="backlog" data-required="false"/);
  assert.match(html, /data-input-name="user_story_or_specification" data-required="false"/);
});

test("renderAdlcAgentRunHtml renders the Product Agent's required source and optional evidence fields", () => {
  const { renderAdlcAgentRunHtml } = setupAdlcAgentsModule();
  const withArtifactsDir = renderAdlcAgentRunHtml(
    { cspSource: "vscode-resource:" },
    {
      id: "product",
      label: "Product Agent",
      folder: "product-agent",
      filePath: "",
      description: "",
      inputs: [
        {
          name: "product_definition_source",
          label: "Product Definition",
          description: "Product definition directory or file.",
          type: "file_or_directory",
          required: true,
          defaultValue: "docs/product-definition"
        },
        {
          name: "supporting_evidence",
          label: "Supporting Evidence",
          description: "Supporting product evidence.",
          type: "file_or_directory",
          required: false
        }
      ]
    },
    { defaultHarness: "claude", defaultModel: "" }
  );
  assert.match(
    withArtifactsDir,
    /data-input-name="product_definition_source" data-required="true" value="docs\/product-definition"/
  );
  assert.match(withArtifactsDir, /data-browse="product_definition_source" data-kind="any"/);
  assert.match(withArtifactsDir, /data-input-name="supporting_evidence" data-required="false"/);
  assert.doesNotMatch(withArtifactsDir, /This agent declares no input artifacts/);

  const withoutArtifactsDir = renderAdlcAgentRunHtml(
    { cspSource: "vscode-resource:" },
    { id: "sdlc-orchestrator", label: "SDLC Orchestrator Agent", folder: "sdlc-orchestrator", filePath: "", description: "", inputs: [] },
    { defaultHarness: "claude", defaultModel: "" }
  );
  assert.match(withoutArtifactsDir, /This agent declares no input artifacts\. Describe the request below\./);
});

test("renderAdlcAgentRunHtml renders the diagram after the description, only when the agent declares one", () => {
  const { getAdlcAgentDiagramHtml, renderAdlcAgentRunHtml } = setupAdlcAgentsModule();
  const withDiagram = renderAdlcAgentRunHtml(
    { cspSource: "vscode-resource:" },
    {
      id: "product",
      label: "Product Agent",
      folder: "product-agent",
      filePath: "",
      description: "Owns the WHY of the project.",
      inputs: [],
      diagramHtml: getAdlcAgentDiagramHtml("product")
    },
    { defaultHarness: "claude", defaultModel: "" }
  );
  const descriptionIndex = withDiagram.indexOf('<p class="description">Owns the WHY of the project.</p>');
  const diagramIndex = withDiagram.indexOf('<div class="diagram diagram-product">');
  assert.ok(descriptionIndex >= 0);
  assert.ok(diagramIndex > descriptionIndex);
  assert.match(withDiagram, /Product Definition/);
  assert.match(withDiagram, /Supporting Evidence/);
  assert.doesNotMatch(withDiagram, /\.diagram-group-stack/);
  assert.match(
    withDiagram,
    /\.diagram-product \.diagram-group, \.diagram-ba \.diagram-group, \.diagram-architect \.diagram-group, \.diagram-architecture-review \.diagram-group, \.diagram-ux \.diagram-group, \.diagram-project-planner \.diagram-group, \.diagram-test \.diagram-group, \.diagram-coding \.diagram-group, \.diagram-code-review \.diagram-group, \.diagram-deployment \.diagram-group, \.diagram-sdlc-orchestrator \.diagram-group \{ border-color: var\(--vscode-charts-yellow, #cca700\); border-style: dotted; \}/
  );
  assert.match(withDiagram, /\.diagram-box-required \{ border-color: var\(--vscode-charts-orange, #d18616\); \}/);
  assert.match(
    withDiagram,
    /\.diagram-box-optional \{ border-color: var\(--vscode-panel-border, var\(--vscode-input-border, transparent\)\); \}/
  );
  assert.match(withDiagram, /\.diagram-box-output \{ border-color: var\(--vscode-charts-green, #89d185\); \}/);
  assert.match(
    withDiagram,
    /\.diagram-architect \.diagram-group-output, \.diagram-ux \.diagram-group-output, \.diagram-test \.diagram-group-output, \.diagram-coding \.diagram-group-output, \.diagram-deployment \.diagram-group-output \{ border-color: var\(--vscode-charts-green, #89d185\); border-style: dotted; \}/
  );

  const withoutDiagram = renderAdlcAgentRunHtml(
    { cspSource: "vscode-resource:" },
    {
      id: "documentation",
      label: "Documentation Agent",
      folder: "documentation-agent",
      filePath: "",
      description: "Writes and maintains project documentation.",
      inputs: []
    },
    { defaultHarness: "claude", defaultModel: "" }
  );
  assert.doesNotMatch(withoutDiagram, /class="diagram"/);
});
