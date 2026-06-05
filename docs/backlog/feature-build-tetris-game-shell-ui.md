# Feature: Build Tetris Game Shell UI

## Summary
Create the browser game shell with the central playfield, next-piece preview, and visible start or restart affordances in a responsive layout.

## Epic Reference
- `/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/docs/backlog/epic-basic-tetris-web-game.md`

## Specification Reference
- `docs/specs/SPEC_001.md`

## Description
- Render a central Tetris-style playfield and adjacent next-piece preview in the web UI.
- Provide visible session controls so the player can start or restart play without extra menus.
- Ensure the layout remains readable and usable across desktop and mobile screen sizes.
- Keep the interface simple and aligned with the v1 fully client-side scope.

## Acceptance Criteria
- The initial screen shows a central playfield, a next-piece preview, and a visible way to start or restart play.
- The playfield and preview remain readable in both desktop and mobile layouts.
- The UI does not expose out-of-scope systems such as scoring, levels, hold, or multiplayer.

## Dependencies
- None.

## Notes
- This issue should establish the presentation layer and layout hooks that later gameplay logic can drive.

## Estimation

- Estimated effort: **16-36 hours total** with **24 hours most likely**.
- Confidence: **Medium-High**.
- Scope basis: Estimated as the presentation-layer feature only: SPA shell setup, central playfield, next-piece preview, visible start/restart affordances, responsive layout, and the UI seams needed for later engine/controller work. Deterministic gameplay logic, falling behavior, controls, and deeper gameplay tests remain in related backlog items.
- Assumptions:
  - This item establishes the React/Vite/Tailwind shell and presentational components, not the reducer-based game engine.
  - The board and preview can render from placeholder or selector-driven props until dependent gameplay items are completed.
  - Only the v1 shell is in scope: central playfield, single next-piece preview, and visible start/restart controls.
  - Out-of-scope systems such as scoring, levels, hold, pause, multiplayer, and persistence stay excluded.
- Effort drivers:
  - Greenfield web-shell setup inside a repo that currently centers on a VS Code extension.
  - Clean presentational component boundaries for board, preview, shell, and status UI.
  - Responsive Tailwind layout work for desktop and mobile readability.
  - UI contracts that later controller and engine items can attach to without structural rework.
  - Component-level validation of shell rendering and scope guardrails.
- Risks:
  - Repo setup or build isolation may take longer than expected.
  - Early UI assumptions about engine state shape may force rework later.
  - Mobile spacing and readability may need extra iteration on smaller screens.
- Validation focus:
  - Initial render shows the playfield, preview, and visible start/restart action.
  - Desktop and mobile layouts remain readable and usable.
  - Out-of-scope controls are absent.
  - Lint, component tests, and build pass for the shell implementation.
