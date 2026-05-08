#!/bin/bash

set -euo pipefail

echo "Running lint..."
npm run lint

echo "Running tests..."
npm test

echo "Running npm audit..."
npm audit

echo "NOTE: E2E tests are not run automatically by this script. Run them manually if required."

./scripts/bump-version.sh

VERSION=$(node -p "require('./package.json').version")

STAGE_FILES=(package.json package-lock.json)
if [ -f src/App.tsx ]; then
  STAGE_FILES+=(src/App.tsx)
fi

git add "${STAGE_FILES[@]}"

git commit -m "Release v$VERSION"

git tag -a "v$VERSION" -m "Release v$VERSION"

git push origin main --tags

echo "Release v$VERSION completed."
