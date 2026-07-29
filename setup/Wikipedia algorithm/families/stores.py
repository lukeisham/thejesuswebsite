"""Generalized FAISS vector-store loader/builder for signal families.

Extends Plan 4's stores.py pattern to build or load an arbitrary family's
exemplar-backed store. Each family's store lives at:
    vector-stores/<family>/  (one FAISS index + one sidecar JSONL per family)

Reuses the shared MiniLM ONNX model vendored by Plan 4.
"""

import json
import logging
from pathlib import Path
from typing import Optional

import numpy as np

from .config import (
    VECTOR_STORES_DIR,
    EXEMPLARS_DIR,
    FAMILY_STORE_NAMES,
    FAMILY_STORE_MAP,
    TOP_K,
    NN_NEGATIVE_THRESHOLD,
    MODEL_ONNX_PATH,
    VOCAB_PATH,
    MAX_SEQ_LENGTH,
)

logger = logging.getLogger(__name__)

# Import Plan 4's embedder and tokenizer — the shared infrastructure.
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from classifier.stores import Embedder, VectorStore


# ---------------------------------------------------------------------------
# Family-specific store loader
# ---------------------------------------------------------------------------

def get_family_store_path(family_name: str) -> Path:
    """Return the directory for a family's vector store.

    Args:
        family_name: e.g. 'balanced-debate', 'anti-supernatural', etc.

    Returns:
        Path to the family's subdirectory under vector-stores/.
    """
    return VECTOR_STORES_DIR / family_name


def build_family_store(
    family_name: str,
    embedder: Embedder,
    exemplars_dir: Optional[Path] = None,
    force: bool = False,
) -> Optional[VectorStore]:
    """Build or load a single family's vector store from exemplar JSONL files.

    Args:
        family_name: The family's name (must be in FAMILY_STORE_NAMES).
        embedder: A shared Embedder instance.
        exemplars_dir: Directory containing exemplar JSONL files.
        force: If True, rebuild even if the store already exists on disk.

    Returns:
        A loaded VectorStore, or None if exemplar files are missing.
    """
    if family_name not in FAMILY_STORE_NAMES and family_name != "confessional-balance":
        raise ValueError(
            f"Unknown family '{family_name}'. Known: {FAMILY_STORE_NAMES}"
        )

    # Resolve which store this family uses (confessional-balance → balanced-debate).
    store_name = FAMILY_STORE_MAP.get(family_name, family_name)
    store_dir = get_family_store_path(store_name)
    store_dir.mkdir(parents=True, exist_ok=True)

    if exemplars_dir is None:
        exemplars_dir = EXEMPLARS_DIR

    # Check for existing store.
    index_path = store_dir / f"{family_name}.index"
    if index_path.exists() and not force:
        logger.info("Loading existing store for '%s' from %s", family_name, store_dir)
        return VectorStore(family_name, embedder.dim, store_dir)

    # Build from exemplar files.
    pos_path = exemplars_dir / f"{family_name}-positive.jsonl"
    neg_path = exemplars_dir / f"{family_name}-negative.jsonl"

    if not pos_path.exists() and not neg_path.exists():
        logger.warning(
            "No exemplar files found for family '%s' at %s. Store not built.",
            family_name,
            exemplars_dir,
        )
        return None

    exemplars: list[dict] = []
    exemplars.extend(_load_jsonl(pos_path))
    exemplars.extend(_load_jsonl(neg_path))

    if not exemplars:
        logger.warning("No exemplars loaded for family '%s'.", family_name)
        return None

    store = VectorStore(family_name, embedder.dim, store_dir)
    store.add_exemplars(exemplars, embedder)
    store.save()
    logger.info(
        "Built store '%s': %d vectors → %s",
        family_name,
        store.size,
        index_path,
    )
    return store


def build_all_family_stores(
    embedder: Embedder,
    exemplars_dir: Optional[Path] = None,
    force: bool = False,
) -> dict[str, Optional[VectorStore]]:
    """Build or load all family vector stores.

    Args:
        embedder: Shared Embedder instance.
        exemplars_dir: Directory containing exemplar JSONL files.
        force: If True, rebuild all stores from scratch.

    Returns:
        Dict mapping family_name → VectorStore (or None if exemplars are missing).
    """
    stores: dict[str, Optional[VectorStore]] = {}
    for name in FAMILY_STORE_NAMES:
        try:
            store = build_family_store(name, embedder, exemplars_dir, force)
            stores[name] = store
        except Exception:
            logger.exception("Failed to build store for family '%s'.", name)
            stores[name] = None
    return stores


def load_family_store(family_name: str, embedder: Embedder) -> Optional[VectorStore]:
    """Load an already-built family store from disk.

    Args:
        family_name: The family's name.
        embedder: Shared Embedder instance.

    Returns:
        A loaded VectorStore, or None if the store doesn't exist on disk.
    """
    store_name = FAMILY_STORE_MAP.get(family_name, family_name)
    store_dir = get_family_store_path(store_name)
    index_path = store_dir / f"{family_name}.index"

    if not index_path.exists():
        logger.warning("Store for family '%s' not found at %s.", family_name, index_path)
        return None

    return VectorStore(family_name, embedder.dim, store_dir)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_jsonl(path: Path) -> list[dict]:
    """Load exemplars from a JSONL file."""
    exemplars: list[dict] = []
    if not path.exists():
        logger.warning("Exemplar file not found: %s", path)
        return exemplars

    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                if all(k in obj for k in ("id", "text", "type")):
                    exemplars.append(obj)
                else:
                    logger.warning(
                        "Skipping exemplar in %s — missing required fields: %s",
                        path,
                        obj.get("id", "?"),
                    )
            except json.JSONDecodeError:
                logger.warning("Skipping invalid JSON line in %s", path)

    return exemplars


def embed_texts(texts: list[str], embedder: Embedder) -> np.ndarray:
    """Embed a list of texts using the shared MiniLM model.

    Args:
        texts: List of text strings to embed.
        embedder: Shared Embedder instance.

    Returns:
        (n, dim) float32 numpy array of normalized embeddings.
    """
    return embedder.embed_batch(texts)
