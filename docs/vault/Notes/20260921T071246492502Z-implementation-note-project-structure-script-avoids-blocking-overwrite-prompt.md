---
kind: "implementation-note"
date: 2026-09-21T07:12:46Z
agent: "Codex"
---

# Project structure script avoids blocking overwrite prompt

create-project-structure.sh now detects non-interactive execution before prompting for overwrite confirmation. In Code Runner and other no-stdin contexts it keeps existing files and extracts only new files. PROJECT_STRUCTURE_OVERWRITE can be set to yes/1/true/y to force overwrite.

## Related artifacts

None supplied.
