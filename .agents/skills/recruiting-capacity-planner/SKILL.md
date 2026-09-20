---
name: recruiting-capacity-planner
description: Plan staffing fulfillment for professional-services demand using supplied demand and optional bench/capacity files. Use when asked to match demand to existing bench, calculate recruiting gaps, create recruiting campaigns, estimate sourcing and productive-capacity timelines, model hiring funnels, identify staffing risk, or evaluate sourcing channels/agencies. If no bench file is supplied, assume all demand requires recruiting and state that assumption.
metadata:
  version: "1.0.0"
  library: "DSFB Professional Services / local"
  library-url: ""
  pack: "Consulting & Professional Services"
---

# Recruiting Capacity Planner

Turn normalized demand into an executable fulfillment plan.

## Inputs

Accept free-form demand and tabular demand files. Accept an optional bench/capacity file. Normalize using `references/schemas.md`.

If no bench/capacity file is provided, set available internal supply to zero and explicitly state: **All demand assumed to require recruiting.**

## Workflow

1. Normalize demand by role, skill, seniority, geo, quantity, requested productive start, flexibility, and priority.
2. If bench is provided, match internal candidates first using `references/bench-matching.md`.
3. Do not count one person against multiple simultaneous demands. Respect availability date and allocation.
4. Calculate residual recruiting demand after credible bench matches.
5. Group residual demand into recruiting campaigns by skill family, seniority, geo, start window, and interview process when grouping improves execution.
6. Estimate funnel and timeline using `references/recruiting-benchmarks.md`. Benchmarks are configurable defaults, not company facts.
7. Model dates backward from the requested productive start and forward from today. Include sourcing, screening, interviews, offer, acceptance, notice period, onboarding, and ramp-to-productivity.
8. Show expected, optimistic, and conservative timing for material campaigns.
9. Flag impossible or high-risk ramps and recommend levers: geo flexibility, seniority flexibility, phased starts, internal redeployment, contractor/partner capacity, agency support, parallel campaigns, or demand reshaping.
10. Evaluate agencies/channels only when performance data is supplied; otherwise provide a measurement framework, not invented rankings.

## Required outputs

### Executive staffing view
- Total demand
- Bench matched
- Recruiting gap
- Expected fill by requested date
- At-risk positions
- Earliest credible full-capacity date

### Bench match table
Demand ID, candidate/resource ID, match strength, skill fit, seniority fit, geo/timezone fit, availability, allocation, gaps, recommendation. Avoid sensitive personal attributes.

### Recruiting campaign plan
Campaign ID, role/skill family, seniority, geo, openings, target productive date, sourcing start, expected hires/week, funnel assumptions, channels, owner placeholder, risk, mitigation.

### Capacity ramp
Show cumulative productive headcount by week or month, not just offer acceptances.

### Funnel
For each campaign show required accepted offers, offers, final interviews, screened candidates, sourced prospects, and conversion assumptions.

### Risk register
Include scarce skills, compressed timelines, notice periods, interview bottlenecks, simultaneous onboarding load, geo constraints, and dependency on unvalidated assumptions.

## Agency/channel evaluation

When actual data is supplied, compare sources on qualified-submission rate, interview conversion, offer conversion, acceptance, time-to-submit, time-to-fill, 30/90-day retention where available, cost per hire, hard-skill coverage, geo coverage, duplicate rate, and candidate quality. Normalize for role difficulty before declaring one source better.

## Rules

- Distinguish `filled`, `offer accepted`, `started`, and `productive`.
- Never imply benchmark recruiting assumptions are observed company performance.
- Prefer internal supply when fit is credible, but do not force weak bench matches merely to avoid recruiting.
- Treat partial allocation explicitly.
- Preserve mandatory constraints from the demand plan.
- If requested start is earlier than realistic, quantify the likely ramp rather than simply labeling it impossible.
