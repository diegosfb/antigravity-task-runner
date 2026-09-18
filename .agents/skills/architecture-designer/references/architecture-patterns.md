# Architecture Patterns

> Reference for: Architecture Designer
> Load when: Choosing architecture approach

## Pattern Comparison

| Pattern | Best For | Team Size | Trade-offs |
|---------|----------|-----------|------------|
| **Monolith** | Simple domain, small team | 1-10 | Simple deploy; hard to scale parts |
| **Modular Monolith** | Growing complexity | 5-20 | Module boundaries; still single deploy |
| **Microservices** | Complex domain, large org | 20+ | Independent scale; operational complexity |
| **Serverless** | Variable load, event-driven | Any | Auto-scale; cold starts, vendor lock |
| **Event-Driven** | Async processing | 10+ | Loose coupling; debugging complexity |

## Monolith

```
┌─────────────────────────────────────┐
│            Application              │
│  ┌─────┐  ┌─────┐  ┌─────┐         │
│  │Users│  │Orders│ │Products│       │
│  └─────┘  └─────┘  └─────┘         │
│  └──────────┬──────────────┘        │
│          Database                    │
└─────────────────────────────────────┘
```

**When to Use**:
- Starting a new project
- Small team (< 10 developers)
- Simple domain
- Rapid iteration needed

**Pros**: Simple deployment, easy debugging, no network latency
**Cons**: Hard to scale independently, technology locked, deployment risk

## Microservices

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Users   │  │  Orders  │  │ Products │
│ Service  │  │ Service  │  │ Service  │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
┌────▼────┐  ┌────▼────┐  ┌────▼────┐
│ User DB │  │Order DB │  │ Prod DB │
└─────────┘  └─────────┘  └─────────┘
```

**When to Use**:
- Large team (20+ developers)
- Complex domain with clear boundaries
- Different scaling requirements per service
- Polyglot technology needs

**Pros**: Independent scaling, team autonomy, fault isolation
**Cons**: Distributed system complexity, eventual consistency, operational overhead

## Event-Driven

```
┌──────────┐     ┌─────────────┐     ┌──────────┐
│ Producer │────▶│ Message Bus │────▶│ Consumer │
└──────────┘     │  (Kafka)    │     └──────────┘
                 └─────────────┘
                       │
                       ▼
                 ┌──────────┐
                 │ Consumer │
                 └──────────┘
```

**When to Use**:
- Async processing required
- Loose coupling between services
- Event sourcing needs
- High throughput messaging

**Pros**: Decoupled services, scalable, audit trail
**Cons**: Eventual consistency, debugging complexity, message ordering

## CQRS (Command Query Responsibility Segregation)

```
┌─────────┐         ┌─────────────┐
│ Commands│────────▶│ Write Model │──┐
└─────────┘         └─────────────┘  │
                                     ▼
                              ┌──────────┐
                              │  Events  │
                              └──────────┘
                                     │
┌─────────┐         ┌─────────────┐  │
│ Queries │◀────────│ Read Model  │◀─┘
└─────────┘         └─────────────┘
```

**When to Use**:
- Read/write ratio heavily skewed
- Complex read queries
- Event sourcing architecture
- Different optimization needs

## Quick Reference

| Requirement | Recommended Pattern |
|-------------|---------------------|
| Simple CRUD app | Monolith |
| Growing startup | Modular Monolith |
| Enterprise scale | Microservices |
| Variable load | Serverless |
| Async processing | Event-Driven |
| Read-heavy | CQRS |

## Other Common Patterns

### Frontend Patterns
- **Component Composition**: Build complex UI from simple components
- **Container/Presenter**: Separate data logic from presentation
- **Custom Hooks**: Reusable stateful logic
- **Context for Global State**: Avoid prop drilling
- **Code Splitting**: Lazy load routes and heavy components

### Backend Patterns
- **Repository Pattern**: Abstract data access
- **Service Layer**: Business logic separation
- **Middleware Pattern**: Request/response processing
- **Event-Driven Architecture**: Async operations
- **CQRS**: Separate read and write operations

### Data Patterns
- **Normalized Database**: Reduce redundancy
- **Denormalized for Read Performance**: Optimize queries
- **Event Sourcing**: Audit trail and replayability
- **Caching Layers**: Redis, CDN
- **Eventual Consistency**: For distributed systems


## ANTI-PATTERNS - REDFLAGS! - Avoid and if detected propose improvements and refactoring plan

Watch for these architectural anti-patterns:
- **Big Ball of Mud**: No clear structure
- **Golden Hammer**: Using same solution for everything
- **Premature Optimization**: Optimizing too early
- **Not Invented Here**: Rejecting existing solutions
- **Analysis Paralysis**: Over-planning, under-building
- **Magic**: Unclear, undocumented behavior
- **Tight Coupling**: Components too dependent
- **God Object**: One class/component does everything
