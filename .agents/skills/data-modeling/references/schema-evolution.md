# Schema Evolution

## Design Compatibility

Model evolution before choosing migration mechanics. Inventory writers, readers, generated clients, contracts, transformations, replicas, exports, and downstream analytical models.

Classify compatibility separately for reads, writes, stored data, and meaning. Adding an optional column can still break positional readers, strict schemas, generated clients, storage budgets, or privacy policy.

## Evolution Patterns

- Expand and contract: introduce compatible structure, migrate writers and readers, verify adoption, then remove the old structure.
- Versioned contract: maintain multiple external representations while one internal model evolves.
- Translation layer: adapt old and new semantics at a service or pipeline boundary.
- Rebuild or backfill: materialize a new representation with reconciliation and cutover.

Event sourcing is a broader architecture choice, not a generic schema-versioning shortcut.

## Semantic Changes

Document changed meaning, defaults, units, null behavior, identity, grain, and history. A type-compatible field can still be semantically breaking.

## Handoff

This skill defines the target model, compatibility stages, invariants, and validation scenarios. Route executable DDL, backfills, rollout, rollback, and production authorization to `../../database-migrations/SKILL.md`.

Do not assign fixed phase durations. Sequence and duration depend on callers, data volume, risk, and deployment capability.
