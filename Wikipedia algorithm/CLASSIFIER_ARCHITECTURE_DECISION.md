# Classifier — Architecture Decisions

**Date:** 2026-07-30
**Status:** Recording decisions ahead of implementation

This document records the architecture decisions required before changing any
code. It is a decision record, not a design document — every decision is stated
as closed, with the reasoning that settled it.

---

## Decision 1: Tier-2 store is mandatory, not deferred

### Context

The original two-store architecture (data-bucket, interpretation-bucket) mapped
Tier 1 → `data`, Tier 2 → `data`, Tier 3 → `interpretation`. This collapsed
Tiers 1 and 2 into the same class, making a Tier-2/Tier-3 mix mathematically
indistinguishable from a Tier-1/Tier-3 mix. The classifier cannot detect the
case that Action document "Refining the data interpretation split.md:19" asks
to punish: an article that reports data (Tier 1) but spends most of its body in
interpretation (Tier 3), burying close analysis (Tier 2).

### Decision

A dedicated `close-analysis` store (Tier 2) is **mandatory, not deferred**. The
current diagnosis plan corrects the scoring rule and separation metric within
the existing two-store architecture, but the unresolved Tier-2 collapse is
recorded here so the follow-on Signal 3 activation plan cannot accidentally
declare victory on a three-tier scoring problem with two stores.

### Rationale

- The two-store architecture cannot express the distinction the rubric encodes.
  No improvement to the scoring rule or exemplar set can solve a capacity
  problem in the label space.
- **This plan does not implement the third store.** It records the decision so
  the follow-on plan (`wikipedia-signal-3-activation.md`) must include it as a
  blocking task, not an optional enhancement.

---

## Decision 2: Block-structure separation functional supplements adjacency

### Context

The current `compute_separation_ratio()` measures adjacency: 1 − (transitions / (n−1)).
It counts every adjacent `data→interpretation` or `interpretation→data` pair as
a transition. This penalises label sequences that alternate locally but cluster
into blocks globally — the exact shape the *Gospel of Mark* gold set encodes
(data block → interpretation block → data block → interpretation block).

A pure adjacency measure scores a sequence like `D,D,I,I,D,I,I` (4 transitions
in 7 class-bearing paragraphs, sep ≈ 0.33) identically to a sequence that is
genuinely interleaved throughout. But the human labellers called
*Gospel of Mark* a `clear_split` — they see clustered blocks, not alternation.

### Decision

Add a **block-structure** separation functional that measures whether the label
sequence can be partitioned into at most *K* contiguous blocks (runs of the same
label). Specifically:

> `block_separation = 1 − (block_count − 1) / (n − 1)`, where `block_count` is
> the number of contiguous runs of 'data' or 'interpretation' labels (ignoring
> 'other' and 'neither').

This makes block structure the primary signal and preserves adjacency as a
complement (adjacency still matters — a 10-block article is more interleaved
than a 2-block one). The two functional forms can be compared directly in the
four-way bake-off.

### Rationale

- Human labellers think in blocks, not in adjacent pairs. The *Gospel of Mark*
  gold set encodes 3 contiguous blocks (D-block → I-block → D/I mixed), and
  the adjacency metric penalises it for having transitions between blocks.
- The block-count measure is strictly coarser than adjacency: two sequences
  with the same block count can differ in transition count, but two sequences
  with the same transition count can differ in block count. Using both gives
  us the ability to distinguish "clustered interleaving" from "distributed
  interleaving".

---

## Decision 3: Settled tier ordering (Luke, 2026-07-30)

### Context

The original code assigned −3 to muddled and −5 to one-sided. The Action
document says undifferentiated articles should be "punished most of all,"
implying muddled should be the most negative. The two were inverted.

### Decision

| Tier state | Contribution | Meaning |
|---|---|---|
| Clear split | **+10** | Tiers 1+2 cleanly separated from Tier 3 |
| Muddled | **−5** | All tiers present but interleaved — the worst outcome |
| One-sided | **0** | Only one class present; no split to judge |
| Unclassifiable | **0** | Fewer than `N_min` class-bearing paragraphs |

### Rationale for one-sided = 0

A large share of the 255 articles are short parable/place articles that are
legitimately single-tier. Penalising them (−5 under the old ordering) would
flatten the rankings and punish short factual articles for being short.

### Consequence

**−5 is now the only negative outcome** for this signal. The distinct tier
state must still be preserved in `raw_signals` so the two 0-cases remain
distinguishable when debugging. The signal range is unchanged at [−5, +10].

### Weight-string propagation list for `wikipedia-signal-3-activation.md`

The old `+10 / −3 / −5 / 0` ordering is hardcoded in five places outside the
classifier, none of which this plan touches:

| # | File | Location | Current text | Required change |
|---|---|---|---|---|
| 1 | `Wikipedia Articles - Reference_the_what.md` | L80 | `−3 muddled / −5 one-sided` | `−5 muddled / 0 one-sided` |
| 2 | `ALGORITHM_GUIDE_the_how.md` | L320,649,654 | `+10/-3/-5/0` and `−3` | `+10/−5/0/0` and `−5` |
| 3 | `rank_engine.py` | L557 | `+10 clear split / -3 muddled / -5 one-sided` | `+10 clear split / -5 muddled / 0 one-sided` |
| 4 | `rank_engine.py` | L122 | `{-3: "muddled", -5: "one_sided"}` | `{-5: "muddled", 0: "one_sided"}` |
| 5 | `frontend/assets/js/utils/wikipedia-signals.js` | L35 | mirror of #3 | mirror of #3 |
| 6 | `frontend/assets/js/wikipedia.test.js` | — | mirror test constant | mirror test constant |
| 7 | `api/scripts/import-wikipedia-scoring.js` | L122-129 | `muddled → -3, one_sided → -5` | `muddled → -5, one_sided → 0` |
| 8 | `api/tests/import-wikipedia-scoring.test.js` | L162-179 | test expectations | match new values |

**Flag:** The `rank_engine.py` / `wikipedia-signals.js` pair is exactly the
mirror that drifted in `Issues.md` #153 — both must change together, with the
label asserted in a test. `wikipedia-signal-3-activation.md` owns this
propagation chain.

---

## Decision 4: Fix the scoring rule before upgrading the model

### Context

`VALIDATION_REPORT.md:74-75` blames MiniLM's cosine spread (0.45–0.65) for the
0.303 accuracy, but tight absolute cosines do not imply the classes are
inseparable — they may simply need a different scoring rule. Mean-cosine
thresholding is the simplest possible rule; a centroid-based decision rule
operating on the same embeddings may separate the classes more effectively.

### Decision

The order of attack is:
1. Fix the **scoring rule** first (numpy-only centroid/logistic over existing embeddings).
2. Fix the **separation metric** (block-structure functional).
3. Treat a larger ONNX model as the **escalation** only if both (1) and (2) fail
   to cross the 0.85 gate.

The centroid rule is specified as numpy-only to satisfy the SR-2 constraint:
no new dependencies (no `scikit-learn`) without Luke's explicit sign-off.

### Rationale

- If the scoring rule is the bottleneck, changing the model wastes effort.
- If the embeddings are the bottleneck, no scoring rule change will help —
  but we won't know until we test.
- The four-way bake-off explicitly measures this by crossing {old adjacency,
  new block} × {mean-cosine, centroid}.

---

## Decision 5: LLM labels as production labels for Signal 3 (open — Luke decides)

### Context

The four-store embedding classifier achieves 0.662–0.706 paragraph-level
accuracy on the data-vs-interpretation task — well above the 0.500 chance
rate, but not high enough to make the weight dial meaningful. The 39-article
gold set gives a bootstrap CI of ±0.15, so a genuine 10-point accuracy gain
and pure noise are presently indistinguishable.

An LLM-based labeller (validated against the 136 text-bearing human gold
paragraphs in `gold-set-three-tier.csv`) can label the full ~255-article
corpus with measurable agreement, providing enough labelled data to finally
calibrate the weight dial with confidence.

### Decision (recommended, open for Luke)

**LLM labels become the production labels for Signal 3.** The four-store
embedding classifier stays as:

(a) the mechanism for the 9 vector-family signals that genuinely need
    generalisation (manuscripts, balanced debate, etc.);
(b) a cheap re-scorer for edited or newly-added articles between LLM passes;
    and
(c) a cross-check that flags LLM/classifier disagreement for editorial review.

### Alternative (recorded, not decided)

Retire the classifier for Signal 3 entirely and use LLM labels directly.
This is viable precisely because the corpus is capped at ~300 articles —
there is no unbounded stream of new articles that would require continuous
re-labelling. The LLM pass is a one-time cost (~$10–$50) that never recurs
because the corpus is capped. The classifier's ongoing value for Signal 3
is therefore limited to re-scoring edited articles, which could also be
done by re-running the LLM on just those articles.

### Rationale

- The classifier's paragraph-level accuracy (0.662–0.706) is above chance
  but below a level that makes the weight dial meaningful — the bootstrap
  CI at n=39 is ±0.15, wider than any plausible accuracy improvement.
- LLM labels at ~0.85 agreement against human gold provide a much stronger
  foundation for the weight decision.
- The corpus is capped, so the one-time LLM cost is bounded and known.
- The classifier's value for the 9 vector-family signals is not in question
  — this decision is specifically about Signal 3, the only signal that
  depends on the paragraph-level tier classifier.

### Consequence

If Luke accepts this decision:
- `labels-corpus.json` becomes the authoritative source for per-paragraph
  tier labels.
- The embedding classifier becomes a secondary mechanism for Signal 3 —
  used for rescoring edits and flagging disagreements, not for production
  tier assignment.
- The weight dial becomes genuinely measurable: re-running
  `scripts/rank_diff.py` with different weights uses labels that are
  consistent across the corpus, not classifier output that varies with
  threshold choices.

If Luke rejects this decision and keeps the classifier as the primary
mechanism:
- The LLM labels still serve as an evaluation source (via
  `paragraph_eval.evaluate_llm_labels()`) for measuring the classifier's
  accuracy corpus-wide.
- The weight dial remains limited by the classifier's 0.662–0.706
  paragraph-level accuracy.
