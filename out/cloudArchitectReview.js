"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLOUD_ARCHITECT_REVIEW_PROMPT = exports.CLOUD_ARCHITECT_SKILL_NAME = void 0;
exports.detectCloudInfrastructureSignals = detectCloudInfrastructureSignals;
exports.hasCloudInfrastructureNeeds = hasCloudInfrastructureNeeds;
exports.copyCloudArchitectSkill = copyCloudArchitectSkill;
const fs = require("fs");
const path = require("path");
const bundledProjectSkill_1 = require("./bundledProjectSkill");
exports.CLOUD_ARCHITECT_SKILL_NAME = "cloud-architect";
exports.CLOUD_ARCHITECT_REVIEW_PROMPT = "use skill cloud-architect to review the infrastructure setup, do a right sizing and propose improvements";
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
function toRelativePosixPath(repoRoot, targetPath) {
    return path.relative(repoRoot, targetPath).split(path.sep).join("/");
}
function isCloudDeploymentPath(relativePath) {
    if (!relativePath.startsWith("scripts/") && !relativePath.startsWith(".github/workflows/")) {
        return false;
    }
    const normalized = relativePath.toLowerCase();
    const hasInfrastructureAction = /(deploy|deployment|infra|terraform|pulumi|cloudrun|apprunner|serverless|vercel|render|helm|k8s|kubernetes|provision)/.test(normalized);
    const hasCloudPlatform = /(aws|gcp|azure|cloud|vercel|render|fly|netlify|ecs|eks|gke|aks)/.test(normalized);
    return hasInfrastructureAction && hasCloudPlatform;
}
function detectCloudInfrastructureSignals(repoRoot, maxMatches = 5) {
    if (!repoRoot || !fs.existsSync(repoRoot))
        return [];
    const matches = [];
    const stack = [repoRoot];
    while (stack.length > 0 && matches.length < maxMatches) {
        const currentDir = stack.pop();
        if (!currentDir)
            break;
        let entries;
        try {
            entries = fs.readdirSync(currentDir, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            if (matches.length >= maxMatches)
                break;
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
            if (CLOUD_INFRA_FILE_NAMES.has(lowerName) ||
                CLOUD_INFRA_FILE_EXTENSIONS.has(lowerExtension) ||
                isCloudDeploymentPath(relativePath)) {
                matches.push(relativePath);
            }
        }
    }
    return matches;
}
function hasCloudInfrastructureNeeds(repoRoot) {
    return detectCloudInfrastructureSignals(repoRoot, 1).length > 0;
}
async function copyCloudArchitectSkill(extensionRoot, projectRoot, resourceProvider) {
    return (0, bundledProjectSkill_1.copyBundledSkillToProject)(extensionRoot, projectRoot, exports.CLOUD_ARCHITECT_SKILL_NAME, exports.CLOUD_ARCHITECT_SKILL_NAME, resourceProvider);
}
//# sourceMappingURL=cloudArchitectReview.js.map