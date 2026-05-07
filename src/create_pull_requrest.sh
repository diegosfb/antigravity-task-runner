#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./git_remote_fallback.sh
source "${SCRIPT_DIR}/git_remote_fallback.sh"

PR_BODY_FILE=""
DEFAULT_GITHUB_REVIEWER="${ANTIGRAVITY_DEFAULT_GITHUB_REVIEWER:-@diegosfb}"

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

optional_value_with_default() {
  local value="$1"
  local default_value="$2"
  local response

  response="$(optional_value "${value} [${default_value}]")"
  if [[ -n "$response" ]]; then
    printf '%s' "$response"
    return 0
  fi

  printf '%s' "$default_value"
}

has_uncommitted_changes() {
  if ! git diff --quiet || ! git diff --cached --quiet; then
    return 0
  fi

  [[ -n "$(git ls-files --others --exclude-standard)" ]]
}

stage_pr_changes() {
  run_shell_command "git add -A -- . && git rm -q --cached --ignore-unmatch .env config/.env"
}

commit_pending_changes_if_needed() {
  local feature_branch="$1"
  local commit_message secret_candidate_output

  if ! has_uncommitted_changes; then
    return 0
  fi

  echo
  echo "Detected uncommitted changes on ${feature_branch}. They must be committed before creating a pull request."

  secret_candidate_output="$(git status --porcelain -- .env config/.env || true)"
  if [[ -n "$secret_candidate_output" ]]; then
    echo "Warning: .env and config/.env are excluded from the automated pre-PR commit for safety."
  fi

  commit_message="$(require_non_empty "Enter a commit message for the changes that should be included in this pull request.")"
  stage_pr_changes

  if git diff --cached --quiet; then
    echo "No committable changes were staged after excluding protected env files. Continuing with the existing branch history."
    return 0
  fi

  run_and_echo git commit --no-gpg-sign -m "$commit_message"
}

print_rebase_conflict_instructions() {
  local feature_branch="$1"

  cat >&2 <<EOF
Rebase stopped because of conflicts. No pull request was created yet.

To finish this PR flow:
1. Run 'git status' to see the conflicted files.
2. Open each conflicted file and resolve the conflict markers (<<<<<<<, =======, >>>>>>>).
3. Run 'git add/rm <conflicted_files>' to mark each conflict as resolved.
4. Run 'git rebase --continue'.
5. Repeat until the rebase completes.
6. Run your build/tests.
7. Run 'git push --force-with-lease origin ${feature_branch}'.
8. Re-run PR creation.

To back out instead, run 'git rebase --abort'.
EOF
}

has_commits_between_base_and_feature() {
  local base_branch="$1"
  local feature_branch="$2"
  [[ "$(git rev-list --count "${base_branch}..${feature_branch}")" -gt 0 ]]
}

print_no_commits_for_pr_instructions() {
  local base_branch="$1"
  local feature_branch="$2"

  cat >&2 <<EOF
There are no commits on ${feature_branch} that are not already on ${base_branch}.
GitHub cannot create a pull request when there are no commits between the base and head branches.

This usually means one of these happened:
- your feature branch was already merged or cherry-picked into ${base_branch}
- your feature branch was fast-forwarded to match ${base_branch}
- your branch does not have a unique commit yet

To verify:
1. Run 'git log --oneline ${base_branch}..${feature_branch}'.
2. If no commits are listed, there is nothing to open a PR for yet.
3. Add or recover the missing feature commit(s) on ${feature_branch}, then rerun PR creation.
EOF
}

infer_linked_issue_from_branch() {
  local feature_branch="$1"
  local helper_path="${SCRIPT_DIR}/infer_jira_issue_link.js"

  if [[ ! -f "$helper_path" ]] || ! command -v node >/dev/null 2>&1; then
    return 0
  fi

  node "$helper_path" "$feature_branch" 2>/dev/null || true
}

normalize_reviewers_for_github() {
  local value="$1"
  value="$(printf '%s' "$value" | tr -d '[:space:]')"
  value="$(printf '%s' "$value" | sed 's/@//g')"
  printf '%s' "$value"
}

to_single_line() {
  printf '%s' "$1" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g; s/^ //; s/ $//'
}

extract_marked_block() {
  local content="$1"
  local start_marker="$2"
  local end_marker="$3"

  awk -v start="$start_marker" -v end="$end_marker" '
    {
      line = $0
      sub(/^[[:space:]]+/, "", line)
      sub(/[[:space:]]+$/, "", line)
    }
    line == start { capture = 1; next }
    line == end { exit }
    capture { print }
  ' <<< "$content"
}

collect_pr_description_context() {
  local base_branch="$1"
  local feature_branch="$2"
  local commits files_changed diff_stat patch_excerpt

  commits="$(git log --reverse --max-count=20 --pretty=format:'- %s' "${base_branch}..${feature_branch}" 2>/dev/null || true)"
  files_changed="$(git diff --name-status "${base_branch}...${feature_branch}" 2>/dev/null | head -n 200 || true)"
  diff_stat="$(git diff --stat "${base_branch}...${feature_branch}" 2>/dev/null || true)"
  patch_excerpt="$(git diff --unified=0 --no-color "${base_branch}...${feature_branch}" 2>/dev/null | head -n 400 || true)"

  cat <<EOF
Base branch: ${base_branch}
Feature branch: ${feature_branch}

Recent commits:
${commits:-N/A}

Files changed:
${files_changed:-N/A}

Diff stat:
${diff_stat:-N/A}

Patch excerpt:
${patch_excerpt:-N/A}
EOF
}

generate_pr_descriptions_with_claude() {
  local base_branch="$1"
  local feature_branch="$2"
  local context prompt response why how

  if ! command -v claude >/dev/null 2>&1; then
    return 1
  fi

  context="$(collect_pr_description_context "$base_branch" "$feature_branch")"
  prompt="$(cat <<EOF
You are preparing text for a GitHub pull request.

Based on the repository context below, write concise PR copy for the diff between ${base_branch} and ${feature_branch}.

Return only the following exact marker blocks and nothing else:

WHY_START
<one sentence, plain English, suitable for the PR title suffix>
WHY_END
HOW_START
<two to four sentences, plain English, describing the technical approach at a high level>
HOW_END

Rules:
- Be specific to the actual changes.
- Do not mention that you are an AI or that this was generated.
- Do not invent issues, screenshots, recordings, or tests.
- Keep the WHY concise.
- Keep the HOW under 600 characters total.

Repository context:
${context}
EOF
)"

  if ! response="$(claude --dangerously-skip-permissions "$prompt" 2>/dev/null)"; then
    return 1
  fi

  why="$(trim "$(extract_marked_block "$response" "WHY_START" "WHY_END")")"
  how="$(trim "$(extract_marked_block "$response" "HOW_START" "HOW_END")")"

  if [[ -z "$why" || -z "$how" ]]; then
    return 1
  fi

  printf '%s\n' "$why"
  printf '%s' "$how"
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
  local feature_branch test_command why_answer how_answer issue_link docs_and_screenshots reviewer reviewer_logins reviewer_display pr_title pr_url existing_pr_url pr_description_draft
  local build_warning="WARNING: Build/validation was skipped." test_warning=""

  ensure_git_repo
  ensure_remote_origin
  ensure_github_cli_ready

  feature_branch="$(get_current_branch)"
  if [[ "$feature_branch" == "main" ]]; then
    echo "You are currently on main. Switch to your feature branch before creating a pull request." >&2
    exit 1
  fi

  commit_pending_changes_if_needed "$feature_branch"

  echo "Updating the local main branch to sync with the remote repository."
  run_and_echo git checkout main
  run_remote_git_and_echo -c pull.rebase=true pull origin main
  run_and_echo git checkout "$feature_branch"

  echo "Rebasing your feature branch onto the latest main so reviewers see a clean PR history."
  if ! run_and_echo git rebase main; then
    print_rebase_conflict_instructions "$feature_branch"
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

  echo "Pushing the rebased feature branch to origin."
  run_remote_git_and_echo push --force-with-lease origin "$feature_branch"

  if ! has_commits_between_base_and_feature "main" "$feature_branch"; then
    print_no_commits_for_pr_instructions "main" "$feature_branch"
    exit 1
  fi

  why_answer="$(require_non_empty "What problem does this PR solve, or what feature/functionality does it provide?")"
  how_answer="$(require_non_empty "Briefly describe your technical approach. What changed and how does it work at a high level?")"
  issue_link="$(infer_linked_issue_from_branch "$feature_branch")"
  docs_and_screenshots="$(optional_value "Any documentation updates, screenshots, or recordings to include? Press Enter to skip.")"
  reviewer="$(optional_value_with_default "Who should be tagged as the responsible code reviewer? Press Enter to accept the suggested reviewer." "$DEFAULT_GITHUB_REVIEWER")"
  reviewer_logins="$(normalize_reviewers_for_github "$reviewer")"
  reviewer_display="$(format_reviewers_for_body "$reviewer_logins")"

  if [[ -z "$reviewer_logins" ]]; then
    echo "Reviewer value is invalid. Provide a GitHub username such as @john-doe." >&2
    exit 1
  fi

  pr_title="${feature_branch}: $(to_single_line "$why_answer")"
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

  if [[ -n "$build_warning" || -n "$test_warning" ]]; then
    echo
    [[ -n "$build_warning" ]] && echo "$build_warning"
    [[ -n "$test_warning" ]] && echo "$test_warning"
  fi

  cat <<'EOF'

💡 Important: Any changes requested by the reviewer should be committed and pushed to this same feature branch. GitHub will automatically update the open PR with your new commits. Never close this PR and open a new one.
EOF

  echo
  echo "Switching your local checkout back to main."
  run_and_echo git checkout main
}

trap cleanup_temp_files EXIT

main "$@"
