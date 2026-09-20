---
kind: "design-decision"
date: 2026-09-19T12:21:53Z
agent: "Codex"
---

# Targeted Create Tests source overrides backlog

When User Story or Specification is supplied, buildAdlcAgentPrompt omits the Backlog input even if its default is populated. The targeted artifact becomes the governing test scope; backlog-only runs remain unchanged.

## Related artifacts

None supplied.
