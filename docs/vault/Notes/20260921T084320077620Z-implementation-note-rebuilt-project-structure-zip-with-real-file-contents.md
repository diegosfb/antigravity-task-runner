---
kind: "implementation-note"
date: 2026-09-21T08:43:20Z
agent: "Codex"
---

# Rebuilt project structure zip with real file contents

project-setup.sh was creating empty placeholders because failed curl downloads were masked with touch, and raw paths containing spaces were not URL-encoded. The setup script now URL-encodes paths and fails on download errors instead of creating zero-byte files. project-structure.zip was rebuilt from real sources and excludes local .vscode/settings.json.

## Related artifacts

None supplied.
