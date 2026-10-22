# Validation: Wikipedia Signal 3 — Data/Interpretation Split Activation
**Plan:** wikipedia-signal-3-activation.md
**Date:** 2026-07-30

### Manual checks
- [ ] The blocking prerequisite actually ran first: `Wikipedia algorithm/CLASSIFIER_DIAGNOSIS.md` and `CLASSIFIER_ARCHITECTURE_DECISION.md` both exist and contain real findings, not placeholders. Starting Group A without them is the failure this plan's blocker exists to prevent.
- [ ] Gold-set paragraphs were extracted from the **Wikipedia parse API**, not rendered pages — spot-check three articles and confirm paragraph counts match what the classifier reads. A lede that misaligns means the segmentation mismatch was not fixed.
- [ ] `gold-set-three-tier.csv` gives every paragraph an explicit Tier 1 / 2 / 3 label, and the scorable article count is larger than the previous 33.
- [ ] Dual-rater agreement on the ≥15-article sample is recorded as a **number** in `GOLD_SET_LABELLING_PROCEDURE.md`, and it is ≥0.90. A recorded "passed" without the figure is not sufficient.
- [ ] Four FAISS stores build and load (`data-bucket`, `close-analysis`, `interpretation-bucket`, `register`) — `STORE_NAMES` has four entries, not three.
- [ ] Exemplar counts hit the specced floors: ≥80 positive per tier and a substantive negative set each. Open two files and confirm the entries are authored passages, not stubs or duplicates.
- [ ] Tier accuracy on the new gold set is **≥0.85**, reported with its bootstrap CI. If the CI's lower bound sits below 0.85, say so explicitly rather than reporting the point estimate alone.
- [ ] **If the gate was not met, nothing shipped**: signal 3 is still in `PENDING_SIGNAL_KEYS`, `Issues.md` #141 is still `open`, `database/scoring-export.json` is unchanged, and the plan is still in `PLANS/New/`.
- [ ] `bucket-labels.json` covers all 255 articles, each with a tier **and** a `tier_state` string — `one_sided` and `unclassifiable` are distinguishable despite both contributing 0.
- [ ] The nine vector families were re-run against the new labels and none regressed on the gold set; any that did were re-calibrated before signal 3 shipped.
- [ ] `database/scoring-export.json` carries non-zero `data_interp_split` on a non-trivial share of the 255, and `Sum(contributions) == net_score` holds for every article.
- [ ] Signal range is [−5, +10] and no `-3` value appears anywhere in the export. Cap derivation in the import script was **verified**, not assumed.
- [ ] Live grid at https://thejesuswebsite.org/debate/wikipedia.html shows the `data_interp_split` cell populated for earning articles, and its tooltip reads the new weight string (`+10 clear split / -5 muddled / 0 one-sided / 0 unclassifiable`).
- [ ] `Issues.md` #141 flipped to `resolved` — and only its `Status` cell changed.

### Code-review checks
- [ ] **SR-1** — the three-tier labeller, the separation functional, and tier assignment remain separate functions; tier resolution was not folded into the labelling pass.
- [ ] **SR-2** — no new external dependency. `numpy` / `faiss` / `onnxruntime` only; nothing new in any requirements file.
- [ ] **SR-4** — the weight string changed in **all three** mirrors together: `rank_engine.py`, `frontend/assets/js/utils/wikipedia-signals.js`, and `frontend/assets/js/wikipedia.test.js`. Grep for the old `-3 muddled` string across the repo and confirm zero hits. This is the exact drift of `Issues.md` #153.
- [ ] **SR-4** — the frontend test asserts the weight string itself, so a future divergence fails rather than shipping a wrong tooltip.
- [ ] **JS-2** — the import script still aborts (not warns) on malformed signal 3 data, and no calibration step reports a score for a case it could not measure.
- [ ] **JS-1 / JS-4** — the tier constants and separation functional carry a stated rationale for the non-obvious semantics (one-sided = 0), not a restatement of the code.
- [ ] A test asserts that an article interleaving Tier 2 and Tier 3 scores **−5 and never +10** — the load-bearing assertion for the whole signal.
- [ ] The five boundary cases from `Action:Refining the data interpretation split.md` exist as labelled test fixtures.
- [ ] `api/tests/import-wikipedia-scoring.test.js` was extended (not just left passing) for the newly non-pending key.
- [ ] Markdown edits — checkboxes, Status, the `Issues.md` #141 row — were made by script, not by hand.
