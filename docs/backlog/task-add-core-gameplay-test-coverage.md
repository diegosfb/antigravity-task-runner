# Task: Add Core Gameplay Test Coverage

## Summary
Add automated tests for the deterministic gameplay rules and critical state transitions required by the spec.

## Epic Reference
- `/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/docs/backlog/epic-basic-tetris-web-game.md`

## Specification Reference
- `docs/specs/SPEC_001.md`

## Description
- Cover movement validation against walls and locked blocks.
- Cover rotation validation and rejection of invalid rotations.
- Cover automatic falling, soft drop behavior, locking, and next-piece progression.
- Cover single-line and multi-line clear resolution.
- Cover blocked-spawn game-over detection and full restart reset behavior.

## Acceptance Criteria
- Automated tests verify deterministic movement and collision handling.
- Automated tests verify line clearing, including clearing multiple completed rows in one resolution step.
- Automated tests verify blocked spawns trigger game over immediately.
- Automated tests verify restart returns the game to a fresh session state.

## Dependencies
- Implement Deterministic Board And Piece Engine
- Add Falling Movement And Rotation
- Implement Locking Line Clears And Preview Progression
- Add Game Over And Restart Flow

## Notes
- Focus tests on pure gameplay logic first; add UI-level checks only where needed to validate control wiring.

## Estimation
- Estimated effort: **112-242 hours total**; **164 hours most likely**
- Confidence: **Medium**
- Scope basis: Roll-up estimate includes the dependent `Add Game Over And Restart Flow` feature, which already rolls up `Implement Locking Line Clears And Preview Progression`, `Add Falling Movement And Rotation`, `Implement Deterministic Board And Piece Engine`, and the shell wiring needed to exercise gameplay in the intended React/Vite/Tailwind architecture. This task adds the incremental work to build and stabilize comprehensive deterministic gameplay coverage across reducer rules, seeded fixtures, and limited UI/controller checks.
- Assumptions:
  - `Vitest` and the chosen JS test stack are already the approved harness for unit and component coverage.
  - Prerequisite gameplay features are implemented close to the documented pure-engine architecture.
  - UI-level checks stay narrow and only validate control wiring or visible state transitions that pure engine tests cannot prove alone.
  - Out-of-scope mechanics such as hold, hard drop, scoring, levels, pause, and persistence remain excluded.
- Effort drivers:
  - Broad reducer coverage across movement, collision rejection, rotation validity, gravity cadence, soft drop, locking, preview advancement, line clears, blocked spawn, and restart.
  - Deterministic fixture and seeded-bag setup so failures are reproducible and debuggable.
  - Limited controller or UI wiring coverage for shared action dispatch and game-over gating.
  - CI stabilization for timing-sensitive gameplay tests.
- Risks:
  - Earlier gameplay code may not be sufficiently isolated for efficient testing and could require refactoring first.
  - Time-based behavior can create flaky tests if elapsed-time seams are not controllable.
  - Rotation or lock-resolution semantics may still shift, forcing test rewrites.
  - Existing extension-oriented repo tooling may create extra test configuration friction.
- Validation focus:
  - Seeded unit tests for movement, collisions, and invalid rotation no-ops.
  - Reducer tests for gravity, soft drop, locking, and next-piece progression.
  - Single-line and multi-line clear regression coverage.
  - Blocked-spawn game-over and full restart reset assertions.
  - Minimal UI/controller checks for input gating and restart wiring.
