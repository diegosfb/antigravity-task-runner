#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_FILTER="DSFB TechnicalAdvisorLib"
SOURCE_REPOSITORY="${DSFB_DEPLOY_REPOSITORY:-https://github.com/diegosfb/dsfb-sdlc-v2.git}"
SOURCE_REF="${DSFB_DEPLOY_REF:-main}"
SOURCE_DIR="${DSFB_DEPLOY_SOURCE_DIR:-}"
WORK_DIR=""

cleanup() {
  if [[ -n "$WORK_DIR" && -d "$WORK_DIR" ]]; then
    rm -rf -- "$WORK_DIR"
  fi
}
trap cleanup EXIT

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/dsfb-ta-deploy.XXXXXX")"

if [[ -z "$SOURCE_DIR" ]]; then
  command -v git >/dev/null 2>&1 || fail "git is required to download missing dependencies"
  printf 'Loading dependency source from %s (%s)...\n' "$SOURCE_REPOSITORY" "$SOURCE_REF"
  git clone --quiet --depth 1 --branch "$SOURCE_REF" "$SOURCE_REPOSITORY" "$WORK_DIR/source" \
    || fail "Could not download $SOURCE_REPOSITORY at ref $SOURCE_REF"
  SOURCE_DIR="$WORK_DIR/source"
else
  SOURCE_DIR="$(cd "$SOURCE_DIR" && pwd)"
fi

# Scan metadata files and collect paths whose package matches PACKAGE_FILTER
CONFIG_FILE="$WORK_DIR/config.txt"
touch "$CONFIG_FILE"

package_matches() {
  grep -q '"package"[[:space:]]*:.*'"\"$PACKAGE_FILTER\"" "$1" 2>/dev/null
}

while IFS= read -r -d '' f; do
  if package_matches "$f"; then
    printf '.agents/agents/%s\n' "$(basename "$(dirname "$f")")"
  fi
done < <(find "$SOURCE_DIR/.agents/agents" -name "agent.metadata.json" -print0 2>/dev/null) >> "$CONFIG_FILE"

while IFS= read -r -d '' f; do
  if package_matches "$f"; then
    printf '.agents/skills/%s\n' "$(basename "$(dirname "$f")")"
  fi
done < <(find "$SOURCE_DIR/.agents/skills" -name "skill.metadata.json" -print0 2>/dev/null) >> "$CONFIG_FILE"

component_count="$(wc -l < "$CONFIG_FILE" | tr -d ' ')"
printf 'Found %s component(s) with package "%s"\n' "$component_count" "$PACKAGE_FILTER"

export DSFB_DEPLOY_SOURCE_DIR="$SOURCE_DIR"
export DSFB_DEPLOY_CONFIG="$CONFIG_FILE"
unset DSFB_DEPLOY_MATRIX
unset DSFB_DEPLOY_MATRIX_COLUMN

"$SCRIPT_DIR/helper-scripts/deploy-agents.sh" "$@"
