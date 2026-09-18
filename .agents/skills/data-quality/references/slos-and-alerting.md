# Service Objectives and Alerting

## Define the Service

Describe the data product from the consumer's perspective: what must be available, correct enough, and delivered by when. Assign an accountable owner and identify the measurement source.

Useful indicators include:

- Freshness or delivery delay
- Successful processing rate
- Completeness or valid-record rate
- Reconciliation variance
- Query availability or latency for serving products

Set objectives from business needs, operating capability, and measured history. Avoid universal percentages or response times.

## Blocking Policy

For each control, choose explicitly:

- Blocking: prevents promotion or downstream publication when continued processing is unsafe.
- Quarantine: isolates affected partitions or records while unaffected work proceeds.
- Observational: alerts and records evidence without changing execution.

Consider confidence, blast radius, reversibility, false-positive risk, and recovery cost. New anomaly monitors should normally start observationally.

## Actionable Alerts

An alert should state:

- Asset and environment
- Control or indicator that failed
- Evaluation window and detection time
- Aggregate observed value and expected boundary
- Affected partition or safe identifier
- Owner, runbook, lineage, and restricted diagnostic links
- Whether execution was blocked, quarantined, or allowed to continue

Do not include raw failing rows, credentials, personal data, or sensitive values. Apply access control and retention to alert history and linked evidence.

## Noise Control

Deduplicate related failures, group downstream symptoms around the likely upstream cause, suppress acknowledged maintenance where appropriate, and review alerts that do not lead to action. Escalation should reflect verified impact and elapsed risk, not merely the number of notifications.
