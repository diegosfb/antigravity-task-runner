# Meeting Evidence with Product Agent

Use recordings, notes, transcripts, research, feedback, metrics, or structured data as optional **Supporting Evidence** for Product Agent. The required input remains the **Product Definition**: an idea, brief, existing product document, or other source that defines the direction to evaluate.

## Input artifacts

| Artifact | Requirement | Purpose |
|---|---|---|
| Product Definition | Required | Establishes the product idea, problem, users, goals, constraints, or existing direction. |
| Supporting Evidence | Optional | Adds recordings, notes, transcripts, research, feedback, metrics, or structured evidence. |

## Evidence preparation

### Recordings

1. Process recordings with `harvesting-meeting-context`.
2. Analyze the transcript with `meeting-insights`.
3. Review attribution, uncertainty, and unsupported conclusions.
4. Pass the reviewed analysis to Product Agent as Supporting Evidence.

### Notes, transcripts, or structured evidence

1. Use `meeting-insights` when synthesis is needed.
2. Preserve disagreements, unknowns, attribution, and evidence limits.
3. Do not treat participant opinions as validated market facts.

## Product Agent output

Product Agent combines the Product Definition and approved Supporting Evidence into `docs/project_description/PRD.md`. The PRD records the problem, target users, measurable goals, market context, candidate capabilities, constraints, assumptions, risks, and evidence behind material claims.

## Handoff

The approved PRD is passed to `ba-agent`. Meeting evidence remains supporting context; it never replaces product approval or BA Agent's responsibility to create testable specifications.
