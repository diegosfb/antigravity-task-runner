#!/usr/bin/env bash
set -euo pipefail

# Use the working directory the script was launched from (set by the extension)
REPO_ROOT="$(pwd)"

REPO_NAME="${1:-}"
if [[ -z "${REPO_NAME}" ]]; then
  echo "[init-repo] missing repository name argument"
  echo "Usage: init-repo.sh <repository-name>"
  exit 1
fi

GIT_EMAIL="diegosfbf@gmail.com"
VISIBILITY="${REPO_VISIBILITY:-private}"
USE_HTTPS="${USE_HTTPS:-1}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"

cd "${REPO_ROOT}"

echo "[init-repo] starting in ${REPO_ROOT}"
echo "[init-repo] repo_name=${REPO_NAME} visibility=${VISIBILITY} default_branch=${DEFAULT_BRANCH} use_https=${USE_HTTPS}"

if ! command -v gh >/dev/null 2>&1; then
  echo "[init-repo] GitHub CLI not found"
  echo "GitHub CLI (gh) is required. Install it and run: gh auth login"
  exit 1
fi
echo "[init-repo] GitHub CLI found"

if ! gh auth status >/dev/null 2>&1; then
  echo "[init-repo] GitHub CLI authentication missing"
  echo "GitHub CLI is not authenticated. Run: gh auth login"
  exit 1
fi
echo "[init-repo] GitHub CLI authentication verified"

REPO_ALREADY_INIT=0
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  REPO_ALREADY_INIT=1
fi

if [[ "${REPO_ALREADY_INIT}" == "1" ]]; then
  echo "[init-repo] repository already initialized in ${REPO_ROOT}"
  echo "A Git repository already exists in this project."
  exit 1
fi

echo "[init-repo] running git init"
git init
echo "[init-repo] setting git user.email to ${GIT_EMAIL}"
git config user.email "${GIT_EMAIL}"

# Create .gitignore if not present
if [ ! -f ".gitignore" ]; then
  echo "[init-repo] creating default .gitignore"
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
else
  echo "[init-repo] existing .gitignore found"
fi

echo "[init-repo] fetching GitHub login"
GITHUB_LOGIN="$(gh api user -q .login)"
REPO_FULL="${GITHUB_LOGIN}/${REPO_NAME}"
echo "[init-repo] resolved remote repository ${REPO_FULL}"

if gh repo view "${REPO_FULL}" >/dev/null 2>&1; then
  echo "[init-repo] GitHub repository ${REPO_FULL} already exists"
  echo "GitHub repository ${REPO_FULL} already exists. Continuing with initialization."
else
  echo "[init-repo] creating GitHub repository ${REPO_FULL}"
  gh repo create "${REPO_FULL}" --"${VISIBILITY}" --confirm
  echo "Created GitHub repository ${REPO_FULL}."
fi

if [[ "${USE_HTTPS}" == "1" ]]; then
  REMOTE_URL="https://github.com/${REPO_FULL}.git"
else
  REMOTE_URL="git@github.com:${REPO_FULL}.git"
fi
echo "[init-repo] using remote ${REMOTE_URL}"

echo "[init-repo] adding origin remote"
git remote add origin "${REMOTE_URL}"
echo "[init-repo] setting default branch to ${DEFAULT_BRANCH}"
git branch -M "${DEFAULT_BRANCH}"

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "[init-repo] creating initial commit"
  git add -A
  git commit -m "chore: initial commit"
else
  echo "[init-repo] existing commit detected, skipping initial commit"
fi

CURRENT_BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || echo "${DEFAULT_BRANCH}")"
echo "[init-repo] pushing branch ${CURRENT_BRANCH} to origin"
git push -u origin "${CURRENT_BRANCH}"

echo "[init-repo] completed successfully"
echo "Repository '${REPO_NAME}' initialized and pushed to origin/${CURRENT_BRANCH}."
