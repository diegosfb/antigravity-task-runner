# BigQuery Cost Governance

Use for BigQuery scan, capacity, storage, and billing-export analysis. Verify the current pricing model, edition, region, and reservation structure from official Google Cloud sources.

## Diagnose

- Query regional `INFORMATION_SCHEMA.JOBS*` views for bytes processed, bytes billed, slot time, cache use, errors, users, labels, and reservations.
- Use Cloud Billing export for invoiced cost; job metadata and list-price calculations are estimates.
- Separate on-demand scan cost, capacity cost, storage, streaming or ingestion, BI Engine, and ancillary services.
- Compare like-for-like periods and account for delayed billing export data.

## Preventive controls

- Dry-run expensive queries and set `maximum_bytes_billed` where supported by the execution path.
- Require partition filters for large partitioned tables when valid for the workload.
- Cluster on measured filtering and join patterns; do not add clustering by habit.
- Apply table or partition expiration only after retention and recovery review.
- Use labels, reservations, folders, and projects to improve cost ownership.
- Configure budgets and alerts; note that budgets do not inherently cap service usage.

## Capacity decisions

- Compare measured on-demand usage with reservation or edition scenarios using current regional prices.
- Model baseline, burst, idle-slot sharing, autoscaling, commitments, and organizational assignments.
- Report utilization and break-even sensitivity rather than using a fixed monthly-spend threshold.

## Evidence to return

- Billed bytes and slot time by project, reservation, user or service account, label, and workload
- Full-scan and missing-partition-filter candidates
- Capacity utilization and commitment scenarios
- Current-price source, retrieval date, and calculation assumptions

