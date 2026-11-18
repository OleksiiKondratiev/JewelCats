# BUG-013 — `.agents/` and `skills-lock.json` are untracked and not git-ignored

| Field | Value |
|---|---|
| ID | BUG-013 |
| Severity | Low |
| Type | Repository hygiene |
| Status | Open (confirmed by `git status`) |
| Component | `.gitignore`, repo root |
| Affected paths | `.agents/skills/grill-me/SKILL.md`, `.agents/skills/grill-me/agents/openai.yaml`, `skills-lock.json` |

## Symptom

`git status` permanently shows untracked files that are neither meant to be committed nor ignored,
so every commit needs a manual "don't stage that" pass and the working tree is never clean.

```
Untracked files:
        .agents/skills/grill-me/SKILL.md
        .agents/skills/grill-me/agents/openai.yaml
        skills-lock.json
```

## Why it is inconsistent

`.gitignore:5-6` already declares the policy for this kind of file:

```gitignore
# Local / personal editor & AI-agent settings (not project config)
.vscode/
```

…the same category of tooling config is left untracked-but-not-ignored in two other places.

## Content review

Nothing sensitive is in there (checked 2026-11-17):

- `.agents/skills/grill-me/SKILL.md` (157 B) — front-matter `name: grill-me`, `disable-model-invocation: true`, body: `Call the Skill tool with "grilling"`. Source: `mattpocock/skills` per `skills-lock.json`.
- `.agents/skills/grill-me/agents/openai.yaml` (137 B) — display name/description and `allow_implicit_invocation: false`. No tokens, no machine paths.
- `skills-lock.json` — lockfile pinning skill `grill-me` to `github:mattpocock/skills` with `computedHash`.

## Expected behaviour

Each of these is either versioned (reproducible project tooling) or ignored (personal tooling).
Permanently "untracked but present" is neither.

## Suggested fix (pick one, then be consistent)

**Option A — treat agent skills as project config (recommended for a lockfile):**

```bash
git add .agents skills-lock.json docs/
```

Benefit: `skills-lock.json` + `computedHash` gives a reproducible skill install for anyone cloning
the repo; also add a `docs/` note about how to refresh it.

**Option B — treat it as personal tooling (consistent with the `.vscode/` comment):**

```gitignore
# Local / personal editor & AI-agent settings (not project config)
.vscode/
.agents/
skills-lock.json
```

Do **not** mix: committing `skills-lock.json` while ignoring `.agents/` (or vice versa) leaves a
lockfile for files that are not in the repo.

While at it: `.DS_Store` and `*/.DS_Store` (`.gitignore:2-3`) only cover one level — `./.DS_Store`
and `./cats/.DS_Store` are covered, but any deeper `**.DS_Store` (e.g. inside a new asset folder)
would show up as untracked. Prefer `**/.DS_Store`.

## Acceptance criteria

- [ ] `git status --porcelain` is empty after the decision (no `??` entries).
- [ ] `.gitignore` and the committed files agree with each other.
- [ ] The `.gitignore` comment matches the actual policy.

## Related

Independent of the game logic; safe to land in its own commit.
