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
