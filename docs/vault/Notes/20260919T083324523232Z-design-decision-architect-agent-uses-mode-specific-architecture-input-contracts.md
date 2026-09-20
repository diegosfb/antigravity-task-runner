---
kind: "design-decision"
date: 2026-09-19T08:33:24Z
agent: "Codex"
---

# Architect agent uses mode-specific architecture input contracts

New architecture work requires a specifications directory and workflow configuration, with optional PRD, development guidelines, and architecture guidelines. Existing architecture expansion requires the existing architecture folder, target specification file, and workflow configuration; it must inspect and preserve established decisions while minimizing changes. Missing mandatory inputs stop execution and are reported to the user.

## Related artifacts

None supplied.
