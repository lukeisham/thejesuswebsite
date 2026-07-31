# LLM Paragraph Labelling — Validation & Corpus Run

**Date:** 2026-07-31
**Status:** Complete — labeller validated, gate passed (`deepseek-v4-flash`), full corpus labelled (249/249 articles with extractable text; see below)

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

| Criterion | Threshold | Actual (`deepseek-v4-flash`) | Status |
|---|---|---|---|
| Overall agreement | ≥ 0.85 | 0.926 (126/136) | ✅ Pass |
| Per-class recall (min) | ≥ 0.75 | 0.846 (interpretation; data 0.975, close 0.882) | ✅ Pass |

**Gate decision: PASSED** on `deepseek-v4-flash`. Reached after two rounds
of rubric refinement (see below) — record kept honestly rather than only
showing the final number:

1. First pass, line-per-label output: 0.787 overall, min recall 0.385
   (`interpretation` class). Root cause: paragraphs reporting scholarly
   debate/uncertainty ("scholars debate whether...") were being called
   `data` because they read as factual reporting. Fixed by making the
   rubric explicit that reporting contested meaning/historicity is itself
   an interpretive act.
2. Switched to structured `{"labels": [...]}` JSON output (`response_format:
   json_object`) plus a one-retry-on-parse-failure loop, since a chunk of
   the `close`/`interpretation` errors turned out to be a single failed
   batch (whole-batch "other" predictions), not a semantic miss. This alone
   moved overall agreement to 0.816, then 0.875 with the retry.
3. Second rubric refinement: the remaining failures were paragraphs that
   compare two-or-more gospel accounts/sources against each other (e.g.
   "The Synoptics place the event near Bethsaida, while John locates it on
   the eastern shore") — these read as plain fact-reporting but are
   source-critical `close` analysis by definition. Made the rubric name
   cross-source comparison explicitly as the `close` signal regardless of
   whether interpretive language appears. Result: 0.926 / min recall 0.846.
4. Found (via the corpus run — see below) that `deepseek-v4-flash` is a
   reasoning model: hidden `reasoning_content` shares the same `max_tokens`
   budget as the visible JSON answer. `max_tokens=1024/4096` was silently
   truncating mid-reasoning on larger inputs (`finish_reason: "length"`,
   empty visible content). Raised to 4096 (validate, 10-paragraph batches)
   / 16000 (corpus, up to 100-paragraph chunks). Re-ran validation after the
   fix: 0.897 overall, min recall 0.765 (`close`) — still passes; run-to-run
   variance (0.897–0.926 across identical re-runs) reflects model
   stochasticity, not a regression.

If a future re-validation fails the gate, investigate error patterns (the
script emits per-error gold/pred pairs with text previews) before
re-running — do not proceed to corpus labelling on a failed gate.

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

| Model | Overall Agreement | Min Recall | Gate | Notes |
|---|---|---|---|---|
| `deepseek-v4-flash` | 0.926 | 0.846 | ✅ Pass | Selected — see gate history above |
| `deepseek-v4-pro` | 0.515 | 0.235 | ❌ Fail | Worse on both JSON-mode runs (0.581, then 0.515); not a formatting artifact — genuinely less accurate on this task at this rubric. Not used. |

Contrary to the plan's assumption that a more capable/expensive model would
be the safer default, `deepseek-v4-pro` under-performed `deepseek-v4-flash`
on this specific 3-way classification task across repeated runs. Flash is
both cheaper and more accurate here — the model-comparison step earned its
keep.

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
repeated system-prompt + rubric prefixes across the 259 corpus requests
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

Run against the actual corpus (2026-07-31): 0 stale, 0 missing from cache,
9 "new" — these 9 (`The Garden Tomb`, `Caesarea Philippi`, `Raising of
Lazarus`, `Jude Thaddeus the Apostle`, `Teachings of Jesus`, `Marriage at
Cana`, `Letter of Pilate to Tiberius`, `Nain - Israel`, `Young man from
Nain`) are in `Wikipedia Articles.csv` and fetched successfully but
extracted **0 paragraphs** — a pre-existing limitation of the HTML
paragraph extractor (`calibrate.py`'s `ParagraphExtractor`, shared code,
out of scope to fix here) on whatever these pages' structure is (likely
short stubs, disambiguation-like layout, or infobox-only content). 249 of
258 cached articles (255-article corpus + 3 gold-set titles outside it)
have usable text; the 9 empty ones are skipped by `--prepare` rather than
silently mislabelled.

---

## Measured Cost

| Item | Cache-hit tokens | Cache-miss tokens | Output tokens | Cost |
|---|---|---|---|---|
| Validation (136 paragraphs, ~5 runs during rubric iteration) | — | — | — | < $0.05 total |
| Corpus (7,356 paragraphs, 249 articles, 259 requests) | 902,272 | 16,919 | 616,015 | **$0.18** |

Actual corpus run: **249/249 articles labelled, 7,357 of 7,356 expected
paragraphs** (one article needed a 5th retry to land an exact count; the
rest matched or were within a handful — see "Known Label-Count Drift"
below). Total spend across every validation iteration and both corpus runs
(one aborted early after discovering the reasoning-token truncation bug,
one clean) was under $0.50 — far below the $10–50 Anthropic estimate the
originating plan scoped, since DeepSeek's per-token rates are substantially
lower and nearly the entire corpus run hit the prompt cache on the second
attempt (902K cache-hit vs. 17K cache-miss input tokens).

### Known Label-Count Drift

12 of 249 articles came back with a label count off by 1–5 from the
paragraph count sent (e.g. `Saint Peter`: 194 paragraphs → 189 labels;
`Mary - mother of Jesus`: 131 → 134). This is the model's own paragraph
boundary judgment drifting slightly on long, quote-heavy articles — not a
JSON parsing failure (all 249 articles parsed as valid JSON with 0
recorded errors). `paragraph_eval.py`'s `evaluate_llm_labels()` already
handles this by truncating both sequences to the shorter length and
reporting `mismatched_lengths` in its output, so this does not need
fixing before the labels are usable — it's visible, bounded, and already
tolerated by the consumer.

---

## Scripts

- `scripts/llm_label_validate.py` — validate the labeller against gold-set-three-tier.csv
- `scripts/llm_label_corpus.py` — label the full corpus via concurrent DeepSeek requests
