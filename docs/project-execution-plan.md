# Jira Execution Order for BACKLOG

Generated: 2026-06-04 20:22:38 PDT
Open issues considered: 7

This sequence is optimized for a single AI development agent working one issue at a time.

## Recommended Order

### 1. task-add-core-gameplay-test-coverage - Add automated tests for the deterministic gameplay rules and critical state transitions required by the spec.
- Type: Task
- Status: TODO
- Priority: Unspecified
- Parent: epic-basic-tetris-web-game
- Explicit depends on: None
- Explicitly blocks: None
- Why here: Placed from backlog file docs/backlog/task-add-core-gameplay-test-coverage.md using dependency-aware local fallback ordering for project BACKLOG.

### 2. feature-build-tetris-game-shell-ui - Create the browser game shell with the central playfield, next-piece preview, and visible start or restart affordances in a responsive layout.
- Type: Feature
- Status: TODO
- Priority: Unspecified
- Parent: epic-basic-tetris-web-game
- Explicit depends on: None
- Explicitly blocks: None
- Why here: Placed from backlog file docs/backlog/feature-build-tetris-game-shell-ui.md using dependency-aware local fallback ordering for project BACKLOG.

### 3. task-implement-deterministic-board-and-piece-engine - Create the core game-state model for the board, tetromino definitions, spawning, and deterministic state transitions independent of rendering.
- Type: Task
- Status: TODO
- Priority: Unspecified
- Parent: epic-basic-tetris-web-game
- Explicit depends on: None
- Explicitly blocks: None
- Why here: Placed from backlog file docs/backlog/task-implement-deterministic-board-and-piece-engine.md using dependency-aware local fallback ordering for project BACKLOG.

### 4. feature-add-game-over-and-restart-flow - Handle blocked spawns by entering a visible game-over state and provide restart behavior that resets the session to a fresh board.
- Type: Feature
- Status: TODO
- Priority: Unspecified
- Parent: epic-basic-tetris-web-game
- Explicit depends on: None
- Explicitly blocks: None
- Why here: Placed from backlog file docs/backlog/feature-add-game-over-and-restart-flow.md using dependency-aware local fallback ordering for project BACKLOG.

### 5. feature-support-desktop-and-mobile-controls - Provide in-scope control surfaces for keyboard play on desktop and touch-accessible controls on mobile.
- Type: Feature
- Status: TODO
- Priority: Unspecified
- Parent: epic-basic-tetris-web-game
- Explicit depends on: None
- Explicitly blocks: None
- Why here: Placed from backlog file docs/backlog/feature-support-desktop-and-mobile-controls.md using dependency-aware local fallback ordering for project BACKLOG.

### 6. feature-implement-locking-line-clears-and-preview-progression - Resolve the active piece lifecycle by locking pieces, clearing completed rows, shifting the board, and advancing the next-piece preview.
- Type: Feature
- Status: TODO
- Priority: Unspecified
- Parent: epic-basic-tetris-web-game
- Explicit depends on: None
- Explicitly blocks: None
- Why here: Placed from backlog file docs/backlog/feature-implement-locking-line-clears-and-preview-progression.md using dependency-aware local fallback ordering for project BACKLOG.

### 7. feature-add-falling-movement-and-rotation - Wire the active tetromino loop so pieces fall automatically and respond to valid left, right, rotate, and soft-drop actions.
- Type: Feature
- Status: TODO
- Priority: Unspecified
- Parent: epic-basic-tetris-web-game
- Explicit depends on: None
- Explicitly blocks: None
- Why here: Placed from backlog file docs/backlog/feature-add-falling-movement-and-rotation.md using dependency-aware local fallback ordering for project BACKLOG.

## Notes

- Re-run this ordering after major backlog changes or after completing foundational issues.
- Testing and QA work should stay close to the implementation scope they validate, not grouped only at the end.
