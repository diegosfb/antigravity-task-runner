---
name: development-estimation
description: Estimate software delivery time, effort, staffing, or complexity with explicit scope, assumptions, risk, confidence ranges, and optional three-point PERT man-hour breakdowns. Use for feature or project estimation; use system-requirements-estimation for QPS, storage, bandwidth, and infrastructure-capacity calculations, and storypoints-council for historically calibrated Fibonacci story points.
metadata:
  version: "2.0.0"
  library: "Local / source not recorded"
  library-url: ""
  pack: "Consulting & Professional Services"
---

# Development Estimation

Produce defensible estimates whose precision matches the available evidence. Never hide uncertainty behind a single number.

## Boundaries

- Use this skill for delivery effort, duration, staffing, cost inputs, or qualitative complexity.
- Use `storypoints-council` in `local-cli` or `openrouter` mode for project-relative Fibonacci sizing calibrated against historical tickets.
- Use `system-requirements-estimation` for runtime capacity such as QPS, storage, bandwidth, or latency.
- Do not treat story points as hours or convert between them mechanically.

## Select an output mode

| Mode | Use when | Output |
|---|---|---|
| Rough range | Scope is early or the user wants a quick directional answer | Low/expected/high range, assumptions, confidence, key risks |
| Structured estimate | A feature or project needs decomposition | Work breakdown, dependencies, risks, confidence interval |
| PERT / man-hours | Staffing or resource forecasting needs role-level effort | Optimistic/most-likely/pessimistic hours, PERT expected value, contingency |
| Staffing and schedule | Team composition or elapsed duration matters | Role profile, effort by role, parallelism constraints, calendar range |
| Clarification preflight | Material ambiguity could change an estimate or council calibration | Prioritized questions artifact or an explicit empty-question result |

## Workflow

1. Establish the deliverable, boundaries, quality bar, codebase state, technology constraints, integrations, dependencies, and target estimation mode.
2. Inspect available project evidence before asking for facts that can be discovered locally.
3. If unanswered scope, dependency, integration, migration, testing, compatibility, or risk questions could materially change the estimate, run the clarification preflight.
4. Decompose large work along independently estimable delivery boundaries. Identify sequencing and work that can actually proceed in parallel.
5. Estimate using the selected mode. For PERT, calculate each item as `(O + 4M + P) / 6`; keep assumptions and contingency separate.
6. Add validation, documentation, coordination, operational readiness, and migration work when required by the stated quality bar. Do not add fixed overhead percentages without project evidence.
7. Present assumptions, exclusions, risks, confidence, and concrete re-estimation triggers.

## References

Load only the reference required by the selected mode:

- [estimate.md](references/estimate.md) — structured estimation and confidence workflow.
- [man-hour-estimation.md](references/man-hour-estimation.md) — PERT, role profiles, staffing, contingency, and detailed output format.
- [clarification-preflight.md](references/clarification-preflight.md) — local ambiguity analysis used directly or by either story-points council.
- [clarification-output-schema.md](references/clarification-output-schema.md) — JSON contract for clarification artifacts.

## Clarification helper

The helper preserves the existing story-points council artifact contract:

```bash
python .agents/skills/development-estimation/scripts/write_clarifications.py \
  --task NEW-006 \
  --questions-file /tmp/new-006-questions.json
```

It writes `<TASK-ID>_clarification-questions_<YYYYMMDDTHHMMSSZ>.json` under the `OUTPUT_FOLDER` configured by the selected council. Pass `--config` when the council uses a non-default configuration file. An empty `questions` list is valid and means estimation may continue without pausing.

## Quality rules

- Use low/expected/high ranges; avoid false precision.
- State every assumption that could materially affect the result.
- Separate engineering effort from elapsed calendar duration.
- Explain team composition and parallelism when providing a schedule.
- Include confidence and identify what evidence would improve it.
- Re-estimate when a named trigger changes rather than silently stretching the range.
- Treat benchmark tables as sanity checks, not universal facts.
