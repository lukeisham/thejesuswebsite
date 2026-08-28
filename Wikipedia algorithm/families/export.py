"""Export runner — scores all articles across all nine vector families.

Reads Plan 4's bucket-labels.json (paragraph labels) and outputs
vector-family-scores.json for Plan 6's rank_engine.py to consume.

File-based interface handoff — no live call between this plan and Plan 6.
"""

import json
import logging
import sys
from pathlib import Path
from typing import Optional

# Ensure the parent v2 directory is importable.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from .config import (
    BUCKET_LABELS_PATH,
    SCORES_JSON_PATH,
    THRESHOLDS_YAML_PATH,
    PRECISION_FLOOR,
    t_fire_default,
    t_strong_default,
    PASSION_MARGIN_DEFAULT,
)
from .stores import load_family_store, Embedder
from .registry import FAMILIES, FALLBACK_SIGNAL_KEYS, FAMILY_DISPLAY_NAMES

logger = logging.getLogger(__name__)


def run_family(
    family_name: str,
    article_text: str,
    paragraph_labels: list[str],
    category_flags: dict[str, bool],
    balanced_debate_score: int,
    embedder: Embedder,
    thresholds: dict,
) -> dict:
    """Run a single family against one article.

    Args:
        family_name: The family name.
        article_text: Full article body text.
        paragraph_labels: Per-paragraph labels from Plan 4.
        category_flags: Category flags dict.
        balanced_debate_score: The balanced-debate family's contribution.
        embedder: Shared Embedder instance.
        thresholds: Loaded vector-family-thresholds.yaml.

    Returns:
        Dict with contribution and metadata, or fallback signal key.
    """
    family_thresholds = thresholds.get(family_name, {})
    precision = family_thresholds.get("precision", 0.0)
    t_fire = family_thresholds.get("t_fire", t_fire_default)
    passion_margin = thresholds.get("passion_margin", PASSION_MARGIN_DEFAULT)

    # A vector family only activates its keyword fallback below the calibrated
    # precision floor. The gate is load-bearing: an unconditional fallback
    # reintroduces the false-positive behaviour the vector refactor eliminated.
    if precision < PRECISION_FLOOR:
        logger.warning(
            "Family '%s' precision %.3f < %.2f floor. Using keyword fallback.",
            family_name, precision, PRECISION_FLOOR,
        )
        return {
            "contribution": 0,
            "fallback": True,
            "fallback_signal": FALLBACK_SIGNAL_KEYS.get(family_name, family_name),
        }

    module = FAMILIES.get(family_name)
    if module is None:
        return {"contribution": 0, "error": f"Unknown family: {family_name}"}

    # Load the family's vector store.
    store = load_family_store(family_name, embedder)

    try:
        # Dispatch to the family's score function based on its signature.
        result = _dispatch_family(
            family_name, module, article_text, paragraph_labels,
            category_flags, balanced_debate_score, embedder, store,
            t_fire, passion_margin,
        )
        return result
    except Exception:
        logger.exception("Family '%s' failed for article.", family_name)
        return {"contribution": 0, "error": True}


def _dispatch_family(
    family_name: str,
    module,
    article_text: str,
    paragraph_labels: list[str],
    category_flags: dict[str, bool],
    balanced_debate_score: int,
    embedder,
    store,
    t_fire: float,
    passion_margin: int,
) -> dict:
    """Dispatch to the correct family score function based on family name."""
    import re

    # Families that only need article_text + store.
    simple_families = {"balanced-debate", "ot-nt-discontinuity"}

    # Families that need category_flags + passion_margin.
    scoped_families = {"anti-supernatural", "secular-materialist"}

    # Families that need balanced_debate_score.
    debate_dependent = {"mythicist-framing", "jesus-seminar"}

    if family_name == "balanced-debate":
        # Extract interpretation paragraphs from labels.
        interp_texts = _extract_interpretation_paragraphs(article_text, paragraph_labels)
        return module.score(article_text, interp_texts, embedder, store, t_fire)

    elif family_name == "anti-supernatural":
        return module.score(article_text, category_flags, embedder, store,
                           t_fire, passion_margin)

    elif family_name == "ot-nt-discontinuity":
        return module.score(article_text, embedder, store, t_fire)

    elif family_name == "mythicist-framing":
        return module.score(article_text, paragraph_labels, category_flags,
                           balanced_debate_score, embedder, store, t_fire,
                           passion_margin)

    elif family_name == "jesus-seminar":
        return module.score(article_text, paragraph_labels,
                           balanced_debate_score, embedder, store, t_fire)

    elif family_name == "secular-materialist":
        return module.score(article_text, category_flags, embedder, store,
                           t_fire, passion_margin)

    elif family_name == "confessional-balance":
        return module.score(article_text, paragraph_labels, embedder, store, t_fire)

    elif family_name == "literary-analysis":
        return module.score(article_text, category_flags, embedder, store, t_fire)

    elif family_name == "gnostic-over-emphasis":
        return module.score(article_text, paragraph_labels, category_flags,
                           embedder, store, t_fire, passion_margin)

    else:
        return {"contribution": 0, "error": f"Unknown family: {family_name}"}


def _extract_interpretation_paragraphs(
    article_text: str,
    paragraph_labels: list[str],
) -> list[str]:
    """Extract paragraphs labelled 'interpretation' from article text."""
    import re
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", article_text.strip())
                  if p.strip()]
    if not paragraph_labels or len(paragraph_labels) != len(paragraphs):
        return paragraphs  # Fallback: return all paragraphs.

    return [p for p, lbl in zip(paragraphs, paragraph_labels)
            if lbl == "interpretation"]


def export_batch(
    articles: dict[str, dict],
    output_path: Optional[Path] = None,
    thresholds_path: Optional[Path] = None,
) -> Path:
    """Score all articles across all families and write vector-family-scores.json.

    Args:
        articles: Dict mapping article_id → {
            text: str, labels: list[str], flags: dict[str, bool]
        }
        output_path: Output JSON path. Defaults to config.
        thresholds_path: Path to vector-family-thresholds.yaml.

    Returns:
        Path to the written file.
    """
    if output_path is None:
        output_path = SCORES_JSON_PATH
    if thresholds_path is None:
        thresholds_path = THRESHOLDS_YAML_PATH

    # Load thresholds.
    thresholds = _load_thresholds(thresholds_path)

    # Surface, once and loudly, how many families are currently dormant
    # (precision below PRECISION_FLOOR, silently falling back to their
    # keyword detector per-family below) — this used to be indistinguishable
    # from "everything is calibrated and simply not firing" (Issues.md #156).
    dormant = [
        name for name in FAMILIES
        if thresholds.get(name, {}).get("precision", 0.0) < PRECISION_FLOOR
    ]
    if dormant:
        logger.warning(
            "%d/%d vector families are BELOW the %.2f precision floor and "
            "will score via keyword fallback, not the vector store: %s",
            len(dormant), len(FAMILIES), PRECISION_FLOOR, ", ".join(sorted(dormant)),
        )

    # Initialise embedder (shared across all families).
    logger.info("Loading MiniLM ONNX model...")
    embedder = Embedder()

    output: dict[str, dict] = {}
    total_articles = len(articles)

    for idx, (article_id, article_data) in enumerate(articles.items(), 1):
        text = article_data.get("text", "")
        labels = article_data.get("labels", [])
        flags = article_data.get("flags", {})

        logger.info("[%d/%d] Scoring '%s'...", idx, total_articles, article_id)

        article_scores: dict[str, int] = {}
        balanced_debate_score = 0

        # Score families.
        for family_name in FAMILIES:
            try:
                result = run_family(
                    family_name, text, labels, flags,
                    balanced_debate_score, embedder, thresholds,
                )
                contribution = result.get("contribution", 0)

                # Don't store fallback markers in the output — the keyword
                # detector value from Plan 2 is substituted at the Plan 6 level.
                if not result.get("fallback"):
                    article_scores[family_name] = contribution

                # Track balanced-debate score for imbalance surcharge.
                if family_name == "balanced-debate":
                    balanced_debate_score = contribution

            except Exception:
                logger.exception(
                    "Failed to score family '%s' for article '%s'.",
                    family_name, article_id,
                )
                article_scores[family_name] = 0

        output[article_id] = article_scores

    # Write output.
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(output, fh, ensure_ascii=False, indent=2)

    logger.info("Exported %d article(s) to %s", len(output), output_path)
    if dormant:
        logger.warning(
            "Reminder: %d/%d vector families were dormant this run (see "
            "above) — Signal scores for those families came from keyword "
            "fallback, not the vector store.",
            len(dormant), len(FAMILIES),
        )
    return output_path


def _load_thresholds(path: Path) -> dict:
    """Load vector-family-thresholds.yaml, with a default fallback."""
    if not path.exists():
        logger.warning("Thresholds file not found: %s. Using defaults.", path)
        return {}

    try:
        import yaml
        with open(path, "r", encoding="utf-8") as fh:
            return yaml.safe_load(fh) or {}
    except ImportError:
        logger.warning("PyYAML not installed. Using default thresholds.")
        return {}
    except Exception:
        logger.exception("Failed to load thresholds from %s.", path)
        return {}
