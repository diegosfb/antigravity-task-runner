# dbt Testing

## Select the Test Form

- Generic data tests: reusable assertions attached to models, sources, columns, or other resources.
- Singular data tests: project-specific SQL queries whose returned rows represent failures.
- Unit tests: isolated transformation logic checks when supported by the installed dbt version and adapter.
- Source freshness: arrival recency checks for declared sources.

Use built-in generic tests such as `not_null`, `unique`, `accepted_values`, and `relationships` where they express the contract clearly. Add custom generic tests for repeated domain rules and singular tests for one-off cross-row or cross-model conditions.

## Placement and Severity

Place checks near the earliest trustworthy boundary:

- Sources: freshness, required fields, source keys, and basic domain rules
- Staging: type normalization, deduplication, and source-specific validity
- Intermediate models: transformation invariants and reconciliation
- Marts: business grain, dimensional integrity, and consumer-facing rules

Choose warnings versus errors from impact and recovery behavior. Do not make a noisy historical monitor block production without an explicit decision.

## Failure Evidence

If retaining failures is enabled, confirm that stored rows cannot expose sensitive values and that access, location, and retention are appropriate. Prefer restricted relations containing identifiers and reason codes over full source records.

## Implementation Notes

- Reuse project macros and conventions before introducing new abstractions.
- Keep tests deterministic; isolate time-dependent behavior behind explicit evaluation windows.
- Document accepted exclusions rather than hiding them in opaque SQL.
- Test at the actual model grain.
- Validate YAML property names, test argument syntax, and unit-test support against the installed dbt version and adapter documentation.

## Verification

Run the narrowest selected tests during iteration, then the repository's required build and test gates before handoff. Report skipped tests and unavailable dependencies.
