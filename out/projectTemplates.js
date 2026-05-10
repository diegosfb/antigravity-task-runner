"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeProjectTemplate = normalizeProjectTemplate;
exports.parseProjectTemplates = parseProjectTemplates;
exports.loadProjectTemplates = loadProjectTemplates;
exports.copySetupWorkspaceGuideFiles = copySetupWorkspaceGuideFiles;
exports.ensureSetupWorkspaceDirectories = ensureSetupWorkspaceDirectories;
exports.copySetupWorkspaceSkills = copySetupWorkspaceSkills;
exports.buildSetupWorkspacePrompt = buildSetupWorkspacePrompt;
const fs = require("fs");
const path = require("path");
function readTrimmedString(value) {
    return typeof value === "string" ? value.trim() : "";
}
function buildTemplateDescription(downloadUrl, instructions) {
    return `Download URL: ${downloadUrl}\nInstructions: ${instructions}`;
}
function normalizeProjectTemplate(value) {
    if (!value || typeof value !== "object")
        return undefined;
    const candidate = value;
    const name = readTrimmedString(candidate.name);
    const downloadUrl = readTrimmedString(candidate.downloadUrl);
    const instructions = readTrimmedString(candidate.instructions);
    const description = readTrimmedString(candidate.description) ||
        buildTemplateDescription(downloadUrl, instructions);
    if (!name || !downloadUrl || !instructions)
        return undefined;
    return {
        name,
        description,
        downloadUrl,
        instructions
    };
}
function parseProjectTemplates(raw) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
        throw new Error("Project templates file must contain a JSON array.");
    }
    return parsed
        .map((entry) => normalizeProjectTemplate(entry))
        .filter((entry) => Boolean(entry));
}
async function loadProjectTemplates(resourcesRoot) {
    const projectTemplatesPath = path.join(resourcesRoot, "project-templates.json");
    const raw = await fs.promises.readFile(projectTemplatesPath, "utf8");
    return parseProjectTemplates(raw);
}
const SETUP_WORKSPACE_GUIDE_FILE_NAMES = ["CLAUDE.md", "AGENTS.md"];
const SETUP_WORKSPACE_DIRECTORY_NAMES = [".agent", ".claude"];
const SETUP_WORKSPACE_SKILL_DIRECTORY_NAMES = ["jira-project-creation"];
async function copySetupWorkspaceGuideFiles(resourcesRoot, projectRoot) {
    const copiedFiles = [];
    await fs.promises.mkdir(projectRoot, { recursive: true });
    for (const fileName of SETUP_WORKSPACE_GUIDE_FILE_NAMES) {
        const sourcePath = path.join(resourcesRoot, fileName);
        const destinationPath = path.join(projectRoot, fileName);
        await fs.promises.access(sourcePath, fs.constants.F_OK);
        if (fs.existsSync(destinationPath))
            continue;
        await fs.promises.copyFile(sourcePath, destinationPath);
        copiedFiles.push(fileName);
    }
    return copiedFiles;
}
async function ensureSetupWorkspaceDirectories(projectRoot) {
    const createdDirectories = [];
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
async function copySetupWorkspaceSkills(resourcesRoot, projectRoot) {
    const copiedSkills = [];
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
function buildSetupWorkspacePrompt(template, workspaceDir) {
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
//# sourceMappingURL=projectTemplates.js.map