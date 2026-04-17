#!/usr/bin/env bash

set -euo pipefail

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

main() {
  local branch_name

  ensure_git_repo
  ensure_remote_origin

  branch_name="$(build_branch_name)"

  if ! confirm_yes_no "I'll create the branch: ${branch_name}. Sound good? (yes / no)"; then
    echo "Branch creation cancelled."
    exit 0
  fi

  echo "This ensures your new branch starts from the latest version of the codebase."
  run_and_echo git checkout main
  run_and_echo git pull origin main

  run_and_echo git checkout -b "$branch_name"

  echo "The -u flag links your local branch to the remote. After this, you can just type git push."
  run_and_echo git push -u origin "$branch_name"

  cat <<EOF

✅ Branch created successfully!

| Field        | Value         |
|--------------|---------------|
| Branch name  | ${branch_name} |
| Based on     | main          |
| Remote       | origin        |
| Upstream set | Yes           |

You're ready to start coding. When you're done, use the create_pull_request workflow to open a PR.
EOF
}

main "$@"
