# ADR Template

> Reference for: Architecture Designer
> Load when: Documenting architectural decisions

## When to Write an ADR

| Write ADR | Skip ADR |
|-----------|----------|
| New framework or platform adoption | Minor version upgrades |
| Database or storage technology choice | Bug fixes |
| API, integration, or security architecture decisions | Routine maintenance |
| Major migration or deprecation path | Small implementation details |
| Cross-team design trade-off with lasting consequences | Trivial configuration changes |

## ADR Lifecycle

```text
Proposed -> Accepted -> Deprecated -> Superseded
              |
              -> Rejected
```

## Standard ADR Format

```markdown
# ADR-{number}: {Title}

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX | Rejected]

## Context
[Describe the situation and forces at play. What is the problem?
What constraints exist? What are we trying to achieve?]

## Decision Drivers
- [Driver 1]
- [Driver 2]

## Considered Options
### Option 1: {Name}
- **Pros**:
- **Cons**:

### Option 2: {Name}
- **Pros**:
- **Cons**:

## Decision
[State the decision clearly. What are we going to do?]

## Rationale
[Why this option was chosen over the others.]

## Consequences

### Positive
- [Benefit 1]
- [Benefit 2]

### Negative
- [Drawback 1]
- [Drawback 2]

### Neutral
- [Side effect that is neither good nor bad]

### Risks
- [Risk 1]
- [Mitigation]

## Implementation Notes
- [Migration, rollout, or operational follow-up]

## Related Decisions
- [ADR-0002: Related decision]

## References
- [Link to relevant documentation]
- [Link to discussion/RFC]
```

## Example: Database Selection

```markdown
# ADR-001: Use PostgreSQL for primary database

## Status
Accepted

## Context
We need a relational database for our e-commerce platform that:
- Handles complex transactions with strong consistency
- Supports JSON for flexible product attributes
- Scales to millions of products and orders
- Works well with our existing Python/Node stack

Team has experience with PostgreSQL and MySQL.
Budget allows for managed database service.

## Decision Drivers
- ACID compliance for financial transactions
- Strong JSON and query support
- Team familiarity
- Managed-service friendliness

## Considered Options

### PostgreSQL
- **Pros**: Rich feature set, ACID, JSONB, strong ecosystem
- **Cons**: Requires DBA knowledge for tuning

### MySQL
- **Pros**: Familiar, broad hosting support
- **Cons**: Less capable JSON/query tooling for this use case

### MongoDB
- **Pros**: Flexible schema
- **Cons**: Relational transactions and reporting are a weaker fit

## Decision
Use PostgreSQL as the primary database, hosted on AWS RDS.

## Rationale
PostgreSQL best balances correctness, feature depth, and team familiarity while keeping the operational model straightforward.

## Consequences

### Positive
- ACID compliance for financial transactions
- Rich feature set (JSON, full-text search, CTEs)
- Strong community and tooling
- Excellent performance with proper indexing
- Free and open source

### Negative
- Vertical scaling has limits (addressed with read replicas)
- Requires DBA expertise for optimization
- AWS RDS costs for high availability

### Neutral
- Team will need to learn PostgreSQL-specific features
- Migration from current SQLite dev database needed

### Risks
- Read scaling may require replicas sooner than expected
- Some advanced query patterns may need indexing expertise

## Implementation Notes
- Use connection pooling
- Enable backups and high availability
- Add indexing and observability standards early

## Related Decisions
- ADR-002: Caching strategy
- ADR-005: Search architecture

## References
- https://www.postgresql.org/docs/current/
- Internal RFC: Database Selection for E-commerce Platform
```

## Lightweight ADR

```markdown
# ADR-0012: Adopt TypeScript for Frontend Development

**Status**: Accepted
**Date**: 2024-01-15
**Deciders**: @alice, @bob, @charlie

## Context
Our React codebase has grown to 50+ components with increasing bug reports
related to prop type mismatches and undefined errors.

## Decision
Adopt TypeScript for all new frontend code. Migrate existing code incrementally.

## Consequences
**Good**: Catch type errors at compile time, better IDE support.
**Bad**: Learning curve, initial slowdown, build complexity increase.
**Mitigations**: Training sessions, gradual adoption with `allowJs: true`.
```

## Y-Statement ADR

```markdown
# ADR-0015: API Gateway Selection

In the context of **building a microservices architecture**,
facing **the need for centralized API management, authentication, and rate limiting**,
we decided for **Kong Gateway**
and against **AWS API Gateway and custom Nginx solution**,
to achieve **vendor independence, plugin extensibility, and team familiarity with Lua**,
accepting that **we need to manage Kong infrastructure ourselves**.
```

## Deprecation / Superseding ADR

```markdown
# ADR-0020: Deprecate MongoDB in Favor of PostgreSQL

## Status
Accepted (Supersedes ADR-0003)

## Context
ADR-0003 chose MongoDB for user profile storage. The schema is now stable,
PostgreSQL expertise is stronger, and maintaining two databases adds cost.

## Decision
Deprecate MongoDB and migrate user profiles to PostgreSQL.

## Migration Plan
1. Create PostgreSQL schema and enable dual write
2. Backfill historical data
3. Switch reads to PostgreSQL and monitor
4. Remove MongoDB writes and decommission

## Consequences
### Positive
- Lower operational complexity
- Stronger transactional guarantees

### Negative
- Migration effort and rollout risk
```

## ADR Naming Convention

```
docs/
└── architecture/
    └── adrs/
        ├── 0001-use-postgresql-database.md
        ├── 0002-adopt-microservices.md
        ├── 0003-implement-event-sourcing.md
        └── README.md
```

## ADR Index Example

```markdown
# Architecture Decision Records

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| 0001 | Use PostgreSQL as Primary Database | Accepted | 2024-01-10 |
| 0002 | Caching Strategy with Redis | Accepted | 2024-01-12 |
| 0003 | MongoDB for User Profiles | Deprecated | 2023-06-15 |
| 0020 | Deprecate MongoDB | Accepted | 2024-01-15 |
```

## Review Checklist

- [ ] Context clearly explains the problem
- [ ] Viable alternatives were considered
- [ ] Trade-offs are honest and balanced
- [ ] Consequences include both positive and negative effects
- [ ] Related ADRs are linked
- [ ] Security, cost, and reversibility were considered

## Quick Reference

| Section | Purpose | Key Question |
|---------|---------|--------------|
| Status | Current state | Is this active? |
| Context | Background | Why are we deciding? |
| Decision Drivers | Constraints and priorities | What matters most? |
| Decision | The choice | What did we choose? |
| Consequences | Impact | What happens now? |
| Considered Options | Options | What else was considered? |
