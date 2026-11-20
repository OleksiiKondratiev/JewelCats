# BUG-015 — `grill-me` delegates to a `grilling` skill that does not exist

| Field | Value |
|---|---|
| ID | BUG-015 |
| Severity | Low |
| Type | Agent tooling |
| Status | Fixed (local rewrite, 2026-11-20) |
| Component | `.agents/skills/grill-me/SKILL.md` |
| Affected lines | entire body (was one line) |
| Repro | `cat .agents/skills/grill-me/SKILL.md` — the body is a pointer, not a procedure |

## Symptom

Invoking the `grill-me` skill produced no interview. The frontmatter registered the skill correctly
(`name: grill-me`, `disable-model-invocation: true`), so it appeared in the skill list and could be
called, but calling it yielded a one-line indirection with nothing to execute.

## Reproduction steps

Before the fix the whole body was:

```
Call the Skill tool with "grilling".
```

No `grilling` skill exists in `.agents/skills/` (only `grill-me`, `security-review`,
`validate-change`, `work-item`) or anywhere else in the repository.

## Expected behaviour

A skill file that is registered and invokable contains the procedure itself, so the agent has
something to follow.

## Actual behaviour

The installed upstream skill is a thin forwarder to a sibling skill (`grilling`) that lives in the
upstream bundle but was never installed here. The forwarder therefore resolved to nothing: a no-op
skill that looked healthy.

## Root cause

`.agents/skills/grill-me/SKILL.md` was copied out of `mattpocock/skills`
(`skills/productivity/grill-me/SKILL.md`) without its companion skill. The delegation was never
validated against what is actually installed — see BUG-014, which is why no tooling would have caught
it either.

## Fix applied

Rewrote the body as a self-contained interview procedure (restate → rank risks → one question at a
time → fold in the answer → stop when no material risk remains), keeping the frontmatter untouched and
adding a `## Provenance` section that records the upstream source and the fact that the body was
rewritten locally.

## Acceptance criteria

- [x] `grill-me` body contains an executable procedure; no reference to an uninstalled skill.
- [x] Frontmatter unchanged (`name` matches the directory, `disable-model-invocation: true`).
- [x] The divergence from the pinned upstream source is documented
      (`docs/runbooks/agent-skills.md`) — this makes the BUG-014 hash mismatch permanent by design.
- [ ] Still open upstream: `skills-lock.json` now describes content this repository deliberately does
      not match (BUG-014).

## Related

BUG-013 (the file was untracked when this was found), BUG-014 (the unverifiable pin).
