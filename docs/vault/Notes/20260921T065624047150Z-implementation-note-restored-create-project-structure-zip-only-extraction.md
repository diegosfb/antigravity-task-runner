---
kind: "implementation-note"
date: 2026-09-21T06:56:24Z
agent: "Codex"
---

# Restored create-project-structure zip-only extraction

create-project-structure.sh now downloads project-structure.zip from the configured GitHub repository into tmp/project-structure.zip and extracts it under tmp/project-structure. The list-file fallback was removed because the required behavior is to use the zip artifact.

## Related artifacts

None supplied.
