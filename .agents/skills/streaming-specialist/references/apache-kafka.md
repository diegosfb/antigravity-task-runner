# Apache Kafka

## Topics and partitions

Choose keys from the required ordering and co-location boundary. Estimate
partitions from measured throughput, consumer parallelism, key skew, recovery
time, and broker limits. Partition counts and per-partition throughput are
workload-specific; benchmark representative payloads before capacity decisions.

Define retention or compaction, replication, minimum in-sync replicas, message
size, and schema policy intentionally. Increasing partitions can change key
mapping; reducing them is not generally a simple operation.

## Producers

Use acknowledgements and idempotent production appropriate to durability.
Transactions can atomically publish to Kafka partitions and topics when every
participant uses the same transaction boundary. Give each live transactional
producer a stable, unique transactional identity and handle fencing.

Bound retries and delivery timeout, classify permanent failures, and monitor
record errors. Compression, batching, linger, and in-flight requests must be
tuned with latency, memory, and throughput measurements.

## Consumer groups

Commit offsets only after the associated processing outcome is durable for an
at-least-once design. Rebalance callbacks must flush or revoke state safely.
Configure poll interval, session timeout, fetch size, and assignment strategy
from processing time and deployment behavior rather than copied defaults.

Monitor lag as a time series alongside processing rate, rebalance frequency,
poll latency, errors, and oldest-record age. Scale consumers only up to useful
partition parallelism and investigate hot keys before adding capacity.

## Kafka-to-Kafka exactly once

For read-process-write pipelines, consume committed data, publish output, and
commit consumed offsets in the same Kafka transaction. This does not make an
external database, HTTP call, email, or other side effect exactly once; use an
outbox, idempotency key, or compensating workflow.

## Schema Registry and Kafka Streams

Select backward, forward, or full compatibility from deployment order and
consumer lifetimes. Test compatibility in CI. In Kafka Streams, distinguish
event streams from materialized tables, define state-store durability, window
grace, changelog topics, and restoration objectives.

Verify configuration names and defaults against the deployed Kafka, client,
and Schema Registry versions.
