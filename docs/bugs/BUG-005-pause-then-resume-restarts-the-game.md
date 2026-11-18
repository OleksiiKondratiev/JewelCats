# BUG-005 — "Paused / ▶ Resume" actually restarts the game and wipes progress

| Field | Value |
|---|---|
| ID | BUG-005 |
| Severity | High |
| Type | UX / state-machine defect |
| Status | Open (code review) |
| Component | `game.js` button wiring, `startGame()` |
| Affected lines | `game.js:150-163` (`startGame`), `game.js:532-543` (wiring), `index.html:553,565` |
| Repro | Manual in browser |

## Symptom

Click **↻ Reset** while a game is running → the overlay says *"Paused ⏸ — Take a break — your
progress is safe. 🐾"* and the overlay button turns into **▶ Resume 🐾**. Clicking that button
starts a brand-new game: score `0`, moves `20`, time `60`, and a freshly generated board. The
promise in the pause message is false.

## Reproduction steps

1. Open `index.html`, press **▶ Start**.
2. Play a few moves until the score is non-zero.
3. Press **↻ Reset** (footer button). Overlay: "Paused ⏸", button: "▶ Resume 🐾 🐾".
4. Press **▶ Resume**.
5. Observe: score/moves/time reset, board replaced, `gemSeq` reset (`game.js:157`).

## Expected behaviour

Either a real pause/resume (state preserved, timer restarted from `timeLeft`), or honest labels
("Reset / Start new game"). The current combination — a pause message plus a reset action — is a
data-loss bug from the player's point of view.

## Actual behaviour

The two overlay buttons are wired to two different, mismatched handlers:

```js
// index.html:553  <button id="restart-btn">↻ Reset</button>   (footer)
// index.html:565  <button id="start-btn">▶ Start</button>     (overlay, primary action)

// game.js:532
startBtn.addEventListener('click', startGame);   // <-- "▶ Resume" lands here

// game.js:150-163
function startGame() { score = 0; moves = START_MOVES; timeLeft = START_TIME; ... buildBoard(); }
```

The footer button is the only one that knows about pausing:

```js
// game.js:533-543
restartBtn.addEventListener('click', () => {
  if (playing) { clearInterval(timerId); /* show "Paused ⏸" */ playing = false; }
});
```

Consequences of the split:

- Pausing mid-cascade leaves the pending `setTimeout` chain from `resolveBoard()` alive; after
  "Resume" rebuilds the board, those stale callbacks run against the **new** grid (see BUG-006),
  which can clear arbitrary cells and add score.
- After a game over, `playing === false`, so the footer button becomes a no-op — the only way out
  is the overlay's "↻ Play Again".
- The footer label is "↻ Reset" but its behaviour is "Pause"; the overlay label is "▶ Resume" but
  its behaviour is "Reset".

## Root cause

No single game-state owner (`idle | playing | paused | over`) and no separation between
`resumeGame()` and `startGame()`; button labels are patched ad hoc via `textContent`.

## Suggested fix

- Introduce an explicit state variable and one handler that dispatches on it:
  `idle → start`, `playing → pause`, `paused → resume`, `over → restart`.
- Implement `resumeGame()`: restore `playing = true`, `startTimer()` (it already reads
  `timeLeft`, `game.js:165-173`), hide the overlay — do not touch score/board.
- Cancel pending cascade callbacks when pausing (needs the run-token from BUG-006).
- Rename the footer button per state so the label matches the action.

## Acceptance criteria

- [ ] Pausing and resuming preserves score, moves, `timeLeft` and the exact board contents.
- [ ] The timer does not double-count after resume (`startTimer()` already calls
      `clearInterval`, keep that).
- [ ] No pending cascade callback mutates the board after pause.
- [ ] Every button label matches its effect in each of the four states.

## Related

BUG-006 (uncancelled cascade timers), BUG-008 (no automated coverage for `game.js`).
