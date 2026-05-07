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

to_lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

require_non_empty() {
  local message="$1"
  local value
  while true; do
    value="$(trim "$(prompt "$message")")"
    if [[ -n "$value" ]]; then
      printf '%s' "$value"
      return 0
    fi
    echo "This field is required." >&2
  done
}

optional_value() {
  trim "$(prompt "$1")"
}

run_and_echo() {
  echo "+ $*"
  "$@"
}

resolve_command_shell() {
  local shell_path="${SHELL:-}"
  if [[ -n "$shell_path" && -x "$shell_path" ]]; then
    printf '%s' "$shell_path"
    return 0
  fi

  if command -v bash >/dev/null 2>&1; then
    command -v bash
    return 0
  fi

  printf '%s' "/bin/sh"
}

run_shell_command() {
  local command="$1"
  local shell_path
  shell_path="$(resolve_command_shell)"
  echo "+ $command"
  "$shell_path" -lc "$command"
}

ensure_git_repo() {
  if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
    echo "This script must be run inside a Git repository." >&2
    exit 1
  fi
}

ensure_remote_origin() {
  if ! git remote get-url origin >/dev/null 2>&1; then
    echo "Git remote 'origin' was not found. Add it before pulling and merging main." >&2
    exit 1
  fi
}

get_current_branch() {
  local branch
  branch="$(git branch --show-current)"
  if [[ -z "$branch" ]]; then
    echo "Couldn't determine the current branch." >&2
    exit 1
  fi
  printf '%s' "$branch"
}

has_uncommitted_changes() {
  if ! git diff --quiet || ! git diff --cached --quiet; then
    return 0
  fi

  [[ -n "$(git ls-files --others --exclude-standard)" ]]
}

stage_merge_changes() {
  run_shell_command "git add -A -- . && git rm -q --cached --ignore-unmatch .env config/.env"
}

commit_pending_changes_if_needed() {
  local feature_branch="$1"
  local commit_message secret_candidate_output

  if ! has_uncommitted_changes; then
    return 0
  fi

  echo
  echo "Detected uncommitted changes on ${feature_branch}. They must be committed before pulling remote main and merging it into this branch."

  secret_candidate_output="$(git status --porcelain -- .env config/.env || true)"
  if [[ -n "$secret_candidate_output" ]]; then
    echo "Warning: .env and config/.env are excluded from the automated pre-merge commit for safety."
  fi

  commit_message="$(require_non_empty "Enter a commit message for the changes that should be included before merging main into this branch.")"
  stage_merge_changes

  if git diff --cached --quiet; then
    echo "No committable changes were staged after excluding protected env files. Continuing with the existing branch history."
    return 0
  fi

  run_and_echo git commit --no-gpg-sign -m "$commit_message"
}

print_merge_conflict_instructions() {
  local feature_branch="$1"

  cat >&2 <<EOF
Merge stopped because of conflicts. The branch is still checked out on ${feature_branch}.

To finish this merge flow:
1. Run 'git status' to see the conflicted files.
2. Open each conflicted file and resolve the conflict markers (<<<<<<<, =======, >>>>>>>).
3. Run 'git add/rm <conflicted_files>' to mark each conflict as resolved.
4. Run 'git commit' to complete the merge.
5. Run your tests/builds if needed.
6. Run 'git push origin ${feature_branch}'.

To back out instead, run 'git merge --abort'.
EOF
}

main() {
  local feature_branch="${1:-}"
  local current_branch
  local test_command
  local test_warning=""

  ensure_git_repo
  ensure_remote_origin

  current_branch="$(get_current_branch)"
  if [[ -z "$feature_branch" ]]; then
    feature_branch="$current_branch"
  fi

  if [[ "$current_branch" != "$feature_branch" ]]; then
    echo "Switch to ${feature_branch} before running Pull Remote and merge." >&2
    exit 1
  fi

  if [[ "$feature_branch" == "main" ]]; then
    echo "Pull Remote and merge can only run from a branch other than main." >&2
    exit 1
  fi

  commit_pending_changes_if_needed "$feature_branch"

  echo "Updating the local main branch to sync with the remote repository."
  run_and_echo git checkout main
  run_remote_git_and_echo -c pull.rebase=true pull origin main

  echo "Returning to ${feature_branch}."
  run_and_echo git checkout "$feature_branch"

  echo "Merging the latest main branch into ${feature_branch}."
  if ! run_and_echo git merge main; then
    print_merge_conflict_instructions "$feature_branch"
    exit 1
  fi

  test_command="$(trim "${ANTIGRAVITY_PROJECT_TESTING_COMMAND:-}")"
  if [[ -n "$test_command" ]]; then
    echo "Using Project Testing Command from settings."
  else
    test_command="$(optional_value "What command runs your project's test suite? (type 'skip' to skip)")"
  fi

  if [[ -n "$test_command" && "$(to_lower "$test_command")" != "skip" ]]; then
    run_shell_command "$test_command"
  else
    test_warning="WARNING: Tests were skipped."
  fi

  echo "Pushing the updated feature branch to origin."
  run_remote_git_and_echo push origin "$feature_branch"

  echo
  echo "Pulled the latest remote main branch, merged it into ${feature_branch}, and pushed origin/${feature_branch}."
  if [[ -n "$test_warning" ]]; then
    echo "$test_warning"
  fi
}

main "$@"
