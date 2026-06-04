#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env.vsce"

echo "Opening Azure DevOps PAT page..."
open "https://dev.azure.com/_usersSettings/tokens" 2>/dev/null || \
xdg-open "https://dev.azure.com/_usersSettings/tokens" 2>/dev/null || \
echo "Open manually: https://dev.azure.com/_usersSettings/tokens"

echo
echo "Create a PAT with:"
echo "  Organization: All accessible organizations"
echo "  Scopes: Custom defined > Show all scopes > Marketplace > Manage"
echo

read -rsp "Paste your Azure DevOps PAT: " VSCE_PAT
echo

cat > "$ENV_FILE" <<EOF
VSCE_PAT=$VSCE_PAT
EOF

chmod 600 "$ENV_FILE"

echo "Saved token to $ENV_FILE"

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: Node.js/npm is required."
  exit 1
fi

echo "Installing/checking vsce..."
npm install --save-dev @vscode/vsce

echo "Publishing extension..."
set -a
source "$ENV_FILE"
set +a

npx vsce publish -p "$VSCE_PAT"