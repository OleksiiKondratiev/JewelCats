# BUG-006 — Cascades keep resolving after game over (score, HUD and board change behind the overlay)

| Field | Value |
|---|---|
| ID | BUG-006 |
| Severity | Medium |
| Type | State-machine / async-lifecycle defect |
| Status | Open (code review) |
| Component | `game.js` `resolveBoard()`, `endGame()`, `startTimer()` |
| Affected lines | `game.js:342-408` (timeouts 394, 406), `game.js:181-191` (`endGame`), `game.js:167-172` (timer) |
| Repro | Manual in browser (timing-sensitive) |

## Symptom

The game-over overlay appears (⌛ Time's up / 🚫 Out of moves) while a cascade is still in
flight. Behind the overlay the cascade keeps running: the score counter keeps climbing, gems keep
popping and falling, and the terminal branch of `resolveBoard()` can re-show the overlay with a
different title or even shuffle the board.

## Reproduction steps

1. Start a game and burn the clock down to 1–2 seconds.
2. Make a move that triggers a long cascade (a chain of 3+ refills, ideally with specials).
3. Watch the score value under/around the overlay after "⌛ Time's up!" appears — it keeps
   increasing, and the board keeps animating.
4. Variant: with `moves` at 1, make a move whose cascade ends with no legal move left →
   `shuffleBoard()` fires after game over, printing "✨ Shuffled!" and setting `busy = false`.

## Expected behaviour

`endGame()` terminates the run: pending animation/cascade callbacks become no-ops, no score is
awarded, the board is frozen, and no second `endGame()` / `shuffleBoard()` can fire.

## Actual behaviour

`resolveBoard()` schedules its next steps with plain `setTimeout` and nothing can cancel them:

```js
// game.js:394 ... setTimeout(() => { ...clear, applyGravity()...
//   // game.js:406
//   setTimeout(() => resolveBoard(chain + 1), 300);
// }, 240);
```

`endGame()` only sets flags:

```js
// game.js:181-191
function endGame(title) { playing = false; busy = true; clearInterval(timerId); /* overlay */ }
```

so the already-queued callbacks continue to:

- award and render score (`game.js:359-361` → `score += gained; updateHud();`);
- reset the input lock (`game.js:346` → `busy = false`);
- call `endGame('🚫 Out of moves!')` again (`game.js:347-348`), overwriting the overlay title
  that time already set;
- call `shuffleBoard()` (`game.js:349-352`), which re-renders the board, pops a "✨ Shuffled!"
  bubble and sets `busy = false` (`game.js:510`).

The same hole makes pause unsafe (see BUG-005): pausing does not stop the queued chain, and
"Resume" rebuilds the grid underneath it.

## Root cause

Async steps are scheduled without any ownership or generation token; `busy`/`playing` are
consulted at the input layer (`game.js:196,205,211`) but never re-checked inside the cascade
callbacks.

## Suggested fix

- Introduce a monotonically increasing `runId` (or `gameOver`/`paused` guard) captured when a
  callback is scheduled and re-checked at the top of every callback:

  ```js
  const myRun = runId;
  setTimeout(() => { if (myRun !== runId) return; resolveBoard(chain + 1); }, 300);
  ```

- Increment `runId` in `endGame()`, `startGame()` and on pause.
- Guard score awards with `if (!playing) return;` at the top of `resolveBoard()`.
- Optionally keep the timeout handles and `clearTimeout` them explicitly.

## Acceptance criteria

- [ ] After `endGame()`: no further `score` mutation, no `updateHud()` changes, no board mutation.
- [ ] `endGame()` is idempotent — a second call cannot overwrite the title.
- [ ] `shuffleBoard()` can never run once the run is over.
- [ ] Pausing freezes the board completely; resuming continues the same cascade (or the cascade
      is cancelled cleanly).

## Related

BUG-005 (pause/resume reuses the same hole), BUG-004 (shuffle path), BUG-008.
