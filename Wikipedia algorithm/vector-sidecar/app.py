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
  VECTOR_SIDECAR_THREADS  default 1 (CPU threads per embedding; issue #240)
  VECTOR_SIDECAR_MAX_CONCURRENT
                          default 2 (embeddings that run at the same time;
                          other requests wait their turn; issue #242)
"""

import os

# Limit the OpenMP/BLAS thread pools of numpy and FAISS. These variables are
# read only when those libraries load, so they must be set before the imports
# below. setdefault lets the pm2 environment override them (issue #240).
_THREADS = os.environ.get("VECTOR_SIDECAR_THREADS", "1")
for _var in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ.setdefault(_var, _THREADS)
os.environ.setdefault("OMP_WAIT_POLICY", "PASSIVE")

import logging  # noqa: E402
import threading  # noqa: E402

from pathlib import Path  # noqa: E402
from typing import Literal  # noqa: E402

from fastapi import FastAPI, HTTPException  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from embedder import Embedder  # noqa: E402
from families import FAMILY_STORE_MAP, FLAT_STORES, NN_NEGATIVE_THRESHOLD, T_FIRE, T_STRONG  # noqa: E402
from store import VectorStore  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("vector_sidecar")

THIS_DIR = Path(__file__).resolve().parent
VECTOR_STORE_DIR = Path(os.environ.get("VECTOR_STORE_DIR", THIS_DIR.parent / "vector-stores"))
MODEL_DIR = Path(os.environ.get("MODEL_DIR", THIS_DIR.parent / "model"))
MAX_TEXT_LENGTH = int(os.environ.get("MAX_TEXT_LENGTH", "2000"))
MAX_SEQ_LENGTH = 256  # Must match the value used when the stores were built.
NUM_THREADS = int(_THREADS)
MAX_CONCURRENT = int(os.environ.get("VECTOR_SIDECAR_MAX_CONCURRENT", "2"))

app = FastAPI(title="thejesuswebsite vector sidecar")

_embedder: Embedder | None = None
_stores: dict[str, VectorStore] = {}

# Guards the lazy singleton check-then-set below. The /query route is a sync
# def, so FastAPI/Starlette runs it in a threadpool — concurrent first
# requests during cold start could otherwise race past the `is None`/`not in`
# checks and construct duplicate InferenceSessions/FAISS indexes in parallel.
# One lock around the whole check-and-maybe-construct body is sufficient at
# this request volume (a held lock costs microseconds after warm-up).
_init_lock = threading.Lock()

# Caps how many embed+search runs happen at the same time. /query runs in a
# threadpool of about 40 threads, so without this cap a burst of requests ran
# in parallel and fought for the same cores (issue #242).
_compute_slots = threading.BoundedSemaphore(MAX_CONCURRENT)


def get_embedder() -> Embedder:
    global _embedder
    with _init_lock:
        if _embedder is None:
            logger.info("Loading embedding model from %s ...", MODEL_DIR)
            _embedder = Embedder(
                model_path=MODEL_DIR / "model.onnx",
                vocab_path=MODEL_DIR / "vocab.txt",
                max_seq_length=MAX_SEQ_LENGTH,
                num_threads=NUM_THREADS,
            )
            logger.info("Embedding model loaded (dim=%d).", _embedder.dim)
        return _embedder


def get_store(store_name: str) -> VectorStore:
    """Lazily load a store on first request for it (per the plan's task)."""
    with _init_lock:
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
    with _compute_slots:
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
