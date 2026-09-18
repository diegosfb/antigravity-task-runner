# Testing

Follow the repository's test framework and placement conventions.

## Structure

Keep setup, action, and assertion easy to distinguish. Explicit Arrange/Act/Assert comments are optional when the structure is already clear.

```typescript
test("returns no markets when none match the query", () => {
  const markets = [{ name: "Weather" }];

  const result = searchMarkets(markets, "election");

  expect(result).toEqual([]);
});
```

## Guidance

- Name tests after observable behavior and relevant conditions.
- Prefer deterministic tests at the narrowest seam that still exercises the real behavior.
- Test public contracts and important failure paths.
- Avoid asserting implementation details unless they are themselves contractual.
- Do not weaken or delete an existing test merely to make a change pass.
- Use integration or end-to-end tests when unit isolation would hide the risk.

Avoid vague names such as `works` or `test search`; they do not explain regressions.

