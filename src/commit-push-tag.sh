#!/usr/bin/env bash
set -euo pipefail

# commit-push-tag.sh  "commit message"
#
# Flow: bump version → build → (abort on failure) → commit → push → GitHub release
#
# Configurable via environment variables (all optional — auto-detected when possible):
#   BUILD_CMD      Command that compiles/packages the project.
#                  Auto-detected from: package.json, pom.xml, build.gradle,
#                  Makefile, go.mod, Cargo.toml, CMakeLists.txt
#   VERSION_BUMP   Command to bump the patch version before building.
#                  Auto-detected for npm. Leave unset to skip version bumping.
#   VERSION_CMD    Command that prints the current version to stdout.
#                  Auto-detected for npm/maven/cargo. Used as the release tag (v<version>).
#                  Leave unset to skip release tag creation.
#   ARTIFACT       Path or glob pattern for the artifact to attach to the GitHub release.
#                  Supports multiple files (space-separated or glob). Optional.
#   CREATE_RELEASE_BRANCH
#                  When set to 1, create, switch to, and push a branch that matches
#                  the release tag after creating the release. Default is 0 (off) —
#                  GitHub Flow policy: main is the only long-lived branch; branch
#                  from a tag temporarily only when you need to inspect or rebuild.
#
# Examples:
#   commit-push-tag.sh "feat: new feature"
#   BUILD_CMD="make release" ARTIFACT="dist/*.tar.gz" commit-push-tag.sh "chore: release"
#   VERSION_BUMP="./bump-version.sh" VERSION_CMD="cat VERSION" commit-push-tag.sh "release"

# ─── Argument check ──────────────────────────────────────────────────────────
if [[ ${#} -lt 1 ]]; then
  echo "Usage: $(basename "$0") \"commit message\""
  echo ""
  echo "Optional env vars: BUILD_CMD  VERSION_BUMP  VERSION_CMD  ARTIFACT"
  exit 1
fi

MSG="$1"
[[ -z "${MSG}" ]] && { echo "Commit message cannot be empty."; exit 1; }
# GitHub Flow: main is the only long-lived branch. Release branches violate this
# policy. Branch from the tag temporarily only when you need to inspect or rebuild
# an old version. Override to 1 only with explicit repository-owner approval.
CREATE_RELEASE_BRANCH="${CREATE_RELEASE_BRANCH:-0}"

# ─── Git sanity checks ───────────────────────────────────────────────────────
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository."
  exit 1
fi

BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || true)"
[[ -z "${BRANCH}" ]] && { echo "Detached HEAD — checkout a branch first."; exit 1; }

# ─── Auto-detect project type ────────────────────────────────────────────────
_npm_build_script() {
  # Pick the first recognised script defined in package.json
  for s in build compile package; do
    if node -e "const p=require('./package.json');process.exit(p.scripts&&p.scripts['${s}']?0:1)" 2>/dev/null; then
      echo "npm run ${s}"; return
    fi
  done
  echo "npm pack"
}

_is_vscode_extension() {
  node -e "const p=require('./package.json');process.exit(p.publisher&&p.engines&&p.engines.vscode?0:1)" 2>/dev/null
}

_npm_package_name() {
  node -p "require('./package.json').name" 2>/dev/null
}

if [[ -f "package.json" ]]; then
  if _is_vscode_extension; then
    BUILD_CMD="${BUILD_CMD:-npm run compile && vsce package}"
  else
    BUILD_CMD="${BUILD_CMD:-$(_npm_build_script)}"
  fi
  VERSION_BUMP="${VERSION_BUMP:-npm version patch --no-git-tag-version}"
  VERSION_CMD="${VERSION_CMD:-node -p \"require('./package.json').version\"}"
elif [[ -f "pom.xml" ]]; then
  BUILD_CMD="${BUILD_CMD:-mvn package -DskipTests}"
  VERSION_CMD="${VERSION_CMD:-mvn help:evaluate -Dexpression=project.version -q -DforceStdout}"
elif [[ -f "build.gradle" ]] || [[ -f "build.gradle.kts" ]]; then
  _GRADLE="$([ -f gradlew ] && echo ./gradlew || echo gradle)"
  BUILD_CMD="${BUILD_CMD:-${_GRADLE} build}"
elif [[ -f "go.mod" ]]; then
  BUILD_CMD="${BUILD_CMD:-go build ./...}"
elif [[ -f "Cargo.toml" ]]; then
  BUILD_CMD="${BUILD_CMD:-cargo build --release}"
  VERSION_BUMP="${VERSION_BUMP:-cargo set-version --bump patch}"
  VERSION_CMD="${VERSION_CMD:-cargo metadata --no-deps --format-version 1 | python3 -c \"import sys,json;print(json.load(sys.stdin)['packages'][0]['version'])\"}"
elif [[ -f "Makefile" ]] || [[ -f "makefile" ]]; then
  BUILD_CMD="${BUILD_CMD:-make}"
elif [[ -f "CMakeLists.txt" ]]; then
  BUILD_CMD="${BUILD_CMD:-cmake --build .}"
fi

if [[ -z "${BUILD_CMD:-}" ]]; then
  echo "Could not auto-detect a build command."
  echo "Set BUILD_CMD and re-run. Example: BUILD_CMD=\"make release\" $(basename "$0") \"${MSG}\""
  exit 1
fi

# ─── 1. Bump version ─────────────────────────────────────────────────────────
if [[ -n "${VERSION_BUMP:-}" ]]; then
  echo "Bumping version..."
  eval "${VERSION_BUMP}"
fi

VERSION=""
if [[ -n "${VERSION_CMD:-}" ]]; then
  VERSION="$(eval "${VERSION_CMD}")"
  echo "Version: ${VERSION}"
fi

if [[ -z "${ARTIFACT:-}" ]] && [[ -n "${VERSION}" ]] && [[ -f "package.json" ]] && _is_vscode_extension; then
  PACKAGE_NAME="$(_npm_package_name)"
  if [[ -n "${PACKAGE_NAME}" ]]; then
    ARTIFACT="${PACKAGE_NAME}-${VERSION}.vsix"
  fi
fi

# ─── 2. Build ────────────────────────────────────────────────────────────────
echo "Building:  ${BUILD_CMD}"
if ! eval "${BUILD_CMD}"; then
  echo ""
  echo "Build failed. Aborting — nothing has been committed or pushed."
  exit 1
fi
echo "Build succeeded."

# ─── 3. Resolve artifact(s) ──────────────────────────────────────────────────
ARTIFACT_ARGS=()
if [[ -n "${ARTIFACT:-}" ]]; then
  shopt -s nullglob
  # shellcheck disable=SC2206
  ARTIFACT_ARGS=( ${ARTIFACT} )
  shopt -u nullglob
  if [[ ${#ARTIFACT_ARGS[@]} -eq 0 ]]; then
    echo "Warning: ARTIFACT pattern '${ARTIFACT}' matched no files — release will have no attachment."
  else
    echo "Artifacts: ${ARTIFACT_ARGS[*]}"
  fi
fi

# ─── 4. Commit and push ───────────────────────────────────────────────────────
echo "Committing..."
git add -A
if [[ -f "package.json" ]] && _is_vscode_extension; then
  shopt -s nullglob
  VSIX_FILES=(./*.vsix)
  shopt -u nullglob
  if [[ ${#VSIX_FILES[@]} -gt 0 ]]; then
    git rm -q --cached --ignore-unmatch -- "${VSIX_FILES[@]}" || true
  fi
fi
git commit -m "${MSG}"

if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
  git push
else
  git push -u origin "${BRANCH}"
fi

# ─── 5. GitHub release ───────────────────────────────────────────────────────
if [[ -n "${VERSION}" ]]; then
  TAG_NAME="v${VERSION}"
  if gh release view "${TAG_NAME}" >/dev/null 2>&1; then
    echo "Release ${TAG_NAME} already exists — skipping."
  else
    gh release create "${TAG_NAME}" "${ARTIFACT_ARGS[@]}" \
      --title "${TAG_NAME}" \
      --notes "${MSG}"
    echo "Release ${TAG_NAME} created."
  fi

  if [[ "${CREATE_RELEASE_BRANCH}" == "1" ]]; then
    if git show-ref --verify --quiet "refs/heads/${TAG_NAME}"; then
      git switch "${TAG_NAME}"
      echo "Switched to existing local release branch ${TAG_NAME}."
    elif git ls-remote --exit-code --heads origin "${TAG_NAME}" >/dev/null 2>&1; then
      git switch -c "${TAG_NAME}" --track "origin/${TAG_NAME}"
      echo "Checked out existing remote release branch ${TAG_NAME}."
    else
      git switch -c "${TAG_NAME}"
      git push -u origin "${TAG_NAME}"
      echo "Created and pushed release branch ${TAG_NAME}."
    fi
  fi
fi

echo ""
echo "Done: ${VERSION:+v${VERSION} }committed, pushed${VERSION:+, and released}.${VERSION:- No release tag (VERSION_CMD not set).}"
