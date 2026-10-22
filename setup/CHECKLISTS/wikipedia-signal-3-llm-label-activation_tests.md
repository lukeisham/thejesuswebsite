## Validation: Wikipedia Signal 3 — Activate LLM Labels as Primary Source
**Plan:** wikipedia-signal-3-llm-label-activation.md
**Date:** 2026-07-31

### Manual checks
- [ ] `python3 scripts/llm_label_corpus.py --stale labels-corpus.json` (from `Wikipedia algorithm/`) reports 0 stale and 0 new/unlabelled against the fetch cache after the labelling run completes.
- [ ] `bucket-labels.json`, after regeneration via `scripts/export_bucket_labels.py`, shows `"label_source": "llm"` for the large majority of the 280 canonical articles, with `"label_source": "embedding_fallback"` only for the small remainder (any article that genuinely can't be matched to a fresh LLM label).
- [ ] The aggregate log line from `export_batch()` (e.g. "N/280 articles scored via LLM labels, M via embedding-classifier fallback") appears in the regeneration run's output and the numbers add up to 280.
- [ ] `rank_engine.py rescore` completes without error and updates both `Wikipedia algorithm/scoring-export.json` and `database/scoring-export.json`.
- [ ] `npm run import-wikipedia-scoring` (from `api/`) exits 0 and reports importing all 280 articles into the local (empty) database.
- [ ] On the live site (`https://thejesuswebsite.org/debate/wikipedia.html`), after deploy, at least one article whose Signal 3 tier changed under LLM labels (identified by diffing `Wikipedia Articles - Scoring Detail.csv` before/after) shows the new tier in its 5×5 grid cell.
- [ ] `setup/Issues.md` rows #141 and #163 show `Status: resolved`.

### Code-review checks
- [ ] **SR-1** — `classifier/llm_labels.py` contains only the LLM-corpus-loading and bucket-entry-building logic; `classifier/export.py`'s change is limited to the call site, aggregate log, and docstring update.
- [ ] **JS-2** — every fallback path (missing `labels-corpus.json`, stale content hash, paragraph-count mismatch) logs a `logger.warning` with enough context to identify the article, never silently drops to a zero/blank Signal 3 score.
- [ ] **JS-4** — `classifier/export.py`'s module docstring documents `label_source` and `embedding_tier_state` as real schema fields, matching what `export_batch()` actually writes.
- [ ] Confirm `rank_engine.py` was **not** modified — it should continue reading `bucket-labels.json` through the exact same `paragraphs`/`separation`/`tier`/`tier_state` keys as before; the LLM wiring is entirely upstream of it.
- [ ] `classifier/tests/test_llm_labels.py` covers: valid-entry construction passing `validate_bucket_labels()`, a known label sequence producing the expected tier via `score_article()`, a paragraph-count mismatch returning `None` (fallback), and a stale `content_hash` being excluded by `load_llm_corpus()`.
- [ ] `python -m pytest classifier/tests/ -v` passes in full, including the pre-existing suites (`test_tiers.py`, `test_separation.py`, `test_positional.py`, `test_register_gate.py`, `test_paragraph_eval.py`) — confirming the LLM wiring didn't regress the embedding-classifier path still used as fallback/cross-check.
