# API Design

Use the repository's contract and API-design guidance first. These examples are defaults, not universal requirements.

## Resource-oriented HTTP

```text
GET    /api/markets
GET    /api/markets/:id
POST   /api/markets
PUT    /api/markets/:id
PATCH  /api/markets/:id
DELETE /api/markets/:id
```

- Use HTTP methods and status codes consistently.
- Keep pagination, filtering, and sorting contracts explicit.
- Version public breaking changes or provide a compatible migration path.
- Prefer stable machine-readable error codes over parsing prose messages.

## Responses

Do not introduce a response envelope when an established API convention already exists. If a consistent envelope is required, type it:

```typescript
interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
  meta?: { total?: number; nextCursor?: string };
}
```

## Input validation

Validate all untrusted input at the boundary with the repository's chosen schema tool:

```typescript
const createMarketSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2_000),
  endDate: z.string().datetime(),
});
```

Return useful validation details without exposing internal implementation, credentials, or sensitive values. Authorization must be enforced independently of validation.

