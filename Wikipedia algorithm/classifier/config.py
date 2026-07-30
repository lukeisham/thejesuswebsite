"""Threshold constants and configuration for the section classifier.

All thresholds are developer-machine calibration artefacts. They are not
stored in the database — the VPS never runs scoring, so it has no use
for them (§3.4.1).
"""

from pathlib import Path

# ---------------------------------------------------------------------------
# Paths — relative to this file's directory (the classifier package root).
# ---------------------------------------------------------------------------
CLASSIFIER_DIR = Path(__file__).resolve().parent
MODEL_DIR = CLASSIFIER_DIR / "model"
VECTOR_STORES_DIR = CLASSIFIER_DIR.parent / "vector-stores"
EXEMPLARS_DIR = CLASSIFIER_DIR.parent / "exemplars"

# Model files
MODEL_ONNX_PATH = MODEL_DIR / "model.onnx"
VOCAB_PATH = MODEL_DIR / "vocab.txt"

# FAISS store names (one index + one sidecar JSON per store).
# Four stores: data (Tier 1), close-analysis (Tier 2), interpretation (Tier 3),
# and register (class-independent prose-quality gate).
# Decision 1 of CLASSIFIER_ARCHITECTURE_DECISION.md: Tier-2 store is mandatory.
STORE_NAMES = ("data-bucket", "close-analysis", "interpretation-bucket", "register")

# ---------------------------------------------------------------------------
# Embedding / retrieval
# ---------------------------------------------------------------------------

# Maximum sequence length for the MiniLM tokenizer (BERT-base is 512).
# MiniLM-L6-v2 uses 256 by default but can handle up to 512.
MAX_SEQ_LENGTH = 256

# Number of nearest exemplars to retrieve per query span per store.
TOP_K = 5

# Nearest-neighbour-label rule threshold (§3.4.1):
# A negative exemplar only kills the score when its cosine similarity
# to the query exceeds this threshold. Weaker negative matches are
# ignored — they're too distant for the negative signal to be meaningful.
# Calibrated empirically; lower values = stricter, higher = more permissive.
NN_NEGATIVE_THRESHOLD: float = 0.75

# ---------------------------------------------------------------------------
# Paragraph classification thresholds
# ---------------------------------------------------------------------------

# t_data — threshold for the data-bucket similarity score. A paragraph whose
# data-bucket mean cosine exceeds this value is considered to have a data
# signal. Calibrated on the gold set (§11.2). Can be set independently from
# t_interp and t_close; the calibration sweep explores asymmetric thresholds.
t_data: float = 0.60

# t_close — threshold for the close-analysis (Tier 2) similarity score.
# A paragraph whose close-analysis mean cosine exceeds this value is
# considered to have a close-analysis signal. Introduced as part of the
# three-tier architecture (CLASSIFIER_ARCHITECTURE_DECISION.md Decision 1).
t_close: float = 0.60

# t_interp — threshold for the interpretation-bucket similarity score.
# Independent from t_data so that a higher bar can be set for interpretation
# labelling (which the model finds easier) than for data labelling (which
# the model finds harder — see VALIDATION_REPORT.md failure modes).
t_interp: float = 0.45

# t_register — threshold for the register-store score. Applied as a single
# class-independent prose-quality gate: a paragraph must clear this bar to
# be considered class-bearing at all. If the register score is below this
# threshold, the paragraph is labelled 'neither' regardless of its data or
# interpretation scores. This replaces the old double-comparison of one
# score against two class thresholds, which made the 'per-class register
# confirmation' described in the original docstring impossible because both
# gates used the identical condition.
#
# Until 2026-07-30, this value was never independently calibrated — a bug in
# calibrate.py's sweep_t_data_interp_from_cache() silently passed the t_data
# grid value into this slot, so t_register only ever tracked t_data by
# accident. At the un-swept default of 0.40 the gate was rejecting ~50% of
# real body paragraphs as 'neither' against a ~2% human rate (see
# CLASSIFIER_DIAGNOSIS.md §B). The sweep is now independent
# (np.arange(0.15, 0.45, 0.05)); this value is the winner of that sweep and
# sits at the grid's floor, so a lower value might do better still — untested.
t_register: float = 0.15

# ---------------------------------------------------------------------------
# Separation ratio & tier assignment
# ---------------------------------------------------------------------------

# Clean-split threshold: an article whose separation ratio >= t_sep
# is treated as having a clear data/interpretation split.
# Calibrated against the Plan 3 gold set (§3.1.1); default is a placeholder.
t_sep: float = 0.50

# Minimum number of labelled paragraphs (data or interpretation, not other)
# required before tier assignment proceeds. Fewer than N_min → tier 0.
N_min: int = 3

# Separation-mode flag — selects which separation functional to use.
#   "adjacency"  → compute_separation_ratio() (original adjacency-based)
#   "block"      → compute_separation_blocks() (new block-structure)
# The four-way bake-off crosses this flag with the scoring-rule choice.
SEPARATION_MODE: str = "adjacency"

# Row-3 tier contributions (§9 row 3), live reduced-weight values (2026-07-30).
# Source of truth — rank_engine.py and api/scripts/import-wikipedia-scoring.js
# must import from here or mirror these values exactly; see the weight-dial
# rationale in classifer/config.py -> wikipedia-signal-3-diagnostic-report.md.
#
#   +3   both classes present AND separation >= t_sep  (clear split)
#          Rationale: precision 0.667 on the 39-article gold set —
#          the only arm with measurable signal. Held at +3 (not +10) because
#          1/3 of gold clear_split articles are misclassified, so a full
#          +10 weight would inflate roughly one article in three.
#    0   both classes present BUT separation < t_sep   (muddled)
#          Rationale: precision 0.500 / recall 0.231 — the classifier
#          catches only 3 of 13 gold muddled articles and half of its
#          muddled predictions are wrong. A penalty from a coin-flip arm
#          does more harm than good; withheld until precision improves.
#    0   only one class present                        (one-sided — no split to judge)
#    0   unclassifiable (fewer than N_min paragraphs)
#
# The +3 weight is a starting point, not a settled value — it is deliberately
# conservative. Re-run scripts/rank_diff.py before any change.
#
# Note: one-sided and unclassifiable both map to 0, but their distinct
# tier_state strings are preserved in score_article() output for debugging.
TIER_CLEAR: int = 3
TIER_MUDDLED: int = 0
TIER_ONE_SIDED: int = 0
TIER_UNCLASSIFIABLE: int = 0

# ---------------------------------------------------------------------------
# Paragraph labels (controlled vocabulary)
# ---------------------------------------------------------------------------
LABEL_DATA: str = "data"
LABEL_CLOSE_ANALYSIS: str = "close"
LABEL_INTERPRETATION: str = "interpretation"
LABEL_OTHER: str = "other"
LABEL_NEITHER: str = "neither"

# Positional labels — assigned by position, never by the classifier.
# The lede and reference/bibliography list are always "other" (§3.1.1).
POSITIONAL_OTHER_PATTERNS: tuple[str, ...] = (
    "references",
    "notes",
    "footnotes",
    "bibliography",
    "further reading",
    "external links",
    "see also",
)

# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------
BUCKET_LABELS_PATH = CLASSIFIER_DIR.parent / "bucket-labels.json"
