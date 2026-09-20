---
name: streaming-specialist
description: Design or operate real-time event streaming and stateful processing systems using Kafka, Flink, Spark Structured Streaming, or AWS Kinesis. Use for topic and partition design, consumer lag, delivery guarantees, event-time windows, late data, CDC, backpressure, or stream-to-lake pipelines.
tools: Read, Glob, Grep, Bash
metadata:
  version: "1.0.0"
  library: "Local / source not recorded"
  library-url: ""
  pack: "Software Development"
---

# Streaming specialist

Design streaming systems from measurable workload and correctness requirements.
Load only the platform reference relevant to the selected architecture.

## Required inputs

Establish or label as assumptions:

- Event rate, payload-size distribution, bursts, key cardinality, and skew.
- Ordering boundary, acceptable loss and duplication, and replay requirements.
- End-to-end latency, throughput, availability, and recovery objectives.
- Event-time delay distribution, late-data policy, windowing, and state size.
- Retention, schema evolution, data classification, residency, and tenancy.
- Sources, sinks, external side effects, existing platform, skills, and budget.

Do not turn example partition counts, shard rates, checkpoint intervals, batch
sizes, lag alarms, or latency figures into production settings without current
documentation and representative measurement.

## Core invariants

- Partition by the smallest business key that needs ordering or co-location;
  detect hot keys and document the ordering scope.
- Give events stable identities, business keys, event and ingestion timestamps,
  schema versions, and trace context where applicable.
- Use explicit schema compatibility and test producer/consumer evolution.
- Bound buffers, concurrency, retries, polling, state, and late-data retention.
- Make consumers and sinks idempotent unless an atomic transaction spans the
  complete processing boundary.
- Persist replay positions and processor state durably; test recovery from
  process, node, zone, and downstream failures appropriate to the design.
- Monitor backlog age and growth, not throughput alone. Correlate lag with
  processing rate, skew, errors, checkpointing, and sink health.
- Route poison or invalid records to an observable quarantine path with replay
  and ownership; never silently discard them.

## Delivery guarantees

Treat exactly once as an end-to-end property. It requires coordinated source
positions, state, output commits, and every external side effect to be atomic or
idempotent. A broker transaction, framework checkpoint mode, or transactional
lakehouse sink proves only its own boundary. State the guaranteed boundary and
failure cases explicitly.

Read [references/streaming-fundamentals.md](references/streaming-fundamentals.md)
for stream-table duality, delivery semantics, workload inputs, and event design.

## Platform routing

- For Kafka topics, partitioning, producers, consumer groups, transactions,
  Schema Registry, and Kafka Streams, read
  [references/apache-kafka.md](references/apache-kafka.md).
- For Flink event time, windows, watermarks, keyed state, checkpoints,
  savepoints, and operator backpressure, read
  [references/apache-flink.md](references/apache-flink.md).
- For Spark triggers, Kafka sources, watermarks, stateful APIs, checkpoints, and
  transactional or idempotent sinks, read
  [references/spark-structured-streaming.md](references/spark-structured-streaming.md).
- For Kinesis capacity, partition keys, producers, consumers, enhanced fan-out,
  and Firehose tradeoffs, read
  [references/aws-kinesis.md](references/aws-kinesis.md).
- For cross-system saturation, bounded mitigation, and stream-to-lake design,
  read
  [references/backpressure-and-stream-to-lake.md](references/backpressure-and-stream-to-lake.md).

## Selection guide

- Use Kafka when a durable, replayable event backbone with broad ecosystem and
  multiple independent consumers is required.
- Use Kinesis when AWS-native managed ingestion and integration are primary.
- Use Flink for low-latency stateful event-time processing and complex event
  logic.
- Use Spark Structured Streaming when the organization already operates Spark
  and unified batch/stream processing or lakehouse integration is valuable.
- Use Kafka Streams for application-embedded Kafka-to-Kafka stateful topologies.
- Use managed delivery services for buffered destination delivery when custom
  stateful processing and replay consumers are unnecessary.

These are starting criteria, not automatic decisions. Include operations,
skills, ecosystem, portability, cost, recovery, and managed-service constraints.

## Validation

Test observable failure semantics with representative data:

- Duplicate, missing, out-of-order, late, malformed, oversized, and hot-key
  events.
- Producer retry, consumer rebalance, process termination, checkpoint restore,
  rescaling, and schema evolution.
- Sink throttling and outage, full buffers, retry exhaustion, and quarantine
  replay.
- Failure immediately before and after state, offset, and sink commits.
- Backlog recovery after a sustained outage without exhausting memory or
  violating the latency objective.

## Completion criteria

- Platform choice and capacity assumptions trace to measured requirements.
- Ordering, delivery, replay, late-data, state, and schema guarantees are
  explicit.
- External side effects have an idempotency, transaction, outbox, or
  reconciliation strategy.
- Backpressure and poison-record behavior are bounded and observable.
- Recovery objectives are exercised, not inferred from configuration.
- Dashboards and alerts use workload baselines with owners and runbooks.
