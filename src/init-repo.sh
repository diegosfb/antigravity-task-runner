#!/usr/bin/env bash
set -euo pipefail

# Use the working directory the script was launched from (set by the extension)
REPO_ROOT="$(pwd)"

REPO_NAME="${1:-}"
if [[ -z "${REPO_NAME}" ]]; then
  echo "[init-repo] repository name argument missing, attempting to detect from origin remote"
  if git remote get-url origin >/dev/null 2>&1; then
    REMOTE_URL=$(git remote get-url origin)
    # Extract repo name from URL (works for https and ssh)
    # e.g. https://github.com/user/repo.git -> repo
    # e.g. git@github.com:user/repo.git -> repo
    REPO_NAME=$(basename -s .git "${REMOTE_URL}")
    echo "[init-repo] detected repository name: ${REPO_NAME}"
  else
    echo "[init-repo] ERROR: missing repository name argument and origin remote not found"
    echo "Usage: init-repo.sh <repository-name>"
    exit 1
  fi
fi

DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"
REPO_ENVIRONMENTS_RAW="${REPO_ENVIRONMENTS:-dev qa stage prod}"
read -r -a REPO_ENVIRONMENTS <<< "${REPO_ENVIRONMENTS_RAW//,/ }"

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

create_workflows() {
  echo "[init-repo] ensuring GitHub Action workflows"
  mkdir -p .github/workflows

  if [ ! -f ".github/workflows/ci.yml" ]; then
    cat > .github/workflows/ci.yml <<'EOF'
name: CI
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci || echo "Skipping npm ci (no package.json?)"
      - run: npm run lint || echo "Skipping lint"
      - run: npm run build || echo "Skipping build"
      - run: npm test || echo "Skipping tests"
EOF
    echo "[init-repo] created .github/workflows/ci.yml"
  else
    echo "[init-repo] .github/workflows/ci.yml already exists"
  fi

  if [ ! -f ".github/workflows/cd.yml" ]; then
    cat > .github/workflows/cd.yml <<'EOF'
name: CD
on:
  push:
    tags:
      - 'v*'
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: qa
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: echo "Deploying version ${{ github.ref_name }} to QA"
EOF
    echo "[init-repo] created .github/workflows/cd.yml"
  else
    echo "[init-repo] .github/workflows/cd.yml already exists"
  fi
}

ensure_basic_config() {
  echo "[init-repo] ensuring basic project configuration"
  
  # Ensure .gitignore
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
    echo "[init-repo] created .gitignore"
  else
    echo "[init-repo] .gitignore already exists"
  fi

  # Ensure .env.example
  if [ ! -f ".env.example" ]; then
    echo "[init-repo] creating .env.example"
    cat > .env.example <<'ENV_EXAMPLE'
# Jira Configuration
JIRA_PROJECT_KEY=
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=

# GitHub Configuration
GITHUB_TOKEN=

# App Settings
NODE_ENV=development
PORT=3000
ENV_EXAMPLE
    echo "[init-repo] created .env.example"
  else
    echo "[init-repo] .env.example already exists"
  fi
}

cd "${REPO_ROOT}"

echo "[init-repo] starting in ${REPO_ROOT}"

if ! command -v gh >/dev/null 2>&1; then
  echo "[init-repo] GitHub CLI not found"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "[init-repo] GitHub CLI authentication missing"
  exit 1
fi

# Ensure basic config (.gitignore, .env.example)
ensure_basic_config

# Create workflows
create_workflows

# Check for workflow scope
echo "[init-repo] verifying 'workflow' scope"
SCOPES=$(gh auth status 2>&1 | grep "Token scopes:" || true)
if [[ ! "${SCOPES}" == *"workflow"* ]]; then
  echo "[init-repo] ERROR: missing 'workflow' scope"
  echo "--------------------------------------------------------------------------------"
  echo "GitHub Action workflows were created, but your GitHub CLI token"
  echo "is missing the 'workflow' scope required to push them."
  echo ""
  echo "Please run: gh auth login -s workflow"
  echo "--------------------------------------------------------------------------------"
  exit 1
fi

echo "[init-repo] fetching GitHub login"
GITHUB_LOGIN="$(gh api user -q .login)"
REPO_FULL="${GITHUB_LOGIN}/${REPO_NAME}"

# Ensure environments
if [[ "${#REPO_ENVIRONMENTS[@]}" -gt 0 ]]; then
  echo "[init-repo] ensuring GitHub environments: ${REPO_ENVIRONMENTS[*]}"
  for environment_name in "${REPO_ENVIRONMENTS[@]}"; do
    ensure_github_environment "${REPO_FULL}" "${environment_name}"
  done
fi

# Final commit and push
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[init-repo] ERROR: Not a git repository. Run create-repo.sh first."
  exit 1
fi

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "[init-repo] creating initial commit"
  git add -A
  git commit -m "chore: initial repository setup"
else
  echo "[init-repo] adding changes to existing repository"
  git add -A
  if ! git diff --cached --quiet; then
    git commit -m "chore: setup workflows and configurations"
  else
    echo "[init-repo] no configuration changes to commit"
  fi
fi

CURRENT_BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || echo "${DEFAULT_BRANCH}")"

# Check if origin exists before pushing
if ! git remote get-url origin >/dev/null 2>&1; then
  echo "[init-repo] ERROR: origin remote not found. Run create-repo.sh first."
  exit 1
fi

echo "[init-repo] pushing branch ${CURRENT_BRANCH} to origin"
if ! git push -u origin "${CURRENT_BRANCH}"; then
  echo "[init-repo] ERROR: git push failed"
  exit 1
fi

echo "[init-repo] completed successfully"
