import * as fs from "fs";
import * as path from "path";

const PROJECT_SKILL_TARGET_DIRECTORIES = [
  path.join(".agent", "skills"),
  path.join(".claude", "skills")
] as const;

function toRelativePosixPath(projectRoot: string, targetPath: string): string {
  return path.relative(projectRoot, targetPath).split(path.sep).join("/");
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

export async function copyBundledSkillToProject(
  extensionRoot: string,
  projectRoot: string,
  skillName: string,
  sourceRelativeDirectory = path.join("Resources", skillName)
): Promise<string[]> {
  const sourcePath = path.join(extensionRoot, sourceRelativeDirectory);
  const copiedSkillPaths: string[] = [];

  await fs.promises.access(sourcePath, fs.constants.F_OK);

  for (const relativeDirectory of PROJECT_SKILL_TARGET_DIRECTORIES) {
    const destinationDirectory = path.join(projectRoot, relativeDirectory);
    const destinationPath = path.join(destinationDirectory, skillName);

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
