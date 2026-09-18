# Specification: Basic Tetris Web Game

## 1. Objective
Create a simple single-player browser game that recreates the core Tetris loop: the player moves and rotates falling tetrominoes to complete horizontal lines until the stack reaches the top. The first release must be a fully client-side web app with no accounts, backend services, or multiplayer features.

## 2. User Flow / Narrative
1. The player opens the web app and sees a central playfield, a next-piece preview, and visible game controls.
2. The player starts a new game, and the game spawns an active tetromino that begins falling automatically.
3. While the piece is falling, the player can move it left or right, rotate it, or soft drop it to increase its descent speed.
4. If the active piece reaches the floor or lands on locked blocks, it locks into the board and the next tetromino becomes active.
5. When one or more horizontal rows are fully filled, the game clears all completed rows in the same resolution step and shifts the rows above downward.
6. The gameplay loop continues until a new tetromino cannot spawn because the stack has reached the top of the board.
7. When the game ends, the UI presents a clear game-over state and a restart action that begins a fresh session.

## 3. Functional Requirements
### Functional Requirements
- The feature must be delivered as a browser-based, single-player web game.
- The game must render a single central playfield using a standard Tetris-style grid.
- The game must use the seven standard tetromino shapes.
- The game must automatically move the active tetromino downward at a consistent base fall rate while a game session is active.
- The game must allow the player to move the active tetromino one column left or right when the destination cells are valid.
- The game must allow the player to rotate the active tetromino when the rotated state fits within the playfield and does not overlap locked blocks.
- The game must allow the player to soft drop the active tetromino so it descends faster than the base fall rate.
- The game must ignore any move or rotation input that would place the active tetromino outside the playfield or overlapping locked blocks.
- The game must lock the active tetromino into the board when it can no longer move downward.
- The game must detect all completely filled horizontal rows after a piece locks.
- The game must clear every completed horizontal row detected in the same resolution step.
- The game must shift all rows above cleared rows downward immediately after line clear resolution.
- The game must show exactly one upcoming tetromino preview at all times during active play.
- The game must spawn a new active tetromino after the previous active tetromino locks.
- The game must update the preview to the following upcoming tetromino when a new active tetromino spawns.
- The game must continue spawning tetrominoes until the spawn area is blocked.
- The game must enter a visible game-over state immediately when a new tetromino cannot spawn without overlap.
- The game must prevent gameplay inputs from changing the board state while the game-over state is active.
- The game must provide a manual restart action that resets the board, active tetromino, upcoming tetromino, and game state into a fresh session.
- The first release must exclude user accounts, persistence across sessions, backend services, multiplayer, hold-piece behavior, hard drop, pause, scoring, levels, and speed progression.
- Desktop gameplay must support keyboard input for move left, move right, rotate, and soft drop.
- Mobile gameplay must provide touch-accessible controls for move left, move right, rotate, soft drop, and restart.

### Non-Functional Requirements
- The experience must remain simple and easy to understand for a first-time player.
- The UI must present a readable central playfield and adjacent next-piece preview without requiring extra menus or setup.
- The web app must be responsive across desktop and mobile layouts.
- Core gameplay behavior must be deterministic and testable for movement, collision handling, line clearing, game-over detection, and restart behavior.
- The feature must remain fully client-side in v1 and must not depend on backend connectivity.

## 4. Edge Cases & Error Handling
- If the player attempts to move or rotate the active tetromino into a wall or locked block, the game must ignore the attempted action and preserve the current valid piece state.
- If a piece completes more than one row at the same time, the game must clear all completed rows in the same resolution step before continuing play.
- If the spawn area is blocked when a new tetromino should appear, the game must enter game over immediately and must not render a partial or overlapping spawn.
- If the game is over, move, rotate, and soft drop inputs must not affect gameplay until the player restarts.
- If the player restarts after game over, the board, active piece, next-piece preview, and game state must reset to a fresh session.
- If the player is using touch controls on mobile, the available controls must map only to the in-scope actions: move left, move right, rotate, soft drop, and restart.

## 5. Acceptance Criteria
- Given the player opens the web app, When the initial game screen loads, Then the player sees a central playfield, a next-piece preview, and a way to start or restart play.
- Given a game is active, When time advances without player input, Then the active tetromino falls downward automatically.
- Given a game is active, When the player presses the left or right control and the destination space is valid, Then the active tetromino moves one step in that direction.
- Given a game is active, When the player triggers rotation and the rotated position is valid, Then the active tetromino rotates in place.
- Given a game is active, When the player attempts a move or rotation that would collide with a wall or locked blocks, Then the piece remains in its current valid position.
- Given a game is active, When the player uses soft drop, Then the active tetromino descends faster than the normal fall rate.
- Given a locked board state contains one or more completely filled horizontal rows, When line resolution occurs, Then every completed row is removed and the rows above shift downward.
- Given a game is active, When the current tetromino locks, Then the next tetromino spawns and the preview updates to show the following upcoming piece.
- Given the stack reaches the top and a new tetromino cannot spawn, When the next spawn is attempted, Then the game enters a visible game-over state.
- Given the game is over, When the player activates restart, Then the game resets to a fresh empty board and a new session begins.
- Given the player is on a desktop device, When the game is active, Then keyboard input supports move left, move right, rotate, and soft drop.
- Given the player is on a mobile device, When the game is active, Then touch-accessible controls are available for move left, move right, rotate, soft drop, and restart.

## 6. Open Questions / Ambiguities
- None.
