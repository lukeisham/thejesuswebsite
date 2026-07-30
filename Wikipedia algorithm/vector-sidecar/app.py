"""Vector sidecar — live nearest-neighbour signal classification.

Serves Plan 4/5's FAISS vector stores over localhost HTTP so the Node API
can classify arbitrary text against a signal family live, instead of only
during the offline scoring pipeline. Binds to 127.0.0.1 only — never a
public interface — since only the Node API on the same host should reach
it (see wikipedia-v2-09-vps-vector-store-serving.md).

Note on scope (repurposed from the original plan draft): the FAISS stores
built by Plans 4/5 hold hand-authored *calibration exemplars* per family
(a few dozen reference passages each), not per-article embeddings — there
is no "find Wikipedia articles related to this one" capability here, and
building one would need a new per-article embedding store that doesn't
exist. What this sidecar actually serves is a live version of the offline
scoring step: given free text and a family name, tell the caller which
exemplar it's nearest to and whether that would fire the signal.

Environment variables — VECTOR_STORE_DIR and MODEL_DIR MUST be set
explicitly in production. This code (Wikipedia algorithm/vector-sidecar/) is a git-tracked
directory that deploys to /var/www/thejesuswebsite/vector-sidecar/ via the
normal git-based deploy; the vector-stores data + model are NOT in git
(rsynced instead, see scripts/sync-vector-stores.sh) and live in a sibling
path, /var/www/thejesuswebsite-vector-store/{vector-stores,model}/ — NOT a
sibling of this file, so the relative defaults below are a local-dev
convenience only. scripts/sync-vector-sidecar.sh sets both env vars
explicitly when starting the pm2 process.
  VECTOR_SIDECAR_PORT     default 8901 (informational only — actually set via
                          the uvicorn --port flag at start time)
  VECTOR_STORE_DIR        default <this file's dir>/../vector-stores
                          (a same-repo-checkout convenience default; NOT
                          correct in production — see above)
  MODEL_DIR               default <this file's dir>/../model (same caveat)
  MAX_TEXT_LENGTH         default 2000 (characters; bounds embedding cost)
"""

import logging
import os

from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from embedder import Embedder
from families import FAMILY_STORE_MAP, FLAT_STORES, NN_NEGATIVE_THRESHOLD, T_FIRE, T_STRONG
from store import VectorStore

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("vector_sidecar")

THIS_DIR = Path(__file__).resolve().parent
VECTOR_STORE_DIR = Path(os.environ.get("VECTOR_STORE_DIR", THIS_DIR.parent / "vector-stores"))
MODEL_DIR = Path(os.environ.get("MODEL_DIR", THIS_DIR.parent / "model"))
MAX_TEXT_LENGTH = int(os.environ.get("MAX_TEXT_LENGTH", "2000"))
MAX_SEQ_LENGTH = 256  # Must match the value used when the stores were built.

app = FastAPI(title="thejesuswebsite vector sidecar")

_embedder: Embedder | None = None
_stores: dict[str, VectorStore] = {}


def get_embedder() -> Embedder:
    global _embedder
    if _embedder is None:
        logger.info("Loading embedding model from %s ...", MODEL_DIR)
        _embedder = Embedder(
            model_path=MODEL_DIR / "model.onnx",
            vocab_path=MODEL_DIR / "vocab.txt",
            max_seq_length=MAX_SEQ_LENGTH,
        )
        logger.info("Embedding model loaded (dim=%d).", _embedder.dim)
    return _embedder


def get_store(store_name: str) -> VectorStore:
    """Lazily load a store on first request for it (per the plan's task)."""
    if store_name not in _stores:
        if store_name in FLAT_STORES:
            index_path = VECTOR_STORE_DIR / f"{store_name}.index"
            sidecar_path = VECTOR_STORE_DIR / f"{store_name}.jsonl"
        else:
            index_path = VECTOR_STORE_DIR / store_name / f"{store_name}.index"
            sidecar_path = VECTOR_STORE_DIR / store_name / f"{store_name}.jsonl"

        logger.info("Loading store '%s' from %s ...", store_name, index_path)
        _stores[store_name] = VectorStore(index_path, sidecar_path)
        logger.info("Store '%s' loaded: %d vectors.", store_name, _stores[store_name].size)
    return _stores[store_name]


class QueryRequest(BaseModel):
    family: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1)
    k: int = Field(default=5, ge=1, le=20)


class NeighbourResult(BaseModel):
    id: str
    type: Literal["positive", "negative"]
    similarity: float


class Verdict(BaseModel):
    label: Literal["strong_fire", "fire", "no_fire"]
    nearest_neighbour_type: Literal["positive", "negative"]
    similarity: float


class QueryResponse(BaseModel):
    family: str
    store: str
    k: int
    results: list[NeighbourResult]
    verdict: Verdict


def compute_verdict(results: list[dict]) -> Verdict:
    """Nearest-neighbour-label rule (Wikipedia_alogrithm_refractor.md:379):
    a query whose nearest neighbour is a negative exemplar (above the
    negative threshold) never fires, regardless of cosine value.
    """
    top = results[0]
    if top["type"] == "negative" and top["similarity"] >= NN_NEGATIVE_THRESHOLD:
        return Verdict(label="no_fire", nearest_neighbour_type="negative", similarity=top["similarity"])

    # Nearest neighbour is positive (or a negative too weak to suppress) —
    # find the nearest *positive* result to score against t_fire/t_strong.
    nearest_positive = next((r for r in results if r["type"] == "positive"), None)
    if nearest_positive is None:
        return Verdict(label="no_fire", nearest_neighbour_type=top["type"], similarity=top["similarity"])

    similarity = nearest_positive["similarity"]
    if similarity >= T_STRONG:
        label: Literal["strong_fire", "fire", "no_fire"] = "strong_fire"
    elif similarity >= T_FIRE:
        label = "fire"
    else:
        label = "no_fire"
    return Verdict(label=label, nearest_neighbour_type=top["type"], similarity=similarity)


@app.get("/health")
def health():
    return {"status": "ok", "families_loaded": sorted(_stores.keys())}


@app.post("/query", response_model=QueryResponse)
def query(req: QueryRequest):
    store_name = FAMILY_STORE_MAP.get(req.family)
    if store_name is None:
        raise HTTPException(status_code=400, detail=f"Unknown family: {req.family!r}")

    if len(req.text) > MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"text exceeds MAX_TEXT_LENGTH ({MAX_TEXT_LENGTH} characters).",
        )

    try:
        store = get_store(store_name)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    embedder = get_embedder()
    vector = embedder.embed(req.text)
    results = store.search(vector, req.k)

    if not results:
        raise HTTPException(status_code=503, detail=f"Store '{store_name}' has no vectors loaded.")

    return QueryResponse(
        family=req.family,
        store=store_name,
        k=req.k,
        results=[NeighbourResult(**r) for r in results],
        verdict=compute_verdict(results),
    )
