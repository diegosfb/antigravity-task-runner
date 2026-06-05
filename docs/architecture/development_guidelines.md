# Development Guidelines

## Purpose
These guidelines are the implementation guardrails for the Basic Tetris Web Game. They are intentionally strict so multiple implementation agents can work in parallel without creating conflicting patterns.

## Scope And Baseline
- Use JavaScript for application code.
- Use React for UI composition.
- Use Tailwind CSS for styling.
- Keep v1 fully client-side.
- Do not introduce a backend, database, or external runtime API.

## Coding Rules

### Do
- Keep all gameplay rules inside src/game/core as pure functions.
- Keep React components small, focused, and mostly presentational.
- Use plain objects and arrays for domain state unless a different structure is measurably necessary.
- Use named exports for shared engine functions.
- Use JSDoc on public engine functions and state shapes to clarify contracts in a JavaScript codebase.
- Keep module boundaries obvious: domain, app/controller, UI, and styles.
- Use constants for board dimensions, fall intervals, and action names.

### Don't
- Do not place collision, line-clear, or spawn logic inside React components or hooks.
- Do not mutate the authoritative game state in place.
- Do not introduce Redux, Zustand, XState, or other state libraries unless an ADR explicitly replaces the chosen lightweight controller approach.
- Do not mix styling approaches; Tailwind is the default.
- Do not add TypeScript for isolated files while the rest of the implementation remains JavaScript.

## Data And State Rules

### Do
- Treat GameState as the single source of truth.
- Store locked board cells separately from the active piece.
- Keep the upcoming piece in state so preview rendering is deterministic.
- Keep the randomizer queue and seed in state so tests can reproduce exact sequences.
- Reset the entire session state on restart.

### Don't
- Do not duplicate gameplay state across multiple React states.
- Do not persist runtime state to localStorage, sessionStorage, cookies, IndexedDB, or remote services in v1.
- Do not derive board truth from the DOM.
- Do not let UI-only flags become authoritative gameplay state unless they affect rules and belong in the domain model.

## Input And Controller Rules

### Do
- Map keyboard and touch controls to the same domain actions.
- Handle soft drop as explicit pressed and released state.
- Block gameplay actions when the phase is game_over.
- Prevent browser default behavior for gameplay keys when necessary.
- Keep timer code in the application layer, not the domain layer.

### Don't
- Do not let DOM event handlers change board data directly.
- Do not run separate gameplay rule paths for keyboard and touch.
- Do not rely on frame-perfect rendering assumptions; controller code must handle elapsed time robustly.

## API And Boundary Rules

### Internal API
Required engine-facing functions:
- createInitialGameState({ seed })
- reduceGameState(state, action)
- selectBoardCells(state)
- selectNextPieceCells(state)
- selectGameStatus(state)

### Do
- Pass only serializable plain-object actions into the reducer.
- Keep selectors read-only and side-effect free.
- Keep browser APIs behind hooks or controller modules.

### Don't
- Do not add runtime HTTP calls for gameplay.
- Do not create service classes or repository abstractions for nonexistent backends.
- Do not let UI components import low-level collision helpers directly; go through controller and selectors where appropriate.

## Error Handling Rules

### Do
- Treat invalid moves and invalid rotations as normal outcomes that return unchanged state.
- Throw only for programmer errors or corrupted impossible states.
- Catch unexpected UI and controller errors with a React error boundary.
- Surface unexpected runtime errors in development logs and test artifacts.

### Don't
- Do not show browser alert dialogs for normal gameplay errors.
- Do not silently swallow impossible-state errors during development.
- Do not partially apply a state transition after a failed validation.

## Testing Rules

### Do
- Write unit tests for every rule in src/game/core.
- Use seeded test cases for deterministic sequence assertions.
- Add regression tests for every bug found in movement, rotation, line clearing, or restart flow.
- Add component tests for visible game-over and control states.
- Add Playwright coverage for desktop keyboard and mobile touch flows.
- Keep test names behavior-oriented and spec-traceable.

### Don't
- Do not depend on DOM-based tests for core gameplay rules that belong in pure unit tests.
- Do not ship features that only have manual verification when deterministic unit coverage is feasible.
- Do not mock the reducer in component tests unless the test is specifically about rendering static props.

## Observability Rules

### Do
- Keep console logging behind a development flag.
- Emit enough context in debug logs to reconstruct the last action and phase.
- Preserve Playwright traces, screenshots, and videos for failing browser tests.
- Fail CI loudly on lint, test, or build regressions.

### Don't
- Do not spam production console output on every tick.
- Do not add third-party analytics or telemetry SDKs in v1 without a new requirement and ADR.

## UI And Accessibility Rules

### Do
- Keep the playfield visually central and the next-piece preview adjacent on larger screens.
- Provide large, clearly labeled touch targets on mobile.
- Preserve keyboard accessibility for start and restart controls.
- Maintain visible focus states and contrast-safe color choices.
- Keep the interface free of out-of-scope controls.

### Don't
- Do not hide the only restart action behind a menu.
- Do not introduce scoring, hold, hard drop, pause, levels, or speed progression in v1.
- Do not require hover-only interactions.

## Deployment And Release Rules

### Do
- Keep the production output as static assets.
- Run npm run lint, npm test, and npm run build in CI before deployment.
- Use preview deployments for pull requests.
- Keep security headers configured at the hosting layer.
- Version releases only from a green main branch.

### Don't
- Do not deploy unreviewed feature branches directly to production.
- Do not make production-only code paths that bypass tests.
- Do not introduce serverless functions or backend env vars for v1.

## Anti-Patterns To Avoid
- A React component that contains its own board mutation logic.
- Separate keyboard and touch implementations that duplicate gameplay rules.
- Using random Math.random() directly inside reducers or tests.
- Recomputing complex board state imperatively in several places instead of using selectors.
- Introducing persistence just in case.
- Introducing advanced Tetris mechanics not required by the specification.
- Over-abstracting a simple static web app into service layers, repositories, or microfrontends.

## Review Checklist For Agents
- Does the change stay within v1 scope?
- Does gameplay logic remain deterministic and testable?
- Is the reducer still the single source of truth?
- Are keyboard and touch actions mapped through the same action contract?
- Are security headers, CI gates, and static deployment assumptions still intact?
- Are new assumptions documented if the spec was silent?
