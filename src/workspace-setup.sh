#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/diegosfb/antigravity-workspace"
TARBALL_URL="${REPO_URL}/archive/refs/heads/main.tar.gz"
TMP_DIR="$(mktemp -d -t antigravity-workspace-setup.XXXXXX)"
DEST_DIR="$(pwd)"

cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to run workspace-setup." >&2
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required to run workspace-setup." >&2
  exit 1
fi

curl -fsSL "${TARBALL_URL}" | tar -xz -C "${TMP_DIR}"
SRC_DIR="${TMP_DIR}/$(ls "${TMP_DIR}")"

# Sync the entire repo without overwriting existing local files.
rsync -a --ignore-existing \
  --exclude ".agent/global-config" \
  --exclude ".gitignore" \
  "${SRC_DIR}/" "${DEST_DIR}/"

echo "workspace-setup: copied missing files from ${REPO_URL}"

# Create agent harness folders and symlinks into .agent if not already present.
create_agent_symlinks() {
  local agent_dir="$1"
  local label="$2"
  if [ ! -d "${agent_dir}" ]; then
    mkdir -p "${agent_dir}"
  fi
  if [ ! -e "${agent_dir}/skills" ]; then
    ln -s "../.agent/skills" "${agent_dir}/skills"
    echo "workspace-setup: created symlink .${label}/skills -> .agent/skills"
  fi
  if [ ! -e "${agent_dir}/agents" ]; then
    ln -s "../.agent/agents" "${agent_dir}/agents"
    echo "workspace-setup: created symlink .${label}/agents -> .agent/agents"
  fi
}

create_agent_symlinks "${DEST_DIR}/.claude" "claude"
create_agent_symlinks "${DEST_DIR}/.codex" "codex"
