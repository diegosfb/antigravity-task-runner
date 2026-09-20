# Apache Flink

## Event time and windows

Choose tumbling, sliding, or session windows from the business question. Assign
event timestamps at the source and derive watermarks from measured
out-of-order arrival. Tight watermarks discard valid late data; loose
watermarks increase state and result latency.

Define allowed lateness and route too-late events to an observable side output
or reconciliation path. Test idle partitions, clock anomalies, backfills, and
events far outside the expected delay distribution.

## State

Key state by the same business boundary that requires consistency. Define state
TTL, cleanup, serialization evolution, skew behavior, and maximum expected
size. Timers must use the intended processing-time or event-time semantics.

## Checkpoints and savepoints

Checkpoint mode is only one part of the processing guarantee. Sources must
restore positions, state must restore consistently, and sinks must be
transactional or idempotent. Store checkpoints in durable, protected storage
and test restore. Use savepoints for controlled upgrades where appropriate.

Set interval, timeout, concurrent checkpoints, alignment behavior, and state
backend from measured state size, throughput, and recovery objectives. Do not
copy example values into production without load and failure testing.

## Backpressure

Locate the first saturated downstream operator. Correlate busy/backpressured
time, buffer usage, checkpoint duration, state access, garbage collection, key
skew, and sink latency. Mitigations include bounded asynchronous I/O, batched
sinks, operator-specific parallelism, rescaling, state optimization, and
source-rate control.

Async operations require timeouts, bounded capacity, ordering decisions, retry
limits, and idempotent external calls. Verify APIs and configuration against the
deployed Flink version and connector.
