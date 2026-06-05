# Feature: Add Game Over And Restart Flow

## Summary
Handle blocked spawns by entering a visible game-over state and provide restart behavior that resets the session to a fresh board.

## Epic Reference
- `/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/docs/backlog/epic-basic-tetris-web-game.md`

## Specification Reference
- `docs/specs/SPEC_001.md`

## Description
- Detect when a new tetromino cannot spawn because the spawn area is blocked.
- Enter a clear game-over state immediately without rendering an overlapping or partial spawn.
- Prevent gameplay inputs from changing board state while game over is active.
- Provide a restart action that resets the board, active piece, upcoming piece, and game state into a fresh session.

## Acceptance Criteria
- If a new tetromino cannot spawn, the game enters a visible game-over state immediately.
- Move, rotate, and soft-drop inputs do not change the board while the game-over state is active.
- Restart returns the game to a fresh session with an empty board and newly initialized active and upcoming pieces.

## Dependencies
- Implement Locking Line Clears And Preview Progression

## Notes
- Restart behavior must fully reset gameplay state rather than partially reusing a previous session.

## Estimation
- Estimated effort: **92-202 hours total; 138 hours most likely**
- Confidence: **Medium**
- Scope basis: Roll-up estimate includes the dependent **Implement Locking Line Clears And Preview Progression** scope because blocked-spawn game over and restart cannot be completed end-to-end until lock resolution, line clears, preview advancement, and continued spawn progression already exist. This uses the prior dependency estimate of **80-174 hours total / 120 hours most likely** and adds **12-28 hours** for game-over transition logic, UI/controller gating, restart reset behavior, and direct validation.
- Assumptions:
  - The feature is implemented in the documented client-only React/Vite/Tailwind architecture with a deterministic reducer-style engine.
  - Dependency scope for engine, falling movement, locking, line clears, and preview progression is included in this roll-up.
  - Restart is a full in-memory session reset only; no persistence, scoring, pause, or save-state work is added.
  - UX remains a simple visible game-over state plus restart affordance inside the existing shell.
- Effort drivers:
  - Detecting blocked spawn atomically without rendering a partial or overlapping piece.
  - Enforcing `game_over` input blocking across controller and reducer paths.
  - Reinitializing full gameplay state cleanly on restart, including queue, seed, timing, and phase.
  - Adding regression coverage for spawn-block, no-op inputs during game over, and full restart reset.
- Risks:
  - Spawn-block logic is easy to get wrong if evaluated after partial mutation.
  - Restart semantics may be unclear around fresh-session seeding and deterministic expectations.
  - Timer or held-input cleanup may leak actions after game over unless controller lifecycle is tight.
  - Upstream changes in lock/spawn sequencing could force rework at the reducer boundary.
- Validation focus:
  - Unit coverage for immediate `game_over` on blocked spawn.
  - Unit coverage for complete restart reset of authoritative state.
  - UI/controller tests confirming gameplay inputs no-op during game over and restart resumes clean play.
  - Green `npm run lint`, `npm test`, and `npm run build` gates before merge.
