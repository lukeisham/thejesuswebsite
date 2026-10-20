# Classifier Diagnosis

This record measures how well the paragraph classifier agrees with human and LLM labels. It takes labelled paragraphs and articles, and gives the numbers that decide whether a trained paragraph head may replace the store scoring.

`calibrate.py` writes some sections. For how the pipeline works now, read
`ALGORITHM_GUIDE_the_how.md`.

**Date:** (see git log)
**Gold set articles:** 36
**Articles with human labels:** 36

> **Note on counts:** "Gold set articles" / "human labels" above is the row count of `gold-set-section-classifier.csv` (36, after commit b916045 removed 3 domain-excluded rows on 2026-08-04; the historical figure of 39 predates that cleanup). Elsewhere in this doc, a count like "33" refers to a *different* thing: articles that were successfully fetched from the Wikipedia API during calibration, not a row count — see CLASSIFIER_CALIBRATION.md ("Fetched 33/39 gold-set articles"). Do not conflate the two.

## A.1 — Separation-metric diagnostic (human labels only)

This diagnostic runs `compute_separation_ratio()` on the **human** gold-set
labels — no model inference is involved. It answers: does the current
adjacency-based metric measure what the human labels encode?

| Metric | Value |
|---|---|
| t_sep threshold | 0.60 |
| Articles with `clear_split` human tier | 23 |
| `clear_split` articles that fail t_sep on own gold labels | 0 |
| Metric/label mismatch rate | 0.0% (0/23) |

**Finding:** All human `clear_split` articles pass the current t_sep=0.60 threshold on their own gold labels. The metric and the labelling construct are consistent — whatever accuracy gap remains is downstream of this metric (embedding or thresholding). See §D.4 for the currently measured tier accuracy.

### Per-article details

> **Stale-table caveat:** the table below still lists three articles ("List of gospels", "Four Evangelists", "Synoptic Gospels") removed from the gold set by commit b916045. They are left in place rather than deleted here because removing rows without recomputing the metrics derived from them would silently change the accuracy/coverage figures elsewhere in this document; a full refresh requires re-running `calibrate.py`.

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

`calibrate.py`'s `choose_best()` maximises accuracy over all 36 gold-set articles with **no held-out set** — the reported tier accuracy (see §D.4) is an in-sample optimum, and the true out-of-sample accuracy could be lower. See §D.5 for the honest out-of-sample estimate against the LLM-labelled corpus.

## A.5 — Bootstrap confidence interval

At n=36 gold-set articles, a Wilson-score 95% CI band for a proportion near 0.5 is roughly ±0.15 — the sample is small enough that tier accuracy alone is a noisy signal. §D.4 reports the actual bootstrap 95% CI for the current calibrated configuration (computed directly by `calibrate.py`'s `bootstrap_ci()`, which is more precise than this generic approximation); read the accuracy number there alongside its CI rather than as a point estimate.

**Implication for the ≥0.85 gate:** even a future calibration run that reports 0.85 should be read against its own CI at this sample size (n=36) — the 0.85 gate should be interpreted alongside the CI, and gold-set expansion should be scoped as a prerequisite for any activation decision.

## D.4 — Four-way bake-off results

| Separation metric | Scoring rule | Best t_data | Best t_close | Best t_interp | Best t_register | Best t_sep | Tier accuracy | 95% CI |
|---|---|---|---|---|---|---|---|---|
| Adjacency (current) | Mean-cosine (current) | 0.40 | 0.65 | 0.40 | 0.40 | 0.65 | 0.639 | [0.472, 0.806] |
| Block-structure (new) | Mean-cosine (current) | 0.40 | 0.65 | 0.40 | 0.40 | 0.65 | 0.639 | [0.472, 0.806] |
| Adjacency (current) | Centroid | 0.60 | 0.60 | 0.45 | 0.15 | 0.50 | 0.667 | [0.500, 0.806] |
| Block-structure (new) | Centroid | 0.60 | 0.60 | 0.45 | 0.15 | 0.50 | 0.667 | [0.500, 0.806] |

**Interpretation:** The row with the highest accuracy identifies the dominant fix. If the block-structure row substantially outperforms the adjacency row, the separation metric is the primary error source. If the centroid rows outperform the mean-cosine rows, the scoring rule is primary. If none reaches the 0.85 gate, embedding capacity is the binding constraint.

**Bake-off interpretation:** The best configuration (adjacency × centroid) achieves 0.667 accuracy (CI [0.500, 0.806]). This does NOT clear the ≥0.85 gate. The adjacency metric matches or outperforms block-structure, suggesting the separation functional is not the primary bottleneck. The centroid scoring rule outperforms mean-cosine, indicating the scoring rule is a meaningful error source. Since neither fix alone crosses the 0.85 gate, embedding capacity (MiniLM discriminative power) is likely the binding constraint — a larger ONNX model or expanded exemplar sets may be necessary.

## D.5 — Held-out validation (LLM-labelled corpus)

Validates `calibrate.py`'s `calibrate_with_held_out()` against the
266-article LLM-labelled corpus (`labels-corpus.json`, 4 articles excluded for empty label arrays — see issue #226), replacing §D.4's
in-sample-only estimate with an honest ~70/30 train/test split (seed=42,
assigned per article by a hash of its title).
Thresholds are swept on the train split only; the reported test accuracy
below is measured on articles the sweep never saw.

| Setting | Value |
|---|---|
| Scoring rule | centroid |
| Separation mode | adjacency |
| Train articles | 181 |
| Test articles | 85 |

| Metric | Value |
|---|---|
| Train accuracy (in-sample, train split) | 0.668 |
| Test accuracy (held-out) | 0.671 |
| Train − test gap | -0.002 |
| Test accuracy 95% CI (bootstrap) | [0.565, 0.765] |

### Best train-split configuration

| Parameter | Value |
|---|---|
| t_data | 0.40 |
| t_close | 0.40 |
| t_interp | 0.60 |
| t_sep | 0.50 |
| t_register | 0.15 |

**Interpretation:** the train-test gap measures overfitting to the threshold
sweep; a large gap means the in-sample bake-off numbers in §D.4 overstate
true accuracy. This run's `best_config` is **not** applied to
`classifier/config.py` — promoting held-out-derived thresholds to production
is a separate decision requiring its own re-verification against the
existing bake-off, not an automatic side effect of adding this validation
report.

## D.6 — Trained paragraph head

Generated by `scripts/train_paragraph_head.py` (issue #231). The head is a
linear classifier on the full paragraph embedding. It replaces the four
store scores with the 384 embedding values. It trains on the LLM labels of
the train split only. It uses the same title-hash split as §D.5, so the two
test results are comparable. The regularisation, the class weighting, and
`t_sep` come from 5-fold cross-validation on the train split. The test
split is used once.

| Setting | Value |
|---|---|
| Train articles | 181 |
| Test articles | 85 |
| Articles not aligned with their labels (kept in the tier test, left out of training) | 9 |
| C | 0.3 |
| Class weighting | none |
| Interpretation intercept shift | 0.0 |
| t_sep | 0.50 |

| Metric | Value |
|---|---|
| Test tier accuracy (held-out) | 0.776 |
| Test accuracy 95% CI (bootstrap) | [0.682, 0.859] |
| Cross-validation accuracy (train split) | 0.784 |
| Train accuracy (in-sample) | 0.779 |
| Store-scoring baseline (§D.5) | 0.671 |
| Always guess the most common tier | 0.800 |
| Activation gate | 0.850 |

Paragraph level, on the test split (1852 paragraphs; the most
common class is 0.591 of them). Overall accuracy is
0.738.

| Class | Recall | Precision |
|---|---|---|
| data | 0.924 | 0.749 |
| close | 0.417 | 0.662 |
| interpretation | 0.511 | 0.744 |

Interpretation intercept shift, on the test split. A larger shift makes the
head call more paragraphs interpretation. Recall rises and precision falls.
The test split only reports this table. The shift in use comes from
cross-validation on the train split (or from `--interp-offset`).

| Shift | Test tier accuracy | Interpretation recall | Interpretation precision |
|---|---|---|---|
| 0.0 | 0.776 | 0.511 | 0.744 |
| 0.25 | 0.753 | 0.624 | 0.678 |
| 0.5 | 0.741 | 0.699 | 0.606 |
| 0.75 | 0.788 | 0.780 | 0.550 |
| 1.0 | 0.765 | 0.839 | 0.484 |
| 1.5 | 0.694 | 0.919 | 0.379 |
| 2.0 | 0.741 | 0.966 | 0.310 |

Test articles by (gold tier, predicted tier):

| Pair | Articles |
|---|---|
| `clear_split->clear_split` | 54 |
| `clear_split->muddled` | 2 |
| `clear_split->one_sided` | 12 |
| `muddled->muddled` | 2 |
| `one_sided->clear_split` | 4 |
| `one_sided->one_sided` | 9 |
| `one_sided->unclassifiable` | 1 |
| `unclassifiable->unclassifiable` | 1 |

**Interpretation:** the gold tiers come from an LLM labeller, not from a
human, so this result measures agreement with that labeller. The gate is
not met if the test accuracy is below 0.850. Read the accuracy next to the
"always guess" row: when one tier is most of the corpus, the raw accuracy
is a weak measure. The head is not the default scoring rule. Activation is
a separate decision (issue #231).

## D.7 — Paragraph head trained on Jev–DeepSeek agreement

Generated by `scripts/train_agreement_head.py` (issue #231). Numbers are in
`paragraph-head-agreement-result.json`. The head is the same softmax regression
as §D.6. The only change is the training labels. Jev (TypeSafe `jev-1.13.0`)
labelled all 7,870 fetch-cache paragraphs with `scripts/jev_pilot_label.py
--source corpus` (one call per paragraph, article title as context). A
paragraph trains the head only when Jev and DeepSeek give the same label and
Jev's confidence is 0.8 or higher. The split is the §D.6 title-hash split.
The test targets are still the DeepSeek tier states of each article. The
settings come from the same 5-fold cross-validation on the train split. The
test split was used once. This section does not change the gate and does not
activate any head.

### Agreement set

| Item | Value |
|---|---|
| DeepSeek-labelled paragraphs that join to a Jev label | 6,478 (9 articles left out: label count differs from paragraph count) |
| Same label from both engines | 4,709 (72.7%) |
| Same label and Jev confidence 0.8 or higher | 3,317 (51.2%), in 256 articles |
| Label mix of those 3,317 | data 1,503, interpretation 1,206, close 608 |
| Paragraphs left in the train split (body paragraphs only) | 2,312 |
| Jev confidence on the 6,478 | below 0.8: 2,438; 0.8 to 0.95: 1,219; 0.95 or higher: 2,821 |

Agreement on the corpus (72.7%) is far lower than on the 136 human-gold
paragraphs (89.7%). The difference is one cell: of 3,600 paragraphs that
DeepSeek calls data, Jev calls 915 interpretation. Jev gives interpretation to
42% of these 6,478 paragraphs; DeepSeek gives it to 23%. The filter removes most of those
paragraphs, so the remaining "data" paragraphs are the plain ones.

### Test split (85 articles)

| Metric | Old head (§D.6) | New head |
|---|---|---|
| Settings | C 0.3, no weighting | C 1.0, balanced weighting; shift 0.0; t_sep 0.50 |
| Cross-validation tier accuracy | 0.784 | 0.768 |
| Test tier accuracy | 0.776 [0.682, 0.859] | 0.788 [0.694, 0.871] |
| Paragraph accuracy (1,852 paragraphs, against DeepSeek) | 0.738 | 0.675 |
| Interpretation recall / precision | 0.511 / 0.744 | 0.819 / 0.498 |
| Close recall / precision | 0.417 / 0.662 | 0.517 / 0.544 |
| Data recall / precision | 0.924 / 0.749 | 0.671 / 0.867 |

The tier accuracy of the new head is 0.788, which is below the 0.800 of
"always guess clear_split" and below the 0.850 gate. The difference from the
old head (one article) is far inside the confidence interval.

### Human gold (136 paragraphs: data 80, close 17, interpretation 39)

| Measure | Old head | New head | Jev (pilot) | DeepSeek (pilot) |
|---|---|---|---|---|
| Accuracy | 0.721 | 0.596 | 0.868 | 0.853 |
| Cohen's kappa | 0.475 | 0.384 | 0.776 | 0.751 |
| Macro-F1 | 0.624 | 0.563 | not computed | not computed |
| Recall data / close / interpretation | 0.888 / 0.471 / 0.487 | 0.525 / 0.647 / 0.718 | not computed | not computed |
| Accuracy on the 35 gold paragraphs in test-split articles | 0.686 | 0.571 | not applicable | not applicable |

The new head is worse than the old head on the human gold. It calls only 48 of
the 136 paragraphs data (the human called 80). The paragraphs of the gold set
come from corpus articles, and the train split saw some of them with engine
labels, never with the human label.

Two checks on the cause. A one-off run (not kept in the repo) fitted the same
agreement set with no class weighting. The gold accuracy rose only to 0.632
(C 1.0) and 0.618 (C 0.3). So the class weighting is not the main cause. The
likely cause is the filter: it keeps plain data paragraphs, drops the
ambiguous ones, and so teaches the head a narrow idea of "data". The result
supports the pilot finding that both engines mistake the same way, but not a
gain from training on their agreement.

### Candidate gate metrics (issue #231)

All values are on the 85 test articles against the DeepSeek tier states
(clear_split 68, one_sided 14, muddled 2, unclassifiable 1). Intervals are
95% bootstrap over articles. The decision is Luke's. Nothing here changes the
gate.

| Metric | Store baseline (§D.5) | Old head | New head | Always clear_split |
|---|---|---|---|---|
| Tier accuracy (now: gate 0.850) | 0.671 | 0.776 | 0.788 | 0.800 |
| Macro-F1 over tier states | 0.487 [0.37, 0.74] | 0.676 [0.55, 0.84] | 0.558 [0.38, 0.76] | 0.222 |
| Cohen's kappa | 0.315 [0.14, 0.48] | 0.458 [0.24, 0.65] | 0.343 [0.11, 0.56] | 0.000 |
| Recall, clear_split | 0.662 | 0.794 | 0.897 | 1.000 |
| Recall, all other states together ("minority recall", 17 articles) | 0.706 | 0.706 | 0.353 | 0.000 |

1. **Tier accuracy** (current gate). A rule that ignores the text gets the
   best score. Not a good gate for this corpus.
2. **Macro-F1.** Ranks "always clear_split" lowest, but gives the same weight
   to muddled (2 articles) and unclassifiable (1 article) as to clear_split
   (68). One article moves it a lot, so it is the noisiest of the three.
3. **Cohen's kappa.** Chance and "always clear_split" score 0, so a rule that
   ignores the text cannot pass. One number, and it uses all 85 articles. It
   does not show which tier fails.
4. **Per-tier recall with a floor** (minority recall in the table). Shows
   directly that the new head gets clear_split right at the cost of the other
   tiers. It needs a floor chosen by hand, and the minority group is only 17
   articles.

**Recommendation:** use Cohen's kappa as the gate number, together with a
floor on minority recall, so that a head cannot pass by leaning on
clear_split. The values of the gate and the floor are for Luke to set. No
head reaches kappa 0.6 (the usual "substantial" level). The widths of the
intervals (about 0.4) mean 85 articles cannot tell the old head from the new
head or the store baseline. Before a gate is set, pool the out-of-fold
predictions over all 266 articles to get a narrower interval.

**Interpretation of the whole section:** Jev labels the 136 human paragraphs
about as well as DeepSeek does, but training on only the paragraphs where
the two agree did not help the head. It did not reach the 0.850 gate on tier
accuracy and it scored lower than the old head on the human gold. The old head
stays the better of the two heads on the evidence here. Issue #231 is still
open.

### D.7.1 — Rerun with the corrected rubric

**Superseded by §D.8.** The numbers below come from the three-class rubric of D-039 and D-040.
D-042 to D-045 and the rulings of §D.8 changed the rules and dropped close. Read them as the
record of that run only; the gate evidence is in §D.8.

Everything above was measured with labels made under the old `RUBRIC`. After the rule changes
of D-037 to D-039, DeepSeek relabelled the corpus (7,777 paragraphs, 270 articles, no errors;
data 3,694, interpretation 2,825, close 1,258) and Jev relabelled all 7,870 paragraphs. The
new labels are in the side-session notes folder, outside git. `labels-corpus.json` is not
replaced. The split is the same title hash, but 269 articles now carry labels (182 train, 87
test), so the test set is not the 85 articles of §D.5 to §D.7. The tier targets are the new
DeepSeek tier states: clear_split 76, muddled 7, one_sided 3, unclassifiable 1. Always guessing
clear_split now scores 0.874.

Agreement under the new rubric: of 7,222 joinable paragraphs, both engines give the same label
for 5,679 (78.6%, was 72.7%). With Jev confidence of 0.8 or higher, 4,208 remain (data 2,175,
interpretation 1,657, close 376), in 263 articles.

| Measure | Agreement head | DeepSeek-only head (control) | Old head (old labels; stale) |
|---|---|---|---|
| Settings | C 0.3, balanced, shift 0.75 | C 0.3, no weighting, shift 0 | C 0.3, no weighting |
| Train paragraphs | 2,837 | 4,879 | not applicable |
| Test tier accuracy | 0.816 [0.736, 0.897] | 0.782 | 0.690 |
| Kappa on tier states | 0.311 [0.03, 0.57] | 0.263 [0.02, 0.49] | 0.194 [0.03, 0.37] |
| Macro-F1 on tier states | 0.595 | 0.542 | 0.460 |
| Recall on non-clear_split articles (11 articles) | 0.455 | 0.455 | 0.364 |
| Paragraph accuracy against the new DeepSeek labels (2,257) | 0.593 | 0.683 | 0.633 |
| Human gold (136): accuracy | 0.603 | 0.787 | 0.669 |
| Human gold: kappa | 0.387 | 0.625 | 0.406 |
| Human gold: macro-F1 | 0.568 | 0.705 | 0.573 |
| Human gold: share called interpretation (human: 46 of 136) | 77 | 45 | 19 |

Same settings for every label rule (C 0.3, no class weighting, no shift; not chosen by
cross-validation, so this is a comparison, not a result to ship):

| Label rule | Train paragraphs | Human gold: accuracy | Human gold: kappa | Human gold: macro-F1 | Test tier accuracy | Tier kappa [interval] | Recall on non-clear_split |
|---|---|---|---|---|---|---|---|
| Agreement (Jev and DeepSeek agree, Jev 0.8 or higher) | 2,837 | 0.787 | 0.631 | 0.694 | 0.862 | 0.403 [0.10, 0.65] | 0.455 |
| Jev only (Jev 0.8 or higher) | 3,212 | 0.794 | 0.646 | 0.714 | 0.862 | 0.350 [0.04, 0.60] | 0.364 |
| DeepSeek only (all labels) | 4,879 | 0.787 | 0.625 | 0.705 | 0.782 | 0.263 [0.02, 0.49] | 0.455 |

What the numbers say:

- Training on DeepSeek labels made with the new rubric helps on the human gold. Kappa rises from
  0.406 (old head) to 0.625, and accuracy from 0.669 to 0.787. This is an upper bound: ten gold
  paragraphs shaped the rubric, and 101 of the 136 gold paragraphs sit in train-split
  articles. On the 35 gold paragraphs in test-split articles the DeepSeek-only head scores 0.743
  accuracy against 0.629 for the old head.
- The loss of the agreement head on the human gold (kappa 0.387 against 0.625) came from the
  settings that cross-validation picked, not from the labels. Cross-validation scores tier
  accuracy only, and for the agreement and Jev heads it chose balanced class weights and an
  interpretation shift of 0.75. Those settings push paragraph calls toward interpretation (77 of
  136 gold paragraphs, where the human has 46). The table below fits all three label rules with
  the same settings and removes the gap.

- Under equal settings the three label rules score the same on the human gold (accuracy 0.787 to
  0.794, kappa 0.625 to 0.646). Jev's confident labels do as well as DeepSeek's from 3,212
  paragraphs instead of 4,879, so Jev can replace DeepSeek as the labeller. The tier kappas
  (0.263 to 0.403) overlap, so none is separable.
- Selecting settings by tier accuracy is a defect while the gate stays kappa (D-036): it picks
  settings that hurt the paragraph labels. Select by kappa on the pooled out-of-fold predictions
  instead.
- On tier states the three heads are not separable. The kappa intervals overlap almost
  completely, and the non-clear_split group has 11 articles.
- The old head row is stale on both sides: it was trained on old labels and is scored against
  new targets. The store baseline of §D.5 is left out for the same reason, because it was scored
  on the old 85 articles.

### D.7.2 — Fresh 30-paragraph test judged by Luke

30 corpus paragraphs, none from the gold or the earlier hold-out, were drawn from three groups:
ten that compare or name gospels, eight quotation fragments, and twelve where Jev and DeepSeek
disagree under the corrected rubric. Luke judged them blind (data, close, interpretation or
mixed). The sample is hard on purpose, so the scores below are not accuracy on the corpus. The
answers are in the side-session notes folder, outside git.

Luke's labels: interpretation 15, data 14, mixed 1, close 0. One paragraph is mixed and is left out
below (29 scored).

| Group | Paragraphs | DeepSeek right | Jev right |
|---|---|---|---|
| Compare or name gospels | 10 | 3 | 5 |
| Quotation fragments | 7 | 5 | 5 |
| Engines disagree | 12 | 1 | 9 |
| All | 29 | 9 (31%) | 19 (66%) |

Both engines are wrong on six paragraphs. Jev's accuracy by confidence: below 0.6, 3 of 5; 0.6 to
0.8, 3 of 7; 0.8 to 0.95, 6 of 8; 0.95 and above, 7 of 9. On the human gold the top band was
right for nearly every call, so on hard paragraphs a high Jev confidence is a weaker promise.

What the errors show:

- DeepSeek calls 12 of the 30 paragraphs close. Luke called none close. DeepSeek turns a
  paragraph that merely mentions Matthew, Luke or John into close (7 of Luke's data paragraphs),
  and it calls a scholar's identification or claim close when Luke says interpretation (5).
- Jev calls 4 close, 1 of them with confidence 1.00 (a paragraph on shared gospel material that
  Luke called data).
- Paragraphs about legends, later tradition or fiction (a medieval legend, the Golden Legend,
  Victorian fiction) are interpretation for Luke. Jev got two of four right; DeepSeek got none.
- The close tier is rare: 16 of 136 in the gold, 0 of 30 here. The rubric still lets a gospel
  name trigger it.

### D.7.3 — Second 30-paragraph test, with clues

Luke judged 30 more paragraphs under the rules of D-039 and D-040 (Jev's labels hidden). Ten were
gold paragraphs that the gold had labelled close. Luke called 12 data, 17 interpretation and 1
mixed. He called none close, in either test.

| Group | Paragraphs | Jev right (three labels) |
|---|---|---|
| Old gold close | 10 | 7 |
| Legend or tradition | 6 | 5 |
| Compare or observe text | 6 | 3 |
| Jev unsure (below 0.6) | 7 | 4 |
| All | 29 | 19 (66%) |

Jev by confidence: below 0.6, 7 of 12; 0.6 to 0.8, 2 of 3; 0.8 to 0.95, 3 of 5; 0.95 and above, 7 of
9. Jev called 7 paragraphs close and every one was wrong by Luke's label.

Of the 10 old gold close paragraphs, Luke labelled 8 data and 2 interpretation, so the gold's close
labels disagree with him on all 10. The 8 data ones state what a text says, compares or
structures ("Matthew and Luke agree… but differ", "The sermon is structured around six
antitheses", "uniquely includes a dialogue"). The 2 interpretation ones make a claim about how a
text was made ("used the Gospel of Mark as a source, and also drew on a hypothetical… Q",
"reconstructions of the historical Jesus are based on the Pauline epistles and the gospels").

Rules the clues and labels show (not yet written into the rubric; Luke has not confirmed them):

- Ancient authors reported as sources are data: "Church Fathers… relate that Matthew preached",
  "Cyprian… wrote about footwashing".
- A named modern author's claim, a modern writer's use of a figure, art, fiction or a church
  festival is interpretation: Hopper (2014), Erikson (1966), Bailey, Loffreda, a speech by Martin
  Luther King Jr., an engraving and a novel, a Lesser Festival in the Church of England.
- A claim about composition, genre or sources (not an observation of structure or wording) is
  interpretation: "typical of ancient historical biographies", the hypothetical source Q.
- A bare scripture quotation with no framing is mixed.

Close does not separate anything here. The scorer already merges data and close into one
descriptive class (`compute_separation_ratio`), and only the split between descriptive and
interpretation moves a tier state. Read as two classes, Jev matches Luke on 22 of 29 in each test
(76%), DeepSeek on 16 of 29 in the first (55%), and Jev matches the human gold on 131 of 136 (96%).

## D.8 — Two-class head on Jev labels, scored with kappa (issue #231)

Generated by `scripts/train_agreement_head.py --label-rule jev`; the other two arms use
`--label-rule agreement` and `--label-rule deepseek`. The numbers are in
`paragraph-head-twoclass-<rule>-result.json`. This section does not change the 0.850 gate, does
not activate any head and does not mark issue #231 resolved. The kappa pass value, the recall
floor, the activation choice and the switch of `labels-corpus.json` to Jev are open.

**What changed since §D.7.**

- The labels have two classes, data and interpretation (D-042). Close is gone. The head has two classes.
- The rules are those of D-037 to D-045 plus four rulings in `DATA_INTERPRETATION_TIERS.md`
  (section 7): a plain statement about a text's structure, wording or style is data; a find report
  is data, and a belief or a debate beside it makes the paragraph interpretation; any hedge or
  approximate date is interpretation; a quotation of a later commentator is interpretation.
- Jev relabelled all 7,870 fetch-cache paragraphs under these rules: 4,752 interpretation and 3,118
  data. 5,243 calls (67%) have confidence 0.8 or higher (3,316 interpretation, 1,927 data).
- The gold has two classes: 82 data and 54 interpretation (`gold-set-three-tier.csv`). Luke judged
  every row that moved. Jev matches the gold on 131 of 136 paragraphs (kappa 0.924). Ten gold
  paragraphs shaped the rules, so this number is too high to count as a fair test.
- The target of every article is the tier state of its Jev labels, over all 270 articles. DeepSeek
  states are no longer the target. On the 266 articles that both engines labelled, the two sets of
  states agree on 79% of articles (kappa 0.283): DeepSeek's old-rubric labels give 42 `one_sided`
  articles, Jev's give 8. The gate therefore measures agreement with one labeller, not with a human.
- The head settings (C, class weights, interpretation shift, `t_sep`) are chosen by the kappa of
  the tier states, not by tier accuracy (D-036).

**Evaluation.** The split evaluation fits the head on the 182 train articles (3,629 confident Jev
paragraphs), chooses the settings by 5-fold cross-validation on those articles, and measures once
on the 88 test articles. The pooled evaluation predicts all 270 articles with a head that did not
train on them (5 folds by title hash) and chooses the settings by pooled kappa. The pooled kappa is
the best of the grid, so it is slightly high. The five best settings lie within 0.03 kappa of each
other (0.316 to 0.345). Intervals are 95% bootstrap intervals that resample articles.

Target mix. Pooled (270): 235 `clear_split`, 26 `muddled`, 8 `one_sided`, 1 `unclassifiable`. The
minority group (every state except `clear_split`) holds 35 articles. Test split (88): 80, 6, 1, 1,
so the minority group holds 8 articles.

Pooled, 270 articles:

| Rule | Tier accuracy | Kappa | Macro-F1 | Minority recall |
|---|---|---|---|---|
| New head (Jev labels, out of fold) | 0.819 | 0.345 [0.20, 0.48] | 0.588 [0.49, 0.74] | 0.514 [0.35, 0.69] |
| Old head (shipped weights) | 0.685 | 0.169 [0.08, 0.26] | 0.399 [0.32, 0.54] | 0.257 [0.12, 0.41] |
| Always `clear_split` | 0.870 | 0.000 | 0.233 | 0.000 |

The old head trained on 70% of these articles, so its pooled row is in-sample for those. Its
test-split row is held out.

Test split, 88 articles:

| Rule | Tier accuracy | Kappa | Macro-F1 | Minority recall |
|---|---|---|---|---|
| New head (Jev labels) | 0.818 | 0.121 [-0.09, 0.38] | 0.422 [0.30, 0.70] | 0.250 [0.00, 0.60] |
| Old head (shipped weights) | 0.682 | 0.125 [-0.01, 0.27] | 0.395 [0.29, 0.61] | 0.250 [0.00, 0.60] |
| Always `clear_split` | 0.909 | 0.000 | 0.238 | 0.000 |

Label rule for the training labels (new head, same selection by kappa):

| Training labels | Train paragraphs | Pooled kappa | Pooled minority recall | Test-split kappa | Gold accuracy (out of fold) | Gold kappa (out of fold) |
|---|---|---|---|---|---|---|
| Jev, confident | 3,629 | 0.345 [0.20, 0.48] | 0.514 | 0.121 [-0.09, 0.38] | 0.824 | 0.649 |
| Jev and DeepSeek agree, Jev confident | 2,065 | 0.320 [0.17, 0.47] | 0.400 | -0.033 [-0.16, 0.14] | 0.787 | 0.585 |
| DeepSeek (old rubric, close folded into data) | 4,544 | 0.223 [0.11, 0.34] | 0.314 | 0.231 [0.05, 0.42] | 0.809 | 0.582 |

Human gold, 136 paragraphs (82 data, 54 interpretation):

| Head | Accuracy | Kappa | Macro-F1 | Data recall | Interpretation recall |
|---|---|---|---|---|---|
| Old head (shipped weights) | 0.743 | 0.396 | 0.672 | 1.000 | 0.352 |
| New head (train split) | 0.860 | 0.718 | 0.858 | 0.817 | 0.926 |
| New head (out of fold) | 0.824 | 0.649 | 0.822 | 0.756 | 0.926 |
| Always `data` | 0.603 | 0.000 | 0.376 | 1.000 | 0.000 |

The "train split" row includes gold paragraphs from train articles. The head saw those paragraphs
with Jev labels, never with the human label. For test-split articles alone (35 paragraphs) its
accuracy is 0.857. The out-of-fold row never used the article of a paragraph it scores.

**What the numbers show.**

- Always `clear_split` scores 0.870 tier accuracy on all articles and 0.909 on the test split. Both
  are above the 0.850 accuracy gate. A rule that never reads the text passes that gate, so the
  accuracy gate cannot tell a useful head from none (D-036). Kappa scores it 0.
- On the pooled articles the new head beats the old one on kappa (0.345 against 0.169) and on
  minority recall (0.514 against 0.257), and the intervals overlap a little. On the test split alone
  the two tie (0.121 against 0.125) and both intervals include 0. The test split holds 8 minority
  articles, which is too few to set a floor. The pooled group holds 35, and its minority-recall
  interval is still 0.35 to 0.69 wide.
- Both heads miss most `muddled` articles. The new head finds 42% of them out of fold (0.423
  recall), and the old head finds 8%.
- The new head is much better than the old one on single paragraphs. On the test split its
  paragraph accuracy is 0.758 against 0.509, with interpretation recall 0.756 against 0.224. The
  old head labels most paragraphs data.
- Training on Jev's confident labels gives the best pooled kappa and the best gold kappa of the
  three arms. The differences to the other arms lie inside the intervals, so the data do not show
  that Jev's labels beat DeepSeek's by themselves. The agreement arm has the fewest paragraphs (2,065).
- The target depends on the labeller. A head can agree with Jev's states and still disagree with
  DeepSeek's, and neither set is a human judgement of the article.

**Open.** The kappa pass value, the minority-recall floor, whether to activate any head, and
whether to switch `labels-corpus.json` to the Jev labels (D-041). No head weights file in
`classifier/` changed. The experiment weights are `paragraph-head-twoclass-<rule>.json`.

### D.8.1 — Clean test of 20 fresh paragraphs under the final rules

Luke judged 20 paragraphs that were not used to write the rules (data 7, interpretation 12, can't
tell 1) with Jev's labels hidden. The answers are outside git, in the side-session notes folder.

| Group | Decided | Jev right |
|---|---|---|
| Very confident (0.95 or more) | 5 | 5 |
| Confident (0.8 to 0.95) | 3 | 2 |
| Unsure (below 0.6) | 1 | 1 |
| Rule: hedge or date | 3 | 2 |
| Rule: find report | 3 | 3 |
| Rule: text structure | 2 | 2 |
| Rule: later commentator | 2 | 1 |
| All | 19 | 16 (84%) |

The labels the head trains on (Jev confidence 0.8 or more) were right on 12 of 15, about 80%. The
sample is small, so the true figure is wide: roughly 55% to 93%.

The three misses show two rule problems:

- Luke called a report of Jerome, writing in the 4th and 5th century, data. Earlier he called a
  Chrysostom quotation and a Socrates Scholasticus report (died about AD 440) data, and a Bede
  commentary (8th century) interpretation. The AD 325 line of D-043 and the later-commentator
  rule of D-047 do not fit these three answers. A line near AD 450 would.
- Luke called "may be no more than a coincidence of names" data, which conflicts with the hedge
  rule (a hedge makes interpretation). He made the same kind of call on the Isaiah vineyard
  paragraph. The third miss was a modern scholar quoted by citation (Huffman 2012), which Jev read
  as data.

### D.8.2 — Rerun under the AD 451 rule (D-048)

The Jev labels were redone after Luke set the ancient line at AD 451 (122 of 7,870 paragraphs changed).
The head trains on Jev labels with confidence 0.8 or more (3,572 train paragraphs). The target of each
article is the tier state of its Jev labels. Pooled means 5-fold out of fold over all 270 articles.

| Measure | New head | Old head | Gate (D-046) |
|---|---|---|---|
| Pooled tier kappa | 0.310 [0.17, 0.45] | 0.182 | 0.40 |
| Pooled recall on non-clear_split articles | 0.444 [0.29, 0.61] | 0.278 | 0.50 |
| Human gold (136 paragraphs), out of fold: accuracy / kappa | 0.868 / 0.730 | 0.743 / 0.396 | not set |

The new head does not pass either condition of the gate. On the human gold paragraphs it is much better
than the old head (kappa 0.73 against 0.40), and better than before the AD 451
change (0.65). Paragraph labels are good, but tier states are a function of the whole sequence of
labels, so a few wrong paragraphs move many articles. The tier kappa is also measured against Jev's own
labels, not a human's.

## C — Paragraph-level evaluation harness (Phase 2)

Generated automatically by `calibrate.py` on every run, at the winning bake-off configuration (`scoring_rule=centroid`, `t_data=0.60`, `t_close=0.60`, `t_interp=0.45`, `t_register=0.15`). See `scripts/paragraph_eval.py` for the shared implementation used here and by `scripts/diagnose_register_gate.py` (§B).

### C.1 — Corpus-wide raw label distribution and `neither` rate

Covers all 1301 classified paragraphs across the gold-set articles (no gold alignment required for this slice).

| Label | Count |
|---|---|
| data | 272 |
| close | 165 |
| interpretation | 661 |
| neither | 167 |
| other | 36 |

`neither` rate: **12.8%** (167/1301) vs. human baseline **2.3%** (28/1,219).

### C.2 — Aligned-6 confusion matrix (index-aligned gold paragraphs)

Covers 91 of the 1,219 gold-set-section-classifier.csv paragraph labels (91/1219 = 7.5%) — the only paragraphs where the classifier's own segmentation exactly matches gold's paragraph count (6/36 articles: Gospel of Luke, Gospel of Matthew, Women at the crucifixion, Naked fugitive, Jesus at Herod's court, Arrest of Jesus). The remaining gold labels cannot be index-aligned; see §C.4 for why.

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

Covers all 136 paragraphs in `gold-set-three-tier.csv` (45 articles), classified standalone with no surrounding article context (no alignment needed — the gold file carries the actual paragraph text). This is the only measurement in the codebase that validates the close-analysis (Tier 2) store directly against a human label, since gold-set-section-classifier.csv only distinguishes data/interpretation/neither. Coverage caveat: only 9 of gold-set-three-tier.csv's 45 article titles overlap with the 36-article gold-set-section-classifier.csv, and 130/136 rows are paragraph_index 0-2 (ledes/openings) — this is a different, opening-skewed sample, not a text-bearing subset of the 1,219-label corpus.

Raw (pre-collapse) predicted-label distribution on this slice:

| Label | Count |
|---|---|
| data | 55 |
| close | 20 |
| interpretation | 50 |
| neither | 11 |
| other | 0 |

Collapsed confusion matrix (gold rows x predicted columns):

| Gold \ Pred | data | interpretation | neither |
|---|---|---|---|
| data | 64 | 26 | 7 |
| interpretation | 11 | 24 | 4 |
| neither | 0 | 0 | 0 |

| Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| data | 0.853 | 0.660 | 0.744 | 97 |
| interpretation | 0.480 | 0.615 | 0.539 | 39 |
| neither | 0.000 | 0.000 | 0.000 | 0 |

**Data-vs-interpretation accuracy (restricted to classified paragraphs):** 0.704 (88/125).

`neither` rate on this slice: **8.1%** (11/136).

### C.4 — Why the full 1,219-label corpus can't be measured directly

`gold-set-section-classifier.csv`'s `per_paragraph_labels` column carries labels only, no paragraph text — so there is nothing to text-match against for the articles (33/39 before the 2026-08-04 gold-set cleanup; not recomputed against the current 36-row set — see the counts note near the top of this file) whose classifier-side paragraph count doesn't match gold's (see CLASSIFIER_DIAGNOSIS.md §A.1, VALIDATION_REPORT.md). Re-deriving the original labellers' paragraph segmentation is not reproducible after the fact: `GOLD_SET_LABELLING_PROCEDURE.md` describes labelling against the *visually rendered* Wikipedia page, while the classifier (and this harness) reads the parse-API HTML extract — the two pipelines split paragraphs at different points (e.g. infobox/caption text, collapsed sections) with no recorded mapping between them. `gold-set-three-tier.csv` (§C.3) was checked as a text-matching bridge — it carries `paragraph_text` — but for the 9 article titles it shares with the 36-article gold set, none of its 31 paragraph texts appear verbatim, as a substring, or as a close fuzzy match (difflib, cutoff=0.6) in the corresponding live-fetched paragraphs; Wikipedia article text has drifted since the gold set was labelled and/or the recorded text was paraphrased rather than extracted verbatim. Expanding coverage further requires new data — either re-labelling against the classifier's own parse-API segmentation, or a scripted, versioned re-extraction with a recorded index mapping — not something this harness can produce honestly from the files that exist today. §C.1-C.3 therefore report their own coverage explicitly rather than presenting the aligned/standalone slices as corpus-wide.
## B — Register-gate coverage diagnostic (2026-07-30)

Measures the register gate's paragraph-level cost directly against the 1,219 gold-set paragraph labels (`gold-set-section-classifier.csv`, `per_paragraph_labels`), rather than inferring it from article-level tier accuracy. See `scripts/diagnose_register_gate.py`.

### B.1 — Root cause: threshold coverage, not mislabelled exemplars

At the pre-fix config (`t_register=0.40`), of 1320 body paragraphs across all 36 gold articles, the register gate failed on 28 (2.1%):

- **13** (1.0%) were zeroed by the nearest-neighbour-negative rule (nearest register-store match is a 'negative' exemplar at cosine ≥ 0.75) — this rules out mislabelled/overly-broad negative exemplars as the dominant cause.

- **15** (1.1%) fell below t_register on plain mean-cosine with no strong negative match — this is the dominant failure mode. The register store has only 32 exemplars total (20 positive / 12 negative), the smallest of the four stores (vs 80+ each for data/close/interpretation), so real paragraphs routinely score below a 0.40 bar against a small positive set.

### B.2 — The actual root cause: t_register was never independently calibrated

`calibrate.py`'s `sweep_t_data_interp_from_cache()` silently passed the `t_data` grid value into `evaluate_tiers_from_cache()`'s `t_reg` parameter. `t_register` was therefore never swept on its own axis — every past calibration run's reported `t_register=0.40` was an artefact of `t_data`'s value, not a calibrated result. Fixed 2026-07-30 by giving `t_register` its own grid (`np.arange(0.15, 0.45, 0.05)`, independent of the t_data/t_close/t_interp grid).

### B.3 — Before / after the fix

| Metric | Pre-fix (mean-cosine, t_register=0.40) | Post-fix (centroid, t_register=0.15) |
|---|---|---|
| Corpus-wide `neither` rate (36 articles) | 49.7% | 12.6% |
| Gold `neither` rate (human labellers) | 2.3% (28/1,219) | 2.3% (28/1,219) |
| False `neither` on real data/interp paragraphs (aligned-6 slice) | 28/88 (31.8%) | 11/88 (12.5%) |
| Data-vs-interpretation accuracy on classified paragraphs (aligned-6) | 0.700 (n=60) | 0.662 (n=77) |

**Finding:** the register-gate fix cuts the corpus-wide `neither` rate by roughly 37% of the corpus and lets far more real data/interpretation paragraphs reach classification at all. Data-vs-interpretation accuracy measured on the larger, less cherry-picked post-fix sample (n=77) is 0.662 — the pre-fix accuracy of 0.700 was measured on a smaller sample (n=60) because the over-firing gate had already filtered out the harder paragraphs, inflating the apparent accuracy through survivorship bias. Neither number supports 'the embedding model cannot separate the axis' — both are well above the 50% chance rate for a binary split.

**Open question:** the fixed sweep's grid floor for t_register was 0.15, and the winning configuration landed exactly on that floor — the same floor-pinning pattern seen earlier for t_data/t_interp. Whether an even lower t_register would help further, or whether 0.15 already over-admits low-quality paragraphs, is untested here — flagged as a follow-up for the next calibration pass.
