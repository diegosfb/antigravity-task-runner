# VTU Estimator Execution Standard v1.1

This file is the process-level source of truth for `vtu-estimator`.

Use it to keep runs deterministic when multiple valid interpretations are possible.
Numeric catalog data must still come from `offerings.md`, `artifacts.md`, `experts.md`, and `pricing.md`.

---

## Source-of-Truth Order

1. `offerings.md` for offering names and capability coverage
2. `artifacts.md` for artifact keys, base VTUs, validators, allocation percentages, and tokens/unit
3. `experts.md` for expert capacities and monthly rates
4. `pricing.md` for C x R x E tables, AI validation levels, and commercial multipliers
5. `execution-standard.md` for execution order, tie-breakers, active-window rules, and deterministic option transforms

If process instructions conflict, follow this file. If numeric values conflict, follow the catalog file that owns that value.

---

## Canonical Run Order

Run the workflow in this exact order:

1. Parse the SOW and record all explicit scope, timeline, and constraint signals.
2. Select the minimum offering set that covers the in-scope artifact work.
3. Derive artifact counts using only catalog artifact keys.
4. Stop for Gate 1 confirmation.
5. Classify Complexity, Risk, and Environment.
6. Stop for Gate 2 confirmation.
7. Calculate VTU demand by artifact and expert.
8. Convert VTUs to expert-months.
9. Build the month-by-month active-window schedule.
10. Round FTE to 0.5 increments.
11. Run optimization.
12. Recalculate schedule, utilization, and pricing inputs after every optimization change.
13. Price the four options.
14. Compose the proposal.

No later step may change earlier calculations without rerunning every dependent step.

---

## Catalog Discipline

- Use only artifact keys that exist in `artifacts.md`.
- Use only validator and allocation pairs that exist for that exact artifact key.
- Do not invent artifact aliases, expert keys, or AI validation labels.
- Allowed AI validation levels are exactly: `none`, `pre_screening`, `operational`.
- Budget hints may shape the recommendation narrative only after all option prices are calculated.
- Budget hints must never change artifact counts, C x R x E values, AI validation level, pricing multipliers, or formulas.

---

## Gate Discipline

### Gate 1 must confirm

- Engagement type
- Selected offering set
- Explicit out-of-scope items
- Duration assumption
- Budget interpretation

### Gate 2 must confirm

- Artifact counts and derivations
- C x R x E values and reasoning
- Open assumptions that materially affect counts
- Which artifact families are reducible for the Lean option

If the user gives a general approval while any required assumption is still unresolved, restate the unresolved assumption and do not proceed.

---

## Active-Window and Sustainability Rules

### Phase Mapping

- Use the client's named phases when the SOW provides them.
- For open-ended engagements without explicit phase timing, use the full option duration as the active window unless the SOW describes a ramp-up or ramp-down.
- If the SOW has no usable phase timing, apply these default windows:
  - Discovery and foundation artifacts: first 35% of the duration
  - Build and delivery artifacts: middle 50% of the duration
  - Validation and reporting artifacts: final 40% of the duration
- Windows may overlap. Map each artifact to the earliest relevant window that matches the work.

### Active Months

- `active_months_for_expert` = number of months in which that expert has assigned artifact work after optimization
- If an expert is time-boxed, their talent cost uses only those active months
- Platform fee never time-boxes; it always uses the full option duration

### Scheduled FTE

- `scheduled_fte = ceil_to_0.5(expert_months / active_months_for_expert)`
- `ceil_to_0.5` means always round up to the next 0.5 increment
- Examples: `0.01 -> 0.5`, `0.50 -> 0.5`, `0.51 -> 1.0`, `1.26 -> 1.5`

### Utilization

- `utilization = expert_months / (scheduled_fte x active_months_for_expert)`
- If an expert works across separate windows, evaluate each window and use the highest-utilization window for the sustainability status

---

## Optimization Rules

- Allocation shifting is allowed only between experts who both validate the same artifact key in `artifacts.md`.
- Expert substitution is allowed only when the lower-cost expert is already listed on that same artifact key.
- Micro-absorption is allowed only by time-boxing an expert or moving work to another listed validator on the same artifact key.
- Do not move work between unrelated capabilities just because the rate is lower.

---

## Deterministic Pricing Options

### Robust

- Use the exact scope and duration confirmed at Gate 2.

### Lean

- Keep the same duration as Robust.
- `protected_foundation_artifacts` are:
  - `prd_output`
  - `master_test_plan`
  - `test_strategy`
  - `target_architecture_foundation`
  - `knowledge_graph`
  - `domain_boundaries`
- Every other artifact with count greater than 1 is reducible unless the user explicitly marks it as fixed at Gate 2.
- Reduce reducible artifact counts by 30%.
- Round reduced counts to the nearest whole unit with `.5` rounded up.
- Never reduce a retained artifact below 1.
- If no reducible artifacts exist, Lean matches Robust and must say so explicitly.

### Accelerated

- Keep the Robust artifact scope.
- `accelerated_duration_months = round_half_up(original_duration_months x 0.75)`
- Minimum duration is 1 month.
- Rebuild active windows proportionally, then rerun FTE, utilization, and pricing.

### Budget-Optimized

- Keep the Robust artifact scope.
- `budget_duration_months = round_half_up(original_duration_months x 1.25)`
- Rebuild active windows proportionally, then rerun FTE, utilization, and pricing.

### Rounding Rule

- `round_half_up` means `.5` always rounds up.
- Examples: `4.5 -> 5`, `7.5 -> 8`

---

## Output Discipline

- Outside Appendix A, use client-facing role titles rather than internal expert keys.
- Show the AI validation level using the exact catalog label.
- If a sample or proposal predates this standard, label it as a legacy v1.0.0 artifact.
- Legacy examples may be kept for history, but they must not be treated as normative pricing benchmarks.
