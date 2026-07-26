# Hybrid Tech Spec: Vector-Enhanced Wikipedia Ranking
**Project:** thejesuswebsite – Stage 3 ranking refactor  
**Status:** General plan  
**Date:** 2026-07-27

## 1. High-level Goal
Hybrid ranking system for Stage 3 only.

- **Replace** existing keyword/pattern detectors only for signals that detect a school or family of ideas (balanced debate structures, anti-supernatural bias, OT–NT discontinuity patterns, mythicist framing, Jewish-context conceptual clusters, etc.).
- **Retain** pure keyword / fixed-list detectors for concrete presence/absence signals (specific Bible verse citations, named manuscripts from a fixed list, Wikipedia Good/Featured Article tags, exact author lists, “citation needed” banners, etc.).

The final `net_score`, contribution integers, caps, DB schema (`wikipedia_articles` + `wikipedia_article_signals`), public API, and animation widget remain unchanged in shape.

## 2. Core Approach
- One small, specialised vector store + embedding model per conceptual family.
- Each store contains curated positive and negative example passages that embody the ideas associated with that weight.
- At scoring time, relevant article sections (already classified by the existing section classifier) are embedded and compared via similarity search.
- Similarity scores are mapped onto the existing capped integer contribution system so explainability is preserved.
- Exact signals continue to use the current fast keyword/list path.

## 3. Architecture

### 3.1 Signal Families (initial set)
- `balanced-debate`
- `anti-supernatural`
- `ot-nt-discontinuity`
- `jewish-context`
- `mythicist-framing`
- (additional families added only as needed)

### 3.2 Embedding & Retrieval Layer
- Fully local: runs on developer machines, GitHub (if required for CI), and the production VPS.
- Offline-capable; no external API calls during scoring.
- Per-family models (small sentence-transformer class or equivalent).
- Article text is section-classified first; only the appropriate bucket(s) are embedded and queried.

### 3.3 Vector Storage (fit with current stack)
Preferred options ranked by compatibility with the existing lightweight SQLite-centric, low-dependency setup:

1. sqlite-vss (or equivalent SQLite vector extension) – keeps data inside the same database world.
2. Small file-based indexes (FAISS or LanceDB embedded) managed by the existing Python ranking scripts.
3. Minimal Chroma persistent store (local folder) if the Python side already tolerates it.

Stores must be commit-able (or regenerable) and runnable without GPU.

### 3.4 Hybrid Scoring Logic
- Exact signals → current keyword / list detectors (unchanged).
- Conceptual signals → vector similarity first, with optional keyword fallback or boost.
- Placement multipliers and section classifier continue to operate exactly as today.
- Every contribution remains an integer that respects the original cap defined in the (trimmed) Reference.md.

## 4. Multistage Workflow
1. **Build / fine-tune** the per-family vector databases  
   (slow, iterative, human-reviewed expansion of example sets).
2. **Regather** the candidate pool.
3. **Select** the ~250 articles and run the hybrid ranker.
4. **Push** results to the live database via the existing `import-wikipedia-scoring.js` path.
5. **Verify** the animation widget remains synchronised with the new rankings and signals.

## 5. Repository & Documentation Cleanup
- `setup/Wikipedia algorithm/` retains **only** the files required by the multistage workflow above.
- All other historical, experimental, or redundant files are removed or archived.
- `Wikipedia Articles - Reference.md` is aggressively trimmed to the precise essentials:
  - Signal list with weight, cap, and designation (keyword vs vector)
  - Section-classifier rules
  - Mapping from similarity → contribution
  - The five-step workflow
  - Nothing else.

## 6. Design Constraints
- Stage 2 selection criteria remain completely unchanged.
- Example datasets are expanded slowly and deliberately.
- Full explainability of every contribution is mandatory.
- Trimmed Reference.md is the single source of truth.
- No change to DB schema shape or public `/api/wikipedia` contract.
- Local + GitHub + VPS only; offline scoring required.

## 7. Implementation Outline
1. Choose concrete vector storage from the ranked options.
2. Create initial per-family stores with small seed example sets.
3. Implement embedding + similarity → contribution mapping inside the ranking scripts.
4. Wire hybrid path into Stage 3 only.
5. Trim directory and rewrite Reference.md to essentials.
6. Execute one full multistage run and validate against current rankings + animation widget.
7. Document the new workflow in the trimmed Reference.md.

## 8. Open Decisions (to be locked before coding)
- Final choice of vector storage technology.
- Exact initial list of signal families and their seed example sources.
- Directory location of the vector stores (inside `setup/Wikipedia algorithm/` or a sibling path).
- Hard limits on model size / dependency surface.
