# 🧠 Wikipedia Algorithm — Implementation Guide

**What it does:** Scores and ranks ~250 Wikipedia articles about Jesus and the
Gospels against a 25-signal rubric, producing a ranked reliability list published
at `thejesuswebsite.org/debate/wikipedia`. Each article earns or loses points
based on how well it substantiates its content: citing primary sources (Bible
verses, manuscripts, ancient historians, ante-Nicene authors), engaging scholarly
debate with named representatives on both sides, providing maps, diagrams, and
peer-reviewed references, and avoiding structural biases (mythicist framing,
Jesus Seminar dependence, supernatural-criticism presuppositions, Gnostic
over-emphasis, confessional imbalance). The 5×5 grid widget on the site renders
these signals in a fixed order — top-left cells are the strongest positive
contributions, bottom-right cells are the strongest negatives — so a reader can
see at a glance *why* an article earned its rank, not just what rank it got.

**Purpose of this document:** reference for anyone maintaining or extending the
scoring pipeline. Describes the current codebase as-is; assumes the
honesty-and-reproducibility plan is complete.

---

## 🔄 1. Article Lifecycle

```
STAGE 1 — CANDIDATE POOL
    Wikipedia category crawl (1–2 hops from Category:Jesus, Category:Gospels)
    → candidate-pool.tsv (512 titles)

STAGE 2 — SELECTION
    Apply inclusion/exclusion rules (§2 of Wikipedia Articles - Reference.md)
    + check excluded-titles.txt (22 permanently blocked)
    → 253 articles in the live list

STAGE 3 — HARVEST
    Headless Chrome opens each article in Wikipedia
    injects extract.js → raw signals (DOM + regex)
    → per-article signal dict (verse counts, keyword hits, category flags)

STAGE 4 — CLASSIFY (OFFLINE, DEV MACHINE ONLY)
    classifier/ pipeline (MiniLM ONNX + FAISS)
    → bucket-labels.json (per-paragraph data/interp/other labels)   ⚠ PENDING
    families/ pipeline (9 vector-embedding stores)
    → vector-family-scores.json (per-family contributions)         ⚠ PENDING

    While both artifacts are absent, the system uses dormant keyword
    fallbacks for all 9 vector families, and rows 3 + 10 score 0.

STAGE 5 — SCORE
    rank_engine.py merges upstream artifacts + keyword fallbacks
    → computes net_score = Σ 25 signal contributions
    → sorts by net_score (ties broken alphabetically), numbers 1–253
    → writes database/scoring-export.json
    → writes Wikipedia Articles.csv, Scoring Detail.csv, wiki-bulk-paste.txt

STAGE 6 — DEPLOY
    git push database/scoring-export.json → GitHub
    deploy.sh runs import-wikipedia-scoring.js
    → validates all 253 × 25 signals in a single transaction
    → writes wikipedia_articles + wikipedia_article_signals to SQLite
    → frontend/debate/wikipedia.html renders the 5×5 grid widget
```

**⚠️ Key constraint:** Stages 1–5 run entirely on a dev machine. Stage 6 is the only step that touches the VPS. The VPS has no Python, no ML model, and no scoring runtime — it only imports a pre-computed JSON file.

---

## 🏗️ 2. Architectural Decisions

### 💻☁️ 2.1 Offline/online split

```
DEV MACHINE (Python, ~265 MB ML deps)          VPS (Node, no Python scoring)
─────────────────────────────────────────       ─────────────────────────────
extract.js ──► raw signals
    │
    ▼
classifier/ + families/ ──► bucket-labels.json  ✗ NOT ON VPS
                        ──► vector-family-scores.json  ✗ NOT ON VPS
    │
    ▼
rank_engine.py ──► database/scoring-export.json ──git──► deploy.sh
                                                         │
                                                         ▼
                                         import-wikipedia-scoring.js
                                                         │
                                                         ▼
                                             GET /api/wikipedia
                                                         │
                                                         ▼
                                        frontend/debate/wikipedia.html
                                              (5×5 grid widget)

                                         vector-sidecar/ (FastAPI :8901)
                                         ── POST /wikipedia/signal-check
                                            live editorial spot-checks only
                                            NOT part of the scoring path
```

**💡 Why:** The refactor spec §3.2 caps ML dependencies and forbids shipping a
scoring runtime to the VPS. The VPS has no Python, no model, no FAISS in the
scoring path. Scoring is a developer action whose only output is a committed
JSON file.

**⚠️ Consequence:** nothing on the VPS can detect that a score is wrong, stale, or
that the classifier that produced it was never run. The import script's
validation is the only guard.

**🖥️ Vector-sidecar serving endpoint:** the VPS *does* host the vector stores for
live query serving (separate from scoring). `vector-sidecar/` runs as a FastAPI
process on port 8901, loopback-only. `POST /wikipedia/signal-check` takes free
text + a family name and returns the nearest exemplar(s) plus a fire/no-fire
verdict using the same nearest-neighbour-label rule as offline scoring. This is
for live editorial spot-checks only — it is NOT part of the scoring path. Stores
reach the VPS by rsync, never by git (`setup/` is gitignored). Stores live
outside the git working tree so deploys don't destroy them.

### 🔀 2.2 Vector/keyword hybrid — the `vec()` fallback pattern

Every vector-covered signal uses this pattern (rank_engine.py L205–211):

```python
def vec(sig, signal_key, fallback):
    v = sig.get(f"__vector_{signal_key}")
    return v if v is not None else fallback
```

- `__vector_<key>` values are pre-computed by the family scorer and merged by
  `merge_upstream_signals()`.
- If the vector family hasn't shipped or its precision floor wasn't met, `vec()`
  returns the dormant keyword-detector fallback.
- Nine vector families map to signals via `VECTOR_FAMILY_TO_SIGNAL` (L55–65).

**🔵 Current state:** All nine families have precision 0.0 (below the 0.80 floor),
so every family falls back to keyword. The system is architecturally correct;
the vector intelligence just isn't producing live numbers yet.

### 🔒 2.3 All-or-nothing import

import-wikipedia-scoring.js validates every article before any DB write:

- Every contribution key must be in `KNOWN_SIGNAL_KEYS` (25 keys).
- `|contribution| ≤ |derived cap|` with matching sign.
- `Σcontributions = net_score` for all 253 articles.
- All-zero integrity check: every non-pending signal must have ≥1 non-zero
  value across the corpus, or the import aborts.
- Writes happen in a single SQLite transaction — partial import never reaches
  the live site.

### 🏷️ 2.4 Category flags — single source of truth

Six boolean flags computed once by extract.js from the Wikipedia category
strip (`#mw-normal-catlinks`). Every downstream signal reads these same six
booleans. A single flag error propagates to all gated signals silently.

| Flag | % of corpus | Gates |
|---|---|---|
| `is_passion` | 10.6% | Religious art sensitivity, gnostic/mythicist/supernatural/secular-materialist raised sensitivity |
| `is_miracle` | 11.4% | Supernatural/secular-materialist scope |
| `is_parable` | 16.1% | Commentary signal, ancient-historian cap (lowered to +3), manuscript cap (not doubled), literary analysis tier |
| `is_location` | 18.4% | Archaeology bonus: +2 → +8 |
| `is_teaching` | 16.1% | Commentary signal, manuscript cap (doubled), literary analysis tier |
| `is_bible_book` | 4.3% | Manuscript cap (doubled), literary analysis tier |

**📊 27.1% of articles carry no flag.**

### ⏳ 2.5 Pending signals — two of 25 score 0 by design

`data_interp_split` (row 3, +10) and `literary_analysis` (row 10, +6/+4) are
full members of the 25-signal rubric. Their caps count toward `max_possible`.
Neither has a keyword fallback — both are purely vector/classifier signals.
They score 0 for all 253 articles until Plans 4/5 produce real artifacts.

The pending state is tracked by:
- `PENDING_SIGNAL_KEYS` in import-wikipedia-scoring.js (exempts them from the
  all-zero integrity check).
- `data_interp_pending` flag in rank_engine.py (keeps the row-3 cap at +10
  rather than collapsing to 0 on the placeholder tier).
- §9 activation checklist in Wikipedia_alogrithm_refractor.md.

Pending cells render in the grid identically to ordinary unfired signals — no
distinct styling or tooltip. The distinction lives only in documentation.

### 📐 2.6 Placement multipliers — structural proxies, not stance detection

Jesus Seminar (row 19) and Mythicist (row 21) apply placement multipliers:

| Placement | Multiplier |
|---|---|
| Cited in data/narrative sections | ×2 |
| Cited only in interpretation sections | ×0.5 |
| Mixed / ambiguous | ×1 |

Applied to the **capped** penalty, then truncated toward zero (`int()`).
An additional **−2 surcharge** applies if balanced debate (row 5) scored 0.

These are structural proxies for stance — the system does not attempt to detect
whether an author is cited approvingly or critically (§11.3 of the refactor
spec). Placement and balanced-debate presence are used as indirect signals.

### 🥇 2.7 Gold set — frozen, single-rater, segmentation-mismatched

- **39 classifier articles** with per-paragraph data/interpretation/neither labels
- **197 vector-family rows** across 10 families
- **37 negative controls** (old keyword detector misfires the vector system must not repeat)
- Labelled by 14 independent agents reading rendered Wikipedia pages
- **Single-rater only** — no inter-rater agreement measured (plan calls for
  multi-rater in a future pass)
- **Segmentation mismatch**: gold set labelled on visually rendered pages;
  classifier reads parse-API HTML (paragraph counts don't align; lede always
  mismatches by construction)
- Labels are frozen once recorded — the gold set is never retrofitted to agree
  with its own output

### 🧩 2.8 Hybrid function shapes — four patterns cover all 25 signals

Every signal follows one of four architectural patterns. Understanding these
shapes is the fastest way to reason about how a signal produces its contribution:

| Shape | Signals | How it works |
|---|---|---|
| **A — Distinct-pattern count** | Balanced debate (row 5), OT–NT continuity (row 20) | The vector store alone produces the count: number of distinct query spans clearing `t_fire`. No list involved. Count times per-hit weight, then cap |
| **B — List counts, placement and balance modify** | Jesus Seminar (row 19), mythicist bias (row 21) | The fixed name list produces the count (reliable citation counter). Two modifiers then apply in order: the placement multiplier (x2 for any hit outside interpretation sections, x0.5 interpretation-only), then an imbalance surcharge of -2 where balanced debate (row 5) scored 0. Stance-blind (see section 2.6) |
| **C — Structural boolean** | Data/interpretation split (row 3), confessional balance (row 17) | Two or more stores must fire together for the signal to resolve true; the weight is flat. For confessional balance, fixed name lists identify who is cited and the store judges whether both sides are represented |
| **D — Tiered presence** | Literary analysis (row 10), Gnostic over-emphasis (row 16), anti-supernatural (row 22), secular-materialist (row 23) | The store fires or does not; if it fires, the tier is chosen by category flags (literary analysis) or by the store's own strength verdict plus placement (Gnostic). Anti-supernatural and secular-materialist use the 7-dimension bias system split into embedding-detected markers and computed metrics |

Placement multipliers (shapes B and D) read the classifier's paragraph labels.
Every contribution remains an integer respecting its cap in section 9.

### 🎯 2.9 Passion sensitivity trigger

The `is_passion` category flag (10.6% of corpus) no longer gates a signal of its
own. It now acts as a **sensitivity trigger**: Passion articles are where
anti-supernatural framing, mythicist citation, and Gnostic over-emphasis are
most likely and most consequential, so the detectors for those signals are tuned
to fire more readily.

**Sensitivity raises detection likelihood; it does not change weights or caps.**
A Passion article and a non-Passion article that both fire a signal score
identically. The trigger only makes firing easier.

Applies to five signals:

| Row | Signal | What raised sensitivity means |
|---|---|---|
| 15 | Religious art | Picture test counts **any** rendered image (including infobox/gallery), not just substantive in-body pictures |
| 16 | Gnostic over-emphasis | `t_fire` and `t_strong` both lowered by the calibrated Passion margin so Gnostic passion/resurrection material reaches the privileged tier on weaker evidence |
| 21 | Mythicist bias | `t_fire` lowered so generic mythicist framing without a named author reaches the count threshold more readily. Placement multiplier and imbalance surcharge are unaffected |
| 22 | Supernatural-worldview criticism | `t_fire` and `t_asym` lowered so a computed dimension fires on a smaller asymmetry ratio |
| 23 | Secular-materialist presuppositions | `t_fire` lowered; scope already extended to Passion articles |

The Passion margin is **one calibrated number**, not five. It is fitted on the
Passion subset of the gold set under the same 0.80 precision floor that governs
the base thresholds. If lowering thresholds on Passion articles cannot hold that
floor, the margin is zero and these signals score Passion articles exactly like
any other.

---

## ⚖️ 3. Weights Table — Source of Truth & Key Files

Rows ordered by weight magnitude: strongest positive first, strongest negative
last. This order is **load-bearing** — the frontend 5×5 grid renders cells in
§9 order (top-left = earn points, bottom-right = lose points). Do not re-sort.

**Canonical weight spec:** `Wikipedia_alogrithm_refractor.md` §9.
`Wikipedia Articles - Reference.md` mirrors it but defers to §9 on disagreement.

| # | Signal | Weight | Detection | Key files |
|---|--------|--------|-----------|-----------|
| 1 | **Named manuscripts** | +2 per, capped +6; +8 flat for teachings/Bible books | Plain list lookup — 12-name fixed list (Codex Sinaiticus → Papyrus 75); generic "papyrus/codex/manuscript" mention = 1 | `rank_engine.py` L228–229, `extract.js` L41–48 |
| 2 | **Bible verses cited** | +3 per, capped +12 | Regex match on Book Ch:V patterns; deduplicated via Set | `rank_engine.py` L220, `extract.js` L21–25 |
| 3 | **Data/interpretation split** | +10 clear / −3 muddled / −5 one-sided / 0 unclassifiable | Vector — 3 FAISS stores (data-bucket, interpretation-bucket, register) label every body paragraph; separation ratio → tier | `rank_engine.py` L224–225, `classifier/scorer.py`, `classifier/labeler.py`, `classifier/stores.py`, `classifier/config.py` |
| 4 | **Commentary citations** | +1 per, capped +6; parable/teaching only | Plain list lookup — fixed series names (Anchor Bible, Hermeneia, NICNT, etc.) or "commentary" keyword | `rank_engine.py` L254–255, `extract.js` L33–35 |
| 5 | **Balanced debate** | +2 per pattern, capped +6; doubled to +12 with 2+ named reps | Vector (§3.1.2) — store encoding longevity language, named representatives, disagreement across data AND interpretation layers | `rank_engine.py` L247–251, `families/balanced_debate.py`, `exemplars/balanced-debate-positive.jsonl` |
| 6 | **Ante-Nicene authors** | +2 per, capped +6 | Plain list lookup — 10-name fixed list (Ignatius → Cyprian) | `rank_engine.py` L278, `extract.js` (anteNiceneCount) |
| 7 | **Archaeological site/artefact** | +2 flat; +8 for location articles with a hit | Associated term lookup — IAA/archaeolog-/excavat-/ossuary/inscription keywords | `rank_engine.py` L233–234, `extract.js` L37–39 |
| 8 | **Jewish context** | +2 per concept, capped +6 | Plain list lookup — 19-term keyword list (Second Temple, Pharisees, Qumran, Passover, Mishnah, etc.) | `rank_engine.py` L243, `extract.js` (jewishContextHits) |
| 9 | **Non-Christian ancient historians** | +2 per, capped +6; capped +3 for parables | Plain list lookup — 8-name fixed list (Josephus → Phlegon) | `rank_engine.py` L258–259, `extract.js` (ancientHistorianCount) |
| 10 | **Literary analysis** | +6 for parable/teaching/Bible-book; +4 for others | Vector (§3.1.9) — store trained on narrative criticism, rhetorical devices, genre conventions, intertextual allusion | `rank_engine.py` L262, `families/literary_analysis.py` |
| 11 | **Primary-source quotes** | +1 per quote, capped +4 | Blockquote count + long (40+ char) quoted spans | `rank_engine.py` L240, `extract.js` (primarySourceQuoteCount) |
| 12 | **Journal/book citations** | +1 per citation, capped +2 per type (journal and book cap independently) | Reference-list inspection — journal-ish (DOI, JSTOR, volume/issue) vs book-ish (ISBN, University Press) markers | `rank_engine.py` L237, `extract.js` L31–32 |
| 13 | **Maps and diagrams** | +1 per, capped +2 | DOM inspection — mapframe templates, location-map elements, SVG diagrams, captions with "map"/"diagram"/"plan"/"floor plan" | `rank_engine.py` L265, `extract.js` (mapsAndDiagramsCount) |
| 14 | **Wikipedia Good/Featured Article** | +1 flat | DOM inspection for GA/FA indicators (`#mw-indicator-*`) | `rank_engine.py` L268, `extract.js` (wikiQualityHit) |
| 15 | **Religious art** | −1 (picture, no diagram/map) / +1 (picture + diagram/map) / 0 (parable/teaching) | Context-conditional — evaluates image presence, diagram/map presence, and category together. Passion sensitivity uses wide-picture test | `rank_engine.py` L272–275, `extract.js` (hasPictureWide, hasPictureNarrow, hasDiagramOrMap) |
| 16 | **Gnostic over-emphasis** | −2 contextualised / −4 privileged; max −4 | Vector (§3.1.10) — trained on Gnostic-as-privileged-source passages. Scans all buckets (data, interpretation, footnotes). Placement feeds tier | `rank_engine.py` L283–284, `families/gnostic_over_emphasis.py` |
| 17 | **Confessional balance** | −3 outside interpretation / −1 inside without Evangelical contrast / 0 inside with one | Vector (§3.1.8) — reuses balanced-debate store. Fires when critical scholars present but no Evangelical counterpart in interpretation sections | `rank_engine.py` L288–297, `families/confessional_balance.py` |
| 18 | **Other-religion sources** | −3 flat | Plain list lookup — Islamic, Mormon, Buddhist, Hindu, Sikh, Jain, Rastafari, Bahá'í terms | `rank_engine.py` L300, `extract.js` (otherReligionHit) |
| 19 | **Jesus Seminar bias** | −3 per author, capped −6; × placement multiplier; further −2 if balanced debate = 0. Worst case −14 | Vector (§3.1.6) — fixed list (Funk, Crossan, Borg) for count; §3.1.1 classifier for placement. Stance-blind | `rank_engine.py` L304–308, `families/jesus_seminar.py` |
| 20 | **OT–NT continuity criticism** | −3 per pattern, capped −6 | Vector (§3.1.4) — 7-dimension bias detection on four schools (proof-texting, messianic divergence, Law abrogation, intertestamental evolution) | `rank_engine.py` L311–312, `families/ot_nt_discontinuity.py` |
| 21 | **Mythicist bias** | −3 per author, capped −7; × placement multiplier; further −2 if balanced debate = 0. Worst case −16 | Vector (§3.1.5) — fixed list (Carrier, Price, Doherty) for count; §3.1.1 classifier for placement. Stance-blind. Raised sensitivity on is_passion | `rank_engine.py` L325–329, `families/mythicist_framing.py` |
| 22 | **Supernatural-worldview criticism** | −2 per instance, capped −8 | Vector (§3.1.3) — 7-dimension system: embedding-detected markers + computed metrics. Miracle- AND Passion-scoped, section-aware | `rank_engine.py` L316–321, `families/anti_supernatural.py` |
| 23 | **Secular-materialist presuppositions** | −2 per term, capped −8 | Vector (§3.1.7) — same 7-dimension system, own database. Miracle- AND Passion-scoped, section-aware. No placement multiplier | `rank_engine.py` L335, `families/secular_materialist.py` |
| 24 | **Referencing quality** | −9 (0 refs) / +3 (1–4) / +1 (5–9) / 0 (10+); plus −1 for poor referencing | Ref count tiering + DOM inspection for "citation needed" tags / maintenance banners | `rank_engine.py` L339–341 + `_ref_quality_weight()` L611–625, `extract.js` (refCount, hasCitationNeeded) |
| 25 | **No Bible verse cited** | −10 flat | Bible verse regex count = 0 | `rank_engine.py` L344, `extract.js` (verseCount) |

**📌 Tie-break:** alphabetical by raw article title (before comma-to-hyphen substitution).
No verse-count or reference-count secondary keys — this is a deliberate simplification
(§12.2 of the refactor spec). Ties are expected; alphabetical ordering inside a
score-cluster is arbitrary by design, not a claim about relative quality.

---

## 📁 4. Key Files — Complete Map

### ⚙️ Scoring pipeline

| File | Role |
|---|---|
| `setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/rank_engine.py` | Scoring engine. Computes net_score from signals, writes all deliverable files, generates scoring-export.json. |
| `setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/extract.js` | Harvest script. Injected into Wikipedia pages via Headless Chrome. DOM + regex extraction of ~40 raw signal fields. |
| `database/scoring-export.json` | The shipped artifact. 253 articles × 25 signal contributions × signal dictionary. Committed to git, consumed by import script and frontend. |

### 🧪 Vector classifier

| File | Role |
|---|---|
| `setup/Wikipedia algorithm/classifier/scorer.py` | Separation ratio computation + tier assignment (+10/−3/−5/0). |
| `setup/Wikipedia algorithm/classifier/labeler.py` | Paragraph splitting, embedding, FAISS querying, label assignment (data/interp/neither/other). |
| `setup/Wikipedia algorithm/classifier/stores.py` | FAISS store management: Embedder (MiniLM ONNX), VectorStore, StoreManager (3 stores). |
| `setup/Wikipedia algorithm/classifier/config.py` | Thresholds: t_data=0.50, t_interp=0.50, t_sep=0.60, N_min=3, TOP_K=5, NN_NEGATIVE_THRESHOLD=0.75. |
| `setup/Wikipedia algorithm/classifier/export.py` | Batch export → bucket-labels.json. |

### 👪 Vector families (9 families, each in `families/`)

| File | Signal |
|---|---|
| `families/balanced_debate.py` | Row 5 — Balanced debate |
| `families/anti_supernatural.py` | Row 22 — Supernatural criticism |
| `families/ot_nt_discontinuity.py` | Row 20 — OT–NT criticism |
| `families/mythicist_framing.py` | Row 21 — Mythicist bias |
| `families/jesus_seminar.py` | Row 19 — Jesus Seminar bias |
| `families/secular_materialist.py` | Row 23 — Secular-materialist |
| `families/confessional_balance.py` | Row 17 — Confessional balance (reuses balanced-debate store) |
| `families/literary_analysis.py` | Row 10 — Literary analysis |
| `families/gnostic_over_emphasis.py` | Row 16 — Gnostic over-emphasis |

### 📚 Exemplars and vector stores

| Path | Contents |
|---|---|
| `exemplars/` | 22 JSONL files, 333 hand-authored exemplar passages (205 positive, 128 negative) |
| `vector-stores/` | FAISS indexes + JSONL sidecars (8 family stores + 3 utility stores). ~700 KB. |
| `vector-family-thresholds.yaml` | Calibrated thresholds per family (currently all defaults: t_fire=0.55, precision=0.0) |
| `calibration-sweep.json` | Grid-search results from calibrate.py |

### 🥇 Gold set (frozen ground truth)

| File | Contents |
|---|---|
| `gold-set-section-classifier.csv` | 39 articles with per-paragraph labels + tier assignments |
| `gold-set-vector-families.csv` | 197 rows across 10 families: per-article signal-fires judgement |
| `gold-set-negative-controls.csv` | 37 cases where old keyword detector misfired — regression test set |

### 🛡️ Import and validation

| File | Role |
|---|---|
| `api/scripts/import-wikipedia-scoring.js` | Validates and imports scoring-export.json into SQLite. Single transaction, all-or-nothing. |
| `api/tests/import-wikipedia-scoring.test.js` | 483-line test suite: deriveCap, validateContribution, validateArticle, purge-missing, pending-cap logic. |
| `api/tests/wikipedia-extraction.test.js` | Tests for extract.js signal harvesting (maps, religious art conditionals). |
| `api/tests/wikipedia-routes.test.js` | Route tests asserting encoded `E-*` error shape. |

### 🎨 Frontend

| File | Role |
|---|---|
| `frontend/assets/js/utils/wikipedia-signals.js` | SIGNAL_DICTIONARY (25 entries in §9 order), fulfilmentRatio, buildStatement. |
| `frontend/assets/js/wikipedia.js` | Grid rendering (buildGridWidget, 5×5 cells, colour intensity tiers), freshness line, copy button, keyboard navigation. |
| `frontend/assets/js/wikipedia.test.js` | Grid regression tests: cell classes, tooltip patterns, pending-cell treatment. |
| `frontend/assets/js/utils/wikipedia-signals.test.js` | 25 entries, renamed key/label, §9 order preservation. |

### 📄 Specification documents

| File | Role |
|---|---|
| `Wikipedia_alogrithm_refractor.md` | Hybrid tech spec. **Source of truth for §9 weights table**, architecture (§3), validation criteria (§11). |
| `Wikipedia Articles - Reference.md` | Three-stage pipeline spec (pool → select → rank). Mirrors §9; defers to refactor spec on disagreement. |
| `CLASSIFIER_SPEC.md` | Classifier design: stores, algorithm, schema. |
| `CLASSIFIER_CALIBRATION.md` | How thresholds were fitted: two-phase sweep, tier accuracy 0.303. |
| `VALIDATION_REPORT.md` | Calibration outcome: 0.303 vs 0.85 target, three failure modes, recommendation to proceed anyway. |
| `GOLD_SET_README.md` | Gold set structure and content. |
| `GOLD_SET_LABELLING_PROCEDURE.md` | How the gold set was built: 14 agents, single-rater, frozen labels. |
| `CATEGORY_FLAGS_VALIDATION.md` | Category flag detection rules and behavioural effects. |
| `extraction-signals.md` | Non-vector signal documentation from Plan 2 (extract.js). |

### 💾 Data files

| File | Contents |
|---|---|
| `candidate-pool.tsv` | 512 candidate articles (title, URL, ranking). |
| `excluded-titles.txt` | 22 permanently excluded titles. |
| `Wikipedia Articles.csv` | 253 ranked articles (title, URL, ranking) — comma→hyphen substituted, %2C-encoded URLs. |

---

## 🔐 5. Invariants

- **Σcontributions = net_score** for all 253 articles. Verified on every export write; import script rejects on mismatch.
- **25 signals always, 5×5 grid always.** No signal is removed even when pending. The grid geometry never changes.
- **§9 row order is load-bearing.** Signal dictionary, grid cell order, and the visual gradient (earn → lose) all depend on it.
- **Category flags are computed once per article.** Every downstream signal reads the same six booleans. A single flag error propagates silently.
- **Import is all-or-nothing.** Validation happens before any DB write. A single invalid article aborts the entire import.
- **The gold set is frozen.** Disagreement means the store gets revised, never the label.
- **The VPS has no scoring runtime.** All ML work happens offline. The only thing that ships is a validated JSON file.

---

## 📊 6. Ranking Mechanics

### 6.1 Net score computation

`net_score` = **plain integer sum** of all 25 signal contributions. No further
weighting, normalisation, or scaling. Every contribution is already capped and
already multiplied by any category conditional or placement multiplier that
applies before it enters the sum.

**Multiplier truncation:** where a placement multiplier produces a fraction, the
result **truncates toward zero** (a halved single mythicist hit is −1, not −2
and not −1.5). Truncation happens once, immediately after the multiplier, before
the contribution enters the sum.

Σcontributions must equal `net_score` exactly — verified at write time by the
export path and re-verified by the import script. A rounding step anywhere in
the pipeline is a bug.

### 6.2 Sort order and tie-break

Articles are sorted by `net_score` **descending**. Rank 1 = highest score; the
last rank equals the article count (currently 253).

**There is no tie-break signal.** Articles with equal `net_score` are ranked
alphabetically by raw article title (before the comma-to-hyphen substitution
applied to output files). The sort uses the composite key `(−net_score, title)`
so ranking is fully deterministic — it does not depend on row order in the
source data, dictionary iteration order, or sort stability.

Ties are expected; alphabetical ordering inside a score-cluster is arbitrary by
design, not a claim about relative quality.

### 6.3 Category-dependent maximum scores

Every article has a theoretical maximum determined by its category flags — the
highest score it could reach if every positive signal fired at its cap and every
negative scored 0. This is what the copy button's *"X of a possible Y"* line
reports.

| Category | Max | Key differences |
|---|---|---|
| **Teaching** | **85** | +8 manuscripts, +6 commentary, +6 literary analysis |
| **Location** | **82** | +8 archaeology (location bonus) |
| **Book (Bible)** | **80** | +8 manuscripts, +6 literary analysis; no commentary |
| **Parable** | **80** | +6 commentary, +6 literary analysis; reduced ancient-historian cap (+3) |
| **Other** | **76** | No category-specific bonuses |

Row 3 contributes +10 in all categories. Row 24 contributes 0 to the
theoretical maximum — reaching the commentary cap (+6, six citations) plus the
journal/book cap (+4) requires roughly ten or more references, which puts the
article in the 10+ tier at 0. The niche tiers (+3 at 1–4 refs, +1 at 5–9) exist
to lift *short* articles toward the ceiling, not to raise the ceiling itself.

---

## 🎨 7. Frontend Widget

The frontend renders every article's score as a **5×5 grid widget** on
`debate/wikipedia.html`. This section describes the widget's visual behaviour,
layout, and data contracts — all of which are current, implemented code.

### 7.1 5×5 grid rendering

- **25 cells always, 5×5 grid always.** One cell per signal, in §9 row order:
  left-to-right, top-to-bottom. Row 1 of the weights table is the top-left cell;
  row 25 is the bottom-right.
- The order is load-bearing: because §9 orders by weight magnitude (strongest
  positive first, strongest negative last), the grid reads as a visual gradient —
  top-left = earn points, bottom-right = lose points.
- The grid is a CSS Grid: `grid-template-columns: repeat(5, 1fr)`. It never
  reflows to a different column count. Only cell size changes by viewport.
- Cells are square with `var(--radius-sm)` corners; numbers use `--text-2xs`
  with tabular figures (`font-variant-numeric: tabular-nums`).

| Viewport | Cell | Gap | Grid total |
|---|---|---|---|
| ≥768px | 26px square | 3px | ~142px |
| <768px | 22px square | 2px | ~118px |

### 7.2 Cell display rules

**Positive cells** — show the number (no `+` sign). Blue intensity encodes
fulfilment via four CSS class tiers:

| Fulfilment | Intensity | Meaning |
|---|---|---|
| `≥ 0.95` | Brightest blue, `font-weight: 600` | Signal fired at its cap |
| `0.60 – 0.94` | Strong blue | Most available credit earned |
| `0.30 – 0.59` | Mid blue | Partial credit |
| `> 0 – 0.29` | Dimmest blue (still ≥4.5:1 contrast) | Minimal credit |

Fulfilment = `|contribution| / |cap|`, clamped 0..1. The brightness ramp is a
lightness/alpha ramp on a single hue (`--info`, `#3D4F6B`), not four unrelated
colours. Four tokens (`--grid-blue-1` … `--grid-blue-4`, dimmest → brightest)
are defined in `variables.css`.

**Negative cells** — show the number **with** its minus sign, in `--error`
(`#8B3D3D`) at a single intensity (no fulfilment ramp). `font-weight: 600` so
they draw the eye. A penalty is a penalty; graduating it by fulfilment would
imply a partial penalty is visually milder, which is the wrong reading.

**Empty cells** — no number displayed. Background one step darker than the
surrounding surface (`--bg-surface-alt`) with a faint `--border` outline.
Tooltip still fires on hover/focus showing the signal's name. A reader must be
able to discover what a cell *would* have measured, even when the article scored
nothing for it.

### 7.3 Document score panel

Sits immediately right of the grid, showing `net_score` — the plain sum of all
25 contributions. The number alone, no label, no suffix, `--text-lg`,
`font-weight: 600`, tabular figures.

Colour bands:

| Band | Score | Colour |
|---|---|---|
| **Green** | `≥ 50` | `--success` (`#3D5A3D`) |
| **Yellow** | `25 – 49` | `--warning` (`#8B6F3D`) |
| **Red** | `≤ 24` | `--error` (`#8B3D3D`) |

Colour applies to the number with a subtle tinted background at ~8% alpha and a
1px border at ~30% — a quiet chip, not a filled badge. The scholarly tone of the
site rules out a saturated block of colour. Colour is never the only signal
(WCAG): the number is always present and always legible.

Tooltip on hover/focus: `"Document score: <n>"`.

### 7.4 Tooltips

- **Content:** the signal's official name only. No weight, cap, count, or
  "not triggered" text. Full detail lives in the copy text and agent JSON.
- Styling: dark background (`--text-primary`), light text (`--bg-primary`),
  `var(--radius-sm)`, `var(--text-2xs)`, `--shadow-md`.
- Positioned above the cell; fades in with `translateY(4px) → 0`.
- Fires on **hover and keyboard focus** alike — every cell is keyboard reachable.
- **Touch devices get no tooltips** — gated on `@media (hover: hover) and
  (pointer: fine)`, not on viewport width. No tap-to-reveal, no long-press.
  The copy button provides more detail than any tooltip on one tap.

### 7.5 Copy format

The copy button (Feather `copy` icon, `.wikipedia-signal-copy`) produces plain
text with no markdown:

```
Pool of Bethesda — reliability score 54

Scored signals:
  Bible verses cited .................. +12  (full credit, cap +12)
  Data/interpretation split ............ +10  (clear split)
  ...

Not scored: Ante-Nicene authors, Scholarly commentary, ...

Net score: 54 of a possible 82 for this article type.
Source: thejesuswebsite.org/debate/wikipedia
```

Rules:
- Scored signals first, in §9 row order, contributions aligned.
- Unscored signals listed together at the end by name.
- The "possible" figure is the category maximum from §6.3.
- Success state: checkmark + `.is-copied` for 1.5s.

### 7.6 Agent JSON

An invisible `<script type="application/json" class="agent-data"
data-agent-readable="true">` block per article. **All 25 signals are present**,
including unfired ones (`"fired": false`, `"contribution": 0`). Key fields:

| Field | Description |
|---|---|
| `article` | Article title |
| `url` | Wikipedia URL |
| `rank` | Numerical rank (1–253) |
| `net_score` | Plain sum of all 25 contributions |
| `score_band` | `"green"` / `"yellow"` / `"red"` (so agents never re-implement the §7.3 boundary rule) |
| `category_maximum` | Category-dependent ceiling (§6.3) |
| `category_flags` | Array of active flags (e.g. `["is_location"]`) |
| `grid` | `{ "rows": 5, "columns": 5, "order": "weights_table_row_order" }` |
| `signals[]` | Array of 25 objects, each with `row`, `grid_position`, `key`, `name`, `contribution`, `cap`, `fulfilment`, `polarity`, `fired`, `statement` |

Contributions must sum exactly to `net_score` — verified at render time. A
mismatch is a bug and fails loudly in tests.

### 7.7 Page layout

The page uses a **row-based layout**: one row per article, with five CSS Grid
columns that align vertically down the whole page so grids form continuous
visual columns for at-a-glance comparison:

| Column | Width | Content |
|---|---|---|
| Rank | `2.5rem` fixed | Rank number, `--text-muted`, right-aligned |
| Title | `1fr` | Article title, linked, with external-link icon; truncates with ellipsis |
| Grid | `auto` fixed | The 5×5 signal grid (§7.1) |
| Score | `auto` fixed | Document score panel (§7.3) |
| Copy | `34px` fixed | Copy button |

Container: `max-width: 1100px`, centred.

**Column header row:** a single header sits above the first article row (`Rank` ·
`Article` · `Signals` · `Score`; copy column unlabelled). Renders at ≥768px only;
hidden below. Sits **outside** the `<ol>` (as a sibling `<div>`) so it doesn't
become list item 1. Marked `aria-hidden="true"` — it's a visual affordance only.

**Responsive breakpoints:**

| ≥1024px | Full five-column row |
| 768–1023px | Compressed row; title absorbs the loss; 22px cells |
| <768px | Stacked: title on line 1, grid + score + copy on line 2; grid stays 5×5 at 22px |

### 7.8 Accessibility

- The grid is a **table of values**, not decoration. Rendered with `role="table"`
  / `role="row"` / `role="gridcell"`, or as a real `<table>` with visually-hidden
  headers. A screen reader must be able to walk it.
- Each cell exposes an accessible name: `"<signal name>: <contribution>"`, or
  `"<signal name>: not scored"` when empty.
- **Roving tabindex:** one tab stop per grid; arrow-key navigation within.
  Keyboard users aren't forced through 25 stops per article.
- Colour is never the sole carrier of meaning: numbers are always printed, the
  band is always accompanied by its number, negatives always carry a minus sign.
- Every number at every intensity tier clears WCAG AA 4.5:1 contrast.
- `prefers-reduced-motion`: tooltip fades become instant. No other motion exists
  in the widget.
- The list remains semantically an `<ol>` — rank order survives for screen
  readers regardless of visual layout.

---

## 🚧 8. Pending Signals: Row 3 and Row 10

Two of the 25 signals — `data_interp_split` (row 3) and `literary_analysis`
(row 10) — are **structurally unable to score above 0** for any article.
Neither has a keyword fallback. Both are purely vector/classifier signals.

### 📊 Row 3 — Data/interpretation split (+10 / −3 / −5 / 0)

**What it's supposed to do.** This is the dominant matrix signal — the axis the
whole rubric is built on. A three-store classifier (MiniLM ONNX + FAISS)
labels every body paragraph as `data`, `interpretation`, or `neither`, computes
a separation ratio, and assigns a tier: +10 for a clean split between data and
interpretation blocks, −3 when both are present but interleaved, −5 when only
one side is present, 0 when there aren't enough class-bearing paragraphs.

**Why it scores 0.** The classifier's tier accuracy is **0.303 (10/33)** against
a required ≥0.85 gate (`VALIDATION_REPORT.md`, `Issues.md` #141). MiniLM cosine
similarities against the exemplars cluster too tightly (0.45–0.65) to threshold
cleanly. Three failure modes: data paragraphs undetected (~30%), separation
ratio too low (~30%), too few class-bearing paragraphs (~20%). The two
artifacts it depends on — `bucket-labels.json` (Plan 4) and
`vector-family-scores.json` (Plan 5) — do not exist on disk.

**What blocks activation.**
- Produce `bucket-labels.json` via the classifier pipeline, clearing the §11.2
  gate: ≥0.85 paragraph-level agreement AND ≥0.85 correct tier assignment on
  the 40-article gold set.
- This likely requires a stronger embedding model (MiniLM's 0.45–0.65 cluster
  is too narrow), expanded exemplar sets, and re-labelling with matched
  segmentation.

### 📖 Row 10 — Literary analysis (+6 / +4)

**What it's supposed to do.** A single vector-embedding store trained on
literary-analysis passages — narrative criticism, rhetorical devices (inclusio,
chiasm, parallelism), genre conventions, intertextual allusion, reader-response,
form-critical segmentation. Tiered by article category: +6 for
parable/teaching/Bible-book articles, +4 for all others.

**Why it scores 0.** The literary-analysis vector store has never been run
against the full article set. Its family reports precision 0.0 in
`vector-family-thresholds.yaml` — below the 0.80 floor — so it falls back to
keyword, but no keyword fallback exists (it's a genuinely new signal with no
v1 equivalent). The artifact it depends on — `vector-family-scores.json` — does
not exist on disk.

**What blocks activation.**
- Produce `vector-family-scores.json` with `literary_analysis` entries from the
  family pipeline (Plan 5), clearing the §11.4 gate: ≥0.80 precision floor on
  the literary-analysis gold set (20–30 articles).
- The `rank_engine.py` loader already reads the artifact when present —
  activation means producing the file, not rewriting the loader.

### 🛠️ How the system handles both

- Both keys remain full members of `KNOWN_SIGNAL_KEYS` (25 entries) and
  `SIGNAL_DICTIONARY`.
- Both are listed in `PENDING_SIGNAL_KEYS` in the import script, exempting them
  from the all-zero integrity check (every other signal must have ≥1 non-zero
  value across the corpus or the import aborts).
- `data_interp_split`'s cap stays at **+10** while the `data_interp_pending`
  flag is true — the real weight counts toward `max_possible` despite scoring 0.
  `literary_analysis`'s cap is derived unconditionally from category flags
  (pending or not) so its weight also counts toward the ceiling.
- Both render as ordinary empty cells in the 5×5 grid — identical styling and
  tooltip to any signal that simply didn't fire. The distinction between
  "pending" and "measured, didn't fire" lives only in documentation.
- The activation checklist in §9 of `Wikipedia_alogrithm_refractor.md` records
  exactly what must happen before either signal produces real contributions.
- `Issues.md` #141 (classifier accuracy) remains open — this plan does not fix
  the classifier, it makes the pending state honest and reproducible.
