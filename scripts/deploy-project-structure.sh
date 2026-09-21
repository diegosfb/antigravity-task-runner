#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VSCODE_SETTINGS="$PROJECT_ROOT/.vscode/settings.json"
TMP_DIR="${PROJECT_STRUCTURE_TMP:-$PROJECT_ROOT/tmp}"
ZIP_PATH="$TMP_DIR/project-structure.zip"
DEFAULT_REPO_URL="https://github.com/diegosfb/antigravity-task-runner"

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
DEST=$(python3 - "$VSCODE_SETTINGS" "$PROJECT_ROOT" <<'PY'
import json
import os
import sys

settings_path, project_root = sys.argv[1], sys.argv[2]
try:
    with open(settings_path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
except (FileNotFoundError, json.JSONDecodeError):
    data = {}

value = data.get("antigravity.workspaceProjectPath") or "./"
value = os.path.expanduser(value)
if not os.path.isabs(value):
    value = os.path.abspath(os.path.join(project_root, value))
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
RAW_BASE="https://raw.githubusercontent.com/$REPO_PATH/main"
ZIP_URL="$RAW_BASE/project-structure.zip"

echo "Downloading project-structure.zip from $REPO_PATH ..."
echo "Extracting to Workspace Project Path: $DEST"
mkdir -p "$TMP_DIR" "$DEST"
if ! curl -fL "$ZIP_URL" -o "$ZIP_PATH"; then
  echo "Error: project-structure.zip could not be downloaded from $ZIP_URL"
  echo "Make sure the configured repository contains project-structure.zip on the main branch."
  exit 1
fi

# Find files in the zip that already exist in the destination
echo "Checking for existing files ..."
CONFLICTS=$(unzip -l "$ZIP_PATH" | awk 'NR>3 && NF==4 && $NF !~ /\/$/ {print $NF}' | while IFS= read -r f; do
  [ -f "$DEST/$f" ] && echo "  $f"
done || true)

if [ -n "$CONFLICTS" ]; then
  echo "These files already exist in $DEST:"
  echo "$CONFLICTS"
  if [[ "${PROJECT_STRUCTURE_OVERWRITE:-}" =~ ^([Yy]|[Yy][Ee][Ss]|1|[Tt][Rr][Uu][Ee])$ ]]; then
    echo "PROJECT_STRUCTURE_OVERWRITE is enabled; overwriting existing files ..."
    unzip -o "$ZIP_PATH" -d "$DEST"
  elif [ -t 0 ] && [ -t 1 ]; then
    printf "Overwrite existing files? [y/N] "
    read -r answer
    if [[ "${answer:-}" =~ ^[Yy]$ ]]; then
      unzip -o "$ZIP_PATH" -d "$DEST"
    else
      echo "Keeping existing files, extracting only new ones ..."
      unzip -n "$ZIP_PATH" -d "$DEST"
    fi
  else
    echo "No interactive input is available; keeping existing files and extracting only new ones ..."
    unzip -n "$ZIP_PATH" -d "$DEST"
  fi
else
  unzip -o "$ZIP_PATH" -d "$DEST"
fi

echo "Done. Downloaded $ZIP_PATH and extracted it to $DEST"
