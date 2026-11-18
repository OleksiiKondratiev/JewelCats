# BUG-002 — A line blaster's blast direction comes from the triggering run, not from the gem

| Field | Value |
|---|---|
| ID | BUG-002 |
| Severity | High |
| Type | Gameplay defect / data-model gap |
| Status | Open (reproduced) |
| Component | `engine.js` `collectSpecialClears()`, `game.js` `collectSpecialClears()`, gem model |
| Affected lines | `engine.js:128-133`, `game.js:415-420`, gem shape `game.js:45` |
| Repro | `node docs/bugs/repro.js` → `FAIL [BUG-002]` |

## Symptom

A horizontally created line blaster sometimes clears a **column** instead of its row (and vice
versa). The blast axis is decided by whatever match happened to hit it, not by how the blaster
was created.

## Reproduction steps

```js
const g = E.makeGrid(8, (r, c) => E.gem((c + r * 3) % 6));
g[0][4] = E.gem(2); g[1][4] = E.gem(2, 'line'); g[2][4] = E.gem(2); // vertical run of 3
const { matched, specials } = E.findMatches(g, 8);
E.collectSpecialClears(specials, matched, g, 8);
```

Observed output:

```
specials=[{"r":1,"c":4,"type":2,"len":3,"dir":"v"}] rowCleared=false colCleared=true
```

The gem was created by a horizontal run, yet the **column** was cleared.

## Expected behaviour

The blast axis is a property of the gem. A `line` gem created by a horizontal run always clears
its row; one created by a vertical run always clears its column. (Alternatively: an explicit
"line clears both row and column" rule — but then it must be documented and consistent.)

## Actual behaviour

`collectSpecialClears()` branches on `sp.dir`, which `findMatches()` derives from the scan
direction of the **triggering** run:

```js
// engine.js:129-133
if (sp.dir === 'h') { for (let c2 = 0; c2 < size; c2++) extra.add(key(r, c2)); }
else                { for (let r2 = 0; r2 < size; r2++) extra.add(key(r2, c)); }
```

The gem object itself never stores an axis — `makeGem()` / the special-placement step only set
`special: 'line'` (`game.js:45`, `game.js:368`), so the creation orientation is lost the moment
the blaster lands on the board.

## Root cause

Data model gap: `special: null | 'line' | 'bomb'` has no orientation field, so the only
orientation available at blast time belongs to the wrong object (the match, not the gem).

## Suggested fix

Store the axis on the gem when the special is created, and read it back at blast time:

```js
// creation (game.js:363-370 / engine equivalent)
grid[sp.r][sp.c] = { ...grid[sp.r][sp.c], special: 'line', dir: sp.dir };

// blast
if (gem.special === 'line') {
  if (gem.dir === 'h') for (let c2 = 0; c2 < size; c2++) extra.add(key(r, c2));
  else                 for (let r2 = 0; r2 < size; r2++) extra.add(key(r2, c));
}
```

Also render the axis (`renderGem()` at `game.js:126-137`) so the player can tell a horizontal
blaster from a vertical one — otherwise the rule is invisible and reads as randomness.

## Acceptance criteria

- [ ] `docs/bugs/repro.js` reports `PASS [BUG-002]`.
- [ ] Gem model documents the new `dir` field (comment at `game.js:45` and `engine.js:3-4`).
- [ ] Unit tests: horizontal-created blaster clears its row when hit by a vertical match, and
      the mirror case.
- [ ] Visual difference between the two blaster orientations, or an explicit design decision
      recorded in the code that a blaster clears both axes.

## Related

BUG-001 (which specials fire at all), BUG-003 (when they fire), BUG-008 (duplicated logic).
