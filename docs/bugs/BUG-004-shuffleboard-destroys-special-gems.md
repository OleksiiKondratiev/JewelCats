# BUG-004 — `shuffleBoard()` silently destroys all special gems on the board

| Field | Value |
|---|---|
| ID | BUG-004 |
| Severity | Medium |
| Type | Gameplay defect |
| Status | Open (code review) |
| Component | `game.js` `shuffleBoard()` |
| Affected lines | `game.js:479-511` (types collected 481-486, rebuild 500), call site `game.js:349-353` |
| Repro | Manual (DOM-dependent; no Node harness exists for `game.js` — see BUG-008) |

## Symptom

When the board runs out of legal moves and the game shows *"✨ Shuffled!"*, every line blaster
and bomb the player had carefully accumulated disappears. Only the colours are preserved.

## Reproduction steps

1. Start a game and create a couple of 4-matches so line blasters are on the board.
2. Keep playing until the board has no legal move (`hasPossibleMove()` returns `false`), so
   `shuffleBoard()` runs.
3. Observe the board after the "✨ Shuffled!" popup: the blasters/bombs are gone (no `special`
   class, no `gem.special`).

## Expected behaviour

Shuffling relocates gems — including their `special` flag — or, if the design is that a shuffle
resets specials, it must say so; silently deleting a player-owned reward is a defect either way.

## Actual behaviour

Only the numeric `type` of each gem is collected and laid back as brand-new plain gems:

```js
// game.js:481-486
for (let r = 0; r < SIZE; r++)
  for (let c = 0; c < SIZE; c++)
    if (grid[r][c]) types.push(grid[r][c].type);   // <-- the special flag is dropped here

// game.js:500
for (let r = 0; r < SIZE; r++)
  for (let c = 0; c < SIZE; c++) grid[r][c] = makeGem(pool[idx++]); // always special = null
```

## Root cause

The shuffle works on a `type`-only projection of the board instead of on the gem objects
themselves. `makeGem(type, special = null)` re-creates gems and loses `special`, and also
re-assigns fresh `id`s, so the DOM diff/animation layer sees entirely new gems.

Secondary robustness issue in the same function: `types` only counts non-null cells, but the
write-back loop always writes `SIZE * SIZE` cells. If `shuffleBoard()` is ever called on a board
with holes, `pool[idx++]` yields `undefined`, producing `{ type: undefined }` gems — which render
`cats/62px/undefined` and compare equal to each other in `findMatches()`, so a cascade of bogus
matches could follow. Today the call site happens to run after gravity, so the board is full.

## Suggested fix

Shuffle the gem objects, not their types:

```js
const gems = [];
for (let r = 0; r < SIZE; r++)
  for (let c = 0; c < SIZE; c++) if (grid[r][c]) gems.push(grid[r][c]);
// Fisher–Yates on `gems`, then write them back to the same occupied cells.
```

Guard the count (`if (gems.length !== SIZE * SIZE) return buildBoard();`) so the hole case
cannot produce `undefined` gems.

## Acceptance criteria

- [ ] Unit/integration test: after a shuffle, the number of `special !== null` gems is
      unchanged and every gem keeps its identity (`id`).
- [ ] Test: shuffling never leaves a board with an immediate match and never a board without a
      legal move (the existing 30-attempt loop plus the `buildBoard()` fallback at `game.js:506`).
- [ ] No `type: undefined` gems possible after a shuffle.

## Related

BUG-008 (why this can't be covered by the current test suite), BUG-006 (`shuffleBoard()` can run
after game over).
