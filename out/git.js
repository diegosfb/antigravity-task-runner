"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAutocommitRunning = isAutocommitRunning;
exports.appendAutocommitLogLine = appendAutocommitLogLine;
exports.startAutocommit = startAutocommit;
exports.stopAutocommit = stopAutocommit;
exports.hasGitHubRemote = hasGitHubRemote;
const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process_1 = require("child_process");
const utils_1 = require("./utils");
const autocommitTimers = new Map();
function isTruthyEnvValue(value) {
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "yes", "on", "running", "started", "start", "enabled"].includes(normalized);
}
function isFalsyEnvValue(value) {
    const normalized = value.trim().toLowerCase();
    return ["0", "false", "no", "off", "stopped", "stop", "disabled"].includes(normalized);
}
function isAutocommitRunning(repoRoot) {
    const envPath = path.join(repoRoot, ".env");
    const env = (0, utils_1.parseEnvFile)(envPath);
    const keys = [
        "autocommit_running",
        "autocommit_enabled",
        "autocommit_active",
        "autocommit_status",
        "autocommit",
        "autocommiting",
        "autocommitting"
    ];
    for (const key of keys) {
        const value = env[key];
        if (value === undefined)
            continue;
        if (isFalsyEnvValue(value))
            return false;
        return isTruthyEnvValue(value);
    }
    const pid = env["autocommit_pid"] ?? env["agentic_autocommit_pid"];
    if (pid && /^[0-9]+$/.test(pid.trim()))
        return true;
    return autocommitTimers.has(repoRoot);
}
async function appendAutocommitLogLine(message) {
    const logDir = path.join(os.homedir(), "Downloads", "log");
    const logFile = path.join(logDir, "autocommit.log");
    const timestamp = new Date().toISOString();
    const line = `${timestamp} ${message}\n`;
    try {
        await fs.promises.mkdir(logDir, { recursive: true });
        await fs.promises.appendFile(logFile, line, "utf8");
    }
    catch {
        // best-effort logging
    }
}
function commitCheckpoint(repoRoot) {
    const timestamp = new Date().toISOString();
    const msg = `[AGENTIC DEV CHECKPOINT] ${timestamp}`;
    const cmd = [
        `cd "${repoRoot}"`,
        `git add -A`,
        `git diff --cached --quiet || git commit -m "${msg.replace(/"/g, '\\"')}"`,
        `git push`
    ].join(" && ");
    (0, child_process_1.exec)(cmd, (_err, stdout) => {
        const result = stdout?.trim() || "ok";
        void appendAutocommitLogLine(`checkpoint: ${result}`);
    });
}
async function startAutocommit(repoRoot) {
    if (autocommitTimers.has(repoRoot))
        return;
    await appendAutocommitLogLine(`startAutocommit: ${repoRoot}`);
    const timer = setInterval(() => commitCheckpoint(repoRoot), 5 * 60 * 1000);
    autocommitTimers.set(repoRoot, timer);
}
async function stopAutocommit(repoRoot) {
    const timer = autocommitTimers.get(repoRoot);
    if (timer) {
        clearInterval(timer);
        autocommitTimers.delete(repoRoot);
    }
    await appendAutocommitLogLine(`stopAutocommit: ${repoRoot}`);
}
function hasGitHubRemote(repoRoot) {
    return new Promise((resolve) => {
        (0, child_process_1.exec)(`git -C "${repoRoot}" remote -v`, (_err, stdout) => {
            resolve(typeof stdout === "string" && stdout.includes("github.com"));
        });
    });
}
//# sourceMappingURL=git.js.map