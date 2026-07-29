"""Paragraph classification logic for the section classifier.

Labels every body paragraph as data, interpretation, neither, or other
(positional). Runs the three-store query, applies the nearest-neighbour-label
rule, and assigns final labels.
"""

import logging
import re
from typing import Optional

from .config import (
    t_data,
    t_interp,
    TOP_K,
    LABEL_DATA,
    LABEL_INTERPRETATION,
    LABEL_OTHER,
    LABEL_NEITHER,
    POSITIONAL_OTHER_PATTERNS,
    NN_NEGATIVE_THRESHOLD,
)
from .stores import StoreManager

logger = logging.getLogger(__name__)


def split_paragraphs(article_text: str) -> list[dict[str, str | int]]:
    """Split article text into paragraphs with positional metadata.

    Splits on double-newline boundaries (the standard Wikipedia paragraph
    separator after text extraction).

    Args:
        article_text: Full article body text.

    Returns:
        List of dicts, each with:
            text (str): The paragraph text.
            index (int): 0-based index in the article.
            is_lede (bool): True for the first paragraph.
    """
    if not article_text or not article_text.strip():
        return []

    # Split on blank lines (one or more empty lines between paragraphs).
    raw_paragraphs = re.split(r"\n\s*\n", article_text.strip())
    paragraphs: list[dict[str, str | int]] = []
    for i, para in enumerate(raw_paragraphs):
        text = para.strip()
        if not text:
            continue
        paragraphs.append({
            "text": text,
            "index": i,
            "is_lede": (i == 0),
        })
    return paragraphs


def _is_reference_heading(paragraph_text: str) -> bool:
    """Check whether a paragraph starts with a known reference-section heading.

    Only matches heading-like patterns (short first line matching a known
    reference heading). Body paragraphs containing years, URLs, or citations
    do NOT trigger this function — it is only for detecting the boundary
    where the article switches from body to references.

    Args:
        paragraph_text: The paragraph text.

    Returns:
        True if the paragraph starts with a reference heading.
    """
    text_lower = paragraph_text.lower().strip()
    first_line = text_lower.split("\n")[0].strip().rstrip(".:")

    # Must be a short heading-like line (5 words or fewer) to avoid
    # false positives from body paragraphs.
    if len(first_line.split()) > 5:
        return False

    for pattern in POSITIONAL_OTHER_PATTERNS:
        if first_line == pattern or first_line.startswith(pattern):
            return True

    return False


def _is_reference_section(paragraph_text: str) -> bool:
    """Check whether a paragraph is reference-list content (not a heading).

    Used for paragraphs AFTER the reference section has already been
    detected via _is_reference_heading. Requires at least 3 citation-like
    lines to avoid false positives from body paragraphs.

    Args:
        paragraph_text: The paragraph text.

    Returns:
        True if this looks like reference-list content.
    """
    text_lower = paragraph_text.lower().strip()
    lines = text_lower.split("\n")

    citation_lines = 0
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Heuristic: citation lines are short (< 300 chars) and contain
        # author-year patterns, URLs, DOIs, or ISBNs.
        if len(line) < 300 and (
            re.search(r"\b\d{4}\b", line)
            or "http" in line
            or "doi" in line
            or "isbn" in line
            or re.search(r"^[\^↑]\s", line)
        ):
            citation_lines += 1

    # Require at least 3 citation-like lines AND > 50% of non-empty lines.
    non_empty = [l for l in lines if l.strip()]
    if len(non_empty) >= 3 and citation_lines >= 3:
        if citation_lines / len(non_empty) > 0.5:
            return True

    return False


def _apply_nearest_neighbour_rule(results: list[dict]) -> float:
    """Compute the similarity score for one store's query results.

    Nearest-neighbour-label rule (§3.4.1), with a similarity threshold:
    - If the nearest neighbour is a negative exemplar AND its similarity
      exceeds NN_NEGATIVE_THRESHOLD, score = 0 (the match is too strong
      to ignore).
    - Otherwise, score = mean cosine of positive exemplars in the top-k.

    The threshold prevents weak negative matches from killing the score —
    a negative exemplar that only loosely matches the query is not a
    meaningful negative signal.

    Args:
        results: List of exemplar result dicts from VectorStore.search(),
                 each with at least 'type' and 'similarity'.

    Returns:
        Similarity score in [0, 1].
    """
    if not results:
        return 0.0

    # Nearest-neighbour check with threshold.
    nearest = results[0]
    if (nearest.get("type") == "negative"
            and nearest.get("similarity", 0) >= NN_NEGATIVE_THRESHOLD):
        return 0.0

    # Mean cosine of positive exemplars in top-k.
    positives = [r["similarity"] for r in results if r.get("type") == "positive"]
    if not positives:
        return 0.0

    return sum(positives) / len(positives)


def classify_paragraphs(
    article_text: str,
    store_manager: StoreManager,
    top_k: int = TOP_K,
) -> list[dict]:
    """Label every body paragraph in an article.

    Workflow:
    1. Split article into paragraphs.
    2. Embed and query all three stores per paragraph.
    3. Apply nearest-neighbour-label rule per store.
    4. Assign label: data, interpretation, neither, or other (positional).

    Args:
        article_text: Full article body text.
        store_manager: Initialised StoreManager with built stores.
        top_k: Number of nearest exemplars to retrieve per store per paragraph.

    Returns:
        List of dicts, one per paragraph, with keys:
            text (str), index (int), is_lede (bool),
            label (str), scores (dict[str, float]), is_positional (bool)
    """
    paragraphs = split_paragraphs(article_text)
    if not paragraphs:
        return []

    # Extract text for batch embedding.
    texts = [p["text"] for p in paragraphs]

    # Batch-query all stores.
    batch_results = store_manager.query_all_batch(texts, k=top_k)

    labelled: list[dict] = []
    seen_reference_start = False

    for para, results in zip(paragraphs, batch_results):
        label_data = dict(para)  # copy positional metadata
        label_data["scores"] = {}
        label_data["is_positional"] = False

        # Compute similarity scores per store using the NN-label rule.
        data_score = _apply_nearest_neighbour_rule(results.get("data-bucket", []))
        interp_score = _apply_nearest_neighbour_rule(
            results.get("interpretation-bucket", [])
        )
        register_score = _apply_nearest_neighbour_rule(results.get("register", []))
        label_data["scores"] = {
            "data": data_score,
            "interpretation": interp_score,
            "register": register_score,
        }

        para_text = para["text"]

        # --- Positional rules (§3.1.1) ---

        # Lede is always 'other'.
        if para["is_lede"]:
            label_data["label"] = LABEL_OTHER
            label_data["is_positional"] = True
            labelled.append(label_data)
            continue

        # Reference / bibliography section boundary detection.
        # A heading-like paragraph (short, matching known patterns)
        # triggers the reference section. Once triggered, all subsequent
        # paragraphs are 'other'.
        if not seen_reference_start and _is_reference_heading(para_text):
            seen_reference_start = True

        if seen_reference_start:
            label_data["label"] = LABEL_OTHER
            label_data["is_positional"] = True
            labelled.append(label_data)
            continue

        # --- Semantic classification ---

        # A paragraph needs strong semantic match AND register match.
        # The register store now has BOTH data-register and interpretation-register
        # positive exemplars, so a clear passage of either type can pass.
        is_data = data_score >= t_data and register_score >= t_data
        is_interp = interp_score >= t_interp and register_score >= t_interp

        if is_data and not is_interp:
            label = LABEL_DATA
        elif is_interp and not is_data:
            label = LABEL_INTERPRETATION
        elif is_data and is_interp:
            # Both thresholds met — assign by the stronger score.
            label = LABEL_DATA if data_score >= interp_score else LABEL_INTERPRETATION
        else:
            label = LABEL_NEITHER

        label_data["label"] = label
        labelled.append(label_data)

    return labelled


def get_labels_only(labelled_paragraphs: list[dict]) -> list[str]:
    """Extract just the label sequence from a labelled-paragraph list.

    Args:
        labelled_paragraphs: Output from classify_paragraphs().

    Returns:
        List of label strings (one per paragraph).
    """
    return [p["label"] for p in labelled_paragraphs]


def get_body_labels(labelled_paragraphs: list[dict]) -> list[str]:
    """Extract labels for body paragraphs only (excluding positional 'other').

    Args:
        labelled_paragraphs: Output from classify_paragraphs().

    Returns:
        List of label strings for non-positional paragraphs.
    """
    return [p["label"] for p in labelled_paragraphs if not p.get("is_positional")]
