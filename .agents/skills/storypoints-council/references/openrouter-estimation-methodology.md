# Story Points Normalization Methodology

Estimate **relative intrinsic task complexity**, not elapsed time or current implementation speed. Treat historical estimates as the project's calibration dataset and preserve their scale throughout the project.

## Core principle

Hold the estimation ruler stable. Do not lower points merely because the team knows the codebase better, learned the domain, has better libraries, automated repetitive work, or uses AI tooling. Do not raise points merely because the current assignee is unfamiliar or slower.

Story points represent the project's historically calibrated combination of:
- scope / amount of change
- technical complexity
- uncertainty and unknowns
- dependencies and coordination inherent to the task
- integration surface / blast radius
- testing and validation burden
- technical and delivery risk inherent to the change

Use only Fibonacci values: **1, 2, 3, 5, 8, 13, 21**.

## Workflow

1. **Ingest historical evidence.** Inspect relevant readable files. Support mixed formats where practical, including Markdown, text, CSV/TSV, JSON, spreadsheets, Jira exports, and similar task records. Extract task ID/key, title, description/acceptance criteria, historical story points, and technical context where available. Ignore records without usable historical points for calibration. Never infer a historical point value that is not present.

2. **Build historical calibration.** Group valid tasks by point value. Identify representative anchors for each populated bucket, favoring typical examples over outliers. Infer actual project boundaries between adjacent buckets from examples rather than generic definitions. Look for components touched, novelty, integrations, migrations, schema impact, external dependencies, testing burden, edge cases, reversibility, and risk. Treat inconsistent estimates as noisy evidence and prefer dominant patterns across comparable tasks.

3. **Analyze independently of productivity.** Decompose the new task along the same complexity dimensions. Explicitly neutralize productivity drift. Do not use expected hours, velocity, AI-generated code, developer familiarity, improved tooling, reusable automation, or team proficiency as reasons to reduce points. Do account for genuine structural simplification when scope, uncertainty, integration, testing, or risk objectively disappears.

4. **Find historical analogs.** Compare the task against the full historical set using semantic and structural similarity, not keyword overlap alone. Select up to three useful analogs, preferably illuminating the boundary around the candidate estimate. Never fabricate IDs, descriptions, or points.

5. **Normalize to the historical ruler.** Ask: "Had this exact task, with its intrinsic scope and uncertainty, appeared when these historical tasks were estimated, what points would the team have assigned using that same ruler?" Compare anchors below and above the candidate. Choose only an allowed Fibonacci value; never output averages such as 4 or 6. Prefer the lower adjacent bucket only when materially no more complex than its anchors; otherwise use the higher bucket.

6. **Assign confidence.** High: several close analogs agree, task detail is sufficient, and boundaries are clear. Medium: useful but imperfect/sparse/inconsistent analogs or moderate ambiguity. Low: few/no comparables, missing important detail, strong historical inconsistency, or substantial novel uncertainty. Still provide the best Fibonacci estimate.

7. **Run a drift check.** Verify the estimate was not reduced because implementation is faster. Verify AI/tooling/familiarity did not influence intrinsic-complexity comparison. Verify the same analogs would lead to the same estimate regardless of project timing. If architecture change affects points, verify it truly removed complexity rather than merely making execution easier.

## Historical data quality rules

- If similar tasks have contradictory estimates, identify the dominant calibration and lower confidence.
- If estimates show temporal drift, calibrate primarily to stable cross-project anchors rather than blindly reproducing recent values; mention important inconsistency in the rationale.
- Never silently recalibrate from recent velocity.
- Never derive story points from hours, days, sprint capacity, developer count, or throughput ratios.
- Never convert a faster implementation forecast into fewer points.
- Do not estimate business priority or value; story points are complexity, not priority.

## Required output

Return exactly these four fields in this order:

```text
Story Points: <1|2|3|5|8|13|21>
Confidence: <High|Medium|Low>
Closest historical analogs: <TASK-ID (points), TASK-ID (points), TASK-ID (points)>
Rationale: <concise explanation grounded in historical calibration, decisive similarities/differences, and important uncertainty>
```

If fewer than three usable analogs exist, list only genuine ones. If none exist, write `Closest historical analogs: None` and set confidence to Low. Keep rationale concise but auditable and explain why the task belongs in this bucket relative to historical examples, not how long it will take.

## Example behavior

If a historical 5-point task required changes across an API, persistence layer, and regression suite, and a new task has essentially the same structural footprint, keep it near 5 even if AI can now generate much of the implementation. If a later platform abstraction genuinely eliminates the persistence change and most regression surface, fewer points may be appropriate because the task itself became structurally simpler.
