"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyBundledSkillToProject = copyBundledSkillToProject;
const fs = require("fs");
const path = require("path");
const resourceProvider_1 = require("./resourceProvider");
const PROJECT_SKILL_TARGET_DIRECTORIES = [
    path.join(".agent", "skills"),
    path.join(".claude", "skills")
];
function toRelativePosixPath(projectRoot, targetPath) {
    return path.relative(projectRoot, targetPath).split(path.sep).join("/");
}
async function ensureDirectoryExists(directoryPath) {
    if (fs.existsSync(directoryPath)) {
        const stats = await fs.promises.stat(directoryPath);
        if (!stats.isDirectory()) {
            throw new Error(`${directoryPath} exists but is not a directory.`);
        }
        return;
    }
    await fs.promises.mkdir(directoryPath, { recursive: true });
}
async function copyBundledSkillToProject(extensionRoot, projectRoot, skillName, sourceRelativeDirectory = skillName, resourceProvider = (0, resourceProvider_1.createFileSystemResourceProvider)(path.join(extensionRoot, "Resources"))) {
    const normalizedSourceDirectory = sourceRelativeDirectory
        .replace(/^Resources[\\/]/, "")
        .replace(/\\/g, "/");
    const sourcePath = await resourceProvider.ensureDirectory(normalizedSourceDirectory);
    const copiedSkillPaths = [];
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
//# sourceMappingURL=bundledProjectSkill.js.map