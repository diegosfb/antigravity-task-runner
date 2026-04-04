#!/bin/bash

set -euo pipefail

echo "Running lint..."
npm run lint

echo "Running npm audit..."
npm audit

echo "Running build..."
npm run build

echo "NOTE: E2E tests are not run automatically by this script. Run them manually if required."

./scripts/bump-version.sh

VERSION=$(node -p "require('./package.json').version")

git add package.json package-lock.json src/App.tsx

git commit -m "Release v$VERSION"

git tag -a "v$VERSION" -m "Release v$VERSION"

git push origin main --tags

echo "Release v$VERSION completed."
