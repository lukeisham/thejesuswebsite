# Test Verification — Wikipedia Signal 3: Live Reduced Weight + LLM Labelling

**Plan:** `setup/PLANS/New/wikipedia-signal-3-live-weight-and-llm-labelling.md`
**Date:** 2026-07-30

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

### Ranking Diff — +3 candidate weight

```
$ python3 scripts/rank_diff.py --weight 3 --prior
======================================================================
  Ranking Diff — Signal 3 candidate weight: +3
======================================================================
  Total articles:                255
  Articles with score change:    0
  Articles with rank change:     0

  No rank changes.
```

✅ 0 rank changes (expected: all 255 articles are currently `unclassifiable` —
the classifier has not run on the full corpus; Signal 3 was pending until this
activation. The diff is vacuously zero because swapping 0 for 0 changes nothing.
Real ranking movement will appear once the classifier produces tier assignments.)

### llm_label_validate.py — dry run

```
$ python3 scripts/llm_label_validate.py --dry-run
Loaded 136 gold paragraphs from gold-set-three-tier.csv
  data: 80
  interpretation: 39
  close: 17
```

✅ Loads 136 gold paragraphs correctly.

---

## Tier 3 — Chrome Check (live, needs user sign-in)

⏳ Pending — requires deployment to production and user interaction with passkey.
See the Tier 3 playbook in the plan for the full procedure.

### Curl-first triage (non-interactive)

```
$ curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://thejesuswebsite.org/debate/wikipedia.html
```

⏳ Pending — run after deploy.

---

## LLM Labelling Status

| Item | Status |
|---|---|
| Validation script (`llm_label_validate.py`) | ✅ Created, dry-run passes |
| Corpus labelling script (`llm_label_corpus.py`) | ✅ Created |
| Labeller validation run | ⏳ Pending — requires ANTHROPIC_API_KEY |
| Corpus labelling run | ⏳ Pending — blocked on validation gate |
| Staleness check | ⏳ Pending — blocked on corpus labelling |
| Register exemplar expansion | ⏳ Pending — blocked on corpus labelling |

### Gate criteria

| Criterion | Threshold | Actual |
|---|---|---|
| Overall agreement | ≥ 0.85 | TBD |
| Per-class recall (min) | ≥ 0.75 | TBD |

---

## Files Changed

| File | Change |
|---|---|
| `Wikipedia algorithm/classifier/config.py` | TIER_CLEAR=3, TIER_MUDDLED=0, rationale comments |
| `Wikipedia algorithm/classifier/scorer.py` | Fixed `_tier_state_name` disambiguation (TIER_MUDDLED=0) |
| `Wikipedia algorithm/classifier/tests/test_tiers.py` | Updated weight assertions |
| `setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/rank_engine.py` | Fixed weight mismatch (lines 246, 410) |
| `api/scripts/import-wikipedia-scoring.js` | deriveCap updated, PENDING_SIGNAL_KEYS updated |
| `api/tests/import-wikipedia-scoring.test.js` | Updated cap values and pending status tests |
| `frontend/assets/js/utils/wikipedia-signals.js` | capMagnitude=3, comment updated |
| `frontend/assets/js/utils/wikipedia-signals.test.js` | Added cap magnitude assertion test |
| `Wikipedia algorithm/scripts/rank_diff.py` | Created |
| `Wikipedia algorithm/scripts/llm_label_validate.py` | Created |
| `Wikipedia algorithm/scripts/llm_label_corpus.py` | Created |
| `Wikipedia algorithm/scripts/paragraph_eval.py` | Extended with LLM label evaluation |
| `Wikipedia algorithm/calibrate.py` | Added held-out split support (`calibrate_with_held_out`) |
| `Wikipedia algorithm/LLM_LABELLING.md` | Created |
| `Wikipedia algorithm/CLASSIFIER_ARCHITECTURE_DECISION.md` | Added Decision 5 (LLM labels) |
| `setup/TESTS/wikipedia-signal-3-live-weight-and-llm-labelling_tests.md` | Created (this file) |
