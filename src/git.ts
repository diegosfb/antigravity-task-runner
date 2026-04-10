import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { parseEnvFile } from "./utils";

const autocommitTimers = new Map<string, NodeJS.Timeout>();

function isTruthyEnvValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "on", "running", "started", "start", "enabled"].includes(normalized);
}

function isFalsyEnvValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ["0", "false", "no", "off", "stopped", "stop", "disabled"].includes(normalized);
}

export function isAutocommitRunning(repoRoot: string): boolean {
  const envPath = path.join(repoRoot, ".env");
  const env = parseEnvFile(envPath);
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
    if (value === undefined) continue;
    if (isFalsyEnvValue(value)) return false;
    return isTruthyEnvValue(value);
  }
  const pid = env["autocommit_pid"];
  if (pid && /^[0-9]+$/.test(pid.trim())) return true;
  return autocommitTimers.has(repoRoot);
}

export async function appendAutocommitLogLine(message: string): Promise<void> {
  const logDir = path.join(os.homedir(), "Downloads", "log");
  const logFile = path.join(logDir, "autocommit.log");
  const timestamp = new Date().toISOString();
  const line = `${timestamp} ${message}\n`;
  try {
    await fs.promises.mkdir(logDir, { recursive: true });
    await fs.promises.appendFile(logFile, line, "utf8");
  } catch {
    // best-effort logging
  }
}

function commitCheckpoint(repoRoot: string): void {
  const timestamp = new Date().toISOString();
  const msg = `[AGENTIC DEV CHECKPOINT] ${timestamp}`;
  const cmd = [
    `cd "${repoRoot}"`,
    `git add -A`,
    `git diff --cached --quiet || git commit -m "${msg.replace(/"/g, '\\"')}"`,
    `git push`
  ].join(" && ");
  exec(cmd, (_err, stdout) => {
    const result = stdout?.trim() || "ok";
    void appendAutocommitLogLine(`checkpoint: ${result}`);
  });
}

export async function startAutocommit(repoRoot: string): Promise<void> {
  if (autocommitTimers.has(repoRoot)) return;
  await appendAutocommitLogLine(`startAutocommit: ${repoRoot}`);
  const timer = setInterval(() => commitCheckpoint(repoRoot), 5 * 60 * 1000);
  autocommitTimers.set(repoRoot, timer);
}

export async function stopAutocommit(repoRoot: string): Promise<void> {
  const timer = autocommitTimers.get(repoRoot);
  if (timer) {
    clearInterval(timer);
    autocommitTimers.delete(repoRoot);
  }
  await appendAutocommitLogLine(`stopAutocommit: ${repoRoot}`);
}

export function hasGitHubRemote(repoRoot: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`git -C "${repoRoot}" remote -v`, (_err, stdout) => {
      resolve(typeof stdout === "string" && stdout.includes("github.com"));
    });
  });
}
