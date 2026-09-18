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
  { id: "test", label: "Test Agent", folder: "test-agent" },
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
};

export type AdlcAgentDefinition = {
  id: string;
  label: string;
  folder: string;
  filePath: string;
  description: string;
  inputs: AdlcAgentInput[];
  promptHint?: string;
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

export function filterUserFacingAdlcInputs(inputs: AdlcAgentInput[]): AdlcAgentInput[] {
  return inputs.filter((input) => !isAdlcAutoConfigInput(input.name));
}

export function loadAdlcAgentDefinition(repoRoot: string, entry: AdlcAgentCatalogEntry): AdlcAgentDefinition {
  const filePath = getAdlcAgentFilePath(repoRoot, entry.folder);
  const markdown = fs.readFileSync(filePath, "utf8");
  const { description, inputs } = parseAdlcAgentFrontmatter(markdown);
  return {
    id: entry.id,
    label: entry.label,
    folder: entry.folder,
    filePath,
    description,
    inputs: filterUserFacingAdlcInputs(inputs),
    promptHint: entry.promptHint
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
  return definition.inputs
    .filter((input) => input.required && !(inputs[input.name] || "").trim())
    .map((input) => input.name);
}

export function buildAdlcAgentPrompt(definition: AdlcAgentDefinition, request: AdlcAgentRunRequest): string {
  const agentPath = getAdlcAgentRelativePath(definition.folder);
  const sections: string[] = [
    `You are the \`${definition.folder}\` ADLC agent. Before doing anything else, read and follow the agent definition at \`${agentPath}\`, including its references and subagents.`
  ];
  if (definition.promptHint) sections.push(definition.promptHint);

  if (definition.inputs.length > 0) {
    const inputLines = definition.inputs.map((input) => {
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
        <span><code>${escapeHtml(input.name)}</code> <span class="badge${input.required ? " badge-required" : ""}">${input.required ? "required" : "optional"}</span>${input.type ? ` <span class="hint">${escapeHtml(input.type)}</span>` : ""}</span>
        <div class="input-row">
          <input type="text" data-input-name="${escapeHtml(input.name)}" data-required="${input.required ? "true" : "false"}" value="" autocomplete="off" />
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
      .error { min-height: 18px; font-size: 12px; color: var(--vscode-errorForeground); }
      .actions { display: flex; justify-content: flex-end; gap: 8px; }
      button { border: 0; border-radius: 6px; padding: 8px 14px; cursor: pointer; white-space: nowrap; }
      button[type="submit"] { color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
      button[type="button"] { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    </style>
  </head>
  <body>
    <form id="adlc-agent-form">
      <div>
        <div class="title">${escapeHtml(definition.label)}</div>
        <div class="hint"><code>${escapeHtml(getAdlcAgentRelativePath(definition.folder))}</code></div>
        ${definition.description ? `<p class="description">${escapeHtml(definition.description)}</p>` : ""}
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
      <div class="actions">
        <button type="button" id="cancel-button">Cancel</button>
        <button type="submit">Execute</button>
      </div>
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

      document.getElementById("cancel-button").addEventListener("click", () => {
        vscode.postMessage({ type: "adlcAgentCancel" });
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
