# Estimation: Basic Tetris Web Game

Source basis:
- `docs/project_description/project_brief.md`
- `docs/project_description/how-to-play-tetris-super-simple.transcript.md`
- `docs/specs/SPEC_001.md`
- `docs/architecture/architecture.md`
- `docs/architecture/ADRs/ADR_001.md` through `ADR_004.md`
- `docs/architecture/development_guidelines.md`
- `docs/backlog/*.md`

---

## Phase 1 - Clarifying Questions and Assumptions

### Clarifying Questions and Assumptions
1. What product is actually being estimated given the repository currently houses a VS Code extension?
   Assumption: Estimate the new browser game defined in `docs/project_description` and `docs/specs`, not the existing extension product. This is explicitly called out in `docs/architecture/architecture.md`.
2. Who is the target user for v1?
   Assumption: Casual, first-time players who want a simple Tetris experience on desktop and mobile browsers.
3. What platforms and runtime environments are in scope?
   Assumption: A single responsive web app targeting the latest two stable versions of Chrome, Edge, Safari, and Firefox on desktop and mobile.
4. Are backend services, accounts, persistence, or multiplayer required?
   Assumption: No. v1 is fully client-side with no backend, no auth, no persistence, and no multiplayer.
5. What exact gameplay features are required in v1?
   Assumption: Seven standard tetrominoes, auto-fall, left and right movement, clockwise rotation, soft drop, next-piece preview, line clears, game over, and restart.
6. Which commonly expected Tetris mechanics are intentionally excluded?
   Assumption: Hold, hard drop, pause, scoring, levels, speed progression, audio, analytics, achievements, and advanced wall-kick behavior are out of scope.
7. What technical stack and architecture constraints apply?
   Assumption: JavaScript, React, Vite, Tailwind CSS, deterministic reducer-style game engine, DOM-grid rendering, static Vercel deployment, and CI quality gates.
8. What is the expected quality bar for delivery?
   Assumption: Unit coverage for core engine rules, component coverage for UI wiring, Playwright coverage for desktop and mobile controls, and green `lint`, `test`, and `build` gates before deployment.
9. Is art-heavy polish expected, or is this a functional v1?
   Assumption: Functional but polished-enough product UI with readable responsive layout, clear controls, and accessibility-safe interaction states, without custom art production.

### Understanding Confirmation
This estimate assumes a greenfield Tetris SPA will be built inside the current repository, following the provided architecture and backlog artifacts, with deterministic gameplay as the primary engineering constraint and static delivery as the primary release constraint.

---

## Phase 2 - Project Scope Document

### 2.1 In Scope

#### Product Shell and UI
- Scaffold a client-only React/Vite/Tailwind SPA.
- Render a central 10x20 playfield and a single next-piece preview.
- Provide visible start and restart affordances.
- Provide idle and game-over status messaging.
- Deliver a responsive desktop and mobile layout.

#### Deterministic Game Engine
- Define the seven standard tetrominoes and rotation states.
- Implement seeded 7-bag piece generation for deterministic tests.
- Model game state, board state, active piece, next piece, timing state, and phase state.
- Implement pure reducer transitions for spawn, movement, rotation, gravity, soft drop, locking, line clearing, board compaction, and restart.
- Expose selectors for board rendering, next-piece preview, and status UI.

#### Controller and Input Layer
- Implement a thin game loop/controller above the reducer.
- Translate elapsed time into deterministic `TICK` actions.
- Support desktop keyboard controls for left, right, rotate, and soft drop.
- Support mobile touch controls for left, right, rotate, soft drop, and restart.
- Ensure keyboard and touch both route through the same domain action contract.

#### Quality, Delivery, and Deployment
- Add deterministic unit coverage for engine rules.
- Add component coverage for UI and state wiring.
- Add Playwright coverage for desktop and mobile gameplay flows.
- Configure static deployment on Vercel.
- Configure CI quality gates for `npm run lint`, `npm test`, and `npm run build`.
- Configure SPA fallback and security headers appropriate for a static client app.

### 2.2 Out of Scope (v1)
- User accounts or authentication.
- Persistence across sessions via localStorage, IndexedDB, cookies, or remote APIs.
- Backend services, databases, serverless functions, or telemetry vendors.
- Multiplayer, leaderboards, analytics, or social sharing.
- Hold piece, hard drop, pause, scoring, levels, speed progression, or alternate game modes.
- Audio, haptics, achievements, and custom art pipelines.
- Advanced wall-kick systems beyond simple valid clockwise rotation.
- Native app packaging, app stores, or offline-first support.

### 2.3 Success Criteria
1. The initial screen renders a readable playfield, next-piece preview, and visible start or restart action on desktop and mobile layouts.
2. Starting a game spawns a piece immediately and auto-fall begins without backend calls.
3. Valid left, right, rotate, and soft-drop inputs update state within a perceived latency of under 50 ms.
4. Invalid move and rotate attempts leave the game state unchanged.
5. Single-line and multi-line clears resolve in one reducer step, and rows above compact immediately.
6. A blocked spawn produces a visible game-over state immediately, and gameplay inputs are ignored until restart.
7. Restart resets board, active piece, next piece, bag queue, timing state, and phase state to a fresh session.
8. CI passes `lint`, `test`, and `build`, and the app deploys as static assets with preview-friendly configuration and security headers.

### Assumptions
- **A1**: The web game is the product being estimated even though the repository currently contains a VS Code extension codebase.
- **A2**: Board dimensions are **10 columns x 20 visible rows**.
- **A3**: Rotation is a single clockwise action only in v1.
- **A4**: Piece generation uses a seeded **7-bag** randomizer to satisfy deterministic testing requirements.
- **A5**: Runtime state is in-memory only; no persistence is allowed.
- **A6**: Tailwind CSS is mandatory for styling, and JavaScript remains the implementation language.
- **A7**: One senior engineer can reuse existing npm/GitHub repo conventions instead of creating a release process from scratch.
- **A8**: Vercel preview and production deployment are available and acceptable for this project.
- **A9**: No custom visual design system, animation system, or audio asset pipeline is required beyond a clean responsive game UI.
- **A10**: Estimates include engineering validation and deployment hardening, not post-launch live-ops work.

---

## Phase 3 - Epics and User Stories

### Epic Summary

| ID | Title | Objective | Success Criteria |
| --- | --- | --- | --- |
| E1 | Game Shell UI | Deliver the client SPA shell, responsive layout, and presentational game surfaces. | Playfield, preview, and status UI are readable and responsive with no out-of-scope controls. |
| E2 | Deterministic Engine Foundation | Build the pure game-state model, randomizer, collision logic, spawn rules, and selectors. | Engine is DOM-free, deterministic, and testable from seeded inputs. |
| E3 | Falling, Movement, and Rotation | Add tick-driven gameplay and valid move, rotate, and soft-drop behavior. | Valid inputs change state, invalid inputs no-op, and gravity runs consistently. |
| E4 | Locking, Line Clears, and Preview Progression | Complete the active-piece lifecycle after descent blockage. | Lock, clear, compact, and preview progression behave correctly for single and multi-line clears. |
| E5 | Game Over and Restart | Detect blocked spawns, stop gameplay, and fully reset sessions. | Game over appears immediately, blocks gameplay input, and restart returns a clean state. |
| E6 | Desktop and Mobile Controls | Provide keyboard and touch controls through one shared action model. | Desktop and mobile controls are consistent, accessible, and in-scope only. |
| E7 | Quality Gates and Static Delivery | Add automated validation, CI gates, static deployment, and release documentation. | Lint, tests, build, e2e, deploy config, and security headers are production-ready. |

### E1 User Stories

| ID | Story | Discipline | Size | Objective |
| --- | --- | --- | --- | --- |
| E1-S1 | Scaffold the React/Vite/Tailwind SPA and base app shell. | Frontend / UI | S | Create the runnable client app structure, global styles, and top-level composition needed for later gameplay wiring. |
| E1-S2 | Build static board, preview, and status components. | Frontend / UI | M | Implement presentational components that render from props without embedding gameplay rules. |
| E1-S3 | Apply responsive layout and accessible visual states. | Design / UX | S | Make the playfield, preview, and session controls readable and usable across desktop and mobile breakpoints. |

### E2 User Stories

| ID | Story | Discipline | Size | Objective |
| --- | --- | --- | --- | --- |
| E2-S1 | Define state shape, constants, tetromino catalog, and seeded randomizer. | Application Logic / Game Engine | M | Create the deterministic foundation for all gameplay rules and reproducible tests. |
| E2-S2 | Implement spawn, collision, initial state, and selectors API. | Application Logic / Game Engine | M | Deliver the pure engine interfaces required by the architecture and development guidelines. |
| E2-S3 | Add unit coverage for spawn, bounds, and seed determinism. | QA / Testing | S | Prove the engine can be exercised without DOM coupling and reproduce exact piece sequences. |

### E3 User Stories

| ID | Story | Discipline | Size | Objective |
| --- | --- | --- | --- | --- |
| E3-S1 | Implement reducer actions for gravity, movement, rotation, and soft-drop state. | Application Logic / Game Engine | M | Add the core state transitions for active-piece control while preserving deterministic no-op handling for invalid moves. |
| E3-S2 | Implement the controller loop that converts elapsed time and inputs into actions. | Application Logic / Game Engine | S | Keep timing and browser event handling outside the reducer while preserving one action contract. |
| E3-S3 | Add tests for movement validation, gravity cadence, and soft-drop acceleration. | QA / Testing | S | Lock in the rule behavior that most commonly regresses during game implementation. |

### E4 User Stories

| ID | Story | Discipline | Size | Objective |
| --- | --- | --- | --- | --- |
| E4-S1 | Implement lock resolution and board merge behavior. | Application Logic / Game Engine | S | Freeze the active piece into locked board cells only when descent is no longer valid. |
| E4-S2 | Implement line clearing, board compaction, and preview progression. | Application Logic / Game Engine | M | Clear all full rows in one step, compact the board, and promote the next piece deterministically. |
| E4-S3 | Add regression tests for single-line, multi-line, and post-lock flows. | QA / Testing | S | Verify the highest-risk resolution edge cases before UI integration is finalized. |

### E5 User Stories

| ID | Story | Discipline | Size | Objective |
| --- | --- | --- | --- | --- |
| E5-S1 | Implement blocked-spawn detection and game-over transitions. | Application Logic / Game Engine | S | Enter `game_over` immediately when the next piece cannot spawn cleanly. |
| E5-S2 | Wire idle and game-over UI plus start and restart actions. | Frontend / UI | S | Surface clear session state transitions in the UI without extra menus. |
| E5-S3 | Add tests for game-over input blocking and full restart reset. | QA / Testing | XS | Prove the session lifecycle resets the entire authoritative state. |

### E6 User Stories

| ID | Story | Discipline | Size | Objective |
| --- | --- | --- | --- | --- |
| E6-S1 | Implement keyboard bindings for left, right, rotate, and soft drop. | Frontend / UI | S | Map desktop input to shared domain actions and prevent conflicting browser defaults. |
| E6-S2 | Implement mobile touch controls with press and release semantics. | Frontend / UI | M | Provide large, labeled touch controls that match the keyboard behavior exactly. |
| E6-S3 | Add component and e2e coverage for desktop and mobile control parity. | QA / Testing | M | Verify real browser behavior for both control surfaces and state gating. |

### E7 User Stories

| ID | Story | Discipline | Size | Objective |
| --- | --- | --- | --- | --- |
| E7-S1 | Configure unit, component, and Playwright test tooling in CI. | DevOps / CI-CD | M | Make lint, test, and browser validation repeatable and visible in automation. |
| E7-S2 | Configure Vercel static deployment, SPA fallback, and security headers. | DevOps / CI-CD | S | Deliver a production-safe static hosting setup aligned with the ADRs. |
| E7-S3 | Document the local workflow, release gates, and deployment checklist. | Documentation | S | Reduce delivery friction and keep the final release path explicit for future contributors. |

> **Ready to create a Jira project?**
> I can create a Jira project with all **7 epics** and **21 user stories** pre-loaded, including story points mapped from the t-shirt sizes. Just say the word and I will connect to your Atlassian workspace and set it up.

---

## Phase 4 - Effort Estimation

### 4.1 Three-Point Estimation - Traditional Senior Engineer

| Epic | T-Shirt | Optimistic (hrs) | Most Probable (hrs) | Pessimistic (hrs) |
| --- | --- | ---: | ---: | ---: |
| E1 - Game Shell UI | M | 16 | 24 | 36 |
| E2 - Deterministic Engine Foundation | L | 28 | 40 | 56 |
| E3 - Falling, Movement, and Rotation | M | 18 | 28 | 40 |
| E4 - Locking, Line Clears, and Preview Progression | M | 18 | 28 | 42 |
| E5 - Game Over and Restart | M | 12 | 18 | 28 |
| E6 - Desktop and Mobile Controls | M | 16 | 24 | 36 |
| E7 - Quality Gates and Static Delivery | L | 20 | 36 | 52 |
| **Total** |  | **128** | **198** | **290** |

**PERT Weighted Estimate:** `(128 + 4 x 198 + 290) / 6 = 201.7 hours`

### 4.2 AI-Assisted Estimation - Claude Code and AI Coding Tools

Traditional hours below use the **most probable** values from Phase 4.1.

| Epic | Traditional (hrs) | AI-Assisted (hrs) | Multiplier |
| --- | ---: | ---: | ---: |
| E1 - Game Shell UI | 24.0 | 12.0 | 0.50x |
| E2 - Deterministic Engine Foundation | 40.0 | 24.0 | 0.60x |
| E3 - Falling, Movement, and Rotation | 28.0 | 15.4 | 0.55x |
| E4 - Locking, Line Clears, and Preview Progression | 28.0 | 15.4 | 0.55x |
| E5 - Game Over and Restart | 18.0 | 10.8 | 0.60x |
| E6 - Desktop and Mobile Controls | 24.0 | 14.4 | 0.60x |
| E7 - Quality Gates and Static Delivery | 36.0 | 25.2 | 0.70x |
| **Total** | **198.0** | **117.2** | **0.59x blended** |

*Footnote: Testing, QA, browser debugging, and deployment hardening compress less with AI because failures still require human interpretation, timing-sensitive investigation, and environment-specific validation.*

---

## Phase 5 - Man Hours by Skill

### 5.1 Traditional Estimation Breakdown

This matrix uses the **most probable** traditional hours.

| Skill | E1 | E2 | E3 | E4 | E5 | E6 | E7 | Total | % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Frontend / UI | 16 | 0 | 4 | 2 | 6 | 10 | 0 | **38** | **19.2%** |
| Application Logic / Game Engine | 2 | 30 | 16 | 18 | 5 | 4 | 0 | **75** | **37.9%** |
| DevOps / CI-CD | 0 | 0 | 0 | 0 | 0 | 0 | 16 | **16** | **8.1%** |
| QA / Testing | 2 | 8 | 6 | 6 | 4 | 6 | 10 | **42** | **21.2%** |
| Design / UX | 4 | 0 | 0 | 0 | 2 | 3 | 0 | **9** | **4.5%** |
| Documentation | 0 | 2 | 2 | 2 | 1 | 1 | 10 | **18** | **9.1%** |
| **Total** | **24** | **40** | **28** | **28** | **18** | **24** | **36** | **198** | **100%** |

### 5.2 AI-Assisted Breakdown by Skill

| Skill | Traditional (hrs) | AI-Assisted (hrs) | Savings (hrs) |
| --- | ---: | ---: | ---: |
| Frontend / UI | 38.0 | 20.9 | 17.1 |
| Application Logic / Game Engine | 75.0 | 43.1 | 31.9 |
| DevOps / CI-CD | 16.0 | 11.2 | 4.8 |
| QA / Testing | 42.0 | 25.4 | 16.6 |
| Design / UX | 9.0 | 5.0 | 4.0 |
| Documentation | 18.0 | 11.6 | 6.4 |
| **Total** | **198.0** | **117.2** | **80.8** |

---

## Phase 6 - Final Conclusion

### Summary

**Scope:** **7 Epics** | **21 User Stories** | **6 Engineering Disciplines**

| Traditional Estimation | AI-Assisted Estimation |
| --- | --- |
| Optimistic: **128 hrs** (~**3.2 weeks**, 1 engineer) | Most Probable: **117.2 hrs** (~**2.9 weeks**, 1 engineer) |
| Most Probable: **198 hrs** (~**5.0 weeks**, 1 engineer) | Savings vs traditional: **80.8 hrs** (~**40.8% reduction**) |
| Pessimistic: **290 hrs** (~**7.3 weeks**, 1 engineer) | Enabled by: **Claude Code, Copilot, AI code generation** |
| PERT Weighted Estimate: **201.7 hrs** | Recommended AI Estimate: **110-125 hrs** |

### Key Risks and Contingencies
- **Rotation behavior ambiguity across E2-E4**: The spec requires valid rotation but does not require advanced wall kicks. If stakeholder expectations drift toward modern Tetris behavior, reducer and test logic will need rework.
- **Mobile input timing across E3 and E6**: Soft-drop press and release semantics can behave differently on Safari and Chrome mobile browsers, which often adds debugging time beyond the pure reducer work.
- **DOM-grid performance in E1 and E3**: A naive full-grid rerender on every tick can introduce visible jank on lower-end phones, forcing profiling and selective render optimization.
- **Timing-sensitive browser tests in E6 and E7**: End-to-end tests around falling pieces and restart flow can be flaky unless seeds, timers, and assertions are carefully controlled.
- **Repository context mismatch in E1 and E7**: Because the current repository is an extension codebase, build scripts and deployment automation may need extra isolation to avoid breaking unrelated workflows.
- **Hosting configuration drift in E7**: SPA fallback and security headers live in the deployment layer, so missing or mis-versioned config can create late release rework even when app code is correct.

### Recommendation
- **Solo senior engineer, part-time**: Plan **7-9 weeks** with AI assistance at 15-20 hours per week. Without AI assistance, the same scope is more realistically **11-14 weeks**.
- **Solo senior engineer, full-time focused**: Plan **3-4 weeks** with AI assistance, or **5-7 weeks** using traditional execution only.
- **Small team of 2**: Plan **2-3 calendar weeks** if one engineer owns game engine and controller work while the other owns UI, tests, and deployment. Faster than this is unlikely because E2 through E4 still contain a real sequential dependency chain.
- **Contingency buffer**: Add **15-20%** schedule contingency to any committed date. The main drivers are rotation-rule interpretation, mobile input behavior, test stabilization, and repo integration overhead.

### Final Estimate Position
The most defensible planning baseline is **198 traditional hours** or **110-125 AI-assisted hours** for a production-ready v1 that matches the provided architecture, backlog, and quality gates. This is a small product, but it is not a trivial prototype because deterministic gameplay, browser control parity, and automated validation account for a large share of the effort.
