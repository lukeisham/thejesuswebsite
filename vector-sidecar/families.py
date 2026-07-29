"""Static family registry + classification thresholds for the vector sidecar.

Mirrors setup/Wikipedia algorithm/families/config.py's FAMILY_STORE_MAP
and classifier/config.py's STORE_NAMES/NN_NEGATIVE_THRESHOLD, vendored here
(not imported) for the same reason as embedder.py: setup/ never ships to
the VPS. If the offline family registry changes, mirror the change here too.

Thresholds use the un-calibrated defaults from families/config.py
(t_fire=0.55, t_strong=0.70) rather than reading
vector-family-thresholds.yaml at runtime — that file is a developer-machine
calibration artifact (see its own header comment) and pulling in a YAML
parser dependency for three float constants isn't worth it. If calibration
ever produces meaningfully different values, update the constants below by
hand and note the source gold-set date.
"""

# Public family name -> underlying store name. A public name may reuse
# another family's store (confessional-balance reuses balanced-debate, per
# Wikipedia_alogrithm_refractor.md §3.1.8).
FAMILY_STORE_MAP: dict[str, str] = {
    "data-bucket": "data-bucket",
    "interpretation-bucket": "interpretation-bucket",
    "register": "register",
    "balanced-debate": "balanced-debate",
    "anti-supernatural": "anti-supernatural",
    "ot-nt-discontinuity": "ot-nt-discontinuity",
    "mythicist-framing": "mythicist-framing",
    "jesus-seminar": "jesus-seminar",
    "secular-materialist": "secular-materialist",
    "confessional-balance": "balanced-debate",
    "literary-analysis": "literary-analysis",
    "gnostic-over-emphasis": "gnostic-over-emphasis",
}

# Stores that live directly under vector-stores/ (classifier's three buckets)
# rather than in their own vector-stores/<name>/ subdirectory (the nine
# signal families, per build_stores.py vs. families/export.py's layout).
FLAT_STORES: frozenset[str] = frozenset({"data-bucket", "interpretation-bucket", "register"})

# A query span must clear this similarity threshold for a "fire" to register.
T_FIRE: float = 0.55

# A query span clearing this threshold is a "strong" hit.
T_STRONG: float = 0.70

# Nearest-neighbour-label rule (Wikipedia_alogrithm_refractor.md line 379):
# a negative exemplar only suppresses the verdict when its similarity to the
# query exceeds this threshold — a weak negative match is too distant to
# mean anything.
NN_NEGATIVE_THRESHOLD: float = 0.75
