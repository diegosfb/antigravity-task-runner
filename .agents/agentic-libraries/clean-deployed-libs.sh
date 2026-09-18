#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
AGENTS_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
PROJECT_ROOT="$(cd "$AGENTS_ROOT/.." && pwd -P)"
MATRIX_FILE="$SCRIPT_DIR/library-deployment-matrix.md"
BACKUP_PARENT="$PROJECT_ROOT/tmp"

if [[ "$(basename "$AGENTS_ROOT")" != ".agents" ]]; then
  echo "ERROR: Refusing to continue because the resolved target is not a .agents directory." >&2
  exit 1
fi

if [[ ! -f "$MATRIX_FILE" ]]; then
  echo "ERROR: Deployment matrix not found: $MATRIX_FILE" >&2
  exit 1
fi

if [[ ! -t 0 ]]; then
  echo "ERROR: Interactive confirmation is required; stdin is not a terminal." >&2
  exit 1
fi

echo "This will permanently delete only agents, skills, and workflows listed in:"
echo "  $MATRIX_FILE"
echo "Generated agent references with matching names will also be removed from:"
printf '  %s\n' \
  "$PROJECT_ROOT/.claude/agents" \
  "$PROJECT_ROOT/.codex/agents" \
  "$PROJECT_ROOT/.gemini/agents" \
  "$PROJECT_ROOT/.opencode/agents"
echo "Unlisted components will be preserved."
echo "A timestamped backup of $AGENTS_ROOT will first be created under $BACKUP_PARENT."
echo
read -r -p "First confirmation — continue? Type YES: " FIRST_CONFIRMATION

if [[ "$FIRST_CONFIRMATION" != "YES" ]]; then
  echo "Cancelled. Nothing was deleted."
  exit 0
fi

echo
echo "This operation cannot be undone by this script."
read -r -p "Second confirmation — type DELETE DEPLOYED LIBS: " SECOND_CONFIRMATION

if [[ "$SECOND_CONFIRMATION" != "DELETE DEPLOYED LIBS" ]]; then
  echo "Cancelled. Nothing was deleted."
  exit 0
fi

BACKUP_ROOT="$BACKUP_PARENT/agents-backup-$(date '+%Y%m%d-%H%M%S')"
mkdir -p -- "$BACKUP_PARENT"

if [[ -e "$BACKUP_ROOT" || -L "$BACKUP_ROOT" ]]; then
  echo "ERROR: Refusing to overwrite existing backup: $BACKUP_ROOT" >&2
  exit 1
fi

echo "Creating backup: $BACKUP_ROOT"
cp -Rp -- "$AGENTS_ROOT" "$BACKUP_ROOT"
echo "Backup complete: $BACKUP_ROOT"

matrix_components() {
  awk -F '|' '
    function clean(value) {
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      gsub(/^`|`$/, "", value)
      return value
    }
    /^\|[[:space:]]*Type[[:space:]]*\|/ {
      for (i = 1; i <= NF; i++) {
        heading = clean($i)
        if (heading == "Type") type_column = i
        if (heading == "Path") path_column = i
      }
      next
    }
    /^\|[[:space:]]*(Agent|Skill|Workflow)[[:space:]]*\|/ {
      if (type_column && path_column) {
        print clean($type_column) "\t" clean($path_column)
      }
    }
    END {
      if (!type_column || !path_column) exit 2
    }
  ' "$MATRIX_FILE"
}

validate_component() {
  local type="$1"
  local path="$2"

  [[ -n "$path" && "$path" != /* && "/$path/" != *"/../"* ]] || return 1
  [[ "$path" != *'<'* && "$path" != *'>'* && "$path" != *'*'* ]] || return 1

  case "$type:$path" in
    Agent:.agents/agents/*.md) return 0 ;;
    Skill:.agents/skills/*/SKILL.md) return 0 ;;
    Workflow:.agents/workflows/*.md) return 0 ;;
    *) return 1 ;;
  esac
}

remove_if_present() {
  local target="$1"

  if [[ -e "$target" || -L "$target" ]]; then
    rm -rf -- "$target"
    echo "Deleted: $target"
    DELETED_COUNT=$((DELETED_COUNT + 1))
  else
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
  fi
}

remove_agent_component() {
  local relative_path="$1"
  local agent_file="$PROJECT_ROOT/$relative_path"
  local component_dir
  local parent_name
  local agent_name

  component_dir="$(dirname "$agent_file")"
  parent_name="$(basename "$component_dir")"
  agent_name="$(basename "$agent_file" .md)"

  if [[ "$parent_name" == "$agent_name" ]]; then
    if [[ -d "$component_dir" && ! -L "$component_dir" ]]; then
      while IFS= read -r -d '' child; do
        [[ "$(basename "$child")" == "subagents" ]] || remove_if_present "$child"
      done < <(find "$component_dir" -mindepth 1 -maxdepth 1 -print0)
    else
      remove_if_present "$agent_file"
    fi
    AGENT_DIRS+=("$component_dir")
  else
    remove_if_present "$agent_file"
  fi

  remove_if_present "$PROJECT_ROOT/.claude/agents/$agent_name.md"
  remove_if_present "$PROJECT_ROOT/.codex/agents/$agent_name.toml"
  remove_if_present "$PROJECT_ROOT/.gemini/agents/$agent_name.md"
  remove_if_present "$PROJECT_ROOT/.opencode/agents/$agent_name.md"
}

DELETED_COUNT=0
SKIPPED_COUNT=0
AGENT_DIRS=()
COMPONENT_TYPES=()
COMPONENT_PATHS=()
MATRIX_COMPONENTS="$(matrix_components)"

while IFS=$'\t' read -r component_type component_path; do
  if ! validate_component "$component_type" "$component_path"; then
    echo "ERROR: Refusing invalid matrix component: $component_type $component_path" >&2
    exit 1
  fi

  COMPONENT_TYPES+=("$component_type")
  COMPONENT_PATHS+=("$component_path")
done <<< "$MATRIX_COMPONENTS"

if (( ${#COMPONENT_PATHS[@]} == 0 )); then
  echo "ERROR: No agents, skills, or workflows were found in the deployment matrix." >&2
  exit 1
fi

for (( component_index=0; component_index<${#COMPONENT_PATHS[@]}; component_index++ )); do
  component_type="${COMPONENT_TYPES[$component_index]}"
  component_path="${COMPONENT_PATHS[$component_index]}"
  case "$component_type" in
    Agent)
      remove_agent_component "$component_path"
      ;;
    Skill)
      remove_if_present "$PROJECT_ROOT/${component_path%/SKILL.md}"
      ;;
    Workflow)
      remove_if_present "$PROJECT_ROOT/$component_path"
      ;;
  esac
done

# Remove listed agent directories only when no unlisted subagents or other files remain.
for (( agent_dir_index=${#AGENT_DIRS[@]}-1; agent_dir_index>=0; agent_dir_index-- )); do
  component_dir="${AGENT_DIRS[$agent_dir_index]}"
  if [[ -d "$component_dir/subagents" ]]; then
    rmdir "$component_dir/subagents" 2>/dev/null || true
  fi
  rmdir "$component_dir" 2>/dev/null || true
done

echo "Cleanup complete: deleted=$DELETED_COUNT skipped_missing=$SKIPPED_COUNT"
echo "Backup: $BACKUP_ROOT"
