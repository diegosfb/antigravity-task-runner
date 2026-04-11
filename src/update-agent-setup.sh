#!/usr/bin/env bash

# ==============================================================================
# Update Agent Setup
# Commits and pushes the agent setup folder to the specified GitHub repo.
# Usage: ./update-agent-setup.sh <agent> <github-url>
#   agent: claude | gemini | codex
# ==============================================================================

set -euo pipefail

AGENT="${1:-}"
REMOTE_URL="${2:-}"

if [ -z "$AGENT" ] || [ -z "$REMOTE_URL" ]; then
  echo "Error: agent and GitHub URL are required."
  echo "Usage: $0 <claude|gemini|codex> <github-url>"
  exit 1
fi

PROJECT_ROOT=$(pwd)

case "$AGENT" in
  claude) SETUP_DIR="$PROJECT_ROOT/workspace/.agent/claude" ;;
  gemini) SETUP_DIR="$PROJECT_ROOT/workspace/.agent/gemini-antigravity" ;;
  codex)  SETUP_DIR="$PROJECT_ROOT/workspace/.agent/codex" ;;
  *)
    echo "Error: unknown agent '$AGENT'. Must be claude, gemini, or codex."
    exit 1
    ;;
esac

if [ ! -d "$SETUP_DIR" ]; then
  echo "Error: $SETUP_DIR not found in $PROJECT_ROOT"
  exit 1
fi

cd "$SETUP_DIR"

if [ ! -d ".git" ]; then
  echo "Initializing git repo in $SETUP_DIR..."
  git init
  git checkout -b main 2>/dev/null || true
fi

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

git add -A

if git diff --cached --quiet; then
  echo "Nothing to commit in $SETUP_DIR — already up to date."
else
  TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
  git commit -m "Update ${AGENT} setup — $TIMESTAMP"
  echo "Committed ${AGENT} setup changes."
fi

git push --force -u origin main
echo "$SETUP_DIR pushed to $REMOTE_URL"
