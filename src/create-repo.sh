#!/usr/bin/env bash
set -euo pipefail

# Use the working directory the script was launched from (set by the extension)
REPO_ROOT="$(pwd)"

REPO_NAME="${1:-}"
if [[ -z "${REPO_NAME}" ]]; then
  echo "[create-repo] missing repository name argument"
  echo "Usage: create-repo.sh <repository-name>"
  exit 1
fi

GIT_EMAIL="diegosfb@gmail.com"
VISIBILITY="${REPO_VISIBILITY:-private}"
USE_HTTPS="${USE_HTTPS:-1}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"

cd "${REPO_ROOT}"

echo "[create-repo] starting in ${REPO_ROOT}"
echo "[create-repo] repo_name=${REPO_NAME} visibility=${VISIBILITY} default_branch=${DEFAULT_BRANCH} use_https=${USE_HTTPS}"

if ! command -v gh >/dev/null 2>&1; then
  echo "[create-repo] GitHub CLI not found"
  echo "GitHub CLI (gh) is required. Install it and run: gh auth login"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "[create-repo] GitHub CLI authentication missing"
  echo "GitHub CLI is not authenticated. Run: gh auth login"
  exit 1
fi

REPO_ALREADY_INIT=0
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  REPO_ALREADY_INIT=1
fi

if [[ "${REPO_ALREADY_INIT}" == "0" ]]; then
  echo "[create-repo] running git init"
  git init
  echo "[create-repo] setting git user.email to ${GIT_EMAIL}"
  git config user.email "${GIT_EMAIL}"
else
  echo "[create-repo] local repository already initialized"
fi

# Create .gitignore if not present
if [ ! -f ".gitignore" ]; then
  echo "[create-repo] creating default .gitignore"
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

echo "[create-repo] fetching GitHub login"
GITHUB_LOGIN="$(gh api user -q .login)"
REPO_FULL="${GITHUB_LOGIN}/${REPO_NAME}"
echo "[create-repo] resolved remote repository ${REPO_FULL}"

if gh repo view "${REPO_FULL}" >/dev/null 2>&1; then
  echo "[create-repo] GitHub repository ${REPO_FULL} already exists"
else
  echo "[create-repo] creating GitHub repository ${REPO_FULL}"
  gh repo create "${REPO_FULL}" --"${VISIBILITY}" --confirm
  echo "Created GitHub repository ${REPO_FULL}."
fi

if [[ "${USE_HTTPS}" == "1" ]]; then
  REMOTE_URL="https://github.com/${REPO_FULL}.git"
else
  REMOTE_URL="git@github.com:${REPO_FULL}.git"
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "[create-repo] adding origin remote ${REMOTE_URL}"
  git remote add origin "${REMOTE_URL}"
else
  echo "[create-repo] origin remote already exists"
fi

echo "[create-repo] setting default branch to ${DEFAULT_BRANCH}"
git branch -M "${DEFAULT_BRANCH}"

echo "[create-repo] completed successfully"
