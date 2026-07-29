"""Shared configuration for the vector signal families.

Extends Plan 4's classifier config with family-specific paths, thresholds,
and the family registry. All constants are developer-machine calibration
artefacts — they are not stored in the database.
"""

from pathlib import Path

# ---------------------------------------------------------------------------
# Paths — relative to this file's directory (the families package root).
# ---------------------------------------------------------------------------
FAMILIES_DIR = Path(__file__).resolve().parent
COMBINATION_DIR = FAMILIES_DIR / "combination_functions"
V2_DIR = FAMILIES_DIR.parent  # setup/Wikipedia algorithm v2/
VECTOR_STORES_DIR = V2_DIR / "vector-stores"
EXEMPLARS_DIR = V2_DIR / "exemplars"
SCRIPTS_DIR = V2_DIR / "scripts"
BUCKET_LABELS_PATH = V2_DIR / "bucket-labels.json"
GOLD_SET_PATH = V2_DIR / "gold-set-vector-families.csv"

# Plan 4's classifier config for shared model paths and embedding constants.
CLASSIFIER_DIR = V2_DIR / "classifier"
MODEL_DIR = CLASSIFIER_DIR / "model"
MODEL_ONNX_PATH = MODEL_DIR / "model.onnx"
VOCAB_PATH = MODEL_DIR / "vocab.txt"

# Output artifacts.
THRESHOLDS_YAML_PATH = V2_DIR / "vector-family-thresholds.yaml"
SCORES_JSON_PATH = V2_DIR / "vector-family-scores.json"

# ---------------------------------------------------------------------------
# Family store names (8 distinct stores; confessional-balance reuses balanced-debate).
# ---------------------------------------------------------------------------
FAMILY_STORE_NAMES: tuple[str, ...] = (
    "balanced-debate",
    "anti-supernatural",
    "ot-nt-discontinuity",
    "mythicist-framing",
    "jesus-seminar",
    "secular-materialist",
    "literary-analysis",
    "gnostic-over-emphasis",
)

# Confessional-balance reuses the balanced-debate store by design (§3.1.8).
FAMILY_STORE_MAP: dict[str, str] = {
    "balanced-debate": "balanced-debate",
    "anti-supernatural": "anti-supernatural",
    "ot-nt-discontinuity": "ot-nt-discontinuity",
    "mythicist-framing": "mythicist-framing",
    "jesus-seminar": "jesus-seminar",
    "secular-materialist": "secular-materialist",
    "confessional-balance": "balanced-debate",  # Reuses balanced-debate's store.
    "literary-analysis": "literary-analysis",
    "gnostic-over-emphasis": "gnostic-over-emphasis",
}

# ---------------------------------------------------------------------------
# Embedding / retrieval (shared with Plan 4's classifier).
# ---------------------------------------------------------------------------
MAX_SEQ_LENGTH: int = 256
TOP_K: int = 5
NN_NEGATIVE_THRESHOLD: float = 0.75

# ---------------------------------------------------------------------------
# Default thresholds (overridden by calibration — vector-family-thresholds.yaml).
# ---------------------------------------------------------------------------

# A query span must clear this similarity threshold for a "fire" to register.
t_fire_default: float = 0.55

# A query span clearing this threshold is a "strong" hit (may ×2 weight).
t_strong_default: float = 0.70

# Attribution verb asymmetry threshold (Dimensions 1, 2).
t_asym_default: float = 0.60

# Minimum calibrated precision for a family to ship (precision floor, §11.4).
PRECISION_FLOOR: float = 0.80

# Minimum number of class-bearing paragraphs for classification.
N_min: int = 3

# ---------------------------------------------------------------------------
# Combination function caps and weights.
# ---------------------------------------------------------------------------

# Balanced-debate: max ±6, doubled to ±12 with 2+ named representatives.
BALANCED_DEBATE_CAP: int = 6
BALANCED_DEBATE_REPRESENTATIVE_BONUS: int = 2

# Anti-supernatural: max −8 (2 dimensions × 4 points each).
ANTI_SUPERNATURAL_MAX: int = -8

# OT-NT-discontinuity: max −6 (3 dimensions × 2 points).
OT_NT_DISCONTINUITY_MAX: int = -6

# Mythicist-framing: max −16 (named author hits × placement × imbalance).
MYTHICIST_CAP_PER_AUTHOR: int = 7
MYTHICIST_MAX: int = -16

# Jesus-Seminar: max −14 (lighter cap than mythicist).
JESUS_SEMINAR_CAP_PER_AUTHOR: int = 3
JESUS_SEMINAR_TOTAL_CAP: int = 6
JESUS_SEMINAR_MAX: int = -14

# Secular-materialist: max −8.
SECULAR_MAX: int = -8

# Confessional-balance weights.
CONFESSIONAL_OUTSIDE_INTERP: int = -3
CONFESSIONAL_INSIDE_NO_CONTRAST: int = -1
CONFESSIONAL_INSIDE_WITH_CONTRAST: int = 0

# Literary-analysis tiers by category.
LITERARY_TIER_PARABLE: int = 6
LITERARY_TIER_OTHER: int = 4
LITERARY_TIER_NONE: int = 0

# Gnostic-over-emphasis max.
GNOSTIC_CONTEXTUALISED: int = -2
GNOSTIC_PRIVILEGED: int = -4
GNOSTIC_MAX: int = -4

# Imbalance surcharge applied when balanced-debate = 0.
IMBALANCE_SURCHARGE: int = -2

# Placement multipliers (§3.1.1: ×2 for data/lede/refs, ×0.5 for interp-only).
PLACEMENT_DATA_MULTIPLIER: float = 2.0
PLACEMENT_INTERP_MULTIPLIER: float = 0.5

# Passion margin (applied to rows 15, 16, 21, 22, 23 per §3.9).
PASSION_MARGIN_DEFAULT: int = 0

# ---------------------------------------------------------------------------
# Fixed name lists (not vector-based — pure keyword matching).
# ---------------------------------------------------------------------------

MYTHICIST_NAMES: tuple[str, ...] = (
    "carrier", "price", "doherty",
)

JESUS_SEMINAR_NAMES: tuple[str, ...] = (
    "funk", "crossan", "borg",
)

CRITICAL_SCHOLAR_NAMES: tuple[str, ...] = (
    "ehrman", "lüdemann", "ludemann", "pagels", "fredriksen",
    "casey", "vermes", "mack",
)

EVANGELICAL_NAMES: tuple[str, ...] = (
    "wright", "bauckham", "blomberg", "keener", "witherington",
    "carson", "bock",
)

# Category flags used for tiered scoring.
PARABLE_CATEGORIES: tuple[str, ...] = ("is_parable", "is_teaching", "is_bible_book")
MIRACLE_CATEGORIES: tuple[str, ...] = ("is_miracle",)
PASSION_CATEGORIES: tuple[str, ...] = ("is_passion",)
