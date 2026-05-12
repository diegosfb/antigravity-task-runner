import * as fs from "fs";
import * as path from "path";
import { createFileSystemResourceProvider } from "./resourceProvider";

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

export async function loadProjectTemplates(
  resourcesRoot: string,
  resourceProvider = createFileSystemResourceProvider(resourcesRoot)
): Promise<ProjectTemplate[]> {
  const raw = await resourceProvider.readTextFile("project-templates.json");
  return parseProjectTemplates(raw);
}

const SETUP_WORKSPACE_GUIDE_FILE_NAMES = ["CLAUDE.md", "AGENTS.md"] as const;
const SETUP_WORKSPACE_BASE_DIRECTORY_NAMES = [
  ".agent",
  path.join(".agent", "skills"),
  path.join(".agent", "agents"),
  ".claude",
  ".codex",
  ".opencode"
] as const;
const SETUP_WORKSPACE_HARNESS_DIRECTORY_NAMES = [".claude", ".codex", ".opencode"] as const;
const SETUP_WORKSPACE_HARNESS_LINK_NAMES = ["skills", "agents"] as const;
const SETUP_WORKSPACE_SKILL_DIRECTORY_NAMES = ["jira-project-creation"] as const;

type SetupWorkspaceHarnessDirectoryName =
  typeof SETUP_WORKSPACE_HARNESS_DIRECTORY_NAMES[number];

async function pathExistsIncludingSymlinks(targetPath: string): Promise<boolean> {
  try {
    await fs.promises.lstat(targetPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function ensureSetupWorkspaceDirectory(
  projectRoot: string,
  directoryName: string
): Promise<boolean> {
  const directoryPath = path.join(projectRoot, directoryName);
  if (await pathExistsIncludingSymlinks(directoryPath)) {
    const stats = await fs.promises.stat(directoryPath);
    if (!stats.isDirectory()) {
      throw new Error(`${directoryName} exists but is not a directory.`);
    }
    return false;
  }

  await fs.promises.mkdir(directoryPath, { recursive: true });
  return true;
}

async function ensureSetupWorkspaceHarnessLinks(
  projectRoot: string,
  harnessDirectoryName: SetupWorkspaceHarnessDirectoryName
): Promise<string[]> {
  const createdPaths: string[] = [];
  const harnessDirectoryPath = path.join(projectRoot, harnessDirectoryName);

  for (const linkName of SETUP_WORKSPACE_HARNESS_LINK_NAMES) {
    const linkPath = path.join(harnessDirectoryPath, linkName);
    if (await pathExistsIncludingSymlinks(linkPath)) continue;

    await fs.promises.symlink(path.join("..", ".agent", linkName), linkPath);
    createdPaths.push(`${harnessDirectoryName}/${linkName}`);
  }

  return createdPaths;
}

export async function copySetupWorkspaceGuideFiles(
  resourcesRoot: string,
  projectRoot: string,
  resourceProvider = createFileSystemResourceProvider(resourcesRoot)
): Promise<string[]> {
  const copiedFiles: string[] = [];
  await fs.promises.mkdir(projectRoot, { recursive: true });

  for (const fileName of SETUP_WORKSPACE_GUIDE_FILE_NAMES) {
    const sourcePath = await resourceProvider.ensureFile(fileName);
    const destinationPath = path.join(projectRoot, fileName);

    if (fs.existsSync(destinationPath)) continue;

    await fs.promises.copyFile(sourcePath, destinationPath);
    copiedFiles.push(fileName);
  }

  return copiedFiles;
}

export async function ensureSetupWorkspaceDirectories(projectRoot: string): Promise<string[]> {
  const createdPaths: string[] = [];
  await fs.promises.mkdir(projectRoot, { recursive: true });

  for (const directoryName of SETUP_WORKSPACE_BASE_DIRECTORY_NAMES) {
    if (await ensureSetupWorkspaceDirectory(projectRoot, directoryName)) {
      createdPaths.push(directoryName);
    }
  }

  for (const harnessDirectoryName of SETUP_WORKSPACE_HARNESS_DIRECTORY_NAMES) {
    createdPaths.push(...await ensureSetupWorkspaceHarnessLinks(projectRoot, harnessDirectoryName));
  }

  return createdPaths;
}

export async function copySetupWorkspaceSkills(
  resourcesRoot: string,
  projectRoot: string,
  resourceProvider = createFileSystemResourceProvider(resourcesRoot)
): Promise<string[]> {
  const copiedSkills: string[] = [];
  const skillsRoot = path.join(projectRoot, ".agent", "skills");
  await fs.promises.mkdir(skillsRoot, { recursive: true });

  for (const skillDirectoryName of SETUP_WORKSPACE_SKILL_DIRECTORY_NAMES) {
    const sourcePath = await resourceProvider.ensureDirectory(skillDirectoryName);
    const destinationPath = path.join(skillsRoot, skillDirectoryName);

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
    `Use this source URL: ${template.downloadUrl}.`,
    `Follow these instructions exactly: ${template.instructions}.`,
    `If the target directory does not exist yet, create it first.`,
    "The workspace root already contains .agent/skills, .agent/agents, .claude, .codex, and .opencode.",
    ".claude/skills, .claude/agents, .codex/skills, .codex/agents, .opencode/skills, and .opencode/agents already point into .agent.",
    "Do not assume AGENTS.md or CLAUDE.md already exist unless the selected setup requires them.",
    `Do not modify files outside "${workspaceDir}".`,
    `If "${workspaceDir}" already contains some of the project files, only add the missing ones. Do not overwrite or modify any existing files in "${workspaceDir}".`,
    "Prefer non-interactive commands and finish once the missing files are extracted or downloaded."
  ].join(" ");
}

export async function buildUpdateAgentsMdPrompt(
  resourcesRoot = path.resolve(__dirname, "..", "Resources"),
  resourceProvider = createFileSystemResourceProvider(resourcesRoot)
): Promise<string> {
  return (await resourceProvider.readTextFile(path.join("prompts", "update-agents-md.md"))).trim();
}

export async function buildUpdateAgentsMdPromptFilePath(
  extensionRoot: string,
  resourceProvider = createFileSystemResourceProvider(path.join(extensionRoot, "Resources"))
): Promise<string> {
  return resourceProvider.ensureFile(path.join("prompts", "update-agents-md.md"));
}
