# BUG-014 — `skills-lock.json` records a hash that matches nothing and pins one skill of four

| Field | Value |
|---|---|
| ID | BUG-014 |
| Severity | Low |
| Type | Repo hygiene / tooling |
| Status | Open |
| Component | `skills-lock.json` |
| Affected lines | `skills-lock.json:3-10` (`skills` map), `skills-lock.json:8` (`computedHash`) |
| Repro | `shasum -a 256 .agents/skills/grill-me/SKILL.md` and compare with `computedHash` |

## Symptom

`README.md` and `AGENTS.md` both present `skills-lock.json` as the mechanism that pins externally
sourced skills, implying a fresh clone can verify or reproduce the skill install. Nothing in the
repository can confirm the pin, and nothing consumes it.

## Reproduction steps

```bash
cat skills-lock.json
shasum -a 256 .agents/skills/grill-me/SKILL.md
find .agents -type f | sort      # what actually exists
```

## Expected behaviour

Either the recorded hash reproduces from the installed file, or the file does not claim to be a
verifiable pin. A lock that covers one skill of four should not be described as pinning the project's
skills.

## Actual behaviour

The lockfile pins exactly one skill — `grill-me` — out of the four installed
(`grill-me`, `security-review`, `validate-change`, `work-item`; five files counting
`grill-me/agents/openai.yaml`, which is not represented at all):

```json
{
  "version": 1,
  "skills": {
    "grill-me": {
      "source": "mattpocock/skills",
      "sourceType": "github",
      "skillPath": "skills/productivity/grill-me/SKILL.md",
      "computedHash": "9cdbb4b8f7a3aeaef82e6230c9e823500d4a8a1214c726cf342cf9829d34fc7d"
    }
  }
}
```

```
$ shasum -a 256 .agents/skills/grill-me/SKILL.md
caaf8b8de1684f96e26b28f3c29189db5c89cce4b73e1c93d86164f66ef88637   # installed file, 157 B, before BUG-015
```

The two hashes do not match. The upstream file (`skills/productivity/grill-me/SKILL.md` in
`mattpocock/skills`) is not vendored, so the recorded hash cannot be reproduced from **any** state
available in this repository — it matches neither the installed file nor the pre-BUG-015 content.

## Root cause

The lockfile was written by an external skill-install tool whose hashing input is not recorded here
(unknown revision, and unknown normalization of the source text). No installer, verifier or CI step
in this repository reads the file, so the mismatch is never surfaced.

## Suggested fix (pick one)

- **A — make the pin real.** Vendor a ~30-line zero-dependency `scripts/skills-verify.js` that walks
  the `skills` map, hashes each `skillPath` target and exits non-zero on mismatch; re-record the
  hashes from the installed content; add it to the `AGENTS.md` command list.
- **B — stop claiming a pin.** Drop `computedHash`, keep `source`/`sourceType`/`skillPath` as
  provenance only, and say so in `docs/runbooks/agent-skills.md`.
- **C — re-run the upstream tool** that generated the lockfile and regenerate it from a known
  revision.

Do not leave the file as it is: a hash that matches nothing is worse than no hash, because it invites
trust.

## Acceptance criteria

- [ ] `skills-lock.json` either verifies against installed content or no longer claims to.
- [ ] One copy-pasteable verification command exists (script or documented `shasum`) and is referenced
      from `docs/runbooks/agent-skills.md`.
- [ ] Coverage matches reality: every tracked skill file is accounted for, or the omission is
      documented as intentional (repo-owned skills need no pin).
- [ ] `README.md` / `AGENTS.md` wording matches whichever option is chosen.

## Related

BUG-013 (files were untracked), BUG-015 (the pinned skill's body was rewritten locally, which moves
the installed file further from the recorded hash — that divergence is intentional and documented in
`docs/runbooks/agent-skills.md`).
