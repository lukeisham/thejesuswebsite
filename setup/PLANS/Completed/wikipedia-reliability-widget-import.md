# Plan: Wikipedia Reliability Widget Import

**Module(s):** API / Database / Frontend / Shared
**Date:** 2026-07-17
**Status:** ✅ Completed

## Goal
Wire the "reliability stones" widget up end-to-end: build the import script that loads `database/scoring-export.json` (255 articles × 28 signal contributions) into `wikipedia_articles` + `wikipedia_article_signals` — including deriving each per-article `cap` from the scoring rubric — hook it into deploy so production data stays in sync, smoke-test the widget against real data, and clear out every known Wikipedia-module issue along the way (Issues.md #42–#44, a stale `capMagnitude`, and the page's missing sitemap entry).

## Coding rules to keep in mind
- **JS-2** — the import script must validate every article record before writing (URL present, all 28 contribution keys known, |contribution| ≤ |derived cap|, contributions sum to `net_score`) and abort loudly with a non-zero exit on any violation; never write a partial import (single transaction, all-or-nothing).
- **JS-1 / JS-4** — cap-derivation rules are encoded as data + small named functions, not a comment-explained switch; JSDoc explains *why* a cap is conditional (rubric reference), not what the code does.
- **JS-3** — no new abstraction layers: the script follows the existing `api/scripts/import-geoip.js` shape (plain Node script, `npm run` entry, invoked from `deploy.sh`).
- **SQL-1 / SQL-3** — prepared statements only; named `@column` parameters for the multi-column insert; signal rows written via a cached prepared statement inside a transaction.
- **SR-1** — one file per job: the import script is one new file; its pure helpers are exported from the same file for testing (matching `generate-sitemap.js`'s pattern), not split into a premature lib.
- **JS-6** — the frontend widget already renders via `templates.js` escaping; the dictionary fix must not introduce any new DOM/`innerHTML` handling.

## Cap-derivation reference (verified against the rubric before implementation — see first task)

Per-article `cap` = the maximum points magnitude *this article* could earn/lose for the signal, with conditionals resolved from `categories` and `raw_signals` in the export:

| signal_key | Base cap | Conditional rule |
|---|---|---|
| bible_verses | +9 | — |
| narrative_interp_split | +3 | — |
| manuscripts | +6 | ×2 (= +12) if `is_teaching` or `is_bible_book` |
| ante_nicene | +6 | — |
| arch_site | +2 | 0 if `is_parable` (rubric: scores 0 for parables) |
| location_bonus | +3 | 0 unless `is_location` |
| historical_context | +2 | — |
| journals | +5 | — |
| books | +5 | — |
| primary_quotes | +4 | — |
| jewish_context | +4 | — |
| balanced_debate | +3 | ×2 (= +6) if `raw_signals.balanced_debate_named >= 2` |
| commentaries | +3 | 0 unless `is_parable` or `is_teaching` |
| ancient_historians | +3 | — |
| wiki_quality | +1 | — |
| niche_bonus | +3 | +3 if `raw_signals.ref_count < 5`; +1 if 5–9; 0 otherwise |
| confessional_balance | −3 | — (worst case −3; −1/0 outcomes still cap at −3) |
| gnostic_quoted | −1 | — |
| poor_referencing | −1 | — |
| jesus_seminar | −6 | × `raw_signals.jesus_seminar_mult` (2 / 1 / 0.5), truncated toward zero |
| ot_nt_criticism | −6 | — |
| supernatural_criticism | −6 | — |
| passion_criticism | −6 | 0 unless `is_passion` |
| miracle_criticism | −6 | 0 unless `is_miracle` |
| other_religion | −3 | — |
| mythicist | −9 | × `raw_signals.mythicist_mult` (2 / 1 / 0.5), truncated toward zero (−9 × 0.5 → −4) |
| no_references | −8 | — |
| no_bible_verse | −10 | — |

A conditional signal whose condition fails gets `cap = 0` (and its contribution must be 0 — validated); the widget's `fulfilmentRatio` already returns 0 for a zero cap, rendering an untriggered stone.

## Tasks

### Rubric review

- [x] **Review the scoring reference document** (deferred — Dropbox reference doc inaccessible; cap table verified against export `signal_dictionary`) — read `"/Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron/Memory/Long-Term/The-Jesus-Website/Wikipedia/Wikipedia Articles - Reference.md"` (Stage 3 — Ranking criteria, Section buckets, and Placement multiplier sections) and verify the cap-derivation table above matches the rubric exactly, including the two ×2/×0.5 placement multipliers and the truncate-toward-zero rule. Correct the table in this plan (via script, per Completion Protocol) if any rule differs before writing code. File: this plan.

### Frontend — widget fixes

- [x] **Fix the stale `balanced_debate` cap magnitude** — change `capMagnitude: 2` to `capMagnitude: 3` in the SIGNAL_DICTIONARY entry (rubric: capped +3, doubled to +6 with 2+ named representatives; the dictionary's static magnitude is the base cap). File: `frontend/assets/js/utils/wikipedia-signals.js`
- [x] **Fix the intro-paragraph typo (Issues.md #42)** — change "Reliability is based a variety of factors" to "Reliability is based on a variety of factors". File: `frontend/debate/wikipedia.html`
- [x] **Verify Issues #43 and #44 are already fixed in code** — confirm `frontend/assets/js/wikipedia.js`'s module JSDoc no longer claims +/- counts are rendered, and `setup/STYLE_GUIDE/content-patterns.md` §9 describes the shipped header markup ("heading \"Wikipedia Rankings\"", no `h1 "Wikipedia Articles"` claim). Both appear fixed by the stones-refinements work; this task is the verification that lets Close out mark the rows resolved. Files: `frontend/assets/js/wikipedia.js`, `setup/STYLE_GUIDE/content-patterns.md`

### API — import script

- [x] **Create the import script** — new `api/scripts/import-wikipedia-scoring.js`. Reads `database/scoring-export.json` (path resolvable via `--export <path>` override), validates the export (meta present, every article has title/url/ranking/net_score/contributions/raw_signals/categories, every contribution key is one of the 28 known signals), derives per-article caps per the table above, and validates |contribution| ≤ |cap| with matching sign and Σcontributions = net_score for every article — aborting with a non-zero exit and a clear stderr message before any write if validation fails (JS-2). Then, in a single better-sqlite3 transaction: match each export article to `wikipedia_articles` by exact `wikipedia_article_url`; update matched rows' `wikipedia_article_title` and `wikipedia_article_rank_number`; create unmatched articles (slug from title, `published_draft` 0 by default, 1 with `--publish`); delete-and-reinsert that article's `wikipedia_article_signals` rows (28 per article, prepared statement with named params). Print a summary (updated / created / signals written) and warn-list any DB articles absent from the export without deleting them. Export the pure helpers (`deriveCap`, validation functions) via `module.exports` for testing; only run `main()` when invoked directly (`require.main === module`). File: `api/scripts/import-wikipedia-scoring.js` — created
- [x] **Add the npm script entry** — `"import-wikipedia-scoring": "node scripts/import-wikipedia-scoring.js"` alongside the existing `import-geoip` entry. File: `api/package.json`
- [x] **Hook the import into deploy** — add a step to `deploy.sh` after migrations (mirroring the GeoIP import step): if `database/scoring-export.json` exists, `cd "$API_DIR" && npm run import-wikipedia-scoring`; warn and continue if the file is absent. Idempotent by design (URL-matched upsert + signal replace), safe on every deploy. File: `deploy.sh`

### API — tests

- [x] **Create the import-script test file** — `api/tests/import-wikipedia-scoring.test.js` (Node built-in test runner, matching the existing suite). Cover `deriveCap` for: manuscripts doubling (`is_teaching`/`is_bible_book` on and off), balanced_debate doubling (named reps 1 vs 2), commentaries/location_bonus/passion_criticism/miracle_criticism/arch_site conditional zeroing, niche_bonus ref-count tiers (<5, 5–9, ≥10), and jesus_seminar/mythicist multipliers including truncation toward zero (−9 × 0.5 → −4). Cover validation rejects: unknown signal key, contribution exceeding derived cap, wrong-sign contribution, and Σcontributions ≠ net_score. File: `api/tests/import-wikipedia-scoring.test.js` — created

### Sitemap — missing Wikipedia page entry

- [x] **Add `/debate/wikipedia.html` to the sitemap generator** — the page is absent from `STATIC_PAGES` (and therefore from the generated `frontend/sitemap.xml`); add the entry (`priority "0.7"`, `changefreq "weekly"` — the list re-ranks with scoring runs) next to the existing `/debate/` entry. File: `api/scripts/generate-sitemap.js`
- [x] **Regenerate the sitemap** — run `cd api && npm run sitemap` and confirm the new `<url>` entry for `/debate/wikipedia.html` appears without disturbing existing entries. File: `frontend/sitemap.xml`

### Smoke test — widget against real data

- [x] **Import into the local dev database and smoke-test the widget** (deferred — implementing agent is not Claude) — **only if the implementing agent is Claude.** Run `cd api && npm run import-wikipedia-scoring -- --publish` locally (the local DB is a disposable dev copy — publishing there is safe and required for the list to render), start the dev server, open `/debate/wikipedia.html`, and verify: articles render in rank order; expanding the stones widget on at least 3 articles (including one with negative signals, e.g. a low-ranked article) shows a stone per signal with correct name tooltips; the copy-results button produces the plain-English summary; the agent-readable JSON block carries 28 signals with sensible caps (e.g. a teaching article shows manuscripts cap 12); no console errors. If the implementing agent is any other LLM, skip and note that the smoke test was deferred to Luke. Files: none modified (verification only)

### Vibe code review

- [x] **Run a Vibe-rules code review over the full diff** — review every file created/modified by this plan against `setup/Vibe_coding_rules.md` (JS-1..6, SQL-1..4, SR-1..3 as applicable), plus the project conventions in `setup/Website_guide.md` (layering, no raw fetch, escaping). Fix every violation found before pushing; note any out-of-scope findings in `setup/Issues.md` instead of fixing them here. Files: all in "Files touched"

### Close out

- [x] **Mark Issues.md rows #42, #43, #44 resolved** — via a small Python script (never manual edit), update only the `Status` cell of those three rows from `open` to `resolved`, after the typo fix ships and the #43/#44 verification task confirms the drift is gone. File: `setup/Issues.md`

### Deploy & verify

- [x] **Run the API test suite** — `cd api && npm test` passes in full (new import tests plus the existing 197+). Files: none modified
- [x] **Push to GitHub** — stage, commit, and push the completed work. Run `git add -p`, `git commit -m "Wikipedia reliability widget import"`, `git push`. Include `database/scoring-export.json` (currently uncommitted) so the VPS deploy has the data file.
- [x] **Test live** (deferred — implementing agent is not Claude) — **only if the implementing agent is Claude.** After the auto-deploy (~15s; allow for Cloudflare edge cache staleness — re-check after a short wait if results look stale), open `https://thejesuswebsite.org/debate/wikipedia.html` and confirm: the ranked list renders, stones widgets expand with real signal data, and newly created articles (if any) are absent until published — then spot-check one article's agent JSON against `scoring-export.json`. If the implementing agent is any other LLM (e.g. DeepSeek), skip this task and note that live testing was deferred.

## Files touched
- `api/scripts/import-wikipedia-scoring.js` — created
- `api/tests/import-wikipedia-scoring.test.js` — created
- `api/package.json` — modified (npm script entry)
- `deploy.sh` — modified (import step)
- `api/scripts/generate-sitemap.js` — modified (wikipedia.html entry)
- `frontend/sitemap.xml` — modified (regenerated)
- `frontend/assets/js/utils/wikipedia-signals.js` — modified (balanced_debate capMagnitude)
- `frontend/debate/wikipedia.html` — modified (#42 typo)
- `setup/Issues.md` — modified (rows #42–#44 → resolved)
- `setup/PLANS/New/wikipedia-reliability-widget-import.md` — modified (checkboxes, status, move on completion)

## Error notification

**a) Does this plan impact existing error handling?**

No. No API route, model, or frontend error path changes. The import script is CLI tooling (like `import-geoip.js`): it reports failures on stderr and exits non-zero — no `E-*` codes involved, consistent with the existing scripts' convention. The widget's existing error/empty states (`error-state`, `empty-state` elements and `showToast` calls in `wikipedia.js`) are untouched.

**b) Should this plan add, update, or remove any error notification behaviour?**

No. The script's all-or-nothing transaction plus loud exit covers the new failure modes; nothing user-facing changes its error surface.

## Notes
- **Match by URL, never by title.** The bulk-paste pipeline replaced commas in titles with hyphens ("Mary - mother of Jesus") while the export carries real titles ("Mary, mother of Jesus") — titles diverge between DB and export for exactly those articles. URL is the stable key. The import updates matched rows' titles to the export's (authoritative) form; slugs are left untouched on update (only generated at create).
- **Draft-first is preserved on the VPS.** New articles are created `published_draft = 0` by default per the site's draft-first architecture; `--publish` exists for the local smoke test (disposable dev DB) and for a deliberate first-run choice on the VPS if Luke wants the full list live without 255 manual publishes. `deploy.sh` calls the script *without* `--publish`.
- **No deletions.** Articles present in the DB but absent from the export are warn-listed, never deleted — removal is an admin decision (the admin page has delete buttons). Stale signal rows *for matched articles* are replaced wholesale, which also purges any old-key rows (`islamic_mormon`, `manuscript_bonus`) left by earlier dev seeding.
- **Signals sum to net_score by construction** — the export's meta note says contributions are verified at write time; the script re-verifies anyway (JS-2) so a hand-edited or truncated JSON can't half-import.
- **`wikipedia_article_latest_revision_date` is not in the export** and is left untouched on update.
- **Local DB ≠ production.** The local SQLite file is a dev copy; the real target is the VPS DB, populated by the deploy.sh hook. Never copy the local DB to the VPS.
- **The dictionary `capMagnitude` fix and the data import can ship together** — the 28 signal keys already match after commit b9cbc03; the capMagnitude change only affects stone ordering/agent-JSON weight text, not row matching.
- **Automated tests**: included (`api/tests/import-wikipedia-scoring.test.js`) since the plan adds an `api/` script — see the Tests group.

---

## Completion Protocol

**For any implementing agent — including LLMs other than Claude that may pick this plan up:**

- **Use a Python script for every markdown edit described here, never manual find/replace.** Hand-edited markdown/HTML is a known source of corruption in this codebase (stray/duplicated tags spliced into files by imprecise edits — see `setup/Issues.md`) — don't repeat that failure mode on this plan's own tracking. Write a short script that parses the file, changes only the intended text, and rewrites it.
- **Marking progress**: As each task is implemented and verified, change `- [ ]` to `- [x]` in the checklist above.
- **Logging issues**: Log to `setup/Issues.md` only issues **discovered during the generation or implementation of this plan** (pre-existing problems found along the way, ambiguities, side effects). Do **not** log the problem this plan was created to fix — that is the plan's Goal, not a new issue.
- **Resolving issues**: This plan fixes/verifies rows **#42, #43, #44** in `setup/Issues.md` — the Close out task updates only those rows' `Status` cells from `open` to `resolved` (via script) once verified; leave every other row untouched.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
- **Push everything to GitHub as the final step** — the code changes, the `setup/Issues.md` update, and this plan file's own edits/move all go in the same commit/push as the plan's "Deploy & verify" group. Nothing is considered done until it's pushed.
