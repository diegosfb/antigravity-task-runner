# AWS Kinesis

## Capacity and partitioning

Choose on-demand or provisioned capacity from traffic predictability, scaling
behavior, cost, and operational requirements. Current shard throughput, record
size, API batch, retention, and consumer limits are time-sensitive; verify them
in official AWS documentation and benchmark representative traffic.

Partition keys determine ordering and shard distribution. Use a stable business
key when per-entity ordering matters, but detect hot keys and avoid low-cardinality
or time-based keys that concentrate load.

For batch writes, inspect every record result and retry only failed records with
bounded exponential backoff and jitter. Preserve event IDs so consumers can
deduplicate retries.

## Consumers

Use KCL, Lambda event-source mappings, or a deliberately managed API consumer
instead of ad hoc shard loops for production unless the operational burden is
justified. Define checkpoint timing, poison-record handling, retries, partial
batch response, resharding behavior, and lease-table recovery.

Checkpointing provides replay position, not atomic external side effects. Make
sinks idempotent or coordinate them through a transactional/outbox design.

## Standard consumption and enhanced fan-out

Select standard polling or enhanced fan-out from consumer count, throughput,
latency, isolation, and cost. Register consumers predictably, manage lifecycle,
and monitor iterator age or `MillisBehindLatest`, throttling, failed records,
lease churn, and delivery errors.

## Data Streams versus Firehose

Use Data Streams for replayable custom processing and multiple consumers. Use
Firehose for managed buffered delivery to supported destinations when its
latency, transformation, retry, backup, and duplication semantics fit. Do not
label either service exactly once without proving the complete source-to-sink
path.
