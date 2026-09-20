---
kind: "design-decision"
date: 2026-09-19T13:01:48Z
agent: "Codex"
---

# Deployment Agent uses a release manifest with optional lifecycle scripts

Deployment now requires a YAML release configuration following the extensionless references/release_configuration_sample. It optionally accepts reviewed pre- and post-deployment scripts, but validates targets, credentials, destructive behavior, rollback, and required infrastructure/database/production approvals before execution.

## Related artifacts

None supplied.
