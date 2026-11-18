# BUG-010 — `specials[]` carries phantom entries for plain 3-runs that spawn nothing

| Field | Value |
|---|---|
| ID | BUG-010 |
| Severity | Low (latent; it is the root of BUG-001/002/003/007's awkwardness) |
| Type | API / naming design defect |
| Status | Open (reproduced) |
| Component | `engine.js` `findMatches()`, `game.js` `findMatches()` |
| Affected lines | `engine.js:30`, `engine.js:47` (unconditional push), `game.js:307`, `game.js:324` |
| Repro | `node docs/bugs/repro.js` → `FAIL [BUG-010]` |

## Symptom

The array named `specials` contains one entry per matched **run**, including runs of exactly 3
that create no special gem at all. Every consumer must re-filter by `len`, and forgetting to do so
is precisely the class of bug that produced the surviving-gem defect fixed in the working tree
(`engine.js:151-156`, `game.js:378-382`).

## Reproduction steps

```js
const g = E.makeGrid(8, (r, c) => E.gem((c + r * 3) % 6));
g[0][0] = E.gem(1); g[0][1] = E.gem(1); g[0][2] = E.gem(1); // plain 3-match
E.findMatches(g, 8).specials;
```

Observed output:

```
specials=[{"r":0,"c":1,"type":1,"len":3,"dir":"h"}]   // nothing is spawned from this entry
```

## Expected behaviour

Either `findMatches()` returns only runs that actually produce a special, or the field is named
for what it is (e.g. `runs`) and the spawn rule lives in one documented place.

## Actual behaviour

`findMatches()` pushes an entry for every `len >= 3` run:

```js
// engine.js:29-30
const sr = r, sc = runStart + Math.floor(len / 2);
specials.push({ r: sr, c: sc, type: grid[r][sc]?.type, len, dir: 'h' });
```

The spawn threshold (`len >= 4` line, `len >= 5` bomb) is then re-implemented independently in
three places:

| Consumer | Filter |
|---|---|
| `engine.js:155` `popSet()` | `if (sp.len >= 4)` |
| `game.js:382` `resolveBoard()` keep-set | `specials.filter((sp) => sp.len >= 4)` |
| `game.js:364-369` placement loop | `if (sp.len >= 5) … else if (sp.len === 4) …` |
| `engine.js:123` / `game.js:410` `collectSpecialClears()` | no filter — iterates the phantom entries too |

`findMatches()` also reports `type` from a cell lookup that can be `null`
(`grid[r][sc]?.type`), so entries are not guaranteed to be well-formed.

## Suggested fix

Make the spawn rule a single named helper used by all consumers:

```js
// one definition of the reward rule
function specialFor(len) { return len >= 5 ? 'bomb' : len === 4 ? 'line' : null; }
// findMatches returns { matched, runs }  (runs = every run, with `spawn: specialFor(len)`)
```

Keep `specials` (or rename to `spawned`) for the entries that actually place a gem; pass `runs`
where "which gems were hit" matters (`collectSpecialClears`).

## Acceptance criteria

- [ ] `docs/bugs/repro.js` reports `PASS [BUG-010]`.
- [ ] Exactly one place in the codebase encodes the `len → special` rule.
- [ ] `len >= 4` filters are gone from `popSet()` and the keep-set (they become unnecessary).
- [ ] Naming documents the distinction (`runs` vs `spawned`) in the `engine.js` header comment.

## Related

BUG-001, BUG-002, BUG-003, BUG-007, BUG-008.
