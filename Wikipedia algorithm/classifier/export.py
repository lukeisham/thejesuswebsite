"""Export the section classifier's output as a reusable JSON artifact.

bucket-labels.json is the interface between the classifier and downstream
work — Plans 5 (vector signals) and 6 (scoring/export) consume it.

Schema:
{
  "article_id": {
    "paragraphs": ["data", "close", "interpretation", "other", ...],
    "paragraph_texts": ["In the beginning...", "Scholars have long...", ...],
    "separation": 0.85,
    "tier": 10,
    "tier_state": "clear_split",
    "label_source": "llm" | "embedding_fallback",
    "embedding_tier_state": "clear_split" | null,
    "data_count": 5,
    "close_count": 3,
    "interp_count": 7
  },
  ...
}

paragraph_texts is the same length and order as paragraphs — one raw
paragraph text per label. It carries the paragraph content so downstream
consumers (the scoring/ranking engine's placement_mult) can compute
placement-aware multipliers without re-fetching or re-segmenting the article.
For LLM-labelled articles, paragraph_texts is sliced from the fetch cache;
for embedding-classifier articles, it comes from labeler.py's split_paragraphs.

label_source records which source produced the labels: "llm" when
labels-corpus.json provided a valid, hash-verified entry; "embedding_fallback"
when the embedding classifier is the primary source (corpus missing,
article stale, or paragraph-count mismatch).

embedding_tier_state is the tier_state the embedding classifier would have
assigned to this article — kept for cross-check diagnostics even when the
LLM source is active. Null when label_source is "embedding_fallback" (the
main record already carries the embedding state).
"""

import json
import logging
from pathlib import Path
from typing import Optional

from .config import BUCKET_LABELS_PATH
from .labeler import classify_paragraphs, get_labels_only
from .llm_labels import build_llm_bucket_entry, load_llm_corpus
from .scorer import score_article
from .stores import StoreManager
from scripts.llm_label_corpus import load_fetch_cache

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
            paragraph_texts (list[str]),
            separation (float),
            tier (int),
            data_count (int),
            interp_count (int),
            other_count (int),
            neither_count (int),
    """
    labelled = classify_paragraphs(article_text, store_manager)
    labels = get_labels_only(labelled)
    # Paragraph texts come from the classifier's own segmentation so they are
    # always aligned with the label sequence — no separate fetch needed.
    paragraph_texts = [p["text"] for p in labelled]
    scored = score_article(labels)

    return {
        "article_id": article_id,
        "paragraphs": labels,
        "paragraph_texts": paragraph_texts,
        "separation": scored["separation"],
        "tier": scored["tier"],
        "tier_state": scored["tier_state"],
        "data_count": scored["data_count"],
        "close_count": scored["close_count"],
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

    For each article, the embedding classifier is always run (as the
    secondary/cross-check). If a fresh, hash-verified LLM label entry exists
    in labels-corpus.json for the article, it replaces the embedding-derived
    record with label_source: "llm" and preserves the embedding tier_state
    for diagnostics. Otherwise the embedding-derived record is written with
    label_source: "embedding_fallback".

    Args:
        articles: Dict mapping article_id → article_text.
        store_manager: Initialised StoreManager with built stores.
        output_path: Path for the output JSON file. Defaults to config value.

    Returns:
        Path to the written file.
    """
    if output_path is None:
        output_path = BUCKET_LABELS_PATH

    # Load LLM-labelled corpus once before the per-article loop.
    # A missing labels-corpus.json is a clean degradation: every article
    # gets label_source: "embedding_fallback".
    llm_entries = load_llm_corpus()
    fetch_cache = load_fetch_cache() if llm_entries else {}

    llm_count = 0
    fallback_count = 0

    output: dict[str, dict] = {}
    for article_id, text in articles.items():
        try:
            record = export_article(article_id, text, store_manager)
            embedding_tier_state = record["tier_state"]

            # Try the LLM-labelled source first.
            llm_labels = llm_entries.get(article_id)
            if llm_labels is not None and fetch_cache:
                llm_entry = build_llm_bucket_entry(
                    article_id, llm_labels, fetch_cache
                )
                if llm_entry is not None:
                    output[article_id] = {
                        "paragraphs": llm_entry["paragraphs"],
                        "paragraph_texts": llm_entry["paragraph_texts"],
                        "separation": llm_entry["separation"],
                        "tier": llm_entry["tier"],
                        "tier_state": llm_entry["tier_state"],
                        "label_source": "llm",
                        "embedding_tier_state": embedding_tier_state,
                    }
                    llm_count += 1
                    logger.info(
                        "Article '%s' [llm]: tier=%+d, separation=%.3f, %d paragraphs",
                        article_id,
                        llm_entry["tier"],
                        llm_entry["separation"],
                        len(llm_entry["paragraphs"]),
                    )
                    continue

            # Fall back to embedding-classifier record.
            output[article_id] = {
                "paragraphs": record["paragraphs"],
                "paragraph_texts": record["paragraph_texts"],
                "separation": record["separation"],
                "tier": record["tier"],
                "tier_state": record["tier_state"],
                "label_source": "embedding_fallback",
                "embedding_tier_state": None,
            }
            fallback_count += 1
            logger.info(
                "Article '%s' [embedding]: tier=%+d, separation=%.3f, %d paragraphs",
                article_id,
                record["tier"],
                record["separation"],
                len(record["paragraphs"]),
            )
        except (ValueError, KeyError, IndexError, RuntimeError):
            # ValueError/KeyError/IndexError: malformed article data or
            # missing fields; RuntimeError: ONNX/FAISS inference failure.
            # One bad article shouldn't stop the rest of the batch.
            logger.exception("Failed to classify article '%s'; skipping.", article_id)
            fallback_count += 1
            output[article_id] = {
                "paragraphs": [],
                "paragraph_texts": [],
                "separation": 0.0,
                "tier": 0,
                "error": True,
                "label_source": "embedding_fallback",
                "embedding_tier_state": None,
            }

    # Aggregate label-source summary — a silent full-fallback (e.g.
    # labels-corpus.json missing) must never be indistinguishable from
    # a healthy LLM-driven run.
    total = llm_count + fallback_count
    logger.info(
        "Label source summary: %d/%d articles scored via LLM labels, "
        "%d via embedding-classifier fallback.",
        llm_count,
        total,
        fallback_count,
    )

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

        # paragraph_texts is optional (added 2026-07-31 for placement-aware scoring);
        # when present, it must match paragraphs in length.
        paragraph_texts = record.get("paragraph_texts")
        if paragraph_texts is not None:
            if not isinstance(paragraph_texts, list):
                errors.append(f"'{article_id}': 'paragraph_texts' is not a list")
            elif len(paragraph_texts) != len(paragraphs):
                errors.append(
                    f"'{article_id}': 'paragraph_texts' length {len(paragraph_texts)} "
                    f"!= 'paragraphs' length {len(paragraphs)}"
                )

        separation = record.get("separation")
        if not isinstance(separation, (int, float)):
            errors.append(f"'{article_id}': 'separation' is not a number")

        tier = record.get("tier")
        if not isinstance(tier, int):
            errors.append(f"'{article_id}': 'tier' is not an integer")

        # Validate label values.
        valid_labels = {"data", "close", "interpretation", "other", "neither"}
        for i, label in enumerate(paragraphs):
            if label not in valid_labels:
                errors.append(
                    f"'{article_id}': paragraph {i} has invalid label '{label}'"
                )

        # Tier must be one of the defined values (+10, -5, 0).
        if isinstance(tier, int) and tier not in (10, -5, 0):
            errors.append(
                f"'{article_id}': tier {tier} is not a valid row-3 contribution"
            )

    return errors
