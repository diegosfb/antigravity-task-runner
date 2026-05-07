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

to_kebab_case() {
  local value
  value="$(trim "$1")"
  value="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"
  value="$(printf '%s' "$value" | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-{2,}/-/g')"
  printf '%s' "$value"
}

extract_jira_key() {
  local input="$1"
  local upper
  upper="$(printf '%s' "$input" | tr '[:lower:]' '[:upper:]')"
  if [[ "$upper" =~ ([A-Z][A-Z0-9]+-[0-9]+) ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
    return 0
  fi
  return 1
}

ensure_git_repo() {
  if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
    echo "This script must be run inside a Git repository." >&2
    exit 1
  fi
}

ensure_remote_origin() {
  if ! git remote get-url origin >/dev/null 2>&1; then
    echo "Git remote 'origin' was not found. Add it before creating a branch." >&2
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

confirm_yes_no() {
  local message="$1"
  local answer
  while true; do
    answer="$(to_kebab_case "$(prompt "$message")")"
    case "$answer" in
      yes|y) return 0 ;;
      no|n) return 1 ;;
      *) echo "Please answer yes or no." ;;
    esac
  done
}

get_non_empty_kebab() {
  local message="$1"
  local value
  while true; do
    value="$(to_kebab_case "$(prompt "$message")")"
    if [[ -n "$value" ]]; then
      printf '%s' "$value"
      return 0
    fi
    echo "Please enter a short kebab-case value."
  done
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

choose_branch_type() {
  local selection
  while true; do
    echo "What type of work is this?"
    echo "1. Feature"
    echo "2. Bug Fix"
    echo "3. Hotfix"
    selection="$(trim "$(prompt "Choose one (1/2/3):")")"
    case "$selection" in
      1) printf '%s' "feature"; return 0 ;;
      2) printf '%s' "fix"; return 0 ;;
      3) printf '%s' "hotfix"; return 0 ;;
      *) echo "Please choose 1, 2, or 3." ;;
    esac
  done
}

build_branch_name() {
  local has_jira jira_input jira_key short_description branch_type

  if confirm_yes_no "Is there a linked Jira issue for this work? (yes / no)"; then
    while true; do
      jira_input="$(prompt "Please paste the Jira issue link or issue key (e.g. PROJ-123):")"
      if jira_key="$(extract_jira_key "$jira_input")"; then
        break
      fi
      echo "Couldn't find a Jira issue key. Please try again."
    done

    short_description="$(get_non_empty_kebab "What is a short description for the branch name? (e.g. add-login-button)")"
    printf '%s' "feature/${jira_key}-${short_description}"
    return 0
  fi

  branch_type="$(choose_branch_type)"
  short_description="$(get_non_empty_kebab "Provide a short, descriptive kebab-case name for the branch:")"
  printf '%s' "${branch_type}/${short_description}"
}

run_and_echo() {
  echo "+ $*"
  "$@"
}

has_uncommitted_changes() {
  if ! git diff --quiet || ! git diff --cached --quiet; then
    return 0
  fi

  [[ -n "$(git ls-files --others --exclude-standard)" ]]
}

stage_branch_changes() {
  run_and_echo git add -A -- .
  run_and_echo git rm -q --cached --ignore-unmatch .env config/.env
}

commit_pending_changes_if_needed() {
  local current_branch="$1"
  local commit_message secret_candidate_output

  if ! has_uncommitted_changes; then
    return 0
  fi

  echo
  echo "Detected uncommitted changes on ${current_branch}. They must be committed before creating a new branch."

  secret_candidate_output="$(git status --porcelain -- .env config/.env || true)"
  if [[ -n "$secret_candidate_output" ]]; then
    echo "Warning: .env and config/.env are excluded from the automated pre-branch commit for safety."
  fi

  commit_message="$(require_non_empty "Enter a commit message for the changes that should be included before creating the new branch.")"
  stage_branch_changes

  if git diff --cached --quiet; then
    echo "No committable changes were staged after excluding protected env files. Continuing with the existing branch history."
    return 0
  fi

  run_and_echo git commit --no-gpg-sign -m "$commit_message"
}

verify_remote_branch_exists() {
  local branch_name="$1"
  run_remote_git ls-remote --exit-code --heads origin "$branch_name" >/dev/null 2>&1
}

main() {
  local branch_name="${1:-}" current_branch

  ensure_git_repo
  ensure_remote_origin
  current_branch="$(get_current_branch)"
  commit_pending_changes_if_needed "$current_branch"

  if [[ -z "$branch_name" ]]; then
    branch_name="$(build_branch_name)"

    if ! confirm_yes_no "I'll create the branch: ${branch_name}. Sound good? (yes / no)"; then
      echo "Branch creation cancelled."
      exit 0
    fi
  fi

  echo "This ensures your new branch starts from the latest version of the codebase."
  run_and_echo git checkout main
  run_remote_git_and_echo pull origin main

  run_and_echo git checkout -b "$branch_name"

  echo "The -u flag links your local branch to the remote. After this, you can just type git push."
  run_remote_git_and_echo push -u origin "$branch_name"

  if ! verify_remote_branch_exists "$branch_name"; then
    echo "The branch was pushed locally, but the remote branch could not be verified on origin." >&2
    exit 1
  fi

  cat <<EOF

✅ Branch created successfully!

| Field           | Value         |
|-----------------|---------------|
| Branch name     | ${branch_name} |
| Based on        | main          |
| Remote          | origin        |
| Upstream set    | Yes           |
| Remote verified | Yes           |

You're ready to start coding. When you're done, use the create_pull_request workflow to open a PR.

If GitHub shows a green "Compare & pull request" button after this, the branch is already fully created. That button is only GitHub's shortcut for opening a pull request.
EOF
}

main "$@"
