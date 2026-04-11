"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAutocommitRunning = isAutocommitRunning;
exports.startAutocommit = startAutocommit;
exports.stopAutocommit = stopAutocommit;
exports.hasGitHubRemote = hasGitHubRemote;
const path = require("path");
const child_process_1 = require("child_process");
const utils_1 = require("./utils");
const logger_1 = require("./logger");
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
        (0, logger_1.log)(`checkpoint: ${result}`);
    });
}
function startAutocommit(repoRoot) {
    if (autocommitTimers.has(repoRoot))
        return;
    (0, logger_1.log)(`startAutocommit: ${repoRoot}`);
    const timer = setInterval(() => commitCheckpoint(repoRoot), 5 * 60 * 1000);
    autocommitTimers.set(repoRoot, timer);
}
function stopAutocommit(repoRoot) {
    const timer = autocommitTimers.get(repoRoot);
    if (timer) {
        clearInterval(timer);
        autocommitTimers.delete(repoRoot);
    }
    (0, logger_1.log)(`stopAutocommit: ${repoRoot}`);
}
function hasGitHubRemote(repoRoot) {
    return new Promise((resolve) => {
        (0, child_process_1.exec)(`git -C "${repoRoot}" remote -v`, (_err, stdout) => {
            resolve(typeof stdout === "string" && stdout.includes("github.com"));
        });
    });
}
//# sourceMappingURL=git.js.map