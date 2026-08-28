"""Shared fakes for exercising the real family scoring paths in tests.

The family score functions call similarity_mapper.score_span() →
query_store() → embedder.embed(text) → store.search(vec, k). Real scoring
requires a built FAISS index + ONNX model, which unit tests must not depend
on. FakeStore/FakeEmbedder stand in for that layer so tests can drive the
actual nearest-neighbour rule, thresholds, tier selection, and margins with
deterministic canned results — per TEST-2, asserting real returned
contributions rather than only the store=None fallback guard.
"""

import numpy as np


class FakeEmbedder:
    """Embedder stand-in: returns a fixed zero vector for any text.

    The fake store ignores the query vector entirely, so the embedding value
    only needs to satisfy the embedder.embed(text) call shape — no model.
    """

    def __init__(self, dim: int = 8) -> None:
        self.dim = dim

    def embed(self, text: str) -> np.ndarray:
        return np.zeros(self.dim, dtype=np.float32)


class FakeStore:
    """VectorStore stand-in returning canned search results.

    Mirrors the two attributes the family score functions actually touch:
    `is_built` and `search(query_vector, k)`. Results are fixed at
    construction time, so each test controls the nearest-neighbour types and
    similarities outright.
    """

    def __init__(self, results: list[dict]) -> None:
        self._results = results
        self._built = True

    @property
    def is_built(self) -> bool:
        return self._built

    def search(self, query_vector, k: int = 5, include_embeddings: bool = False) -> list[dict]:
        return [dict(r) for r in self._results[:k]]
