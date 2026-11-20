---
name: work-item
description: Bug and work-item lifecycle on the docs/bugs board — read an item, reproduce it first, fix it, add a failing-then-passing test, update the item file, the board table and the mirrored GitHub issue. Use when fixing, triaging, reproducing or documenting a defect, or whenever the user mentions BUG-0XX or asks to close an issue.
---

# Work item lifecycle

The board is `docs/bugs/README.md`; one markdown file per item is the source of truth. Every item
is mirrored as a GitHub issue (`#1`–`#13`) on `OleksiiKondratiev/JewelCats`.

## Order of work

1. **BUG-008 first** — `game.js` duplicates `engine.js` and the shipped path is untested, so any
   other engine fix has to be written twice and the suite proves nothing about the real game.
2. Then the special-gem cluster: BUG-001 → BUG-002 → BUG-003 → BUG-007.
3. Then state machine: BUG-005, BUG-006, BUG-004.
4. Cleanup: BUG-009, BUG-010, BUG-011, BUG-012, BUG-013.

## Procedure

1. **Read** the item file. If a new defect, copy `docs/bugs/_TEMPLATE.md` to
   `docs/BUG-0XX-<slug>.md` numbering — reuse the next free number, never renumber existing items.
2. **Reproduce before fixing.** Add or run a `check('BUG-0XX', label, cond, detail)` in
   `docs/bugs/repro.js`; build grids with `E.makeGrid(n, base)` and `E.gem(type, special)` so the
   case is deterministic. Confirm the check prints `FAIL`.
3. **Fix** in the smallest place that is correct. If the same rule lives in both `engine.js` and
   `game.js` (BUG-008), patch both in the same commit and say so.
4. **Lock it in** with a unit assertion in `tests/engine.test.js` that fails before the fix and
   passes after it, plus the `repro.js` check.
5. **Update the item**: set `Status` to `Fixed (<commit>)`, keep the root-cause section honest,
   tick the acceptance criteria, refresh the `README.md` board row.
6. **Mirror to GitHub**: close the issue (`Closes #N` in the commit message) or comment when the
   markdown write-up is fuller than the issue.
7. **Commit** one item per commit; message states the item id and the observable behaviour change.

## Rules

- Severity: Critical / High / Medium / Low. Type: Gameplay / State machine / UX / Architecture /
  Test quality / Repo hygiene. Status: Open / In progress / Fixed (`<commit>`).
- An item is not done while `repro.js` still prints `FAIL [BUG-0XX]` for it.
- New defects found while working: file them as items rather than fixing silently, unless the fix
  is a one-line drive-by — then mention it in the report.
- Do not mark an item fixed based on code reading alone; the harness or a test must prove it.
