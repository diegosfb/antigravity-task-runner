#!/usr/bin/env bash
set -euo pipefail

MODEL=""
BASE_URL=""
AUTH_TOKEN=""
API_KEY=""
EFFORT_LEVEL=""
INTERNAL_MODEL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --model)
      MODEL="${2:-}"
      shift 2
      ;;
    --baseurl)
      BASE_URL="${2:-}"
      shift 2
      ;;
    --auth-token)
      AUTH_TOKEN="${2:-}"
      shift 2
      ;;
    --api-key)
      API_KEY="${2:-}"
      shift 2
      ;;
    --effort-level)
      EFFORT_LEVEL="${2:-}"
      shift 2
      ;;
    --internal-model)
      INTERNAL_MODEL="${2:-}"
      shift 2
      ;;
    *)
      MODEL="$1"
      shift
      ;;
  esac
 done

if [[ -z "${MODEL}" ]]; then
  MODEL="qwen/qwen3-coder-480b"
fi

SETTINGS="${HOME}/.claude/settings.json"
ENV_FILE="${HOME}/.claude/.env"

if [[ ! -f "${SETTINGS}" ]]; then
  echo "Error: ${SETTINGS} not found." >&2
  exit 1
fi

NODE_BINARY="node"
if ! command -v "${NODE_BINARY}" >/dev/null 2>&1; then
  echo "Error: node is required to update ${SETTINGS}." >&2
  exit 1
fi

CLAUDE_SETTINGS_PATH="${SETTINGS}" \
CLAUDE_ENV_PATH="${ENV_FILE}" \
CLAUDE_MODEL="${MODEL}" \
CLAUDE_BASE_URL="${BASE_URL}" \
CLAUDE_AUTH_TOKEN="${AUTH_TOKEN}" \
CLAUDE_API_KEY="${API_KEY}" \
CLAUDE_EFFORT_LEVEL="${EFFORT_LEVEL}" \
CLAUDE_INTERNAL_MODEL="${INTERNAL_MODEL}" \
"${NODE_BINARY}" <<'NODE'
const fs = require("fs");

const settingsPath = process.env.CLAUDE_SETTINGS_PATH || `${process.env.HOME}/.claude/settings.json`;
const envPath = process.env.CLAUDE_ENV_PATH || `${process.env.HOME}/.claude/.env`;

const raw = fs.readFileSync(settingsPath, "utf8");
const data = JSON.parse(raw);

const envUpdates = {
  ANTHROPIC_MODEL: process.env.CLAUDE_MODEL,
  ANTHROPIC_BASE_URL: process.env.CLAUDE_BASE_URL,
  ANTHROPIC_AUTH_TOKEN: process.env.CLAUDE_AUTH_TOKEN,
  ANTHROPIC_API_KEY: process.env.CLAUDE_API_KEY
};

const nextData = {
  ...data,
  ...(process.env.CLAUDE_EFFORT_LEVEL !== undefined
    ? { effortLevel: process.env.CLAUDE_EFFORT_LEVEL }
    : {}),
  ...(process.env.CLAUDE_INTERNAL_MODEL !== undefined
    ? { model: process.env.CLAUDE_INTERNAL_MODEL }
    : {}),
  ...(Object.values(envUpdates).some((value) => value !== undefined)
    ? {
        env: {
          ...(data.env || {}),
          ...(envUpdates.ANTHROPIC_MODEL !== undefined
            ? { ANTHROPIC_MODEL: envUpdates.ANTHROPIC_MODEL }
            : {}),
          ...(envUpdates.ANTHROPIC_BASE_URL !== undefined
            ? { ANTHROPIC_BASE_URL: envUpdates.ANTHROPIC_BASE_URL }
            : {}),
          ...(envUpdates.ANTHROPIC_AUTH_TOKEN !== undefined
            ? { ANTHROPIC_AUTH_TOKEN: envUpdates.ANTHROPIC_AUTH_TOKEN }
            : {}),
          ...(envUpdates.ANTHROPIC_API_KEY !== undefined
            ? { ANTHROPIC_API_KEY: envUpdates.ANTHROPIC_API_KEY }
            : {})
        }
      }
    : {})
};

fs.writeFileSync(settingsPath, JSON.stringify(nextData, null, 2) + "\n");

const updates = envUpdates;

let envText = "";
if (fs.existsSync(envPath)) {
  envText = fs.readFileSync(envPath, "utf8");
}

const lines = envText.split(/\r?\n/);
const keys = Object.keys(updates);
const seen = new Set();

const nextLines = lines.map((line) => {
  const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (!match) return line;
  const key = match[1];
  if (!keys.includes(key)) return line;
  seen.add(key);
  const value = updates[key];
  if (value === undefined) return line;
  return `${key}=${value}`;
});

for (const key of keys) {
  if (seen.has(key)) continue;
  const value = updates[key];
  if (value === undefined) continue;
  nextLines.push(`${key}=${value}`);
}

fs.writeFileSync(envPath, nextLines.filter((line) => line.length > 0).join("\n") + "\n");
NODE

echo "Updated Claude settings in ${SETTINGS}"
