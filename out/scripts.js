"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadInfrastructureFileIfMissing = downloadInfrastructureFileIfMissing;
exports.downloadConfigFileIfMissing = downloadConfigFileIfMissing;
exports.ensureScriptFile = ensureScriptFile;
exports.runRepoScript = runRepoScript;
exports.openFile = openFile;
exports.runWorkflow = runWorkflow;
exports.runAgent = runAgent;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const https = require("https");
const utils_1 = require("./utils");
const terminal_1 = require("./terminal");
const SCRIPT_FALLBACK_BASE_URL = "https://raw.githubusercontent.com/diegosfb/antigravity-workspace/main/scripts";
const CONFIG_FALLBACK_BASE_URL = "https://raw.githubusercontent.com/diegosfb/antigravity-workspace/main/config";
function buildScriptUrl(baseUrl, scriptFileName) {
    // Convert github.com blob URLs to raw URLs.
    let url = baseUrl;
    if (url.includes("github.com/") && !url.includes("raw.githubusercontent.com")) {
        url = url
            .replace("https://github.com/", "https://raw.githubusercontent.com/")
            .replace("/blob/", "/");
    }
    url = url.replace(/\/+$/, "");
    // If the base URL already ends with /scripts, append filename directly.
    if (url.endsWith("/scripts")) {
        return `${url}/${scriptFileName}`;
    }
    return `${url}/scripts/${scriptFileName}`;
}
function getScriptFallbackUrl(scriptFileName) {
    const config = vscode.workspace.getConfiguration("antigravity");
    const baseUrl = config.get("scriptFallbackBaseUrl") || SCRIPT_FALLBACK_BASE_URL;
    return buildScriptUrl(baseUrl, scriptFileName);
}
function getConfigFallbackUrl(fileName) {
    const config = vscode.workspace.getConfiguration("antigravity");
    let baseUrl = config.get("configFallbackBaseUrl") || CONFIG_FALLBACK_BASE_URL;
    if (baseUrl.includes("github.com/") && !baseUrl.includes("raw.githubusercontent.com")) {
        baseUrl = baseUrl
            .replace("https://github.com/", "https://raw.githubusercontent.com/")
            .replace("/blob/", "/");
    }
    baseUrl = baseUrl.replace(/\/+$/, "");
    return `${baseUrl}/${fileName}`;
}
function readYamlStringField(filePath, fieldName) {
    try {
        const content = fs.readFileSync(filePath, "utf8");
        for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (trimmed.startsWith(`${fieldName}:`)) {
                const value = trimmed.slice(fieldName.length + 1).trim();
                if (value)
                    return value;
            }
        }
    }
    catch { /* ignore */ }
    return undefined;
}
async function downloadInfrastructureFileIfMissing(repoRoot, settingsFileName) {
    const settingsPath = path.join(repoRoot, "config", settingsFileName);
    if (!fs.existsSync(settingsPath))
        return;
    const infraRef = readYamlStringField(settingsPath, "Infrastructure");
    if (!infraRef)
        return;
    const localPath = path.join(repoRoot, infraRef);
    if (fs.existsSync(localPath))
        return;
    // Strip leading "config/" — configFallbackBaseUrl already points to the config directory.
    const urlRelativePath = infraRef.replace(/^config\//, "");
    const url = getConfigFallbackUrl(urlRelativePath);
    const answer = await vscode.window.showWarningMessage(`Infrastructure file ${infraRef} is missing. Download from ${url}?`, "Yes", "No");
    if (answer !== "Yes")
        return;
    try {
        await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
        await downloadFile(url, localPath);
    }
    catch (error) {
        const raw = error instanceof Error ? error.message : String(error);
        const message = raw || "Request failed (unknown error)";
        void vscode.window.showErrorMessage(`Failed to download ${infraRef}: ${message}`, { modal: true }, "OK");
    }
}
async function downloadConfigFileIfMissing(repoRoot, fileName) {
    const filePath = path.join(repoRoot, "config", fileName);
    if (fs.existsSync(filePath))
        return;
    const url = getConfigFallbackUrl(fileName);
    const answer = await vscode.window.showWarningMessage(`Config file config/${fileName} is missing. Download from ${url}?`, "Yes", "No");
    if (answer !== "Yes")
        return;
    try {
        await fs.promises.mkdir(path.join(repoRoot, "config"), { recursive: true });
        await downloadFile(url, filePath);
    }
    catch (error) {
        const raw = error instanceof Error ? error.message : String(error);
        const message = raw || "Request failed (unknown error)";
        void vscode.window.showErrorMessage(`Failed to download config/${fileName}: ${message}`, { modal: true }, "OK");
    }
}
function downloadFile(url, destination) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, (response) => {
            if (response.statusCode &&
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location) {
                response.resume();
                void downloadFile(response.headers.location, destination).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                const status = response.statusCode ?? "unknown";
                response.resume();
                if (status === 404) {
                    reject(new Error(`File not found at URL (404). Make sure it exists in your repo.`));
                }
                else {
                    reject(new Error(`HTTP ${status}`));
                }
                return;
            }
            const fileStream = fs.createWriteStream(destination, { mode: 0o755 });
            response.pipe(fileStream);
            fileStream.on("finish", () => {
                fileStream.close((closeError) => {
                    if (closeError) {
                        reject(closeError);
                        return;
                    }
                    resolve();
                });
            });
            fileStream.on("error", (error) => {
                fileStream.close(() => reject(error));
            });
        });
        request.on("error", (error) => { reject(error); });
    });
}
async function downloadScript(scriptFileName, repoRoot, scriptsDir) {
    const url = getScriptFallbackUrl(scriptFileName);
    const targetDir = scriptsDir ?? path.join(repoRoot, "workspace", "scripts");
    try {
        await fs.promises.mkdir(targetDir, { recursive: true });
        const destination = path.join(targetDir, scriptFileName);
        try {
            await downloadFile(url, destination);
            await fs.promises.chmod(destination, 0o755);
            return destination;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            try {
                await fs.promises.unlink(destination);
            }
            catch { /* ignore */ }
            void vscode.window.showErrorMessage(`Failed to download ${scriptFileName} from ${url}: ${message}`);
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        void vscode.window.showErrorMessage(`Failed to download ${scriptFileName}: ${message}`);
    }
    return undefined;
}
async function ensureScriptFile(repoRoot, scriptFileName, scriptsDir, fallbackDir) {
    const targetDir = scriptsDir ?? path.join(repoRoot, "workspace", "scripts");
    const scriptPath = path.join(targetDir, scriptFileName);
    if (fs.existsSync(scriptPath))
        return scriptPath;
    if (fallbackDir) {
        const fallbackPath = path.join(fallbackDir, scriptFileName);
        if (fs.existsSync(fallbackPath))
            return fallbackPath;
    }
    return await downloadScript(scriptFileName, repoRoot, targetDir);
}
async function runRepoScript(scriptName, args = [], options = {}) {
    const rootPath = (0, utils_1.getRootPath)();
    if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        await (0, terminal_1.runInSecondaryTerminal)([`echo "[antigravity] ERROR: rootPath not set or invalid"`]);
        return;
    }
    const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
    const workingDir = options.cwd || repoRoot;
    const scriptFileName = `${scriptName}.sh`;
    const scriptPath = await ensureScriptFile(repoRoot, scriptFileName, options.scriptDir, options.fallbackScriptDir);
    if (!scriptPath) {
        await (0, terminal_1.runInSecondaryTerminal)([
            `echo "[antigravity] ERROR: script not found: ${scriptFileName}"`,
            `echo "[antigravity] looked in: ${options.scriptDir ?? path.join(repoRoot, "workspace", "scripts")}"`
        ]);
        return;
    }
    await fs.promises.chmod(scriptPath, 0o755).catch(() => { });
    const argString = args.map((arg) => (0, utils_1.quoteShellArg)(arg)).join(" ");
    const command = argString
        ? `${(0, utils_1.quoteShellArg)(scriptPath)} ${argString}`
        : (0, utils_1.quoteShellArg)(scriptPath);
    await (0, terminal_1.runInSecondaryTerminal)([
        `echo "[antigravity] running: ${scriptFileName} ${argString}"`,
        `echo "[antigravity] cwd: ${workingDir}"`,
        `cd ${(0, utils_1.quoteShellArg)(workingDir)}`,
        command
    ]);
}
async function openFile(filePath) {
    const uri = vscode.Uri.file(filePath);
    await vscode.window.showTextDocument(uri, { preview: false });
}
async function runWorkflow(workflowFile) {
    const rootPath = (0, utils_1.getRootPath)();
    if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
    }
    const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
    const workspaceRoot = (0, utils_1.getWorkspaceRoot)() || repoRoot;
    const workflowName = path.basename(workflowFile, ".md");
    const scriptPath = path.join(repoRoot, "scripts", `${workflowName}.sh`);
    if (fs.existsSync(scriptPath)) {
        await (0, terminal_1.runInSecondaryTerminal)([
            `cd "${workspaceRoot}"`,
            `./scripts/${path.basename(scriptPath)}`
        ]);
        return;
    }
    await openFile(workflowFile);
}
function getAntigravityExecutable() {
    return (vscode.workspace.getConfiguration("antigravity").get("antigravityPath") ||
        "antigravity");
}
function getAntigravityArgsTemplate() {
    return (vscode.workspace.getConfiguration("antigravity").get("antigravityArgs") ||
        '--agent "{agent}"');
}
function interpolateAgentArgs(template, agentName, agentFile) {
    return template.replace(/\{agent\}/g, agentName).replace(/\{agentFile\}/g, agentFile);
}
async function runAgent(agentName, agentFile) {
    const rootPath = (0, utils_1.getRootPath)();
    if (!rootPath) {
        void vscode.window.showErrorMessage("Antigravity rootPath is not set or invalid.");
        return;
    }
    const repoRoot = (0, utils_1.getRepoRoot)(rootPath);
    const safeAgentName = agentName.replace(/"/g, '\\"');
    const safeAgentFile = agentFile.replace(/"/g, '\\"');
    const command = getAntigravityExecutable();
    const args = interpolateAgentArgs(getAntigravityArgsTemplate(), safeAgentName, safeAgentFile).trim();
    await (0, terminal_1.runInSecondaryTerminal)([
        `cd "${repoRoot}"`,
        args ? `${command} ${args}` : command
    ]);
}
//# sourceMappingURL=scripts.js.map