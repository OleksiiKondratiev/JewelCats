# BUG-0XX — <one-line title>

| Field | Value |
|---|---|
| ID | BUG-0XX |
| Severity | Critical / High / Medium / Low |
| Type | Gameplay / State machine / UX / Architecture / Test quality / Repo hygiene |
| Status | Open / In progress / Fixed (<commit>) |
| Component | `<file>` `<function>` |
| Affected lines | `file.js:NN-NN` |
| Repro | `node docs/bugs/repro.js` → `FAIL [BUG-0XX]` / manual steps |

## Symptom

What the player observes, in one or two sentences.

## Reproduction steps

Deterministic snippet (engine-level) when possible; otherwise numbered manual steps.

## Expected behaviour

The rule as it should work, stated precisely enough to be asserted in a test.

## Actual behaviour

What the code really does, with the observed output pasted in.

## Root cause

The specific lines/assumption that produce the defect — quote the code.

## Suggested fix

Concrete code sketch. If the fix must be applied in both `engine.js` and `game.js`, say so and
reference BUG-008.

## Acceptance criteria

- [ ] `docs/bugs/repro.js` reports `PASS [BUG-0XX]` (engine items) or a new test covers it.
- [ ] New test fails before the fix and passes after it.
- [ ] `node tests/engine.test.js` stays green.

## Related

BUG-0YY, BUG-0ZZ.
