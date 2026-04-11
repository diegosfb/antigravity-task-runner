#!/usr/bin/env bash
set -euo pipefail

project_root="$(pwd)"
env_file="$project_root/.env"
autocommit_flag=""
if [[ -f "$env_file" ]]; then
  autocommit_flag="$(awk -F'=' '/^[[:space:]]*autocommiting[[:space:]]*=/{sub(/^[[:space:]]*autocommiting[[:space:]]*=/, ""); print; exit}' "$env_file" | tr -d '[:space:]' | tr '[:lower:]' '[:upper:]' | tr -d '"'"'")"
fi

if [[ "$autocommit_flag" != "TRUE" ]]; then
  exit 0
fi

if [[ $# -eq 0 ]]; then
  # Revert the most recent commit with a new commit (safe, non-destructive).
  git revert --no-edit HEAD
  exit 0
fi

query="$*"

timestamp_regex='^[0-9]{10}$'

commit_sha=""
if [[ "$query" =~ $timestamp_regex ]]; then
  if commit_sha=$(git log --format=%H -n 1 --fixed-strings --grep "$query"); then
    :
  else
    commit_sha=""
  fi
fi

if [[ -z "$commit_sha" ]]; then
  if commit_sha=$(git log --format=%H -n 1 --fixed-strings --grep "$query"); then
    :
  else
    commit_sha=""
  fi
fi

if [[ -z "$commit_sha" ]]; then
  echo "No commit found matching: $query"
  exit 0
fi

# Revert the matched commit with a new commit (safe, non-destructive).
git revert --no-edit "$commit_sha"
