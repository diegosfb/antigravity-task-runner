#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"

echo "Bumping patch version..."
npm run bump-version patch

echo "Compiling extension..."
npm run compile

echo "Packaging VSIX..."
vsce package

package_name="$(node -p "require('./package.json').name")"
package_version="$(node -p "require('./package.json').version")"
vsix_file="${package_name}-${package_version}.vsix"

if [[ ! -f "$vsix_file" ]]; then
  echo "Expected VSIX not found: $vsix_file" >&2
  exit 1
fi

echo "Created $vsix_file"
