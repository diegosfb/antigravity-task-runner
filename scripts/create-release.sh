#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"

package_name="$(node -p "require('./package.json').name")"
package_version="$(node -p "require('./package.json').version")"
vsix_file="${package_name}-${package_version}.vsix"
release_tag="v${package_version}"

npm run compile
vsce package

if [[ ! -f "$vsix_file" ]]; then
  echo "Expected VSIX not found: $vsix_file" >&2
  exit 1
fi

git add -A
if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "chore(release): ${release_tag}"
  git push
fi

if gh release view "$release_tag" >/dev/null 2>&1; then
  echo "Release $release_tag already exists."
else
  gh release create "$release_tag" "$vsix_file" --title "$release_tag" --notes "Release $release_tag"
fi
