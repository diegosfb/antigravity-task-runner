# TypeScript and JavaScript

Use these examples only when the repository does not define a stronger convention.

## Naming

Prefer names that reveal purpose and units:

```typescript
const marketSearchQuery = "election";
const isUserAuthenticated = true;
const timeoutMs = 5_000;

async function fetchMarketData(marketId: string) {}
function calculateSimilarity(left: number[], right: number[]) {}
function isValidEmail(email: string): boolean { return true; }
```

Avoid single-letter or generic names outside tiny, conventional scopes.

## Type safety

Model domain states explicitly and avoid `any` unless an unavoidable boundary is documented:

```typescript
interface Market {
  id: string;
  name: string;
  status: "active" | "resolved" | "closed";
  createdAt: Date;
}

function getMarket(id: string): Promise<Market> {
  throw new Error("Not implemented");
}
```

Validate untrusted runtime input; static types do not validate network, file, or user data.

## Immutable updates

Prefer a new value when callers may share the old one:

```typescript
const updatedUser = { ...user, name: "New Name" };
const updatedItems = [...items, newItem];
```

Mutation is not categorically wrong. It can be appropriate for locally owned variables, builders, performance-sensitive loops backed by measurement, and APIs explicitly designed around mutation.

## Async work

Run independent operations concurrently when failure and capacity semantics permit:

```typescript
const [users, markets, stats] = await Promise.all([
  fetchUsers(),
  fetchMarkets(),
  fetchStats(),
]);
```

Keep sequential execution when operations depend on prior results, ordering matters, or concurrency would overload a dependency.

## Error handling

Check external results and translate failures only where useful context can be added:

```typescript
async function fetchData(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}
```

Avoid logging sensitive response bodies, credentials, authorization headers, or personal data.

