"""Similarity-to-contribution mapper for vector signal families.

Implements the §3.4.1 nearest-neighbour-label rule:
  - Retrieve top-k=5 nearest exemplars.
  - If the nearest neighbour is a negative exemplar → score = 0 regardless of cosine.
  - Otherwise → score = mean cosine of positive exemplars in the top-k.
  - Apply t_fire / t_strong thresholds.
  - Deduplicate by matched exemplar (Shape A).
"""

import logging
from typing import Optional

import numpy as np

from .config import TOP_K, NN_NEGATIVE_THRESHOLD, t_fire_default, t_strong_default
from .stores import VectorStore

logger = logging.getLogger(__name__)


def nearest_neighbour_score(results: list[dict]) -> float:
    """Apply the nearest-neighbour-label rule to one store's query results.

    Args:
        results: List of exemplar result dicts from VectorStore.search(),
                 each with at least 'type' and 'similarity'.

    Returns:
        Similarity score in [0, 1].
    """
    if not results:
        return 0.0

    nearest = results[0]
    if (nearest.get("type") == "negative"
            and nearest.get("similarity", 0) >= NN_NEGATIVE_THRESHOLD):
        return 0.0

    positives = [r["similarity"] for r in results if r.get("type") == "positive"]
    if not positives:
        return 0.0

    return float(np.mean(positives))


def query_store(
    text: str,
    store: VectorStore,
    embedder,
    k: int = TOP_K,
) -> list[dict]:
    """Embed a text and query a vector store.

    Args:
        text: The text span to query.
        store: A built VectorStore.
        embedder: Shared Embedder instance.
        k: Number of nearest neighbours to retrieve.

    Returns:
        List of exemplar result dicts, sorted by similarity descending.
    """
    if store is None or not store.is_built:
        return []

    vec = embedder.embed(text)
    return store.search(vec, k)


def score_span(
    text: str,
    store: VectorStore,
    embedder,
    k: int = TOP_K,
    t_fire: float = t_fire_default,
    t_strong: float = t_strong_default,
) -> dict:
    """Score a single text span against a family store.

    Returns a dict with:
        score (float): Raw similarity score after NN-label rule.
        fires (bool): Whether score >= t_fire.
        is_strong (bool): Whether score >= t_strong.
        matched_exemplar_id (str|None): ID of the nearest positive exemplar.
    """
    results = query_store(text, store, embedder, k)
    score = nearest_neighbour_score(results)

    matched_id: Optional[str] = None
    for r in results:
        if r.get("type") == "positive":
            matched_id = r.get("id")
            break

    return {
        "score": round(score, 4),
        "fires": score >= t_fire,
        "is_strong": score >= t_strong,
        "matched_exemplar_id": matched_id,
    }


def score_spans(
    texts: list[str],
    store: VectorStore,
    embedder,
    k: int = TOP_K,
    t_fire: float = t_fire_default,
    t_strong: float = t_strong_default,
) -> list[dict]:
    """Score multiple text spans against a family store.

    Args:
        texts: List of text spans to score.
        store: A built VectorStore.
        embedder: Shared Embedder instance.
        k: Number of nearest neighbours per query.
        t_fire: Fire threshold.
        t_strong: Strong-hit threshold.

    Returns:
        List of score dicts, one per input text.
    """
    return [score_span(t, store, embedder, k, t_fire, t_strong) for t in texts]


def count_distinct_fires(
    scored_spans: list[dict],
    deduplicate_by_exemplar: bool = True,
) -> int:
    """Count the number of distinct firing spans (Shape A).

    Args:
        scored_spans: List of score dicts from score_spans().
        deduplicate_by_exemplar: If True, only count one fire per unique
                                exemplar ID (prevents one exemplar from
                                generating multiple hits).

    Returns:
        Number of distinct fires.
    """
    if not scored_spans:
        return 0

    if not deduplicate_by_exemplar:
        return sum(1 for s in scored_spans if s["fires"])

    seen_exemplars: set[str] = set()
    count = 0
    for s in scored_spans:
        if not s["fires"]:
            continue
        exemplar_id = s.get("matched_exemplar_id")
        if exemplar_id is None:
            count += 1  # Fires but no exemplar matched — count once.
        elif exemplar_id not in seen_exemplars:
            seen_exemplars.add(exemplar_id)
            count += 1

    return count


def count_strong_hits(scored_spans: list[dict]) -> int:
    """Count the number of strong hits (score >= t_strong).

    Args:
        scored_spans: List of score dicts from score_spans().

    Returns:
        Number of strong hits.
    """
    return sum(1 for s in scored_spans if s["is_strong"])


def apply_cap(value: int, cap: int) -> int:
    """Apply a cap to an integer contribution.

    Args:
        value: The raw contribution.
        cap: The maximum magnitude (positive for positive caps, negative for negative).

    Returns:
        The capped contribution.
    """
    if cap == 0:
        return value
    elif cap > 0:
        return min(value, cap)
    else:
        # Negative cap — clamp toward zero.
        return max(value, cap) if value < 0 else min(value, -cap) if value > 0 else 0
