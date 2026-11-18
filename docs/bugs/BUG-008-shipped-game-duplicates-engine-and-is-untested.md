# BUG-008 — The shipped game duplicates the engine; the tested code is never loaded

| Field | Value |
|---|---|
| ID | BUG-008 |
| Severity | High |
| Type | Architecture / test-integrity defect |
| Status | Open (confirmed) |
| Component | `index.html`, `game.js`, `engine.js`, `tests/engine.test.js` |
| Affected lines | `index.html:570-571`, `engine.js:1-185`, `game.js:284-477`, `engine.js:177-184` |
| Repro | `grep -n "<script" index.html` → only `board-fit.js` and `game.js` |

## Symptom

`engine.js` is documented as the "pure game engine (DOM-free, testable)" and `tests/engine.test.js`
tests it, but the browser never loads it. `game.js` carries a second, independent copy of every
rule. A green test run therefore proves nothing about the code the player actually executes, and
every rule fix has to be written twice.

## Evidence

`index.html` script tags (lines 570-571):

```html
<script src="board-fit.js"></script>
<script src="game.js"></script>
```

No `engine.js`, and `game.js` never references `JewelEngine` or `require(...)` (0 matches).

Duplicated logic (engine line → game line):

| Function | `engine.js` | `game.js` |
|---|---|---|
| `findMatches` | 16 | 292 |
| `addRun` | 58 | 335 |
| `createsMatchAt` | 65 | 100 |
| `inBounds` | 71 | 524 |
| `swap` | 76 | 284 |
| `applyGravity` | 83 | 434 |
| `hasPossibleMove` | 102 | 457 |
| `collectSpecialClears` | 123 | 410 |
| `key`, gem factory | 12, 173 | 49, 51 |
| clear-set builder | `popSet` 149 | inlined in `resolveBoard` 382-384 |

Drift already happened: the copies have **different signatures** for the same concept —
`engine.js:123 collectSpecialClears(specials, matched, grid, size)` vs
`game.js:410 collectSpecialClears(specials, matched)` (implicit closure over `grid`/`SIZE`).
`engine.js:149 popSet()` has no counterpart at all in `game.js`, so the tested clear-set helper is
dead code for the app (referenced only by `engine.js` itself and `tests/engine.test.js:100,196,206`).

Concrete cost: the working-tree fix "keep only `len >= 4` birth cells" had to be applied in two
places (`engine.js:151-156` and `game.js:378-382`) with the same comment duplicated in both files —
and the same duplication is required for BUG-001, BUG-002, BUG-003 and BUG-007.

## Expected behaviour

One implementation of the rules, loaded by the page and by the Node tests.

## Actual behaviour

Two implementations that can diverge silently; the test suite validates the unused copy.

## Suggested fix

1. Add `<script src="engine.js"></script>` **before** `game.js` in `index.html`.
2. In `game.js`, bind the engine instead of re-declaring it:

   ```js
   const E = window.JewelEngine;
   const { key, findMatches, popSet, collectSpecialClears, applyGravity, hasPossibleMove,
           createsMatchAt, inBounds, swap } = E;
   const find = () => findMatches(grid, SIZE);
   const gravity = () => applyGravity(grid, SIZE, randomGem);
   ```

3. Delete the duplicated bodies from `game.js` (lines 284-339, 410-431, 434-477, 524-526).
4. Keep `board-fit.js`/rendering/HUD in `game.js` — only rules move to the engine.
5. Optional follow-up: give the project a `package.json` with `"scripts": { "test": "node tests/engine.test.js" }`
   so the suite is discoverable.

## Acceptance criteria

- [ ] `grep -n "engine.js" index.html` shows the tag, and the game still plays in the browser.
- [ ] `game.js` contains no second implementation of matching/gravity/special rules (table above
      empty or reduced to thin wrappers).
- [ ] `node tests/engine.test.js` and `node docs/bugs/repro.js` still pass/fail as documented.
- [ ] A browser smoke test (manual checklist or Playwright) covers one swap → cascade → special.

## Related

Blocks reliable fixes for BUG-001, BUG-002, BUG-003, BUG-004, BUG-006, BUG-007, BUG-009, BUG-010.
