# Feature: Support Desktop And Mobile Controls

## Summary
Provide in-scope control surfaces for keyboard play on desktop and touch-accessible controls on mobile.

## Epic Reference
- `/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/docs/backlog/epic-basic-tetris-web-game.md`

## Specification Reference
- `docs/specs/SPEC_001.md`

## Description
- Map desktop keyboard input to move left, move right, rotate, and soft drop during active play.
- Provide touch-accessible controls for move left, move right, rotate, soft drop, and restart on mobile layouts.
- Ensure controls respect active and game-over state rules so blocked inputs do not alter gameplay incorrectly.
- Keep the control model limited to the documented v1 actions only.

## Acceptance Criteria
- Desktop gameplay supports keyboard input for move left, move right, rotate, and soft drop.
- Mobile gameplay exposes touch-accessible controls for move left, move right, rotate, soft drop, and restart.
- Inputs do not change gameplay state when the relevant action is invalid or when the game is over.
- No out-of-scope controls such as hold, hard drop, or pause are added.

## Dependencies
- Build Tetris Game Shell UI
- Add Falling Movement And Rotation
- Add Game Over And Restart Flow

## Notes
- Use the same underlying gameplay actions for keyboard and touch to keep behavior consistent.

## Estimation
Estimated effort: **108-238 hours total** with **162 hours most likely**.
Confidence: **Medium**.

Scope basis: This is a roll-up estimate. Delivering desktop keyboard and mobile touch controls depends on the already-related shell UI, falling and rotation flow, locking and line-clear progression, and game-over/restart behavior being present and integrated. The prior `Add Game Over And Restart Flow` estimate already carries that dependency chain, so this feature adds the incremental control-surface, shared action-mapping, accessibility, and browser-validation work needed to complete controls end-to-end.

Assumptions:
- Keyboard support is limited to move left, move right, rotate clockwise, and press/release soft drop.
- Mobile exposes only left, right, rotate, soft drop, and restart as visible touch controls.
- Keyboard and touch dispatch the same underlying gameplay actions through the controller layer.
- No out-of-scope controls such as hold, hard drop, pause, scoring, levels, or persistence are added.

Effort drivers:
- Shared controller work to keep keyboard and touch behavior identical for valid, invalid, and blocked inputs.
- Mobile touch handling for soft-drop press/release semantics and browser-default suppression.
- Responsive, accessible control-surface implementation within the existing shell UI.
- Component and Playwright coverage for desktop/mobile control parity, restart, and game-over gating.

Risks:
- Mobile browser touch behavior, especially Safari, may add debugging time around touch start/end and prevented defaults.
- Timing-sensitive browser tests can become flaky without tightly controlled seeds, timers, and assertions.
- Web-game control wiring may see some integration friction because the repository currently originates from a VS Code extension codebase.

Validation focus:
- Verify keyboard controls only affect gameplay during valid running-state conditions.
- Verify touch controls are accessible, labeled, and parity-match keyboard behavior.
- Verify game-over blocks gameplay inputs while restart remains available.
- Run `npm run lint`, `npm test`, and desktop/mobile Playwright flows that cover keyboard, touch, restart, and invalid-input behavior.
