---
kind: "design-decision"
date: 2026-09-19T13:07:49Z
agent: "Codex"
---

# SDLC Orchestrator accepts only the user request and shows delegation

The project_state input was removed from the SDLC Orchestrator page because standard repository state is discovered implicitly. The page diagram now shows a required User Request flowing through the SDLC Orchestrator Agent to a green Delegation to Appropriate Agent(s) output.

## Related artifacts

None supplied.
