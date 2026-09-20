# Spark Structured Streaming

## Execution mode

Micro-batch is the general execution model. Select trigger intervals from
latency, batch duration, source backlog, file/object-store costs, and sink
commit behavior. Continuous processing has narrower operation support and is
version-sensitive; verify it before recommending it.

## Kafka sources

Set bootstrap endpoints, topics, starting offsets, isolation, and per-trigger
limits explicitly. Parse with a declared schema and retain Kafka topic,
partition, offset, and timestamp when replay and traceability matter.

Use a durable, unique checkpoint location per query. Moving, sharing, or
deleting checkpoint state can change replay behavior and must be treated as a
state migration rather than routine cleanup.

## Watermarks and state

Watermarks bound state using observed event-time progress. Their behavior also
depends on output mode and operation. Choose append, update, or complete mode
according to sink semantics and whether downstream consumers tolerate updates
or repeated results.

For stateful APIs, define key cardinality, timeout type, state schema evolution,
late input, empty batches, and state cleanup. Measure checkpoint growth and
state-store performance.

## Sinks and delivery guarantees

Transactional lakehouse sinks can coordinate query checkpoints and idempotent
transactions, but external side effects in `foreachBatch` require stable batch
identifiers and explicit idempotency. Test process termination before and after
sink commit to establish the actual guarantee.

Cap input per trigger to prevent recovery backlogs from exhausting memory, then
monitor input rate, processed rate, batch duration, state rows, event-time
watermark, source lag, and sink commit latency. Verify options against the
installed Spark and connector versions.
