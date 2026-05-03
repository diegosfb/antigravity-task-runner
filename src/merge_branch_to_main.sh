#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./git_remote_fallback.sh
source "${SCRIPT_DIR}/git_remote_fallback.sh"

prompt() {
  local message="$1"
  local response
  read -r -p "$message " response
  printf '%s' "$response"
}

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

confirm_yes_no() {
  local message="$1"
  local answer
  while true; do
    answer="$(printf '%s' "$(prompt "$message")" | tr '[:upper:]' '[:lower:]')"
    case "$(trim "$answer")" in
      yes|y) return 0 ;;
      no|n) return 1 ;;
      *) echo "Please answer yes or no." ;;
    esac
  done
}

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
    echo "Git remote 'origin' was not found. Add it before merging to main." >&2
    exit 1
  fi
}

main() {
  local feature_branch="${1:-}"

  if [[ -z "$feature_branch" ]]; then
    echo "A source branch name is required." >&2
    exit 1
  fi

  ensure_git_repo
  ensure_remote_origin

  if [[ "$feature_branch" == "main" ]]; then
    echo "Merge branch to main can only run from a branch other than main." >&2
    exit 1
  fi

  if ! confirm_yes_no "Merge '$feature_branch' into main and push origin/main? (yes/no)"; then
    echo "Merge cancelled."
    exit 0
  fi

  echo "Merging '$feature_branch' into main."
  run_and_echo git checkout main
  run_remote_git_and_echo pull origin main
  run_and_echo git merge "$feature_branch"
  run_remote_git_and_echo push origin main

  echo
  echo "Merged '$feature_branch' into main and pushed origin/main."
}

main "$@"
