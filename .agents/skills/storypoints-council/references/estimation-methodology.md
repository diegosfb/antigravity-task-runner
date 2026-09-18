# Story Points Normalization Methodology

Estimate **relative intrinsic task complexity**, not elapsed time or current implementation speed. Treat historical estimates as the project's calibration dataset and preserve their scale throughout the project.

Use only Fibonacci values: **1, 2, 3, 5, 8, 13, 21**. Evaluate scope, technical complexity, uncertainty, dependencies, coordination, integration surface, testing burden, and inherent risk. Never reduce points because of AI tooling, automation, familiarity, velocity, assignee skill, or faster implementation. Genuine structural simplification may reduce points.

## Workflow

1. Inspect readable historical records and extract only explicit task IDs, descriptions, context, and story points. Never invent missing values.
2. Identify representative anchors and actual boundaries between populated point buckets. Treat contradictions and temporal drift as noisy evidence.
3. Analyze the new task on the same intrinsic-complexity dimensions, independent of productivity.
4. Select up to three genuine historical analogs using semantic and structural similarity.
5. Ask what the team would have assigned this exact task using the same historical ruler. Choose one allowed Fibonacci value, not an average.
6. Assign confidence from evidence quality, task detail, and council convergence. No analogs requires Low confidence.
7. Confirm that tools, familiarity, timing, and current productivity did not deflate the estimate.

## Required output

```text
Story Points: <1|2|3|5|8|13|21>
Confidence: <High|Medium|Low>
Closest historical analogs: <TASK-ID (points), TASK-ID (points), TASK-ID (points)>
Rationale: <concise explanation grounded in historical calibration, decisive similarities/differences, and important uncertainty>
```

List fewer analogs when fewer exist. Use `None` and Low confidence when none exist. Keep the rationale concise and auditable. Never expose hidden chain-of-thought.
