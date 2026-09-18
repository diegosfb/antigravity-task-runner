# PRD — Template

Output contract for `docs/project_description/PRD.md` — the Product Requirements
Document, the formal interface between product-agent and ba-agent. One PRD per
project, kept living: revise it when production feedback changes the vision.

## Rules before writing

1. **Stay at the WHY level.** The PRD states problems, goals, users, and
   priorities. It does NOT define feature behavior, flows, validations, or
   acceptance criteria — that is ba-agent's spec territory. High-level
   capabilities are fine; specifications are not.
2. **No metric, no goal.** Every goal carries a measurable success metric.
3. **Evidence over opinion.** Claims cite their source: market research,
   benchmark, a reviewed meeting analysis (`meeting-analysis.md`), telemetry, or
   customer discovery. For meeting evidence, preserve its `OBSERVATION`,
   `PARTICIPANT_OPINION`, `TEAM_ASSUMPTION`, or `INTERPRETATION` classification
   and source citation. Never turn an unverified extraction or unavailable
   interview into implied validation.
4. **Fold in production feedback.** On outer-loop cycles, update the PRD and
   mark what changed and why rather than appending contradictions.
5. **Make risk treatment explicit.** Always include `PRD Risk Analysis`. When
   the configured pre-mortem runs, summarize its evidence-backed findings; when
   it does not run, record the disabled or safe-fallback status rather than
   inventing risks.

## Required sections

```markdown
# <Project Name> — PRD

## Problem Statement
What hurts, for whom, and why now. 1–2 paragraphs.

## Goals and Success Metrics
Bulleted. Every goal paired with its measurable success metric and time frame.

## Target Users
Who they are, what they need, and what they do today instead.

## Market and Competitive Landscape
Key competitors/alternatives, feature fit, and the positioning this project takes.

## Strategic Priorities and Differentiation
What matters most, in order, and what makes this offering different.

## High-Level Capabilities
The major capabilities in one line each — WHAT at headline level only.
ba-agent turns these into specs; do not specify behavior here.

## Out of Scope
What this project deliberately does not attempt, to protect focus.

## Evidence and Feedback Sources
Where the claims above come from (research, benchmarks, transcripts, telemetry).
State **Customer discovery status:** performed, not needed, unavailable, or
planned. When performed, cite the sanitized study/debrief, participant segment,
participant count and dates, the behavioral evidence supporting each material
claim, contradictions, and remaining evidence gaps. When unavailable or planned,
name the evidence gap, affected assumption, owner, and follow-up. Do not include
raw recordings, participant identities, or sensitive personal data in the PRD.

## Constraints and Assumptions
Business, budget, timeline, or mandated-stack constraints, and the assumptions
the vision rests on.

## PRD Risk Analysis
Configuration status: enabled, disabled, or safe fallback because the setting
was missing or invalid. If enabled, state: "Imagine it is 14 days after launch.
The product failed. What went wrong?"

Summarize the pre-mortem without copying its workshop transcript:

| Risk | Classification | Urgency | Evidence | Mitigation | Owner | Decision Date |
|---|---|---|---|---|---|---|
| ... | Tiger / Paper Tiger / Elephant | Launch-Blocking / Fast-Follow / Track / N/A | ... | ... | ... | ... |

Every launch-blocking Tiger requires evidence, a concrete mitigation, one
owner, and a decision date. For each Elephant, record whether it was addressed,
reclassified as a Tiger, or consciously accepted with rationale. Paper Tigers
remain visible with the evidence showing why they are unlikely or manageable.
If the gate did not run, replace the table with a plain statement explaining
that status; do not imply that absence of analysis means absence of risk.

## Open Questions
Explicitly empty if none; otherwise each with an owner.
```
