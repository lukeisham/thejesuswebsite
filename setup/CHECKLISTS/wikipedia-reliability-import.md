# Wikipedia Reliability Import — Validation

## Validation: Wikipedia Reliability Widget Import
**Plan:** wikipedia-reliability-widget-import.md
**Date:** 2026-07-17

### Manual checks
- [ ] Run `cd api && npm run import-wikipedia-scoring -- --publish` on the local dev DB — script prints a summary (updated/created counts, 255 × 28 signals written) and exits 0; re-running it produces the same end state (idempotent).
- [ ] Corrupt one contribution in a scratch copy of `scoring-export.json` (e.g. set `bible_verses: 99`) and run with `--export <scratch path>` — script refuses to write anything, exits non-zero, names the offending article/signal.
- [ ] Open `/debate/wikipedia.html` locally — list renders in rank order (rank 1 first), infinite scroll works, no console errors.
- [ ] Expand the stones widget on a top-ranked article — a stone per signal, hover/focus tooltip shows the signal name, positive stones limestone-toned, triggered negative stones cracked/red-tinted.
- [ ] Expand the widget on a low-ranked article with penalties — negative stones show as damaged; the copy button copies a plain-English summary whose statements match the article's contributions.
- [ ] Check the invisible agent JSON block on a teaching or Bible-book article — `manuscripts` cap is 12 (doubled), 28 signals present, `net_score` equals the export's value for that article.
- [ ] `frontend/sitemap.xml` contains a `<url>` entry for `/debate/wikipedia.html`; existing entries untouched.
- [ ] Page intro reads "Reliability is based **on** a variety of factors" (Issues #42 fixed).
- [ ] After push + auto-deploy: `https://thejesuswebsite.org/debate/wikipedia.html` shows the live widget with real signal data (allow for Cloudflare cache staleness — re-check after a short wait if stale).

### Code-review checks
- [ ] JS-2 — import validates every article (28 known keys, |contribution| ≤ |cap|, sign match, Σ = net_score) before any write; single all-or-nothing transaction; non-zero exit on failure.
- [ ] SQL-1/SQL-3 — all queries prepared; multi-column insert uses named `@column` params; statements cached, not re-prepared per row.
- [ ] SR-1/JS-3 — one new script file mirroring `import-geoip.js`'s shape; pure helpers exported for tests via `require.main === module` guard; no new abstraction layer.
- [ ] JS-1/JS-4 — cap rules read as data + named functions; JSDoc cites the rubric for conditional caps rather than narrating the code.
- [ ] JS-6 — no new `innerHTML`/DOM handling introduced in the widget; dictionary change is data-only.
- [ ] deploy.sh step is idempotent, warns-and-continues when `scoring-export.json` is absent, and runs *without* `--publish`.
- [ ] `api/tests/import-wikipedia-scoring.test.js` covers every conditional cap branch and every validation reject listed in the plan; `cd api && npm test` fully green.
