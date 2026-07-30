"""Read-only FAISS store wrapper for the vector sidecar.

Loads an existing (index, jsonl-sidecar) pair built by Plan 4/5's
build_stores.py / families export tooling and rsynced to the VPS by
scripts/sync-vector-stores.sh. This module never builds or writes a store —
building is exclusively an offline, developer-machine activity.
"""

import json
from pathlib import Path

import numpy as np

try:
    import faiss
except ImportError:
    faiss = None  # type: ignore[assignment]


class VectorStore:
    """A single FAISS flat inner-product index plus its JSONL metadata."""

    def __init__(self, index_path: Path, sidecar_path: Path) -> None:
        if faiss is None:
            raise ImportError("faiss-cpu is not installed. Run 'pip install -r requirements.txt'.")

        if not index_path.exists():
            raise FileNotFoundError(f"FAISS index not found: {index_path}")

        self._index = faiss.read_index(str(index_path))
        self._metadata: list[dict] = []
        if sidecar_path.exists():
            with open(sidecar_path, "r", encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if line:
                        self._metadata.append(json.loads(line))

    @property
    def size(self) -> int:
        return self._index.ntotal

    def search(self, query_vector: np.ndarray, k: int) -> list[dict]:
        """Return the k nearest exemplars, each with id/type/text + similarity."""
        if self._index.ntotal == 0:
            return []

        k_actual = min(k, self._index.ntotal)
        query = np.expand_dims(query_vector.astype(np.float32), axis=0)
        scores, indices = self._index.search(query, k_actual)

        results: list[dict] = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self._metadata):
                continue
            item = dict(self._metadata[idx])
            item["similarity"] = float(score)
            results.append(item)
        return results
