---
kind: "design-decision"
date: 2026-09-19T12:14:09Z
agent: "Codex"
---

# Create Tests accepts a backlog or one user story/specification

Added optional user_story_or_specification context to the Test Agent. The Create Tests page now shows optional Backlog and optional User Story or Specification inputs. Frontend and backend validation require at least one source. Backlog defaults to docs/backlog; the targeted input accepts a file or directory and can replace the whole backlog for narrow test generation.

## Related artifacts

None supplied.
