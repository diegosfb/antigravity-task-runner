# Model Selection

## Levels

- Conceptual: business concepts, relationships, vocabulary, and rules without implementation detail.
- Logical: attributes, keys, cardinality, optionality, and normalization independent of a specific engine.
- Physical: engine-specific types, constraints, indexes, partitioning, and storage choices.

Move to a more detailed level only when the task and available evidence justify it.

## Workload Orientation

Operational models often prioritize transactional correctness, bounded writes, concurrency, and entity lifecycle. Analytical models often prioritize stable grain, understandable measures, historical analysis, and predictable consumption. Many systems need both or use operational stores, integration layers, and presentation models together.

## Decision Criteria

Compare candidate approaches using:

- Primary users and business questions
- Write, update, delete, and query patterns
- Consistency and latency requirements
- History, audit, lineage, and correction behavior
- Source count and rate of source change
- Consumer tooling and semantic-layer capability
- Team experience and operating cost
- Privacy, retention, and access boundaries

## Pattern Choice

Use relational normalization, dimensional modeling, Data Vault, document or event patterns, or a combination because their tradeoffs fit the context—not because one is a default maturity stage.

Document rejected alternatives and the evidence that would trigger reconsideration.
