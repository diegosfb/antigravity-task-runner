# Project Organization

Repository structure is project-specific. Follow the existing layout before applying these fallback principles.

## Principles

- Organize around stable responsibilities or product domains.
- Keep framework, domain, and data-access boundaries explicit where the architecture requires them.
- Place tests according to repository convention; proximity to source is often useful but not universal.
- Avoid cross-boundary relative imports when workspace aliases or public package interfaces exist.
- Use generated directories only through their generators.

## Illustrative layout

```text
src/
├── features/
│   └── markets/
│       ├── components/
│       ├── services/
│       └── types.ts
├── shared/
│   ├── components/
│   └── utilities/
└── entrypoints/
```

This is an example, not a mandate. Do not restructure a repository merely to match it.

## Naming

Use the repository and ecosystem convention consistently. Common patterns include:

```text
components/Button.tsx
hooks/use-auth.ts
utilities/format-date.ts
types/market.ts
```

Consistency and discoverability matter more than selecting one universal casing rule.

