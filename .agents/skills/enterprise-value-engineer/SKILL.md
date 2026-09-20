---
name: enterprise-value-engineer
description: Translate software initiatives, PRDs, workflows, and features into conservative annualized financial impact across Revenue, Efficiency, Risk, and Retention. Use for ROI analysis, business cases, investment approval, and executive value narratives; do not use for engineering effort, delivery timelines, staffing, or build-cost estimation.
metadata:
  version: "1.0.0"
  library: "DSFB Professional Services"
  library-url: ""
  pack: "Consulting & Professional Services"
---

# Enterprise Value Engineer

Turn proposed software outcomes into a traceable Business Impact Report. Use client baselines first, show the math, state every assumption, and keep quantified impact separate from strategic benefits.

## Inputs

Collect or infer three blocks: business goals, proposed artifacts/features, and client baselines. When material baselines are missing, read [the input schema](references/input-schema.md), ask only questions that could materially change the result, then continue with clearly labeled conservative assumptions if the user cannot provide them.

## Workflow

1. Read [value-lever mapping](references/value-lever-mapping.md). Assign each artifact exactly one primary lever: Revenue, Efficiency, Risk, or Retention. Note secondary effects without double counting.
2. Read [financial formulas](references/financial-formulas.md). Calculate annualized impact with visible inputs and units. Use ranges when uncertainty is material; do not manufacture precision.
3. Assign overall confidence: `High` for strong baselines and direct causality, `Medium` for partial baselines or moderate assumptions, and `Low` for several missing inputs or weak causality.
4. Read [the output template](references/output-template.md) and produce the report. Read [the worked example](references/example-report.md) only when an example would clarify the requested analysis.
5. Validate that totals do not overlap, all claims are traceable, assumptions are explicit, and the five-year projection distinguishes revenue impact from operating-cost reduction.

Write `business-impact-report.md` only when the user requests a file or the invoking workflow requires that artifact. Otherwise return the report in the conversation. Honor any user-specified output path.

## Boundaries

- Never estimate engineering hours, sprint length, staffing, implementation timeline, vendor cost, or build cost. Route those to the appropriate estimation capability.
- Treat “effort” only as relative business-change complexity: workflows, roles, processes, systems, and coordination affected.
- Do not count the same outcome under multiple value levers. Separate revenue from retained revenue and gross savings from realistically realizable savings.
- Do not imply that avoided risk, forecast revenue, or labor capacity automatically becomes booked cash. State realization conditions.
- Current market benchmarks, legal exposure, tax effects, valuations, and investment conclusions require verified sources and, where applicable, qualified professionals.

The canonical source is `dsfb-professional-services/skills/enterprise-value-engineer`. Discovery metadata is in [agents/openai.yaml](agents/openai.yaml).
