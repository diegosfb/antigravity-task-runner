#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./git_remote_fallback.sh
source "${SCRIPT_DIR}/git_remote_fallback.sh"

run_and_echo() {
  echo "+ $*"
  "$@"
}

ensure_git_repo() {
  if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
    echo "This script must be run inside a Git repository." >&2
    exit 1
  fi
}

ensure_remote_origin() {
  if ! git remote get-url origin >/dev/null 2>&1; then
    echo "Git remote 'origin' was not found. Add it before checking out a branch." >&2
    exit 1
  fi
}

main() {
  local target_branch="${1:-}"

  if [[ -z "$target_branch" ]]; then
    echo "A target branch name is required." >&2
    exit 1
  fi

  ensure_git_repo
  ensure_remote_origin

  if git rev-parse --verify "refs/heads/${target_branch}" >/dev/null 2>&1; then
    run_and_echo git checkout "$target_branch"
  else
    run_and_echo git checkout --track "origin/${target_branch}"
  fi

  if [[ "$target_branch" == "main" ]]; then
    run_remote_git_and_echo pull origin main
  fi
}

main "$@"
