#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/diegosfb/dsfb-sdlc-v2.git"
DEST_DIR="${1:-antigravity-task-runner}"

echo "Cloning $REPO_URL into $DEST_DIR ..."
git clone "$REPO_URL" "$DEST_DIR"

cd "$DEST_DIR"

echo "Installing npm dependencies ..."
npm install

echo "Creating empty directories not tracked by git ..."
mkdir -p \
  ".agents/skills/google-gemini-api/rules" \
  ".claude/commands" \
  ".codex/rules" \
  "docs/architecture/adrs" \
  "docs/architecture/architecture_guidelines" \
  "docs/architecture/documents" \
  "docs/estimation" \
  "docs/project_description" \
  "docs/specs" \
  "docs/ux" \
  "docs/vault/ADRs" \
  "docs/vault/Architecture" \
  "docs/vault/Context-History" \
  "docs/vault/Estimation" \
  "docs/vault/Implementation-Plans" \
  "docs/vault/MOCs" \
  "docs/vault/PRD" \
  "docs/vault/Reviews" \
  "docs/vault/Specs" \
  "docs/vault/Test-Cases" \
  "docs/vault/UX" \
  "outputs"

echo "Setup complete. Project is in ./$DEST_DIR"
