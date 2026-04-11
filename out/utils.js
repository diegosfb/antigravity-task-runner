"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRootPath = getRootPath;
exports.getRepoRoot = getRepoRoot;
exports.getWorkspaceRoot = getWorkspaceRoot;
exports.getWorkspaceProjectPath = getWorkspaceProjectPath;
exports.getAntigravityHomePath = getAntigravityHomePath;
exports.safeReadDir = safeReadDir;
exports.quoteShellArg = quoteShellArg;
exports.findNestedGitFolders = findNestedGitFolders;
exports.listInfrastructureYamlFiles = listInfrastructureYamlFiles;
exports.parseEnvFile = parseEnvFile;
exports.waitForUrlReady = waitForUrlReady;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const os = require("os");
const http = require("http");
const https = require("https");
function getRootPath() {
    const rootPath = vscode.workspace.getConfiguration("antigravity").get("rootPath");
    if (rootPath && fs.existsSync(rootPath))
        return rootPath;
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot)
        return undefined;
    const antigravityRoot = path.join(workspaceRoot, ".agent", "antigravity");
    if (fs.existsSync(antigravityRoot))
        return antigravityRoot;
    if (fs.existsSync(workspaceRoot))
        return workspaceRoot;
    return undefined;
}
function getRepoRoot(rootPath) {
    const normalized = path.resolve(rootPath);
    const parts = normalized.split(path.sep);
    if (parts.length >= 2 &&
        parts[parts.length - 2] === ".agent" &&
        parts[parts.length - 1] === "antigravity") {
        return path.resolve(normalized, "..", "..");
    }
    return normalized;
}
function getWorkspaceRoot() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0)
        return undefined;
    return folders[0].uri.fsPath;
}
function getWorkspaceProjectPath(repoRoot) {
    const configured = vscode.workspace.getConfiguration("antigravity").get("workspaceProjectPath") || "./";
    return path.isAbsolute(configured)
        ? configured
        : path.resolve(repoRoot, configured);
}
function getAntigravityHomePath() {
    const homePath = path.join(os.homedir(), ".gemini", "antigravity");
    if (!fs.existsSync(homePath))
        return undefined;
    return homePath;
}
async function safeReadDir(dirPath) {
    try {
        return await fs.promises.readdir(dirPath, { withFileTypes: true });
    }
    catch {
        return [];
    }
}
function quoteShellArg(value) {
    return `"${value.replace(/"/g, '\\"')}"`;
}
const SKIP_DIRS = new Set(["node_modules", ".git"]);
function findNestedGitFolders(rootDir) {
    const results = [];
    const stack = [rootDir];
    while (stack.length > 0) {
        const current = stack.pop();
        let entries;
        try {
            entries = fs.readdirSync(current, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            const fullPath = path.join(current, entry.name);
            if (entry.name === ".git" && current !== rootDir) {
                results.push(fullPath);
                // don't descend into nested repos
            }
            else if (!SKIP_DIRS.has(entry.name)) {
                stack.push(fullPath);
            }
        }
    }
    return results;
}
async function listInfrastructureYamlFiles(repoRoot) {
    const infraRoot = path.join(repoRoot, "config", "Infrastructure");
    if (!fs.existsSync(infraRoot))
        return [];
    const results = [];
    const stack = [infraRoot];
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current)
            break;
        let entries;
        try {
            entries = await fs.promises.readdir(current, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(fullPath);
                continue;
            }
            if (!entry.isFile())
                continue;
            const ext = path.extname(entry.name).toLowerCase();
            if (ext === ".yaml" || ext === ".yml") {
                results.push(fullPath);
            }
        }
    }
    return results.sort((a, b) => a.localeCompare(b));
}
function parseEnvFile(filePath) {
    const values = {};
    if (!fs.existsSync(filePath))
        return values;
    let content = "";
    try {
        content = fs.readFileSync(filePath, "utf8");
    }
    catch {
        return values;
    }
    for (const rawLine of content.split(/\r?\n/)) {
        let line = rawLine.trim();
        if (!line || line.startsWith("#"))
            continue;
        if (line.startsWith("export ")) {
            line = line.slice("export ".length).trim();
        }
        const eqIndex = line.indexOf("=");
        if (eqIndex <= 0)
            continue;
        const key = line.slice(0, eqIndex).trim();
        let value = line.slice(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (key)
            values[key.toLowerCase()] = value;
    }
    return values;
}
async function waitForUrlReady(url, timeoutMs = 30000, intervalMs = 1000) {
    const client = url.startsWith("https") ? https : http;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const ready = await new Promise((resolve) => {
            const req = client.get(url, (res) => {
                res.resume();
                resolve((res.statusCode ?? 0) < 500);
            });
            req.on("error", () => resolve(false));
            req.setTimeout(intervalMs, () => {
                req.destroy();
                resolve(false);
            });
        });
        if (ready)
            return true;
        await new Promise((r) => setTimeout(r, intervalMs));
    }
    return false;
}
//# sourceMappingURL=utils.js.map