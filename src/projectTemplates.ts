import * as fs from "fs";
import * as path from "path";

export interface ProjectTemplate {
  name: string;
  description: string;
  downloadUrl: string;
  instructions: string;
}

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildTemplateDescription(downloadUrl: string, instructions: string): string {
  return `Download URL: ${downloadUrl}\nInstructions: ${instructions}`;
}

export function normalizeProjectTemplate(value: unknown): ProjectTemplate | undefined {
  if (!value || typeof value !== "object") return undefined;

  const candidate = value as Record<string, unknown>;
  const name = readTrimmedString(candidate.name);
  const downloadUrl = readTrimmedString(candidate.downloadUrl);
  const instructions = readTrimmedString(candidate.instructions);
  const description =
    readTrimmedString(candidate.description) ||
    buildTemplateDescription(downloadUrl, instructions);

  if (!name || !downloadUrl || !instructions) return undefined;

  return {
    name,
    description,
    downloadUrl,
    instructions
  };
}

export function parseProjectTemplates(raw: string): ProjectTemplate[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Project templates file must contain a JSON array.");
  }
  return parsed
    .map((entry) => normalizeProjectTemplate(entry))
    .filter((entry): entry is ProjectTemplate => Boolean(entry));
}

export async function loadProjectTemplates(resourcesRoot: string): Promise<ProjectTemplate[]> {
  const projectTemplatesPath = path.join(resourcesRoot, "project-templates.json");
  const raw = await fs.promises.readFile(projectTemplatesPath, "utf8");
  return parseProjectTemplates(raw);
}

export function buildSetupWorkspacePrompt(
  template: ProjectTemplate,
  workspaceDir: string
): string {
  return [
    `Set up the workspace by downloading the "${template.name}" project into "${workspaceDir}".`,
    `Use this source URL: ${template.downloadUrl}.`,
    `Follow these instructions exactly: ${template.instructions}.`,
    `If the target directory does not exist yet, create it first.`,
    `Do not modify files outside "${workspaceDir}".`,
    `If "${workspaceDir}" already contains project files, stop and explain what you found instead of overwriting anything.`,
    "Prefer non-interactive commands and finish once the download or extraction is complete."
  ].join(" ");
}
