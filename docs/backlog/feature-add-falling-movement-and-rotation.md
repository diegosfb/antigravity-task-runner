# Feature: Add Falling Movement And Rotation

## Summary
Wire the active tetromino loop so pieces fall automatically and respond to valid left, right, rotate, and soft-drop actions.

## Epic Reference
- `/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/docs/backlog/epic-basic-tetris-web-game.md`

## Specification Reference
- `docs/specs/SPEC_001.md`

## Description
- Advance the active tetromino downward at a consistent base fall rate during active play.
- Allow one-column left and right movement only when the destination cells are valid.
- Allow rotation only when the rotated state fits within the playfield and does not overlap locked blocks.
- Implement soft drop so the active tetromino descends faster than the base fall rate.
- Ignore any invalid move or rotation input and preserve the current valid piece state.

## Acceptance Criteria
- During an active game, the current tetromino falls automatically without player input.
- Valid left and right inputs move the active tetromino by one column.
- Valid rotation inputs rotate the active tetromino in place.
- Soft drop increases descent speed compared with the base fall rate.
- Invalid movement or rotation attempts do not change the current valid piece state.

## Dependencies
- Implement Deterministic Board And Piece Engine

## Notes
- Keep timing and input effects deterministic enough to verify with tests.

## Estimation

**Estimated Effort:** 62-132 hours total; 92 hours most likely  
**Confidence:** Medium

**Scope basis:** This estimate rolls up the dependent `Implement Deterministic Board And Piece Engine` scope because this feature cannot be delivered end-to-end without that prerequisite. That dependency already includes the shell wiring needed to exercise the engine in the intended React/Vite/Tailwind architecture. The incremental scope here is the falling loop, movement/rotation rules, soft-drop behavior, controller wiring, and focused validation for this slice only.

**Assumptions**
- The deterministic engine dependency is required and not already complete.
- Implementation follows the documented reducer-style engine plus thin controller architecture.
- Rotation is simple clockwise validation only; no advanced wall kicks.
- Base fall and soft-drop timing must be deterministic enough to test.
- Later locking/line-clear, game-over, mobile-control, and broader gameplay test work stays out of scope.

**Effort drivers**
- Elapsed-time tick orchestration outside the reducer.
- Valid left/right/rotate/soft-drop transitions with invalid-input no-ops.
- Clean separation between controller, UI, and domain rules.
- Regression coverage for gravity cadence and movement/rotation behavior.
- Integration with existing shell and engine seams without introducing state duplication.

**Risks**
- Prerequisite engine seams may need refactoring before this feature can be wired cleanly.
- Timing-sensitive behavior can create flaky tests or browser-specific debugging.
- Rotation expectations could drift toward wall-kick behavior and expand scope.
- Frequent DOM-grid updates may reveal rerender/performance issues during integration.

**Validation focus**
- Unit tests for `TICK`, movement, rotation, invalid-action no-ops, and soft-drop timing.
- Controller/component tests that prove inputs dispatch shared domain actions.
- Manual desktop verification of auto-fall and valid/invalid input behavior.
- Regression checks that locking, line clears, and game-over are not accidentally coupled into this slice.
