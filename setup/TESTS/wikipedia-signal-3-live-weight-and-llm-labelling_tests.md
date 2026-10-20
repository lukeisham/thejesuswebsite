# Test Verification — Wikipedia Signal 3: Live Reduced Weight + LLM Labelling

**Plan:** `setup/PLANS/New/wikipedia-signal-3-live-weight-and-llm-labelling.md`
**Date:** 2026-07-31 (updated — real corpus run, not the earlier vacuous check)

---

## Tier 1 — Smoke Tests

### Python suite (classifier/tests)

```
$ python3 -m unittest discover classifier/tests
Ran 111 tests in 0.003s
OK
```

✅ 111/111 pass

### Node suite (api/tests)

```
$ node --test api/tests/import-wikipedia-scoring.test.js
ℹ tests 113
ℹ pass 113
ℹ fail 0
```

✅ 113/113 pass

### Frontend tests (wikipedia-signals)

```
$ node --test frontend/assets/js/utils/wikipedia-signals.test.js
ℹ tests 17
ℹ pass 17
ℹ fail 0
```

✅ 17/17 pass

### Full calibration re-run — real accuracy restored

```
$ python3 calibrate.py
WINNER: adjacency × centroid (accuracy=0.641, CI=[0.487,0.795])
```

✅ Matches the pre-regression documented baseline (`CLASSIFIER_CALIBRATION.md`).
See "Critical bug found and fixed" below — the classifier briefly regressed
to 0.026 accuracy during this session due to a stale weight-mapping table,
unrelated to the DeepSeek pivot, and was fixed and re-verified before any
of this was trusted.

### Full corpus classification — bucket-labels.json

```
246 of 255 corpus articles have extractable body text (9 titles extract
0 paragraphs — a pre-existing HTML-extraction limitation, not fixed here).
Tier distribution across 246 classified + 9 unclassifiable placeholders
(255 total):
  clear_split:     64
  one_sided:      119
  unclassifiable:   69
  muddled:           3
```

✅ Real, varied classification — no longer degenerate.

### Ranking Diff — +3 candidate (live) weight

```
$ python3 scripts/rank_diff.py --weight 3
Total articles:                255
Articles with score change:    0
Articles with rank change:     0
```

✅ Zero changes is now the CORRECT result — the live weight already IS +3
(this rescore's own output), so diffing "current vs current" is a no-op by
construction. Verified the diff logic itself works by diffing against the
prior +10/-5/... scheme instead:

```
$ python3 scripts/rank_diff.py --weight 10
```

Produced dozens of real rank movements (1-2 position shifts), confirming
`data_interp_split_contribution` is genuinely feeding `net_score` for the
first time.

### llm_label_validate.py — gate run (see LLM Labelling Status below)

```
$ python3 scripts/llm_label_validate.py --model deepseek-v4-flash --json
overall_agreement: 0.897 (0.926 on an earlier identical run — run-to-run
model stochasticity, both pass)
gate_passed: true
```

✅ Gate passed on `deepseek-v4-flash` after two rounds of rubric refinement.

### Local database import — end to end

```
$ node api/scripts/import-wikipedia-scoring.js
[wikipedia-import] All 255 articles valid.
Updated: 245 | Created: 10 | Signals written: 6375
$ sqlite3 database/thejesuswebsite.db \
    "SELECT COUNT(*), SUM(contribution != 0) FROM wikipedia_article_signals \
     WHERE signal_key='data_interp_split';"
265|64
```

✅ 64 non-zero `data_interp_split` rows, matching the classifier's 64
`clear_split` articles exactly. (Local `.db` file needed migration
`040_add_wikipedia_scored_at.sql` applied manually — it existed as a file
but had never been run against this dev-machine database; applied via
`sqlite3` directly, matching `deploy.sh`'s own idempotent logic.)

---

## Critical bug found and fixed (unplanned, discovered this session)

Two real regressions were found and fixed while completing this plan,
neither caused by the DeepSeek pivot itself:

1. **`calibrate.py`'s `_contribution_to_state()`** hardcoded the pre-2026-07-30
   weight scheme (`tier == 10` → clear_split, `tier == -5` → muddled) and was
   never updated when this plan's own earlier "weight reconciliation" task
   changed `TIER_CLEAR` to `+3` / `TIER_MUDDLED` to `0`. Every genuine
   clear_split article (tier=3) fell through to `"unclassifiable"`, collapsing
   calibration accuracy to 0.026 (from a documented 0.641 baseline) — this
   would have been silently written back into `CLASSIFIER_CALIBRATION.md` had
   it not been caught (it briefly was, then reverted). Fixed by delegating to
   `classifier.scorer._tier_state_name()` instead of duplicating the mapping.
   Re-verified: 0.641 accuracy restored exactly.

2. **`rank_engine.py`'s `merge_upstream_signals()`** had the *same* stale
   int→state table (`TIER_TO_NARRATIVE_INTERP = {10: ..., -5: ..., 0: ...}`)
   in a second, differently-shaped location the original weight-reconciliation
   task didn't catch. This one fed the live production export
   (`scoring-export.json`), so every clear_split article scored **0**
   contribution instead of +3 — the exact failure mode behind the reverted
   production deploy (`data_interp_split_contribution=0` for all 255
   articles). Fixed by reading `bucket-labels.json`'s own unambiguous
   `tier_state` field directly instead of reconstructing it from the bare
   tier integer.

3. **Title-encoding mismatch (8 comma-titled articles)**: `Wikipedia
   Articles.csv` stores comma-containing titles with a hyphen substitution
   (`"Mary - mother of Jesus"`) while the canonical title list uses the real
   comma (`"Mary, mother of Jesus"`). `bucket-labels.json` was built keyed on
   the hyphen form, causing `rank_engine.py rescore` to crash with `KeyError`
   on 7 of the 8 (the 8th, `Nain - Israel`, was already covered by the
   no-paragraphs placeholder). Fixed by renaming those 7 keys to the
   canonical comma form.

4. **Separate, unrelated bug found and NOT fixed here** (logged as
   Issues.md #161): `rank_engine.py`'s `harvest_one()` no longer computes
   several keyword-detector fields at all (`balancedDebateHits`,
   `criticalScholarHits`, `evangelicalContrast`, etc.), so 5 signals
   (`balanced_debate`, `confessional_balance`, `ot_nt_criticism`,
   `supernatural_criticism`, `secular_materialist`) scored 0 across the
   entire corpus on the first full re-harvest run in some time. Per user
   decision, temporarily added to `PENDING_SIGNAL_KEYS` as a stopgap so
   Signal 3 could ship without blocking on an unrelated fix.

---

## Tier 3 — Chrome Check (live, needs user sign-in)

⏳ Pending — requires push + deploy + user interaction with passkey.
See the Tier 3 playbook in the plan for the full procedure.

---

## LLM Labelling Status

| Item | Status |
|---|---|
| Validation script (`llm_label_validate.py`) | ✅ Rewritten for DeepSeek (was Anthropic in the original plan — user decision) |
| Corpus labelling script (`llm_label_corpus.py`) | ✅ Rewritten for DeepSeek; no batch API, concurrent requests instead |
| Labeller validation run | ✅ Complete — gate passed on `deepseek-v4-flash` |
| Corpus labelling run | ✅ Complete — 249/249 available articles, 7357/7356 paragraphs, $0.18 |
| Staleness check | ✅ Run — 0 stale, 9 articles have no extractable paragraphs (known gap) |
| Register exemplar expansion | ⏳ Still pending — separate task, not done this session |

### Gate criteria (measured, `deepseek-v4-flash`)

| Criterion | Threshold | Actual |
|---|---|---|
| Overall agreement | ≥ 0.85 | 0.897–0.926 (two runs) |
| Per-class recall (min) | ≥ 0.75 | 0.765–0.846 |

### Provider change

The plan originally specified Anthropic Claude models + Batches API. At
implementation time the user redirected this to **DeepSeek**
(`deepseek-v4-flash`, selected over `deepseek-v4-pro` which measured worse:
0.515 vs 0.897 agreement — not a formatting artifact, genuinely less
accurate on this task). See `LLM_LABELLING.md` for full detail, including
the reasoning-model token-budget bug found along the way (`max_tokens`
needs headroom for hidden `reasoning_content`, not just the visible answer).

---

## Files Changed

| File | Change |
|---|---|
| `Wikipedia algorithm/classifier/config.py` | TIER_CLEAR=3, TIER_MUDDLED=0, rationale comments |
| `Wikipedia algorithm/classifier/scorer.py` | Fixed `_tier_state_name` disambiguation (TIER_MUDDLED=0) |
| `Wikipedia algorithm/classifier/tests/test_tiers.py` | Updated weight assertions |
| `Wikipedia algorithm/calibrate.py` | Fixed stale `_contribution_to_state()`; added held-out split support |
| `setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/rank_engine.py` | Fixed weight mismatch; removed second stale int→state table |
| `api/scripts/import-wikipedia-scoring.js` | deriveCap updated; data_interp_split un-pended; 5 unrelated signals temporarily pended (Issues.md #161) |
| `api/tests/import-wikipedia-scoring.test.js` | Updated cap values and pending status tests |
| `frontend/assets/js/utils/wikipedia-signals.js` | capMagnitude=3, comment updated |
| `frontend/assets/js/utils/wikipedia-signals.test.js` | Added cap magnitude assertion test |
| `Wikipedia algorithm/scripts/rank_diff.py` | Created |
| `Wikipedia algorithm/scripts/llm_label_validate.py` | Created, then rewritten for DeepSeek |
| `Wikipedia algorithm/scripts/llm_label_corpus.py` | Created, then rewritten for DeepSeek; added full-corpus fetch + retry-on-parse-failure |
| `Wikipedia algorithm/scripts/paragraph_eval.py` | Extended with LLM label evaluation |
| `Wikipedia algorithm/LLM_LABELLING.md` | Created, then updated with real measured figures |
| `Wikipedia algorithm/CLASSIFIER_ARCHITECTURE_DECISION.md` | Added Decision 5 (LLM labels) |
| `Wikipedia algorithm/bucket-labels.json` | Generated — 255 articles classified |
| `Wikipedia algorithm/labels-corpus.json` | Generated — LLM labels for 7357 paragraphs |
| `Wikipedia algorithm/.calibrate-fetch-cache.json` | Extended from 39 to 258 articles |
| `requirements.txt` | Added `openai` (DeepSeek's API is OpenAI-compatible) |
| `setup/Issues.md` | Row #161 added (harvest_one() keyword-detector regression, unrelated, not fixed) |
| `setup/TESTS/wikipedia-signal-3-live-weight-and-llm-labelling_tests.md` | This file — rewritten with real results |
