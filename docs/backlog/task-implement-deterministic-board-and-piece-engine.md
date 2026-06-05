# Task: Implement Deterministic Board And Piece Engine

## Summary
Create the core game-state model for the board, tetromino definitions, spawning, and deterministic state transitions independent of rendering.

## Epic Reference
- `/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/docs/backlog/epic-basic-tetris-web-game.md`

## Specification Reference
- `docs/specs/SPEC_001.md`

## Description
- Define the standard seven tetromino shapes and their rotation states.
- Implement the board grid model, active piece state, upcoming piece state, and spawn logic.
- Provide deterministic state transition functions for movement validation, rotation validation, downward stepping, and collision checks.
- Keep engine logic isolated enough to support automated tests without UI coupling.

## Acceptance Criteria
- The engine represents the board, active tetromino, and next tetromino using deterministic state transitions.
- All seven standard tetrominoes can be spawned and evaluated against board boundaries and locked blocks.
- Collision and validity checks are available for movement, rotation, descent, and spawn handling.
- The engine can be exercised by automated tests without requiring DOM interaction.

## Dependencies
- Build Tetris Game Shell UI

## Notes
- Use this as the foundation for later movement, resolution, and game-over features.

## Estimation
- Estimated effort: **44-92 hours total**; **64 hours most likely**.
- Confidence: **Medium**.
- Scope basis: Includes the prerequisite **Build Tetris Game Shell UI** effort required to deliver this task in the intended architecture, plus the deterministic engine foundation itself. Excludes later controller/input, locking and line-clear resolution, game-over/restart flow, and broader gameplay coverage beyond the engine-focused tests needed here.

**Assumptions**
- The UI shell dependency is not already delivered and must be completed to support end-to-end validation.
- Scope includes the pure domain layer only: board model, tetromino definitions, seeded piece generation, spawn logic, collision and validity checks, deterministic state transitions, and DOM-free testability.
- Browser timing, control bindings, locking, line clears, preview progression after lock, and restart/game-over behavior remain in later backlog items.
- Implementation follows the documented JavaScript, React, Vite, Tailwind, and reducer-style architecture.

**Effort Drivers**
- Defining a future-proof state model and engine API.
- Implementing deterministic tetromino, spawn, and collision logic for all seven pieces.
- Preserving pure reducer semantics and no-op behavior for invalid transitions.
- Adding unit coverage that proves the engine is reproducible and independent from rendering.

**Risks**
- Rotation-rule ambiguity could force rework if expectations expand beyond simple valid clockwise rotation.
- Weak initial action/state design could cascade into refactors in later locking and game-over features.
- Deterministic randomizer and queue handling can create subtle sequence bugs.
- Web-game setup inside an extension-oriented repo may add incidental integration overhead.

**Validation Focus**
- Seeded sequence determinism and bag refill behavior.
- Spawn validity, boundary checks, and collision handling against locked cells.
- Movement, rotation, and downward-step transitions returning unchanged state on invalid actions.
- DOM-free engine tests that protect the contract for later UI and controller work.
