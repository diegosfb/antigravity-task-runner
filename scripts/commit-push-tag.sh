#!/usr/bin/env bash
set -euo pipefail

if [[ ${#} -lt 1 ]]; then
  echo "Usage: $(basename "$0") \"commit message\" [tag-name]"
  echo "Optional env: TAG_PREFIX (default: tag)"
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository."
  exit 1
fi

MSG="$1"
TAG_NAME="${2:-}"
TAG_PREFIX="${TAG_PREFIX:-tag}"

if [[ -z "${MSG}" ]]; then
  echo "Commit message cannot be empty."
  exit 1
fi

BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || true)"
if [[ -z "${BRANCH}" ]]; then
  echo "Detached HEAD. Please checkout a branch before running this script."
  exit 1
fi

git add -A

HAS_CHANGES=1
if git diff --cached --quiet; then
  HAS_CHANGES=0
  echo "No changes to commit. Skipping commit and proceeding to tag."
else
  git commit -m "${MSG}"

  if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
    git push
  else
    git push -u origin "${BRANCH}"
  fi
fi

if [[ -z "${TAG_NAME}" ]]; then
  TAG_NAME="${TAG_PREFIX}-$(date +%Y%m%d%H%M%S)"
fi

if git rev-parse -q --verify "refs/tags/${TAG_NAME}" >/dev/null 2>&1; then
  echo "Tag already exists: ${TAG_NAME}"
  exit 1
fi

git tag -a "${TAG_NAME}" -m "${MSG}"

git push origin "${TAG_NAME}"

if [[ "${HAS_CHANGES}" -eq 1 ]]; then
  echo "Committed, pushed, and created tag ${TAG_NAME}."
else
  echo "Created tag ${TAG_NAME} on current HEAD."
fi
