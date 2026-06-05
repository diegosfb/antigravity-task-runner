# Feature: Implement Locking Line Clears And Preview Progression

## Summary
Resolve the active piece lifecycle by locking pieces, clearing completed rows, shifting the board, and advancing the next-piece preview.

## Epic Reference
- `/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/docs/backlog/epic-basic-tetris-web-game.md`

## Specification Reference
- `docs/specs/SPEC_001.md`

## Description
- Lock the active tetromino into the board when it can no longer move downward.
- Detect every completely filled horizontal row after lock resolution.
- Clear all completed rows in the same resolution step and shift rows above downward immediately afterward.
- Spawn the next active tetromino after lock resolution and update the preview to the following upcoming piece.
- Continue the gameplay loop until spawning is blocked.

## Acceptance Criteria
- A tetromino locks into the board when it can no longer descend.
- One or more completed rows are all removed in the same resolution step after a lock.
- Rows above cleared lines shift downward immediately after resolution.
- After each lock, a new active tetromino spawns and the preview updates to the following upcoming piece.
- Gameplay continues normally while spawn space remains available.

## Dependencies
- Implement Deterministic Board And Piece Engine
- Add Falling Movement And Rotation

## Notes
- Multi-line clear handling is a key edge case and should be verified explicitly.

## Estimation
- Estimated effort: 80-174 hours total; 120 hours most likely.
- Confidence: Medium.
- Scope basis: Estimate rolls up the dependent Add Falling Movement And Rotation scope because this feature cannot be delivered or validated without the deterministic engine, shell wiring, gravity loop, and movement/rotation behavior already in place. The dependency already includes the underlying engine and shell foundation, so this estimate adds the incremental lock resolution, simultaneous line clears, board compaction, preview progression, and direct regression coverage needed to complete this feature end-to-end.
- Assumptions:
  - The prior Add Falling Movement And Rotation estimate already includes prerequisite shell and deterministic engine work.
  - Locking is immediate once descent is invalid; no lock delay, scoring, combo logic, or speed progression is added.
  - Line clears resolve in one deterministic reducer step, including multi-line clears and immediate row compaction.
  - Exactly one next-piece preview is maintained from the seeded 7-bag queue.
  - Full blocked-spawn game-over behavior is completed in the later Add Game Over And Restart Flow feature.
- Effort drivers:
  - Pure reducer implementation for lock and board merge behavior.
  - Correct multi-line clear detection and board compaction in a single resolution path.
  - Deterministic next-piece promotion and preview advancement from queued state.
  - Keeping UI/controller wiring aligned with reducer-owned rules.
  - Focused regression coverage for post-lock and post-clear flows.
- Risks:
  - Multi-line clear ordering and compaction bugs can corrupt board state.
  - Preview state can desynchronize from the bag queue if spawn responsibilities are split poorly.
  - Timing-boundary mistakes between falling logic and lock resolution can cause duplicate locks or missed spawns.
  - Handoff boundaries to the later game-over feature may cause some rework if blocked-spawn seams are not clean.
- Validation focus:
  - Unit tests for lock-on-blocked-descent and board merge semantics.
  - Deterministic tests for single-line and multi-line clear resolution plus downward compaction.
  - Regression tests for next-piece promotion and preview refresh after lock resolution.
  - UI/controller checks that rendered board and preview reflect reducer state without duplicated gameplay logic.
