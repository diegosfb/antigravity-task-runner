# Bump Patch Compile Package

Runs the local release-prep flow without committing or creating a GitHub release.

Steps:
- Bump the extension patch version.
- Compile the extension.
- Build the VSIX package with `vsce package`.

Script:
- `./scripts/bump-patch-compile-package.sh`
