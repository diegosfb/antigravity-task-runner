# Epic: Basic Tetris Web Game

## Summary
Deliver a fully client-side single-player web app that recreates the core Tetris gameplay loop on desktop and mobile. The release includes responsive gameplay UI, deterministic piece logic, in-scope controls, and game-over/restart behavior only.

## Specification Reference
- `docs/specs/SPEC_001.md`

## Scope
- Build a browser-based Tetris play experience with a central playfield and next-piece preview.
- Implement deterministic tetromino spawning, falling, movement, rotation, locking, and line-clear resolution.
- Support desktop keyboard controls and mobile touch controls for the in-scope actions.
- Handle game-over and restart flows without backend services, persistence, or out-of-scope gameplay systems.
- Add automated coverage for core gameplay rules and state transitions.

## Child Issues
- `/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/docs/backlog/feature-build-tetris-game-shell-ui.md`
- `/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/docs/backlog/task-implement-deterministic-board-and-piece-engine.md`
- `/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/docs/backlog/feature-add-falling-movement-and-rotation.md`
- `/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/docs/backlog/feature-implement-locking-line-clears-and-preview-progression.md`
- `/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/docs/backlog/feature-add-game-over-and-restart-flow.md`
- `/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/docs/backlog/feature-support-desktop-and-mobile-controls.md`
- `/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/docs/backlog/task-add-core-gameplay-test-coverage.md`

## Acceptance Criteria
- The web app runs fully client-side and presents a readable central playfield with an adjacent next-piece preview on desktop and mobile layouts.
- Gameplay uses the seven standard tetrominoes and supports automatic falling, valid movement, valid rotation, soft drop, locking, line clearing, and next-piece spawning.
- Invalid movement or rotation inputs do not change board state, and game-over blocks further gameplay input until restart.
- A blocked spawn immediately produces a visible game-over state, and restart resets the board, active piece, preview, and session state.
- Automated tests cover deterministic gameplay behaviors for movement, collisions, line clearing, game-over detection, and restart behavior.

## Notes
- Keep v1 limited to the documented scope; exclude accounts, persistence, multiplayer, hold, hard drop, pause, scoring, levels, and speed progression.
- Prefer separating pure game-state logic from rendering and input handling so deterministic behavior is easier to test.
- Sequence engine work before control integration and final UI-state flows.

## Estimation
- Estimated effort: 128-290 hours total; 198 hours most likely.
- Confidence: Medium.
- Scope basis: Roll-up estimate covering all child issues required to deliver the epic end-to-end: game shell UI, deterministic board and piece engine, falling and rotation, locking and line clears, game-over and restart flow, desktop and mobile controls, and core gameplay test coverage. Child estimates were treated as dependency-inclusive layers to avoid double counting.
- Assumptions:
  - v1 is a fully client-side JavaScript/React/Vite/Tailwind web app deployed as static assets on Vercel.
  - Scope stays limited to core Tetris gameplay only: seven tetrominoes, auto-fall, move left/right, clockwise rotate, soft drop, next-piece preview, locking, line clears, game over, and restart.
  - Persistence, accounts, multiplayer, scoring, levels, hold, hard drop, pause, audio, analytics, and advanced wall-kick behavior remain out of scope.
- Key effort drivers:
  - Deterministic reducer-based engine and seeded 7-bag implementation.
  - Gameplay rule completeness across movement, rotation, locking, line clears, preview progression, and blocked spawn handling.
  - Shared keyboard and touch action model with responsive UI wiring.
  - Automated validation across unit, component, and browser layers.
  - CI and static deployment setup inside a repo currently oriented around a different product.
- Risks:
  - Rotation-rule interpretation may expand beyond the documented simple behavior.
  - Mobile touch and soft-drop behavior may require extra browser-specific debugging.
  - Timing-sensitive Playwright coverage may be flaky until test controls are stabilized.
  - DOM-grid rendering may need optimization on lower-end devices.
- Validation focus:
  - Deterministic engine tests for movement, collision, gravity, locking, line clears, game over, and restart.
  - UI/component checks for playfield, preview, status, and visible controls.
  - Browser verification for desktop keyboard and mobile touch parity, responsive layout, and restart from game over.
  - Green `npm run lint`, `npm test`, and `npm run build` gates plus deployment configuration review.
