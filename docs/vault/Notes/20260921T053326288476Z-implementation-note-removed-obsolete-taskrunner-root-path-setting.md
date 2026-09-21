---
kind: "implementation-note"
date: 2026-09-21T05:33:26Z
agent: "Codex"
---

# Removed obsolete TaskRunner Root Path setting

TaskRunner now resolves its project root from the active VS Code workspace folder instead of the antigravity.rootPath setting. The contributed setting, settings-page field, help/README references, stale user-facing rootPath error text, and old .agent/antigravity repo-root mapping test were updated.

## Related artifacts

None supplied.
