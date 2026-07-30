"""Export the section classifier's output as a reusable JSON artifact.

bucket-labels.json is the interface between the classifier and downstream
work — Plans 5 (vector signals) and 6 (scoring/export) consume it.

Schema:
{
  "article_id": {
    "paragraphs": ["data", "interpretation", "other", ...],
    "separation": 0.85,
    "tier": 10
  },
  ...
}
"""

import json
import logging
from pathlib import Path
from typing import Optional

from .config import BUCKET_LABELS_PATH
from .labeler import classify_paragraphs, get_labels_only
from .scorer import score_article
from .stores import StoreManager

logger = logging.getLogger(__name__)


def export_article(
    article_id: str,
    article_text: str,
    store_manager: StoreManager,
) -> dict:
    """Classify one article and return its bucket-label record.

    Args:
        article_id: Unique identifier for the article (e.g. Wikipedia title).
        article_text: Full article body text.
        store_manager: Initialised StoreManager with built stores.

    Returns:
        Dict with keys:
            article_id (str),
            paragraphs (list[str]),
            separation (float),
            tier (int),
            data_count (int),
            interp_count (int),
            other_count (int),
            neither_count (int),
    """
    labelled = classify_paragraphs(article_text, store_manager)
    labels = get_labels_only(labelled)
    scored = score_article(labels)

    return {
        "article_id": article_id,
        "paragraphs": labels,
        "separation": scored["separation"],
        "tier": scored["tier"],
        "data_count": scored["data_count"],
        "interp_count": scored["interp_count"],
        "other_count": scored["other_count"],
        "neither_count": scored["neither_count"],
    }


def export_batch(
    articles: dict[str, str],
    store_manager: StoreManager,
    output_path: Optional[Path] = None,
) -> Path:
    """Classify a batch of articles and write bucket-labels.json.

    Args:
        articles: Dict mapping article_id → article_text.
        store_manager: Initialised StoreManager with built stores.
        output_path: Path for the output JSON file. Defaults to config value.

    Returns:
        Path to the written file.
    """
    if output_path is None:
        output_path = BUCKET_LABELS_PATH

    output: dict[str, dict] = {}
    for article_id, text in articles.items():
        try:
            record = export_article(article_id, text, store_manager)
            output[article_id] = {
                "paragraphs": record["paragraphs"],
                "separation": record["separation"],
                "tier": record["tier"],
            }
            logger.info(
                "Article '%s': tier=%+d, separation=%.3f, %d paragraphs",
                article_id,
                record["tier"],
                record["separation"],
                len(record["paragraphs"]),
            )
        except Exception:
            logger.exception("Failed to classify article '%s'; skipping.", article_id)
            output[article_id] = {
                "paragraphs": [],
                "separation": 0.0,
                "tier": 0,
                "error": True,
            }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(output, fh, ensure_ascii=False, indent=2)

    logger.info("Exported %d article(s) to %s", len(output), output_path)
    return output_path


def load_bucket_labels(path: Optional[Path] = None) -> dict[str, dict]:
    """Load and parse bucket-labels.json for downstream consumption.

    Args:
        path: Path to the JSON file. Defaults to config value.

    Returns:
        Dict mapping article_id → {paragraphs, separation, tier}.

    Raises:
        FileNotFoundError: If the file does not exist.
        json.JSONDecodeError: If the file is not valid JSON.
    """
    if path is None:
        path = BUCKET_LABELS_PATH

    if not path.exists():
        raise FileNotFoundError(f"Bucket labels file not found: {path}")

    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def validate_bucket_labels(data: dict[str, dict]) -> list[str]:
    """Validate the structure of bucket-labels.json.

    Checks that every article record has the required keys and valid values.

    Args:
        data: Parsed bucket-labels.json content.

    Returns:
        List of validation error messages (empty if valid).
    """
    errors: list[str] = []
    for article_id, record in data.items():
        if not isinstance(record, dict):
            errors.append(f"'{article_id}': record is not a dict")
            continue

        # Required keys.
        for key in ("paragraphs", "separation", "tier"):
            if key not in record:
                errors.append(f"'{article_id}': missing key '{key}'")

        # Validate types.
        paragraphs = record.get("paragraphs", [])
        if not isinstance(paragraphs, list):
            errors.append(f"'{article_id}': 'paragraphs' is not a list")

        separation = record.get("separation")
        if not isinstance(separation, (int, float)):
            errors.append(f"'{article_id}': 'separation' is not a number")

        tier = record.get("tier")
        if not isinstance(tier, int):
            errors.append(f"'{article_id}': 'tier' is not an integer")

        # Validate label values.
        valid_labels = {"data", "interpretation", "other", "neither"}
        for i, label in enumerate(paragraphs):
            if label not in valid_labels:
                errors.append(
                    f"'{article_id}': paragraph {i} has invalid label '{label}'"
                )

        # Tier must be one of the defined values.
        if isinstance(tier, int) and tier not in (10, -3, -5, 0):
            errors.append(
                f"'{article_id}': tier {tier} is not a valid row-3 contribution"
            )

    return errors
