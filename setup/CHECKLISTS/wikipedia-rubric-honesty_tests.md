## Validation: Wikipedia Rubric Honesty & Reproducibility Pass

**Plan:** wikipedia-rubric-honesty-and-reproducibility.md
**Date:** 2026-07-29

### Manual checks

**Export integrity (terminal)**

- [ ] `database/scoring-export.json` contains exactly **253** articles, each with exactly **25** signal contributions — including `data_interp_split` and `literary_analysis`, both present in every article.
- [ ] **Every signal except `data_interp_split` and `literary_analysis` has at least one non-zero value across the 253 articles.** Run a check that collects the distinct value set per signal key and asserts none (other than the two pending ones) equals `{0}`. This is the single check that would have caught the defect this plan exists to fix — it must be run, not assumed.
- [ ] `data_interp_split` and `literary_analysis` are exactly `0` for **every** article — confirming the deliberate pending state, not a regression.
- [ ] `maps_diagrams` and `religious_art` each carry non-zero values on a plausible number of articles, and `religious_art` shows all three of its states (`-1`, `+1`, and `0` on parable/teaching articles).
- [ ] `Σcontributions == net_score` for every one of the 253 articles, with zero exceptions.
- [ ] `meta.note` describes the two pending signals honestly (which two, why, what unblocks them) rather than a bare list of zeroed keys.
- [ ] Ranks run 1..253 contiguously with no gaps and no duplicates; the last rank equals the article count (nothing hardcodes 250, 254 or 255).
- [ ] "Historicity of the Gospels" (or its chosen twin) appears in `excluded-titles.txt` and is absent from the export.

**Rename (terminal)**

- [ ] No live occurrence of `narrative_interp_split`, `narrative_interp_tier`, `narrative_interp_split_contribution`, or `narrativeInterp` remains anywhere in tracked code, `setup/Wikipedia algorithm/`, or `setup/SKILLS/`. Grep for `narrative_interp` and confirm every surviving hit is inside `setup/PLANS/Completed/` or an `Issues.md` row.
- [ ] The display label reads "Data/interpretation section split" everywhere it appears — `rank_engine.py`'s signal dictionary and the frontend `SIGNAL_DICTIONARY` no longer disagree.
- [ ] `classifier/scorer.py` docstrings describe the axis as data/interpretation, not data/narrative; its logic is unchanged (`python3 -m py_compile` passes and the classifier tests still pass).
- [ ] No database migration was required: after a scratch-DB import, no `narrative_interp_split` rows survive in `wikipedia_article_signals`.
- [ ] An export still emitting the old `narrative_interp_split` key is rejected by the import script as an unknown key, not silently accepted.

**Pending-signal mechanics (terminal)**

- [ ] §9 carries an explicit activation **checklist** (not prose) for `data_interp_split` and `literary_analysis`, naming for each: weight and tier rules, the blocker, the unblocking artifact (`bucket-labels.json` / `vector-family-scores.json`), the acceptance bar (≥0.85 §11.2 / ≥0.80 §11.4), and the ordered file list an activation touches.
- [ ] `PENDING_SIGNAL_KEYS` exists in the import script, holds exactly `{data_interp_split, literary_analysis}`, is a subset of `KNOWN_SIGNAL_KEYS` (not a separate/rejecting allowlist), and points at §9's checklist in a comment.
- [ ] The all-zero integrity check exempts only `PENDING_SIGNAL_KEYS` and fails the import if any other signal is all-zero across the corpus.
- [ ] **Cap while pending:** with the pending flag true (the current state), `data_interp_split`'s stored `cap` is **10** for every article regardless of the placeholder tier string. With the flag false and a genuine per-article `"unclassifiable"` outcome, cap is **0**. `literary_analysis`'s cap is unaffected by pending status either way and still follows the category rule (6 for teaching/parable/Bible-book, 4 otherwise).
- [ ] **Same-treatment regression test passes:** `data_interp_split` and `literary_analysis` render with the exact same cell class (`wikipedia-cell--empty`) and the same generic tooltip pattern as any other unfired signal — no distinct "pending" class or copy exists anywhere in the frontend.
- [ ] `rank_engine.py` still contains the loaders for `bucket-labels.json` and `vector-family-scores.json`, guarded for file-absence rather than deleted, and the row-3 tier-computation code is intact.
- [ ] **Preservation audit — nothing was deleted.** Confirm all of these still exist and are non-empty: `setup/Wikipedia algorithm/classifier/` (including `model/`), `exemplars/` (~330 rows across its JSONL files), `vector-stores/` (all family and classifier indexes), `gold-set-section-classifier.csv`, `gold-set-vector-families.csv`, `gold-set-negative-controls.csv`, `vector-family-thresholds.yaml`, `calibration-sweep.json`. These are the only copy in existence — `setup/` is gitignored, with no git history and no remote or VPS copy.

**Import (terminal)**

- [ ] `cd api && npm run import-wikipedia-scoring` against a scratch SQLite DB exits 0 and writes **253 × 25 = 6,325** rows to `wikipedia_article_signals`.
- [ ] Re-running the import produces the same end state (idempotent).
- [ ] **Without** `--purge-missing`, articles present in the DB but absent from the export are warned about and **retained** (unchanged default behaviour).
- [ ] **With** `--purge-missing`, those articles are deleted and their `wikipedia_article_signals` rows cascade away — verify no orphan signal rows survive.
- [ ] The purge runs **inside** the import transaction: simulate a mid-import failure and confirm the deletions roll back rather than leaving the list truncated.

**Reproducibility (terminal)**

- [ ] `setup/Wikipedia algorithm/Wikipedia Articles.csv` exists, is readable on this machine, and contains 253 data rows plus a header — no Dropbox path required.
- [ ] `git check-ignore -v` reports that `Wikipedia Articles.csv` and the other relocated deliverables are **not** ignored (the `/setup/*` blanket rule with its `!/setup/Wikipedia algorithm` re-include has trapped a plan before — `Issues.md` #147).
- [ ] `rank_engine.py` contains no absolute `/Users/.../CloudStorage/Dropbox/...` path; its base path derives from the script's own location.
- [ ] `python3 -m py_compile` on `rank_engine.py` and `node --check` on `extract.js` both pass.

**Public page (browser)**

- [ ] Each article's grid renders **25** cells (unchanged geometry, 5×5, no partial row).
- [ ] The two pending cells (`Data/interpretation section split`, `Literary analysis`) render as **ordinary empty cells** — same visual treatment, same tooltip pattern as any other unfired signal on that article. This is a deliberate choice; confirm it, don't flag it as a defect.
- [ ] The grid stays 5 columns at ≥768px and below 768px; only cell and gap size change (this plan makes no CSS change, so this is a non-regression check).
- [ ] The freshness line reads **"Scores last updated:"**, not "Last updated" or "Last revised".
- [ ] Positive cells still show four blue intensity tiers by fulfilment ratio; negative cells still show a single red treatment with the minus sign visible.
- [ ] Score panel bands still apply: green ≥50, yellow 25–49, red ≤24.
- [ ] Tooltips on hover give `"<signal name>: <contribution>"` / `"not scored"`, pointer devices only.
- [ ] The copy button's plain-text output lists all 25 signals in §9 order, includes `Data/interpretation section split` and `Literary analysis` under "Not scored", and its "of a possible <max>" figure **includes** their full caps (10 + 6-or-4) in the ceiling.
- [ ] No console errors on load or after scrolling several pages of the infinite-scroll list.
- [ ] **The live list shows 253 articles, not 254 or 255.** Verify against the deployed API (`/api/wikipedia`), not the local export — production carried a stale 255th article ("Historical reliability of the Gospels") for weeks while every local count read correctly. Confirm both duplicate Gospels titles are no longer both present.
- [ ] **Hard-reload (bypass cache) before judging any of the above on the live site** — `wikipedia.js` and its imported `utils/wikipedia-signals.js` both changed (the key rename touches both), and internal ES-module specifiers are not cache-busted (`Issues.md` #134). A stale module renders the old key against renamed data.

**Documentation**

- [ ] No file under `setup/Wikipedia algorithm/` claims 28 rows per published article as a statement of current fact. Historical narration of the 28→25 migration in Completed plans is expected and should be left alone.
- [ ] §9 in `Wikipedia_alogrithm_refractor.md` still has 25 rows, with rows 3 and 10 explicitly marked pending, and the Reference doc's weights section agrees with it exactly.
- [ ] §9 records why `data_interp_split` and `literary_analysis` are pending, that neither has a fallback, and what activating them requires.
- [ ] §3.2/§13 distinguish scoring (dev-only) from serving (the VPS sidecar), resolving the contradiction in `Issues.md` #136.
- [ ] `setup/STYLE_GUIDE/content-patterns.md`'s freshness-line wording matches the frontend; its 5×5/25-cell grid description is left untouched because it remains accurate.

**Version control — the algorithm directory is tracked and pushed**

- [ ] `git check-ignore -v` on a file inside `exemplars/`, `vector-stores/`, `families/`, `classifier/` and `tests/` returns **no match** for each — they are tracked.
- [ ] `git check-ignore -v "setup/Wikipedia algorithm/classifier/model/model.onnx"` still reports it ignored, and it is the **only** ignored path under the directory.
- [ ] `classifier/model/vocab.txt` **is** tracked (the rule narrowed to the weights file, not the whole directory).
- [ ] `git diff --cached --stat` before the commit shows ~2 MB staged, not ~89 MB. If it shows 89 MB, `model.onnx` was staged — unstage before committing; once pushed it cannot be removed without a history rewrite.
- [ ] After push, confirm on GitHub that `setup/Wikipedia algorithm/` is present with its exemplars, gold-set CSVs, vector stores and specification docs — and that no GitHub large-file warning was emitted.
- [ ] `fetch-classifier-model.sh` exists, is executable, pins an exact source URL and revision, verifies a recorded SHA-256, and **fails loudly** on mismatch. Test the failure path, not just the success path.
- [ ] Delete `model.onnx` to a temporary location, run the fetch script, and confirm it restores a byte-identical file — recovery is proven, not assumed. Restore the original either way.
- [ ] `classifier/README.md` records the model's upstream source, revision, size, SHA-256, why it alone is excluded, and the one-line recovery command.
- [ ] A fresh `git clone` of the repo contains the full algorithm directory minus `model.onnx`, and running the fetch script in that clone produces a working classifier.

**Issue tracking**

- [ ] `Issues.md` rows **#136, #137, #139, #140, #142, #143, #144, #145, #148** are marked `resolved`.
- [ ] Rows **#134, #138, #141** remain `open`.
- [ ] No row's `Issue`, `File`, or `Rule` text was altered — only `Status` cells changed.
- [ ] The `Issues.md` edit was made by script, not by hand.

### Code-review checks

- [ ] **JS-2** — the import script rejects an export using the old key or failing the all-zero integrity check loudly (non-zero exit, named keys); no silent key reinterpretation. Grid cells for pending/unfired signals still render as empty cells, never as missing ones.
- [ ] **JS-2** — any new defensive guard added around the pending-signal logic `console.warn`s with enough context to identify the call site rather than returning silently.
- [ ] **JS-4** — every comment naming "28 signals" or the old key name has been updated or deleted. Grep `wikipedia.js`, `wikipedia-signals.js`, `import-wikipedia-scoring.js` and `rank_engine.py` specifically.
- [ ] **JS-6** — the grid still uses single delegated listeners at document level for tooltips and keyboard nav; this plan introduces no new listener.
- [ ] **JS-5** — no new raw `fetch()` outside `api.js`.
- [ ] **SR-1** — the harvest additions for maps/diagrams and religious art are separate, focused functions rather than one bundled change; the pending-flag logic for `data_interp_split` is its own change, not bundled with the harvest tasks.
- [ ] **SR-3** — no per-cell SVG; cell colour is still applied as a class across the full 253-article render.
- [ ] **CSS-2 / CSS-5** — no CSS file was touched by this plan; confirm the diff shows no CSS changes, since none were planned.
- [ ] **Error encoding** — all seven previously-raw routes in `api/routes/wikipedia.js` now use `sendError`; no `res.status(500).json({ error: ... })` remains in the file. Any new `E-*` code was added to `api/lib/error-codes.js` rather than invented inline.
- [ ] **Tests** — `api/tests/wikipedia-routes.test.js` asserts the encoded error body rather than the legacy `{ error: string }` shape, and contains real assertions rather than a placeholder.
- [ ] **Tests** — `wikipedia-signals.test.js` asserts both the 25-entry count and the §9 order, so a future key edit cannot silently scramble grid order.
- [ ] **Tests** — extraction tests cover religious art in all three states and maps/diagrams including the +2 cap.
- [ ] **Tests** — `import-wikipedia-scoring.test.js` covers the pending-cap logic (10 while pending, 0 for a genuine unclassifiable outcome) and the all-zero integrity check's exemption list.
- [ ] **Deploy coupling** — the regenerated export and the renamed-key-aware import script are in the same commit. Confirm by inspecting the diff before pushing: shipping one without the other aborts the entire deploy under `set -euo pipefail`.
