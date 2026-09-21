#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VSCODE_SETTINGS="$SCRIPT_DIR/.vscode/settings.json"
DEST="$SCRIPT_DIR/tmp/structure-test"
ZIP_TMP="$(mktemp).zip"
DEFAULT_REPO_URL="https://github.com/diegosfb/antigravity-task-runner"

cleanup() { rm -f "$ZIP_TMP"; }
trap cleanup EXIT

# Read repo URL from the workspace VS Code setting. Fall back to the same
# default contributed by the extension when the workspace setting is absent.
REPO_URL=$(python3 - "$VSCODE_SETTINGS" "$DEFAULT_REPO_URL" <<'PY'
import json
import sys

settings_path, default = sys.argv[1], sys.argv[2]
try:
    with open(settings_path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
except (FileNotFoundError, json.JSONDecodeError):
    data = {}

value = data.get("antigravity.projectStructureAndAgentsRepository") or default
print(value)
PY
)

if [ -z "$REPO_URL" ]; then
  echo "Error: antigravity.projectStructureAndAgentsRepository is empty"
  exit 1
fi

# Convert https://github.com/owner/repo.git → raw download base
REPO_PATH="${REPO_URL#https://github.com/}"
REPO_PATH="${REPO_PATH%.git}"
RAW_URL="https://raw.githubusercontent.com/$REPO_PATH/main/project-structure.zip"

echo "Downloading project-structure.zip from $REPO_PATH ..."
curl -fL "$RAW_URL" -o "$ZIP_TMP"

mkdir -p "$DEST"

# Find files in the zip that already exist in the destination
echo "Checking for existing files ..."
CONFLICTS=$(unzip -l "$ZIP_TMP" | awk 'NR>3 && NF==4 && $NF !~ /\/$/ {print $NF}' | while IFS= read -r f; do
  [ -f "$DEST/$f" ] && echo "  $f"
done || true)

if [ -n "$CONFLICTS" ]; then
  echo "These files already exist in $DEST:"
  echo "$CONFLICTS"
  printf "Overwrite existing files? [y/N] "
  read -r answer
  if [[ "${answer:-}" =~ ^[Yy]$ ]]; then
    unzip -o "$ZIP_TMP" -d "$DEST"
  else
    echo "Keeping existing files, extracting only new ones ..."
    unzip -n "$ZIP_TMP" -d "$DEST"
  fi
else
  unzip -o "$ZIP_TMP" -d "$DEST"
fi

echo "Done. Structure extracted to $DEST"
