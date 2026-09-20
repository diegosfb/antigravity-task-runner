# Backpressure and stream-to-lake

## Detecting backpressure

Use workload baselines rather than universal thresholds. Correlate:

- Source rate and oldest unprocessed event age.
- Broker or shard lag and backlog growth rate.
- Operator busy, idle, and backpressured time.
- Batch and checkpoint duration versus configured intervals.
- Queue depth, buffer occupancy, memory, garbage collection, and spill.
- Sink latency, throttling, error rate, and retry volume.
- Key and partition skew.

## Mitigation

Apply the smallest measure that addresses the bottleneck:

- Bound source reads and in-memory queues.
- Batch writes and use bounded asynchronous I/O.
- Scale the saturated stage within available partition parallelism.
- Repartition or salt hot keys while preserving required ordering.
- Isolate slow sinks with bulkheads and explicit overflow policy.
- Apply circuit breakers and stop consuming when a sink cannot safely accept
  more work.
- Spill or retain backlog durably rather than dropping it silently.

Every bounded buffer needs behavior for full, timeout, retry, shutdown, and
recovery. Load-test bursts and downstream outages, not only steady state.

## Stream-to-lake design

Land raw records with payload, schema/version, event time, ingestion time,
source topic/stream, partition or shard, offset/sequence, and event ID. Preserve
enough information for deterministic replay and reconciliation.

Use a durable checkpoint separate from data output. Make writes idempotent or
transactional, handle schema evolution, quarantine invalid records, and define
small-file compaction. Partition lake data for measured query patterns; avoid
high-cardinality partitions and blindly partitioning by arrival date when event
time or tenant isolation is the actual requirement.

Bronze/silver/gold is an organizational pattern, not a guarantee. Document
ownership, latency, quality gates, replay boundaries, deletion propagation,
retention, and how corrections move through each layer.
