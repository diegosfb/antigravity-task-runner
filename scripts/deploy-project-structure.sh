#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VSCODE_SETTINGS="$PROJECT_ROOT/.vscode/settings.json"
TMP_DIR="${PROJECT_STRUCTURE_TMP:-$PROJECT_ROOT/tmp}"
ZIP_PATH="$TMP_DIR/project-structure.zip"
DEFAULT_REPO_URL="https://github.com/diegosfb/antigravity-task-runner"
CONFLICTS_PATH="$(mktemp)"
exec 3<&0

cleanup() {
  rm -f "$CONFLICTS_PATH"
  exec 3<&- || true
}
trap cleanup EXIT

prompt_user() {
  local prompt="$1"
  local answer

  if [ "${PROJECT_STRUCTURE_USE_OSASCRIPT:-1}" != "0" ] && command -v osascript >/dev/null 2>&1; then
    answer=$(osascript - "$prompt" <<'OSA' 2>/dev/null || true
on run argv
  set promptText to item 1 of argv
  try
    set dialogResult to display dialog promptText default answer "" buttons {"Cancel", "OK"} default button "OK"
    return text returned of dialogResult
  on error
    return ""
  end try
end run
OSA
)
    [ -n "$answer" ] || return 1
  elif [ -t 3 ] && [ -t 1 ]; then
    printf "%s" "$prompt" >&2
    IFS= read -r answer <&3 || return 1
  elif [ "${PROJECT_STRUCTURE_READ_STDIN:-1}" != "0" ]; then
    printf "%s" "$prompt" >&2
    IFS= read -r -t "${PROJECT_STRUCTURE_PROMPT_TIMEOUT:-1}" answer <&3 || return 1
  else
    return 1
  fi

  printf "%s\n" "$answer"
}

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
unzip -Z1 "$ZIP_PATH" | while IFS= read -r file_path; do
  [ -z "$file_path" ] && continue
  [[ "$file_path" == */ ]] && continue
  if [ -f "$DEST/$file_path" ]; then
    printf "%s\n" "$file_path"
  fi
done > "$CONFLICTS_PATH"

if [ -s "$CONFLICTS_PATH" ]; then
  echo "These files already exist in $DEST:"
  sed 's/^/  /' "$CONFLICTS_PATH"
  if [[ "${PROJECT_STRUCTURE_OVERWRITE:-}" =~ ^([Yy]|[Yy][Ee][Ss]|1|[Tt][Rr][Uu][Ee])$ ]]; then
    echo "PROJECT_STRUCTURE_OVERWRITE is enabled; overwriting existing files ..."
    unzip -o "$ZIP_PATH" -d "$DEST"
  else
    OVERWRITE_ALL=0
    CAN_PROMPT=1

    while IFS= read -r conflict_path; do
      while true; do
        echo
        echo "Existing file: $conflict_path"
        if ! answer=$(prompt_user "Overwrite? Type A for All, N for None, or T for This file only (default N): "); then
          CAN_PROMPT=0
          break 2
        fi

        case "${answer:-N}" in
          [Aa]|[Aa][Ll][Ll])
            echo "Warning: choosing All overwrites every existing file listed above."
            confirm=$(prompt_user "Type ALL to confirm overwriting all existing files: " || true)
            if [ "$confirm" = "ALL" ]; then
              OVERWRITE_ALL=1
              break 2
            fi
            echo "All overwrite was not confirmed."
            ;;
          [Nn]|[Nn][Oo]|[Nn][Oo][Nn][Ee])
            echo "Keeping existing files, extracting only new ones ..."
            break 2
            ;;
          [Tt]|[Tt][Hh][Ii][Ss]|[Tt][Hh][Ii][Ss]" "[Ff][Ii][Ll][Ee])
            unzip -o "$ZIP_PATH" "$conflict_path" -d "$DEST"
            break
            ;;
          *)
            echo "Invalid choice. Enter A for All, N for None, or T for This file only."
            ;;
        esac
      done
    done < "$CONFLICTS_PATH"

    if [ "$OVERWRITE_ALL" -eq 1 ]; then
      unzip -o "$ZIP_PATH" -d "$DEST"
    else
      if [ "$CAN_PROMPT" -eq 0 ]; then
        echo "No interactive input is available; keeping existing files and extracting only new ones ..."
      fi
      unzip -n "$ZIP_PATH" -d "$DEST"
    fi
  fi
else
  unzip -o "$ZIP_PATH" -d "$DEST"
fi

echo "Done. Downloaded $ZIP_PATH and extracted it to $DEST"
