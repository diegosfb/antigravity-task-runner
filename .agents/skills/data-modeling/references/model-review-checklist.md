# Model Review Checklist

## Meaning

- Business terms and boundaries are unambiguous.
- Every entity and attribute has an owner and purpose.
- Grain is explicit for facts, events, snapshots, and histories.
- Identity, uniqueness, cardinality, and optionality match real scenarios.

## Integrity and Lifecycle

- Constraints enforce the invariants owned by this system.
- Creation, correction, merge, split, reassignment, and deletion are defined.
- Effective-time and processing-time semantics are clear where needed.
- Late, duplicate, missing, and conflicting source data have explicit handling.

## Consumption

- Representative writes and queries are possible without ambiguous joins.
- Measures aggregate correctly and fanout risks are controlled.
- Names, types, units, currency, timezone, and null semantics follow local conventions.
- The model supports required history without retaining unnecessary sensitive data.

## Evolution and Operations

- Compatibility with all known producers and consumers is assessed.
- Growth, retention, archival, replay, and recovery are considered.
- Physical tuning assumptions are identified for later measurement.
- Migration stages, validation, rollback needs, and authorization boundaries are handed off.

## Decision Record

Capture chosen pattern, alternatives, rationale, assumptions, rejected tradeoffs, open questions, and evidence that would trigger redesign. Diagrams should complement—not replace—precise grain, key, and relationship definitions.
