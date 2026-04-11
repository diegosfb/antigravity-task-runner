#!/usr/bin/env bash

# ==============================================================================
# Update Agentic Workspace
# Commits and pushes the workspace/ folder to the antigravity-workspace repo.
# Target: https://github.com/diegosfb/antigravity-workspace
# Usage: ./update-agentic-workspace.sh
# ==============================================================================

set -euo pipefail

PROJECT_ROOT=$(pwd)
WORKSPACE_DIR="$PROJECT_ROOT/workspace"
REMOTE_URL="https://github.com/diegosfb/antigravity-workspace.git"

if [ ! -d "$WORKSPACE_DIR" ]; then
  echo "Error: workspace/ directory not found in $PROJECT_ROOT"
  exit 1
fi

cd "$WORKSPACE_DIR"

# Initialize git repo if not already one
if [ ! -d ".git" ]; then
  echo "Initializing git repo in workspace/..."
  git init
  git checkout -b main 2>/dev/null || true
fi

# Set up or correct the remote
if git remote get-url origin &>/dev/null; then
  CURRENT_REMOTE=$(git remote get-url origin)
  if [ "$CURRENT_REMOTE" != "$REMOTE_URL" ]; then
    git remote set-url origin "$REMOTE_URL"
    echo "Updated remote origin to $REMOTE_URL"
  fi
else
  git remote add origin "$REMOTE_URL"
  echo "Added remote origin: $REMOTE_URL"
fi

# Stage all changes
git add -A

# Commit only if there is something staged
if git diff --cached --quiet; then
  echo "Nothing to commit in workspace/ — already up to date."
else
  TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
  git commit -m "Update agentic workspace — $TIMESTAMP"
  echo "Committed workspace changes."
fi

# Pull remote changes first to avoid rejected pushes
git pull --rebase origin main 2>/dev/null || git pull --rebase origin main

# Push to the antigravity-workspace repo
git push -u origin main
echo "workspace/ pushed to $REMOTE_URL"
