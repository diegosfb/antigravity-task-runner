# Soda

## When It Fits

Use Soda when the project already uses SodaCL or needs declarative checks that can run close to a supported data source. Prefer existing transformation-framework tests when they provide equivalent coverage with less operational overhead.

## Check Design

Organize checks by dataset and evaluation window. Common categories include:

- Row counts and freshness
- Missing or duplicate values
- Valid ranges and allowed domains
- Referential or reconciliation checks
- Distribution and change-over-time checks

Give each check a clear owner, threshold rationale, severity, and remediation path. Use variables or environment-specific configuration for dates and partitions rather than hardcoded production assumptions.

## Safe Operation

- Keep connection credentials in the approved environment or secret manager, never in committed configuration.
- Review samples and diagnostics before enabling them; unexpected values may contain sensitive data.
- Send aggregate status, counts, identifiers, and restricted links in notifications.
- Treat change or anomaly checks as signals until the behavior has been validated.

## Version Check

Confirm supported SodaCL syntax, data-source configuration, scan commands, and result behavior against the installed Soda product and current official documentation. Cloud and open-source capabilities may differ.

## Verification

Run the smallest relevant scan against non-production or approved test data, inspect sanitized results, and confirm that exit behavior matches the intended blocking policy.
