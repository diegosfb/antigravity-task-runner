---
kind: "problem"
date: 2026-09-20T07:12:02Z
agent: "Codex"
---

# Fixed Obsidian launcher script resolution

The installed extension package did not contain scripts/open-obsidian-vault.sh, and running a bundled copy would resolve docs/vault relative to the extension rather than the active project. The launcher now resolves the script from <active repository>/scripts, matching the script's project-root assumptions. Added a regression test for repository-based resolution.

## Related artifacts

None supplied.
