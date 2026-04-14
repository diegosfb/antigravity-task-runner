#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(pwd -P)"
SETTINGS_DIR="${REPO_ROOT}/.vscode"
SETTINGS_FILE="${SETTINGS_DIR}/settings.json"

ENV_NAME=""
PYTHON_PATH=""
SKIP_CACHE_CLEAR=0
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage:
  bash scripts/fix-vscode-python.sh [--env <conda-env-name> | --python <python-path>] [--skip-cache-clear] [--dry-run]

Examples:
  bash scripts/fix-vscode-python.sh
  bash scripts/fix-vscode-python.sh --env base
  bash scripts/fix-vscode-python.sh --python /opt/anaconda3/envs/my_env/bin/python
  bash scripts/fix-vscode-python.sh --dry-run
EOF
}

have_cmd() {
  command -v "$1" >/dev/null 2>&1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      [[ $# -ge 2 ]] || {
        echo "--env requires a value" >&2
        exit 1
      }
      ENV_NAME="$2"
      shift 2
      ;;
    --python)
      [[ $# -ge 2 ]] || {
        echo "--python requires a value" >&2
        exit 1
      }
      PYTHON_PATH="$2"
      shift 2
      ;;
    --skip-cache-clear)
      SKIP_CACHE_CLEAR=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -n "$ENV_NAME" && -n "$PYTHON_PATH" ]]; then
  echo "Use either --env or --python, not both." >&2
  exit 1
fi

resolve_target_python() {
  if [[ -n "$PYTHON_PATH" ]]; then
    [[ -x "$PYTHON_PATH" ]] || {
      echo "Python executable not found: $PYTHON_PATH" >&2
      exit 1
    }
    printf "%s\n" "$(cd "$(dirname "$PYTHON_PATH")" && pwd -P)/$(basename "$PYTHON_PATH")"
    return
  fi

  if have_cmd conda; then
    local resolved
    resolved="$(conda info --json 2>/dev/null | node -e '
let raw = "";
const [requestedEnv] = process.argv.slice(1);

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  const data = JSON.parse(raw);
  const envs = Array.isArray(data.envs) ? data.envs : [];
  const normalizeName = (envPath) => envPath === data.root_prefix ? "base" : envPath.split("/").pop();

  let selectedPath = "";

  if (requestedEnv) {
    for (const envPath of envs) {
      if (normalizeName(envPath) === requestedEnv) {
        selectedPath = envPath;
        break;
      }
    }
  } else if (data.active_prefix) {
    selectedPath = data.active_prefix;
  } else if (data.default_prefix) {
    selectedPath = data.default_prefix;
  }

  if (!selectedPath) {
    process.exit(2);
  }

  process.stdout.write(`${selectedPath}/bin/python`);
});
' "$ENV_NAME"
)"
    if [[ -n "$resolved" && -x "$resolved" ]]; then
      printf "%s\n" "$resolved"
      return
    fi
  fi

  if have_cmd python; then
    printf "%s\n" "$(command -v python)"
    return
  fi

  echo "Unable to resolve a Python interpreter." >&2
  exit 1
}

find_workspace_storage_dirs() {
  local base
  local workspace_json

  for base in \
    "$HOME/Library/Application Support/Antigravity/User/workspaceStorage" \
    "$HOME/Library/Application Support/Code/User/workspaceStorage"
  do
    [[ -d "$base" ]] || continue

    for workspace_json in "$base"/*/workspace.json; do
      [[ -f "$workspace_json" ]] || continue

      if node - "$workspace_json" "$REPO_ROOT" <<'NODE'
const fs = require("fs");

const [workspaceJsonPath, repoRoot] = process.argv.slice(2);
const raw = fs.readFileSync(workspaceJsonPath, "utf8");
const data = JSON.parse(raw);
const folder = typeof data.folder === "string" ? data.folder : "";
const normalizedFolder = decodeURIComponent(folder.replace(/^file:\/\//, ""));

if (normalizedFolder === repoRoot) {
  process.exit(0);
}

process.exit(1);
NODE
      then
        printf "%s\n" "${workspace_json%/workspace.json}"
      fi
    done
  done
}

TARGET_PYTHON="$(resolve_target_python)"
CONDA_PATH=""

if have_cmd conda; then
  CONDA_PATH="$(command -v conda)"
fi

echo "repo_root: ${REPO_ROOT}"
echo "target_python: ${TARGET_PYTHON}"
if [[ -n "$CONDA_PATH" ]]; then
  echo "conda_path: ${CONDA_PATH}"
fi
echo "settings_file: ${SETTINGS_FILE}"

if [[ "$DRY_RUN" == "1" ]]; then
  echo "dry_run: true"
else
  mkdir -p "$SETTINGS_DIR"

  node - "$SETTINGS_FILE" "$TARGET_PYTHON" "$CONDA_PATH" <<'NODE'
const fs = require("fs");

const [settingsFile, targetPython, condaPath] = process.argv.slice(2);
const existing = fs.existsSync(settingsFile)
  ? JSON.parse(fs.readFileSync(settingsFile, "utf8").trim() || "{}")
  : {};

existing["python.defaultInterpreterPath"] = targetPython;
existing["python.terminal.activateEnvironment"] = true;

if (condaPath) {
  existing["python.condaPath"] = condaPath;
}

if (!Object.prototype.hasOwnProperty.call(existing, "python-envs.terminal.autoActivationType")) {
  existing["python-envs.terminal.autoActivationType"] = "command";
}

fs.writeFileSync(settingsFile, `${JSON.stringify(existing, null, 2)}\n`);
NODE

  echo "workspace settings updated"
fi

if [[ "$SKIP_CACHE_CLEAR" == "1" ]]; then
  echo "cache_clear: skipped"
  exit 0
fi

if ! have_cmd sqlite3; then
  echo "cache_clear: skipped because sqlite3 is not installed"
  exit 0
fi

STORAGE_DIRS=()
while IFS= read -r storage_dir; do
  STORAGE_DIRS+=("$storage_dir")
done < <(find_workspace_storage_dirs)

if [[ "${#STORAGE_DIRS[@]}" -eq 0 ]]; then
  echo "cache_clear: no matching workspace storage directories found"
  exit 0
fi

timestamp="$(date +%Y%m%d%H%M%S)"

for storage_dir in "${STORAGE_DIRS[@]}"; do
  state_db="${storage_dir}/state.vscdb"
  [[ -f "$state_db" ]] || continue

  echo "workspace_storage: ${storage_dir}"

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "would_backup: ${state_db}.bak.${timestamp}"
    echo "would_delete_keys: ms-python.python, ms-python.debugpy"
    continue
  fi

  cp "$state_db" "${state_db}.bak.${timestamp}"
  sqlite3 "$state_db" "DELETE FROM ItemTable WHERE key IN ('ms-python.python', 'ms-python.debugpy');"
  echo "cache cleared"
done

echo "next_step: reload the VS Code window and use Python: Select Interpreter if you want to switch again later"
