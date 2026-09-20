---
kind: "implementation-note"
date: 2026-09-20T06:42:01Z
agent: "Codex"
---

# Moved Jira project selection into Backlog Management

Moved Select/Set Jira Project from the top-level quick actions into Backlog Management as the first child. Preserved the existing visibility rule: it appears only when no JIRA_PROJECT_KEY is found in the repository .env file. Updated focused regression coverage for child order, top-level removal, and command identity.

## Related artifacts

None supplied.
