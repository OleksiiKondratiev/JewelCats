# JewelCats
Jewel Cats game as web app

Vanilla-JS HTML5 match-3 game — no build step, no dependencies. Open `index.html` in a browser, or
serve the repository root with any static server. VS Code Live Server works out of the box; set
`liveServer.settings.port` in your own editor settings if you want port 5500 — `.vscode/` is
personal, machine-specific config and is git-ignored, so a fresh clone has none.

## Layout

| Path | What it is |
|---|---|
| `index.html` | UI, styles, game markup |
| `game.js` | Game loop: input, cascades, specials, HUD, timer |
| `engine.js` | DOM-free rules used by the Node tests (see BUG-008: the page does not load it) |
| `board-fit.js` | Responsive board sizing |
| `cats/62px/` | Gem sprites |
| `tests/` | Zero-dependency Node test suite |
| `docs/bugs/` | Bug / work-item tracker + repro harness |
| `docs/runbooks/` | Operational procedures (agent skill provenance, refresh, hygiene gate) |
| `AGENTS.md` | Instructions for AI coding agents — commands, conventions, validation gate |
| `.agents/skills/` | Agent skills: `validate-change`, `security-review`, `work-item`, `grill-me` |

## Commands

```bash
node tests/engine.test.js   # unit suite (currently 24 assertions, all green)
node docs/bugs/repro.js     # reproduces the documented engine defects (exit 1 = still broken)
```

## Contributing / agent instructions

[`AGENTS.md`](AGENTS.md) is the operating contract for both humans and AI agents: the commands
above, code conventions, the validation gate and where documentation belongs. Repeated procedures
are packaged as skills under `.agents/skills/` (`SKILL.md` per skill); externally sourced skills
are pinned in `skills-lock.json` — that lockfile is **not currently verifiable**, see
[`docs/runbooks/agent-skills.md`](docs/runbooks/agent-skills.md) and BUG-014.

## Known issues

The work-item board is [docs/bugs/README.md](docs/bugs/README.md) — 15 items with severity,
reproduction steps, root cause, suggested fix and acceptance criteria. Each item is mirrored as a
[GitHub issue](https://github.com/OleksiiKondratiev/JewelCats/issues) (`#1`–`#15`); the markdown
file in `docs/bugs/` holds the full write-up.

