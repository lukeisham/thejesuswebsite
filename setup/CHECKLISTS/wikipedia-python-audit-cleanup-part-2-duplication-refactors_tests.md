## Validation: Wikipedia Algorithm Python Audit Cleanup — Part 2: Duplication Refactors
**Plan:** wikipedia-python-audit-cleanup-part-2-duplication-refactors.md
**Date:** 2026-08-28

### Manual checks
- [ ] Confirm Part 1 (`wikipedia-python-audit-cleanup-part-1-safe-fixes.md`) is already Completed before starting — several files here are also touched there.
- [ ] Run `python3 -m py_compile` across every `.py` file in `Wikipedia algorithm/` — zero syntax errors.
- [ ] Run `python3 -m unittest discover -s "Wikipedia algorithm/classifier/tests" -p "test_*.py"`, `-s "Wikipedia algorithm/families/tests"`, and `-s "Wikipedia algorithm/tests"` — every suite passes, zero failures/errors.
- [ ] Grep `Wikipedia algorithm/families/` for `text_utils\.` — non-zero hits, confirming `split_paragraphs()`/`find_names()` are actually called, not just defined.
- [ ] Grep for the original inline `re.split(r"\n\s*\n"` pattern across `anti_supernatural.py`, `ot_nt_discontinuity.py`, `secular_materialist.py`, `export.py` — zero hits (fully delegated to `text_utils.split_paragraphs()`).
- [ ] Character-diff `SYSTEM_PROMPT`/`RUBRIC` as imported by `llm_label_corpus.py` and `llm_label_validate.py` post-refactor against their pre-refactor values — identical strings.
- [ ] Grep for `sys.path.insert` inside `Wikipedia algorithm/classifier/tests/*.py` and `Wikipedia algorithm/families/tests/*.py` (excluding the two `__init__.py` files) — zero hits; grep the two `__init__.py` files — exactly one hit each.
- [ ] Grep `Wikipedia algorithm/families/stores.py` and `Wikipedia algorithm/families/export.py` for `sys.path.insert` — zero hits; grep `Wikipedia algorithm/families/__init__.py` — exactly one hit.

### Code-review checks
- [ ] PY-2 / SR-4 — `families/text_utils.py`, `families/positional_bias.py` (if extracted), and `scripts/llm_prompts.py` are actually imported and called from every intended site; no orphaned new module.
- [ ] PY-3 — the consolidated `sys.path.insert` in `families/__init__.py` is the only place it appears in the `families/` package.
- [ ] PY-4 — none of the new/modified code introduces a fresh `typing.Optional`/`typing.List` (this plan deliberately doesn't fix the pre-existing instance of this, but must not add new ones).
- [ ] SR-6 — spot-check 5-10 comments changed by the three directory-wide comment sweeps (`classifier/`, `families/`, `scripts/`) and confirm each explains a genuine WHY, not a restated WHAT, and that none of them still describes pre-extraction inline logic that no longer exists.
- [ ] Confirm the positional-bias extraction task's escape hatch was actually exercised correctly: either `families/positional_bias.py` exists and both `anti_supernatural.py`/`ot_nt_discontinuity.py` call it, OR both files still have their own local logic plus a comment explaining why extraction wasn't safe — not a half-done state.
