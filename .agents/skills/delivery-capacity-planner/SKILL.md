---
name: delivery-capacity-planner
description: Design and challenge professional-services delivery team composition from project descriptions, staffing demands, or profile lists. Use when asked to validate or optimize role ratios, seniority pyramids, geo distribution, delivery pods, staffing feasibility, or team topology. Distinguish project/team-design requests from pure sourcing lists; for project requests justify role, seniority, and location choices, while for pure profile lists avoid inventing team-design optimization.
metadata:
  version: "1.0.0"
  library: "DSFB Professional Services / local"
  library-url: ""
  pack: "Consulting & Professional Services"
---

# Delivery Capacity Planner

Analyze demand as a delivery architect, not merely as a headcount calculator.

## Intake and mode selection

1. Accept free-form project descriptions and/or tabular files (CSV/XLSX or equivalent).
2. Normalize available fields using `references/input-schema.md`.
3. Classify the request:
   - **TEAM_DESIGN**: project/workstream description or enough context exists to infer a delivery system.
   - **SOURCING_ONLY**: only profiles/roles/quantities are supplied with no project context.
4. State the selected mode and material assumptions.
5. Never fabricate missing client constraints, rates, bench availability, or hiring performance.

## TEAM_DESIGN workflow

1. Identify work type, lifecycle stage, architecture, critical skills, delivery model, timezone/language constraints, expected scale, and risk.
2. Convert aggregate demand into delivery units/pods where useful.
3. Validate role composition against `references/team-archetypes.md`; treat benchmarks as starting ranges, never universal truth.
4. Validate seniority mix against `references/seniority-guidance.md`. Check supervision capacity, technical leadership, knowledge concentration, and cost/quality balance.
5. Validate geo distribution against `references/geo-framework.md`. Optimize first for feasibility and delivery quality, not labor arbitrage. Explain every recommended location change.
6. Identify missing roles, duplicated roles, bottlenecks, single points of failure, over-management, excessive QA dependence, insufficient product/BA capacity, or weak platform/DevOps coverage.
7. Produce requested vs recommended scenarios when the input contains an explicit proposed team.
8. Separate hard constraints from recommendations.

## SOURCING_ONLY workflow

Do not optimize geo, seniority, role ratios, or team topology without project context. Preserve the requested profiles and hand off normalized demand to recruiting planning. Flag only structural data-quality issues such as impossible dates, duplicate rows, missing quantity, or contradictory fields.

## Required outputs

Produce:

### Executive assessment
- Overall feasibility: Green / Amber / Red
- Requested headcount and recommended headcount, if applicable
- 3-7 highest-value changes
- Major assumptions and constraints

### Team composition table
Include role/profile, quantity, seniority, geo, delivery unit/pod, rationale, and whether each row is Requested / Changed / Added.

### Composition diagnostics
- FE:BE/full-stack balance
- QA/SDET coverage and automation expectations
- BA/product coverage
- PM/DM/Scrum/leadership span
- Architecture/platform/DevOps/SRE coverage
- Seniority pyramid and supervision ratios
- Specialist/shared-service dependencies

### Geo assessment
For TEAM_DESIGN only, explain timezone overlap, collaboration model, talent feasibility, language/client proximity, concentration risk, and operational resilience. Do not claim exact talent supply or cost without data.

### Risks and assumptions
Label each important conclusion as data-backed, benchmark-based, or inferred.

### Recruiting handoff
Return a normalized demand table suitable for the `recruiting-capacity-planner`, including role, skill, seniority, geo, quantity, requested start, flexibility, mandatory constraints, and priority.

## Rules

- Do not force a benchmark when project context clearly calls for a different shape.
- Prefer cross-functional teams with clear ownership over arbitrary functional ratios.
- Distinguish shared roles from dedicated roles when calculating ratios.
- Treat start date as productive-capacity date unless the input explicitly defines it differently.
- If critical information is missing, make the smallest reasonable assumptions and expose them; ask questions only when the missing information would materially change the recommendation.
