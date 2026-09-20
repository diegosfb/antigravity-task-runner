import * as fs from "fs";
import * as path from "path";
import type * as vscode from "vscode";
import { getNonce } from "./settings";
import { quoteShellArg } from "./shellUtils";

export type AdlcAgentCatalogEntry = {
  id: string;
  label: string;
  folder: string;
  promptHint?: string;
};

export const ADLC_AGENT_CATALOG: readonly AdlcAgentCatalogEntry[] = [
  { id: "product", label: "Product Agent", folder: "product-agent" },
  { id: "ba", label: "BA Agent", folder: "ba-agent" },
  { id: "ux", label: "UX Agent", folder: "ux-agent" },
  { id: "architect", label: "Architect Agent", folder: "architect-agent" },
  {
    id: "architecture-review",
    label: "Architecture Review Agent",
    folder: "architect-agent",
    promptHint:
      "Operate in review mode: do not produce a new architecture package. Review the existing architecture package against the specifications, report gaps, risks, and inconsistencies, and propose prioritized corrections."
  },
  { id: "project-planner", label: "Project Planner Agent", folder: "project-planner-agent" },
  { id: "test", label: "Create Tests Agent", folder: "test-agent" },
  { id: "coding", label: "Coding Agent", folder: "developer-agent" },
  { id: "code-review", label: "Code Review Agent", folder: "code-review-agent" },
  { id: "documentation", label: "Documentation Agent", folder: "documentation-agent" },
  { id: "spec-validation", label: "Spec Validation Agent", folder: "spec-validation-agent" },
  { id: "deployment", label: "Deployment Agent", folder: "deployment-agent" },
  { id: "sdlc-orchestrator", label: "SDLC Orchestrator Agent", folder: "sdlc-orchestrator" }
];

export function findAdlcAgentCatalogEntry(id: string): AdlcAgentCatalogEntry | undefined {
  return ADLC_AGENT_CATALOG.find((entry) => entry.id === id);
}

export type AdlcAgentInput = {
  name: string;
  description: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  label?: string;
};

export const ARCHITECTURE_MODES = ["new_architecture", "existing_architecture_expansion"] as const;
export type ArchitectureMode = (typeof ARCHITECTURE_MODES)[number];

// Conventional repo paths for an agent's inputs, per the workflow described in
// its own agent definition (e.g. ba-agent consumes the PRD that product-agent
// writes, and reconciles against the existing specs directory). Prefilled as
// a starting point on the run page; the user can still edit or clear them.
// Keyed by catalog entry id, not folder: Architect Agent and Architecture
// Review Agent share architect-agent.md but need different defaults (the
// review agent's whole job is reviewing the existing architecture package).
const ADLC_AGENT_INPUT_DEFAULTS: Record<string, Record<string, string>> = {
  product: {
    product_definition_source: path.posix.join("docs", "product-definition")
  },
  ba: {
    approved_prd: path.posix.join("docs", "project_description", "PRD.md"),
    existing_specifications: path.posix.join("docs", "specs")
  },
  ux: {
    approved_product_context: path.posix.join("docs", "specs"),
    architecture_package: path.posix.join("docs", "architecture")
  },
  architect: {
    specification_source: path.posix.join("docs", "specs"),
    prd_file: path.posix.join("docs", "project_description", "PRD.md"),
    existing_architecture_package: path.posix.join("docs", "architecture")
  },
  "architecture-review": {
    specification_source: path.posix.join("docs", "specs"),
    prd_file: path.posix.join("docs", "project_description", "PRD.md"),
    existing_architecture_package: path.posix.join("docs", "architecture")
  },
  "project-planner": {
    requirements_stream: path.posix.join("docs", "specs"),
    technical_stream: path.posix.join("docs", "architecture"),
    design_package: path.posix.join("docs", "design"),
    existing_backlog: path.posix.join("docs", "backlog")
  },
  coding: {
    backlog_item: path.posix.join("docs", "backlog")
  }
};

// Relaxes or tightens what an agent's own frontmatter declares as required,
// for inputs where the run page's enforcement should differ from the
// frontmatter (e.g. UX Agent's architecture package may not exist yet for
// early design work, while Architecture Review Agent cannot run without the
// existing architecture package it is reviewing). Keyed by catalog entry id.
const ADLC_AGENT_INPUT_REQUIRED_OVERRIDES: Record<string, Record<string, boolean>> = {
  ux: { architecture_package: false },
  "architecture-review": { existing_architecture_package: true }
};

export function applyAdlcAgentInputRequiredOverrides(entryId: string, inputs: AdlcAgentInput[]): AdlcAgentInput[] {
  const overrides = ADLC_AGENT_INPUT_REQUIRED_OVERRIDES[entryId];
  if (!overrides) return inputs;
  return inputs.map((input) => {
    const override = overrides[input.name];
    return override === undefined ? input : { ...input, required: override };
  });
}

// Narrows what an agent's own frontmatter declares as an input's type, when
// the run page's type hint and Browse picker should be more specific than
// the frontmatter allows (e.g. Architecture Review Agent's product_context
// is always the single PRD file, never a directory).
const ADLC_AGENT_INPUT_TYPE_OVERRIDES: Record<string, Record<string, string>> = {
  architect: { product_context: "file", prd_file: "file" },
  "architecture-review": { product_context: "file" },
  ux: { approved_product_context: "directory" }
};

export function applyAdlcAgentInputTypeOverrides(entryId: string, inputs: AdlcAgentInput[]): AdlcAgentInput[] {
  const overrides = ADLC_AGENT_INPUT_TYPE_OVERRIDES[entryId];
  if (!overrides) return inputs;
  return inputs.map((input) => {
    const override = overrides[input.name];
    return override === undefined ? input : { ...input, type: override };
  });
}

// Friendlier display label for an input, shown on the run page in place of
// its raw frontmatter name (e.g. "product_context" reads as "PRD" for the
// architect agents, since that is always what it points to). The underlying
// name is unchanged -- it is still what request.inputs and the prompt key by.
const ADLC_AGENT_INPUT_LABEL_OVERRIDES: Record<string, Record<string, string>> = {
  product: {
    product_definition_source: "Product Definition",
    supporting_evidence: "Supporting Evidence"
  },
  architect: {
    product_context: "PRD",
    prd_file: "PRD",
    existing_architecture_package: "Existing Architecture Folder",
    specification_source: "Specification Directory or File",
    architecture_guidelines: "Architecture Guidelines"
  },
  "architecture-review": {
    product_context: "PRD",
    prd_file: "PRD",
    existing_architecture_package: "Existing Architecture Folder",
    specification_source: "Specification Directory or File",
    architecture_guidelines: "Architecture Guidelines"
  },
  ux: {
    approved_product_context: "Specifications Directory",
    architecture_package: "Architecture Package",
    research_and_evidence: "Research and Evidence",
    existing_experience_system: "Existing Experience System"
  },
  "project-planner": {
    requirements_stream: "Specifications Directory",
    technical_stream: "Architecture Folder",
    design_package: "Design Package",
    existing_backlog: "Existing Backlog"
  },
  coding: {
    backlog_item: "Backlog",
    user_story_or_specification: "User Story or Specification"
  },
  "code-review": { review_candidate: "Pull Request" }
};

export function applyAdlcAgentInputLabelOverrides(entryId: string, inputs: AdlcAgentInput[]): AdlcAgentInput[] {
  const overrides = ADLC_AGENT_INPUT_LABEL_OVERRIDES[entryId];
  if (!overrides) return inputs;
  return inputs.map((input) => {
    const override = overrides[input.name];
    return override === undefined ? input : { ...input, label: override };
  });
}

// Overrides the run-page display order of an agent's inputs away from their
// order in the frontmatter (e.g. Architecture Review Agent should see
// existing_architecture_package -- the package it is reviewing -- before
// development_guidelines). Names not listed keep their original relative
// order and are placed after the listed ones.
const ADLC_AGENT_INPUT_ORDER: Record<string, string[]> = {
  product: ["product_definition_source", "supporting_evidence"],
  ba: ["approved_prd", "existing_specifications", "supporting_evidence"],
  ux: ["approved_product_context", "architecture_package", "research_and_evidence", "existing_experience_system"],
  architect: ["specification_source", "existing_architecture_package", "prd_file", "architecture_guidelines"],
  "architecture-review": [
    "existing_architecture_package",
    "specification_source",
    "prd_file",
    "architecture_guidelines"
  ]
};

export function applyAdlcAgentInputOrder(entryId: string, inputs: AdlcAgentInput[]): AdlcAgentInput[] {
  const order = ADLC_AGENT_INPUT_ORDER[entryId];
  if (!order) return inputs;
  const orderIndex = new Map(order.map((name, index) => [name, index]));
  return [...inputs].sort((a, b) => {
    const aIndex = orderIndex.get(a.name) ?? order.length;
    const bIndex = orderIndex.get(b.name) ?? order.length;
    return aIndex - bIndex;
  });
}

// Fully custom input fields for an agent, appended after whatever real
// frontmatter inputs remain visible. Used when the agent's
// declared inputs don't match how the run page should ask for them at all,
// rather than just needing a default, label, type, or order tweak.
const ADLC_AGENT_SYNTHETIC_INPUTS: Record<string, AdlcAgentInput[]> = {
  test: [
    {
      name: "backlog",
      label: "Backlog",
      description: "The backlog contains user stories sequenced by dependencies.",
      type: "directory",
      required: false,
      defaultValue: path.posix.join("docs", "backlog")
    },
    {
      name: "user_story_or_specification",
      label: "User Story or Specification",
      description: "A single user story or specification to create tests for instead of the whole backlog.",
      type: "file_or_directory",
      required: false
    }
  ]
};

export function getAdlcAgentSyntheticInputs(entryId: string): AdlcAgentInput[] {
  return ADLC_AGENT_SYNTHETIC_INPUTS[entryId] ?? [];
}

// A small static diagram shown after an agent's description, illustrating
// its inputs and output. Plain HTML/CSS boxes and arrows rather than a
// client-rendered diagram library, since the page's CSP does not load
// remote scripts and these diagrams never change at runtime. Keyed by
// catalog entry id.
const ADLC_AGENT_DIAGRAM_HTML: Record<string, string> = {
  product: `
      <div class="diagram diagram-product">
        <div class="diagram-row">
          <div class="diagram-group">
            <div class="diagram-group-label">Inputs</div>
            <div class="diagram-group-boxes">
              <div class="diagram-box diagram-box-required">Product Definition</div>
              <div class="diagram-box diagram-box-optional">Supporting Evidence</div>
            </div>
          </div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-box diagram-box-emphasis">Product Agent</div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-box diagram-box-output">PRD</div>
        </div>
      </div>`,
  ba: `
      <div class="diagram diagram-ba">
        <div class="diagram-row">
          <div class="diagram-group">
            <div class="diagram-group-label">Inputs</div>
            <div class="diagram-group-boxes">
              <div class="diagram-box diagram-box-required">Approved PRD</div>
              <div class="diagram-box diagram-box-optional">Existing Specifications</div>
              <div class="diagram-box diagram-box-optional">Supporting Evidence</div>
            </div>
          </div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-box diagram-box-emphasis">BA Agent</div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-box diagram-box-output">Specifications</div>
        </div>
      </div>`,
  ux: `
      <div class="diagram diagram-ux">
        <div class="diagram-row">
          <div class="diagram-group">
            <div class="diagram-group-label">Inputs</div>
            <div class="diagram-group-boxes">
              <div class="diagram-box diagram-box-required">Specifications Directory</div>
              <div class="diagram-box diagram-box-optional">Architecture Package</div>
              <div class="diagram-box diagram-box-optional">Research and Evidence</div>
              <div class="diagram-box diagram-box-optional">Existing Experience System</div>
            </div>
          </div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-box diagram-box-emphasis">UX Agent</div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-group-boxes">
            <div class="diagram-group diagram-group-output">
              <div class="diagram-group-label">Design Package</div>
              <div class="diagram-group-boxes">
                <div class="diagram-box diagram-box-output">Design Document</div>
                <div class="diagram-box diagram-box-output">Wireframes</div>
              </div>
            </div>
            <div class="diagram-box diagram-box-output">Specs Updated with UX Design</div>
          </div>
        </div>
      </div>`,
  architect: `
      <div class="diagram diagram-architect">
        <div class="diagram-row">
          <div class="diagram-group">
            <div class="diagram-group-label">Inputs</div>
            <div class="diagram-group-boxes">
              <div class="diagram-box diagram-box-required">Specification Directory or File</div>
              <div class="diagram-box diagram-box-optional">Existing Architecture Folder</div>
              <div class="diagram-box diagram-box-optional">PRD</div>
              <div class="diagram-box diagram-box-optional">Architecture Guidelines</div>
            </div>
          </div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-box diagram-box-emphasis">Architect Agent</div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-group diagram-group-output">
            <div class="diagram-group-label">Architecture Folder</div>
            <div class="diagram-group-boxes">
              <div class="diagram-box diagram-box-output">Architecture Document</div>
              <div class="diagram-box diagram-box-output">ADRs</div>
            </div>
          </div>
        </div>
      </div>`,
  "architecture-review": `
      <div class="diagram diagram-architecture-review">
        <div class="diagram-row">
          <div class="diagram-group">
            <div class="diagram-group-label">Inputs</div>
            <div class="diagram-group-boxes">
              <div class="diagram-box diagram-box-required">Existing Architecture Folder</div>
              <div class="diagram-box diagram-box-required">Specification Directory or File</div>
              <div class="diagram-box diagram-box-optional">PRD</div>
              <div class="diagram-box diagram-box-optional">Architecture Guidelines</div>
            </div>
          </div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-box diagram-box-emphasis">Architecture Review Agent</div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-box diagram-box-output">Review Findings</div>
        </div>
      </div>`,
  "project-planner": `
      <div class="diagram diagram-project-planner">
        <div class="diagram-row">
          <div class="diagram-group">
            <div class="diagram-group-label">Inputs</div>
            <div class="diagram-group-boxes">
              <div class="diagram-box diagram-box-required">Specifications Directory</div>
              <div class="diagram-box diagram-box-required">Architecture Folder</div>
              <div class="diagram-box diagram-box-optional">Design Package</div>
              <div class="diagram-box diagram-box-optional">Existing Backlog</div>
            </div>
          </div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-box diagram-box-emphasis">Project Planner Agent</div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-box diagram-box-output">Backlog</div>
        </div>
      </div>`,
  test: `
      <div class="diagram diagram-test">
        <div class="diagram-row">
          <div class="diagram-group">
            <div class="diagram-group-label">Inputs</div>
            <div class="diagram-group-boxes">
              <div class="diagram-box diagram-box-optional">Backlog</div>
              <div class="diagram-box diagram-box-optional">User Story or Specification</div>
            </div>
          </div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-box diagram-box-emphasis">Create Tests Agent</div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-group diagram-group-output">
            <div class="diagram-group-label">src</div>
            <div class="diagram-group-boxes">
              <div class="diagram-box diagram-box-output">Tests</div>
            </div>
          </div>
        </div>
      </div>`,
  coding: `
      <div class="diagram diagram-coding">
        <div class="diagram-row">
          <div class="diagram-group">
            <div class="diagram-group-label">Inputs (one required)</div>
            <div class="diagram-group-boxes">
              <div class="diagram-box diagram-box-optional">Backlog</div>
              <div class="diagram-box diagram-box-optional">User Story or Specification</div>
            </div>
          </div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-box diagram-box-emphasis">Coding Agent</div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-group diagram-group-output">
            <div class="diagram-group-label">src</div>
            <div class="diagram-group-boxes">
              <div class="diagram-box diagram-box-output">Source Code</div>
              <div class="diagram-box diagram-box-output">Pull Request</div>
            </div>
          </div>
        </div>
      </div>`,
  "code-review": `
      <div class="diagram diagram-code-review">
        <div class="diagram-row">
          <div class="diagram-group">
            <div class="diagram-group-label">Inputs</div>
            <div class="diagram-group-boxes">
              <div class="diagram-box diagram-box-required">Pull Request</div>
            </div>
          </div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-box diagram-box-emphasis">Code Review Agent</div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-box diagram-box-output">PR Merge</div>
        </div>
      </div>`,
  deployment: `
      <div class="diagram diagram-deployment">
        <div class="diagram-row">
          <div class="diagram-group">
            <div class="diagram-group-label">Inputs</div>
            <div class="diagram-group-boxes">
              <div class="diagram-box diagram-box-required">Approved Merged PR</div>
              <div class="diagram-box diagram-box-required">Release Configuration</div>
              <div class="diagram-box diagram-box-optional">Pre-Deployment Script</div>
              <div class="diagram-box diagram-box-optional">Post-Deployment Script</div>
              <div class="diagram-box diagram-box-optional">Prior Release State</div>
              <div class="diagram-box diagram-box-optional">Pre-Release Evidence</div>
            </div>
          </div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-box diagram-box-emphasis">Deployment Agent</div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-group diagram-group-output">
            <div class="diagram-group-label">Outputs</div>
            <div class="diagram-group-boxes">
              <div class="diagram-box diagram-box-output">Live Release</div>
              <div class="diagram-box diagram-box-output">Deployment Record</div>
              <div class="diagram-box diagram-box-output">Rollback Artifact</div>
              <div class="diagram-box diagram-box-output">Post-Deploy Evidence</div>
            </div>
          </div>
        </div>
      </div>`,
  "sdlc-orchestrator": `
      <div class="diagram diagram-sdlc-orchestrator">
        <div class="diagram-row">
          <div class="diagram-group">
            <div class="diagram-group-label">Inputs</div>
            <div class="diagram-group-boxes">
              <div class="diagram-box diagram-box-required">User Request</div>
            </div>
          </div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-box diagram-box-emphasis">SDLC Orchestrator Agent</div>
          <div class="diagram-arrow">&#8594;</div>
          <div class="diagram-box diagram-box-output">Delegation to Appropriate Agent(s)</div>
        </div>
      </div>`
};

export function getAdlcAgentDiagramHtml(entryId: string): string | undefined {
  return ADLC_AGENT_DIAGRAM_HTML[entryId];
}

export type AdlcAgentDefinition = {
  id: string;
  label: string;
  folder: string;
  filePath: string;
  description: string;
  inputs: AdlcAgentInput[];
  architectureMode?: ArchitectureMode;
  architectureModeReason?: string;
  promptHint?: string;
  diagramHtml?: string;
};

export function getAdlcAgentRelativePath(folder: string): string {
  return path.posix.join(".agents", "agents", folder, `${folder}.md`);
}

export function getAdlcAgentFilePath(repoRoot: string, folder: string): string {
  return path.join(repoRoot, ".agents", "agents", folder, `${folder}.md`);
}

export function adlcAgentExists(repoRoot: string, folder: string): boolean {
  return fs.existsSync(getAdlcAgentFilePath(repoRoot, folder));
}

function stripYamlScalar(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseAdlcAgentFrontmatter(markdown: string): { description: string; inputs: AdlcAgentInput[] } {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  if (lines[0]?.trim() !== "---") {
    return { description: "", inputs: [] };
  }
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  const body = end === -1 ? lines.slice(1) : lines.slice(1, end);

  let description = "";
  const inputs: AdlcAgentInput[] = [];
  let inInputs = false;
  let section: "required" | "optional" | undefined;
  let current: AdlcAgentInput | undefined;

  for (const line of body) {
    if (!line.trim()) continue;
    if (/^\S/.test(line)) {
      inInputs = /^inputs:\s*$/.test(line);
      section = undefined;
      current = undefined;
      const descriptionMatch = /^description:\s*(.*)$/.exec(line);
      if (descriptionMatch) description = stripYamlScalar(descriptionMatch[1]);
      continue;
    }
    if (!inInputs) continue;

    const trimmed = line.trim();
    const sectionMatch = /^(required|optional):\s*$/.exec(trimmed);
    if (sectionMatch) {
      section = sectionMatch[1] as "required" | "optional";
      current = undefined;
      continue;
    }
    if (!section) continue;

    const nameMatch = /^-\s*name:\s*(.*)$/.exec(trimmed);
    if (nameMatch) {
      current = {
        name: stripYamlScalar(nameMatch[1]),
        description: "",
        type: "",
        required: section === "required"
      };
      inputs.push(current);
      continue;
    }
    if (!current) continue;
    const fieldMatch = /^(description|type):\s*(.*)$/.exec(trimmed);
    if (fieldMatch) {
      current[fieldMatch[1] as "description" | "type"] = stripYamlScalar(fieldMatch[2]);
    }
  }

  return { description, inputs };
}

// These inputs are fixed-path repo settings/config files (read directly by the
// agent from its own conventions), never something the user picks on the run
// page, so they are excluded from every agent's user-facing input list.
const DEFAULT_INPUT_FILES: Record<string, string> = {
  workflow_configuration: "ADLC_workflow_settings.json",
  routing_registry: "routing-registry.yaml"
};

export function isAdlcAutoConfigInput(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(DEFAULT_INPUT_FILES, name);
}

// Inputs hidden for a specific agent because they add no practical value on
// the run page for that agent (e.g. BA Agent's alternative_input_contract is a
// specialized to-spec path better handled through explicit workflow routing).
// Keyed by catalog entry id: Architect Agent hides existing_architecture_package
// (it is authoring a new package), but Architecture Review Agent needs that
// same input as its primary, mandatory subject, so it is not hidden there.
const ADLC_AGENT_HIDDEN_INPUTS: Record<string, string[]> = {
  ba: ["alternative_input_contract"],
  architect: ["architecture_mode", "development_guidelines"],
  "project-planner": ["backlog_destination", "execution_evidence"],
  test: [
    "candidate_revision",
    "acceptance_criteria",
    "governing_context",
    "test_environment",
    "prior_test_evidence",
    "red_team_target"
  ],
  coding: ["repository_state", "feedback_context"],
  "code-review": ["verification_evidence", "governing_contracts", "prior_review_context"]
};

export function isAdlcAgentHiddenInput(entryId: string, name: string): boolean {
  return (ADLC_AGENT_HIDDEN_INPUTS[entryId] ?? []).includes(name);
}

export function filterUserFacingAdlcInputs(inputs: AdlcAgentInput[], entryId?: string): AdlcAgentInput[] {
  return inputs.filter(
    (input) => !isAdlcAutoConfigInput(input.name) && !(entryId && isAdlcAgentHiddenInput(entryId, input.name))
  );
}

export function applyAdlcAgentInputDefaults(entryId: string, inputs: AdlcAgentInput[]): AdlcAgentInput[] {
  const defaults = ADLC_AGENT_INPUT_DEFAULTS[entryId];
  if (!defaults) return inputs;
  return inputs.map((input) => {
    const defaultValue = defaults[input.name];
    return defaultValue ? { ...input, defaultValue } : input;
  });
}

export type ArchitectArchitectureModeDetection = {
  mode: ArchitectureMode;
  reason: string;
};

export function detectArchitectArchitectureMode(repoRoot: string): ArchitectArchitectureModeDetection {
  const architectureRoot = path.join(repoRoot, "docs", "architecture");
  const architectureDocumentExists = fs.existsSync(path.join(architectureRoot, "architecture.md"));
  const adrDirectory = path.join(architectureRoot, "adrs");
  let adrEvidenceExists = false;

  if (fs.existsSync(adrDirectory)) {
    try {
      adrEvidenceExists = fs.readdirSync(adrDirectory).some((name) => name.toLowerCase().endsWith(".md"));
    } catch {
      return {
        mode: "new_architecture",
        reason: "The ADR directory could not be read, so the run defaults to new architecture."
      };
    }
  }

  if (architectureDocumentExists && adrEvidenceExists) {
    return {
      mode: "existing_architecture_expansion",
      reason: "Detected an existing architecture document and ADR evidence in docs/architecture."
    };
  }
  return {
    mode: "new_architecture",
    reason: "A complete architecture document and ADR set was not found in docs/architecture."
  };
}

export function loadAdlcAgentDefinition(repoRoot: string, entry: AdlcAgentCatalogEntry): AdlcAgentDefinition {
  const filePath = getAdlcAgentFilePath(repoRoot, entry.folder);
  const markdown = fs.readFileSync(filePath, "utf8");
  const { description, inputs } = parseAdlcAgentFrontmatter(markdown);
  const visibleInputs =
    applyAdlcAgentInputOrder(
      entry.id,
      applyAdlcAgentInputLabelOverrides(
        entry.id,
        applyAdlcAgentInputTypeOverrides(
          entry.id,
          applyAdlcAgentInputRequiredOverrides(
            entry.id,
            applyAdlcAgentInputDefaults(entry.id, filterUserFacingAdlcInputs(inputs, entry.id))
          )
        )
      )
    );
  const architectureModeDetection = entry.id === "architect" ? detectArchitectArchitectureMode(repoRoot) : undefined;
  return {
    id: entry.id,
    label: entry.label,
    folder: entry.folder,
    filePath,
    description,
    inputs: [...visibleInputs, ...getAdlcAgentSyntheticInputs(entry.id)],
    architectureMode: architectureModeDetection?.mode,
    architectureModeReason: architectureModeDetection?.reason,
    promptHint: entry.promptHint,
    diagramHtml: getAdlcAgentDiagramHtml(entry.id)
  };
}

export type AdlcBrowseKind = "file" | "folder" | "any";

export function getAdlcInputBrowseKind(type: string): AdlcBrowseKind {
  const normalized = type.toLowerCase();
  const mentionsDirectory = normalized.includes("directory");
  const mentionsFile = normalized.includes("file");
  if (mentionsDirectory && !mentionsFile) return "folder";
  if (mentionsFile && !mentionsDirectory) return "file";
  return "any";
}

export const ADLC_HARNESSES = ["claude", "codex", "opencode", "gemini"] as const;
export type AdlcHarness = (typeof ADLC_HARNESSES)[number];

export const ADLC_HARNESS_SPECS: Record<AdlcHarness, { label: string; base: string; modelFlag: string; models: string[] }> = {
  claude: {
    label: "Claude Code",
    base: "claude",
    modelFlag: "--model",
    models: ["claude-fable-5-1", "claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5-20251001"]
  },
  codex: {
    label: "Codex",
    base: "codex",
    modelFlag: "-m",
    models: ["gpt-5-codex", "gpt-5", "o4-mini"]
  },
  opencode: {
    label: "OpenCode",
    base: "opencode run",
    modelFlag: "-m",
    models: ["ollama/qwen3-coder:30b", "ollama/qwen3-coder:480b-cloud", "ollama/gpt-oss:20-cloud"]
  },
  gemini: {
    label: "Gemini CLI",
    base: "gemini",
    modelFlag: "-m",
    models: ["gemini-2.5-pro", "gemini-2.5-flash"]
  }
};

export function isAdlcHarness(value: string): value is AdlcHarness {
  return (ADLC_HARNESSES as readonly string[]).includes(value);
}

function quoteModelArg(model: string): string {
  return /^[A-Za-z0-9_./:-]+$/.test(model) ? model : quoteShellArg(model);
}

export function buildAdlcHarnessCommand(harness: AdlcHarness, model: string): string {
  const spec = ADLC_HARNESS_SPECS[harness];
  const trimmedModel = model.trim();
  return trimmedModel ? `${spec.base} ${spec.modelFlag} ${quoteModelArg(trimmedModel)}` : spec.base;
}

export type AdlcAgentRunRequest = {
  harness: AdlcHarness;
  model: string;
  inputs: Record<string, string>;
  additionalInstructions: string;
};

export function getMissingRequiredAdlcInputs(
  definition: AdlcAgentDefinition,
  inputs: Record<string, string>
): string[] {
  const missing = definition.inputs
    .filter((input) => input.required && !(inputs[input.name] || "").trim())
    .map((input) => input.name);
  if (
    definition.id === "test" &&
    !(inputs.backlog || "").trim() &&
    !(inputs.user_story_or_specification || "").trim()
  ) {
    missing.push("backlog or user_story_or_specification");
  }
  if (
    definition.id === "coding" &&
    !(inputs.backlog_item || "").trim() &&
    !(inputs.user_story_or_specification || "").trim()
  ) {
    missing.push("backlog_item or user_story_or_specification");
  }
  return missing;
}

export function buildAdlcAgentPrompt(definition: AdlcAgentDefinition, request: AdlcAgentRunRequest): string {
  const agentPath = getAdlcAgentRelativePath(definition.folder);
  const sections: string[] = [
    `You are the \`${definition.folder}\` ADLC agent. Before doing anything else, read and follow the agent definition at \`${agentPath}\`, including its references and subagents.`
  ];
  if (definition.promptHint) sections.push(definition.promptHint);
  if (definition.architectureMode) {
    sections.push(`Internally detected architecture mode: \`${definition.architectureMode}\`.`);
  }

  if (definition.inputs.length > 0) {
    const hasTargetedSource =
      (definition.id === "test" || definition.id === "coding") &&
      Boolean((request.inputs.user_story_or_specification || "").trim());
    const overriddenBacklogInput = definition.id === "coding" ? "backlog_item" : "backlog";
    const promptInputs = definition.inputs.filter(
      (input) => !(hasTargetedSource && input.name === overriddenBacklogInput)
    );
    const inputLines = promptInputs.map((input) => {
      const value = (request.inputs[input.name] || "").trim();
      const requirement = input.required ? "required" : "optional";
      return `- ${input.name} (${requirement}): ${value || "not provided"}`;
    });
    sections.push(`Inputs provided by the user:\n${inputLines.join("\n")}`);
  }

  const additional = request.additionalInstructions.trim();
  if (additional) sections.push(`Additional instructions from the user:\n${additional}`);

  sections.push(
    "Honor every approval gate defined by the agent and by ADLC_workflow_settings.json; present artifacts and wait for explicit approval before moving past a gate. If a required input is missing or unreadable, stop and ask for it."
  );
  return sections.join("\n\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type RenderAdlcAgentRunHtmlOptions = {
  defaultHarness: AdlcHarness;
  defaultModel: string;
};

export function renderAdlcAgentRunHtml(
  webview: vscode.Webview,
  definition: AdlcAgentDefinition,
  options: RenderAdlcAgentRunHtmlOptions
): string {
  const nonce = getNonce();
  const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
  const harnessOptions = ADLC_HARNESSES.map(
    (harness) =>
      `<option value="${harness}"${harness === options.defaultHarness ? " selected" : ""}>${escapeHtml(ADLC_HARNESS_SPECS[harness].label)}</option>`
  ).join("");

  const inputFields = definition.inputs
    .map((input) => {
      const browseKind = getAdlcInputBrowseKind(input.type);
      return `
      <label>
        <span><code>${escapeHtml(input.label || input.name)}</code> <span class="badge${input.required ? " badge-required" : ""}">${input.required ? "required" : "optional"}</span>${input.type ? ` <span class="hint">${escapeHtml(input.type)}</span>` : ""}</span>
        <div class="input-row">
          <input type="text" data-input-name="${escapeHtml(input.name)}" data-required="${input.required ? "true" : "false"}" value="${escapeHtml(input.defaultValue || "")}" autocomplete="off" />
          <button type="button" data-browse="${escapeHtml(input.name)}" data-kind="${browseKind}">Browse…</button>
        </div>
        ${input.description ? `<span class="hint">${escapeHtml(input.description)}</span>` : ""}
      </label>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(definition.label)}</title>
    <style>
      :root { color-scheme: light dark; font-family: var(--vscode-font-family); }
      body { margin: 0; padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
      form { display: grid; gap: 16px; max-width: 900px; }
      label { display: grid; gap: 6px; font-size: 13px; }
      select, input, textarea, button { font: inherit; }
      select, input, textarea {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        color: var(--vscode-input-foreground);
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border, transparent);
        border-radius: 6px;
      }
      textarea { min-height: 90px; resize: vertical; }
      .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
      .title { font-size: 18px; font-weight: 600; }
      .description { font-size: 13px; color: var(--vscode-descriptionForeground); }
      .panel-section {
        display: grid;
        gap: 12px;
        padding: 14px;
        border: 1px solid var(--vscode-panel-border, var(--vscode-input-border, transparent));
        border-radius: 10px;
        background: color-mix(in srgb, var(--vscode-editorWidget-background, var(--vscode-sideBar-background)) 82%, transparent);
      }
      .section-title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--vscode-descriptionForeground); }
      .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .input-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
      .hint { font-size: 12px; color: var(--vscode-descriptionForeground); }
      .badge { font-size: 10px; padding: 1px 6px; border-radius: 999px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
      .badge-required { background: var(--vscode-charts-orange, #d18616); color: #fff; }
      code { font-family: var(--vscode-editor-font-family); }
      .command-preview { padding: 8px 10px; border-radius: 6px; background: var(--vscode-textCodeBlock-background); font-family: var(--vscode-editor-font-family); font-size: 12px; word-break: break-all; }
      .diagram { margin: 4px 0 8px; overflow-x: auto; }
      .diagram-row { display: flex; align-items: center; gap: 10px; }
      .diagram-group { display: flex; flex-direction: column; gap: 6px; padding: 10px; border: 1px dashed var(--vscode-panel-border, var(--vscode-input-border, transparent)); border-radius: 8px; }
      .diagram-product .diagram-group, .diagram-ba .diagram-group, .diagram-architect .diagram-group, .diagram-architecture-review .diagram-group, .diagram-ux .diagram-group, .diagram-project-planner .diagram-group, .diagram-test .diagram-group, .diagram-coding .diagram-group, .diagram-code-review .diagram-group, .diagram-deployment .diagram-group, .diagram-sdlc-orchestrator .diagram-group { border-color: var(--vscode-charts-yellow, #cca700); border-style: dotted; }
      .diagram-group-label { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--vscode-descriptionForeground); }
      .diagram-group-boxes { display: flex; flex-direction: column; gap: 6px; }
      .diagram-box { padding: 8px 12px; border: 1px solid var(--vscode-panel-border, var(--vscode-input-border, transparent)); border-radius: 6px; background: var(--vscode-editorWidget-background, var(--vscode-sideBar-background)); font-size: 12px; white-space: nowrap; text-align: center; }
      .diagram-box-required { border-color: var(--vscode-charts-orange, #d18616); }
      .diagram-box-optional { border-color: var(--vscode-panel-border, var(--vscode-input-border, transparent)); }
      .diagram-box-output { border-color: var(--vscode-charts-green, #89d185); }
      .diagram-architect .diagram-group-output, .diagram-ux .diagram-group-output, .diagram-test .diagram-group-output, .diagram-coding .diagram-group-output, .diagram-deployment .diagram-group-output { border-color: var(--vscode-charts-green, #89d185); border-style: dotted; }
      .diagram-box-emphasis { border-color: var(--vscode-focusBorder, var(--vscode-charts-purple)); font-weight: 600; }
      .diagram-arrow { font-size: 16px; color: var(--vscode-descriptionForeground); flex: none; }
      .error { min-height: 18px; font-size: 12px; color: var(--vscode-errorForeground); }
      button { border: 0; border-radius: 6px; padding: 8px 14px; cursor: pointer; white-space: nowrap; }
      button[type="submit"] { color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
      button[type="button"] { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    </style>
  </head>
  <body>
    <form id="adlc-agent-form">
      <div>
        <div class="page-header">
          <div>
            <div class="title">${escapeHtml(definition.label)}</div>
            <div class="hint"><code>${escapeHtml(getAdlcAgentRelativePath(definition.folder))}</code></div>
          </div>
          <button type="submit">Run</button>
        </div>
        ${definition.description ? `<p class="description">${escapeHtml(definition.description)}</p>` : ""}
        ${definition.diagramHtml || ""}
      </div>
      <section class="panel-section">
        <div class="section-title">Harness &amp; Model</div>
        <div class="two-col">
          <label>
            Harness
            <select id="harness-select">${harnessOptions}</select>
          </label>
          <label>
            Model
            <input id="model-input" type="text" list="model-suggestions" value="${escapeHtml(options.defaultModel)}" placeholder="harness default" autocomplete="off" />
            <datalist id="model-suggestions"></datalist>
          </label>
        </div>
        <div class="hint">Command: <span class="command-preview" id="command-preview"></span></div>
      </section>
      <section class="panel-section">
        <div class="section-title">Input Artifacts</div>
        ${inputFields || '<div class="hint">This agent declares no input artifacts. Describe the request below.</div>'}
      </section>
      <label>
        Additional instructions
        <textarea id="additional-instructions" placeholder="Optional context, scope, or constraints for this run"></textarea>
      </label>
      <div class="error" id="error-message"></div>
    </form>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const harnessSpecs = ${JSON.stringify(ADLC_HARNESS_SPECS)};
      const form = document.getElementById("adlc-agent-form");
      const harnessSelect = document.getElementById("harness-select");
      const modelInput = document.getElementById("model-input");
      const modelSuggestions = document.getElementById("model-suggestions");
      const commandPreview = document.getElementById("command-preview");
      const errorMessage = document.getElementById("error-message");
      const additionalInstructions = document.getElementById("additional-instructions");
      const requiresAlternativeSource = ${definition.id === "test" || definition.id === "coding" ? "true" : "false"};
      const backlogInputName = ${JSON.stringify(definition.id === "coding" ? "backlog_item" : "backlog")};

      function quoteIfNeeded(value) {
        return /^[A-Za-z0-9_./:-]+$/.test(value) ? value : "'" + value.replace(/'/g, "'\\\\''") + "'";
      }

      function refreshHarness() {
        const spec = harnessSpecs[harnessSelect.value];
        modelSuggestions.innerHTML = "";
        for (const model of spec.models) {
          const option = document.createElement("option");
          option.value = model;
          modelSuggestions.appendChild(option);
        }
        refreshPreview();
      }

      function refreshPreview() {
        const spec = harnessSpecs[harnessSelect.value];
        const model = modelInput.value.trim();
        commandPreview.textContent = model ? spec.base + " " + spec.modelFlag + " " + quoteIfNeeded(model) : spec.base;
      }

      harnessSelect.addEventListener("change", refreshHarness);
      modelInput.addEventListener("input", refreshPreview);
      refreshHarness();

      for (const button of document.querySelectorAll("button[data-browse]")) {
        button.addEventListener("click", () => {
          vscode.postMessage({
            type: "adlcAgentBrowse",
            payload: { inputName: button.dataset.browse, kind: button.dataset.kind }
          });
        });
      }

      window.addEventListener("message", (event) => {
        const message = event.data || {};
        if (message.type === "adlcAgentBrowseResult") {
          const field = document.querySelector('input[data-input-name="' + message.payload.inputName + '"]');
          if (field && message.payload.value) field.value = message.payload.value;
          return;
        }
        if (message.type === "adlcAgentError") {
          errorMessage.textContent = message.payload.message || "";
        }
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        errorMessage.textContent = "";
        const inputs = {};
        const missing = [];
        for (const field of document.querySelectorAll("input[data-input-name]")) {
          const value = field.value.trim();
          inputs[field.dataset.inputName] = value;
          if (field.dataset.required === "true" && !value) missing.push(field.dataset.inputName);
        }
        if (missing.length > 0) {
          errorMessage.textContent = "Missing required inputs: " + missing.join(", ");
          return;
        }
        if (requiresAlternativeSource && !inputs[backlogInputName] && !inputs.user_story_or_specification) {
          errorMessage.textContent = "Provide either Backlog or User Story or Specification.";
          return;
        }
        vscode.postMessage({
          type: "adlcAgentExecute",
          payload: {
            harness: harnessSelect.value,
            model: modelInput.value.trim(),
            inputs,
            additionalInstructions: additionalInstructions.value
          }
        });
      });
    </script>
  </body>
</html>`;
}
