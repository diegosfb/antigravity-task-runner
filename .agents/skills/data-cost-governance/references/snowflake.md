# Snowflake Cost Governance

Use for Snowflake-specific attribution and controls. Verify feature availability and current pricing for the account edition, cloud, region, and contract.

## Diagnose

- Use `ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY` to measure warehouse consumption by time window.
- Use `ACCOUNT_USAGE.QUERY_HISTORY` to identify costly, queued, failed, or long-running workloads.
- Compare credits consumed with useful work; separate idle time, concurrency pressure, query inefficiency, and cloud-services usage.
- Inspect `TABLE_STORAGE_METRICS` for active, Time Travel, Fail-safe, and clone-related storage.
- Use query tags and warehouse ownership to improve attribution; do not expose sensitive query text in reports.

## Controls

- Set auto-suspend and auto-resume from measured workload behavior rather than one universal timeout.
- Right-size warehouses using elapsed time, queueing, spill, concurrency, and total credits—not size alone.
- Use multi-cluster scaling for proven concurrency needs and set bounded cluster counts.
- Apply statement and queue timeouts appropriate to workload criticality.
- Use account or warehouse resource monitors for alerts and, only with explicit approval, suspension actions.
- Separate development, ad hoc, scheduled, and production workloads when their ownership or service levels differ.

## Query and storage optimization

- Find repeated scans, poor pruning, unnecessary recomputation, and expensive transformations.
- Evaluate clustering, materialized views, search optimization, or rewritten models only after measuring maintenance cost and workload benefit.
- Reduce retention only after confirming recovery, legal, and data-product requirements.
- Inventory clones and transient staging data before proposing removal.

## Evidence to return

- Credits by warehouse, team, and workload
- Idle and queueing ratios
- Highest-cost queries with sensitive text redacted
- Storage composition and retention assumptions
- Estimated savings using the customer's effective credit price

