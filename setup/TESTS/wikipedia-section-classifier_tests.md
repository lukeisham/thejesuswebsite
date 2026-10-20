## Validation: Wikipedia Section-Classifier Held-Out Validation

**Plan:** wikipedia-section-classifier-held-out-validation.md
**Date:** 2026-08-16

### Manual checks
- [ ] Run `python3 "Wikipedia algorithm/calibrate_held_out.py"` from the repo root — completes without a traceback
- [ ] The script's console output reports a train/test article split totalling roughly 270 articles (allow for some drift-excluded titles)
- [ ] `Wikipedia algorithm/held-out-calibration-result.json` is written and contains non-placeholder `train_accuracy`, `test_accuracy`, and `ci_lower`/`ci_upper` fields
- [ ] `Wikipedia algorithm/CLASSIFIER_DIAGNOSIS.md` gained a new `## D.5 — Held-out validation (LLM-labelled corpus)` section immediately after `## D.4`, with real numbers (not `<placeholder>` text)
- [ ] §A.4's closing sentence now points to §D.5 for the out-of-sample figure, not just §D.4's in-sample one

### Code-review checks
- [ ] PY-1 — no new third-party dependency added without sign-off (all imports come from `calibrate.py`/`classifier/` modules already using numpy/ONNX/FAISS)
- [ ] PY-2 — `calibrate_held_out.py` is its own script, not folded into `calibrate.py`'s existing `main()`
- [ ] PY-3 — the script's real work runs behind `if __name__ == "__main__":`, confirmed importable without side effects (the new test file imports it)
- [ ] PY-4 — every new function has typed parameters and return annotations
- [ ] PY-5 — paths use `pathlib`/`Path(__file__).resolve().parent`, no string-joined paths
- [ ] PY-6 — missing/undersized LLM corpus fails loudly (non-zero exit, clear message), not a silent wrong number
- [ ] PY-7 — every file open (fetch cache, labels-corpus.json, result JSON, CLASSIFIER_DIAGNOSIS.md rewrite) uses a `with` block
- [ ] The CLASSIFIER_DIAGNOSIS.md edit was made by a script (matching `update_diagnosis_bakeoff()`'s existing pattern on the same file), not a manual find/replace
- [ ] `classifier/config.py`'s live thresholds were NOT changed by this plan — only a validation report was added
