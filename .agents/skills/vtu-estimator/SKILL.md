---
name: vtu-estimator
description: Convert a client SOW or defined delivery scope into a gated Value Throughput Unit (VTU) AI Pod subscription proposal with offering mapping, artifact demand, expert capacity, scheduling, pricing options, a client proposal, and a private internal appendix. Use only for AI Pod/VTU capacity and subscription pricing; do not use for ordinary engineering estimates, story points, cloud consumption, or software business-value ROI.
metadata:
  version: "1.1.0"
  library: "DSFB Professional Services"
  library-url: ""
  pack: "Consulting & Professional Services"
---

# VTU Estimator

Translate scoped delivery outcomes into an AI Pod subscription using only the versioned local catalogs. Keep client-facing value and roadmap content separate from internal rates, expert keys, VTUs, utilization, margins, and pricing mechanics.

## Workflow

1. Read the SOW and [offerings](references/offerings.md). Classify fixed-scope versus open-ended capacity, map deliverables to the minimum covering offerings, flag unsupported work, and state duration, budget interpretation, boundaries, and assumptions.
2. **Gate 1:** obtain confirmation of offering selection, unsupported work, duration, and material scope assumptions before artifact sizing.
3. Read [artifacts](references/artifacts.md), [pricing](references/pricing.md), and [execution standard](references/execution-standard.md). Derive exact catalog artifact keys and counts from SOW evidence; classify Complexity × Risk × Environment; identify Lean reduction candidates.
4. **Gate 2:** obtain confirmation of artifact counts, derivations, C×R×E values, and Lean candidates before calculation.
5. Read [experts](references/experts.md). Calculate VTU demand by validator, effective capacity, expert-months, active windows, team size rounded up to 0.5 FTE, peak-window utilization, and optimized allocation. Never invent catalog entries.
6. Write normalized calculation inputs using [the example schema](assets/calculation-input.example.json) and run `python3 scripts/calculate_vtu.py <input.json> --output <result.json>`. The script verifies arithmetic; it does not decide scope, catalog mappings, scheduling, or optimization.
7. Produce Robust, Lean, Accelerated, and Budget-Optimized options using the exact transforms in the execution standard. A budget hint affects recommendation, never formula inputs or AI validation level.
8. Compose separate files from [client proposal](assets/client-proposal-template.md) and [internal appendix](assets/internal-appendix-template.md). Use user-designated paths or a clearly identified output directory.

## Invariants

- Catalog precedence: numeric data comes from offerings/artifacts/experts/pricing; process and tie-breakers come from execution-standard.
- Default AI validation is `none`; higher levels require the catalog’s evidence.
- Use VTU demand ÷ effective capacity, never artifact count ÷ throughput.
- Price time-boxed experts for active months; platform fee uses unique expert types and full option duration.
- Run sustainability against peak active windows and complete optimization before pricing.
- Client output must never contain internal expert keys, rates, VTUs, utilization, margin, or Appendix A.
- Internal output must be clearly marked confidential and must not be sent externally without explicit authorization.
- Do not silently weaken scope or alter catalog values to reach a budget.
- This skill estimates AI Pod subscription capacity and price, not engineering hours, staffing forecasts, story points, cloud bills, or initiative ROI.

The canonical source is `dsfb-professional-services/skills/vtu-estimator`. Discovery metadata is in [agents/openai.yaml](agents/openai.yaml).
