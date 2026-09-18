#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${DSFB_DEPLOY_CONFIG:-}"
MATRIX_FILE="${DSFB_DEPLOY_MATRIX:-}"
MATRIX_COLUMN="${DSFB_DEPLOY_MATRIX_COLUMN:-}"
TARGET_ROOT="${1:-$PWD}"
SOURCE_REPOSITORY="${DSFB_DEPLOY_REPOSITORY:-https://github.com/diegosfb/dsfb-sdlc-v2.git}"
SOURCE_REF="${DSFB_DEPLOY_REF:-main}"
SOURCE_DIR="${DSFB_DEPLOY_SOURCE_DIR:-}"
TEMP_DIR=""
COMPONENT_COUNT=0
SKIPPED_COUNT=0

cleanup() {
  if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
    rm -rf -- "$TEMP_DIR"
  fi
}
trap cleanup EXIT

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

validate_repository_path() {
  local path="$1"
  [[ -n "$path" ]] || return 1
  [[ "$path" != /* ]] || fail "Absolute dependency path is not allowed: $path"
  [[ "/$path/" != *"/../"* ]] || fail "Parent traversal is not allowed: $path"
  [[ "$path" != *'<'* && "$path" != *'>'* && "$path" != *'*'* ]] || return 1

  case "$path" in
    .agents/*|scripts/*|ADLC_workflow_settings.json) return 0 ;;
    *) return 1 ;;
  esac
}

prepare_source() {
  if [[ -n "$SOURCE_DIR" ]]; then
    SOURCE_DIR="$(cd "$SOURCE_DIR" && pwd)"
    return
  fi

  command -v git >/dev/null 2>&1 || fail "git is required to download missing dependencies"
  TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/dsfb-agents.XXXXXX")"
  printf 'Loading dependency source from %s (%s)...\n' "$SOURCE_REPOSITORY" "$SOURCE_REF"
  git clone --quiet --depth 1 --branch "$SOURCE_REF" "$SOURCE_REPOSITORY" "$TEMP_DIR/source" \
    || fail "Could not download $SOURCE_REPOSITORY at ref $SOURCE_REF"
  SOURCE_DIR="$TEMP_DIR/source"
}

deploy_path() {
  local relative_path="${1%/}"
  local source_path="$SOURCE_DIR/$relative_path"
  local target_path="$TARGET_ROOT/$relative_path"
  local relative_file

  validate_repository_path "$relative_path" || return
  if [[ ! -e "$source_path" && ! -L "$source_path" ]]; then
    printf 'WARNING: Skipping component not found in the source repository: %s\n' "$relative_path" >&2
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    return
  fi

  if [[ -d "$source_path" ]]; then
    mkdir -p -- "$target_path"
    if ! cp -Rpn -- "$source_path/." "$target_path/"; then
      while IFS= read -r -d '' source_file; do
        relative_file="${source_file#"$source_path/"}"
        [[ -e "$target_path/$relative_file" || -L "$target_path/$relative_file" ]] \
          || fail "Could not deploy $relative_path/$relative_file"
      done < <(find "$source_path" -type f -print0)
    fi
  else
    if [[ ! -e "$target_path" && ! -L "$target_path" ]]; then
      mkdir -p -- "$(dirname "$target_path")"
      cp -p -- "$source_path" "$target_path"
    fi
  fi
  COMPONENT_COUNT=$((COMPONENT_COUNT + 1))
  printf 'Verified %s\n' "$relative_path"
}

expand_component_path() {
  local path="$1"
  local parent
  local stem

  if [[ "$path" == .agents/skills/*/SKILL.md ]]; then
    printf '%s' "${path%/SKILL.md}"
    return
  fi

  if [[ "$path" == .agents/agents/*.md ]]; then
    parent="$(basename "$(dirname "$path")")"
    stem="$(basename "$path" .md)"
    if [[ "$parent" == "$stem" ]]; then
      printf '%s' "${path%/*}"
      return
    fi
  fi

  printf '%s' "$path"
}

load_matrix_paths() {
  awk -F '|' -v requested_column="$MATRIX_COLUMN" '
    function clean(value) {
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      gsub(/^`|`$/, "", value)
      return value
    }
    /^\|[[:space:]]*Type[[:space:]]*\|/ {
      for (i = 1; i <= NF; i++) {
        heading = clean($i)
        if (heading == "Path") path_column = i
        if (heading == requested_column) package_column = i
      }
      next
    }
    /^\|[[:space:]]*(Agent|Skill|Workflow|Documentation|Guidelines)[[:space:]]*\|/ {
      if (!path_column) next
      if (requested_column == "ALL") {
        print clean($path_column)
        next
      }
      if (!package_column) next
      membership = toupper(clean($package_column))
      if (membership == "YES") print clean($path_column)
    }
    END {
      if (!path_column || (requested_column != "ALL" && !package_column)) exit 2
    }
  ' "$MATRIX_FILE" || fail "Could not find Path and $MATRIX_COLUMN columns in matrix: $MATRIX_FILE"
}

if [[ -n "$MATRIX_FILE" ]]; then
  [[ -n "$MATRIX_COLUMN" ]] || fail "DSFB_DEPLOY_MATRIX_COLUMN is required with DSFB_DEPLOY_MATRIX"
  [[ -f "$MATRIX_FILE" ]] || fail "Deployment matrix not found: $MATRIX_FILE"
elif [[ -n "$CONFIG_FILE" ]]; then
  [[ -f "$CONFIG_FILE" ]] || fail "Configuration file not found: $CONFIG_FILE"
else
  fail "Set DSFB_DEPLOY_MATRIX or DSFB_DEPLOY_CONFIG to identify deployment contents"
fi

mkdir -p -- "$TARGET_ROOT"
TARGET_ROOT="$(cd "$TARGET_ROOT" && pwd)"
prepare_source

QUEUE=()
if [[ -n "$MATRIX_FILE" ]]; then
  MATRIX_PATHS="$(load_matrix_paths)"
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="$(trim "$line")"
    [[ -n "$line" ]] && QUEUE+=("$line")
  done <<< "$MATRIX_PATHS"
else
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="$(trim "${line%%#*}")"
    [[ -n "$line" ]] && QUEUE+=("$line")
  done < "$CONFIG_FILE"
fi

SEEN_COMPONENTS=("")

index=0
while (( index < ${#QUEUE[@]} )); do
  dependency="${QUEUE[$index]}"
  index=$((index + 1))
  dependency="${dependency%/}"

  validate_repository_path "$dependency" || continue
  dependency="$(expand_component_path "$dependency")"

  covered=false
  for seen_component in "${SEEN_COMPONENTS[@]}"; do
    if [[ "$dependency" == "$seen_component" || "$dependency" == "$seen_component/"* ]]; then
      covered=true
      break
    fi
  done
  if [[ "$covered" == true ]]; then
    continue
  fi
  SEEN_COMPONENTS+=("$dependency")

  deploy_path "$dependency"
done

printf 'Deployment complete: %d component path(s) verified, %d missing component path(s) skipped; existing files were preserved.\n' \
  "$COMPONENT_COUNT" "$SKIPPED_COUNT"

HARNESS_SYNC="$TARGET_ROOT/.agents/skills/agents-harness-sync/scripts/sync-agents.sh"
[[ -f "$HARNESS_SYNC" ]] || fail "Required finalization script not found after deployment: $HARNESS_SYNC"
[[ -x "$HARNESS_SYNC" ]] || fail "Required finalization script is not executable: $HARNESS_SYNC"

printf 'Running agents-harness-sync in %s...\n' "$TARGET_ROOT"
(cd "$TARGET_ROOT" && "$HARNESS_SYNC")
