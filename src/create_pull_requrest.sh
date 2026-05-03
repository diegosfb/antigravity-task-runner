#!/usr/bin/env bash

set -euo pipefail

PR_BODY_FILE=""

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

confirm_yes_no() {
  local message="$1"
  local answer
  while true; do
    answer="$(to_lower "$(prompt "$message")")"
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

ensure_github_cli_ready() {
  if ! command -v gh >/dev/null 2>&1; then
    echo "GitHub CLI (gh) is required. Install it and run: gh auth login" >&2
    exit 1
  fi

  if ! gh auth status >/dev/null 2>&1; then
    echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
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
    echo "This field is required." >&2
  done
}

optional_value() {
  trim "$(prompt "$1")"
}

normalize_reviewers_for_github() {
  local value="$1"
  value="$(printf '%s' "$value" | tr -d '[:space:]')"
  value="$(printf '%s' "$value" | sed 's/@//g')"
  printf '%s' "$value"
}

format_reviewers_for_body() {
  local raw_reviewers="$1"
  local formatted_reviewers=""
  local reviewer
  local reviewers=()

  IFS=',' read -r -a reviewers <<< "$raw_reviewers"
  for reviewer in "${reviewers[@]}"; do
    reviewer="$(trim "$reviewer")"
    if [[ -z "$reviewer" ]]; then
      continue
    fi

    if [[ -n "$formatted_reviewers" ]]; then
      formatted_reviewers="${formatted_reviewers}, "
    fi
    formatted_reviewers="${formatted_reviewers}@${reviewer}"
  done

  printf '%s' "$formatted_reviewers"
}

cleanup_temp_files() {
  if [[ -n "${PR_BODY_FILE:-}" ]]; then
    rm -f "$PR_BODY_FILE"
  fi
}

main() {
  local feature_branch test_command why_answer how_answer issue_link docs_and_screenshots reviewer reviewer_logins reviewer_display pr_title pr_url existing_pr_url
  local test_warning=""

  ensure_git_repo
  ensure_remote_origin
  ensure_github_cli_ready

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

  test_command="$(optional_value "What command runs your project's test suite? (type 'skip' to skip)")"
  if [[ -n "$test_command" && "$(to_lower "$test_command")" != "skip" ]]; then
    run_shell_command "$test_command"
  else
    test_warning="WARNING: Tests were skipped."
  fi

  why_answer="$(require_non_empty "What problem does this PR solve, or what feature/functionality does it provide?")"
  how_answer="$(require_non_empty "Briefly describe your technical approach. What changed and how does it work at a high level?")"
  issue_link="$(optional_value "Is there a linked Jira, Trello, or GitHub Issue? Press Enter to skip.")"
  docs_and_screenshots="$(optional_value "Any documentation updates, screenshots, or recordings to include? Press Enter to skip.")"
  reviewer="$(require_non_empty "Who should be tagged as the responsible code reviewer? (e.g. @john-doe)")"
  reviewer_logins="$(normalize_reviewers_for_github "$reviewer")"
  reviewer_display="$(format_reviewers_for_body "$reviewer_logins")"

  if [[ -z "$reviewer_logins" ]]; then
    echo "Reviewer value is invalid. Provide a GitHub username such as @john-doe." >&2
    exit 1
  fi

  pr_title="${feature_branch}: ${why_answer}"
  PR_BODY_FILE="$(mktemp)"

  cat >"$PR_BODY_FILE" <<EOF
**Why:**
$why_answer

**How:**
$how_answer

**Linked Issue:** ${issue_link:-N/A}

**Docs / Screenshots:** ${docs_and_screenshots:-N/A}

---

**Reviewer:** \`$reviewer_display\`
EOF

  existing_pr_url="$(gh pr list --head "$feature_branch" --base main --state open --json url --jq '.[0].url' 2>/dev/null || true)"
  if [[ -n "$existing_pr_url" ]]; then
    echo
    echo "An open pull request already exists for ${feature_branch}:"
    echo "$existing_pr_url"
    exit 0
  fi

  echo "Creating the pull request on GitHub."
  echo "+ gh pr create --base main --head $feature_branch --title $pr_title --body-file $PR_BODY_FILE --reviewer $reviewer_logins"
  pr_url="$(gh pr create --base main --head "$feature_branch" --title "$pr_title" --body-file "$PR_BODY_FILE" --reviewer "$reviewer_logins")"

  cat <<EOF

✅ Pull request created successfully!

---

### PR URL
$pr_url

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

**Reviewer:** \`$reviewer_display\`
EOF

  if [[ -n "$test_warning" ]]; then
    echo
    [[ -n "$test_warning" ]] && echo "$test_warning"
  fi

  cat <<'EOF'

💡 Important: Any changes requested by the reviewer should be committed and pushed to this same feature branch. GitHub will automatically update the open PR with your new commits. Never close this PR and open a new one.
EOF
}

trap cleanup_temp_files EXIT

main "$@"
