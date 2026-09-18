---
name: coding-standards
description: Baseline cross-project coding conventions for naming, readability, immutability, and code-quality review. Use detailed frontend or backend skills for framework-specific patterns.
origin: ECC
metadata:
  version: "1.1.0"
  library: "Affaan Mustafa — Everything Claude Code"
  library-url: "https://github.com/affaan-m/everything-claude-code"
  pack: "Software Development"
---

# Coding Standards

Apply a small, cross-project quality baseline without overriding repository-specific conventions.

## When to activate

- Starting or reviewing a project or module
- Refactoring for readability or maintainability
- Establishing naming, formatting, linting, or type-checking conventions
- Identifying common code smells

## Scope boundaries

Use this skill for descriptive naming, readability, simplicity, immutability defaults, error-handling expectations, and general code-quality review.

Repository instructions and language- or framework-specific skills take precedence. Do not use this skill as the primary source for React architecture, API design, database layering, or other domain-specific patterns.

Read only the reference needed for the current task:

- [TypeScript and JavaScript](references/typescript-javascript.md) for naming, types, async work, mutation, and error handling.
- [React](references/react.md) for component, hook, state, and rendering examples.
- [API design](references/api-design.md) for general REST, response, and validation examples.
- [Project organization](references/project-organization.md) for illustrative layout and filename conventions.
- [Performance](references/performance.md) for measurement-led optimization, memoization, lazy loading, and query selection.
- [Testing](references/testing.md) for test structure and naming.
- [Code smells](references/code-smells.md) for long functions, nesting, duplication, and unexplained values.

## Baseline principles

### Readability

- Prefer clear names and straightforward control flow.
- Explain why when the reason is not evident from the code.
- Follow the repository formatter rather than hand-formatting unrelated code.
- Prefer explicit code over clever compression.

### Simplicity

- Choose the smallest design that satisfies current requirements.
- Avoid speculative abstractions and premature optimization.
- Remove meaningful duplication when one shared concept genuinely exists; do not force unrelated code into an abstraction merely to satisfy DRY.

### Immutability by default

Prefer immutable updates when they improve predictability, especially for shared state. Local mutation is acceptable when ownership is clear, the API expects it, or measurement justifies it. Do not copy large structures blindly when a more appropriate data structure or targeted update exists.

### Error handling

- Preserve useful context when translating errors.
- Handle errors at the layer that can recover, add meaning, or present them safely.
- Do not catch an error only to log and rethrow it without a clear operational reason.
- Never expose secrets or sensitive payloads in errors or logs.

### Comments and documentation

- Comment decisions, constraints, and non-obvious tradeoffs—not syntax.
- Document public contracts when the language or repository convention calls for it.
- Keep documentation synchronized with behavior.

## Review checklist

- Does the change follow the repository's own standards?
- Are names and control flow understandable without unnecessary comments?
- Is the solution no more complex than the requirement demands?
- Are mutation and side effects scoped and intentional?
- Are errors handled once, at the right boundary, without leaking sensitive data?
- Are tests focused on observable behavior?
- Is any performance advice supported by measurement?
