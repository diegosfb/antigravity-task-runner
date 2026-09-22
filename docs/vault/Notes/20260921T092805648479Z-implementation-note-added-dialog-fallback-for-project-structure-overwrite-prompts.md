---
kind: "implementation-note"
date: 2026-09-21T09:28:05Z
agent: "Codex"
---

# Added dialog fallback for project structure overwrite prompts

scripts/deploy-project-structure.sh no longer writes to /dev/tty when Code Runner lacks a configured TTY. It now uses a macOS osascript dialog when available, falls back to terminal/stdin prompts, and keeps existing files when no input path is available. project-structure.zip and project-structure-deployment.md were rebuilt with this behavior.

## Related artifacts

None supplied.
