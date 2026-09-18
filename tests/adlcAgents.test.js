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

test("buildAdlcAgentPrompt lists the artifacts_directory input like any other input", () => {
  const { buildAdlcAgentPrompt } = setupAdlcAgentsModule();
  const definition = {
    id: "product",
    label: "Product Agent",
    folder: "product-agent",
    filePath: "",
    description: "",
    inputs: [
      {
        name: "artifacts_directory",
        description: "Notes, meeting analyses, product descriptions, briefs, and other input artifacts for this agent.",
        type: "directory",
        required: true,
        defaultValue: "docs/product-definition"
      }
    ]
  };
  const prompt = buildAdlcAgentPrompt(definition, {
    harness: "claude",
    model: "",
    inputs: { artifacts_directory: "docs/product-definition" },
    additionalInstructions: ""
  });

  assert.match(prompt, /- artifacts_directory \(required\): docs\/product-definition/);
});

test("getAdlcAgentDefaultArtifactsDir returns the known folder for product-agent and undefined otherwise", () => {
  const { getAdlcAgentDefaultArtifactsDir } = setupAdlcAgentsModule();
  assert.equal(getAdlcAgentDefaultArtifactsDir("product-agent"), "docs/product-definition");
  assert.equal(getAdlcAgentDefaultArtifactsDir("ba-agent"), undefined);
});

test("loadAdlcAgentDefinition adds an editable artifacts_directory input for product-agent", () => {
  const { loadAdlcAgentDefinition } = setupAdlcAgentsModule();
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "adlc-agents-test-"));
  try {
    fs.mkdirSync(path.join(repoRoot, ".agents", "agents", "product-agent"), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, ".agents", "agents", "product-agent", "product-agent.md"),
      "---\nname: product-agent\ndescription: Owns the WHY.\n---\n# Product\n"
    );

    const definition = loadAdlcAgentDefinition(repoRoot, { id: "product", label: "Product Agent", folder: "product-agent" });

    assert.deepEqual(definition.inputs.map((i) => i.name), ["artifacts_directory"]);
    const artifactsDirectory = definition.inputs[0];
    assert.equal(artifactsDirectory.defaultValue, "docs/product-definition");
    assert.equal(artifactsDirectory.required, true);
    assert.equal(artifactsDirectory.type, "directory");
    assert.match(definition.diagramHtml, /Product Definition/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("getAdlcAgentDiagramHtml returns the Product, BA, UX, Architect, and Architecture Review Agent diagrams, and undefined for other agents", () => {
  const { getAdlcAgentDiagramHtml } = setupAdlcAgentsModule();
  assert.match(getAdlcAgentDiagramHtml("product"), /Meeting Notes Folder/);
  assert.match(getAdlcAgentDiagramHtml("product"), /Project Description File/);
  assert.match(getAdlcAgentDiagramHtml("product"), /Product Agent/);
  assert.match(getAdlcAgentDiagramHtml("product"), /PRD/);

  assert.match(getAdlcAgentDiagramHtml("ba"), /Approved PRD/);
  assert.match(getAdlcAgentDiagramHtml("ba"), /Existing Specifications/);
  assert.match(getAdlcAgentDiagramHtml("ba"), /BA Agent/);
  assert.match(getAdlcAgentDiagramHtml("ba"), /Specifications/);

  assert.match(getAdlcAgentDiagramHtml("ux"), /<div class="diagram-box">Specifications Directory<\/div>/);
  assert.match(getAdlcAgentDiagramHtml("ux"), /Architecture Package/);
  assert.match(getAdlcAgentDiagramHtml("ux"), /UX Agent/);
  assert.match(getAdlcAgentDiagramHtml("ux"), /Design Package/);

  assert.match(getAdlcAgentDiagramHtml("architect"), /Specifications Directory/);
  assert.match(getAdlcAgentDiagramHtml("architect"), /<div class="diagram-box">PRD<\/div>/);
  assert.match(getAdlcAgentDiagramHtml("architect"), /Development Guidelines/);
  assert.match(getAdlcAgentDiagramHtml("architect"), /Architect Agent/);
  assert.match(getAdlcAgentDiagramHtml("architect"), /Architecture Document/);

  assert.match(getAdlcAgentDiagramHtml("architecture-review"), /Specifications Directory/);
  assert.match(getAdlcAgentDiagramHtml("architecture-review"), /Existing Architecture Package/);
  assert.match(getAdlcAgentDiagramHtml("architecture-review"), /Development Guidelines/);
  assert.match(getAdlcAgentDiagramHtml("architecture-review"), /<div class="diagram-box">PRD<\/div>/);
  assert.match(getAdlcAgentDiagramHtml("architecture-review"), /Architecture Review Agent/);
  assert.match(getAdlcAgentDiagramHtml("architecture-review"), /Review Findings/);
  assert.ok(
    getAdlcAgentDiagramHtml("architecture-review").indexOf("Existing Architecture Package") <
      getAdlcAgentDiagramHtml("architecture-review").indexOf("Specifications Directory")
  );

  assert.equal(getAdlcAgentDiagramHtml("code-review"), undefined);
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

test("applyAdlcAgentInputDefaults prefills Architect Agent's specifications_directory, product_context, and development_guidelines", () => {
  const { applyAdlcAgentInputDefaults } = setupAdlcAgentsModule();
  const inputs = [
    { name: "specifications_directory", description: "", type: "directory", required: true },
    { name: "development_guidelines", description: "", type: "file", required: false },
    { name: "existing_architecture_package", description: "", type: "directory_or_files", required: false },
    { name: "product_context", description: "", type: "file_or_directory", required: false }
  ];

  const withDefaults = applyAdlcAgentInputDefaults("architect", inputs);
  assert.equal(withDefaults.find((i) => i.name === "specifications_directory").defaultValue, "docs/specs");
  assert.equal(
    withDefaults.find((i) => i.name === "development_guidelines").defaultValue,
    "docs/architecture/development_guidelines.md"
  );
  assert.equal(
    withDefaults.find((i) => i.name === "product_context").defaultValue,
    "docs/project_description/PRD.md"
  );
  assert.equal(withDefaults.find((i) => i.name === "existing_architecture_package").defaultValue, undefined);
});

test("applyAdlcAgentInputDefaults prefills Project Planner Agent's requirements_stream and technical_stream", () => {
  const { applyAdlcAgentInputDefaults } = setupAdlcAgentsModule();
  const inputs = [
    { name: "requirements_stream", description: "", type: "files_or_structured_data", required: true },
    { name: "technical_stream", description: "", type: "files_or_structured_data", required: true },
    { name: "design_stream", description: "", type: "files_or_structured_data", required: true }
  ];

  const withDefaults = applyAdlcAgentInputDefaults("project-planner", inputs);
  assert.equal(withDefaults.find((i) => i.name === "requirements_stream").defaultValue, "docs/specs");
  assert.equal(withDefaults.find((i) => i.name === "technical_stream").defaultValue, "docs/architecture");
  assert.equal(withDefaults.find((i) => i.name === "design_stream").defaultValue, undefined);
});

test("applyAdlcAgentInputLabelOverrides labels Project Planner Agent's requirements_stream and technical_stream", () => {
  const { applyAdlcAgentInputLabelOverrides } = setupAdlcAgentsModule();
  const inputs = [
    { name: "requirements_stream", description: "", type: "files_or_structured_data", required: true },
    { name: "technical_stream", description: "", type: "files_or_structured_data", required: true },
    { name: "design_stream", description: "", type: "files_or_structured_data", required: true }
  ];

  const overridden = applyAdlcAgentInputLabelOverrides("project-planner", inputs);
  assert.equal(overridden.find((i) => i.name === "requirements_stream").label, "Specifications Folder");
  assert.equal(overridden.find((i) => i.name === "technical_stream").label, "Architecture Documents");
  assert.equal(overridden.find((i) => i.name === "design_stream").label, undefined);
});

test("applyAdlcAgentInputDefaults also prefills Architecture Review Agent's existing_architecture_package", () => {
  const { applyAdlcAgentInputDefaults } = setupAdlcAgentsModule();
  const inputs = [
    { name: "specifications_directory", description: "", type: "directory", required: true },
    { name: "development_guidelines", description: "", type: "file", required: false },
    { name: "existing_architecture_package", description: "", type: "directory_or_files", required: false },
    { name: "product_context", description: "", type: "file_or_directory", required: false }
  ];

  const withDefaults = applyAdlcAgentInputDefaults("architecture-review", inputs);
  assert.equal(withDefaults.find((i) => i.name === "specifications_directory").defaultValue, "docs/specs");
  assert.equal(
    withDefaults.find((i) => i.name === "existing_architecture_package").defaultValue,
    "docs/architecture"
  );
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

test("applyAdlcAgentInputOrder moves Architecture Review Agent's existing_architecture_package to be first", () => {
  const { applyAdlcAgentInputOrder } = setupAdlcAgentsModule();
  const inputs = [
    { name: "specifications_directory", description: "", type: "directory", required: true },
    { name: "development_guidelines", description: "", type: "file", required: false },
    { name: "existing_architecture_package", description: "", type: "directory_or_files", required: true },
    { name: "product_context", description: "", type: "file_or_directory", required: false }
  ];

  const ordered = applyAdlcAgentInputOrder("architecture-review", inputs);
  assert.deepEqual(
    ordered.map((i) => i.name),
    ["existing_architecture_package", "specifications_directory", "development_guidelines", "product_context"]
  );

  const untouched = applyAdlcAgentInputOrder("architect", inputs);
  assert.deepEqual(untouched, inputs);
});

test("applyAdlcAgentInputOrder keeps unlisted inputs in their original relative order, after the listed ones", () => {
  const { applyAdlcAgentInputOrder } = setupAdlcAgentsModule();
  const inputs = [
    { name: "extra_one", description: "", type: "file", required: false },
    { name: "specifications_directory", description: "", type: "directory", required: true },
    { name: "extra_two", description: "", type: "file", required: false },
    { name: "existing_architecture_package", description: "", type: "directory_or_files", required: true }
  ];

  const ordered = applyAdlcAgentInputOrder("architecture-review", inputs);
  assert.deepEqual(
    ordered.map((i) => i.name),
    ["existing_architecture_package", "specifications_directory", "extra_one", "extra_two"]
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
      ["approved_prd", "existing_specifications"]
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
    - name: architecture_package
      description: Approved architecture, diagrams, and applicable ADRs.
      type: files_or_directory
    - name: workflow_configuration
      description: UX/UI design approval-gate configuration.
      type: file
  optional:
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
      ["approved_product_context", "architecture_package"]
    );
    const approvedProductContext = definition.inputs.find((i) => i.name === "approved_product_context");
    assert.equal(approvedProductContext.defaultValue, "docs/specs");
    assert.equal(approvedProductContext.required, true);
    assert.equal(approvedProductContext.type, "directory");
    assert.equal(approvedProductContext.label, "Specifications Directory");

    const architecturePackage = definition.inputs.find((i) => i.name === "architecture_package");
    assert.equal(architecturePackage.defaultValue, "docs/architecture");
    assert.equal(architecturePackage.required, false);

    assert.match(definition.diagramHtml, /UX Agent/);
    assert.match(definition.diagramHtml, /<div class="diagram-box">Specifications Directory<\/div>/);
    assert.match(definition.diagramHtml, /Architecture Package/);
    assert.match(definition.diagramHtml, /Design Package/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("loadAdlcAgentDefinition defaults Architect Agent's inputs and hides existing_architecture_package", () => {
  const { loadAdlcAgentDefinition } = setupAdlcAgentsModule();
  const architectAgentMarkdown = `---
name: architect-agent
description: Designs solution architecture from approved specifications.
inputs:
  required:
    - name: specifications_directory
      description: Approved specifications and technical constraints.
      type: directory
    - name: workflow_configuration
      description: Approval and judge-gate configuration.
      type: file
  optional:
    - name: development_guidelines
      description: Binding project engineering guidelines.
      type: file
    - name: existing_architecture_package
      description: Existing architecture, diagrams, and ADRs.
      type: directory_or_files
    - name: product_context
      description: Approved PRD and supporting product context.
      type: file_or_directory
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
      ["specifications_directory", "development_guidelines", "product_context"]
    );
    assert.equal(
      definition.inputs.find((i) => i.name === "specifications_directory").defaultValue,
      "docs/specs"
    );
    assert.equal(
      definition.inputs.find((i) => i.name === "development_guidelines").defaultValue,
      "docs/architecture/development_guidelines.md"
    );
    assert.equal(
      definition.inputs.find((i) => i.name === "product_context").defaultValue,
      "docs/project_description/PRD.md"
    );
    assert.equal(definition.inputs.find((i) => i.name === "product_context").type, "file");
    assert.equal(definition.inputs.find((i) => i.name === "product_context").label, "PRD");
    assert.match(definition.diagramHtml, /Architect Agent/);
    assert.match(definition.diagramHtml, /Specifications Directory/);
    assert.match(definition.diagramHtml, /Architecture Document/);
    assert.match(definition.diagramHtml, /<div class="diagram-box">PRD<\/div>/);
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
    - name: specifications_directory
      description: Approved specifications and technical constraints.
      type: directory
    - name: workflow_configuration
      description: Approval and judge-gate configuration.
      type: file
  optional:
    - name: development_guidelines
      description: Binding project engineering guidelines.
      type: file
    - name: existing_architecture_package
      description: Existing architecture, diagrams, and ADRs.
      type: directory_or_files
    - name: product_context
      description: Approved PRD and supporting product context.
      type: file_or_directory
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
      ["existing_architecture_package", "specifications_directory", "development_guidelines", "product_context"]
    );
    const existingArchitecturePackage = definition.inputs.find((i) => i.name === "existing_architecture_package");
    assert.equal(existingArchitecturePackage.required, true);
    assert.equal(existingArchitecturePackage.defaultValue, "docs/architecture");

    const productContext = definition.inputs.find((i) => i.name === "product_context");
    assert.equal(productContext.type, "file");
    assert.equal(productContext.label, "PRD");

    assert.match(definition.diagramHtml, /Architecture Review Agent/);
    assert.match(definition.diagramHtml, /Existing Architecture Package/);
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

test("applyAdlcAgentInputLabelOverrides labels UX Agent's approved_product_context as Specifications Directory, others untouched", () => {
  const { applyAdlcAgentInputLabelOverrides } = setupAdlcAgentsModule();
  const inputs = [
    { name: "approved_product_context", description: "", type: "directory", required: true },
    { name: "architecture_package", description: "", type: "files_or_directory", required: false }
  ];

  const overridden = applyAdlcAgentInputLabelOverrides("ux", inputs);
  assert.equal(overridden.find((i) => i.name === "approved_product_context").label, "Specifications Directory");
  assert.equal(overridden.find((i) => i.name === "architecture_package").label, undefined);

  const untouched = applyAdlcAgentInputLabelOverrides("architect", inputs);
  assert.deepEqual(untouched, inputs);
});

test("loadAdlcAgentDefinition labels and defaults requirements_stream and technical_stream, hides design_stream and backlog_destination", () => {
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
    - name: design_stream
      description: UX and accessibility tasks or validated not-applicable decision.
      type: files_or_structured_data
    - name: backlog_destination
      description: Configured Jira or Markdown system of record.
      type: structured_data
    - name: workflow_configuration
      description: Backlog approval and failure-tracking configuration.
      type: file
  optional:
    - name: existing_backlog
      description: Current items, dependencies, estimates, and statuses.
      type: files_or_structured_data
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
    assert.equal(requirementsStream.label, "Specifications Folder");

    const technicalStream = definition.inputs.find((i) => i.name === "technical_stream");
    assert.equal(technicalStream.defaultValue, "docs/architecture");
    assert.equal(technicalStream.label, "Architecture Documents");

    assert.deepEqual(
      definition.inputs.map((i) => i.name),
      ["requirements_stream", "technical_stream", "existing_backlog"]
    );
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

test("renderAdlcAgentRunHtml renders harness, model, input fields, and actions", () => {
  const { parseAdlcAgentFrontmatter, filterUserFacingAdlcInputs, applyAdlcAgentInputDefaults, renderAdlcAgentRunHtml } =
    setupAdlcAgentsModule();
  const parsed = parseAdlcAgentFrontmatter(FIXTURE_AGENT_MARKDOWN);
  const definition = {
    ...parsed,
    inputs: applyAdlcAgentInputDefaults("ba", filterUserFacingAdlcInputs(parsed.inputs, "ba")),
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
  assert.doesNotMatch(html, /data-input-name="supporting_evidence"/);
  assert.doesNotMatch(html, /data-input-name="alternative_input_contract"/);
  assert.match(html, /id="cancel-button"/);
  assert.match(html, /<button type="submit">Execute<\/button>/);
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

test("filterUserFacingAdlcInputs hides BA Agent's supporting_evidence and alternative_input_contract, and only for ba-agent", () => {
  const { isAdlcAgentHiddenInput, filterUserFacingAdlcInputs } = setupAdlcAgentsModule();
  const inputs = [
    { name: "approved_prd", description: "", type: "file", required: true },
    { name: "supporting_evidence", description: "", type: "file_or_directory", required: false },
    { name: "existing_specifications", description: "", type: "directory", required: false },
    { name: "alternative_input_contract", description: "", type: "text_or_files", required: false }
  ];

  assert.equal(isAdlcAgentHiddenInput("ba", "supporting_evidence"), true);
  assert.equal(isAdlcAgentHiddenInput("ba", "alternative_input_contract"), true);
  assert.equal(isAdlcAgentHiddenInput("ba", "existing_specifications"), false);
  assert.equal(isAdlcAgentHiddenInput("architect", "supporting_evidence"), false);

  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "ba").map((input) => input.name),
    ["approved_prd", "existing_specifications"]
  );
  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "architect").map((input) => input.name),
    inputs.map((input) => input.name)
  );
});

test("filterUserFacingAdlcInputs hides UX Agent's research_and_evidence and existing_experience_system, and only for ux", () => {
  const { isAdlcAgentHiddenInput, filterUserFacingAdlcInputs } = setupAdlcAgentsModule();
  const inputs = [
    { name: "approved_product_context", description: "", type: "files", required: true },
    { name: "architecture_package", description: "", type: "files_or_directory", required: true },
    { name: "research_and_evidence", description: "", type: "files_or_structured_data", required: false },
    { name: "existing_experience_system", description: "", type: "files_or_repository_state", required: false }
  ];

  assert.equal(isAdlcAgentHiddenInput("ux", "research_and_evidence"), true);
  assert.equal(isAdlcAgentHiddenInput("ux", "existing_experience_system"), true);
  assert.equal(isAdlcAgentHiddenInput("ux", "approved_product_context"), false);
  assert.equal(isAdlcAgentHiddenInput("architect", "research_and_evidence"), false);

  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "ux").map((input) => input.name),
    ["approved_product_context", "architecture_package"]
  );
  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "architect").map((input) => input.name),
    inputs.map((input) => input.name)
  );
});

test("filterUserFacingAdlcInputs hides Architect Agent's existing_architecture_package, but keeps it for architecture-review", () => {
  const { isAdlcAgentHiddenInput, filterUserFacingAdlcInputs } = setupAdlcAgentsModule();
  const inputs = [
    { name: "specifications_directory", description: "", type: "directory", required: true },
    { name: "development_guidelines", description: "", type: "file", required: false },
    { name: "existing_architecture_package", description: "", type: "directory_or_files", required: false },
    { name: "product_context", description: "", type: "file_or_directory", required: false }
  ];

  assert.equal(isAdlcAgentHiddenInput("architect", "existing_architecture_package"), true);
  assert.equal(isAdlcAgentHiddenInput("architect", "development_guidelines"), false);
  assert.equal(isAdlcAgentHiddenInput("architecture-review", "existing_architecture_package"), false);
  assert.equal(isAdlcAgentHiddenInput("ux", "existing_architecture_package"), false);

  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "architect").map((input) => input.name),
    ["specifications_directory", "development_guidelines", "product_context"]
  );
  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "architecture-review").map((input) => input.name),
    inputs.map((input) => input.name)
  );
});

test("filterUserFacingAdlcInputs hides Project Planner Agent's design_stream and backlog_destination, and only for project-planner", () => {
  const { isAdlcAgentHiddenInput, filterUserFacingAdlcInputs } = setupAdlcAgentsModule();
  const inputs = [
    { name: "requirements_stream", description: "", type: "files_or_structured_data", required: true },
    { name: "technical_stream", description: "", type: "files_or_structured_data", required: true },
    { name: "design_stream", description: "", type: "files_or_structured_data", required: true },
    { name: "backlog_destination", description: "", type: "structured_data", required: true }
  ];

  assert.equal(isAdlcAgentHiddenInput("project-planner", "design_stream"), true);
  assert.equal(isAdlcAgentHiddenInput("project-planner", "backlog_destination"), true);
  assert.equal(isAdlcAgentHiddenInput("project-planner", "requirements_stream"), false);
  assert.equal(isAdlcAgentHiddenInput("ux", "design_stream"), false);

  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "project-planner").map((input) => input.name),
    ["requirements_stream", "technical_stream"]
  );
  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "ux").map((input) => input.name),
    inputs.map((input) => input.name)
  );
});

test("renderAdlcAgentRunHtml renders the default artifacts directory as an editable field with Browse", () => {
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
          name: "artifacts_directory",
          description: "Notes, meeting analyses, product descriptions, briefs, and other input artifacts for this agent.",
          type: "directory",
          required: true,
          defaultValue: "docs/product-definition"
        }
      ]
    },
    { defaultHarness: "claude", defaultModel: "" }
  );
  assert.match(
    withArtifactsDir,
    /data-input-name="artifacts_directory" data-required="true" value="docs\/product-definition"/
  );
  assert.match(withArtifactsDir, /data-browse="artifacts_directory" data-kind="folder"/);
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
  const diagramIndex = withDiagram.indexOf('<div class="diagram">');
  assert.ok(descriptionIndex >= 0);
  assert.ok(diagramIndex > descriptionIndex);
  assert.match(withDiagram, /Meeting Notes Folder/);
  assert.match(withDiagram, /Project Description File/);

  const withoutDiagram = renderAdlcAgentRunHtml(
    { cspSource: "vscode-resource:" },
    {
      id: "code-review",
      label: "Code Review Agent",
      folder: "code-review-agent",
      filePath: "",
      description: "Reviews code for correctness, security, and maintainability.",
      inputs: []
    },
    { defaultHarness: "claude", defaultModel: "" }
  );
  assert.doesNotMatch(withoutDiagram, /class="diagram"/);
});
