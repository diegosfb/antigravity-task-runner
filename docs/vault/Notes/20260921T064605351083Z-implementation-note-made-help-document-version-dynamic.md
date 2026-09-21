---
kind: "implementation-note"
date: 2026-09-21T06:46:05Z
agent: "Codex"
---

# Made help document version dynamic

Resources/help.md now uses a TASK_RUNNER_VERSION placeholder. The Open Help Doc command renders a temporary Markdown file using the current extension package.json version, and also replaces stale hardcoded help-version lines from cached or remote help files.

## Related artifacts

None supplied.
