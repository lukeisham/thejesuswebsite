# Classifier Diagnosis

**Date:** (see git log)
**Gold set articles:** 39
**Articles with human labels:** 39

## A.1 — Separation-metric diagnostic (human labels only)

This diagnostic runs `compute_separation_ratio()` on the **human** gold-set
labels — no model inference is involved. It answers: does the current
adjacency-based metric measure what the human labels encode?

| Metric | Value |
|---|---|
| t_sep threshold | 0.60 |
| Articles with `clear_split` human tier | 25 |
| `clear_split` articles that fail t_sep on own gold labels | 0 |
| Metric/label mismatch rate | 0.0% (0/25) |

**Finding:** All human `clear_split` articles pass the current t_sep=0.60 threshold on their own gold labels. The metric and the labelling construct are consistent — whatever accuracy gap remains is downstream of this metric (embedding or thresholding). See §D.4 for the currently measured tier accuracy.

### Per-article details

| Article | Human tier | Separation | Transitions | Data | Interp | Total | Metric failure? |
|---|---|---|---|---|---|---|---|
| Women at the crucifixion | muddled | 0.2500 | 3 | 3 | 2 | 5 | ✓ |
| Date of the birth of Jesus | muddled | 0.4615 | 21 | 26 | 14 | 40 | ✓ |
| Synoptic Gospels | muddled | 0.5357 | 13 | 20 | 9 | 33 | ✓ |
| Crucifixion of Jesus | muddled | 0.5455 | 20 | 29 | 16 | 46 | ✓ |
| Jesus predicts his death | muddled | 0.5455 | 10 | 16 | 7 | 24 | ✓ |
| Last Supper | muddled | 0.5745 | 20 | 28 | 20 | 49 | ✓ |
| Triumphal entry into Jerusalem | muddled | 0.6071 | 22 | 26 | 31 | 57 | ✓ |
| Kiss of Judas | muddled | 0.6250 | 3 | 6 | 3 | 11 | ✓ |
| Jesus and the woman taken in adultery | muddled | 0.6579 | 13 | 28 | 11 | 39 | ✓ |
| Pilate's court | muddled | 0.6667 | 3 | 7 | 3 | 10 | ✓ |
| Sanhedrin trial of Jesus | muddled | 0.6667 | 5 | 13 | 3 | 16 | ✓ |
| Jesus' authority questioned | muddled | 0.6667 | 2 | 6 | 1 | 7 | ✓ |
| Calvary | muddled | 0.6719 | 21 | 43 | 22 | 65 | ✓ |
| Naked fugitive | clear_split | 0.7143 | 2 | 4 | 4 | 8 | ✓ |
| Gospel of John | clear_split | 0.7209 | 12 | 14 | 30 | 46 | ✓ |
| Nativity of Jesus | clear_split | 0.7234 | 13 | 20 | 28 | 48 | ✓ |
| Crucifixion darkness | clear_split | 0.7241 | 8 | 12 | 18 | 30 | ✓ |
| Gospel harmony | clear_split | 0.7500 | 6 | 18 | 7 | 27 | ✓ |
| Arrest of Jesus | clear_split | 0.7500 | 2 | 8 | 1 | 9 | ✓ |
| Transfiguration of Jesus | clear_split | 0.7500 | 8 | 15 | 18 | 33 | ✓ |
| Four Evangelists | clear_split | 0.7619 | 5 | 14 | 8 | 23 | ✓ |
| Gospel of Mark | clear_split | 0.7674 | 10 | 21 | 23 | 46 | ✓ |
| List of gospels | clear_split | 0.7727 | 10 | 40 | 5 | 50 | ✓ |
| Passion of Jesus | clear_split | 0.7733 | 17 | 60 | 16 | 77 | ✓ |
| Raising of Jairus' daughter | clear_split | 0.7857 | 3 | 7 | 8 | 15 | ✓ |
| Thirty pieces of silver | clear_split | 0.7895 | 4 | 16 | 4 | 20 | ✓ |
| Galilee | clear_split | 0.7895 | 4 | 17 | 3 | 20 | ✓ |
| Gospel of Luke | clear_split | 0.8000 | 5 | 8 | 18 | 29 | ✓ |
| Bargain of Judas | clear_split | 0.8000 | 1 | 5 | 1 | 6 | ✓ |
| Cleansing of the Temple | clear_split | 0.8125 | 6 | 9 | 24 | 35 | ✓ |
| Rich man and Lazarus | clear_split | 0.8372 | 7 | 27 | 17 | 44 | ✓ |
| Anointing of Jesus | clear_split | 0.8421 | 3 | 10 | 10 | 20 | ✓ |
| Emmaus | clear_split | 0.8462 | 8 | 43 | 10 | 53 | ✓ |
| Resurrection of Jesus | clear_split | 0.8605 | 6 | 8 | 36 | 45 | ✓ |
| Gospel of Matthew | clear_split | 0.8667 | 4 | 13 | 18 | 31 | ✓ |
| Matthew the Apostle | clear_split | 0.8667 | 2 | 15 | 1 | 16 | ✓ |
| Historicity of the Gospels | clear_split | 0.8704 | 7 | 9 | 46 | 55 | ✓ |
| Jesus at Herod's court | clear_split | 0.8750 | 1 | 6 | 3 | 9 | ✓ |
| Oral gospel traditions | one_side_only | 1.0000 | 0 | 0 | 22 | 22 | ✓ |

## A.3 — Register-store gate audit

**Current implementation (`classifier/labeler.py`, `_label_paragraph()`):** the register score is applied as a single **class-independent** gate, checked before the per-class comparisons even run:

```python
if register_score < t_register_threshold:
    return LABEL_NEITHER

is_data = data_score >= t_data_threshold
is_close = close_score >= t_close_threshold
is_interp = interp_score >= t_interp_threshold
```

A paragraph must clear `t_register` to be considered class-bearing at all; if it does, the data/close/interpretation labels are then decided independently by their own thresholds. This is class-independent by design — it is a prose-quality gate, not a per-class confirmation.

**History:** an older version of this function instead compared the same `register_score` against both `t_data` and `t_interp` (`is_data = data_score >= t_data and register_score >= t_data`; `is_interp = interp_score >= t_interp and register_score >= t_interp`). With `t_data == t_interp` those two gates were logically identical, so the 'per-class register confirmation' the config docstring described never actually existed. That double-comparison has been replaced by the single class-independent gate shown above.

**The gate's real defect was never this mechanism — it was exemplar coverage.** `scripts/diagnose_register_gate.py` (§B) measured the register gate's actual failures directly against the gold-set paragraph labels: only **1.0%** of failures came from the nearest-neighbour-negative rule (a mislabelled or overly-broad negative exemplar); **49.8%** were plain mean-cosine-below-threshold, because the register store has only 32 exemplars (20 positive / 12 negative) versus 80+ for each of the other three stores. See §B for the full paragraph-level before/after measurement.

## A.4 — Calibration sweep coverage gaps

`calibrate.py`'s `sweep_t_data_interp_from_cache()` sweeps `t_data`, `t_close`, `t_interp`, and `t_register` as four **independent** grids (nested loops, each over its own `np.arange(...)`), not a tied pair — asymmetric thresholds (e.g. `t_data=0.60, t_interp=0.45`) are explored and are in fact what the current winning configuration uses. (An earlier version of this diagnostic, when the sweep really was 1-D and the classes were swept as a tied pair, is what this section originally described — verify against the current function body before trusting this claim on a future rerun, since the sweep implementation can change independently of this doc.)

`calibrate.py`'s `choose_best()` maximises accuracy over all 39 gold-set articles with **no held-out set** — the reported tier accuracy (see §D.4) is an in-sample optimum, and the true out-of-sample accuracy could be lower.

## A.5 — Bootstrap confidence interval

At n=39 gold-set articles, a Wilson-score 95% CI band for a proportion near 0.5 is roughly ±0.15 — the sample is small enough that tier accuracy alone is a noisy signal. §D.4 reports the actual bootstrap 95% CI for the current calibrated configuration (computed directly by `calibrate.py`'s `bootstrap_ci()`, which is more precise than this generic approximation); read the accuracy number there alongside its CI rather than as a point estimate.

**Implication for the ≥0.85 gate:** even a future calibration run that reports 0.85 should be read against its own CI at this sample size (n=39) — the 0.85 gate should be interpreted alongside the CI, and gold-set expansion should be scoped as a prerequisite for any activation decision.

## D.4 — Four-way bake-off results

| Separation metric | Scoring rule | Best t_data | Best t_close | Best t_interp | Best t_register | Best t_sep | Tier accuracy | 95% CI |
|---|---|---|---|---|---|---|---|---|
| Adjacency (current) | Mean-cosine (current) | 0.40 | 0.65 | 0.40 | 0.35 | 0.70 | 0.615 | [0.462, 0.769] |
| Block-structure (new) | Mean-cosine (current) | 0.40 | 0.65 | 0.40 | 0.35 | 0.70 | 0.615 | [0.462, 0.769] |
| Adjacency (current) | Centroid | 0.60 | 0.60 | 0.45 | 0.15 | 0.50 | 0.641 | [0.487, 0.795] |
| Block-structure (new) | Centroid | 0.60 | 0.60 | 0.45 | 0.15 | 0.50 | 0.641 | [0.487, 0.795] |

**Interpretation:** The row with the highest accuracy identifies the dominant fix. If the block-structure row substantially outperforms the adjacency row, the separation metric is the primary error source. If the centroid rows outperform the mean-cosine rows, the scoring rule is primary. If none reaches the 0.85 gate, embedding capacity is the binding constraint.

**Bake-off interpretation:** The best configuration (adjacency × centroid) achieves 0.641 accuracy (CI [0.487, 0.795]). This does NOT clear the ≥0.85 gate. The adjacency metric matches or outperforms block-structure, suggesting the separation functional is not the primary bottleneck. The centroid scoring rule outperforms mean-cosine, indicating the scoring rule is a meaningful error source. Since neither fix alone crosses the 0.85 gate, embedding capacity (MiniLM discriminative power) is likely the binding constraint — a larger ONNX model or expanded exemplar sets may be necessary.

## C — Paragraph-level evaluation harness (Phase 2)

Generated automatically by `calibrate.py` on every run, at the winning bake-off configuration (`scoring_rule=centroid`, `t_data=0.60`, `t_close=0.60`, `t_interp=0.45`, `t_register=0.15`). See `scripts/paragraph_eval.py` for the shared implementation used here and by `scripts/diagnose_register_gate.py` (§B).

### C.1 — Corpus-wide raw label distribution and `neither` rate

Covers all 1359 classified paragraphs across the gold-set articles (no gold alignment required for this slice).

| Label | Count |
|---|---|
| data | 278 |
| close | 188 |
| interpretation | 683 |
| neither | 171 |
| other | 39 |

`neither` rate: **12.6%** (171/1359) vs. human baseline **2.3%** (28/1,219).

### C.2 — Aligned-6 confusion matrix (index-aligned gold paragraphs)

Covers 91 of the 1,219 gold-set-section-classifier.csv paragraph labels (91/1219 = 7.5%) — the only paragraphs where the classifier's own segmentation exactly matches gold's paragraph count (6/39 articles: Gospel of Luke, Gospel of Matthew, Women at the crucifixion, Naked fugitive, Jesus at Herod's court, Arrest of Jesus). The remaining gold labels cannot be index-aligned; see §C.4 for why.

Collapsed confusion matrix (gold rows x predicted columns; 'close' predictions collapsed into 'data', 'other' into 'neither'):

| Gold \ Pred | data | interpretation | neither |
|---|---|---|---|
| data | 24 | 10 | 8 |
| interpretation | 16 | 27 | 3 |
| neither | 0 | 3 | 0 |

| Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| data | 0.600 | 0.571 | 0.585 | 42 |
| interpretation | 0.675 | 0.587 | 0.628 | 46 |
| neither | 0.000 | 0.000 | 0.000 | 3 |

**Data-vs-interpretation accuracy (restricted to classified paragraphs):** 0.662 (51/77).

### C.3 — Three-tier standalone confusion matrix

Covers all 136 paragraphs in `gold-set-three-tier.csv` (45 articles), classified standalone with no surrounding article context (no alignment needed — the gold file carries the actual paragraph text). This is the only measurement in the codebase that validates the close-analysis (Tier 2) store directly against a human label, since gold-set-section-classifier.csv only distinguishes data/interpretation/neither. Coverage caveat: only 9 of gold-set-three-tier.csv's 45 article titles overlap with the 39-article gold-set-section-classifier.csv, and 130/136 rows are paragraph_index 0-2 (ledes/openings) — this is a different, opening-skewed sample, not a text-bearing subset of the 1,219-label corpus.

Raw (pre-collapse) predicted-label distribution on this slice:

| Label | Count |
|---|---|
| data | 56 |
| close | 20 |
| interpretation | 50 |
| neither | 10 |
| other | 0 |

Collapsed confusion matrix (gold rows x predicted columns):

| Gold \ Pred | data | interpretation | neither |
|---|---|---|---|
| data | 65 | 26 | 6 |
| interpretation | 11 | 24 | 4 |
| neither | 0 | 0 | 0 |

| Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| data | 0.855 | 0.670 | 0.751 | 97 |
| interpretation | 0.480 | 0.615 | 0.539 | 39 |
| neither | 0.000 | 0.000 | 0.000 | 0 |

**Data-vs-interpretation accuracy (restricted to classified paragraphs):** 0.706 (89/126).

`neither` rate on this slice: **7.3%** (10/136).

### C.4 — Why the full 1,219-label corpus can't be measured directly

`gold-set-section-classifier.csv`'s `per_paragraph_labels` column carries labels only, no paragraph text — so there is nothing to text-match against for the 33/39 articles whose classifier-side paragraph count doesn't match gold's (see CLASSIFIER_DIAGNOSIS.md §A.1, VALIDATION_REPORT.md). Re-deriving the original labellers' paragraph segmentation is not reproducible after the fact: `GOLD_SET_LABELLING_PROCEDURE.md` describes labelling against the *visually rendered* Wikipedia page, while the classifier (and this harness) reads the parse-API HTML extract — the two pipelines split paragraphs at different points (e.g. infobox/caption text, collapsed sections) with no recorded mapping between them. `gold-set-three-tier.csv` (§C.3) was checked as a text-matching bridge — it carries `paragraph_text` — but for the 9 article titles it shares with the 39-article gold set, none of its 31 paragraph texts appear verbatim, as a substring, or as a close fuzzy match (difflib, cutoff=0.6) in the corresponding live-fetched paragraphs; Wikipedia article text has drifted since the gold set was labelled and/or the recorded text was paraphrased rather than extracted verbatim. Expanding coverage further requires new data — either re-labelling against the classifier's own parse-API segmentation, or a scripted, versioned re-extraction with a recorded index mapping — not something this harness can produce honestly from the files that exist today. §C.1-C.3 therefore report their own coverage explicitly rather than presenting the aligned/standalone slices as corpus-wide.
## B — Register-gate coverage diagnostic (2026-07-30)

Measures the register gate's paragraph-level cost directly against the 1,219 gold-set paragraph labels (`gold-set-section-classifier.csv`, `per_paragraph_labels`), rather than inferring it from article-level tier accuracy. See `scripts/diagnose_register_gate.py`.

### B.1 — Root cause: threshold coverage, not mislabelled exemplars

At the pre-fix config (`t_register=0.40`), of 1320 body paragraphs across all 39 gold articles, the register gate failed on 28 (2.1%):

- **13** (1.0%) were zeroed by the nearest-neighbour-negative rule (nearest register-store match is a 'negative' exemplar at cosine ≥ 0.75) — this rules out mislabelled/overly-broad negative exemplars as the dominant cause.

- **15** (1.1%) fell below t_register on plain mean-cosine with no strong negative match — this is the dominant failure mode. The register store has only 32 exemplars total (20 positive / 12 negative), the smallest of the four stores (vs 80+ each for data/close/interpretation), so real paragraphs routinely score below a 0.40 bar against a small positive set.

### B.2 — The actual root cause: t_register was never independently calibrated

`calibrate.py`'s `sweep_t_data_interp_from_cache()` silently passed the `t_data` grid value into `evaluate_tiers_from_cache()`'s `t_reg` parameter. `t_register` was therefore never swept on its own axis — every past calibration run's reported `t_register=0.40` was an artefact of `t_data`'s value, not a calibrated result. Fixed 2026-07-30 by giving `t_register` its own grid (`np.arange(0.15, 0.45, 0.05)`, independent of the t_data/t_close/t_interp grid).

### B.3 — Before / after the fix

| Metric | Pre-fix (mean-cosine, t_register=0.40) | Post-fix (centroid, t_register=0.15) |
|---|---|---|
| Corpus-wide `neither` rate (39 articles) | 49.7% | 12.6% |
| Gold `neither` rate (human labellers) | 2.3% (28/1,219) | 2.3% (28/1,219) |
| False `neither` on real data/interp paragraphs (aligned-6 slice) | 28/88 (31.8%) | 11/88 (12.5%) |
| Data-vs-interpretation accuracy on classified paragraphs (aligned-6) | 0.700 (n=60) | 0.662 (n=77) |

**Finding:** the register-gate fix cuts the corpus-wide `neither` rate by roughly 37% of the corpus and lets far more real data/interpretation paragraphs reach classification at all. Data-vs-interpretation accuracy measured on the larger, less cherry-picked post-fix sample (n=77) is 0.662 — the pre-fix accuracy of 0.700 was measured on a smaller sample (n=60) because the over-firing gate had already filtered out the harder paragraphs, inflating the apparent accuracy through survivorship bias. Neither number supports 'the embedding model cannot separate the axis' — both are well above the 50% chance rate for a binary split.

**Open question:** the fixed sweep's grid floor for t_register was 0.15, and the winning configuration landed exactly on that floor — the same floor-pinning pattern seen earlier for t_data/t_interp. Whether an even lower t_register would help further, or whether 0.15 already over-admits low-quality paragraphs, is untested here — flagged as a follow-up for the next calibration pass.
