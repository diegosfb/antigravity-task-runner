import * as fs from "fs";
import * as path from "path";

export const CLOUD_ARCHITECT_SKILL_NAME = "cloud-architect";
export const CLOUD_ARCHITECT_REVIEW_PROMPT =
  "use skill cloud-architect to review the infrastructure setup, do a right sizing and propose improvements";

const CLOUD_ARCHITECT_SKILL_SOURCE_DIRECTORY = path.join("Resources", CLOUD_ARCHITECT_SKILL_NAME);
const CLOUD_ARCHITECT_SKILL_TARGET_DIRECTORIES = [
  path.join(".agent", "skills"),
  path.join(".claude", "skills")
] as const;

const CLOUD_INFRA_DIRECTORY_NAMES = new Set([
  "infra",
  "infrastructure",
  "terraform",
  "pulumi",
  "k8s",
  "kubernetes",
  "helm",
  "cloudformation",
  "cdk"
]);

const CLOUD_INFRA_FILE_NAMES = new Set([
  "vercel.json",
  "render.yaml",
  "render.yml",
  "fly.toml",
  "netlify.toml",
  "railway.json",
  "serverless.yml",
  "serverless.yaml",
  "docker-compose.yml",
  "docker-compose.yaml",
  "docker-compose.override.yml",
  "docker-compose.override.yaml",
  "compose.yml",
  "compose.yaml",
  "cloudbuild.yml",
  "cloudbuild.yaml",
  "skaffold.yml",
  "skaffold.yaml",
  "pulumi.yaml",
  "pulumi.yml",
  "chart.yaml",
  "helmfile.yaml",
  "helmfile.yml",
  "appspec.yaml",
  "appspec.yml"
]);

const CLOUD_INFRA_FILE_EXTENSIONS = new Set([
  ".tf",
  ".tfvars",
  ".tfbackend",
  ".bicep"
]);

const CLOUD_INFRA_SKIP_DIRECTORIES = new Set([
  ".agent",
  ".claude",
  ".git",
  ".idea",
  ".next",
  ".nuxt",
  ".terraform",
  ".turbo",
  ".venv",
  ".vscode",
  "coverage",
  "dist",
  "docs",
  "Knowhow",
  "node_modules",
  "out",
  "Resources",
  "target",
  "vendor",
  "venv"
]);

function toRelativePosixPath(repoRoot: string, targetPath: string): string {
  return path.relative(repoRoot, targetPath).split(path.sep).join("/");
}

function isCloudDeploymentPath(relativePath: string): boolean {
  if (!relativePath.startsWith("scripts/") && !relativePath.startsWith(".github/workflows/")) {
    return false;
  }

  const normalized = relativePath.toLowerCase();
  const hasInfrastructureAction =
    /(deploy|deployment|infra|terraform|pulumi|cloudrun|apprunner|serverless|vercel|render|helm|k8s|kubernetes|provision)/.test(
      normalized
    );
  const hasCloudPlatform =
    /(aws|gcp|azure|cloud|vercel|render|fly|netlify|ecs|eks|gke|aks)/.test(
      normalized
    );

  return hasInfrastructureAction && hasCloudPlatform;
}

export function detectCloudInfrastructureSignals(
  repoRoot: string,
  maxMatches = 5
): string[] {
  if (!repoRoot || !fs.existsSync(repoRoot)) return [];

  const matches: string[] = [];
  const stack = [repoRoot];

  while (stack.length > 0 && matches.length < maxMatches) {
    const currentDir = stack.pop();
    if (!currentDir) break;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (matches.length >= maxMatches) break;

      const entryPath = path.join(currentDir, entry.name);
      const relativePath = toRelativePosixPath(repoRoot, entryPath);

      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        const lowerName = entry.name.toLowerCase();
        if (CLOUD_INFRA_SKIP_DIRECTORIES.has(entry.name) || CLOUD_INFRA_SKIP_DIRECTORIES.has(lowerName)) {
          continue;
        }
        if (CLOUD_INFRA_DIRECTORY_NAMES.has(lowerName)) {
          matches.push(relativePath);
          continue;
        }
        stack.push(entryPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const lowerName = entry.name.toLowerCase();
      const lowerExtension = path.extname(entry.name).toLowerCase();
      if (
        CLOUD_INFRA_FILE_NAMES.has(lowerName) ||
        CLOUD_INFRA_FILE_EXTENSIONS.has(lowerExtension) ||
        isCloudDeploymentPath(relativePath)
      ) {
        matches.push(relativePath);
      }
    }
  }

  return matches;
}

export function hasCloudInfrastructureNeeds(repoRoot: string): boolean {
  return detectCloudInfrastructureSignals(repoRoot, 1).length > 0;
}

async function ensureDirectoryExists(directoryPath: string): Promise<void> {
  if (fs.existsSync(directoryPath)) {
    const stats = await fs.promises.stat(directoryPath);
    if (!stats.isDirectory()) {
      throw new Error(`${directoryPath} exists but is not a directory.`);
    }
    return;
  }

  await fs.promises.mkdir(directoryPath, { recursive: true });
}

export async function copyCloudArchitectSkill(
  extensionRoot: string,
  projectRoot: string
): Promise<string[]> {
  const sourcePath = path.join(extensionRoot, CLOUD_ARCHITECT_SKILL_SOURCE_DIRECTORY);
  const copiedSkillPaths: string[] = [];

  await fs.promises.access(sourcePath, fs.constants.F_OK);

  for (const relativeDirectory of CLOUD_ARCHITECT_SKILL_TARGET_DIRECTORIES) {
    const destinationDirectory = path.join(projectRoot, relativeDirectory);
    const destinationPath = path.join(destinationDirectory, CLOUD_ARCHITECT_SKILL_NAME);

    await ensureDirectoryExists(destinationDirectory);

    if (fs.existsSync(destinationPath)) {
      const stats = await fs.promises.stat(destinationPath);
      if (!stats.isDirectory()) {
        throw new Error(`${destinationPath} exists but is not a directory.`);
      }
      continue;
    }

    await fs.promises.cp(sourcePath, destinationPath, { recursive: true });
    copiedSkillPaths.push(toRelativePosixPath(projectRoot, destinationPath));
  }

  return copiedSkillPaths;
}
