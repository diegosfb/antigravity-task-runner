#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_NAME="$(basename "${REPO_ROOT}")"
GIT_EMAIL="diegosfbf@gmail.com"
VISIBILITY="${REPO_VISIBILITY:-private}" # "private" or "public"
USE_HTTPS="${USE_HTTPS:-1}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"

cd "${REPO_ROOT}"

REPO_ALREADY_INIT=0
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  REPO_ALREADY_INIT=1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required. Install it and run: gh auth login"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login"
  exit 1
fi

if [[ "${VISIBILITY}" != "private" && "${VISIBILITY}" != "public" ]]; then
  echo "Invalid REPO_VISIBILITY: ${VISIBILITY}. Use 'private' or 'public'."
  exit 1
fi

if [[ "${REPO_ALREADY_INIT}" == "0" ]]; then
  git init
  git config user.email "${GIT_EMAIL}"
else
  git config user.email "${GIT_EMAIL}"
fi

GITHUB_LOGIN="$(gh api user -q .login)"
REPO_FULL="${GITHUB_LOGIN}/${REPO_NAME}"

if gh repo view "${REPO_FULL}" >/dev/null 2>&1; then
  echo "GitHub repository ${REPO_FULL} already exists. Creating local repo and setting remote."
else
  gh repo create "${REPO_FULL}" --"${VISIBILITY}" --confirm
  echo "Created GitHub repository ${REPO_FULL}."
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  if [[ "${USE_HTTPS}" == "1" ]]; then
    REMOTE_URL="https://github.com/${REPO_FULL}.git"
  else
    REMOTE_URL="git@github.com:${REPO_FULL}.git"
  fi

  git remote add origin "${REMOTE_URL}"
fi

if [[ "${REPO_ALREADY_INIT}" == "0" ]]; then
  git branch -M "${DEFAULT_BRANCH}"
fi

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  git add -A
  git commit -m "chore: initial commit"
fi

CURRENT_BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || echo "${DEFAULT_BRANCH}")"
git push -u origin "${CURRENT_BRANCH}"

echo "Repository initialized and pushed to origin/${CURRENT_BRANCH}."
