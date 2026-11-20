---
name: security-review
description: Security and OWASP review of code, input handling, DOM rendering, storage, assets and dependencies. Use when touching user input, event handlers, innerHTML or DOM injection, localStorage, asset or sprite paths, config, or when the user asks for a security audit, vulnerability or secrets check.
---

# Security review

Treat every input as untrusted — including values that look internal: URL params, `localStorage`,
`postMessage`, DOM attributes, filenames, and data produced by earlier code.

## Principles

- Validate and sanitize at the boundary; keep the allowlist narrow (types, ranges, enums).
- Least privilege and secure defaults; fail closed.
- No secrets, tokens or machine paths in the repo; never log credentials or personal data.
- Prefer platform primitives (text nodes, `srcset` allowlists, `Blob`/object URLs with revocation)
  over string-built HTML.
- This repository has **zero dependencies** — adding one is a security decision. Check the
  package's maintenance, provenance and known CVEs before proposing it, and say so out loud.

## Checklist for this codebase

| Surface | What to check |
|---|---|
| DOM rendering | no `innerHTML` / `outerHTML` / `insertAdjacentHTML` fed with non-literal data; build nodes with `createElement` + `textContent` |
| Dynamic code | no `eval`, `new Function`, `setTimeout('string')`, dynamic `import(userInput)` |
| Assets | sprite/asset paths from an allowlisted set, never concatenated from user or level data |
| Storage | `localStorage` / `sessionStorage` reads validated before use (type, range, schema); writes hold no sensitive data |
| Event handlers | listeners added once and removable; no handler trusts `event.target` dataset blindly |
| Numbers/arrays | board and grid indices bounds-checked; no user-controlled index into `grid`; guard against `__proto__` / `constructor` keys when merging objects |
| Timers/animation | state machine cannot be driven by input after game over (see BUG-006) |
| Third-party snippets in `index.html` | provenance, SRI, necessity |
| Repo hygiene | no `.env`, key, or personal path committed; `.gitignore` covers local config |

## Report

Flag immediately, do not silently fix and do not ignore:

- vulnerability, exploitable path and affected file/line
- insecure pattern or unsafe/unmaintained dependency
- exposed secret or credential
- risky architecture decision

Format per finding:

```
SECURITY
- [High] XSS sink: game.js:NNN innerHTML with unescaped level name
  Fix: createElement + textContent
```

Severity: Critical (remote code execution / auth bypass / secret leak) → High → Medium → Low.
State explicitly when a review found nothing, rather than staying silent.
