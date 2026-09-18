# Latency and throughput reference assumptions

Use this reference only for order-of-magnitude reasoning when measurements are unavailable. Values vary substantially by CPU generation, memory topology, storage device, filesystem, virtualization, cloud tenancy, payload, protocol, congestion, geography, and percentile. Record the source and date of any benchmark used in a decision.

## Approximate orders of magnitude

| Operation | Broad order of magnitude | Important variables |
| --- | ---: | --- |
| CPU cache access | sub-nanosecond to tens of nanoseconds | cache level, CPU, access pattern |
| Main-memory access | tens to hundreds of nanoseconds | NUMA, contention, working set |
| Local NVMe/SSD random read | tens to hundreds of microseconds | queue depth, block size, device, percentile |
| Same-zone network round trip | sub-millisecond to a few milliseconds | provider, path, protocol, load |
| Regional managed-service request | single to tens of milliseconds | service, payload, consistency, percentile |
| Cross-region round trip | tens to hundreds of milliseconds | geography and route |
| Public external API | tens of milliseconds to seconds | provider, internet path, throttling, retries |

These are comparison bands, not SLOs. Do not cite a single value as a property of “SSD,” “Redis,” “the network,” or “a database.”

## Measurement checklist

- Measure p50, p95, p99, and timeout/error rates under representative concurrency.
- Record payload size, read/write mix, cache state, connection reuse, durability/consistency mode, region/zone topology, and test duration.
- Measure sustainable throughput before saturation, not a short-lived vendor maximum.
- Include queueing and fan-out. For parallel calls, the slowest dependency shapes tail latency; for sequential calls, latencies accumulate.
- Test cold starts, cache misses, retries, failover, throttling, maintenance, and noisy-neighbor conditions when relevant.
- Re-run benchmarks after material hardware, runtime, schema, index, topology, or provider changes.

## Availability conversion

For a target `A`, downtime allowance over window `T` is `T × (1 - A)`.

| Target | Approximate allowance per 365-day year | Approximate allowance per 30-day month |
| --- | ---: | ---: |
| 99% | 3.65 days | 7.2 hours |
| 99.9% | 8.76 hours | 43.2 minutes |
| 99.99% | 52.6 minutes | 4.32 minutes |
| 99.999% | 5.26 minutes | 25.9 seconds |

Availability composition depends on dependency relationships, redundancy, common-mode failures, traffic weighting, and the measurement definition. Do not multiply component targets blindly or infer an architecture from this table alone.

## Source discipline

Jeff Dean's historical “Numbers Everyone Should Know” remains useful for intuition about relative costs, but its exact hardware values are not current environment facts. Prefer, in order:

1. Production telemetry from the same workload and topology
2. Representative load tests on the intended environment
3. Current provider or hardware benchmarks matching the configuration
4. This broad reference for initial order-of-magnitude reasoning
