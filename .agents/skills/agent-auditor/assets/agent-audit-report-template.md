# Agent Audit Report — {{DATE}}

## Portfolio assessment

Summarize ownership coverage, routing quality, workflow cohesion, and material risks.

## Claude authoring policy

| Field | Recommended | Audit failure |
|---|---:|---:|
| YAML `description` | Clear capability plus distinguishing domain or activation context; no minimum | >1,000 characters |
| System prompt | 500–3,000 characters (about 40–50 clear lines) | >10,000 characters |
| YAML `tools` | Declared list or inherited defaults | None; informational only |
| YAML frontmatter | At most 50 lines | Review warning above 50 lines |

## Summary

| Agent | Type | Verdict | YAML lines | Description chars | System chars / lines | Tool scope | Missing sections | Broken links | Overlap candidates | Authoring findings |
|---|---|---|---:|---:|---:|---|---|---:|---:|---|
| {{AGENT}} | {{TYPE}} | {{VERDICT}} | {{YAML_LINES}} | {{DESCRIPTION_CHARS}} | {{SYSTEM_SIZE}} | {{TOOLS}} | {{MISSING}} | {{BROKEN}} | {{OVERLAPS}} | {{AUTHORING}} |

## Duplicate and overlap decisions

| Decision | Agents | Usage evidence | Rationale and preservation plan |
|---|---|---|---|
| {{DECISION}} | {{AGENTS}} | {{USAGE}} | {{RATIONALE}} |

## Agent-content security

| Severity | Confidence | Rule | Location | Reachability | Disposition | Fingerprint |
|---|---|---|---|---|---|---|
| {{SEVERITY}} | {{CONFIDENCE}} | {{RULE}} | {{LOCATION}} | {{REACHABILITY}} | {{DISPOSITION}} | {{FINGERPRINT}} |

## Catalog and workflow documentation drift

List missing, stale, or untracked catalog and workflow entries.

## Per-agent findings

### {{AGENT}} — {{VERDICT}}

Path: `{{PATH}}`

### Why this verdict

- {{VERDICT_REASON}}

### Detailed findings

- **[{{SEVERITY}}] {{CODE}}** — {{EXPLANATION}}
  - Affected resource: `{{RESOURCE}}`

### Recommended next actions

1. {{ACTION}}

Do not leave placeholders in a delivered report.
