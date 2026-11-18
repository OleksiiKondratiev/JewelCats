# Bug / Work-item tracker

Work items for defects found in the JewelCats codebase (audit of `main` at `5106312` plus the
uncommitted working-tree changes of 2026-11-17).

## How to use

- One file per work item: `BUG-0XX-<slug>.md` (copy [`_TEMPLATE.md`](_TEMPLATE.md)).
- Verify an engine-level bug with the reproduction harness:

  ```bash
  node docs/bugs/repro.js     # exit 1 = at least one documented bug is still present
  node tests/engine.test.js   # the existing unit suite
  ```

- When you fix an item: set `Status` to `Fixed`, link the commit, and make sure
  `docs/bugs/repro.js` flips that check to `PASS` (for engine items) or that a new unit test
  covers it (for `game.js` items).

## Board

| ID | Title | Severity | Type | Status | Verified by |
|----|-------|----------|------|--------|-------------|
| [BUG-001](BUG-001-pre-existing-special-off-center-never-fires.md) | A pre-existing special gem only fires if it sits on the matched run's **center** cell | High | Gameplay | Open | `repro.js` (FAIL) |
| [BUG-002](BUG-002-line-gem-blast-direction-comes-from-triggering-run.md) | Line blaster's blast direction comes from the triggering run, not from the gem | High | Gameplay | Open | `repro.js` (FAIL) |
| [BUG-003](BUG-003-newly-created-special-detonates-in-its-own-step.md) | A freshly created special detonates in the same step that created it | High | Gameplay | Open | `repro.js` (FAIL) |
| [BUG-004](BUG-004-shuffleboard-destroys-special-gems.md) | `shuffleBoard()` silently destroys all special gems on the board | Medium | Gameplay | Open | Code review (`game.js:479-511`) |
| [BUG-005](BUG-005-pause-then-resume-restarts-the-game.md) | "Paused / ▶ Resume" actually restarts the game and wipes progress | High | UX / state | Open | Code review (`game.js:150-163,533-543`) |
| [BUG-006](BUG-006-cascade-keeps-resolving-after-game-over.md) | Cascades keep running after `endGame()`: score, HUD and board mutate after game over | Medium | State machine | Open | Code review (`game.js:342-408,181-191`) |
| [BUG-007](BUG-007-overlapping-runs-give-order-dependent-special.md) | Two runs sharing one birth cell: the shorter run can overwrite the longer one's special | Medium | Gameplay | Open | `repro.js` (FAIL) |
| [BUG-008](BUG-008-shipped-game-duplicates-engine-and-is-untested.md) | `game.js` duplicates `engine.js`; the shipped code path is never loaded or tested | High | Architecture | Open | Code review (`index.html:570-571`) |
| [BUG-009](BUG-009-starting-board-can-have-no-legal-move.md) | `buildBoard()` can hand out a board with no legal move (retry loop has no fallback) | Low | Robustness | Open | Code review (`game.js:60-98`) |
| [BUG-010](BUG-010-specials-array-contains-phantom-len-3-entries.md) | `specials[]` carries entries for plain 3-runs that spawn nothing | Low | API design | Open | `repro.js` (FAIL) |
| [BUG-011](BUG-011-haspossiblemove-test-is-vacuous.md) | The `hasPossibleMove` test only asserts the return is a boolean | Low | Test quality | Open | Code review (`tests/engine.test.js:213-222`) |
| [BUG-012](BUG-012-blast-cleared-gems-award-no-score.md) | Gems removed by a special's blast award no points and do not feed the chain bonus | Low | Scoring design | Open | Code review (`game.js:357-361`) |
| [BUG-013](BUG-013-agent-config-untracked-and-not-gitignored.md) | `.agents/` and `skills-lock.json` are untracked and not ignored | Low | Repo hygiene | Open | `git status` |

## Suggested fix order

1. **BUG-008 first** — until `game.js` actually uses `engine.js`, every fix below has to be
   written twice and the test suite proves nothing about the shipped game.
2. Then the special-gem cluster: **BUG-001 → BUG-002 → BUG-003 → BUG-007** (all in
   `findMatches` / `collectSpecialClears` / the clear-set builder).
3. Then state-machine items: **BUG-005, BUG-006, BUG-004**.
4. Cleanup: **BUG-009, BUG-010, BUG-011, BUG-012, BUG-013**.

## Already fixed (working tree, not committed)

- Plain 3-matches (including both arms of an L/T shape) used to leave a surviving gem in the
  run's center cell; `popSet()` and `game.js` now keep only `len >= 4` birth cells. Covered by
  the new assertion in `tests/engine.test.js` ("L-shape of two 3-runs clears all 5 L cells").
