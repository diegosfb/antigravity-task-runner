---
name: system-requirements-estimation
description: Estimate runtime demand such as request rate, concurrency, storage, bandwidth, and latency budgets using explicit units, average/peak/stress scenarios, growth, and sensitivity. Use for architecture and infrastructure-capacity sizing; not for engineering effort, staffing, vendor pricing, or final production capacity guarantees.
metadata:
  version: "1.1.0"
  library: "DSFB"
  library-url: "https://github.com/diegosfb/dsfb-sdlc-v2"
  pack: "Software Development"
  updated: "2026-08-28"
---

# System Requirements Estimation

Produce auditable order-of-magnitude estimates that expose assumptions and identify architecture thresholds. Prefer measured workload and component benchmarks. Reference values are hypotheses, not substitutes for load tests, provider limits, or production telemetry.

## Boundary

- Use this skill for QPS/RPS, concurrency, message/event rates, storage, memory/cache, bandwidth, IOPS, throughput, and latency budgets.
- Use `development-estimation` for implementation effort, duration, and staffing.
- Use `cloud-consumption-estimation` to map runtime demand to provider resources and current prices.
- The owning architect makes architecture decisions; this skill supplies quantitative evidence.

## Workflow

1. Define the decision the estimate must inform and the planning horizon.
2. Record every input with value, unit, source, date, evidence quality, and whether it is measured, supplied, benchmark-derived, or assumed.
3. Normalize units before calculating. Preserve decimal SI units (`kB`, `MB`, `GB`) separately from binary IEC units (`KiB`, `MiB`, `GiB`). State whether bandwidth uses bits or bytes.
4. Model at least average, expected peak, and stress demand when burst behavior matters. Derive peak factors from telemetry when available; otherwise show them as sensitivity variables.
5. Separate logical/raw data from compression, indexes, metadata, replicas, backups, logs, temporary working space, and headroom. Replicas and backups are different durability mechanisms.
6. Apply growth scenarios to the full planning horizon. Use low/base/high cases when growth uncertainty can change the architecture.
7. Compare demand with measured component throughput, latency percentiles, quotas, failure-domain requirements, and operational headroom. Never divide by a vendor maximum and call the result production capacity.
8. Sanity-check dimensions and reconcile the result against an independent method or known comparable system when possible.
9. Report the estimate as a range, its dominant variables, thresholds that change the design, validation plan, and reversal conditions.

## Core calculations

Use formulas only after defining their units:

- `average RPS = active users × actions per user per period ÷ seconds in period`
- `peak RPS = average RPS × measured or assumed peak factor`
- `concurrency ≈ arrival rate × average time in system` (Little's Law, under stable conditions and consistent units)
- `logical storage = items ingested per period × item bytes × retention periods`
- `primary stored data = logical storage × compression ratio`
- `indexed primary = primary stored data × (1 + index/metadata overhead)`
- `replicated storage = indexed primary × total replica copies`
- `backup storage = indexed primary × additional retained backup copies`, adjusted for backup retention and deduplication when known
- `payload bandwidth = request rate × bytes per request or response × 8`
- `wire bandwidth = payload bandwidth × (1 + protocol/TLS/retry overhead)`
- `required instances = ceil(demand ÷ measured sustainable capacity per instance × headroom factor)`

Do not multiply retained storage by a time period twice. Do not treat cache TTL as equivalent to unique entry lifetime without a cardinality or reuse model.

## Latency and availability

Build an end-to-end percentile budget rather than summing unrelated typical averages. Include client/network, queueing, application, datastore, downstream services, serialization, retries, and observability overhead where material. Tail latency and fan-out usually matter more than component means.

For hardware and network orders of magnitude, read [latency reference](references/latency-numbers.md). Replace it with measurements for the actual environment whenever possible.

Availability arithmetic describes downtime allowance, not achieved reliability:

- `annual downtime allowance = seconds per year × (1 - availability target)`
- Define measurement window, excluded events, request weighting, dependency objectives, recovery objectives, and error-budget policy separately.

## Deterministic helper

Use `python3 scripts/estimate_capacity.py <input.json> [--format text|json]` when the workload fits its model. It calculates request scenarios, retained storage layers, peak wire bandwidth, concurrency, and growth sensitivity. Inspect and explain the inputs; do not present helper output without judgment.

Minimal input:

```json
{
  "workload": {
    "active_users": 100000,
    "actions_per_user_per_day": 20,
    "peak_factor": 3,
    "stress_factor": 2,
    "average_latency_ms": 200,
    "items_ingested_per_day": 2000000,
    "item_size_bytes": 1200,
    "retention_days": 365,
    "compression_ratio": 0.6,
    "index_overhead_ratio": 0.25,
    "replica_copies": 3,
    "backup_copies": 1,
    "log_bytes_per_day": 5000000000,
    "log_retention_days": 30,
    "response_size_bytes": 8000,
    "wire_overhead_ratio": 0.15,
    "annual_growth_rate": 0.5,
    "planning_years": 3
  }
}
```

All ratios are decimal: `compression_ratio = stored bytes / raw bytes`; overheads and annual growth use `0.25 = 25%`; copy counts include all full copies as documented above.

## Required output

Return:

- Decision and planning horizon
- Inputs table with units, provenance, evidence quality, and assumptions
- Average, peak, and stress scenarios
- Calculation ledger with formulas and unit conversions
- Storage breakdown: logical, compressed primary, indexes/metadata, replicas, backups, logs, and headroom
- Bandwidth, concurrency, throughput, and latency budget where relevant
- Low/base/high growth or sensitivity analysis
- Architecture thresholds and bottlenecks
- Confidence by major result, not one blanket score
- Measurements, load tests, provider checks, and telemetry required before production commitment

Round for communication only after retaining sufficient precision to validate the arithmetic.
