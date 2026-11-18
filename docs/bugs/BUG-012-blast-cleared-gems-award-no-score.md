# BUG-012 — Gems removed by a special's blast award no points; the birth cell is scored but not popped

| Field | Value |
|---|---|
| ID | BUG-012 |
| Severity | Low (scoring-design defect) |
| Type | Gameplay / scoring |
| Status | Open (code review) |
| Component | `game.js` `resolveBoard()` |
| Affected lines | `game.js:357-361`, blast set built at `game.js:376-384` |

## Symptom

Two inconsistencies in the score model:

1. A line blaster that wipes 8 extra gems awards **0 points** for them, and those gems also do not
   feed the chain multiplier — the whole blast is free.
2. `MATCH_BASE` is documented as "points per jewel in a 3-match" (`game.js:11`), but a run of 4 or
   5 scores every cell of the run even though the birth cell is *not* popped (it becomes the new
   special), so the player is paid for a jewel that is still on the board.

## Reproduction steps

1. Create a line blaster (match 4), then trigger it. Watch the score: the row wipe adds nothing
   (or, with BUG-003 fixed, nothing until the cascade ends).
2. Compare `+N` popups (`game.js:373`) with the number of gems that actually disappear — for a
   run of 4 the popup is `+240` (4 × 60) while only 3 gems are removed.

## Expected behaviour

A single documented rule, e.g. `score = clearedCells × MATCH_BASE × chainMultiplier`, where
`clearedCells` is the size of the set actually removed (`clearAll` minus the preserved birth
cells). Whether blast cells count and whether they extend the chain must be stated explicitly.

## Actual behaviour

```js
// game.js:357-361 — scored BEFORE the blast set is even computed, and only from `matched`
const chainMult = 1 + chain * CHAIN_BONUS / 100;
const gained = Math.round(matched.size * MATCH_BASE * chainMult);
score += gained;
```

`extraClear` (`game.js:376`) and the `keep` adjustment (`game.js:382-384`) never influence the
score, and the chain counter (`chain + 1` at `game.js:406`) only advances on refill cascades.

## Suggested fix

Compute the score from the final clear set, after the keep/blast resolution:

```js
const toClear = /* the same set the gems are actually removed from */;
const gained = Math.round(toClear.size * MATCH_BASE * chainMult);
```

Decide and document whether a blast starts a new chain level (most match-3 games count the
resulting cascade, not the blast itself). Keep the floating popup (`game.js:373`) in sync with the
number used.

## Acceptance criteria

- [ ] A unit/integration test asserts the exact score for: a plain 3-match, a run of 4, a
      blast-triggered row wipe, and a 2-step chain (expected values written down).
- [ ] The popup value equals the value added to `score`.
- [ ] The rule is documented next to `MATCH_BASE` / `CHAIN_BONUS` (`game.js:11-12`).

## Related

BUG-003 (the current self-detonation makes this nearly invisible), BUG-008.
