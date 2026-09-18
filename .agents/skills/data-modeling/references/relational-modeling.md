# Relational Modeling

## Entities and Relationships

Define each entity from a stable business concept and lifecycle. Record cardinality, optionality, ownership, and deletion behavior for every relationship. Resolve many-to-many relationships explicitly when the relationship has attributes or lifecycle of its own.

## Normalization

Use normalization to reduce contradictory facts and update anomalies. Evaluate functional dependencies rather than mechanically targeting a named normal form.

Denormalize only for a documented read, availability, or distribution need. Define the authoritative value, synchronization method, failure behavior, reconciliation, and repair path.

## Keys and Identity

Choose keys from domain identity and operational constraints:

- Natural keys can enforce meaningful identity but may change, expose sensitive data, or vary across sources.
- Surrogate keys isolate storage identity but still require business uniqueness rules.
- Composite keys can express grain directly but propagate into relationships and client APIs.
- UUIDs and time-sortable distributed identifiers trade locality, opacity, coordination, and generation complexity differently.

Never assume an email address, government identifier, or mutable source code is a safe primary key.

## Constraints

Represent invariants with types, nullability, uniqueness, checks, and referential constraints where the platform and ownership boundary allow them. Document invariants that must remain in application or cross-system validation.

## Review Scenarios

Test creation, duplicate identity, merge and split, reassignment, correction, deletion, retention, concurrency, and source-system disagreement. Confirm that names and types follow the target repository and engine.
