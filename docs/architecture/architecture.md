# Basic Tetris Web Game Architecture

## Executive Summary
This project should be implemented as a fully client-side single-page web application that recreates the basic Tetris gameplay loop defined in docs/specs/SPEC_001.md. The concrete solution is a modular frontend monolith built with JavaScript, React, Vite, and Tailwind CSS. Runtime gameplay logic lives in a deterministic, side-effect-free game engine module. Rendering, input handling, and timing orchestration sit above that engine and translate player actions into pure state transitions.

This architecture deliberately avoids a backend for v1 because the specification makes backend connectivity out of scope. The deployment target is a static site hosted on Vercel with CDN delivery. Quality is enforced through unit tests for the engine, component tests for UI wiring, and browser-level end-to-end coverage for keyboard, touch, restart, and responsive behavior.

## Requirements Summary

### Functional Requirements
- Deliver a browser-based single-player Tetris-style game.
- Render one central playfield and one next-piece preview.
- Support the seven standard tetrominoes.
- Automatically advance the active piece downward during active play.
- Support valid move-left, move-right, rotate, and soft-drop actions.
- Ignore invalid movement and rotation requests.
- Lock pieces when they can no longer descend.
- Detect and clear all completed lines in the same resolution step.
- Shift rows above cleared lines downward immediately.
- Maintain exactly one upcoming tetromino preview.
- End the game immediately when a new piece cannot spawn.
- Block gameplay input while the game-over state is active.
- Provide visible start and restart affordances.
- Support desktop keyboard controls and mobile touch controls.
- Exclude accounts, persistence across sessions, multiplayer, hold, hard drop, pause, scoring, levels, and speed progression.

### Non-Functional Requirements
- Keep the experience simple and readable for first-time players.
- Remain fully client-side in v1 with no backend dependency.
- Be responsive across desktop and mobile layouts.
- Keep core gameplay deterministic and testable.
- Keep runtime performance smooth on modern desktop and mobile browsers.

### Explicit Quality Targets
The source documents do not define numeric targets, so the implementation should use these pragmatic v1 targets:
- Initial interactive render: under 2 seconds on a mid-tier mobile device over a warm CDN path.
- Input-to-visual-update latency: under 50 ms perceived latency for keyboard and touch actions.
- Game tick processing: under 4 ms per reducer step on typical laptop/mobile hardware.
- Browser support: latest two stable versions of Chrome, Edge, Safari, and Firefox.
- Availability target: 99.9% static-site availability, excluding local browser/device failures.

## Assumptions And Constraints
- The architecture bundle targets the new web game described in docs/project_description and docs/specs, even though the repository currently contains a VS Code extension codebase.
- The optional architecture guideline stating use JS for frontend, Python for backend and Go for CLI tools is treated as a technology preference. Because the spec explicitly forbids backend services in v1, no Python backend or Go CLI is part of this release.
- Tailwind CSS is mandatory for styling.
- The standard board size is assumed to be 10 columns by 20 visible rows.
- Rotation is assumed to be a single clockwise action in v1 because the spec requires rotation but does not require multiple rotation buttons or advanced wall-kick behavior.
- Piece generation uses a seeded 7-bag randomizer so gameplay is deterministic in tests while still feeling fair to players.
- Session state is in-memory only. localStorage, cookies, remote APIs, and analytics persistence are excluded from v1.
- The initial screen starts in an idle state with a visible start action. Restart is always available as a visible control.
- Audio, haptics, and achievements are excluded because they are not in scope.

## Chosen Architecture Style And Rationale
The chosen style is a modular client-side monolith with layered boundaries:
- Domain layer: pure game rules and state transitions.
- Application layer: game loop orchestration, input mapping, and session lifecycle.
- Presentation layer: React components that render derived state only.
- Platform layer: browser timing, DOM events, and static hosting.

This is the right fit because:
- The product is a single browser game with no server-side workflow.
- The most important complexity is deterministic state management, not distributed systems.
- A modular monolith preserves simplicity while giving agents clean seams for parallel implementation.
- The architecture keeps future expansion possible without paying the cost of premature service boundaries.

This architecture explicitly rejects microservices, backend APIs, and data stores for v1 because they add operational complexity without solving a current requirement.

## High-Level Architecture Diagram
~~~text
┌──────────────────────────────────────────────────────────────────────┐
│                              Browser                                 │
│                                                                      │
│  ┌─────────────────────── React UI Layer ──────────────────────────┐ │
│  │ AppShell                                                        │ │
│  │ BoardView   NextPiecePreview   Controls   StatusBanner          │ │
│  └───────────────▲───────────────────────────────▲─────────────────┘ │
│                  │ derived render state          │ user intents       │
│  ┌───────────────┴────────────── Application Layer ────────────────┐ │
│  │ GameController                                                   │ │
│  │ - starts session                                                 │ │
│  │ - schedules ticks                                                │ │
│  │ - maps keyboard/touch to domain actions                          │ │
│  │ - blocks input when idle/game_over rules require it              │ │
│  └───────────────▲───────────────────────────────┬─────────────────┘ │
│                  │ pure actions/state            │ clock + browser    │
│  ┌───────────────┴───────────────── Domain Layer ┴─────────────────┐ │
│  │ Deterministic Game Engine                                       │ │
│  │ - tetromino catalog                                             │ │
│  │ - seeded 7-bag generator                                        │ │
│  │ - movement/rotation validation                                  │ │
│  │ - gravity + soft-drop resolution                                │ │
│  │ - locking + line clear resolution                               │ │
│  │ - spawn + game-over detection                                   │ │
│  │ - selectors for render-ready board and preview                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘

Build/Release Path:
Developer -> GitHub -> CI (lint, unit, component, e2e, build) -> Vercel Static Deploy -> CDN -> Browser
~~~

## Component And Service Responsibilities

### 1. Presentation Layer
Recommended modules:
- src/app/App.jsx: top-level composition and provider wiring.
- src/ui/components/GameShell.jsx: responsive layout and visible game regions.
- src/ui/components/BoardView.jsx: renders the 10x20 board grid from selector output.
- src/ui/components/NextPiecePreview.jsx: renders the single upcoming tetromino preview.
- src/ui/components/GameControls.jsx: mobile touch controls plus start/restart controls.
- src/ui/components/GameStatusBanner.jsx: idle and game-over overlays/messages.

Responsibilities:
- Render state provided by selectors.
- Expose accessible controls with clear labels.
- Avoid embedding gameplay rules.
- Stay resilient to frequent state updates.

### 2. Application Layer
Recommended modules:
- src/game/app/useGameController.js
- src/game/app/useKeyboardControls.js
- src/game/app/useTouchControls.js
- src/game/app/gameLoop.js

Responsibilities:
- Create and own the current GameState for the active browser session.
- Translate browser events into domain actions.
- Drive periodic TICK events based on elapsed time.
- Manage soft-drop pressed state for keyboard and touch.
- Start and restart sessions with explicit seeds.
- Prevent input dispatch while the domain phase is idle or game_over when appropriate.

### 3. Domain Layer
Recommended modules:
- src/game/core/constants.js
- src/game/core/tetrominoes.js
- src/game/core/randomizer.js
- src/game/core/collision.js
- src/game/core/reducer.js
- src/game/core/lineClear.js
- src/game/core/spawn.js
- src/game/core/selectors.js
- src/game/core/initialState.js

Responsibilities:
- Define the seven standard tetrominoes and rotation states.
- Represent the board and active piece.
- Validate movement, rotation, descent, and spawn rules.
- Resolve lock, line clear, board compaction, next-piece promotion, and game-over.
- Expose pure selectors that produce render-ready data.
- Never touch the DOM, timers, or browser APIs.

### 4. Platform And Delivery Layer
Responsibilities:
- Build the app into static assets.
- Serve the app through Vercel's static hosting/CDN path.
- Apply security headers.
- Run CI validation before deployment.

## Data Architecture And Storage Design

### Runtime State Model
The application has a single authoritative in-memory state object. No persisted runtime database exists in v1.

~~~js
{
  phase: 'idle' | 'running' | 'game_over',
  board: Cell[20][10],
  activePiece: {
    kind: 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L',
    rotationIndex: number,
    origin: { x: number, y: number }
  } | null,
  nextPieceKind: PieceKind | null,
  bagQueue: PieceKind[],
  rngSeed: number,
  timing: {
    fallIntervalMs: number,
    softDropIntervalMs: number,
    accumulatedMs: number,
    softDropActive: boolean
  },
  lastResolvedEvent: {
    linesCleared: number,
    pieceLocked: boolean
  }
}
~~~

### Storage Rules
- The board is the source of truth for locked cells only.
- The active piece is stored separately and merged with the board only in selectors for rendering.
- The next-piece preview is derived from nextPieceKind.
- The randomizer queue is stored in state so tests can assert deterministic progression.
- No browser persistence is allowed in v1.
- No cookies, session storage, IndexedDB, or remote storage are allowed.

### Static Assets
- Tailwind-generated CSS bundle.
- Optional icon/logo assets.
- No large media assets are required for v1.

## Integration And API Boundaries

### Internal Domain API Boundary
The domain engine should expose a minimal, stable API:

~~~js
createInitialGameState({ seed })
reduceGameState(state, action)
selectBoardCells(state)
selectNextPieceCells(state)
selectGameStatus(state)
~~~

### Domain Action Contract
Expected actions:
- START_GAME
- RESTART_GAME
- TICK
- MOVE_LEFT
- MOVE_RIGHT
- ROTATE_CW
- SET_SOFT_DROP

Rules:
- Each action is a plain JavaScript object.
- Reducers must be pure and deterministic.
- Invalid actions must return the current valid state, not a partial mutation.
- UI components and hooks may dispatch actions but must not mutate state directly.

### External API Boundary
There is no runtime backend API in v1.
- No fetch calls are required for core gameplay.
- No authentication or profile endpoints exist.
- No persistence or leaderboard endpoints exist.

If future phases add analytics, persistence, or multiplayer, those integrations must be introduced behind separate ports and ADRs rather than being scaffolded now.

## Infrastructure And Deployment Topology
Chosen topology: static SPA deployment on Vercel.

~~~text
┌──────────────┐      git push / PR      ┌─────────────────────────────┐
│  Developer   │ ─────────────────────▶ │ GitHub Repository           │
└──────────────┘                         └──────────────┬──────────────┘
                                                        │
                                                        ▼
                                         ┌─────────────────────────────┐
                                         │ CI Pipeline                │
                                         │ - npm ci                   │
                                         │ - lint                     │
                                         │ - unit/component tests     │
                                         │ - e2e tests                │
                                         │ - production build         │
                                         └──────────────┬──────────────┘
                                                        │ successful build
                                                        ▼
                                         ┌─────────────────────────────┐
                                         │ Vercel Static Deployment   │
                                         │ - immutable assets         │
                                         │ - preview per PR           │
                                         │ - production alias         │
                                         └──────────────┬──────────────┘
                                                        │ CDN edge cache
                                                        ▼
                                                 ┌─────────────┐
                                                 │   Browser   │
                                                 └─────────────┘
~~~

### Build Tooling
- Bundler: Vite.
- UI library: React.
- Styling: Tailwind CSS.
- Package manager: npm.
- Test runner: Vitest.
- Browser E2E: Playwright.

### Deployment Notes
- Use SPA routing fallback even though v1 likely has a single route.
- Emit hashed static assets for cache safety.
- Keep deployment immutable and rollback-friendly.
- No serverless functions should be configured in v1.

## Security, Privacy, And Compliance Considerations

### Security Controls
- Apply a strict Content Security Policy that allows only self-hosted scripts/styles needed by the built app.
- Set X-Content-Type-Options: nosniff, Referrer-Policy: no-referrer, and a restrictive Permissions-Policy.
- Do not include third-party scripts, ads, or trackers in v1.
- Keep dependencies pinned through the lockfile and run dependency scanning in CI.
- Sanitize any future user-provided text before rendering; v1 does not accept freeform text input.

### Privacy
- No account data, PII, cookies, or persistent identifiers are collected in v1.
- Runtime state remains in memory for the current tab only.
- Because no personal data is processed, compliance burden is low, but secure-default web practices still apply.

### Compliance Posture
- No explicit regulated-data obligations are triggered by v1 scope.
- OSS license attribution for dependencies must still be respected.
- Accessibility should meet practical WCAG 2.1 AA expectations for keyboard focus, button labels, and visible contrast even though formal compliance is not stated in the spec.

## Reliability, Scalability, And Observability Strategy

### Reliability
- The game is fully playable after the initial asset load because it has no backend dependency.
- The reducer is the single source of truth for gameplay rules, reducing state divergence.
- Restart creates a fresh state instance, which is the primary recovery mechanism for runtime corruption.
- Invalid moves fail closed by leaving state unchanged.

### Scalability
- Static hosting and CDN distribution scale horizontally without application changes.
- The UI renders a small bounded grid, so DOM-based rendering is sufficient for v1.
- No server bottlenecks exist because there is no backend.

### Observability
Use lightweight observability appropriate for a static client app:
- Development logging: structured console logs behind a development flag.
- Error capture: React error boundary plus global window.onerror and unhandledrejection hooks that surface issues in preview builds.
- Test observability: Playwright screenshots, videos, and traces on failure plus coverage reports from Vitest.
- Build observability: CI status checks for lint, tests, and build artifacts.

Do not add third-party telemetry vendors in v1 unless the product owner explicitly expands scope.

## Testing And Release Strategy

### Test Pyramid
1. Unit tests for domain logic.
   - Tetromino rotation validity.
   - Collision detection against walls and locked blocks.
   - Gravity stepping and soft-drop timing.
   - Locking and line-clear resolution.
   - Spawn blocking and game-over transitions.
   - Restart reset semantics.
2. Component tests for presentation and controller wiring.
   - Board and preview render from derived state.
   - Idle and game-over overlays.
   - Touch control dispatch behavior.
3. End-to-end tests for real browser behavior.
   - Desktop keyboard flow.
   - Mobile viewport touch controls.
   - Restart from game over.
   - Responsive layout checks.

### Release Gates
Minimum gate before merge or release:
- npm run lint
- npm test
- npm run build

Recommended pipeline details:
- Run unit and component tests on every push.
- Run Playwright on pull requests and main-branch merges.
- Publish Vercel preview deployments for PR validation.
- Promote to production only from the main branch after green CI.

## Implementation Guidance For Downstream Agents

### Recommended Directory Structure
~~~text
src/
  app/
    App.jsx
  game/
    app/
      gameLoop.js
      useGameController.js
      useKeyboardControls.js
      useTouchControls.js
    core/
      actions.js
      collision.js
      constants.js
      initialState.js
      lineClear.js
      randomizer.js
      reducer.js
      selectors.js
      spawn.js
      tetrominoes.js
  ui/
    components/
      BoardView.jsx
      GameControls.jsx
      GameShell.jsx
      GameStatusBanner.jsx
      NextPiecePreview.jsx
  styles/
    index.css
  test/
    unit/
    component/
    e2e/
~~~

### Recommended Delivery Sequence
1. Scaffold Vite + React + Tailwind CSS in JavaScript.
2. Implement the pure domain engine and unit tests before any complex UI behavior.
3. Build the static game shell UI and preview panel.
4. Wire the game controller and tick loop to the engine.
5. Add keyboard and touch controls through the shared action layer.
6. Finish game-over and restart flows.
7. Add responsive refinements and browser-level verification.
8. Harden deployment, headers, and CI release gates.

### Definition Of Done For Each Feature Slice
- Domain behavior is covered by deterministic tests.
- UI renders only derived selector data.
- No out-of-scope features are introduced.
- Manual browser verification passes for desktop and mobile breakpoints.
- CI remains green.

## Risks, Trade-Offs, And Open Questions

### Risks
- React DOM rendering is simpler than canvas, but careless re-rendering can still cause jank on low-end devices.
  - Mitigation: keep state normalized, render bounded grids, and avoid unnecessary component state.
- Soft-drop behavior can feel inconsistent across keyboard and touch if key and touch release handling is sloppy.
  - Mitigation: model soft drop as explicit pressed state and cover it in browser tests.
- Rotation behavior may be interpreted differently by stakeholders because advanced wall kicks are not specified.
  - Mitigation: implement the documented simple validity rule now and record the assumption in ADRs.

### Trade-Offs
- Choosing a client-only architecture maximizes simplicity and delivery speed but intentionally gives up persistence, analytics, and multiplayer extensibility in v1.
- Choosing React + DOM grid over canvas favors readability and testing over absolute rendering efficiency.
- Choosing a seeded 7-bag generator improves fairness and testability but is slightly more opinionated than a purely random piece stream.

### Open Questions
There are no blocking open questions in the provided spec. The following assumptions should be treated as explicit design defaults unless product guidance changes later:
- 10x20 board size.
- One clockwise rotate action only.
- 7-bag randomizer instead of naive random spawn.
- No persistence, audio, or analytics in v1.
