---
kind: "implementation-note"
date: 2026-09-21T04:23:35Z
agent: "codex"
---

# Workflows tree now lists workspace .agents workflows

Fixed the Workflows sidebar category so it reads markdown workflows from the current repository's .agents/workflows directory before falling back to the legacy home antigravity workflows directory. Added a tree-provider regression test that reproduces the previous Missing ~/.antigravity result and verifies workspace workflow items run via antigravity.runWorkflow.

## Related artifacts

None supplied.
