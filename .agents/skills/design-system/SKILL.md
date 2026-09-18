---
name: design-system
description: Extract, document, or audit the design system already expressed by an existing frontend codebase. Use for repository-based token discovery, UI consistency audits, AI-slop reviews, and artifacts such as DESIGN.md, design-tokens.json, or design-preview.html. Do not use to invent a new token/component system or design screens and interactions.
metadata:
  version: "1.1.0"
  library: "Local"
  library-url: ""
  pack: "Software Development"
  origin: local
---

# Design System

Use this skill for three related tasks:

- Generate a design system from an existing repo
- Audit visual consistency and product polish
- Detect generic "AI slop" patterns and suggest cleanup

## Routing boundary

- Use `design-system` when the source of truth is an existing codebase and the task is extraction, documentation, or audit.
- Hand proposed token, component-contract, or governance changes to `ui-design-system` when they become approved design-system construction work.
- Hand screen composition, user flows, interaction states, and visual design decisions to `ui-designer`.
- Do not invent a new visual language during an extraction or audit. Record uncertain or conflicting patterns as findings.

## Operating Rules

- Work in the existing repo and inspect styles before proposing changes.
- Respect the current product identity unless the user explicitly asks for a redesign.
- Prefer the existing styling stack, component system, naming conventions, and docs layout.
- Run relevant build, lint, or test commands when available.
- Keep recommendations tied to concrete files and make the smallest safe changes.
- Use rendered output when the app can be run locally. Otherwise, perform a static audit and say so clearly.
- If competitor research would require internet access and it is unavailable, skip it and state that constraint.

## First Pass

1. Identify the styling system: Tailwind, CSS modules, global CSS, theme files, token files, or component-library styles.
2. Determine whether the task is best handled as design-system generation, visual audit, or AI-slop review.
3. Gather evidence from specific files before making recommendations.
4. Reuse existing design docs or token files if the repo already has them.

## Mode 1: Generate Design System

Extract the current visual system:

- Color palette and semantic color usage
- Typography scale and font stack
- Spacing scale
- Radius, borders, and shadows
- Breakpoints and layout constraints
- Motion and interaction states
- Core component variants and states

Default deliverables:

- `DESIGN.md`
- `design-tokens.json`
- `design-preview.html`

Rules:

- If the repo already has equivalent docs or token files, update them instead of creating duplicates.
- Keep generated artifacts self-contained unless the repo already has an established documentation pattern.
- Prefer stable token names. Split raw tokens from semantic tokens when the codebase is mature enough to support that model.

Suggested `DESIGN.md` structure:

1. Visual intent
2. Tokens
3. Component patterns
4. Accessibility notes
5. Gaps and follow-ups

## Mode 2: Visual Audit

Score the UI across these dimensions from `0-10`:

1. Color consistency
2. Typography hierarchy
3. Spacing rhythm
4. Component consistency
5. Responsive behavior
6. Theming or dark mode support, if relevant
7. Motion quality
8. Accessibility
9. Information density
10. Finish and polish

For each dimension include:

- Score
- Evidence from specific files
- Problem example
- Recommended fix
- Exact file paths and line numbers when possible

If the app cannot be run locally, label the audit as static-source-based.

## Mode 3: AI Slop Review

Look for patterns such as:

- Generic purple-to-blue gradients
- Glass effects with no product purpose
- Over-rounded components
- Decorative animation that hurts clarity
- Template-like centered hero layouts
- Bland default font stacks with little identity
- Inconsistent utility-class styling
- Effects that reduce readability or accessibility

Do not flag a pattern just because it is trendy. Explain why it weakens the product or clashes with the repo's existing visual language.

## Output Style

When using this skill, produce:

1. A short diagnosis of the current visual system
2. Concrete file-based recommendations or patches
3. Generated artifacts only when the user asked for them or they clearly help
4. Clear follow-up priorities ordered by impact

## Example Requests

```text
Generate a design system for this repo. Style: minimal. Palette: earth tones.
Audit this app for design consistency and tell me the three highest-impact fixes.
Find AI-slop patterns in this marketing site and suggest cleanup changes.
```
