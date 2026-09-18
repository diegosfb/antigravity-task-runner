# Code Smells

Code smells are prompts to investigate, not automatic violations. Context, cohesion, and change risk matter more than numeric thresholds.

## Long functions

A function may need decomposition when it mixes responsibilities, requires extensive navigation, or changes for unrelated reasons. Do not split a cohesive function solely because it crosses an arbitrary line count.

## Deep nesting

Guard clauses can make exceptional paths explicit:

```typescript
if (!user) return;
if (!user.isAdmin) return;
if (!market?.isActive) return;
if (!hasPermission) return;

performAction();
```

Do not replace clear structural nesting with scattered returns when scopes, cleanup, or transactional behavior would become harder to follow.

## Unexplained values

Name a value when its meaning, unit, or policy matters:

```typescript
const maxRetries = 3;
const debounceDelayMs = 500;
```

Obvious local literals do not always need constants; avoid indirection without added meaning.

## Duplication

Repeated code is a concern when it represents the same concept and is likely to change together. Similar-looking code with different ownership or evolution may be safer left separate.

## Other review signals

- Boolean parameters that obscure call-site meaning
- Hidden global state or implicit side effects
- Catch-all modules with unrelated reasons to change
- Comments compensating for unclear design
- Abstractions with only hypothetical consumers
- Logs or errors that expose sensitive data
