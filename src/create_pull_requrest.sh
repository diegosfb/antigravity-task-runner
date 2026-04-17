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

ensure_git_repo() {
  if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
    echo "This script must be run inside a Git repository." >&2
    exit 1
  fi
}

ensure_remote_origin() {
  if ! git remote get-url origin >/dev/null 2>&1; then
    echo "Git remote 'origin' was not found. Add it before creating a pull request." >&2
    exit 1
  fi
}

run_and_echo() {
  echo "+ $*"
  "$@"
}

run_shell_command() {
  local command="$1"
  echo "+ $command"
  bash -lc "$command"
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

require_non_empty() {
  local message="$1"
  local value
  while true; do
    value="$(trim "$(prompt "$message")")"
    if [[ -n "$value" ]]; then
      printf '%s' "$value"
      return 0
    fi
    echo "This field is required."
  done
}

optional_value() {
  trim "$(prompt "$1")"
}

main() {
  local feature_branch linter_command test_command why_answer how_answer issue_link docs_and_screenshots reviewer pr_title
  local lint_warning="" test_warning=""

  ensure_git_repo
  ensure_remote_origin

  feature_branch="$(get_current_branch)"
  if [[ "$feature_branch" == "main" ]]; then
    echo "You are currently on main. Switch to your feature branch before creating a pull request." >&2
    exit 1
  fi

  echo "Syncing your feature branch with the latest main so reviewers see a clean PR."
  run_and_echo git checkout main
  run_and_echo git pull origin main
  run_and_echo git checkout "$feature_branch"
  run_and_echo git merge main
  run_and_echo git push origin "$feature_branch"

  linter_command="$(optional_value "What linter or code style check does your project use? (type 'skip' to skip)")"
  if [[ -n "$linter_command" && "${linter_command,,}" != "skip" ]]; then
    run_shell_command "$linter_command"
  else
    lint_warning="WARNING: Linter was skipped."
  fi

  test_command="$(optional_value "What command runs your project's test suite? (type 'skip' to skip)")"
  if [[ -n "$test_command" && "${test_command,,}" != "skip" ]]; then
    run_shell_command "$test_command"
  else
    test_warning="WARNING: Tests were skipped."
  fi

  why_answer="$(require_non_empty "What problem does this PR solve, or what feature/functionality does it provide?")"
  how_answer="$(require_non_empty "Briefly describe your technical approach. What changed and how does it work at a high level?")"
  issue_link="$(optional_value "Is there a linked Jira, Trello, or GitHub Issue? Press Enter to skip.")"
  docs_and_screenshots="$(optional_value "Any documentation updates, screenshots, or recordings to include? Press Enter to skip.")"
  reviewer="$(require_non_empty "Who should be tagged as the responsible code reviewer? (e.g. @john-doe)")"

  pr_title="${feature_branch}: ${why_answer}"

  cat <<EOF

✅ Your PR is ready to open!

---

### PR Title
$pr_title

### Description

**Why:**
$why_answer

**How:**
$how_answer

**Linked Issue:** ${issue_link:-N/A}

**Docs / Screenshots:** ${docs_and_screenshots:-N/A}

---

**Reviewer:** \`$reviewer\`
EOF

  if [[ -n "$lint_warning" || -n "$test_warning" ]]; then
    echo
    [[ -n "$lint_warning" ]] && echo "$lint_warning"
    [[ -n "$test_warning" ]] && echo "$test_warning"
  fi

  cat <<'EOF'

💡 Important: Any changes requested by the reviewer should be committed and pushed to this same feature branch. GitHub will automatically update the open PR with your new commits. Never close this PR and open a new one.
EOF
}

main "$@"
