"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeProjectTemplate = normalizeProjectTemplate;
exports.parseProjectTemplates = parseProjectTemplates;
exports.loadProjectTemplates = loadProjectTemplates;
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
function buildSetupWorkspacePrompt(template, workspaceDir) {
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
//# sourceMappingURL=projectTemplates.js.map