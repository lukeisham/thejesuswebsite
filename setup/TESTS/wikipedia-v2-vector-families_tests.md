## Validation: Wikipedia v2 — Vector Signal Families
**Plan:** wikipedia-v2-05-vector-signal-families.md
**Date:** 2026-07-27

### Manual checks
- [ ] `python -m pytest "setup/Wikipedia algorithm v2/families/tests/"` — all tests pass with no failures.
- [ ] `setup/Wikipedia algorithm v2/vector-stores/` contains eight distinct LanceDB table directories (balanced-debate, anti-supernatural, ot-nt-discontinuity, mythicist-framing, jesus-seminar, secular-materialist, literary-analysis, gnostic-over-emphasis) — confessional-balance has no directory of its own, since it reads balanced-debate's store.
- [ ] Each family's positive exemplar file has 15–20 entries and its negative exemplar file has 8–12 entries (`wc -l` each `.jsonl` under `setup/Wikipedia algorithm v2/exemplars/`).
- [ ] Running `setup/Wikipedia algorithm v2/families/export.py` against 3–5 representative test articles produces `vector-family-scores.json` with every contribution value an integer, and each family's contribution falls within its documented cap (e.g. balanced-debate within [0, 12], anti-supernatural within [-8, 0], mythicist-framing within [-16, 0]).
- [ ] `setup/Wikipedia algorithm v2/vector-family-thresholds.yaml` exists and records `t_fire`, `t_strong`/`t_asym` (as applicable), `f1`, `precision`, and `source_gold_set_date` for every family that shipped, plus a single `passion_margin` value.
- [ ] For any family whose calibrated precision fell below 0.8, confirm the export output for that signal matches the value the existing keyword detector would produce (fallback path), not zero and not the vector score.
- [ ] `git status` after implementation shows no untracked/modified files outside gitignored paths — confirms the Push to GitHub task's "nothing to stage" claim is accurate, not just assumed.

### Code-review checks
- [ ] **SR-1** — each of the nine signal families lives in its own file under `setup/Wikipedia algorithm v2/families/`; the four combination-function shapes live in their own files under `families/combination_functions/`.
- [ ] **SR-2** — no new dependency was added anywhere in this plan's code beyond `sentence-transformers` / `lancedb` / `numpy` already introduced by Plan 4; `api/`'s `package.json` is untouched (still `express` / `better-sqlite3` / `sharp`).
- [ ] **No `api/` files were created or modified by this plan.** `grep -r "api/lib\|api/tests" "setup/Wikipedia algorithm v2/families/"` returns nothing — confirms the runtime/location defect (D2) did not resurface.
- [ ] **No `database/schema.sql` changes.** `git diff database/schema.sql` (or `git status database/schema.sql`) shows no modification from this plan's work — confirms the schema-violation defect (D3) did not resurface.
- [ ] **Nearest-neighbour-label rule (§3.4.1)** — `similarity_mapper.py` scores a span 0 when its nearest neighbour is a negative exemplar, regardless of cosine value; confirmed by `test_similarity_mapper.py`.
- [ ] **Placement multiplier + imbalance surcharge order (Shape B, §3.4)** — modifiers apply in order (placement multiplier, then imbalance surcharge), confirmed by `test_combination_functions.py`.
- [ ] **Truncation toward zero (§12.1)** — a halved single mythicist hit truncates to −1, not −2 and not −1.5; confirmed by `test_combination_functions.py`.
- [ ] **Passive-voice patterns match the source** — `passive_voice.py`'s two regex patterns are a faithful port of `admin/assets/js/admin-spellcheck/spellcheck-engine.js` lines 607–626, not a reinvention; confirmed by `test_passive_voice.py`.
- [ ] **Stance-blindness documented, not solved** — no file under `setup/Wikipedia algorithm v2/families/` attempts approving-vs-refuting stance classification (§11.3); placement and balance are the only proxies used for rows 19/21.
- [ ] **Confessional-balance reuse** — `confessional_balance.py` reads the balanced-debate store rather than building or loading a separate index; no `confessional-balance-positive.jsonl` / `confessional-balance-negative.jsonl` files exist.
