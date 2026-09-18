# Performance

Measure before optimizing. Define the relevant workload, baseline, and target rather than assuming a micro-optimization matters.

## Application code

- Remove avoidable repeated work on measured hot paths.
- Use memoization when computation or referential stability has demonstrated value; unnecessary memoization adds complexity and retention costs.
- Load expensive code or data lazily when it improves a meaningful user or system metric.
- Bound concurrency to protect downstream dependencies.

```typescript
const sortedMarkets = useMemo(
  () => [...markets].sort((left, right) => right.volume - left.volume),
  [markets],
);
```

The copy prevents an in-place sort from mutating shared state. If the collection is large, measure the allocation and sorting tradeoff.

## Data access

- Select only columns required by the contract when practical.
- Avoid unbounded reads and N+1 query patterns.
- Add indexes based on observed query plans and workloads.
- Treat caching as a consistency decision, not merely a speed switch.

```typescript
const { data } = await database
  .from("markets")
  .select("id, name, status")
  .limit(10);
```

Use the database-specific skill for query plans, indexes, locking, and engine behavior.

