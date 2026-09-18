---
name: data-modeling
description: Design conceptual, logical, relational, dimensional, or Data Vault models and evaluate modeling tradeoffs. Use when defining entities, grain, relationships, keys, facts, dimensions, history, or schema evolution. Route migration execution to database-migrations and measured physical tuning to database-optimizer.
allowed-tools: Read, Glob, Grep
metadata:
  version: "1.1.0"
  library: "Melodic Software"
  library-url: "https://github.com/melodic-software/claude-code-plugins"
  pack: "Software Development"
---

# Data Modeling

Design models from business meaning, workload, lifecycle, and governance requirements rather than applying one universal pattern.

## Scope

This skill owns modeling decisions: entities, grain, relationships, keys, facts, dimensions, history, and logical evolution.

Route database engine selection and physical schema implementation to `../database-design/SKILL.md`, migration planning and execution to `../database-migrations/SKILL.md`, measured indexing and query tuning to `../database-optimizer/SKILL.md`, and ownership or classification policy to `../data-governance/SKILL.md`.

## Required Context

Establish:

- Business processes, terminology, rules, and accountable owners
- Consumers, decisions, queries, writes, and latency expectations
- Entity identity, source-of-truth boundaries, and relationship cardinality
- Required grain, history, auditability, and correction semantics
- Data volume, change rate, retention, privacy, and regional constraints
- Existing repository, platform, naming, and compatibility conventions

If context is incomplete, state assumptions and keep the model conceptual or logical rather than inventing physical details.

## Reference Routing

- Choose conceptual, logical, physical, operational, or analytical approaches: [model-selection.md](references/model-selection.md)
- Design normalized entities, relationships, and identifiers: [relational-modeling.md](references/relational-modeling.md)
- Design facts, dimensions, grain, and history: [dimensional-modeling.md](references/dimensional-modeling.md)
- Evaluate hubs, links, satellites, and presentation layers: [data-vault.md](references/data-vault.md)
- Design compatible model evolution before migration execution: [schema-evolution.md](references/schema-evolution.md)
- Review completeness, integrity, usability, and operational risk: [model-review-checklist.md](references/model-review-checklist.md)

## Workflow

1. Define the business questions, processes, actors, and vocabulary.
2. Declare model boundaries, ownership, grain, identity, and time semantics.
3. Compare suitable modeling patterns against workload and lifecycle constraints.
4. Draft entities or tables, attributes, keys, relationships, constraints, and history behavior.
5. Walk representative writes, reads, corrections, late arrivals, deletions, and growth through the model.
6. Review with business, application, analytics, governance, and operations stakeholders as applicable.
7. Record decisions, alternatives, compatibility implications, and unresolved assumptions.

## Guardrails

- Do not assume OLTP always means third normal form or analytics always means a star schema.
- Do not choose surrogate, natural, composite, UUID, or time-sortable keys without identity and lifecycle analysis.
- Treat additive changes as potentially breaking when consumers, defaults, storage, generated clients, or semantics are affected.
- Follow the target repository's naming and platform conventions.
- Do not denormalize, partition, or add indexes solely from intuition; route measured physical optimization appropriately.
- Avoid sensitive natural identifiers when a stable opaque identifier better satisfies privacy and lifecycle needs.
- Preserve authorization boundaries for destructive migrations, backfills, and production changes.

## Deliverable

Produce the selected model level, entity or table definitions, grains, keys, relationships, history and evolution rules, decision rationale, validation scenarios, and open risks.
