---
kind: "implementation-note"
date: 2026-09-20T11:09:56Z
agent: "Codex"
---

# Removed stale VSIX package include

Removed the missing Project Level AGENT.md Guidelines.txt entry from package.json files so vsce package no longer fails the unused include-pattern check. The extension still treats that guideline file as optional at runtime.

## Related artifacts

None supplied.
