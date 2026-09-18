#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_REPOSITORY="${DSFB_DEPLOY_REPOSITORY:-https://github.com/diegosfb/dsfb-sdlc-v2.git}"
SOURCE_REF="${DSFB_DEPLOY_REF:-main}"
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

# Clone source once so all lib scripts share the same copy
if [[ -z "${DSFB_DEPLOY_SOURCE_DIR:-}" ]]; then
  command -v git >/dev/null 2>&1 || fail "git is required to download missing dependencies"
  WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/dsfb-all-deploy.XXXXXX")"
  printf 'Loading dependency source from %s (%s)...\n' "$SOURCE_REPOSITORY" "$SOURCE_REF"
  git clone --quiet --depth 1 --branch "$SOURCE_REF" "$SOURCE_REPOSITORY" "$WORK_DIR/source" \
    || fail "Could not download $SOURCE_REPOSITORY at ref $SOURCE_REF"
  export DSFB_DEPLOY_SOURCE_DIR="$WORK_DIR/source"
fi

# General-purpose first — it contains agents-harness-sync, required by all subsequent runs
"$SCRIPT_DIR/deploy-general-purpose-lib.sh" "$@"
"$SCRIPT_DIR/deploy-sdlc-lib.sh" "$@"
"$SCRIPT_DIR/deploy-extended-sdlc-lib.sh" "$@"
"$SCRIPT_DIR/deploy-professional-services-lib.sh" "$@"
"$SCRIPT_DIR/deploy-business-finance-lib.sh" "$@"
"$SCRIPT_DIR/deploy-technical-advisor-lib.sh" "$@"
