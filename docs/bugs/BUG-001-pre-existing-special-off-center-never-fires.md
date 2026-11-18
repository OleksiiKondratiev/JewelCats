# BUG-001 — A pre-existing special gem only fires if it sits on the matched run's center cell

| Field | Value |
|---|---|
| ID | BUG-001 |
| Severity | High |
| Type | Gameplay defect |
| Status | Open (reproduced) |
| Component | `engine.js` `collectSpecialClears()`, `game.js` `collectSpecialClears()` |
| Affected lines | `engine.js:123-144`, `game.js:410-431` (call site `game.js:376`) |
| Repro | `node docs/bugs/repro.js` → `FAIL [BUG-001]` |

## Symptom

A special gem (line blaster / bomb) that is part of a match usually does **not** detonate.
It only detonates when it happens to land exactly on the *center* cell of the run that was
matched, which is a ~1-in-3 coincidence for a 3-match.

## Reproduction steps

Engine (deterministic):

```js
const E = require('./engine.js');
const g = E.makeGrid(8, (r, c) => E.gem((c + r * 3) % 6)); // no accidental matches
g[0][0] = E.gem(1, 'line'); g[0][1] = E.gem(1); g[0][2] = E.gem(1); // run of 3, blaster at col 0
const { matched, specials } = E.findMatches(g, 8);
E.collectSpecialClears(specials, matched, g, 8); // -> empty Set
```

Observed output:

```
specials=[{"r":0,"c":1,"type":1,"len":3,"dir":"h"}] extraClear.size=0 (expected 8)
```

In the browser: match 4 horizontally, keep the line blaster, then make any match that includes
the blaster at its end rather than in the middle — the row is not cleared.

## Expected behaviour

Every gem in `matched` is inspected; if a matched gem carries `special`, its area effect is
added to the clear set (a `line` clears its row/column, a `bomb` clears its 3×3 block).

## Actual behaviour

`collectSpecialClears()` iterates the **run centers** reported by `findMatches()`
(`{r: sr, c: sc}` where `sr/sc` is `runStart + floor(len / 2)`) and only looks at
`grid[sp.r][sp.c]`. Any special that is not a run center is invisible to the blast pass, so
`extraClear` is empty and the special is simply popped as a normal gem (or, since `len >= 4`
birth cells are kept, may even survive without ever firing).

## Root cause

The blast pass re-uses the *special-spawn* metadata list as if it were the list of *specials
that were hit*. Those are two different things:

```js
// engine.js:125-127 — iterates spawn descriptors, then reads the board at the spawn cell
for (const sp of specials) {
  const r = sp.r, c = sp.c;
  const gem = grid[r][c];
  if (gem?.special === 'line') { ... }
```

`findMatches()` pushes one entry per run (`engine.js:30`, `engine.js:47`), never per matched
cell, so the set of inspected cells is a strict subset of `matched`.

## Suggested fix

Decouple "where a new special is born" from "which on-board specials got hit":

```js
function collectSpecialClears(matched, grid, size) {
  const extra = new Set();
  for (const k of matched) {
    const [r, c] = k.split('-').map(Number);
    const gem = grid[r]?.[c];
    if (!gem?.special) continue;
    const dirs = gem.special === 'line' ? (gem.dir || ['h', 'v']) : [];
    if (gem.special === 'bomb') { /* 3x3 */ }
    else for (const d of dirs) { /* full row if 'h', full column if 'v' */ }
  }
  return extra;
}
```

Apply the same change to the copy in `game.js` — see BUG-008; ideally fix it once in
`engine.js` and have `game.js` import it.

## Acceptance criteria

- [ ] `docs/bugs/repro.js` reports `PASS [BUG-001]`.
- [ ] New unit test: a `line` gem at the first cell of a matched 3-run clears its whole row.
- [ ] New unit test: a `bomb` gem at the last cell of a matched run clears its 3×3 block.
- [ ] Existing tests (`node tests/engine.test.js`) stay green.

## Related

BUG-002 (blast orientation), BUG-003 (self-detonation), BUG-008 (duplicated logic).
