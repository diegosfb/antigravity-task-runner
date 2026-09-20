# Functional Overlap Analysis

Use this analysis after deterministic similarity checks. Text similarity proposes candidates; it does not decide whether skills are redundant.

## Evidence to collect

For every candidate pair or family, compare:

1. **Trigger intent:** realistic user requests that could select either skill.
2. **Workflow:** decision sequence, tools, external systems, and approval points.
3. **Outputs:** artifacts, schemas, filenames, and quality gates.
4. **Audience and lifecycle phase:** who invokes it and where it sits in the workflow.
5. **Resources:** unique scripts, references, assets, templates, and configuration.
6. **Usage:** agent assignments, workflows, other skills, scripts, and documentation.
7. **Operational contract:** side effects, security boundaries, resume behavior, and external dependencies.

Run usage tracing for every skill being considered for merge, removal, or demotion:

```bash
python3 .agents/skills/skill-auditor/scripts/trace_skill_usage.py <repo-root> <skill-a> <skill-b> --json
```

Distinguish direct agent/workflow assignments from documentation and incidental prose. A skill with no callers may still be explicitly invoked, so absence of references is supporting evidence, not automatic permission to delete it.

## Decision vocabulary

Choose one decision and name the canonical destination when relevant:

- **MERGE:** substantially the same trigger, workflow, and output. Preserve unique resources, update every caller, validate migrated paths, then remove the redundant entry point.
- **KEEP + SHARPEN:** adjacent but distinct responsibilities. Rewrite both discovery descriptions with mutual exclusions and align agent routing.
- **KEEP SPECIALIZED:** shared domain vocabulary but different tool, platform, phase, or artifact. State the specialist boundary and any umbrella/router relationship.
- **DEMOTE:** useful supporting procedure but not independently routable. Move it under a canonical skill as a reference, script, or internal mode.
- **RETIRE:** generic baseline behavior, superseded functionality, or unused capability whose unique value does not justify maintenance.
- **REMOVE DUPLICATE:** byte-identical installation; retain the authoritative copy and remove the duplicate.

## Safe consolidation checklist

Before recommending or performing a merge:

- Trace all callers and distinguish operational references from incidental mentions.
- Inventory unique files on both sides and state where each will move.
- Preserve configuration keys, output schemas, filenames, approvals, and pause/resume contracts.
- Select the canonical name based on established callers and clearest routing, not personal preference.
- Update agent assignments, workflow references, skill-to-skill links, documentation, and catalog entries.
- Re-run structural audit, overlap detection, usage tracing, and meaningful script tests.
- Do not delete a skill merely because it is small; small explicit workflows can still be valuable.

## Reporting standard

For every material overlap family, report:

- skills involved
- actual usage locations
- evidence of shared and unique functionality
- decision and canonical destination
- resources or contracts that must be preserved
- exact routing language when sharpening
- confidence and any telemetry needed before retirement

Separate structural failures from portfolio decisions. A skill can pass every format check and still be redundant, or be uniquely valuable while needing structural repair.
