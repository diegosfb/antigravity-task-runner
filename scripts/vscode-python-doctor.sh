#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(pwd -P)"
SETTINGS_FILE="${REPO_ROOT}/.vscode/settings.json"

print_heading() {
  printf "\n== %s ==\n" "$1"
}

print_kv() {
  printf "%-30s %s\n" "$1" "$2"
}

have_cmd() {
  command -v "$1" >/dev/null 2>&1
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

print_heading "Repository"
print_kv "repo_root" "$REPO_ROOT"
print_kv "settings_file" "$SETTINGS_FILE"

print_heading "Shell Python"
if have_cmd python; then
  print_kv "python" "$(command -v python)"
  print_kv "python_version" "$(python --version 2>&1)"
else
  print_kv "python" "not found"
fi

if have_cmd python3; then
  print_kv "python3" "$(command -v python3)"
  print_kv "python3_version" "$(python3 --version 2>&1)"
fi

print_heading "Environment Managers"
if have_cmd conda; then
  print_kv "conda" "$(command -v conda)"
  conda info --json 2>/dev/null | node -e '
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  const data = JSON.parse(raw);
  const envs = Array.isArray(data.envs) ? data.envs : [];

  const print = (key, value) => {
    process.stdout.write(`${key.padEnd(30)} ${value}\n`);
  };

  print("conda_active_prefix", data.active_prefix || "<none>");
  print("conda_active_name", data.active_prefix_name || "<none>");
  print("conda_default_prefix", data.default_prefix || "<none>");
  print("conda_env_count", String(envs.length));

  for (const envPath of envs) {
    const name = envPath === data.root_prefix ? "base" : envPath.split("/").pop();
    print(`conda_env:${name}`, envPath);
  }
});
'
else
  print_kv "conda" "not found"
fi

if have_cmd pyenv; then
  print_kv "pyenv" "$(command -v pyenv)"
  print_kv "pyenv_python" "$(pyenv which python 2>/dev/null || printf '%s' 'not resolved')"
else
  print_kv "pyenv" "not installed"
fi

print_heading "Workspace Settings"
if [[ -f "$SETTINGS_FILE" ]]; then
  node - "$SETTINGS_FILE" <<'NODE'
const fs = require("fs");

const [settingsFile] = process.argv.slice(2);
const raw = fs.readFileSync(settingsFile, "utf8").trim() || "{}";
const settings = JSON.parse(raw);
const keys = [
  "python.defaultInterpreterPath",
  "python.condaPath",
  "python.terminal.activateEnvironment",
  "python.terminal.activateEnvInCurrentTerminal",
  "python-envs.terminal.autoActivationType",
];

for (const key of keys) {
  const value = Object.prototype.hasOwnProperty.call(settings, key) ? settings[key] : "<unset>";
  process.stdout.write(`${key.padEnd(30)} ${JSON.stringify(value)}\n`);
}
NODE
else
  print_kv "workspace_settings" "missing"
fi

print_heading "Cached Workspace Interpreter State"
if ! have_cmd sqlite3; then
  print_kv "sqlite3" "not found; cannot inspect VS Code cache"
  exit 0
fi

STORAGE_DIRS=()
while IFS= read -r storage_dir; do
  STORAGE_DIRS+=("$storage_dir")
done < <(find_workspace_storage_dirs)

if [[ "${#STORAGE_DIRS[@]}" -eq 0 ]]; then
  print_kv "workspace_cache" "no matching workspace storage found"
  exit 0
fi

for storage_dir in "${STORAGE_DIRS[@]}"; do
  print_kv "storage_dir" "$storage_dir"

  state_db="${storage_dir}/state.vscdb"
  if [[ ! -f "$state_db" ]]; then
    print_kv "state_db" "missing"
    continue
  fi

  value="$(sqlite3 "$state_db" "select value from ItemTable where key='ms-python.python';")"
  if [[ -z "$value" ]]; then
    print_kv "ms-python.python" "missing"
    continue
  fi

  node - "$REPO_ROOT" "$value" <<'NODE'
const [repoRoot, rawValue] = process.argv.slice(2);
const state = JSON.parse(rawValue);
const cacheKey = `autoSelectedWorkspacePythonInterpreter-${repoRoot}`;
const queriedKey = `autoSelectionInterpretersQueried-${repoRoot}`;
const cached = state[cacheKey];

const print = (key, value) => {
  process.stdout.write(`${key.padEnd(30)} ${value}\n`);
};

if (cached) {
  print("cached_interpreter_path", cached.path || "<unknown>");
  print("cached_display_name", cached.detailedDisplayName || cached.displayName || "<unknown>");
  print("cached_env_type", cached.envType || "<unknown>");
  print("cached_env_name", cached.envName || "<unknown>");
} else {
  print("cached_interpreter_path", "<unset>");
}

print("cached_query_complete", String(Boolean(state[queriedKey])));
NODE
done
