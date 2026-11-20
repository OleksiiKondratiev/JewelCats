# Runbook — agent skills: inventory, provenance, verification

Audience: anyone (human or AI agent) touching `AGENTS.md`, `.agents/skills/` or `skills-lock.json`.
Founding context: BUG-013 (files untracked and not ignored), BUG-014 (lockfile not verifiable),
BUG-015 (`grill-me` was a no-op).

## The policy

| Path | Tracked? | Why |
|---|---|---|
| `AGENTS.md` | **yes** | Operating contract for every agent working in this repo; must be reviewable in history |
| `.agents/skills/**` | **yes** | Project tooling — packaged procedures that the contract refers to |
| `skills-lock.json` | **yes** | Provenance record for externally sourced skills (see the gap below) |
| `.vscode/` | **no** (ignored) | Machine-specific: model names, prompts, token limits, local editor prefs |

The `.gitignore` comment names both halves of the split so it does not drift back. If you add agent
config, decide which column it belongs to before you create the file.

## Inventory (2026-11-20)

| Skill | Owner | In `skills-lock.json` | Notes |
|---|---|---|---|
| `validate-change` | repo | no | Validation gate |
| `security-review` | repo | no | Security checklist |
| `work-item` | repo | no | Defect lifecycle through `docs/bugs/` |
| `grill-me` | external (`mattpocock/skills`) | yes | Body rewritten locally — see below |

`grill-me/agents/openai.yaml` is upstream bundle metadata (display name, `allow_implicit_invocation`)
and is not represented in the lockfile at all.

## Verification gap — read this before trusting the lockfile (BUG-014)

`skills-lock.json` pins `grill-me` with:

```
"computedHash": "9cdbb4b8f7a3aeaef82e6230c9e823500d4a8a1214c726cf342cf9829d34fc7d"
```

That hash matches nothing available in this repository:

| State | `shasum -a 256` of `SKILL.md` |
|---|---|
| recorded in the lockfile | `9cdbb4b8…` |
| as installed, before the BUG-015 rewrite (157 B) | `caaf8b8d…` |
| as installed, after the BUG-015 rewrite (1752 B) | `ba39719a…` |

There is no installer, verifier or CI step that reads the file, so nothing fails when it goes stale.
The mismatch is currently **unresolved by design** — BUG-014 lists the options. Until it is resolved,
treat `skills-lock.json` as provenance metadata, not as an integrity check.

## Why `grill-me` deliberately does not match upstream

The upstream body was a single line — `Call the Skill tool with "grilling"` — forwarding to a sibling
skill that was never installed here, which made the skill a silent no-op (BUG-015). The body was
rewritten as a self-contained procedure; frontmatter (`name: grill-me`,
`disable-model-invocation: true`) is unchanged. The `## Provenance` section inside the skill records
this, so the divergence survives a future refresh attempt.

## Commands

```bash
# inventory + tracking state
find .agents -type f | sort
git ls-files .agents skills-lock.json AGENTS.md

# confirm the ignore policy (git prints the LAST matching pattern, not the only one)
git check-ignore -v .vscode/settings.json .DS_Store cats/.DS_Store cats/sub/.DS_Store

# the BUG-014 gap, in two lines
grep computedHash skills-lock.json
shasum -a 256 .agents/skills/grill-me/SKILL.md

# the BUG-013 hygiene gate — must print the fallback, not a file list
git status --porcelain -uall | grep '^??' || echo 'nothing untracked'
```

## Adding or updating a skill

1. `.agents/skills/<name>/SKILL.md`, with frontmatter `name` **matching the directory** and a body
   under 500 lines (current bodies: 37–66 lines).
2. Prefer extending an existing skill over adding a near-duplicate.
3. Externally sourced: add a `source` / `sourceType` / `skillPath` entry to `skills-lock.json` and
   say in the skill body that it was modified locally. A `computedHash` you cannot verify is worse
   than none — see BUG-014.
4. If a new skill changes how work is validated or documented, update `AGENTS.md` in the same commit;
   it is the entry point agents actually read.

## Related

`AGENTS.md` ("Knowledge capture"), `docs/bugs/BUG-013-*.md`, `docs/bugs/BUG-014-*.md`,
`docs/bugs/BUG-015-*.md`.