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

### Ceiling assessment

~265 MB exceeds the ~150 MB target and ~200 MB hard ceiling. The model is the
largest single contributor at ~87 MB — the HuggingFace Hub direct download
provides a full FP32 ONNX export rather than an int8 quantized version. A
quantized model would be ~23 MB, bringing the total to ~201 MB.

Per the plan: *"document the actual number plainly in CLASSIFIER_CALIBRATION.md
as a disclosed, human-acknowledged ceiling exceedance."* This is disclosed here.
At ~4–5× reduction from the `sentence-transformers`+`torch` baseline (~1 GB+),
this is still a substantial improvement.

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
