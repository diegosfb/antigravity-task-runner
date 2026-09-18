---
name: data-quality
description: Design and implement production data-quality controls, tests, anomaly detection, service objectives, alerting, and incident response. Use when defining quality expectations, adding dbt, Great Expectations, or Soda checks, monitoring freshness or distributions, triaging data incidents, or deciding which controls should block a pipeline.
version: 1.1.0
---

# Data Quality

Build quality controls that are explicit, proportionate to business impact, safe for sensitive data, and actionable when they fail.

## Scope

This skill owns executable quality expectations, monitoring, alerting, and quality-incident response.

Route ownership, stewardship, classification, retention, access policy, and enterprise data-contract governance to `../data-governance/SKILL.md`. Translate approved contracts into enforceable checks here.

## Required Context

Before recommending or implementing controls, establish:

- Dataset, pipeline, and accountable owner
- Downstream consumers and business impact of failure
- Known validity, completeness, uniqueness, freshness, volume, and distribution expectations
- Execution layers and available testing or observability tools
- Data sensitivity and restrictions on logs, alerts, and retained failure samples
- Recovery options, including replay or backfill constraints

If context is incomplete, state assumptions and begin with reversible, observational controls.

## Reference Routing

Load only the references needed for the task:

- Quality dimensions, criticality, and control design: [quality-model.md](references/quality-model.md)
- dbt generic, singular, and source tests: [dbt-testing.md](references/dbt-testing.md)
- Great Expectations design and operating guidance: [great-expectations.md](references/great-expectations.md)
- SodaCL checks and operating guidance: [soda.md](references/soda.md)
- Baselines, drift, seasonality, and anomaly validation: [observability-and-anomalies.md](references/observability-and-anomalies.md)
- Service objectives, blocking policy, and safe alerts: [slos-and-alerting.md](references/slos-and-alerting.md)
- Triage, containment, recovery, and prevention: [incident-response.md](references/incident-response.md)

## Workflow

1. Identify critical data products, consumers, owners, and failure impact.
2. Convert business expectations and approved contracts into measurable controls.
3. Place each control at the earliest reliable layer and classify it as blocking or observational.
4. Implement the smallest appropriate checks using the repository's existing framework.
5. Calibrate thresholds against business requirements and representative history.
6. Route failures to an accountable owner with safe, actionable evidence.
7. Exercise triage and recovery, then refine controls from incidents and false positives.

## Guardrails

- Never place raw failing rows, secrets, credentials, or sensitive values in logs, alerts, chat messages, or test artifacts.
- Treat anomaly signals as evidence to validate, not proof of bad data.
- Derive thresholds and response urgency from business impact; do not impose universal constants.
- Make blocking behavior explicit. Observational monitors must not silently become deployment or pipeline gates.
- Do not pause production, delete data, replay, or backfill without appropriate authorization and verified scope.
- Prefer aggregate evidence, identifiers, counts, timestamps, and restricted links over copied records.
- Verify version-sensitive framework syntax and APIs against the project's installed version and current official documentation.

## Deliverable

Produce a concise quality plan or implementation containing:

- In-scope assets, owners, consumers, and criticality
- Control definitions, placement, thresholds, and blocking policy
- Tool-specific implementation or configuration
- Safe alert routing and evidence
- Incident and recovery procedure
- Validation results, assumptions, and remaining risks
