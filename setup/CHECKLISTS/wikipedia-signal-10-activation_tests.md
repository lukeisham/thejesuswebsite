# Validation: Wikipedia Signal 10 — Literary Analysis Activation
**Plan:** wikipedia-signal-10-activation.md
**Date:** 2026-07-30

### Manual checks
- [ ] `Wikipedia algorithm/classifier/LITERARY_ANALYSIS_SPEC.md` exists as a standalone document containing the three B-Tiers, the linguistic clue tables, the Gospel-domain examples, and both boundary-case tables. The specification no longer lives only inside a plan file.
- [ ] The spec defines **three** gates, not one: precision ≥0.80, a recall floor, and an expected corpus fire-rate band — each with its reasoning stated. A precision-only gate is the defect this plan exists to avoid.
- [ ] `vector-family-thresholds.yaml` shows a real `precision` **and** `recall` for `literary-analysis` — not the current `0.0`. A `0.0` there means the family is still on keyword fallback and nothing was actually activated.
- [ ] Achieved fire rate across the 255 articles falls inside the specced band. Firing on a handful of articles satisfies the all-zero import guard while leaving the grid cell as empty as before — check the count, not just non-zero-ness.
- [ ] Exemplar counts hit the floors: ≥60 positive and ≥60 negative. Open both files and confirm authored passages, not stubs.
- [ ] Positive exemplars span all three styles — overtly methodological, implicitly analytical, and comparative — so the store is not narrowly keyed to explicit narrative-criticism vocabulary.
- [ ] Negative exemplars cover the **reported-analysis** pattern ("Culpepper argues Mark uses intercalation"), which is Tier-1 data about scholarship rather than analysis performed by the article. This is the plan's most likely false positive.
- [ ] Gold set extended to 20–30 literary-analysis rows, weighted toward `is_parable` / `is_teaching` / `is_bible_book` articles, with deliberate negatives from place and historical-figure articles.
- [ ] Category tiering verified on ≥10 real articles: +6 for parable/teaching/Bible-book, +4 otherwise. Verified against actual category flags, not re-implemented.
- [ ] `vector-family-scores.json` covers all 255 articles with fire/no-fire verdicts.
- [ ] `database/scoring-export.json` carries non-zero `literary_analysis` contributions, and `Sum(contributions) == net_score` holds for every article.
- [ ] Live grid at https://thejesuswebsite.org/debate/wikipedia.html shows the `literary_analysis` cell populated for a parable or teaching article that earns it, **and** "not scored" for an article genuinely containing no literary analysis. Both directions matter — a cell that fires everywhere is as wrong as one that never fires.
- [ ] If both this plan and `wikipedia-signal-3-activation.md` were in flight, they landed **sequentially** — one export regenerated, pushed, and verified live before the other began. No concurrent regeneration of `database/scoring-export.json`.

### Code-review checks
- [ ] **SR-1** — the fire/no-fire verdict, the +6/+4 category tiering, and export shaping stay in separate functions; `families/literary_analysis.py` did not absorb detection logic.
- [ ] **SR-2** — no new external dependency. `numpy` / `faiss` / `onnxruntime` only.
- [ ] **SR-4** — the signal's label and weight string are consistent across `rank_engine.py`, `frontend/assets/js/utils/wikipedia-signals.js`, and `frontend/assets/js/wikipedia.test.js`; the test asserts the string so future drift fails (`Issues.md` #153).
- [ ] **JS-2** — the import script still aborts (not warns) on malformed signal 10 data, and every article excluded from calibration is logged with its title and reason rather than silently skipped.
- [ ] **JS-1 / JS-4** — the negative-exemplar rationale (performing analysis vs reporting that someone else did) is recorded as a comment or spec note, since it is not inferable from the data.
- [ ] A test fixture encodes the reported-analysis negative specifically.
- [ ] `api/tests/import-wikipedia-scoring.test.js` was extended for the newly non-pending key, including an out-of-range abort case.
- [ ] No `Issues.md` row was resolved by this plan — #142 is already `resolved` and must not be reopened or re-resolved.
- [ ] Markdown edits — checkboxes, Status — were made by script, not by hand.
