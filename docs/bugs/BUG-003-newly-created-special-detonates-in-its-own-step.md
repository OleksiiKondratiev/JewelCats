# BUG-003 — A freshly created special detonates in the same step that created it

| Field | Value |
|---|---|
| ID | BUG-003 |
| Severity | High |
| Type | Gameplay defect |
| Status | Open (reproduced) |
| Component | `game.js` `resolveBoard()` |
| Affected lines | `game.js:363-370` (placement), `game.js:376` (blast collection) |
| Repro | `node docs/bugs/repro.js` → `FAIL [BUG-003]` |

## Symptom

Making a match of 4 or 5 immediately wipes out an entire row/column on the same move. The new
blaster then sits on the board having already spent its blast, which makes 4/5-matches feel
random and destroys the "save the blaster for later" mechanic advertised in the UI
(`index.html:552` — *"Tip: match 4 for a line blaster 🐾"*).

## Reproduction steps

`resolveBoard()` mutates the board **before** collecting blast areas:

```js
// game.js:363-370 — write the new special straight into the grid
for (const sp of specials) {
  if (sp.len >= 5)      grid[sp.r][sp.c] = { ...grid[sp.r][sp.c], special: 'bomb' };
  else if (sp.len === 4) grid[sp.r][sp.c] = { ...grid[sp.r][sp.c], special: 'line' };
}
// game.js:376 — ...then read the grid back to find specials that "are on the board"
const extraClear = collectSpecialClears(specials, matched);
```

Engine simulation of that exact ordering (run of 4 at row 3):

```
E) extraClear from the JUST-created line: 8 cells
E) total cleared = 7  (4 for the run itself, 3 extra beyond it)
```

## Expected behaviour

A special created by step *n* becomes an ordinary board gem that only detonates when a **later**
match includes it. Step *n* clears the run's cells (keeping the birth cell alive) and nothing
else.

## Actual behaviour

Because the placement mutates `grid` before `collectSpecialClears()` inspects `grid[r][c]`, the
brand-new blaster/bomb is indistinguishable from a pre-existing one and fires immediately in the
same cascade step.

Note: `keep` (`game.js:382`) removes the birth cell from `clearAll` **after** the blast cells are
merged (`game.js:383-384`), so the new special survives its own blast — the net effect is "free
row wipe, blaster stays", which is neither the intended nor a self-consistent rule. A side
effect of the same ordering: a blast can never destroy a special created in the same step.

## Root cause

Ordering inside `resolveBoard()`: the function conflates *"place the reward gem"* with *"trigger
the specials that were on the board when the match happened"*. There is no marker separating
"special that already existed" from "special created this step".

## Suggested fix

Collect the blast areas from the **pre-existing** specials first, and only then place the new
ones:

```js
const extraClear = collectSpecialClears(matched, grid, SIZE); // reads board BEFORE mutation
// ... clear cells ...
// place newly created specials while writing survivors, so they cannot self-fire
```

If the blast is deferred, the `keep` / `clearAll.delete(k)` interplay documented above becomes
unnecessary and can be simplified to "matched cells minus birth cells".

## Acceptance criteria

- [ ] `docs/bugs/repro.js` reports `PASS [BUG-003]` (`extraClear` empty for a fresh run of 4).
- [ ] Unit test: a run of 4 clears exactly its 4 cells minus the birth cell (3 cells) and leaves
      one `line` gem on the board, with no other cells cleared.
- [ ] Unit test: a run of 5 clears its 5 cells minus the birth cell and leaves a `bomb`.
- [ ] Unit test: a pre-existing `bomb` that is part of a match fires in that step (guards
      against over-deferring — depends on BUG-001).

## Related

BUG-001, BUG-002 (all three live in the same 40-line block), BUG-012 (blast cells score nothing).
