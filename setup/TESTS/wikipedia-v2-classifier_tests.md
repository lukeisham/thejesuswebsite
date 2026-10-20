## Validation: Section Classifier (Plan 4)

**Plan:** wikipedia-v2-04-section-classifier.md  
**Date:** 2026-07-27

## Manual checks

### Infrastructure setup
- [ ] Python virtual environment created and activated; `python --version` confirms 3.10+
- [ ] `requirements.txt` present at repo root and specifies `onnxruntime`, `faiss-cpu`, `numpy` with pinned versions — **not** `sentence-transformers`, `lancedb`, `transformers`, or `scikit-learn`; `pip install -r requirements.txt` succeeds and never installs `torch`
- [ ] `.python-version` file present and matches installed Python
- [ ] `setup/Wikipedia algorithm v2/classifier/` directory structure created with `__init__.py`, `config.py`, `tokenizer.py`, `stores.py`, `labeler.py`, `scorer.py`, `export.py`
- [ ] `setup/Wikipedia algorithm v2/classifier/model/` contains the vendored quantized MiniLM ONNX model and `vocab.txt` (not downloaded via `sentence-transformers`/`transformers` at runtime)
- [ ] `setup/Wikipedia algorithm v2/README.md` documents environment setup and classifier workflow
- [ ] **Dependency footprint measured and recorded**: installed `site-packages` size + vendored model directory size is measured (`du -sh`) and recorded in `CLASSIFIER_CALIBRATION.md`; if it exceeds ~150 MB, trimming was attempted and the result documented rather than silently shipped over budget (§3.2 ceiling)
- [ ] MiniLM ONNX model loads via `onnxruntime.InferenceSession` with no network call and no manual intervention needed

### Vector stores and exemplars
- [ ] Six exemplar JSONL files present in `setup/Wikipedia algorithm v2/exemplars/`: data-bucket-positive, data-bucket-negative, interpretation-bucket-positive, interpretation-bucket-negative, register-positive, register-negative
- [ ] Each exemplar file contains at least 8–15 objects with fields: `id`, `text`, `type` (positive/negative)
- [ ] Exemplars are real Wikipedia passages or close paraphrases, not synthetic
- [ ] Negative exemplars are non-trivial (superficially similar but semantically different from the signal they're meant to block)
- [ ] `setup/Wikipedia algorithm v2/vector-stores/` directory exists with three FAISS store subdirectories (data-bucket, interpretation-bucket, register) — this is the **canonical path**, shared with Plan 5's family stores; not `vector-indexes/` and not `.lancedb/`
- [ ] Each store subdirectory contains a FAISS index file plus a metadata sidecar (JSON/JSONL) recording exemplar id, type, source, and text per vector
- [ ] Stores can be queried: a simple test query (e.g. "historical context" against data-bucket) returns exemplars ranked by cosine similarity
- [ ] Top-ranking exemplars are from the positive set; negative exemplars are ranked lower
- [ ] Stores are regenerable from exemplars by running `stores.py` (idempotent)
- [ ] Exactly **three** stores exist for this plan (data-bucket, interpretation-bucket, register) — none of the nine Plan-5 signal-family stores (balanced-debate, anti-supernatural, etc.) are present; those are out of scope for this plan

### Paragraph classification
- [ ] `labeler.py` exposes `label_paragraphs(article_text)` function; accepts a string; returns paragraph embeddings and similarity scores
- [ ] `classify_paragraphs(scores, t_data, t_interp)` function assigns each paragraph a label: `data`, `interpretation`, or `neither`
- [ ] Thresholds `t_data` and `t_interp` are parametrized in `config.py` (default values set to 0.6–0.7)
- [ ] Lede paragraph automatically assigned `other` regardless of classifier output
- [ ] Reference/bibliography list automatically assigned `other` regardless of classifier output
- [ ] A test article with clear data/interpretation split is correctly labelled (e.g. paragraphs 1–5 `data`, 6–10 `interpretation`)
- [ ] A test article with mixed paragraphs is labelled realistically (not all one class)
- [ ] A test article with poor structure (single narrative, no analysis) gets mostly `data` or mostly `neither` labels
- [ ] Classifier does not crash on short articles (< 3 paragraphs); returns sensible defaults

### Separation ratio and tier logic
- [ ] `compute_separation_ratio(labels)` function computes transitions and ratio correctly
- [ ] Test case: no transitions (all `data`) → separation = 1.0
- [ ] Test case: alternating labels → separation ≈ 0.0–0.3
- [ ] Test case: one transition (data block, then interpretation block) → separation ≈ 0.86 (1/(14-1) for 14-paragraph article)
- [ ] `assign_tier(labels, separation, t_sep)` returns correct row-3 contribution
- [ ] Test case: both classes present, separation ≥ t_sep → +9
- [ ] Test case: both classes present, separation < t_sep → −2
- [ ] Test case: only one class present → −5
- [ ] Test case: too few paragraphs (< 3 labelled) → 0
- [ ] Tier assignment is deterministic (same inputs always produce same output)

### Testing framework
- [ ] Unit test suite at `setup/Wikipedia algorithm v2/classifier/tests/test_*.py` runs without errors: `python -m pytest setup/Wikipedia algorithm v2/classifier/tests/` (or `node setup/Wikipedia algorithm v2/classifier/tests/*.test.js`)
- [ ] All three test files present: `test_separation.py`, `test_tiers.py`, `test_positional.py`
- [ ] Each test file contains 3+ test cases exercising normal and edge cases
- [ ] Tests pass with 100% success rate before any threshold calibration
- [ ] Test output is human-readable (function names describe what is being tested)

### Calibration against gold set
- [ ] Plan 3 gold set (40 articles, per-paragraph labels, per-article tier labels) is available
- [ ] Gold-set articles are distinct from exemplars (no data leakage)
- [ ] Classifier is run at a sweep of `t_sep` values (0.5, 0.6, 0.7, 0.8, 0.9)
- [ ] For each `t_sep`, per-paragraph agreement and per-article tier accuracy are computed against hand labels
- [ ] F1 score is computed for tier classification at each `t_sep`
- [ ] The `t_sep` value maximizing F1 while maintaining ≥0.8 precision is selected
- [ ] Selected `t_sep` value is recorded in `config.py` and documented in `setup/Wikipedia algorithm v2/CLASSIFIER_CALIBRATION.md`
- [ ] `CLASSIFIER_CALIBRATION.md` includes: chosen `t_sep`, F1 score, precision, recall, reasoning for any threshold adjustments

### Validation against acceptance criteria
- [ ] Classifier is run end-to-end on all 40 gold-set articles
- [ ] Per-paragraph label agreement is computed (percentage of paragraphs labeled the same as hand labels)
- [ ] Per-article tier accuracy is computed (percentage of articles assigned the correct row-3 tier)
- [ ] **Both metrics meet ≥0.85 threshold** (§11.2 acceptance criterion)
- [ ] Results are documented in `setup/Wikipedia algorithm v2/VALIDATION_REPORT.md` with:
  - Overall per-paragraph agreement: X%
  - Per-article tier accuracy: Y%
  - Confusion matrix for tier assignments (if available)
  - List of any articles where tier was misassigned and the reason
  - Statement: "Classifier meets §11.2 acceptance criteria" or "Classifier fails §11.2 acceptance criteria; exemplars updated; [action taken]"
- [ ] If acceptance criteria are not met, exemplars are updated (more negatives, clearer positives) and calibration is re-run

### Output artifact and integration
- [ ] `bucket-labels.json` file is generated and contains valid JSON
- [ ] `bucket-labels.json` schema matches spec: `{article_id: {paragraphs: [label, ...], separation: ratio, tier: contribution}}`
- [ ] All ~255 Wikipedia articles have entries in `bucket-labels.json` (or all articles in the Plan 2 harvest output)
- [ ] Tier contributions in `bucket-labels.json` match expected values: +9, −2, −5, or 0 only
- [ ] Separation ratios are between 0.0 and 1.0 (inclusive)
- [ ] `bucket-labels.json` is parseable and can be consumed by downstream Plan 5 (vector signals) and Plan 6 (export)
- [ ] `CLASSIFIER_SPEC.md` documents: exemplar sources, labelling algorithm, tier logic, threshold values, output schema, how to regenerate stores

## Code-review checks

- [ ] SR-2 is correctly treated as **not applicable** to this plan's Python dependencies (SR-2 governs frontend/admin external JS libraries only — see the plan's "Coding rules" section). Dependencies actually used (`onnxruntime`, `faiss-cpu`, `numpy`) are justified against the refactor spec's §3.2/§3.3 ceiling instead, with no `torch`, `sentence-transformers`, `lancedb`, `transformers`, or `scikit-learn` present anywhere in the installed environment.
- [ ] **JS-2 / Python-equivalent** — Robust & Predictable — All public functions validate inputs; malformed article text, missing paragraphs, or empty exemplar sets are handled gracefully with explicit errors or logging (never silent failures).
- [ ] **JS-2** — Defensive guards on "shouldn't happen" states (uninitialized stores, missing model) include `console.warn`-equivalent logging with context.
- [ ] **JS-3 / Python-equivalent** — Modern & Simple — Functions are small (<50 lines) and focused on one responsibility. Complex logic (e.g. 7-dimension bias detection for future signals) is not attempted in this plan; classifier stays deterministic.
- [ ] **JS-4 / Python-equivalent** — Comments: "Why", not "What" — Public functions include PEP 257 docstrings. Complex threshold reasoning is documented in `config.py` and `CLASSIFIER_SPEC.md`, not scattered in comments.
- [ ] **SR-1** — One file per function — `stores.py` handles store management only; `labeler.py` handles paragraph embedding and classification; `scorer.py` handles separation and tier logic; `export.py` handles output formatting.
- [ ] Type hints present on all function signatures (Python 3.10+)
- [ ] Exemplar JSON files are valid and well-formed; `json.load()` on each succeeds
- [ ] No hardcoded paths except under `setup/Wikipedia algorithm v2/` (all paths are relative or constructed via `os.path.join()`)
- [ ] No dependency on external APIs or network calls during scoring (all embeddings are local)
- [ ] Error messages are informative and include file paths / article IDs when relevant

## Integration checks

- [ ] No new dependencies added to `api/package.json` or `database/` (Python infrastructure is separate from Node)
- [ ] No changes to database schema (classifier is pure Python; output is JSON, not DB-written)
- [ ] No new error codes added to `api/lib/error-codes.js` (classifier has no user-facing errors)
- [ ] No frontend changes (classifier is developer-machine tool only)
- [ ] `bucket-labels.json`, the exemplar files, the vector stores, and every doc under `setup/Wikipedia algorithm v2/` are **not** git-committed — `.gitignore` line 7 (`/setup/*`) has no re-inclusion rule for this path, verified via `git check-ignore -v`. Only `requirements.txt` and `.python-version` at repo root are pushed; the plan's own "Push to GitHub" task reflects this and does not claim to stage anything under `setup/`.

## Acceptance sign-off

- [ ] Per-paragraph agreement: ___% (target: ≥85%)
- [ ] Per-article tier accuracy: ___% (target: ≥85%)
- [ ] All tests passing: [ ] Yes [ ] No
- [ ] All manual checks passed: [ ] Yes [ ] No
- [ ] Classifier meets §11.2 acceptance criteria: [ ] Yes [ ] No
- [ ] VALIDATION_REPORT.md written and reviewed: [ ] Yes [ ] No
- [ ] Ready for Plan 5 (vector signal families) to proceed: [ ] Yes [ ] No

**If any acceptance check is "No", the classifier is not yet ready; exemplars are updated and re-calibration is required before proceeding to Plan 5.**


---

## Validation: Wikipedia Classifier — Architecture Diagnosis & Correction
**Plan:** wikipedia-classifier-architecture-diagnosis.md
**Date:** 2026-07-30

### Manual checks
- [ ] `Wikipedia algorithm/scripts/diagnose_separation.py` runs clean and prints one row per scorable gold-set article (33 expected), each showing human tier, label sequence, separation value, transition count.
- [ ] Task A2 result is recorded as a **count**, not prose: how many articles the humans called `clear_split` score below `t_sep` on their *own gold labels*. A non-trivial count means the metric, not the embedding model, is the dominant error source.
- [ ] `CLASSIFIER_DIAGNOSIS.md` four-way bake-off table ({old adjacency, new block} x {mean-cosine, centroid}) is populated with real accuracies and bootstrap CIs — no `TBD` placeholders anywhere in the file.
- [ ] `CLASSIFIER_ARCHITECTURE_DECISION.md` contains four *decisions*, not four open questions: mandatory close-analysis store, separation functional, tier ordering (flagged for Luke's sign-off), model-vs-scoring-rule order of attack.
- [ ] Row-3 tier constants match the settled scale: `TIER_CLEAR = 10`, `TIER_MUDDLED = -5`, `TIER_ONE_SIDED = 0`, `TIER_UNCLASSIFIABLE = 0`. The old `-3` value appears nowhere in `classifier/config.py`.
- [ ] `score_article()` returns a `tier_state` string alongside the integer `tier`, so `one_sided` and `unclassifiable` remain distinguishable now that both contribute 0.
- [ ] `calibrate.py` runs to completion without a `KeyError` — its old hardcoded `tier_stats[-3]` / `tier_stats[-5]` lookups in `write_docs()` have been re-keyed onto tier-state strings, and the confusion matrix labels both 0-states correctly rather than silently dropping one via the `TIER_LABEL` reverse map.
- [ ] Tier accuracy is computed against `tier_state`, not the contribution integer — otherwise predicting `unclassifiable` for a gold `one_sided` article scores as correct and inflates the figure.
- [ ] Weight strings were **not** changed in this plan: `git diff --exit-code frontend/` and `git diff --exit-code "setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/rank_engine.py"` are both clean. The propagation list is recorded in `CLASSIFIER_ARCHITECTURE_DECISION.md` for the Signal 3 activation plan to own.
- [ ] `python -m pytest "Wikipedia algorithm/classifier/tests/" -v` passes clean, including the new `test_register_gate.py`.
- [ ] The block-structure separation test genuinely discriminates: the *Gospel of Mark* gold-set label shape scores as separated under the new functional and **not** under the old one. A test that passes under both is not testing the fix.
- [ ] `git diff --exit-code database/scoring-export.json` is clean — signal 3 still reads as pending and no export was regenerated.
- [ ] `git diff --exit-code frontend/` is clean — this plan touches no frontend surface.
- [ ] The live 5x5 grid at https://thejesuswebsite.org/debate/wikipedia.html is unchanged: `data_interp_split` and `literary_analysis` cells still render as not-scored. (No deploy is expected from this plan; this check confirms nothing leaked.)
- [ ] `Issues.md` #141 is still `open` — this plan diagnoses, it does not activate.

### Code-review checks
- [ ] **SR-1** — the new block-structure separation functional is its own function in `scorer.py`; it is not folded into `assign_tier()` or into `compute_separation_ratio()`.
- [ ] **SR-2** — no new external dependency was added. `labeler.py`'s centroid rule uses numpy only. If a heavier model or `scikit-learn` proved necessary, work stopped and Luke was asked rather than the dep being added silently.
- [ ] **SR-2** — nothing from this plan is reachable from `frontend/` or the VPS; all changes remain dev-machine-only offline Python.
- [ ] **JS-2** (in spirit) — every article the calibration harness skips is logged with its title and the reason. No guard returns a bare 0.0 or 0.303-style figure for an unmeasurable case without a warning.
- [ ] **JS-1** — the new separation functional's name states what it measures; no `compute_separation_ratio_2` / `_new` / `_v2` naming.
- [ ] **JS-4** — the new functional's docstring explains *why* it differs from the original construct, and `config.py`'s corrected register docstrings no longer claim per-class register confirmation the single-store design cannot provide.
- [ ] Both separation modes remain selectable via the `SEPARATION_MODE` config flag — the old path was not deleted, so the bake-off stays reproducible.
- [ ] Markdown edits (checkboxes, Status, `Issues.md`) were made by script, not by hand.
