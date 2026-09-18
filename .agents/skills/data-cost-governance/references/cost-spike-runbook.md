# Cost-Spike Runbook

Use when cost or usage has already deviated materially.

## 1. Confirm

- Validate the alert against billing or usage telemetry.
- Check scope, currency, comparison window, data delay, credits, refunds, and one-time charges.
- Quantify absolute and percentage change.

## 2. Isolate

Break the variance down by provider, service, account or project, region, SKU, environment, workload, owner, and time window. Determine whether price, volume, mix, or efficiency changed.

## 3. Identify

Look for deployments, missing filters, changed schedules, retry storms, autoscaling, idle resources, data growth, retention changes, new replicas, commitment expiry, or tagging regressions. Preserve evidence and redact sensitive query text or identifiers.

## 4. Contain

Choose the smallest reversible control that limits further loss without violating service objectives. Suspension, quota reduction, job cancellation, retention reduction, or deletion requires explicit authorization and verified targets. State customer impact and rollback before acting.

## 5. Correct

Fix the causal configuration, query, pipeline, policy, or ownership gap. Validate against the same signal that detected the spike and check performance, reliability, and data integrity.

## 6. Prevent

Add a proportional guardrail: query limits, compute policy, lifecycle rule, budget alert, anomaly detector, test, tag enforcement, or runbook update. Assign an owner and review date.

## Incident output

- Impact and time window
- Root cause and contributing factors
- Containment and authorization
- Corrective change and validation
- Preventive control, owner, and follow-up
