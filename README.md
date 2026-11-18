# JewelCats
Jewel Cats game as web app

Vanilla-JS HTML5 match-3 game — no build step, no dependencies. Open `index.html` in a browser
(or serve it with VS Code Live Server, configured for port 5500 in `.vscode/settings.json`).

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

## Commands

```bash
node tests/engine.test.js   # unit suite (currently 24 assertions, all green)
node docs/bugs/repro.js     # reproduces the documented engine defects (exit 1 = still broken)
```

## Known issues

The work-item board is [docs/bugs/README.md](docs/bugs/README.md) — 13 items with severity,
reproduction steps, root cause, suggested fix and acceptance criteria. Each item is mirrored as a
[GitHub issue](https://github.com/OleksiiKondratiev/JewelCats/issues) (`#1`–`#13`); the markdown
file in `docs/bugs/` holds the full write-up.

