## Validation: Wikipedia Algorithm Python Audit Cleanup — Part 1: Safe Fixes
**Plan:** wikipedia-python-audit-cleanup-part-1-safe-fixes.md
**Date:** 2026-08-28

### Manual checks
- [ ] Run `python3 -m py_compile` across every `.py` file in `Wikipedia algorithm/` — zero syntax errors.
- [ ] Run `python3 -m unittest discover -s "Wikipedia algorithm/classifier/tests" -p "test_*.py"`, `-s "Wikipedia algorithm/families/tests"`, `-s "Wikipedia algorithm/tests"`, and the new `-s "Wikipedia algorithm/vector-sidecar/tests"` — every suite passes, zero failures/errors.
- [ ] Run `python3 "Wikipedia algorithm/calibrate.py"` (or `calibrate_held_out.py`) once end-to-end after the `SEPARATION_MODE` changes — completes without a traceback, and `classifier/config.py`'s diff shows `SEPARATION_MODE` actually being written by `update_config()`.
- [ ] Diff `classifier/config.py` before/after a calibration run and confirm `t_data`/`t_close`/`t_interp`/`t_sep`/`t_register` values are unchanged from what a pre-plan run would have produced (the `SEPARATION_MODE` fix must not silently change the *other* threshold outputs).
- [ ] Grep the whole `Wikipedia algorithm/` tree for `evaluate_tiers(` (excluding `evaluate_tiers_from_cache`) — zero hits.
- [ ] Grep for `simple_families`, `scoped_families`, `debate_dependent`, `_is_reference_section`, `close_issues_141_163` — zero hits anywhere in the tree.
- [ ] Manually trigger two concurrent requests against a cold-started `vector-sidecar` (e.g. `ab -c 2 -n 2` or two parallel `curl`s right after process start) and confirm no duplicate-init log lines or crash — validates the new lock actually serializes first-request cold start.

### Code-review checks
- [ ] PY-4 — `calibrate.py:80`'s `_contribution_to_state()` default argument now reads `list[str] | None = None`, not `list[str] = None`.
- [ ] PY-6 — none of the new/modified code (lock handling, new tests, deleted-function cleanup) introduces a bare `except:` or silent `except Exception:`.
- [ ] PY-7 — the new `threading.Lock()` usage in `vector-sidecar/app.py` uses `with lock:`, not manual `acquire()`/`release()`.
- [ ] PY-9 — `diagnose_register_gate.py` loads the fetch cache exactly once per `main()` run, confirmed by reading the diff.
- [ ] SR-6 — the `registry.py`/`export.py` ordering comment, `test_separation.py` docstring trim, and `test_passive_voice.py` cleanup each explain a genuine WHY, not a restated WHAT.
- [ ] TEST-2-equivalent (this project's Python testing follows TEST-2's spirit even though TEST-1..9 are written for `node:test`) — the new/rewritten tests (`test_gnostic_over_emphasis.py`, `test_literary_analysis.py`, `test_passion_margin.py`, `vector-sidecar/tests/test_verdict.py`) actually exercise the real code path and assert on real output, not just "didn't crash."
