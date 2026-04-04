#!/bin/bash

set -euo pipefail

latest_tag=$(git tag --list "v*" --sort=-v:refname | head -n 1 || true)
current_version=$(node -p "require('./package.json').version")
current_tag="v${current_version}"

if [[ -z "$latest_tag" ]]; then
  echo "No tags found. Running build-version workflow..."
  ./scripts/build-version.sh
  exit 0
fi

if [[ "$latest_tag" != "$current_tag" ]]; then
  echo "Version mismatch: latest tag is $latest_tag but package.json is $current_tag."
  echo "Running build-version workflow..."
  ./scripts/build-version.sh
  exit 0
fi

if ! git diff --quiet "$latest_tag"..HEAD; then
  echo "There are committed changes since $latest_tag. Running build-version workflow..."
  ./scripts/build-version.sh
  exit 0
fi

if ! git diff --quiet; then
  echo "There are uncommitted changes in the working tree. Running build-version workflow..."
  ./scripts/build-version.sh
  exit 0
fi

echo "Current version ($current_tag) matches latest tag and no changes detected. No release needed."
