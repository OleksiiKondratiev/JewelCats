# BUG-009 — `buildBoard()` can hand out a starting board with no legal move (retry loop has no fallback)

| Field | Value |
|---|---|
| ID | BUG-009 |
| Severity | Low (rare, but the failure is a hard lock) |
| Type | Robustness defect |
| Status | Open (code review) |
| Component | `game.js` `buildBoard()` / `buildBoardFresh()` |
| Affected lines | `game.js:60-81` (retry loop 77-79), `game.js:83-98` |
| Repro | Manual; snippet below quantifies how often it happens |

## Symptom

In rare cases the very first board has **no legal move at all**. Every swap is rejected as
"invalid" and the recovery path never runs, so the player can only watch the clock run out.

## Reproduction steps

1. Start the game repeatedly until the initial board is a dead end.
2. Try every possible swap — all of them fail, and `↻ Reset`/pause just re-enters `startGame()`.

Quantify the frequency (engine copy of the same builder; `hasPossibleMove()` exits early, so 5000
boards run in well under a second — after the fix both counters must be `0`):

```bash
node -e '
const E = require("./engine.js");
const build = () => { const g = [];
  for (let r = 0; r < 8; r++) { g[r] = [];
    for (let c = 0; c < 8; c++) { let t, guard = 0;
      do { t = (Math.random() * 6) | 0; guard++; }
      while (guard < 20 && E.createsMatchAt(g, r, c, t));
      g[r][c] = E.gem(t); } }
  return g; };
let dead = 0, hot = 0, N = 5000;
for (let i = 0; i < N; i++) { const g = build();
  if (E.findMatches(g, 8).matched.size) hot++;
  if (!E.hasPossibleMove(g, 8)) dead++; }
console.log({ boards: N, withImmediateMatch: hot, withoutLegalMove: dead });'
```

Measured on 2026-11-17 (Node v22.14.0, 5000 generated boards):
`{"boards":5000,"withImmediateMatch":0,"withoutLegalMove":0}` — the defect is **rare** with 6 gem
types on 8×8, which is why it is rated Low; it is still a reachable dead end because the in-game
recovery path cannot run on a board where no swap is valid.

## Expected behaviour

`buildBoard()` guarantees a playable starting position, exactly like `shuffleBoard()` does.

## Actual behaviour

The retry loop is a *best-effort* loop with no post-condition:

```js
// game.js:77-79
for (let attempt = 0; attempt < 30 && !hasPossibleMove(); attempt++) {
  buildBoardFresh();
}
renderBoard();            // <-- no verification after the loop, no fallback
```

Compare the equivalent guard inside `shuffleBoard()` (`game.js:506`):

```js
if (findMatches().matched.size > 0 || !hasPossibleMove()) buildBoard();
```

Why the failure is a hard lock: the only "no moves left" recovery (`shuffleBoard()` at
`game.js:349-352`) is reached from `resolveBoard()`, and `resolveBoard()` is only entered after a
**valid** swap (`game.js:266-281`). A dead board never produces a valid swap, so the recovery is
unreachable.

Secondary issue in the same builder: the guard `while (guard < 20 && createsMatchAt(...))`
(`game.js:70`, `game.js:93`) gives up after 20 tries and can place a type that forms an immediate
match, so the initial board may start with a pre-existing match that is never resolved (again,
`resolveBoard()` only runs after a player swap).

Note also that `buildBoardFresh()` is a verbatim copy of `buildBoard()` minus `renderBoard()` —
same duplication problem as BUG-008.

## Suggested fix

- Reuse one builder (`buildBoard()` → `buildBoardFresh()` + `renderBoard()`) instead of two copies.
- Add the post-condition, e.g. build rows that are match-free by construction (reject a type that
  equals two cells to the left / two cells above, with no attempt cap) and, after the loop,
  fall back to a deterministic seed pattern (e.g. a repeating 3-colour diagonal guaranteed to have
  legal moves).
- Assert the guarantee instead of hoping: `console.assert(hasPossibleMove() && findMatches().matched.size === 0)`.

## Acceptance criteria

- [ ] A stress test (e.g. 10 000 generated boards, engine-level) shows `0` boards with an
      immediate match and `0` boards without a legal move.
- [ ] `buildBoard()` and `buildBoardFresh()` share one implementation.
- [ ] If a dead end ever appears mid-game, the shuffle path is reachable from a state other than
      `resolveBoard()` (defensive re-check on `startGame()`).

## Related

BUG-008 (the engine copy needs the same fix twice), BUG-004 (the shuffle path it cannot reach).
