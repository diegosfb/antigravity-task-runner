# {{TITLE}} — {{DATE}}

**{{TOTAL}} skill(s) audited — {{PASSING}} passing, {{WARNINGS}} with warnings, {{FAILING}} failing.**

## Portfolio assessment

### Duplicate and overlap decisions

For each material pair or family, state **MERGE**, **KEEP + SHARPEN**, **KEEP SPECIALIZED**, **DEMOTE**, **RETIRE**, or **REMOVE DUPLICATE**. Include usage evidence, canonical destination, unique resources to preserve, and proposed routing language.

### Retirement or demotion candidates

List candidates in priority order. Explain why baseline behavior or another skill supersedes them, identify current callers, and state what evidence or telemetry should be checked before removal.

### Inventory and metadata findings

Summarize catalog drift, untracked or incomplete skills, provenance/version issues, broken resources, and other portfolio-level maintenance risks.

### Recommended sequence

Order work by dependency and risk: repair broken contracts first, consolidate safely, sharpen remaining boundaries, synchronize the catalog, then evaluate retirement with usage evidence.

## Summary

| Skill | Verdict | Desc chars | SKILL.md lines | Broken refs | Orphans |
|---|---|---:|---:|---:|---:|
| {{SKILL}} | {{VERDICT}} | {{DESCRIPTION_CHARS}} | {{SKILL_LINES}} | {{BROKEN_REFS}} | {{ORPHANS}} |

## Overlap analysis

| Decision | Skills | Description similarity | Body similarity | Actual usage | Rationale and preservation plan |
|---|---|---:|---:|---|---|
| {{DECISION}} | {{SKILL_FAMILY}} | {{DESCRIPTION_SIMILARITY}} | {{BODY_SIMILARITY}} | {{USAGE_SUMMARY}} | {{RATIONALE}} |

## Usage evidence

| Skill | Category | Location | Context |
|---|---|---|---|
| {{SKILL}} | {{AGENT_WORKFLOW_SKILL_OR_DOC}} | `{{PATH}}:{{LINE}}` | {{REFERENCE_CONTEXT}} |

## Agent-content security

| Severity | Confidence | Rule | Location | Reachability | Disposition | Fingerprint |
|---|---|---|---|---|---|---|
| {{SEVERITY}} | {{CONFIDENCE}} | {{RULE}} | {{LOCATION}} | {{REACHABILITY}} | {{DISPOSITION}} | {{FINGERPRINT}} |

## Per-skill findings

### {{SKILL}} — {{VERDICT}}

- **Path:** `{{PATH}}`
- **Purpose and routing:** {{PURPOSE_AND_BOUNDARY}}
- **Guideline compliance:** {{COMPLIANCE_FINDINGS}}
- **Tools and execution:** {{TOOL_FINDINGS}}
- **References and assets:** {{RESOURCE_FINDINGS}}
- **Usage:** {{USAGE_LOCATIONS}}
- **Recommended next actions:** {{ORDERED_ACTIONS}}

Do not leave placeholders or TODO markers in a delivered report. Collapse fully passing skills with no material opportunity to a concise one-line finding.
