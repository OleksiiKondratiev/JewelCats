# BUG-007 — Two runs sharing one birth cell: the shorter run overwrites the longer run's special

| Field | Value |
|---|---|
| ID | BUG-007 |
| Severity | Medium |
| Type | Gameplay defect (order-dependent behaviour) |
| Status | Open (reproduced) |
| Component | `game.js` special placement loop, `engine.js` `findMatches()` output |
| Affected lines | `game.js:363-370`, `engine.js:20-52` (h pass before v pass) |
| Repro | `node docs/bugs/repro.js` → `FAIL [BUG-007]` |

## Symptom

For a plus / T shape whose horizontal and vertical runs share the same center cell, the special
that ends up on the board depends on the **order in which `findMatches()` happened to scan**
(horizontal rows always before vertical columns), not on which run was longer. A 5-run that
should award a bomb silently downgrades to a line blaster because a 4-run crossing the same cell
is processed afterwards.

## Reproduction steps

```js
const g = E.makeGrid(8, (r, c) => E.gem((r + 2 * c) % 6)); // no adjacent cells share a type
for (let c = 1; c <= 5; c++) g[3][c] = E.gem(4); // horizontal run of 5, center (3,3)
for (let r = 1; r <= 4; r++) g[r][3] = E.gem(4); // vertical   run of 4, center (3,3)
const { specials } = E.findMatches(g, 8);
// then apply game.js' placement loop:
for (const sp of specials)
  if (sp.len >= 5) g[sp.r][sp.c] = { ...g[sp.r][sp.c], special: 'bomb' };
  else if (sp.len === 4) g[sp.r][sp.c] = { ...g[sp.r][sp.c], special: 'line' };
```

Observed output:

```
specials=[{"r":3,"c":3,"type":4,"len":5,"dir":"h"},{"r":3,"c":3,"type":4,"len":4,"dir":"v"}]
finalSpecialAt(3,3)=line
```

A 5-match plus a 4-match clears 8 gems and rewards the player with a plain line blaster.

## Expected behaviour

The best reward for the shape wins deterministically: if any run through the birth cell has
`len >= 5`, that cell gets a `bomb`; otherwise a `line`. Mirrored cases must behave the same way
(the 4-run being horizontal and the 5-run vertical, or vice versa).

## Actual behaviour

`findMatches()` appends one entry per run with the horizontal scan first (`engine.js:20-35`) and
the vertical scan second (`engine.js:37-52`). `resolveBoard()` then applies them in array order
with plain assignment (`engine.js`/`game.js:363-370`), so the last writer wins:

```js
if (sp.len >= 5) grid[sp.r][sp.c] = { ..., special: 'bomb' };
else if (sp.len === 4) grid[sp.r][sp.c] = { ..., special: 'line' };  // overwrites the bomb
```

The same collision also silently merges two independent `keep` entries for the same cell
(`game.js:382`), so the second special's orientation (`sp.dir`, see BUG-002) is lost too.

## Suggested fix

Resolve the collision explicitly instead of by scan order — e.g. rank specials per cell:

```js
const rank = (sp) => (sp.len >= 5 ? 2 : sp.len === 4 ? 1 : 0);
const best = new Map();
for (const sp of specials) {
  const k = key(sp.r, sp.c);
  if (!best.has(k) || rank(sp) > rank(best.get(k))) best.set(k, sp);
}
for (const sp of best.values()) { /* place the winner */ }
```

Or, better, detect compound shapes (plus/T) in `findMatches()` as a single special and award a
documented reward (most match-3 games give a bomb for a plus shape).

## Acceptance criteria

- [ ] `docs/bugs/repro.js` reports `PASS [BUG-007]`.
- [ ] Unit tests both orientations of "len 5 + len 4 sharing a center" → `bomb`.
- [ ] Unit test: "len 4 horizontal + len 4 vertical sharing a center" → deterministic, documented
      result (e.g. the horizontal one, or a documented plus rule).
- [ ] The chosen rule for plus/T shapes is written down in `engine.js`'s header comment.

## Related

BUG-002 (orientation of the winning special), BUG-010 (phantom entries polluting the list),
BUG-008.
