# Classifier Calibration Record

## Dependency Footprint Measurement

**Measured date:** 2026-07-28

| Component | Size |
|---|---|
| `onnxruntime` | ~75 MB |
| `numpy` | ~34 MB |
| `faiss-cpu` | ~69 MB |
| Vendored model (`model.onnx`) | ~87 MB |
| Vendored vocab (`vocab.txt`) | ~0.2 MB |
| Vector stores (3 × FAISS indexes) | ~0.2 MB |
| **Total** | **~265 MB** |

A later auto-generated measurement (in the "Calibration Results" appendices
below, from `calibrate.py`'s `write_docs()`) reports **~239 MB**
(site-packages: 143 MB + model: 96 MB) instead. The two numbers were taken
with different methodology on different dates (this section itemizes
individual packages by hand; the appendix figure buckets all of
`site-packages/` together and measures `model.onnx` directly), and package
versions and the vendored model file have both changed between the two
measurement dates — so some drift is expected. Treat both as rough,
non-reproducible `du`-style snapshots in the ~235–265 MB range rather than
precise, comparable figures; reconciling them exactly would require a
scripted, versioned measurement, which does not exist yet.

### Framing: dev-machine install budget, not a deployment ceiling

**This footprint is a dev-machine install budget, not a deployment
constraint.** Per `ALGORITHM_GUIDE_the_how.md` §2.1, the VPS runs no Python
and no ML runtime at all — it only imports a pre-computed JSON export
produced by this dev-machine pipeline (`database/scoring-export.json` via
`rank_engine.py`). `classifier/model/model.onnx` is gitignored
(`.gitignore:29`) and is never committed to the repo or shipped to the VPS;
only `vocab.txt` is tracked. Nothing in this table is installed, deployed,
or run in production.

The ~150 MB figure remains a useful **soft target** for keeping the local
dev/calibration environment lean and portable (e.g. for laptop disk space,
CI runners, or onboarding a new contributor), and the actual number should
keep being measured and disclosed honestly here. But because none of this
footprint reaches the VPS, it should not by itself veto a larger embedding
model on capacity-ceiling grounds — that decision should be made on
accuracy/quality trade-offs, not on install size. The model is the largest
single contributor at ~87–96 MB — the HuggingFace Hub direct download
provides a full FP32 ONNX export rather than an int8 quantized version; a
quantized model would be considerably smaller if the dev-machine budget
ever needs tightening.

At ~4–5× reduction from the `sentence-transformers`+`torch` baseline (~1 GB+),
this is still a substantial improvement, independent of the deployment
question above.

---

## Threshold Calibration

### Methodology

Tier-level calibration only — see VALIDATION_REPORT.md for the rationale on
why per-paragraph agreement was not measured.

### Procedure

1. Fetched 33/39 gold-set articles from Wikipedia via the parse API.
2. Swept t_data/t_interp across 0.40–0.65 at t_sep=0.70 (Phase 1).
3. Swept t_sep across 0.50–0.95 at the best t_data/t_interp (Phase 2).
4. Selected the configuration maximizing tier accuracy.

### Phase 1: t_data / t_interp sweep at t_sep=0.70

| t_data=t_interp | Tier accuracy |
|---|---|
| 0.40 | 0.182 (6/33) |
| 0.45 | 0.182 (6/33) |
| 0.50 | 0.182 (6/33) |
| 0.55 | 0.182 (6/33) |
| 0.60 | 0.182 (6/33) |
| 0.65 | 0.182 (6/33) |

t_data/t_interp have negligible effect on tier accuracy within this range.
0.50 was selected as a reasonable midpoint (scores cluster at 0.45–0.65).

### Phase 2: t_sep sweep at t_data=t_interp=0.50

| t_sep | Tier accuracy |
|---|---|
| 0.50 | 0.273 (9/33) |
| 0.55 | 0.273 (9/33) |
| **0.60** | **0.303 (10/33)** |
| 0.65 | 0.242 (8/33) |
| 0.70 | 0.182 (6/33) |
| 0.75 | 0.182 (6/33) |
| 0.80 | 0.121 (4/33) |
| 0.85 | 0.091 (3/33) |
| 0.90 | — |
| 0.95 | — |

Best t_sep = 0.60 with tier accuracy 0.303.

### Final calibrated values

| Parameter | Initial | Calibrated | Tier accuracy | Precision (+10) |
|---|---|---|---|---|
| `t_sep` | 0.70 | **0.60** | 0.303 | — |
| `t_data` | 0.60 | **0.50** | — | — |
| `t_interp` | 0.60 | **0.50** | — | — |

---

## Calibration Results

**Date:** 2026-07-31

### Methodology

Article-tier calibration (below) is the primary acceptance measure — see
CLASSIFIER_DIAGNOSIS.md §C for the standing, automatic paragraph-level
evaluation harness (Phase 2), which reports confusion matrices, per-class
precision/recall/F1, and `neither`-rate against 39 gold-set articles plus
`gold-set-three-tier.csv`, with its coverage limits stated explicitly.
Full corpus-wide (1,219-label) per-paragraph agreement remains unmeasurable
directly — see CLASSIFIER_DIAGNOSIS.md §C.4 for why — so §C's aligned-6 and
three-tier slices are the closest paragraph-level proxies available.

### Configuration

| Setting | Value |
|---|---|
| Scoring rule | centroid |
| Separation mode | adjacency |
| t_register | 0.15 |

### Phase 1: t_data / t_interp sweep (independent 2-D grid)

| t_data | t_interp | Tier accuracy | 95% CI |
|---|---|---|---|
| 0.60 | 0.45 | 0.641 | [0.487, 0.795] |
| 0.60 | 0.45 | 0.641 | [0.487, 0.795] |
| 0.40 | 0.40 | 0.615 | [0.462, 0.769] |
| 0.40 | 0.40 | 0.615 | [0.462, 0.769] |

### Best configuration

| Parameter | Value |
|---|---|
| Scoring rule | centroid |
| Separation mode | adjacency |
| t_data | 0.60 |
| t_close | 0.60 |
| t_interp | 0.45 |
| t_register | 0.15 |
| t_sep | 0.50 |
| Tier accuracy | 0.641 |
| 95% CI | [0.487, 0.795] |
| Articles correct | 25/39 |

### Tier-level stats (by state name)

| Tier | Precision | Recall | F1 |
|---|---|---|---|
| clear_split | 0.667 | 0.880 | 0.759 |
| muddled | 0.500 | 0.231 | 0.316 |
| one_sided | 0.000 | 0.000 | 0.000 |
| unclassifiable | 0.000 | 0.000 | 0.000 |

**Note on `one_sided`/`unclassifiable` showing 0.000/0.000:** this is a
degenerate-class artifact of gold-set size, not a broken code path. The gold
set contains exactly **1** `one_side_only` article(s) and
**0** `unclassifiable` article(s) out of 39
total — essentially unmeasurable classes at this n. (`calibrate.py`'s
`GOLD_TIER_STATE` mapping correctly maps the gold CSV's `"one_side_only"`
string to the internal `"one_sided"` state, so this is not a string-mismatch
bug either — there is simply almost no data to compute precision/recall
against.) Do not chase this as a bug; it will only resolve with gold-set
expansion.

### Acceptance check

| Criterion | Threshold | Actual | 95% CI | Status |
|---|---|---|---|---|
| Tier accuracy | ≥ 0.85 | 0.641 | [0.487, 0.795] | ❌ FAIL |

### Dev-machine install footprint

~239 MB (site-packages: 143 MB + model: 96 MB), measured on this run's dev
machine. This is a **dev-machine install budget, not a deployment
constraint**: the VPS runs no Python and no ML runtime — it only imports a
pre-computed JSON export (`ALGORITHM_GUIDE_the_how.md` §2.1); `model.onnx`
is gitignored and is never committed or shipped. See the "Dependency
Footprint Measurement" section at the top of this document for the fuller
disclosure and the ~150 MB dev-machine target this is measured against.
