#!/usr/bin/env bash
set -euo pipefail

# Use the working directory the script was launched from (set by the extension)
REPO_ROOT="$(pwd)"

REPO_NAME="${1:-}"
if [[ -z "${REPO_NAME}" ]]; then
  echo "Usage: init-repo.sh <repository-name>"
  exit 1
fi

GIT_EMAIL="diegosfbf@gmail.com"
VISIBILITY="${REPO_VISIBILITY:-private}"
USE_HTTPS="${USE_HTTPS:-1}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"

cd "${REPO_ROOT}"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required. Install it and run: gh auth login"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login"
  exit 1
fi

REPO_ALREADY_INIT=0
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  REPO_ALREADY_INIT=1
fi

if [[ "${REPO_ALREADY_INIT}" == "1" ]]; then
  echo "A Git repository already exists in this project."
  exit 1
fi

git init
git config user.email "${GIT_EMAIL}"

# Create .gitignore if not present
if [ ! -f ".gitignore" ]; then
  cat > .gitignore <<'GITIGNORE'
# Dependencies
node_modules/
.pnp
.pnp.js

# Environment & secrets
.env
.env.*
!.env.example

# Build outputs
dist/
build/
out/
*.vsix

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Misc
*.tmp
*.swp
GITIGNORE
  echo "Created .gitignore"
fi

GITHUB_LOGIN="$(gh api user -q .login)"
REPO_FULL="${GITHUB_LOGIN}/${REPO_NAME}"

if gh repo view "${REPO_FULL}" >/dev/null 2>&1; then
  echo "GitHub repository ${REPO_FULL} already exists. Continuing with initialization."
else
  gh repo create "${REPO_FULL}" --"${VISIBILITY}" --confirm
  echo "Created GitHub repository ${REPO_FULL}."
fi

if [[ "${USE_HTTPS}" == "1" ]]; then
  REMOTE_URL="https://github.com/${REPO_FULL}.git"
else
  REMOTE_URL="git@github.com:${REPO_FULL}.git"
fi

git remote add origin "${REMOTE_URL}"
git branch -M "${DEFAULT_BRANCH}"

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  git add -A
  git commit -m "chore: initial commit"
fi

CURRENT_BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || echo "${DEFAULT_BRANCH}")"
git push -u origin "${CURRENT_BRANCH}"

echo "Repository '${REPO_NAME}' initialized and pushed to origin/${CURRENT_BRANCH}."
