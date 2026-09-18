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

test("buildAdlcAgentPrompt points to the default artifacts directory when the agent declares one", () => {
  const { buildAdlcAgentPrompt } = setupAdlcAgentsModule();
  const definition = {
    id: "product",
    label: "Product Agent",
    folder: "product-agent",
    filePath: "",
    description: "",
    inputs: [],
    defaultArtifactsDir: "docs/product-definition"
  };
  const prompt = buildAdlcAgentPrompt(definition, {
    harness: "claude",
    model: "",
    inputs: {},
    additionalInstructions: ""
  });

  assert.match(prompt, /Use `docs\/product-definition` as the default source of input artifacts/);
});

test("getAdlcAgentDefaultArtifactsDir returns the known folder for product-agent and undefined otherwise", () => {
  const { getAdlcAgentDefaultArtifactsDir } = setupAdlcAgentsModule();
  assert.equal(getAdlcAgentDefaultArtifactsDir("product-agent"), "docs/product-definition");
  assert.equal(getAdlcAgentDefaultArtifactsDir("ba-agent"), undefined);
});

test("loadAdlcAgentDefinition attaches defaultArtifactsDir for product-agent", () => {
  const { loadAdlcAgentDefinition } = setupAdlcAgentsModule();
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "adlc-agents-test-"));
  try {
    fs.mkdirSync(path.join(repoRoot, ".agents", "agents", "product-agent"), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, ".agents", "agents", "product-agent", "product-agent.md"),
      "---\nname: product-agent\ndescription: Owns the WHY.\n---\n# Product\n"
    );

    const definition = loadAdlcAgentDefinition(repoRoot, { id: "product", label: "Product Agent", folder: "product-agent" });

    assert.deepEqual(definition.inputs, []);
    assert.equal(definition.defaultArtifactsDir, "docs/product-definition");
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
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

  const withDefaults = applyAdlcAgentInputDefaults("ba-agent", inputs);
  assert.equal(withDefaults.find((i) => i.name === "approved_prd").defaultValue, "docs/project_description/PRD.md");
  assert.equal(withDefaults.find((i) => i.name === "existing_specifications").defaultValue, "docs/specs");
  assert.equal(withDefaults.find((i) => i.name === "supporting_evidence").defaultValue, undefined);

  const withoutDefaults = applyAdlcAgentInputDefaults("architect-agent", inputs);
  assert.deepEqual(withoutDefaults, inputs);
});

test("applyAdlcAgentInputDefaults prefills UX Agent's approved_product_context and architecture_package", () => {
  const { applyAdlcAgentInputDefaults } = setupAdlcAgentsModule();
  const inputs = [
    { name: "approved_product_context", description: "", type: "files", required: true },
    { name: "architecture_package", description: "", type: "files_or_directory", required: true },
    { name: "research_and_evidence", description: "", type: "files_or_structured_data", required: false }
  ];

  const withDefaults = applyAdlcAgentInputDefaults("ux-agent", inputs);
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

  const withDefaults = applyAdlcAgentInputDefaults("architect-agent", inputs);
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

test("applyAdlcAgentInputRequiredOverrides relaxes UX Agent's architecture_package to optional, others untouched", () => {
  const { applyAdlcAgentInputRequiredOverrides } = setupAdlcAgentsModule();
  const inputs = [
    { name: "approved_product_context", description: "", type: "files", required: true },
    { name: "architecture_package", description: "", type: "files_or_directory", required: true },
    { name: "research_and_evidence", description: "", type: "files_or_structured_data", required: false }
  ];

  const overridden = applyAdlcAgentInputRequiredOverrides("ux-agent", inputs);
  assert.equal(overridden.find((i) => i.name === "approved_product_context").required, true);
  assert.equal(overridden.find((i) => i.name === "architecture_package").required, false);
  assert.equal(overridden.find((i) => i.name === "research_and_evidence").required, false);

  const untouched = applyAdlcAgentInputRequiredOverrides("architect-agent", inputs);
  assert.deepEqual(untouched, inputs);
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

    const architecturePackage = definition.inputs.find((i) => i.name === "architecture_package");
    assert.equal(architecturePackage.defaultValue, "docs/architecture");
    assert.equal(architecturePackage.required, false);
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
    inputs: applyAdlcAgentInputDefaults("ba-agent", filterUserFacingAdlcInputs(parsed.inputs, "ba-agent")),
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

test("filterUserFacingAdlcInputs hides BA Agent's supporting_evidence and alternative_input_contract, and only for ba-agent", () => {
  const { isAdlcAgentHiddenInput, filterUserFacingAdlcInputs } = setupAdlcAgentsModule();
  const inputs = [
    { name: "approved_prd", description: "", type: "file", required: true },
    { name: "supporting_evidence", description: "", type: "file_or_directory", required: false },
    { name: "existing_specifications", description: "", type: "directory", required: false },
    { name: "alternative_input_contract", description: "", type: "text_or_files", required: false }
  ];

  assert.equal(isAdlcAgentHiddenInput("ba-agent", "supporting_evidence"), true);
  assert.equal(isAdlcAgentHiddenInput("ba-agent", "alternative_input_contract"), true);
  assert.equal(isAdlcAgentHiddenInput("ba-agent", "existing_specifications"), false);
  assert.equal(isAdlcAgentHiddenInput("architect-agent", "supporting_evidence"), false);

  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "ba-agent").map((input) => input.name),
    ["approved_prd", "existing_specifications"]
  );
  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "architect-agent").map((input) => input.name),
    inputs.map((input) => input.name)
  );
});

test("filterUserFacingAdlcInputs hides UX Agent's research_and_evidence and existing_experience_system, and only for ux-agent", () => {
  const { isAdlcAgentHiddenInput, filterUserFacingAdlcInputs } = setupAdlcAgentsModule();
  const inputs = [
    { name: "approved_product_context", description: "", type: "files", required: true },
    { name: "architecture_package", description: "", type: "files_or_directory", required: true },
    { name: "research_and_evidence", description: "", type: "files_or_structured_data", required: false },
    { name: "existing_experience_system", description: "", type: "files_or_repository_state", required: false }
  ];

  assert.equal(isAdlcAgentHiddenInput("ux-agent", "research_and_evidence"), true);
  assert.equal(isAdlcAgentHiddenInput("ux-agent", "existing_experience_system"), true);
  assert.equal(isAdlcAgentHiddenInput("ux-agent", "approved_product_context"), false);
  assert.equal(isAdlcAgentHiddenInput("architect-agent", "research_and_evidence"), false);

  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "ux-agent").map((input) => input.name),
    ["approved_product_context", "architecture_package"]
  );
  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "architect-agent").map((input) => input.name),
    inputs.map((input) => input.name)
  );
});

test("filterUserFacingAdlcInputs hides Architect Agent's existing_architecture_package, and only for architect-agent", () => {
  const { isAdlcAgentHiddenInput, filterUserFacingAdlcInputs } = setupAdlcAgentsModule();
  const inputs = [
    { name: "specifications_directory", description: "", type: "directory", required: true },
    { name: "development_guidelines", description: "", type: "file", required: false },
    { name: "existing_architecture_package", description: "", type: "directory_or_files", required: false },
    { name: "product_context", description: "", type: "file_or_directory", required: false }
  ];

  assert.equal(isAdlcAgentHiddenInput("architect-agent", "existing_architecture_package"), true);
  assert.equal(isAdlcAgentHiddenInput("architect-agent", "development_guidelines"), false);
  assert.equal(isAdlcAgentHiddenInput("ux-agent", "existing_architecture_package"), false);

  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "architect-agent").map((input) => input.name),
    ["specifications_directory", "development_guidelines", "product_context"]
  );
  assert.deepEqual(
    filterUserFacingAdlcInputs(inputs, "ux-agent").map((input) => input.name),
    inputs.map((input) => input.name)
  );
});

test("renderAdlcAgentRunHtml shows the default-artifacts hint instead of the empty-inputs message", () => {
  const { renderAdlcAgentRunHtml } = setupAdlcAgentsModule();
  const withArtifactsDir = renderAdlcAgentRunHtml(
    { cspSource: "vscode-resource:" },
    { id: "product", label: "Product Agent", folder: "product-agent", filePath: "", description: "", inputs: [], defaultArtifactsDir: "docs/product-definition" },
    { defaultHarness: "claude", defaultModel: "" }
  );
  assert.match(
    withArtifactsDir,
    /This agent uses artifacts from docs\/product-definition as input\. If you want to add other inputs specify them on the request below/
  );
  assert.doesNotMatch(withArtifactsDir, /This agent declares no input artifacts/);

  const withoutArtifactsDir = renderAdlcAgentRunHtml(
    { cspSource: "vscode-resource:" },
    { id: "sdlc-orchestrator", label: "SDLC Orchestrator Agent", folder: "sdlc-orchestrator", filePath: "", description: "", inputs: [] },
    { defaultHarness: "claude", defaultModel: "" }
  );
  assert.match(withoutArtifactsDir, /This agent declares no input artifacts\. Describe the request below\./);
});
