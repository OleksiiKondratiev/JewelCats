# BUG-013 — `.agents/` and `skills-lock.json` are untracked and not git-ignored

| Field | Value |
|---|---|
| ID | BUG-013 |
| Severity | Low |
| Type | Repository hygiene |
| Status | Fixed — Option A (tracked as project config), 2026-11-20 |
| Component | `.gitignore`, repo root |
| Affected paths | `AGENTS.md`, `skills-lock.json`, `.agents/skills/grill-me/SKILL.md`, `.agents/skills/grill-me/agents/openai.yaml`, `.agents/skills/validate-change/SKILL.md`, `.agents/skills/security-review/SKILL.md`, `.agents/skills/work-item/SKILL.md`. `.vscode/settings.json` deliberately stays ignored. |

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
the repo; also add a `docs/` note about how to refresh it. `AGENTS.md` and the repo-owned skills
(`validate-change`, `security-review`, `work-item`) are project config, so this option keeps the
agent contract reviewable in history.

**Option B — treat it as personal tooling (consistent with the `.vscode/` comment):**

```gitignore
# Local / personal editor & AI-agent settings (not project config)
.vscode/
.agents/
skills-lock.json
```

Do **not** mix: committing `skills-lock.json` while ignoring `.agents/` (or vice versa) leaves a
lockfile for files that are not in the repo.

While at it, the `.DS_Store` patterns. `.gitignore` listed both `.DS_Store` and `*/.DS_Store`, and the
note above claimed the pair "only covers one level". **That claim is wrong**, and it is worth keeping
here because git's own output is easy to misread: a pattern without a slash matches at every depth, so
`.DS_Store` alone already covers deep paths —

```
$ git check-ignore -v cats/sub/.DS_Store
.gitignore:2:.DS_Store	cats/sub/.DS_Store
```

`git check-ignore -v` prints the **last** matching pattern, not the only one, so for `cats/.DS_Store`
it attributes the match to `*/.DS_Store` and invites the wrong conclusion. `*/.DS_Store` contains a
slash, so it is anchored to the repository root and is a strict subset of `.DS_Store` — dead weight.
It was removed rather than widened to `**/.DS_Store`.

## Resolution (2026-11-20)

**Option A.** `AGENTS.md`, `skills-lock.json` and everything under `.agents/skills/` are tracked;
`.vscode/` stays ignored, and its comment now states why (machine-specific model names, prompts,
token limits) while naming `AGENTS.md` / `.agents/skills/` as the tracked counterpart, so the split
cannot silently drift back. Provenance and the refresh procedure live in
`docs/runbooks/agent-skills.md`.

Two follow-ups were found while applying this fix and are logged separately rather than folded into
it: BUG-014 (`skills-lock.json` records a hash that matches nothing) and BUG-015 (`grill-me` was a
no-op pointer to an uninstalled skill).

## Acceptance criteria

- [x] `git status --porcelain -uall` has no `??` entries. The criterion originally read "`git status
      --porcelain` is empty", which is not achievable in the commit that lands this work — unrelated
      `engine.js` / `game.js` / test changes are already modified in the working tree. Untracked (`??`)
      is what this item is about.
- [x] `.gitignore` and the committed files agree with each other.
- [x] The `.gitignore` comment matches the actual policy.

## Related

Independent of the game logic. It did **not** land in its own commit: it shares a commit with the
2026-11-17 gameplay/test changes, which is stated in the commit message body.
