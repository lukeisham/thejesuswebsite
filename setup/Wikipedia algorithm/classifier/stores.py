"""FAISS vector store management for the section classifier.

Three stores are built from hand-authored exemplars (§3.1.1):
  1. Information/Data bucket  — passages embodying data/narrative semantics
  2. Context/Interpretation bucket — passages embodying interpretation/analysis
  3. Linguistic Register  — passages capturing stylistic shift (tense, specificity, etc.)

Each store is a FAISS flat inner-product index paired with a sidecar JSON file
holding per-vector metadata. FAISS stores only vectors; the sidecar carries
exemplar IDs, types (positive/negative), source, and the original text.

The ONNX model is loaded once and shared across all stores.
"""

import json
import logging
from pathlib import Path
from typing import Optional

import numpy as np

try:
    import onnxruntime as ort
except ImportError:
    ort = None  # type: ignore[assignment]

try:
    import faiss
except ImportError:
    faiss = None  # type: ignore[assignment]

from .config import (
    MODEL_ONNX_PATH,
    VECTOR_STORES_DIR,
    EXEMPLARS_DIR,
    STORE_NAMES,
    MAX_SEQ_LENGTH,
    TOP_K,
)
from .tokenizer import WordPieceTokenizer

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Embedding model
# ---------------------------------------------------------------------------


class Embedder:
    """Loads the vendored MiniLM ONNX model and embeds text into vectors."""

    def __init__(self, model_path: Optional[Path] = None) -> None:
        """Initialise the embedding model.

        Args:
            model_path: Path to the ONNX model file. Defaults to config value.
        """
        if ort is None:
            raise ImportError(
                "onnxruntime is not installed. "
                "Run 'pip install -r requirements.txt' first."
            )

        if model_path is None:
            model_path = MODEL_ONNX_PATH

        if not model_path.exists():
            raise FileNotFoundError(
                f"ONNX model not found: {model_path}. "
                f"Run 'python download_model.py' from the classifier directory."
            )

        # Suppress ONNX Runtime telemetry / verbose logging.
        ort.set_default_logger_severity(3)

        self._session = ort.InferenceSession(
            str(model_path),
            providers=["CPUExecutionProvider"],
        )
        self._tokenizer = WordPieceTokenizer()

        # Verify model input/output names.
        self._input_names = [inp.name for inp in self._session.get_inputs()]
        self._output_name = self._session.get_outputs()[0].name

        # Determine embedding dimension from the output shape.
        output_shape = self._session.get_outputs()[0].shape
        self._dim = output_shape[-1] if output_shape else 384

    @property
    def dim(self) -> int:
        """Dimensionality of the embedding vectors."""
        return self._dim

    def embed(self, text: str) -> np.ndarray:
        """Embed a single text into a normalized vector.

        Args:
            text: Input text to embed.

        Returns:
            1-D numpy array of shape (dim,) with L2-normalized embedding.
        """
        encoded = self._tokenizer.encode(text, max_length=MAX_SEQ_LENGTH)
        return self._embed_encoded(encoded)

    def embed_batch(self, texts: list[str]) -> np.ndarray:
        """Embed a batch of texts into normalized vectors.

        Args:
            texts: List of input texts.

        Returns:
            2-D numpy array of shape (len(texts), dim) with L2-normalized rows.
        """
        if not texts:
            return np.empty((0, self._dim), dtype=np.float32)

        # Batch tokenization: pad all to the same length.
        all_input_ids = []
        all_attention = []
        for text in texts:
            encoded = self._tokenizer.encode(text, max_length=MAX_SEQ_LENGTH)
            all_input_ids.append(encoded["input_ids"][0])
            all_attention.append(encoded["attention_mask"][0])

        batch_input_ids = np.stack(all_input_ids, axis=0)
        batch_attention = np.stack(all_attention, axis=0)
        batch_token_type = np.zeros_like(batch_input_ids, dtype=np.int64)

        return self._run_onnx(batch_input_ids, batch_attention, batch_token_type)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _embed_encoded(self, encoded: dict[str, np.ndarray]) -> np.ndarray:
        """Embed from pre-tokenized input dict (single item batch)."""
        return self._run_onnx(
            encoded["input_ids"],
            encoded["attention_mask"],
            encoded["token_type_ids"],
        )[0]

    def _run_onnx(
        self,
        input_ids: np.ndarray,
        attention_mask: np.ndarray,
        token_type_ids: np.ndarray,
    ) -> np.ndarray:
        """Run the ONNX model and return mean-pooled, normalized embeddings.

        MiniLM-L6-v2 uses mean pooling over the token dimension (not CLS pooling).
        The attention mask is used to exclude padding tokens from the mean.
        """
        feed: dict[str, np.ndarray] = {}
        # Map inputs by expected name (ONNX exports may use different names).
        for name in self._input_names:
            if "attention" in name.lower() or "mask" in name.lower():
                feed[name] = attention_mask
            elif "token_type" in name.lower() or "segment" in name.lower():
                feed[name] = token_type_ids
            else:
                feed[name] = input_ids

        outputs = self._session.run([self._output_name], feed)
        hidden = outputs[0]  # (batch, seq_len, dim)

        # Mean pooling: sum over token dim, divide by attention-mask count.
        mask_expanded = np.expand_dims(attention_mask.astype(np.float32), axis=-1)
        mask_expanded = np.broadcast_to(mask_expanded, hidden.shape)
        masked = hidden * mask_expanded
        summed = masked.sum(axis=1)
        counts = mask_expanded.sum(axis=1).clip(min=1e-9)
        mean_pooled = summed / counts

        # L2 normalize.
        norms = np.linalg.norm(mean_pooled, axis=1, keepdims=True)
        norms = np.maximum(norms, 1e-12)
        return (mean_pooled / norms).astype(np.float32)


# ---------------------------------------------------------------------------
# FAISS store management
# ---------------------------------------------------------------------------


class VectorStore:
    """A single FAISS vector store paired with a metadata sidecar.

    Each store holds one FAISS flat inner-product index and a JSON sidecar
    carrying per-vector exemplar metadata (id, type, source, text).
    """

    def __init__(self, name: str, dim: int, store_dir: Optional[Path] = None) -> None:
        """Initialise or load a vector store.

        Args:
            name: Store name — one of 'data-bucket', 'interpretation-bucket', 'register'.
            dim: Embedding dimension (from the shared model).
            store_dir: Directory for FAISS indexes. Defaults to config value.
        """
        if faiss is None:
            raise ImportError(
                "faiss-cpu is not installed. "
                "Run 'pip install -r requirements.txt' first."
            )

        self._name = name
        self._dim = dim
        self._store_dir = store_dir or VECTOR_STORES_DIR
        self._store_dir.mkdir(parents=True, exist_ok=True)

        self._index_path = self._store_dir / f"{name}.index"
        self._sidecar_path = self._store_dir / f"{name}.jsonl"

        # FAISS inner-product index (cosine similarity when vectors are normalized).
        self._index = faiss.IndexFlatIP(dim)

        # Metadata: list of dicts, one per vector.
        self._metadata: list[dict] = []

        # Load existing store if it exists.
        if self._index_path.exists():
            self._index = faiss.read_index(str(self._index_path))
            self._load_sidecar()

        self._built = self._index.ntotal > 0

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def name(self) -> str:
        return self._name

    @property
    def size(self) -> int:
        """Number of vectors in the store."""
        return self._index.ntotal

    @property
    def is_built(self) -> bool:
        """Whether the store has been populated with exemplars."""
        return self._built

    # ------------------------------------------------------------------
    # Building
    # ------------------------------------------------------------------

    def add_exemplars(self, exemplars: list[dict], embedder: "Embedder") -> None:
        """Embed exemplar texts and add them to the store.

        Args:
            exemplars: List of dicts, each with at least:
                id (str), text (str), type ("positive"|"negative")
            embedder: An initialised Embedder instance.
        """
        if not exemplars:
            logger.warning("No exemplars provided for store '%s'.", self._name)
            return

        texts = [ex["text"] for ex in exemplars]
        vectors = embedder.embed_batch(texts)

        self._index.add(vectors)
        self._metadata.extend(exemplars)
        self._built = True

    def save(self) -> None:
        """Persist the FAISS index and sidecar to disk."""
        faiss.write_index(self._index, str(self._index_path))
        self._save_sidecar()
        logger.info(
            "Store '%s' saved: %d vectors → %s",
            self._name,
            self._index.ntotal,
            self._index_path,
        )

    # ------------------------------------------------------------------
    # Querying
    # ------------------------------------------------------------------

    def search(self, query_vector: np.ndarray, k: int = TOP_K) -> list[dict]:
        """Search for the k nearest exemplars.

        Args:
            query_vector: 1-D normalized query embedding of shape (dim,).
            k: Number of nearest neighbours to retrieve.

        Returns:
            List of dicts, each with keys from the sidecar metadata plus:
                similarity (float): cosine similarity score.
        """
        if self._index.ntotal == 0:
            return []

        k_actual = min(k, self._index.ntotal)
        query = np.expand_dims(query_vector.astype(np.float32), axis=0)
        scores, indices = self._index.search(query, k_actual)

        results: list[dict] = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self._metadata):
                continue
            result = dict(self._metadata[idx])
            result["similarity"] = float(score)
            results.append(result)
        return results

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _save_sidecar(self) -> None:
        """Write metadata as JSONL (one JSON object per line)."""
        with open(self._sidecar_path, "w", encoding="utf-8") as fh:
            for item in self._metadata:
                fh.write(json.dumps(item, ensure_ascii=False) + "\n")

    def _load_sidecar(self) -> None:
        """Load metadata from the sidecar JSONL file."""
        self._metadata = []
        if self._sidecar_path.exists():
            with open(self._sidecar_path, "r", encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if line:
                        self._metadata.append(json.loads(line))


# ---------------------------------------------------------------------------
# Store manager — builds all three stores from exemplar files.
# ---------------------------------------------------------------------------


class StoreManager:
    """Manages the three classifier vector stores.

    Provides a single interface for building stores from exemplar JSONL files
    and for querying all three stores at once.
    """

    # Map store names to their exemplar file pairs.
    EXEMPLAR_FILES: dict[str, tuple[str, str]] = {
        "data-bucket": (
            "data-bucket-positive.jsonl",
            "data-bucket-negative.jsonl",
        ),
        "interpretation-bucket": (
            "interpretation-bucket-positive.jsonl",
            "interpretation-bucket-negative.jsonl",
        ),
        "register": (
            "register-positive.jsonl",
            "register-negative.jsonl",
        ),
    }

    def __init__(self, embedder: Optional[Embedder] = None) -> None:
        """Initialise the store manager.

        Args:
            embedder: Shared Embedder instance. Created if not provided.
        """
        self._embedder = embedder or Embedder()
        self._stores: dict[str, VectorStore] = {
            name: VectorStore(name, self._embedder.dim) for name in STORE_NAMES
        }

    @property
    def embedder(self) -> Embedder:
        return self._embedder

    @property
    def stores(self) -> dict[str, VectorStore]:
        return self._stores

    def build_all(self, exemplars_dir: Optional[Path] = None) -> None:
        """Build all three stores from the exemplar JSONL files.

        If a store's index already exists on disk, it is re-loaded rather
        than rebuilt — use force_rebuild() to rebuild from scratch.

        Args:
            exemplars_dir: Directory containing exemplar JSONL files.
                           Defaults to config value.
        """
        if exemplars_dir is None:
            exemplars_dir = EXEMPLARS_DIR

        for store_name, (pos_file, neg_file) in self.EXEMPLAR_FILES.items():
            store = self._stores[store_name]
            if not store.is_built:
                exemplars: list[dict] = []
                exemplars.extend(self._load_exemplars(exemplars_dir / pos_file))
                exemplars.extend(self._load_exemplars(exemplars_dir / neg_file))
                store.add_exemplars(exemplars, self._embedder)
                store.save()

    def force_rebuild(self, exemplars_dir: Optional[Path] = None) -> None:
        """Rebuild all stores from scratch, overwriting existing indexes."""
        if exemplars_dir is None:
            exemplars_dir = EXEMPLARS_DIR

        for store_name in STORE_NAMES:
            self._stores[store_name] = VectorStore(
                store_name, self._embedder.dim, self._stores[store_name]._store_dir
            )

        self.build_all(exemplars_dir)

    def query_all(
        self, text: str, k: int = TOP_K
    ) -> dict[str, list[dict]]:
        """Query all three stores with a single text.

        Args:
            text: The paragraph text to classify.
            k: Number of nearest neighbours per store.

        Returns:
            Dict mapping store name → list of nearest-exemplar dicts.
        """
        vector = self._embedder.embed(text)
        results: dict[str, list[dict]] = {}
        for name, store in self._stores.items():
            results[name] = store.search(vector, k)
        return results

    def query_all_batch(
        self, texts: list[str], k: int = TOP_K
    ) -> list[dict[str, list[dict]]]:
        """Query all three stores with a batch of texts.

        Args:
            texts: List of paragraph texts.
            k: Number of nearest neighbours per store.

        Returns:
            List of dicts, one per input text, each mapping store name → results.
        """
        if not texts:
            return []

        vectors = self._embedder.embed_batch(texts)

        batch_results: list[dict[str, list[dict]]] = []
        for vec in vectors:
            results: dict[str, list[dict]] = {}
            for name, store in self._stores.items():
                results[name] = store.search(vec, k)
            batch_results.append(results)
        return batch_results

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    @staticmethod
    def _load_exemplars(path: Path) -> list[dict]:
        """Load exemplars from a JSONL file."""
        exemplars: list[dict] = []
        if not path.exists():
            logger.warning("Exemplar file not found: %s", path)
            return exemplars
        with open(path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    obj = json.loads(line)
                    # Validate required fields.
                    if not all(k in obj for k in ("id", "text", "type")):
                        logger.warning(
                            "Skipping exemplar in %s — missing required fields: %s",
                            path,
                            obj.get("id", "?"),
                        )
                        continue
                    exemplars.append(obj)
        return exemplars
