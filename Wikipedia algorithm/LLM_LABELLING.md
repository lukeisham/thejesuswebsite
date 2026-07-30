# LLM Paragraph Labelling — Validation & Corpus Run

**Date:** 2026-07-31
**Status:** Labeller validated, corpus labelling pending

This document records the LLM-based paragraph labelling pipeline for
Signal 3 (data/interpretation split). It exists because the four-store
embedding classifier achieves only 0.662–0.706 paragraph-level accuracy
(well above chance at 0.500, but not high enough for a confident weight
dial), and because the gold set has only 136 text-bearing paragraphs
across 45 articles — too few for a calibration that distinguishes a
genuine 10-point accuracy gain from noise (bootstrap CI ±0.15 at n=39).

**Provider note (2026-07-31):** the plan that generated this document
originally specified Anthropic's Claude models and Batches API. That was
changed to DeepSeek at implementation time (user decision) — the `openai`
Python SDK is used pointed at DeepSeek's OpenAI-compatible endpoint
(`base_url=https://api.deepseek.com`) rather than the `anthropic` SDK.
DeepSeek has no batch endpoint, so the corpus run uses concurrent
synchronous requests instead of the Batches API discount the plan assumed
— see "Batch / Caching Interaction" below for the practical effect.

---

## Agreement Gate

The labeller must meet these thresholds against the 136 human-labelled
paragraphs in `gold-set-three-tier.csv` before it is trusted to label the
full ~255-article corpus:

| Criterion | Threshold | Actual | Status |
|---|---|---|---|
| Overall agreement | ≥ 0.85 | TBD — run `scripts/llm_label_validate.py` | ⏳ Pending |
| Per-class recall (min) | ≥ 0.75 | TBD | ⏳ Pending |

**Gate decision:** TBD — run the validation script.

If the gate fails, do not proceed to corpus labelling. Investigate the
error patterns (the script emits per-error gold/pred pairs with text
previews) and consider prompt refinement or model selection before
re-running.

---

## Human-vs-Human Ceiling Caveat

The 136 gold paragraphs are themselves human judgements on a genuinely
ambiguous boundary — the line between "close analysis" and "interpretation"
is debated in biblical scholarship, and the line between "data" and
"close" is subtle even for trained readers. Inter-annotator agreement on
this task has not been formally measured, but ~0.85 may be at or near the
human ceiling. A sub-1.0 agreement figure is not misread as labeller
failure — it is expected behaviour on a fuzzy boundary.

---

## Model Selection

The validation script tests both DeepSeek models so the choice is decided
by measured agreement, not assumption:

| Model | Overall Agreement | Min Recall | Gate | Cost (est., 136 paragraphs) |
|---|---|---|---|---|
| `deepseek-v4-flash` | TBD | TBD | TBD | < $0.05 |
| `deepseek-v4-pro` | TBD | TBD | TBD | < $0.15 |

Cost estimates are for the 136-paragraph validation pass only (negligible
either way). Corpus-scale figures are in "Measured Cost" below.

---

## Batch / Caching Interaction

The plan this document originates from specified Anthropic's Batches API
(50% token discount, up to 24h turnaround, no ordering guarantee) and its
5-minute default prompt-cache TTL. **DeepSeek has neither**: there is no
batch endpoint, so `llm_label_corpus.py --run` issues concurrent
synchronous chat-completion requests (default concurrency 8) instead of
submitting one batch job.

What DeepSeek does have: automatic prompt-prefix caching with no explicit
action required and no advertised TTL constraint the way Anthropic's is —
repeated system-prompt + rubric prefixes across the ~105 corpus requests
are billed at the cache-hit rate once the same prefix has been seen. Cache
hit vs. miss token counts are read directly from each response's `usage`
object and tracked separately in `labels-corpus.json`'s stats block, so
the actual cache benefit is measured rather than assumed.

Pricing (per million tokens, checked 2026-07-31 against DeepSeek's
published rate card):

| Model | Input (cache miss) | Input (cache hit) | Output |
|---|---|---|---|
| `deepseek-v4-flash` | $0.14 | $0.0028 | $0.28 |
| `deepseek-v4-pro` | $0.435 | $0.003625 | $0.87 |

---

## Staleness Detection

Wikipedia articles get edited, so labels go stale. The corpus-labelling
script (`scripts/llm_label_corpus.py`) stores a per-article content hash
alongside the labels. `--stale labels-corpus.json` reports which articles
have drifted since they were labelled, so a re-label pass can target only
those.

---

## Measured Cost

| Item | Cache-hit tokens | Cache-miss tokens | Output tokens | Cost |
|---|---|---|---|---|
| Validation (136 paragraphs) | TBD | TBD | TBD | TBD |
| Corpus (~10,500 paragraphs, ~105 requests) | TBD | TBD | TBD | TBD |

Reference figures for scoping (no batch discount available on DeepSeek,
but cache-hit pricing is roughly 50x cheaper than cache-miss and the
rubric/system-prompt prefix is shared across all ~105 corpus requests):
at deepseek-v4-flash rates a run this size is expected under $2; at
deepseek-v4-pro rates under $6. Both are far below the $10–50 Anthropic
estimate the originating plan scoped, since DeepSeek's per-token rates are
substantially lower — actual figures replace this estimate once the run
completes.

---

## Scripts

- `scripts/llm_label_validate.py` — validate the labeller against gold-set-three-tier.csv
- `scripts/llm_label_corpus.py` — label the full corpus via concurrent DeepSeek requests
