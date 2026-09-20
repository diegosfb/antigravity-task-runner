---
kind: "design-decision"
date: 2026-09-19T08:37:51Z
agent: "Codex"
---

# Architect agent discovers workflow configuration with safe defaults

The architect agent looks for ADLC_workflow_settings.json at the project root instead of requiring callers to provide it. If missing or unreadable, architecture work continues with required architecture approval and on-demand LLM judgment, and the user is informed that defaults are active.

## Related artifacts

None supplied.
