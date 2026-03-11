# Plan: Update challenges_architecture.html in Bite-Sized Batches

## Context

The current `challenges_architecture.html` is a bare placeholder. It needs to document the full 9-step challenge + response lifecycle, noting that Academic and Popular follow the same pipeline but differ in search context and ranking.

Key codebase facts:
- Two parallel pipelines: Academic (persistence ranking, academic web sources) and Popular (popularity ranking, trending web sources)
- Generation is **admin-triggered** via dashboard
- `edit_challenge_results.js` is the admin CRUD script — loads challenges, renders list with response counts, clicking a challenge switches to Responses tab
- Responses have auto-generated `internal_url` from title (must use "vibe.internal" domain)
- Published responses appear **indented below their parent challenge** on both dashboard and public pages
- Backend: `challenge.rs` (types + ranking), `response.rs` (type + publish/retract), `api_agents.rs` (handlers), `challenge.rs` in app_brain (pipeline traits)
- Storage: SQLite tables `challenges_popular`, `challenges_academic`, `challenges_raw_popular`, `challenges_raw_academic`
- Ranking differences shown as a **side-by-side mini diagram**

**File to modify:** `frontend/private/challenges_architecture.html`

---

## Batch Plan

### Batch 1: Master Overview ASCII Diagram

**What:** Replace the placeholder with a unified 9-step lifecycle overview showing the shared pipeline for both Academic and Popular challenges.

**Diagram shows:**
```
1. GENERATE        2. CHECK & RANK      3. PUBLISH + CRUD     4. CLICK CHALLENGE
(admin-triggered)  (ranking pipeline)   (searchable list)     → blank response

5. INTERNAL URL    6. PUBLISH RESPONSE  7. INDENTED DISPLAY   8. PUBLIC UPDATE
(auto from title)  (status → Published) (below parent)        (challenge pages)
```

Both lists converge through the same pipeline. A note directs readers to the side-by-side ranking mini diagram below.

**Insert location:** Replace existing placeholder `<pre>` block.

---

### Batch 2: Generation + Ranking Pipeline Diagram

**What:** Detailed diagram of steps 1–2: admin triggers generation, raw challenges are fetched from web sources, then checked and ranked.

**Diagram covers:**
- Admin triggers `PopularChallengeTool` / `AcademicChallengeTool`
- Tools search external sources → `RawPopularChallenge` / `RawAcademicChallenge`
- Stored in `challenges_raw_popular` / `challenges_raw_academic` tables
- `ChallengeList::promote_all()` validates and ranks
- `PopularRanker` / `AcademicRanker` assign scores (1–100)
- Promoted to `challenges_popular` / `challenges_academic` tables
- `wgt_challenge_ranker.js` can re-sort via `POST /api/v1/tools/challenge/sort`

---

### Batch 3: CRUD + Response Creation Diagram

**What:** Detailed diagram of steps 3–7: the CRUD list, clicking a challenge to create a blank response, auto-generating the internal URL, publishing the response.

**Diagram covers:**
- `edit_challenge_results.js` → `loadChallenges()` → `GET /api/v1/agent/challenges`
- `renderList()` shows challenges with `response_count`
- Click challenge → switches to Responses tab → prepopulates `#response-challenge-id` + `#response-title-input`
- Blank `Response::new()` created with `linked_challenge: ChallengeLink`
- Internal URL auto-generated: title → slug → `vibe.internal/<slug>`
- `Response::publish()` validates text ≥ 10 chars → status → Published
- Published response appears indented below its parent challenge (both dashboard + public)

---

### Batch 4: Public Display Diagram

**What:** Diagram showing step 8–9: how challenges + indented responses appear on the public pages.

**Diagram covers:**
- `challenge_academic.html` → `challenge_academic_hero.js` → `GET /api/v1/challenge_academic_content` (intended)
- `challenge_popular.html` → `challenge_popular_hero.js` → `GET /api/v1/challenge_popular_content` (intended)
- Also: `display_academic_list.js` / `display_popular_list.js` → `GET /api/challenges?type=academic|popular` (intended)
- Each challenge rendered with published responses indented below it (title only)
- Both endpoints are not yet implemented

---

### Batch 5: Side-by-Side Ranking Mini Diagram

**What:** A dedicated ASCII diagram showing the two differences (search context + ranking) between Academic and Popular pipelines in parallel columns.

**Diagram:**
```
      ACADEMIC                          POPULAR
      ────────                          ───────
Search: academic sources               Search: trending/popular sources
  AcademicChallengeTool                   PopularChallengeTool
  query: "academic"                       query: "trending"

Ranking: persistence over time          Ranking: popularity
  AcademicRanker                          PopularRanker
  Academic(u8) score 1-100                Popular(u8) score 1-100
  ranked by sustained presence            ranked by current popularity
  in academic literature                  on mainstream/social media

Files:                                  Files:
  app_brain/src/challenge.rs              app_brain/src/challenge.rs
  (AcademicChallengeTool)                 (PopularChallengeTool)
  (AcademicRanker)                        (PopularRanker)
```

**Insert after:** The public display diagram, as a clearly labelled note section.

---

### Batch 6: File & Function Reference Tables

**What:** Replace the stub table with comprehensive reference tables.

**New `<details>` sections:**
1. **Backend — Core Types** — `challenge.rs` (ChallengeRank, Popular, Academic, RawPopularChallenge, RawAcademicChallenge, PopularChallenge, AcademicChallenge, ChallengeList, ChallengeLink), `response.rs` (Response struct, publish/retract/validate methods, ResponseError)
2. **Backend — Pipeline** — `challenge.rs` in app_brain (ChallengeGenerator, ChallengeProcessor traits, PopularChallengeTool, AcademicChallengeTool, PopularRanker, AcademicRanker)
3. **Backend — API Handlers** — `api_agents.rs` (handle_get_challenges, handle_post_challenge, handle_challenge_sort + intended endpoints)
4. **Backend — Storage** — `sqlite.rs` (get_popular_challenges, get_academic_challenges) + 4 SQLite tables
5. **Frontend — Admin JS** — `edit_challenge_results.js` (loadChallenges, renderList) + `wgt_challenge_ranker.js` (initChallengeRanker, handleChallengeSort)
6. **Frontend — Public JS** — hero scripts + display scripts (4 files each for academic/popular)

---

### Batch 7: Terms Glossary

**What:** Add a glossary with ~15 terms.

**Terms:** RawChallenge, PopularChallenge, AcademicChallenge, ChallengeRank, ChallengeLink, Response, internal_url (vibe.internal), PublicationStatus, ChallengeGenerator, ChallengeProcessor, PopularRanker, AcademicRanker, wgt_challenge_ranker, response_count, ChallengeList

---

## Verification

After each batch: render in browser, check diagrams + details sections.
After all batches: verify both pipelines documented, ranking differences clear in mini diagram, all 9 steps covered.

## Files Modified

- `frontend/private/challenges_architecture.html` — all 7 batches
