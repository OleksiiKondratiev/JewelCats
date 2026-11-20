---
name: validate-change
description: Runs the repository validation gate for a code change — unit suite, defect repro harness, edge-case, regression, failure-path and negative review, plus the manual browser pass for the untested game.js and index.html. Use before claiming a change works, before committing or opening a PR, or when the user asks to test, verify, check or validate.
---

# Validate change

Never report a change as done, fixed or working without running the gate below. If a check
cannot run, say so explicitly instead of implying it passed.

## 1. Automated gate

```bash
node tests/engine.test.js   # expect: "Passed: N   Failed: 0", exit 0
node docs/bugs/repro.js     # expect: exit 0 only once every documented defect is fixed
```

`repro.js` asserts the **correct** behaviour, so a `FAIL [BUG-0XX]` line is a known defect, not a
regression. Record the failing-check count **before** you start and compare after: the count must
not grow, and the item you fixed must flip to `PASS [BUG-0XX]`.

## 2. Test obligations per change

| Touched | Required |
|---|---|
| `engine.js` | assertions in `tests/engine.test.js` using the existing `assert` / `eq` / `gridFromRows` / `makeGrid` helpers |
| documented defect | a `check('BUG-0XX', ...)` in `docs/bugs/repro.js` plus a unit assertion |
| `game.js`, `index.html`, `board-fit.js` | manual browser pass (section 4) — no automated coverage exists (BUG-008) |
| any file | update existing tests; remove tests that no longer describe the design |

- A new test must **fail before the fix and pass after it**. Prove both.
- Never weaken, delete or comment out a test to make a run green. Retire obsolete tests only with
  a stated reason in the report.
- No coverage tool exists; assert the specific branch you changed, do not estimate coverage.

## 3. QA analysis

- **Edge cases**: empty board, full board, 1-cell runs, len 5+ runs, overlapping L/T runs,
  board-edge coordinates, resize to minimum size, timer at 0.
- **Regression**: re-check the behaviour the change did not target (scoring, cascade depth, HUD,
  specials, pause/resume).
- **Failure paths**: invalid swap, no-possible-move, game over mid-cascade, rapid input during
  animation, tab blur/visibility change.
- **Negative tests**: out-of-range indices, `null` cells, non-numeric input, repeated events.
- **Resilience**: error handling, logging, state consistency after a failure.
- **Hunt for**: re-entrancy in the cascade loop, race between animation timers and input,
  duplicate or leaked event listeners, unbounded arrays, memory growth, hot spots in
  `findMatches`.

## 4. Manual browser pass (required for DOM-layer changes)

Serve the repo (Live Server, port 5500) and check: swap accepted/rejected feedback, cascade
resolves to a stable board, specials created and detonate once, score and chain bonus, HUD and
timer, pause → resume keeps state, game over stops all resolution, resize keeps the board fitted.

## 5. Report

```
VALIDATION
- node tests/engine.test.js -> Passed: N Failed: 0
- node docs/bugs/repro.js   -> FAIL count 5 -> 4 (BUG-003 now PASS)
- manual pass -> swaps, cascade, pause/resume, game over OK
```

If anything failed, report it as failing and keep working until it is green or the user decides
otherwise.
