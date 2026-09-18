# Data Vault

## When to Evaluate It

Consider Data Vault when integrating multiple changing sources with strong traceability and historization needs. Its additional objects, loading rules, and presentation layer create material implementation and operating cost; source count or regulatory language alone does not justify it.

## Core Concepts

- Hubs represent stable business keys.
- Links represent relationships or transactions among business concepts.
- Satellites carry descriptive context and history tied to a hub or link.
- Record source and load metadata support lineage and auditability.

Specify the chosen Data Vault version and local conventions. Hash-key and hash-difference designs require canonicalization, collision strategy, algorithm governance, and cross-platform consistency.

## Boundaries

Raw-vault structures preserve source-aligned history; business-vault structures apply governed derivations; presentation models serve consumers. Do not expose raw-vault joins directly to ordinary BI users without a justified consumption layer.

## Decision Test

Assess source volatility, parallel ingestion, historization, audit needs, delivery cadence, team expertise, automation, storage, query complexity, and presentation requirements. Compare against a simpler integration history plus dimensional presentation design.

## Validation

Test idempotent loads, duplicate business keys, late data, source corrections, relationship changes, replay, lineage, hash consistency, and presentation reconciliation.
