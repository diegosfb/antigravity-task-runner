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

const SETUP_WORKSPACE_GUIDE_FILE_NAMES = ["CLAUDE.md", "AGENTS.md"] as const;
const SETUP_WORKSPACE_DIRECTORY_NAMES = [".agent", ".claude"] as const;
const SETUP_WORKSPACE_SKILL_DIRECTORY_NAMES = ["jira-project-creation"] as const;

export async function copySetupWorkspaceGuideFiles(
  resourcesRoot: string,
  projectRoot: string
): Promise<string[]> {
  const copiedFiles: string[] = [];
  await fs.promises.mkdir(projectRoot, { recursive: true });

  for (const fileName of SETUP_WORKSPACE_GUIDE_FILE_NAMES) {
    const sourcePath = path.join(resourcesRoot, fileName);
    const destinationPath = path.join(projectRoot, fileName);

    await fs.promises.access(sourcePath, fs.constants.F_OK);
    if (fs.existsSync(destinationPath)) continue;

    await fs.promises.copyFile(sourcePath, destinationPath);
    copiedFiles.push(fileName);
  }

  return copiedFiles;
}

export async function ensureSetupWorkspaceDirectories(projectRoot: string): Promise<string[]> {
  const createdDirectories: string[] = [];
  await fs.promises.mkdir(projectRoot, { recursive: true });

  for (const directoryName of SETUP_WORKSPACE_DIRECTORY_NAMES) {
    const directoryPath = path.join(projectRoot, directoryName);
    if (fs.existsSync(directoryPath)) {
      const stats = await fs.promises.stat(directoryPath);
      if (!stats.isDirectory()) {
        throw new Error(`${directoryName} exists but is not a directory.`);
      }
      continue;
    }

    await fs.promises.mkdir(directoryPath, { recursive: true });
    createdDirectories.push(directoryName);
  }

  return createdDirectories;
}

export async function copySetupWorkspaceSkills(
  resourcesRoot: string,
  projectRoot: string
): Promise<string[]> {
  const copiedSkills: string[] = [];
  const skillsRoot = path.join(projectRoot, ".agent", "skills");
  await fs.promises.mkdir(skillsRoot, { recursive: true });

  for (const skillDirectoryName of SETUP_WORKSPACE_SKILL_DIRECTORY_NAMES) {
    const sourcePath = path.join(resourcesRoot, skillDirectoryName);
    const destinationPath = path.join(skillsRoot, skillDirectoryName);

    await fs.promises.access(sourcePath, fs.constants.F_OK);
    if (fs.existsSync(destinationPath)) {
      const stats = await fs.promises.stat(destinationPath);
      if (!stats.isDirectory()) {
        throw new Error(`${destinationPath} exists but is not a directory.`);
      }
      continue;
    }

    await fs.promises.cp(sourcePath, destinationPath, { recursive: true });
    copiedSkills.push(skillDirectoryName);
  }

  return copiedSkills;
}

export function buildSetupWorkspacePrompt(
  template: ProjectTemplate,
  workspaceDir: string
): string {
  return [
    `Set up the workspace by downloading the "${template.name}" project into "${workspaceDir}".`,
    `The workspace root already contains CLAUDE.md, AGENTS.md, .agent, and .claude. Follow those guides and use those folders while working.`,
    `The Jira project creation skill is already available at "${path.join(workspaceDir, ".agent", "skills", "jira-project-creation")}". Reuse it when it helps.`,
    `Use this source URL: ${template.downloadUrl}.`,
    `Follow these instructions exactly: ${template.instructions}.`,
    `If the target directory does not exist yet, create it first.`,
    `Do not modify files outside "${workspaceDir}".`,
    `If "${workspaceDir}" already contains project files, stop and explain what you found instead of overwriting anything.`,
    "Prefer non-interactive commands and finish once the download or extraction is complete."
  ].join(" ");
}

export function buildUpdateAgentsMdPrompt(): string {
  return `I want you to refactor my AGENTS.md file to follow progressive disclosure principles.

Follow these steps:

1. **Find contradictions**: Identify any instructions that conflict with each other. For each contradiction, ask me which version I want to keep.

2. **Identify the essentials**: Extract only what belongs in the root AGENTS.md:
   - One-sentence project description
   - Package manager (if not npm)
   - Non-standard build/typecheck commands
   - Anything truly relevant to every single task

3. **Group the rest**: Organize remaining instructions into logical categories (e.g., TypeScript conventions, testing patterns, API design, Git workflow). For each group, create a separate markdown file.

4. **Create the file structure**: Output:
   - A minimal root AGENTS.md with markdown links to the separate files
   - Each separate file with its relevant instructions
   - A suggested docs/ folder structure

5. **Flag for deletion**: Identify any instructions that are:
   - Redundant (the agent already knows this)
   - Too vague to be actionable
   - Overly obvious (like "write clean code")`;
}
