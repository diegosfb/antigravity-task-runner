# Streaming fundamentals

## Core model

- An event is an immutable, timestamped fact.
- A stream is an unbounded sequence of events.
- A partition is a totally ordered sub-stream and usually the unit of
  parallelism and ordering.
- An offset identifies a position within a partition.
- A watermark estimates event-time completeness.
- A window bounds an unbounded stream for aggregation.
- Stateful processing retains per-key information across events.

Stream-table duality means a changelog can materialize current state, while
table mutations can be represented as a stream. Preserve keys and deletion
semantics when moving between these views.

## Delivery semantics

- **At most once:** processing may lose records but should not duplicate them.
- **At least once:** retries avoid loss but consumers and sinks must tolerate
  duplicates.
- **Effectively once:** idempotency or deduplication produces the intended
  business result despite repeated delivery.
- **Exactly once:** requires coordinated source positions, processor state,
  output commits, and all external side effects within one atomic or
  idempotent protocol.

A producer flag, checkpoint mode, or transactional broker alone cannot promise
end-to-end exactly-once behavior. Define the guarantee boundary explicitly.

## Design inputs

Collect event rate and size distributions, burst profile, key cardinality and
skew, ordering scope, acceptable loss or duplication, latency objective,
retention and replay needs, state size, late-data distribution, sink behavior,
recovery objectives, regions, security classification, and cost constraints.

## Schema and event design

Use stable event identities, business keys, event and ingestion timestamps,
schema versions, and trace context. Make compatibility policy explicit and test
producer and consumer evolution. Avoid embedding mutable snapshots without a
clear upsert/delete contract.
