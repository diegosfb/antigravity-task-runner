#!/usr/bin/env bash

# ==============================================================================
# Update Agentic Workspace
# 1. Ensures the antigravity-workspace repo exists at WORKSPACE_PROJECT_DIR.
# 2. Copies all files from workspace/ into WORKSPACE_PROJECT_DIR, overwriting.
# 3. Commits and force-pushes WORKSPACE_PROJECT_DIR to
#    https://github.com/diegosfb/antigravity-workspace
# Usage: ./update-agentic-workspace.sh [workspace-project-dir]
# ==============================================================================

set -euo pipefail

PROJECT_ROOT=$(pwd)
WORKSPACE_DIR="$PROJECT_ROOT/workspace"
REMOTE_URL="https://github.com/diegosfb/antigravity-workspace.git"
WORKSPACE_PROJECT_DIR="${1:-}"

# === Step 1: Ensure WORKSPACE_PROJECT_DIR is a git repo pointing to the remote ===
if [ -n "$WORKSPACE_PROJECT_DIR" ]; then
  if [ ! -d "$WORKSPACE_PROJECT_DIR/.git" ]; then
    echo "Setting up $WORKSPACE_PROJECT_DIR from $REMOTE_URL..."
    mkdir -p "$WORKSPACE_PROJECT_DIR"
    cd "$WORKSPACE_PROJECT_DIR"
    git init
    git checkout -b main 2>/dev/null || true
    git remote add origin "$REMOTE_URL"
    git fetch origin main 2>/dev/null && git reset --hard origin/main || true
    echo "Initialized $WORKSPACE_PROJECT_DIR"
    cd "$PROJECT_ROOT"
  else
    cd "$WORKSPACE_PROJECT_DIR"
    CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
    CLEAN_REMOTE="${REMOTE_URL%.git}"
    if [ "$CURRENT_REMOTE" != "$REMOTE_URL" ] && [ "$CURRENT_REMOTE" != "$CLEAN_REMOTE" ]; then
      echo "Warning: remote origin ($CURRENT_REMOTE) does not match $REMOTE_URL"
    fi
    cd "$PROJECT_ROOT"
  fi
fi

# === Step 2: Copy workspace/ files into WORKSPACE_PROJECT_DIR, overwriting ===
if [ ! -d "$WORKSPACE_DIR" ]; then
  echo "workspace/ not found — creating $WORKSPACE_DIR"
  mkdir -p "$WORKSPACE_DIR"
fi

if [ -n "$WORKSPACE_PROJECT_DIR" ]; then
  echo "Copying workspace/scripts → $WORKSPACE_PROJECT_DIR/scripts"
  rsync -a "$WORKSPACE_DIR/scripts/" "$WORKSPACE_PROJECT_DIR/scripts/"
  echo "Copying workspace/.agent → $WORKSPACE_PROJECT_DIR/.agent"
  rsync -a --exclude=".git" "$WORKSPACE_DIR/.agent/" "$WORKSPACE_PROJECT_DIR/.agent/"
  echo "Files copied."
else
  echo "No WORKSPACE_PROJECT_DIR set — skipping copy."
fi

# === Step 3: Commit and force-push to https://github.com/diegosfb/antigravity-workspace ===
if [ -n "$WORKSPACE_PROJECT_DIR" ]; then
  cd "$WORKSPACE_PROJECT_DIR"
else
  # Fallback: use workspace/ directly as the repo
  cd "$WORKSPACE_DIR"
  if [ ! -d ".git" ]; then
    git init
    git checkout -b main 2>/dev/null || true
  fi
  if git remote get-url origin &>/dev/null; then
    CURRENT_REMOTE=$(git remote get-url origin)
    [ "$CURRENT_REMOTE" != "$REMOTE_URL" ] && git remote set-url origin "$REMOTE_URL"
  else
    git remote add origin "$REMOTE_URL"
  fi
fi

git add -A

if git diff --cached --quiet; then
  echo "Nothing to commit — already up to date."
else
  TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
  git commit -m "Update agentic workspace — $TIMESTAMP"
  echo "Committed changes."
fi

echo "Force-pushing to $REMOTE_URL..."
git push --force -u origin main
echo "Done — pushed to $REMOTE_URL"
