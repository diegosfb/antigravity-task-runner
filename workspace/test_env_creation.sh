#!/usr/bin/env bash
set -euo pipefail

ensure_github_environment() {
  local repo_full="$1"
  local environment_name="$2"

  if [[ -z "${environment_name}" ]]; then
    return
  fi

  echo "[init-repo] ensuring GitHub environment: ${environment_name}"
  if gh api --method PUT "repos/${repo_full}/environments/${environment_name}" >/dev/null; then
    echo "[init-repo] successfully ensured GitHub environment: ${environment_name}"
  else
    echo "[init-repo] WARNING: could not ensure GitHub environment: ${environment_name}"
    echo "Check if your token has 'repo' scope and you have admin access to the repository."
  fi
}

REPO_FULL="diegosfb/DeleteTHisOne"
REPO_ENVIRONMENTS=(dev qa stage prod)

for environment_name in "${REPO_ENVIRONMENTS[@]}"; do
  ensure_github_environment "${REPO_FULL}" "${environment_name}"
done
