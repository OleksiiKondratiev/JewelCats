# BUG-011 — The `hasPossibleMove` test is vacuous; special tests use hand-made inputs

| Field | Value |
|---|---|
| ID | BUG-011 |
| Severity | Low |
| Type | Test-quality defect |
| Status | Open |
| Component | `tests/engine.test.js` |
| Affected lines | `tests/engine.test.js:213-222`, `tests/engine.test.js:173-191`, `tests/engine.test.js:70` |
| Repro | `node tests/engine.test.js` → 24 passed while 5 documented bugs reproduce |

## Symptom

The suite reports **24 passed / 0 failed** while `node docs/bugs/repro.js` reproduces five real
defects (BUG-001, BUG-002, BUG-003, BUG-007, BUG-010). Several assertions cannot fail in a way
that matters.

## Details

**1. `hasPossibleMove` never asserts the answer** (`tests/engine.test.js:213-222`):

```js
const ok = E.hasPossibleMove(g, 8);
assert(typeof ok === 'boolean', 'hasPossibleMove returns a boolean');   // always true
```

`hasPossibleMove` returning `false` for a board that clearly has a move would not fail this test —
yet that false-negative would cause spurious shuffles mid-game (and, at game start, the dead board
of BUG-009).

**2. The special tests feed pre-fabricated special descriptors** (`tests/engine.test.js:173-191`):

```js
const specials = [{ r: 2, c: 3, type: 1, len: 4, dir: 'h' }];   // hand-written, not derived
const extra = E.collectSpecialClears(specials, new Set(), g, 8);
```

Because `specials` is written by hand and always placed at the cell the test expects, the tests
bypass exactly the two defects that exist in real play: the special must be *discovered* among the
matched cells (BUG-001) and its axis must come from the gem (BUG-002). They also pass `new Set()`
as `matched`, so the real call shape is never exercised.

**3. The "run of 3" assertion tolerates phantom entries** (`tests/engine.test.js:70`):

```js
eq(specials.filter(s => s.dir === 'h').length >= 1, true,
   'a horizontal special is recorded for a run>=3');
```

This pins the *wrong* behaviour — it asserts that a plain 3-match produces a `specials` entry,
which is BUG-010.

**4. No coverage of the multi-step loop.** Nothing exercises gravity → refill → next cascade, the
clear-set interaction with blast cells, or `shuffleBoard()`/`buildBoard()` behaviour — and nothing
can cover `game.js` at all (BUG-008).

## Suggested fix

- Assert values, not types: `assert(E.hasPossibleMove(g, 8) === true, ...)` plus a negative case
  (a checkerboard with no legal move must return `false`).
- Derive `specials` from `findMatches()` in the blast tests instead of writing them by hand, and
  pass the real `matched` set.
- Replace the `length >= 1` assertion at line 70 with an exact expectation for the run under test
  (`len: 3` → no spawn, per BUG-010).
- Add a small end-to-end engine test: build a grid, apply `popSet` + `collectSpecialClears` +
  `applyGravity`, assert the resulting board and that the cascade terminates.

## Acceptance criteria

- [ ] Each new assertion fails on `main` before the corresponding fix and passes after it.
- [ ] `hasPossibleMove` has both a positive and a negative case.
- [ ] `collectSpecialClears` tests derive their input from `findMatches()`.
- [ ] The suite's pass count no longer contradicts `docs/bugs/repro.js`.

## Related

BUG-001, BUG-002, BUG-008, BUG-009, BUG-010.
