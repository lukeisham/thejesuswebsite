# The Wikipedia Algorithm — How It All Works

*Synthesis report, 2026-07-29. Based on parallel research across code, plans, specs, issues, and lifecycle, plus direct verification of the shipped data.*

---

## 0. The one-sentence version

The Wikipedia algorithm scores 254 Wikipedia articles about Jesus against a
25-signal rubric and publishes them as a ranked reliability list. The scoring
runs **entirely offline on the dev machine**; the VPS only imports a JSON file.
The v2 refactor replaced keyword detectors with vector-embedding classifiers
across seven plans — all seven shipped — but **the vector half is not actually
producing the live numbers.** The site today renders a v2-shaped grid filled
with v1-derived values.

That gap is the headline finding, and §4 is about it.

---

## 1. Architecture: the offline/online split

This is the single most important structural fact, and it explains almost every
other design decision.

```
DEV MACHINE (Python, ~265 MB of ML deps)          VPS (Node, no Python scoring)
─────────────────────────────────────────         ─────────────────────────────
candidate-pool.tsv ─┐
excluded-titles.txt ┘
        │
        ▼  Wikipedia parse API (offline, manual)
   extract.js ──────────► raw non-vector signals
        │
        ▼
   classifier/  (MiniLM ONNX + FAISS)
        ├─ paragraph labels ──► bucket-labels.json      ✗ NOT GENERATED
        └─ families/         ──► vector-family-scores.json ✗ NOT GENERATED
        │
        ▼
   rank_engine.py  ──► database/scoring-export.json ──git──► deploy.sh
                                                              │
                                                              ▼
                                              import-wikipedia-scoring.js
                                                              │
                                                    wikipedia_articles
                                                    wikipedia_article_signals
                                                              │
                                                              ▼
                                                  GET /api/wikipedia
                                                              │
                                                              ▼
                                              frontend/debate/wikipedia.html
                                                    (5×5 grid widget)

                                              vector-sidecar/ (FastAPI :8901)
                                              ── serves POST /wikipedia/signal-check
                                                 live, for editorial spot-checks only
                                                 NOT part of the scoring path
```

**Why it's split this way.** Refactor spec §3.2 caps the ML dependency footprint
and forbids shipping a scoring runtime to the VPS. The VPS has no Python
scoring, no model, no FAISS in the scoring path. Scoring is a developer action
whose only output is a committed JSON file. This is a deliberate and, I think,
correct call — it makes production deterministic and keeps a 265 MB ML stack off
a small server.

**The consequence people underestimate:** there is no feedback loop. Nothing on
the VPS can detect that a score is wrong, stale, or that the classifier that
produced it was never run.

---

## 2. The rubric (25 signals)

Rows are ordered by weight magnitude — strongest positive first, strongest
negative last — and the grid widget renders them in exactly that order, so the
top-left of each grid is where an article earns points and the bottom-right is
where it loses them. That ordering is load-bearing, not cosmetic.

**Positive:** bible_verses (+12), narrative_interp_split (+10/−3/−5/0),
manuscripts (+6/+8), commentaries (+6), balanced_debate (+6/+12), ante_nicene
(+6), arch_site (+2/+8), jewish_context (+6), ancient_historians (+6/+3),
literary_analysis (+6/+4), primary_quotes (+4), journal_or_book (+4),
maps_diagrams (+2), wiki_quality (+1), religious_art (±1/0).

**Negative:** gnostic_over_emphasis (−4), confessional_balance (0/−1/−3),
other_religion (−3), jesus_seminar (−6), ot_nt_criticism (−6), mythicist (−7),
supernatural_criticism (−8), secular_materialist (−8), referencing_quality
(−9…+3), no_bible_verse (−10).

Six category flags gate the conditional caps — `is_location` (18.4% of corpus),
`is_teaching` (16.1%), `is_parable` (16.1%), `is_miracle` (11.4%), `is_passion`
(10.6%), `is_bible_book` (4.3%), with 27.1% carrying no flag. They're detected
once in `extract.js` and every downstream signal reads the same six booleans.

**The invariant that holds:** Σcontributions = net_score, for all 254 articles.
I checked this directly — zero violations. The import script enforces
|contribution| ≤ |cap| with matching sign, validates all 254 articles before any
write, and commits in a single transaction. This part of the system is genuinely
solid.

---

## 3. Life cycle of one article

| # | Stage | Mechanism | Automated? |
|---|-------|-----------|-----------|
| 1 | **Selection** | Hand-curated `candidate-pool.tsv`; `excluded-titles.txt` blocks 22 titles | Manual by design |
| 2 | **Fetch** | Wikipedia parse API, 3 retries w/ backoff, 30s timeout, dev machine only | Manual |
| 3 | **Extract** | `extract.js` → keyword/list signals; `ParagraphExtractor` strips citations, drops <5-word paras | Manual trigger |
| 4 | **Classify** | MiniLM ONNX → FAISS top-5 → paragraph labels → separation ratio → tier | **Built, not run** |
| 5 | **Score** | `rank_engine.py` merges signals, applies caps, sorts by (−score, title), ranks 1–254 | Manual trigger |
| 6 | **Persist** | `deploy.sh` → `import-wikipedia-scoring.js` → upsert by URL, signals delete-and-reinsert | **Automated on deploy** |
| 7 | **Review** | Admin toggles `published_draft` 0→1 in `admin/wikipedia/` | Manual, single click |
| 8 | **Publish** | `GET /api/wikipedia` → client-rendered grid. No static pages generated | Automated |
| 9 | **Refresh** | — | **DOES NOT EXIST** |
| 10 | **Delete** | `DELETE /api/wikipedia/:id`, signals cascade. Hard delete, no audit trail | Manual |

### Stage 9 is a real hole

`wikipedia_article_latest_revision_date` exists in the schema and is *never
written by anything*. There is no polling, no cron, no revision comparison, no
staleness flag. Wikipedia articles change constantly; the scores here are frozen
at whenever someone last ran the pipeline by hand.

Worse, the "Last updated" line the frontend shows users is derived from
`created_at` — when the row was inserted into *this* database — not from
Wikipedia's revision date. So the site displays a freshness claim that is not a
statement about the underlying articles at all. For a project whose entire
premise is source reliability, that's the most reputationally exposed detail in
the system.

### Stage 7 is thinner than it looks

There is no approval queue, no multi-step sign-off, no reviewer record. Draft →
published is one button. Given that the scores are algorithmically generated and
currently partly wrong (§4), the human checkpoint is the only thing standing
between a bad score and publication — and it carries no state to show whether
anyone actually looked.

---

## 4. The central finding: v2 shipped, v2 isn't running

The research agents split on this — one reported "Plans 1–9 committed, live,"
another reported "Plan 6 blocked, still 28-key, held back from main." **Both are
wrong.** I checked the shipped artifact.

`database/scoring-export.json` is **25-key, 254 articles, internally
consistent** — the migration did land (commit `06329af`). But its own `meta`
block records how:

> "migrated from 28-key export, 2026-07-17, via wikipedia-v2-06 **best-effort
> dormant-fallback re-scoring**"
>
> "narrative_interp_split (row 3), literary_analysis (row 10), maps_diagrams
> (row 13), and religious_art (row 15) score 0 for every article pending real
> Plan 4/5 vector data"

Verified signal distributions across the 254 live articles:

| Signal | Non-zero | Reality |
|---|---|---|
| `narrative_interp_split` (+10, **row 3**) | **0 / 254** | Dead. The classifier never ran. |
| `literary_analysis` (+6) | **0 / 254** | Dead. |
| `mythicist` (−7) | 207 / 254 | −2 for **196** of them |
| `jesus_seminar` (−6) | 221 / 254 | −2 for **187** of them |
| `confessional_balance` (−3) | 58 / 254 | Single value, −3 only |
| `gnostic_over_emphasis` (−4) | 64 / 254 | Single value, −2 only |
| `balanced_debate` (+6/+12) | 49 / 254 | Genuine spread |
| `bible_verses` (+12) | 247 / 254 | Genuine spread; 204 at cap |

Read the middle rows carefully. `mythicist` and `jesus_seminar` are not
measuring nine dimensions of framing with placement multipliers and imbalance
surcharges — they are pinned to a single value on ~75% of the corpus. That is
the signature of a keyword detector counting a name and multiplying, which is
exactly what the dormant v1 fallbacks do. `confessional_balance` and
`gnostic_over_emphasis` are binary. The elaborate Shape-A/B/C/D combination
functions in the spec are not producing these numbers.

`bucket-labels.json` and `vector-family-scores.json` — the two artifacts Plans 4
and 5 exist to produce — **are not on disk.** Nothing in the codebase reads them.

### So what is actually live

- **The v2 rubric** — yes, 25 keys, correct caps, validated. Real.
- **The v2 widget** — yes, 5×5 grid, colour intensity, WCAG AA. Real.
- **The v2 import path** — yes, validated, transactional. Real.
- **The v2 *intelligence*** — no. Keyword detectors wearing a v2 schema.

And row 3 — the signal the refactor spec calls "the dominant matrix through
which every article is measured," "the axis the whole rubric is built on," worth
+10, more than any signal but one — **contributes exactly zero to every ranking
on the site.** The ranked list users see was produced without the thing the
refactor was for.

### Why it stalled: the model can't do the job

Section classifier tier accuracy is **0.303 (10/33)** against a required ≥0.85
(Issue #141, `VALIDATION_REPORT.md`). The root cause is stated plainly: MiniLM
cosine similarities against the exemplars cluster in **0.45–0.65**, too tight to
threshold cleanly. Failure modes: data paragraphs undetected (~30%), separation
ratio too low (~30%), too few class-bearing paragraphs (~20%).

Per-paragraph agreement was never measured at all — the gold set was labelled on
rendered Wikipedia while the classifier reads parse-API HTML, so paragraph
counts don't even align (Gospel of Mark: 46 vs 48), and the classifier's
positional rule forces the lede to `other` where the gold set labels it
`data`/`interpretation`, guaranteeing mismatch by construction.

All nine vector families report **precision 0.0** in
`vector-family-thresholds.yaml` — below the 0.80 floor — so every one of them
falls back to keyword by design. The fallback machinery works correctly. It's
just that *everything* is falling back.

Worth naming: the decision to proceed past a hard gate was taken explicitly and
documented, on the reasoning that 0.303 beats a 0.25 random baseline and the
labels are "directionally correct" enough for coarse ×2/×0.5 placement
multipliers. That's defensible as an engineering call. What makes it risky is
that the shortfall is now three layers deep — in `VALIDATION_REPORT.md`, in
`Issues.md #141`, and in a `meta.note` — and nowhere near the ranked list a
reader sees.

---

## 5. The vector sidecar is not what it sounds like

`vector-sidecar/` (FastAPI, :8901, pm2, lazy-loaded FAISS) is live on the VPS
and serves `POST /wikipedia/signal-check`. It is **not part of scoring.** It
takes free text plus a family name and returns nearest exemplars with a
fire/no-fire verdict, for editorial spot-checking.

This is a pivot worth understanding: Plan 9 originally proposed a related-
articles feature, which was abandoned mid-implementation on discovering the
FAISS stores hold ~330 hand-authored calibration exemplars, **not per-article
embeddings**. No per-article embedding store exists anywhere in the system. So
the sidecar can answer "does this paragraph look mythicist?" but cannot answer
"which articles resemble this one." Any future similarity or recommendation
feature needs a new embedding pipeline from scratch.

Its two deploy bugs are both fixed and both instructive: the rsync step was
redundant once the code moved into git (`aa7179f`), and pm2 crash-looped because
it defaults to the `node` interpreter for extension-less files and choked on
uvicorn's shebang — fixed with `--interpreter none` (`6d881a7`).

---

## 6. Everything else that's open

**Blocking the refactor's actual purpose:**
- **#141** — classifier at 0.303 vs 0.85 gate. The root blocker.
- **#142** — Plan 6 can't produce real data without Plan 4/5 outputs. Partially
  stale as written (migration did land via fallbacks) but the substance stands.
- **#139/#143/#144/#145** — `Wikipedia Articles.csv` and two other deliverables
  live only on an unmounted Dropbox path. The authoritative ranked-255 source
  **cannot be regenerated on this machine.** This is a bus-factor problem sitting
  underneath everything else.

**Correctness:**
- **#138** — dormant fallbacks lost heading-based section scoping, so they now
  scan full article text. Since these fallbacks are what's *actually running*,
  this is not a hypothetical: the live mythicist/Jesus-Seminar/secular-materialist
  numbers are computed without placement scoping and are less precise than v1's
  were. This should be reclassified from "design warning" to "active accuracy
  defect."
- **#140** — "Historical reliability of the Gospels" and "Historicity of the
  Gospels" are byte-identical but ranked separately (117–118). One duplicate was
  already removed to get 254; this pair remains.
- **#134** — ES module imports are never cache-busted but served
  `immutable, max-age=31536000`. A stale JS module can persist for up to a year
  and survive normal reloads.

**Hygiene:**
- **#137/#148** — pre-existing Wikipedia routes use raw `res.status(500).json()`
  instead of the canonical `sendError`/`error-codes.js` layer.
- **#112** — FTS triggers dropped in migration 032 on a false premise; search
  index goes stale and 500s on fresh databases. Unrelated to Wikipedia but real.
- Dependency footprint ~265 MB against a ~200 MB ceiling — the ONNX download was
  FP32, not int8. Quantising would cut the model 87 MB → ~23 MB and bring the
  total to ~201 MB.

---

## 7. What I'd do, in order

1. **Fix the "Last updated" line first.** It's a one-line change and it's the
   only issue here that misleads readers rather than developers. Either surface
   `wikipedia_article_latest_revision_date` honestly or relabel it as the site's
   own import date.

2. **Get `Wikipedia Articles.csv` off Dropbox and into the repo.** Everything
   downstream is unreproducible until the authoritative source is on a machine
   that can actually run the pipeline. Nothing else is worth doing first.

3. **Decide about row 3, explicitly.** Three honest options: (a) invest in the
   classifier — bigger exemplar sets, re-label the gold set with matched
   segmentation, try a stronger embedding model, since 0.45–0.65 clustering
   suggests MiniLM is genuinely under-powered for this distinction; (b) ship row
   3 as permanently 0 and drop it from the rubric and grid so 25 cells means 25
   live signals; (c) fall back to a heading heuristic for row 3 specifically,
   accepting it's worse than the vector ideal but better than zero. What isn't
   viable is the status quo, where the rubric's stated central axis is silently
   inert and the grid shows a permanently empty cell users can't interpret.

4. **Re-scope #138 as an accuracy bug and restore placement scoping** to the
   dormant detectors — they're the live scoring path, so their precision is the
   site's precision.

5. **Surface the provenance.** The `meta.note` is exactly right and completely
   invisible. If four of 25 signals are structurally zero and the rest come from
   fallbacks, the methodology page should say so. The draft blog post presents
   the algorithm as a 25-weight vector-informed system; as of today that
   describes the design, not the deployment.

---

## 8. Honest summary

The engineering discipline here is high. The offline/online split is a good
call. The import path validates everything before touching the database and
commits atomically. The fallback architecture is exactly what you'd want —
per-family precision floors, silent degradation, no crashes. The widget is
accessible and well-specified. The gold sets are frozen and not retrofitted to
agree with their own output, which is a real methodological virtue that plenty of
ML projects skip.

The problem is that the safety net worked so well it became invisible. Every
family fell through to fallback, the flagship signal produced nothing, and the
system kept running and shipping numbers that look identical in shape to what
v2 promised. Seven plans are marked complete. The refactor's actual objective —
replacing keyword matching with semantic understanding — has not been achieved
in production, and nothing in the running system says so.

That's the thing to fix before anything else gets built on top of it.
