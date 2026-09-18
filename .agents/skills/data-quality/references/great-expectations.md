# Great Expectations

## When It Fits

Use Great Expectations when the project already operates it or needs reusable expectation suites, validation results, checkpoints, and documentation across heterogeneous data systems.

Avoid adding it solely for simple warehouse assertions already covered by the transformation framework.

## Design

1. Connect the supported data source without embedding credentials.
2. Define data assets and batches that match operational evaluation windows.
3. Group expectations into suites aligned with a dataset or contract boundary.
4. Execute validations through checkpoints or the version-appropriate orchestration interface.
5. Publish only sanitized results and route failures to an accountable owner.

Expectations should include meaningful metadata such as control owner, business rule, criticality, and remediation link when the framework and repository conventions support it.

## Operating Guidance

- Separate deterministic expectations from exploratory profiling.
- Control result verbosity so unexpected values or rows do not leak into logs or notifications.
- Store validation results in an access-controlled location with an intentional retention period.
- Keep credentials in the approved secret mechanism.
- Pin and test upgrades because configuration objects and fluent APIs can change between releases.

## Version Check

Before writing code, inspect the installed package version and current official documentation. Confirm data-source, asset, batch, suite, checkpoint, and result-format APIs instead of copying an unversioned example.
