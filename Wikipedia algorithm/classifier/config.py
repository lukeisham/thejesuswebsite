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

# FAISS store names (one index + one sidecar JSON per store)
STORE_NAMES = ("data-bucket", "interpretation-bucket", "register")

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

# A paragraph is labelled "data" when its mean cosine similarity to the
# data-bucket positive exemplars exceeds t_data AND its similarity to the
# register positive exemplars confirms the data register.
# Calibrated on the gold set (§11.2). Start value is a floor, raised by calibration.
t_data: float = 0.50

# A paragraph is labelled "interpretation" when its mean cosine similarity
# to the interpretation-bucket positive exemplars exceeds t_interp AND its
# register similarity confirms the interpretation register.
t_interp: float = 0.50

# ---------------------------------------------------------------------------
# Separation ratio & tier assignment
# ---------------------------------------------------------------------------

# Clean-split threshold: an article whose separation ratio >= t_sep
# is treated as having a clear data/interpretation split.
# Calibrated against the Plan 3 gold set (§3.1.1); default is a placeholder.
t_sep: float = 0.60

# Minimum number of labelled paragraphs (data or interpretation, not other)
# required before tier assignment proceeds. Fewer than N_min → tier 0.
N_min: int = 3

# Row-3 tier contributions (§9 row 3):
#   +10  both classes present AND separation >= t_sep  (clear split)
#   -3   both classes present AND separation < t_sep   (muddled)
#   -5   only one class present                        (one-sided)
#    0   unclassifiable (fewer than N_min paragraphs)
TIER_CLEAR: int = 10
TIER_MUDDLED: int = -3
TIER_ONE_SIDED: int = -5
TIER_UNCLASSIFIABLE: int = 0

# ---------------------------------------------------------------------------
# Paragraph labels (controlled vocabulary)
# ---------------------------------------------------------------------------
LABEL_DATA: str = "data"
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
