# Observability and Anomalies

## What to Observe

Monitor signals that complement known-rule tests:

- Arrival time and processing latency
- Record and partition volume
- Schema changes
- Null, distinct, duplicate, and invalid-value rates
- Numeric and categorical distributions
- Cross-system reconciliation
- Lineage-aware downstream impact

## Baselines

Build baselines from representative history and segment them where behavior differs by weekday, season, tenant, region, source, or product. Exclude known incidents and explain planned structural changes.

A useful signal has a stable definition, an accountable owner, and a response that can distinguish legitimate change from a defect.

## Validate Before Acting

An anomaly is a prompt for investigation, not a conclusion. Validate:

1. Monitor execution and telemetry integrity
2. Expected deployments, campaigns, holidays, and source changes
3. Upstream arrival and schema behavior
4. Affected partitions, consumers, and lineage
5. Reproduction through an independent query or metric

Only escalate severity or trigger containment when evidence supports the impact.

## Calibration

- Begin observationally and measure false-positive and missed-incident rates.
- Tune evaluation windows, segmentation, seasonality, and minimum sample sizes.
- Combine related signals when a single metric is ambiguous.
- Record accepted changes so the baseline can adapt intentionally.
- Review monitors that never fire or never lead to action.

## Tooling

Use the repository's existing observability platform where possible. Verify current product capabilities, integration methods, authentication, and API syntax against installed versions and official documentation before implementation.
