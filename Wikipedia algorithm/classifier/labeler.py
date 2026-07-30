"""Paragraph classification logic for the section classifier.

Labels every body paragraph as data, interpretation, neither, or other
(positional). Runs the three-store query, applies the nearest-neighbour-label
rule, and assigns final labels.

Scoring rules:
  - mean-cosine (original): Threshold the mean cosine of positive exemplars.
  - centroid (new, numpy-only): Classify by cosine distance to the centroid
    of each class's positive exemplar embeddings, using the embeddings already
    produced by the stores. No new dependency — operates on the embedding
    vectors already returned by StoreManager.query_all_batch().
"""

import logging
import re
from typing import Optional

import numpy as np

from .config import (
    t_data,
    t_close,
    t_interp,
    t_register,
    TOP_K,
    LABEL_DATA,
    LABEL_CLOSE_ANALYSIS,
    LABEL_INTERPRETATION,
    LABEL_OTHER,
    LABEL_NEITHER,
    POSITIONAL_OTHER_PATTERNS,
    NN_NEGATIVE_THRESHOLD,
)

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


def _centroid_score(
    query_embedding: np.ndarray,
    results: list[dict],
) -> float:
    """Compute the centroid-based similarity score for one store's results.

    Instead of thresholding mean cosine against positive exemplars, this
    measures cosine similarity between the query embedding and the centroid
    (mean vector) of the positive exemplar embeddings in the store's top-k
    results. Negative exemplars are excluded from the centroid.

    This is a numpy-only decision rule — no new dependency. It operates on
    the same embeddings already produced by StoreManager.query_all_batch().

    If the nearest neighbour is a negative exemplar whose similarity exceeds
    NN_NEGATIVE_THRESHOLD, score = 0 (same gate as the mean-cosine rule).

    Args:
        query_embedding: The query paragraph's embedding vector.
        results: List of exemplar result dicts, each with at least 'type',
                 'similarity', and 'embedding'.

    Returns:
        Centroid similarity score in [0, 1]. Returns 0.0 if there are no
        positive exemplar embeddings in the results.
    """
    if not results:
        return 0.0

    # Same negative-neighbour gate as the mean-cosine rule.
    nearest = results[0]
    if (nearest.get("type") == "negative"
            and nearest.get("similarity", 0) >= NN_NEGATIVE_THRESHOLD):
        return 0.0

    # Collect positive exemplar embeddings.
    pos_embeddings = []
    for r in results:
        if r.get("type") == "positive" and r.get("embedding") is not None:
            emb = r["embedding"]
            if isinstance(emb, np.ndarray) and emb.size > 0:
                pos_embeddings.append(emb)

    if not pos_embeddings:
        return 0.0

    # Centroid = mean of positive exemplar embeddings.
    centroid = np.mean(pos_embeddings, axis=0)

    # Cosine similarity between query embedding and centroid.
    query_norm = np.linalg.norm(query_embedding)
    centroid_norm = np.linalg.norm(centroid)

    if query_norm == 0 or centroid_norm == 0:
        return 0.0

    cosine = float(np.dot(query_embedding, centroid) / (query_norm * centroid_norm))
    # Clamp to [0, 1] — cosine can be negative for orthogonal vectors but
    # we clamp to 0 as a lower bound since negative similarity is not
    # meaningful in this classifier context.
    return max(0.0, min(1.0, cosine))


def _label_paragraph(
    data_score: float,
    close_score: float,
    interp_score: float,
    register_score: float,
    t_data_threshold: float = 0.50,
    t_close_threshold: float = 0.50,
    t_interp_threshold: float = 0.50,
    t_register_threshold: float = 0.50,
    scoring_rule: str = "mean-cosine",
    query_embedding: Optional[np.ndarray] = None,
    data_results: Optional[list[dict]] = None,
    close_results: Optional[list[dict]] = None,
    interp_results: Optional[list[dict]] = None,
    register_results: Optional[list[dict]] = None,
) -> str:
    """Assign a label to one paragraph given its four-store scores.

    The register score is applied as a single class-independent prose-quality
    gate: a paragraph must clear t_register to be considered class-bearing
    at all. If the register score is below this threshold, the paragraph is
    'neither' regardless of its other scores.

    Three-tier classification (§3.1.1, Signal 3 activation plan):
      - data (Tier 1): factual reporting, citation, description
      - close (Tier 2): close analysis — synoptic comparison, Greek/Hebrew
        analysis, text-critical evaluation, form-critical categorisation
      - interpretation (Tier 3): historical Jesus reconstruction,
        redaction-critical conclusions, theological interpretation

    Args:
        data_score: Score from the data bucket.
        close_score: Score from the close-analysis store.
        interp_score: Score from the interpretation bucket.
        register_score: Score from the register store.
        t_data_threshold: Data-bucket threshold (default 0.50).
        t_close_threshold: Close-analysis threshold (default 0.50).
        t_interp_threshold: Interpretation-bucket threshold (default 0.50).
        t_register_threshold: Register gate threshold (default 0.50).
        scoring_rule: "mean-cosine" or "centroid".
        query_embedding: Query embedding (for centroid rule).
        data_results: Raw results from data-bucket (for centroid).
        close_results: Raw results from close-analysis store (for centroid).
        interp_results: Raw results from interp-bucket (for centroid).
        register_results: Raw results from register store (for centroid).

    Returns:
        One of LABEL_DATA, LABEL_CLOSE_ANALYSIS, LABEL_INTERPRETATION,
        or LABEL_NEITHER.
    """
    if register_score < t_register_threshold:
        return LABEL_NEITHER

    is_data = data_score >= t_data_threshold
    is_close = close_score >= t_close_threshold
    is_interp = interp_score >= t_interp_threshold

    # Collect all classes whose threshold is met.
    met: list[tuple[str, float]] = []
    if is_data:
        met.append((LABEL_DATA, data_score))
    if is_close:
        met.append((LABEL_CLOSE_ANALYSIS, close_score))
    if is_interp:
        met.append((LABEL_INTERPRETATION, interp_score))

    if not met:
        return LABEL_NEITHER

    if len(met) == 1:
        return met[0][0]

    # Multiple thresholds met — highest score wins.
    met.sort(key=lambda x: x[1], reverse=True)
    return met[0][0]


def classify_paragraphs(
    article_text: str,
    store_manager,
    top_k: int = TOP_K,
    scoring_rule: str = "mean-cosine",
) -> list[dict]:
    """Label every body paragraph in an article.

    Workflow:
    1. Split article into paragraphs.
    2. Embed and query all four stores per paragraph.
    3. Apply the selected scoring rule per store.
    4. Assign label: data (Tier 1), close (Tier 2), interpretation (Tier 3),
       neither, or other (positional).

    Args:
        article_text: Full article body text.
        store_manager: Initialised StoreManager with built stores.
        top_k: Number of nearest exemplars to retrieve per store per paragraph.
        scoring_rule: "mean-cosine" (original) or "centroid" (numpy-only
            centroid decision rule).

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

    # Batch-query all stores; get embeddings when using centroid rule.
    include_embeddings = (scoring_rule == "centroid")
    batch_results = store_manager.query_all_batch(texts, k=top_k,
                                                   include_embeddings=include_embeddings)

    labelled: list[dict] = []
    seen_reference_start = False

    for para, results in zip(paragraphs, batch_results):
        label_data = dict(para)  # copy positional metadata
        label_data["scores"] = {}
        label_data["is_positional"] = False

        # Compute similarity scores per store.
        if scoring_rule == "centroid":
            query_emb = results.get("_query_embedding")
            data_score = _centroid_score(
                query_emb, results.get("data-bucket", [])
            ) if query_emb is not None else 0.0
            close_score = _centroid_score(
                query_emb, results.get("close-analysis", [])
            ) if query_emb is not None else 0.0
            interp_score = _centroid_score(
                query_emb, results.get("interpretation-bucket", [])
            ) if query_emb is not None else 0.0
            register_score = _centroid_score(
                query_emb, results.get("register", [])
            ) if query_emb is not None else 0.0
        else:
            data_score = _apply_nearest_neighbour_rule(
                results.get("data-bucket", [])
            )
            close_score = _apply_nearest_neighbour_rule(
                results.get("close-analysis", [])
            )
            interp_score = _apply_nearest_neighbour_rule(
                results.get("interpretation-bucket", [])
            )
            register_score = _apply_nearest_neighbour_rule(
                results.get("register", [])
            )

        label_data["scores"] = {
            "data": data_score,
            "close": close_score,
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
        label_data["label"] = _label_paragraph(
            data_score, close_score, interp_score, register_score,
            t_data_threshold=t_data,
            t_close_threshold=t_close,
            t_interp_threshold=t_interp,
            t_register_threshold=t_register,
            scoring_rule=scoring_rule,
        )
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
