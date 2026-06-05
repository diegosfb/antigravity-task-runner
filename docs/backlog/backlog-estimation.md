# Backlog Estimation Report

## Scope Notes
- Each backlog item estimate reflects the total effort required to deliver that item in the target architecture and tech stack.
- Items with dependencies or child issues contemplate prerequisite scope. Parent items and their children should not be summed naively as a single portfolio total.

## Inputs
- Project description directory: `/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/docs/project_description`
- Architecture directory: `/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/docs/architecture`
- Architecture guideline files: 0
- Backlog directory: `/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/docs/backlog`
- Overall estimation document: `/Users/diego.brihuega/Documents/Projects/antigravity-task-runner/docs/estimation/estimation.md`

## Item Estimates
### Feature: Build Tetris Game Shell UI
- File: `docs/backlog/feature-build-tetris-game-shell-ui.md`
- Estimate: 16-36 hours total (24 hours most likely)
- Confidence: Medium-High
- Scope basis: Estimated as the presentation-layer slice for the Tetris web app: React/Vite/Tailwind shell setup, central playfield and next-piece preview components, visible start/restart affordances, and responsive layout hooks. Engine rules, falling behavior, controls, and deeper gameplay coverage are excluded to related backlog items, but this estimate includes the interface seams and UI validation needed so those items can attach without rework.

#### Assumptions
- This feature owns the initial SPA shell and presentational components, not deterministic gameplay logic.
- The board and preview can be rendered from placeholder or selector-driven props without implementing movement, locking, or line clears.
- Only the v1 shell is in scope: central playfield, single next-piece preview, and visible start/restart controls.
- Responsive support targets modern desktop and mobile browsers with Tailwind-based layout and accessible labels/focus states.
- Out-of-scope systems such as scoring, levels, hold, pause, multiplayer, and persistence remain excluded.

#### Effort Drivers
- Scaffolding or isolating the React/Vite/Tailwind web app inside a repository that currently houses a VS Code extension.
- Building clean, prop-driven board, preview, shell, and status components that do not absorb gameplay rules.
- Designing a responsive layout that keeps the playfield central and the preview/controls readable on small screens.
- Establishing UI contracts and layout hooks so later controller and engine work can integrate with minimal churn.
- Adding component-level validation for visible shell states and scope guardrails.

#### Risks
- Repository build/setup conflicts may add time if the new web app needs isolation from existing extension workflows.
- Premature assumptions about engine state shape can cause rework when deterministic reducer APIs are finalized.
- Mobile layout and touch-safe control spacing may require extra iteration to stay readable without exposing out-of-scope UI.
- DOM-grid presentation can become noisy or brittle if the shell is not kept strictly presentational.

#### Validation Focus
- Verify the initial screen renders a central playfield, next-piece preview, and visible start or restart affordance.
- Verify desktop and mobile layouts keep the shell readable and usable at expected breakpoints.
- Verify the UI does not expose scoring, levels, hold, multiplayer, or other excluded systems.
- Verify components render from props/selectors cleanly so later gameplay wiring does not require structural rework.
- Run lint, component tests, and build validation for the new shell slice.

### Task: Implement Deterministic Board And Piece Engine
- File: `docs/backlog/task-implement-deterministic-board-and-piece-engine.md`
- Estimate: 44-92 hours total; 64 hours most likely
- Confidence: Medium
- Scope basis: Estimate rolls up the prerequisite Build Tetris Game Shell UI needed to wire and validate the engine in the intended React/Vite/Tailwind architecture, plus the task’s own deterministic engine and unit-testable domain scope. Later features for controller timing, locking/line clears, game-over, mobile controls, and broader gameplay test coverage are excluded except for foundational seams this task must provide.
- Related scope considered: Feature: Build Tetris Game Shell UI

#### Assumptions
- The dependency feature Build Tetris Game Shell UI is not yet complete, so its delivery effort is included as prerequisite scope.
- This task delivers the pure domain engine foundation only: board model, tetromino catalog, seeded 7-bag/randomizer behavior, spawn rules, collision checks, deterministic reducer/state transitions, and selectors or interfaces needed for non-DOM tests.
- Full gameplay loop orchestration, browser timer handling, keyboard/touch bindings, lock resolution, line clears, preview progression after lock, and game-over/restart flows are handled in later backlog items.
- JavaScript, React, Vite, and Tailwind remain mandatory, and gameplay logic stays isolated under the domain layer per the architecture guidance.
- Deterministic unit coverage for engine rules is included to satisfy the acceptance criterion that the engine be testable without DOM interaction.

#### Effort Drivers
- Designing a durable game-state shape that supports later falling, locking, clear, and restart features without rework.
- Encoding all seven tetromino rotation states and spawn behavior with deterministic seeded piece sequencing.
- Implementing collision and validity logic for boundaries, locked cells, rotation, and downward stepping while keeping invalid actions as no-ops.
- Keeping strict separation between pure engine code and UI/controller code so tests can run without browser coupling.
- Adding behavior-oriented unit tests for spawn, sequence determinism, bounds, and collision semantics.

#### Risks
- Rotation behavior may need rework if stakeholder expectations drift toward modern wall-kick behavior rather than the documented simple clockwise validity rule.
- Poor initial state or action design could force later refactors when locking, line clears, and game-over features are added.
- Seeded randomizer and next-piece state can create subtle determinism bugs if queue mutation is not modeled carefully.
- Because the repository currently centers on a VS Code extension, project scaffolding and test setup for the web game may introduce incidental integration overhead.

#### Validation Focus
- Unit tests for seeded piece generation, bag refill behavior, and reproducible spawn order.
- Unit tests for spawn validity at initial positions and blocked-spawn edge cases relevant to later game-over work.
- Unit tests for left/right movement, rotation validation, downward stepping, and locked-cell collision no-op behavior.
- Verification that engine APIs stay pure, serializable, and DOM-independent so later UI/controller layers consume them cleanly.
- Minimum quality gate coverage needed so subsequent gameplay features can build on stable engine contracts.

### Feature: Add Falling Movement And Rotation
- File: `docs/backlog/feature-add-falling-movement-and-rotation.md`
- Estimate: 62-132 hours total; 92 hours most likely
- Confidence: Medium
- Scope basis: Estimate rolls up the dependent Implement Deterministic Board And Piece Engine scope because this feature cannot be delivered or validated without that prerequisite. The dependency already contemplated the shell UI needed for wiring, so this estimate adds the falling/movement/rotation controller and rule work on top of that foundation, but excludes later locking/line-clear, game-over, mobile-control, and broader gameplay coverage slices.
- Related scope considered: Task: Implement Deterministic Board And Piece Engine

#### Assumptions
- The prerequisite engine task is still required and not already completed in a reusable state.
- Implementation follows the documented React/Vite/Tailwind SPA with a pure reducer-style game engine and thin controller layer.
- Rotation is simple clockwise validation only, with no advanced wall-kick behavior.
- Base fall and soft-drop timing must be deterministic enough for unit and component testing, but no speed progression is included.
- Desktop-oriented wiring and focused tests for gravity, movement, rotation, and soft drop are in scope; later mobile parity and full gameplay coverage remain separate backlog items.

#### Effort Drivers
- Adding elapsed-time tick orchestration outside the reducer while preserving deterministic state transitions.
- Implementing valid left/right movement, clockwise rotation, and soft-drop semantics without mutating invalid states.
- Keeping controller/input wiring separate from domain logic per ADR-002 and development guidelines.
- Writing regression tests for gravity cadence, invalid move no-ops, rotation validity, and soft-drop acceleration.
- Integrating the feature into the existing shell and engine seams without leaking gameplay rules into React components.

#### Risks
- If the prerequisite engine lacks clean action/state boundaries, falling and input work may require refactoring before feature logic can be added.
- Timing behavior can create flaky tests or browser-specific issues if elapsed-time handling is not deterministic.
- Rotation expectations may drift toward modern Tetris wall-kick behavior, which would expand scope beyond the stated acceptance criteria.
- Frequent board updates can expose unnecessary rerendering in the DOM-grid UI and add stabilization time during integration.

#### Validation Focus
- Unit tests for TICK handling, move-left/right validity, rotate validity, invalid action no-ops, and soft-drop timing.
- Component or controller tests proving browser input dispatch maps to shared domain actions without direct state mutation.
- Manual desktop verification that active pieces auto-fall, respond to valid inputs, and ignore invalid moves without visual corruption.
- Regression checks that this slice does not prematurely implement locking, line clears, game over, or out-of-scope controls.

### Feature: Implement Locking Line Clears And Preview Progression
- File: `docs/backlog/feature-implement-locking-line-clears-and-preview-progression.md`
- Estimate: 80-174 hours total; 120 hours most likely
- Confidence: Medium
- Scope basis: Estimate rolls up the dependent Add Falling Movement And Rotation scope because locking, line-clear resolution, and preview progression cannot be delivered or validated without the existing deterministic engine, shell wiring, gravity loop, and movement/rotation behavior already in place. The dependency already includes the underlying board/piece engine and shell UI, so this estimate adds only the incremental lock, clear, compaction, preview advancement, and direct regression coverage needed to complete this feature end-to-end.
- Related scope considered: Task: Implement Deterministic Board And Piece Engine, Feature: Add Falling Movement And Rotation

#### Assumptions
- The prior dependency estimate for Add Falling Movement And Rotation already includes the prerequisite deterministic engine and shell UI foundation.
- Locking occurs immediately once downward movement is no longer valid; no delayed lock timer, scoring, combo logic, or speed progression is introduced.
- Line clears must resolve in a single deterministic reducer step, including multi-line clears and immediate board compaction.
- Exactly one next-piece preview is maintained, and preview progression remains driven by the seeded 7-bag state already defined by the architecture.
- Game-over blocked-spawn handling is deferred to the later Add Game Over And Restart Flow feature, except for keeping clean seams so this feature can hand off correctly.

#### Effort Drivers
- Implementing pure reducer logic that merges the active piece into locked board state without mutating authoritative game state.
- Resolving single-line and multi-line clear detection plus row compaction in one step while preserving deterministic behavior.
- Promoting next piece to active piece and advancing preview state correctly from the seeded bag queue.
- Keeping controller/UI wiring aligned with the reducer so lock and post-clear progression render correctly without leaking rules into React components.
- Adding focused regression tests for lock resolution, multi-line clears, board shift behavior, and preview advancement edge cases.

#### Risks
- Multi-line clear and compaction bugs are easy to introduce if row removal order or board rebuild logic is incorrect.
- Preview progression can desynchronize from the bag queue if spawn and clear resolution responsibilities are split poorly across modules.
- Lock resolution sits on a timing boundary with falling logic, so reducer/controller ownership mistakes can create duplicate locks or missed spawns.
- Current scope stops short of full game-over flow, so unclear boundaries around blocked spawn handoff could cause rework in the next feature.

#### Validation Focus
- Unit tests for lock-on-blocked-descent behavior and correct board merge semantics.
- Deterministic tests for clearing one or more full rows in the same resolution step and shifting rows above downward immediately.
- Regression tests for next-piece promotion and preview refresh after normal locks and after multi-line clears.
- Component or controller checks that rendered board and preview state reflect post-lock progression without extra UI-only state.

### Feature: Add Game Over And Restart Flow
- File: `docs/backlog/feature-add-game-over-and-restart-flow.md`
- Estimate: 92-202 hours total; 138 hours most likely
- Confidence: Medium
- Scope basis: Roll-up estimate includes the dependent `Implement Locking Line Clears And Preview Progression` feature because blocked-spawn detection and restart cannot be delivered or validated until lock resolution, line clears, preview advancement, and continued spawn progression already exist. Using the prior dependency estimate of 80-174 hours total / 120 hours most likely, this feature adds an incremental 12-28 hours for blocked-spawn transitions, UI/controller gating, restart reset behavior, and direct regression coverage.
- Related scope considered: Feature: Implement Locking Line Clears And Preview Progression

#### Assumptions
- The app follows the documented client-only React, Vite, Tailwind, reducer-driven architecture with no backend or persistence.
- Dependency scope for deterministic engine, falling movement, locking, line clears, and preview progression is required and included in the roll-up.
- Restart resets in-memory session state only, including board, active piece, next piece, bag queue, timing state, and phase state.
- Game-over UX is limited to visible status and restart affordance inside the existing game shell, not new out-of-scope systems like scoring, pause, or save state.

#### Effort Drivers
- Reducer changes for blocked-spawn detection with no overlapping or partial spawn render.
- Controller and input gating so move, rotate, tick, and soft-drop actions no-op while `game_over` is active.
- Restart path must recreate a clean authoritative state, including deterministic randomizer and timing fields, without leaking prior-session state.
- Test coverage for spawn-block, input blocking, and full-session reset across unit and UI wiring layers.

#### Risks
- Spawn-block detection can be subtly wrong if it is evaluated after partial state mutation instead of as an atomic spawn decision.
- Restart semantics may be ambiguous around whether to reseed or reinitialize the bag exactly like a fresh session, which affects deterministic tests.
- Controller timers or held-input state may continue dispatching after game over unless lifecycle cleanup is handled carefully.
- If dependency behavior changes around post-lock spawn timing, game-over detection may need rework at the reducer/controller boundary.

#### Validation Focus
- Unit tests for blocked spawn entering `game_over` immediately and preventing partial piece placement.
- Unit tests for `RESTART_GAME` fully resetting board, active piece, preview, queue, timing, and phase.
- Component or controller tests proving gameplay inputs do not mutate state while game over is active and restart returns to playable state.
- Project quality gates: `npm run lint`, `npm test`, and `npm run build`.

### Feature: Support Desktop And Mobile Controls
- File: `docs/backlog/feature-support-desktop-and-mobile-controls.md`
- Estimate: 108-238 hours total; 162 hours most likely
- Confidence: Medium
- Scope basis: Roll-up estimate that includes prerequisite delivery needed to make controls real and testable end-to-end. The prior `Add Game Over And Restart Flow` estimate already subsumes the earlier shell, engine, falling, locking, and restart dependency chain, so this item adds the incremental keyboard, touch, accessibility, and browser-validation scope on top.
- Related scope considered: Feature: Build Tetris Game Shell UI, Feature: Add Falling Movement And Rotation, Feature: Add Game Over And Restart Flow

#### Assumptions
- Keyboard scope is limited to move left, move right, rotate clockwise, and press/release soft drop.
- Mobile scope is limited to left, right, rotate, soft drop, and restart with large labeled touch targets.
- Keyboard and touch both dispatch the same domain actions through the controller layer.
- No out-of-scope controls such as hold, hard drop, pause, scoring, or persistence are introduced.

#### Effort Drivers
- Shared input-controller wiring so desktop and mobile stay behaviorally identical.
- Touch interaction work for press/release soft-drop semantics and preventing browser scroll/gesture conflicts.
- Responsive and accessible control-surface design that fits the existing shell UI.
- Desktop and mobile browser validation, including Playwright coverage for control parity and game-over gating.

#### Risks
- Mobile Safari and other touch browsers can behave inconsistently on touch start/end and prevented defaults.
- Timing-sensitive browser tests may be flaky unless seeds, timers, and assertions are tightly controlled.
- Repository integration may be slower than expected because the repo currently centers on a VS Code extension while this scope targets a web game flow.

#### Validation Focus
- Verify keyboard controls only change state for valid actions during active play.
- Verify touch controls are visible, labeled, and behaviorally equivalent to keyboard actions.
- Verify invalid moves and game-over state do not allow control inputs to alter gameplay incorrectly.
- Run lint, unit/component tests, and desktop/mobile Playwright flows covering restart and input blocking.

### Task: Add Core Gameplay Test Coverage
- File: `docs/backlog/task-add-core-gameplay-test-coverage.md`
- Estimate: 112-242 hours total; 164 hours most likely
- Confidence: Medium
- Scope basis: Roll-up estimate includes the dependent Add Game Over And Restart Flow feature, which already rolls up Implement Locking Line Clears And Preview Progression, Add Falling Movement And Rotation, Implement Deterministic Board And Piece Engine, and the shell wiring needed to exercise gameplay in the React/Vite/Tailwind architecture. This task adds the incremental work to build and stabilize comprehensive deterministic gameplay coverage across reducer rules, seeded fixtures, and limited UI/controller checks required to validate control wiring.
- Related scope considered: Task: Implement Deterministic Board And Piece Engine, Feature: Add Falling Movement And Rotation, Feature: Implement Locking Line Clears And Preview Progression, Feature: Add Game Over And Restart Flow

#### Assumptions
- Vitest and the chosen JS test stack are already the approved test harness for unit and component coverage, with no framework change required.
- Prerequisite gameplay features are implemented close to the documented architecture, with pure engine seams and seeded state available for deterministic tests.
- UI-level checks stay narrow and only verify controller/action wiring or visible state transitions that pure engine tests cannot prove alone.
- Out-of-scope mechanics such as hard drop, hold, scoring, levels, pause, and persistence remain excluded from the coverage target.

#### Effort Drivers
- Broad reducer coverage is required across movement, collision rejection, rotation validity, gravity cadence, soft drop, locking, preview advancement, line clears, blocked spawn, and restart reset.
- Deterministic fixture design and seeded bag setup take real time because tests must be reproducible and easy to debug without DOM dependence.
- Some controller or UI wiring tests are still needed to prove inputs and restart/game-over gating reach the shared domain action layer correctly.
- Test stabilization in CI is part of the effort because timing-sensitive gameplay tests and browser-adjacent assertions can be flaky if not structured carefully.

#### Risks
- If earlier gameplay code leaks rules into React hooks or components, additional refactoring may be needed before reliable test coverage can be added.
- Timing and soft-drop behavior can create brittle tests if elapsed-time handling is not already isolated behind controllable seams.
- Rotation, lock timing, or next-piece semantics may still be interpreted differently than the backlog assumes, causing rework in both implementation and tests.
- The repository currently houses extension-oriented tooling, so adding browser-game test paths may expose configuration conflicts or slower-than-expected CI setup work.

#### Validation Focus
- Seeded unit tests for movement against walls and locked cells, plus invalid rotation no-op behavior.
- Reducer-level tests for gravity stepping, soft drop acceleration, piece locking, and deterministic next-piece progression.
- Regression tests for single-line and multi-line clear resolution with immediate board compaction.
- Blocked-spawn game-over tests and full restart reset assertions covering board, active piece, next piece, bag queue, timing state, and phase.
- Minimal component or controller tests that verify gameplay inputs are ignored in game_over and restart wiring returns the app to a fresh playable session.

### Epic: Basic Tetris Web Game
- File: `docs/backlog/epic-basic-tetris-web-game.md`
- Estimate: 128-290 hours total; 198 hours most likely
- Confidence: Medium
- Scope basis: Roll-up estimate that includes the full child-issue chain needed to deliver the epic end-to-end: shell UI, deterministic engine, falling and rotation, locking and line clears, game-over and restart, desktop and mobile controls, and core gameplay test coverage. Prior child estimates were treated as cumulative dependency layers rather than summed independently to avoid double counting already-rolled-up scope.
- Related scope considered: Feature: Build Tetris Game Shell UI, Task: Implement Deterministic Board And Piece Engine, Feature: Add Falling Movement And Rotation, Feature: Implement Locking Line Clears And Preview Progression, Feature: Add Game Over And Restart Flow, Feature: Support Desktop And Mobile Controls, Task: Add Core Gameplay Test Coverage

#### Assumptions
- The epic targets the new client-only Tetris web app described in the project docs, not the repository's existing VS Code extension product.
- v1 remains fully client-side using JavaScript, React, Vite, and Tailwind CSS, with static deployment on Vercel.
- Gameplay scope is limited to seven tetrominoes, auto-fall, left/right movement, clockwise rotation, soft drop, next-piece preview, locking, line clears, game over, and restart.
- Out-of-scope items remain excluded: persistence, accounts, multiplayer, scoring, levels, hold, hard drop, pause, audio, analytics, and advanced wall-kick behavior.
- Quality gates include deterministic unit tests, UI/component validation, browser coverage for desktop and mobile flows, and green lint/test/build automation.

#### Effort Drivers
- Designing a deterministic reducer-style engine with seeded 7-bag generation and clean domain/UI separation.
- Implementing movement, rotation, gravity, locking, line-clear compaction, spawn progression, and blocked-spawn game-over behavior without state divergence.
- Building responsive DOM-grid UI plus shared action mapping for keyboard and touch controls.
- Stabilizing automated coverage across unit, component, and Playwright layers for timing-sensitive gameplay flows.
- Integrating static deployment and CI quality gates in a repository that currently centers on a different product type.

#### Risks
- Rotation expectations may drift toward modern Tetris wall-kick behavior, causing reducer and test rework.
- Mobile touch semantics and browser default behavior can add cross-browser debugging time, especially for soft drop.
- Timing-sensitive end-to-end tests may be flaky until seeds, intervals, and assertions are tightly controlled.
- DOM-grid rerender patterns may need refinement if lower-end mobile devices show jank.
- Repo integration overhead may be higher than expected because the game is being added within an extension-oriented codebase.

#### Validation Focus
- Deterministic unit tests for spawn order, collision checks, movement validity, rotation validity, gravity cadence, locking, line clears, game over, and restart reset semantics.
- Component tests that verify board, preview, status messaging, and visible start/restart controls render from derived state only.
- Browser tests for desktop keyboard gameplay, mobile touch controls, control blocking during game over, and restart flow.
- Responsive verification on desktop and mobile breakpoints for readable layout and accessible controls.
- CI validation for npm lint, test, and build, plus static deployment configuration and security headers.
