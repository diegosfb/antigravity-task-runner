# Data Contracts

Use for explicit producer-consumer agreements and controlled schema or semantic evolution.

## Minimum contract

- Stable dataset or event identity and version
- Producer, owner, steward, support route, and known consumers
- Business meaning and supported uses
- Schema, nullability, identifiers, units, time semantics, and classification
- Freshness, availability, completeness, and latency objectives where meaningful
- Compatibility and breaking-change policy
- Notice, deprecation, migration, and exception process
- Validation and evidence location

Avoid universal service-level numbers. Derive objectives from consumer impact and the producer's operational capability.

## Change workflow

1. Classify the proposed change as compatible, conditionally compatible, or breaking for actual consumers.
2. Identify consumers through registry, lineage, runtime evidence, and owner confirmation.
3. Propose migration, parallel support, notice, and rollback.
4. Obtain required producer and consumer approvals.
5. Validate schema and semantic behavior in CI and a representative environment.
6. Publish the new version and monitor adoption.
7. Retire the old contract only after exit criteria are met.

## Enforcement

Use platform or transformation-framework contract features when they represent the real interface. Supplement schema checks with semantic, freshness, and compatibility tests. A passing schema test does not prove that metric meaning or consumer expectations remain intact.

Keep contracts versioned with traceable approvals. Do not embed live personal data, credentials, or sensitive operational samples.

