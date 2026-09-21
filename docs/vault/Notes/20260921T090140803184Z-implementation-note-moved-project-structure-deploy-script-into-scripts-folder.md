---
kind: "implementation-note"
date: 2026-09-21T09:01:40Z
agent: "Codex"
---

# Moved project structure deploy script into scripts folder

create-project-structure.sh was renamed to scripts/deploy-project-structure.sh. Because the script now runs from scripts, it resolves the repository root as the parent directory before reading .vscode/settings.json, writing tmp/project-structure.zip, and resolving antigravity.workspaceProjectPath. Active settings/help descriptions and project-structure.zip were updated to the new script path.

## Related artifacts

None supplied.
