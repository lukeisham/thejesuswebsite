---
name: "!TheJesusWebsite-Wikipedia"
description: >
  Maintain the ranked Wikipedia-article list for The Jesus Website
  (Memory/Long-Term/The-Jesus-Website/Wikipedia/). If the list is below the article-count ceiling (currently 255),
  crawl Wikipedia for more qualifying articles per the documented pool/selection criteria, score and
  rank the additions, and merge them in. If the ceiling is already met, skip collection entirely
  and just check the existing files for internal consistency. Also handles permanently excluding
  a named article on request (removes it from the live list too, not just a denylist entry). Read
  this when Luke asks to "top up the Jesus website list", "add more Jesus wiki articles", "check
  the Jesus article ranking", "exclude this article from the Jesus list", or references Wikipedia
  Articles.csv / Wikipedia Articles - Reference.md in that folder. One of three parallel trackers
  under The-Jesus-Website/ — see also `!TheJesusWebsite-Challenges` for the Popular/Academic
  Challenges trackers (siblings, not this skill's scope).
type: Skill
status: Active
domain: Church
intent: "Keep The Jesus Website's 255-article Wikipedia list topped up and internally consistent without re-doing finished work — collect+score only what's missing, otherwise just verify; handle one-off named exclusions cleanly."
version: 2.0.0
dependencies: [scripts/rank_engine.py, scripts/extract.js, "Wikipedia Articles - Reference.md", vector-family-thresholds.yaml, gold-set-section-classifier.csv, gold-set-vector-families.csv, gold-set-negative-controls.csv, excluded-titles.txt, candidate-pool.tsv, wiki-bulk-paste.txt, scoring-export.json]
calibration:
  context: Church
  level: Extended
  scope: Local
memory_footprint:
  read: [Memory/Long-Term/The-Jesus-Website/Wikipedia]
  write: [Memory/Long-Term/The-Jesus-Website/Wikipedia]
---

## ⚡ TRIGGER
Primary: `!TheJesusWebsite-Wikipedia`
Fires when: Luke asks to top up, refresh, extend, re-check, or audit the Jesus/Gospels Wikipedia
article list, or references any file in `Memory/Long-Term/The-Jesus-Website/Wikipedia/`.
Scope: that one folder only — `Memory/Long-Term/The-Jesus-Website/Popular Challenges/` and
`Academic Challenges/` belong to the sibling skill `!TheJesusWebsite-Challenges`, not this one.
Full method and rationale live in `Wikipedia Articles - Reference.md` (same folder) — this skill is
the repeatable engine that follows it; read that file's Stage 1/2/3 sections before the first run
of a session, since it is the source of truth for the pool/selection criteria and the scoring
weights, not this skill.md. Note: the §9 weights table's *detection method*
per signal (keyword lookup vs. vector store) is documented in the refactor
spec (`Wikipedia_alogrithm_refractor.md` in `setup/Wikipedia algorithm v2/`),
not duplicated in Reference.md; when debugging a specific signal's
*detection logic* (as opposed to its weight), consult the refactor spec too.

## 🛠️ LOGIC

STEP 0 — NAMED EXCLUSION REQUEST (separate from the top-up/check flow below; run instead of it
  when Luke names one or more specific articles to permanently exclude).
  RUN `python3 "System/Skillbank/Church/!TheJesusWebsite-Wikipedia/scripts/rank_engine.py" exclude "<Title 1>" "<Title 2>" ...`
  using the exact title(s) as they appear in `Wikipedia Articles.csv`. This appends to
  `excluded-titles.txt` and removes any matching row from all three deliverable files in one step —
  never leave a title in the live list that's also on the denylist (STEP 1's check would flag it).
  This will drop the row count below the ceiling — follow up with STEP 1 onward to top back up,
  unless Luke only asked for the exclusion itself.
  If Luke wants a title removed but NOT permanently banned (it could come back in a future
  top-up), use `... rank_engine.py remove "<Title>" ...` instead — same effect on the live data,
  but nothing is written to `excluded-titles.txt`.

STEP 0b — WEIGHT-TABLE CHANGE (run instead of the flow below when Luke changes the Stage 3
  scoring criteria itself — new signal, changed weight, removed signal — rather than asking about
  specific articles).
  1. Update all six places a weight-table change touches before `rescore` is safe to run:
     (a) the §9 weights table in the v2 `Wikipedia Articles - Reference.md`;
     (b) the matching detection logic in `scripts/extract.js`;
     (c) the scoring formula in `scripts/rank_engine.py`
        (`net_score_from_signals`, `DETAIL_FIELDS`, `row_from_signals`,
        `detail_row_to_internal`);
     (d) the vector-store threshold config file (`vector-family-thresholds.yaml`:
        `t_fire`, `t_strong`, `t_asym`, `t_sep`, and the Passion margin)
        for any vector-scored signal being changed;
     (e) the gold-set label files (the acceptance criteria in §11.4 must
        be re-checked against the frozen labels before a rescore is
        trusted — a weight change does not require re-labelling, but
        the criteria must be re-verified);
     (f) the per-family vector-store index itself, if the change alters
        what the store should fire on (re-seeding/re-embedding, not
        just re-weighting).
     A change is not safe to `rescore` under until every applicable one
     of these six has moved.
     Note: heading-based section bucketing (the old heading-pattern
     classifier in `scripts/extract.js`) is retired. The vector
     classifier (§3.1.1 of the refactor spec, `setup/Wikipedia algorithm
     v2/`) is the sole bucketing authority for the whole rubric; its
     paragraph labels feed every placement-sensitive signal. It has
     no per-signal detection logic to "move together" the way
     individual weights do — it is calibrated once, separately,
     against its own 40-article gold set (§11.2), and any change to
     its behaviour requires re-validating every placement-sensitive
     signal downstream, not just the classifier itself.
  2. RUN `python3 "System/Skillbank/Church/!TheJesusWebsite-Wikipedia/scripts/rank_engine.py" rescore`
     — this fully re-harvests and rescores EVERY currently-present article from scratch under the
     new rubric (it does not reuse old signals the way `add` does), so the whole list stays judged
     on one consistent scale rather than mixing old-rubric and new-rubric scores. It's resumable
     via `.rescore-progress.jsonl` if interrupted — just re-run the same command.
  3. Continue to STEP 1 as normal afterward (a rescore doesn't change the row count, but if it was
     run alongside removals/exclusions in the same request, top back up per STEP 2 onward).

STEP 1 — CHECK THE CEILING.
  RUN `python3 "System/Skillbank/Church/!TheJesusWebsite-Wikipedia/scripts/rank_engine.py" check`
  This reads `Wikipedia Articles.csv` + `Wikipedia Articles - Scoring Detail.csv`, confirms the two
  files agree on which titles exist and that `ranking` matches a fresh sort of the Scoring Detail
  table by the composite key `(−net_score, raw_title)` — descending net score,
  ties broken alphabetically on the unmodified article title (no tie-break
  signal; the three-rule tie-break of verse count → reference count →
  alphabetical is retired per refactor spec §12.2), confirms no title on `excluded-titles.txt` has
  crept back in, AND confirms `wiki-bulk-paste.txt` — the pipeline's plain-text end point — matches
  what `Wikipedia Articles.csv` currently says. It is read-only — never writes.

  MATCH result:
    CASE exit 0 AND row count >= 255 (ceiling met) →
      Report the check result to Luke. DONE — no collection needed. This is the "sufficient to
      meet the ceiling" path: skip straight to STEP 5.
    CASE exit 0 AND row count < 255 (below ceiling) →
      Continue to STEP 2 — top up the shortfall (target_new = 255 − current count).
    CASE exit 1 (inconsistency found) →
      STOP. Report every issue printed verbatim to Luke. Do NOT auto-repair, do NOT proceed to
      collection — a mismatch usually means a manual edit needs reconciling first. Fail closed.

STEP 2 — POOL (only when below ceiling; mirrors Reference.md Stage 1).
  Read `candidate-pool.tsv` (title\turl per line) — this is the cached pool from the original
  crawl, kept for reuse so a top-up doesn't need to re-crawl every time.
  FILTER out any title already in `Wikipedia Articles.csv` and any title in `excluded-titles.txt`.
  IF the remaining cached pool has enough eligible candidates (after STEP 3's filter) to cover
  target_new → use it, skip the fresh crawl below.
  ELSE → crawl for more via `!HeadlessChromeBrowser`, using the same seed categories and depth
  documented in Reference.md Stage 1 (`Category:Jesus`, `Category:Gospels`, and their Nativity /
  Ministry / Passion / Resurrection / Apostles / Synoptic / John / Parables / Miracles
  subcategories — do NOT seed Apocryphal/Gnostic gospel categories, Stage 2 excludes that whole
  category so crawling it is wasted effort), PLUS location-focused sources — a category-only crawl
  has previously missed place articles entirely (Bethlehem, Nazareth, Jerusalem, Capernaum, etc.
  were absent for several runs), so a location gap can resurface; the `New Testament places
  associated with Jesus` article's link graph is a good single source for this. APPEND every
  newly-discovered `title\turl` pair to `candidate-pool.tsv` (de-duplicated) so future runs
  benefit from this crawl too.

STEP 3 — SELECT (only when below ceiling; mirrors Reference.md Stage 2 — judgment, not a script).
  Apply the exact inclusion/exclusion table in Reference.md Stage 2 to the pool from STEP 2 — read
  it fresh each time rather than trusting this summary, since it's the source of truth and can
  change. As of this writing: exclude talk/disambiguation pages, ALL apocryphal/Gnostic gospels (no
  exception for well-known ones), theological/doctrinal topics, Jesus-in-popular-culture,
  Jesus-in-other-religions, and irrelevant/mis-tagged results; include EVERY qualifying miracle,
  parable, and obscure Passion event in full — no trimming for redundancy. This step is agent
  judgment, same as the original build — do not skip it or wave every pool candidate through.
  Select up to target_new titles this way. IF fewer than target_new eligible candidates exist even
  after a fresh crawl → take however many qualify, do not pad with lower-quality picks, and report
  the shortfall to Luke (this mirrors the Notes/caveats warning in Reference.md that the pool may be
  close to exhausted).
  WRITE the selected `title\turl` pairs to a scratch file, one per line, tab-separated.

STEP 3b — LUKE REVIEW GATE (mandatory — never proceed to STEP 4 without it).
  Present the full selected candidate list (titles, grouped sensibly — e.g. miracles / parables /
  people / places / events / scholarship) to Luke IN CHAT and wait for his response. This is an
  iterative gate, not a one-shot approval:
    - Luke may strike titles → drop them (add to `excluded-titles.txt` only if he says the
      exclusion is permanent; otherwise just leave them in the pool for future consideration).
    - Luke may ask for more / different candidates → cycle back to STEP 2 (widen or re-crawl) and
      STEP 3 (re-select), then present the revised list again. Repeat as many rounds as needed.
    - Only when Luke explicitly approves the list → continue to STEP 4 with the approved titles
      exactly as approved (no additions after approval).
  If Luke is unreachable, fail closed: leave the scratch file in `Sandbox/`, write nothing to the
  live data, and report where things stand.

STEP 4 — HARVEST, SCORE, MERGE, WRITE (deterministic — the script does this part).
  RUN `python3 "System/Skillbank/Church/!TheJesusWebsite-Wikipedia/scripts/rank_engine.py" add --input <scratch file>`
  This opens each new URL via `!HeadlessChromeBrowser`, extracts the Stage-3 signals (25 as of
  v2.0.0 — Bible verse citations and named manuscripts (unchanged keyword
  lookups), the data/interpretation split (now the vector classifier's
  tiered +10/−3/−5/0 output, replacing heading-based section split),
  archaeology and Jewish context (unchanged keyword lookups), balanced
  debate and the criticism/negative-author families (now vector-scored
  per refactor spec §3.1.2–§3.1.10, still placement-multiplied using the
  classifier's labels), plus three signals new or substantially refactored
  from v1: literary analysis (§9 row 10, genuinely new), religious art
  (§9 row 15, previously context-conditional, now refactored with Passion
  sensitivity and narrow/wide picture gating), secular-materialist
  presuppositions (§9 row 23, genuinely new — no v1 counterpart), and
  maps and diagrams (§9 row 13, already existed but now explicitly named) — the full list is Reference.md's §9 weights table, with per-signal
  detection methods (keyword vs. vector) documented in the refactor spec), computes the net score per that weight table, merges the new rows
  with the existing already-scored rows (reusing their stored signals — never re-harvests
  what's already scored).
  Before any signal is scored, the §3.1.1 vector classifier runs once
  per article and labels every body paragraph data/interpretation/other;
  every other placement-sensitive signal (balanced debate, Jesus Seminar,
  mythicist, OT–NT continuity, confessional balance, religious art
  sensitivity) reads those labels rather than re-deriving them from
  headings. If the classifier fails its own acceptance gate (§11.2/§11.4)
  for an article, that article's whole score is invalid, not just the
  split signal.
  The pipeline then resorts everyone by the composite key `(−net_score, raw_title)`, renumbers
  `ranking` 1..N, and rewrites `Wikipedia Articles.csv` (comma-in-title → hyphen, comma-in-URL →
  `%2C`, per Reference.md's List Processing section), `Wikipedia Articles - Scoring Detail.csv`, AND
  `wiki-bulk-paste.txt` — the plain-text "title, url, rank" end point of the whole pipeline. All
  three are rewritten together on every `add` run (even a no-op one with nothing new to add) so
  they can never drift out of sync with each other.

  Dormant keyword fallbacks: each vector-scored signal family keeps its
  pre-refactor keyword detector in `scripts/extract.js` behind a
  per-family flag (`DORMANT_FALLBACKS`), inactive by default. A family
  only falls back to its dormant detector if it fails the 0.8 precision
  floor on its gold set (§11.4); the fallback still reads the vector
  classifier's paragraph labels for placement rather than reviving
  heading-based bucketing.

  Passion sensitivity trigger: `is_passion` no longer gates a standalone
  signal (the old Passion-specific criticism weight is removed from the
  rubric entirely, refactor spec §3.7). Instead it raises detection
  *sensitivity* (not weight or cap) on five signals — religious art,
  Gnostic over-emphasis, mythicist bias, criticism of the supernatural
  worldview, and secular-materialist presuppositions (§9 rows
  15/16/21/22/23) — via a single calibrated Passion margin that lowers
  their firing thresholds, subject to the same 0.8 precision floor.

  Threshold calibration and gold set: vector-scored signals do not fire
  on a guessed similarity cutoff. Each family's `t_fire`/`t_strong`
  thresholds (and `t_asym` for computed-metric signals) are fitted
  against a hand-labelled gold set (refactor spec §11), frozen once
  recorded, subject to a precision floor of 0.8 — a family whose best
  achievable precision falls short stays on its dormant keyword fallback
  rather than shipping. The section classifier is validated first and
  separately (40-article gold set, §11.2) since every other family's
  placement-sensitive results depend on its labels being correct.

  Vector-store VPS sync: in addition to the existing `scoring-export.json`
  copy to the thejesuswebsite repo's `database/` folder, the per-family
  vector-store indexes under `setup/Wikipedia algorithm v2/vector-stores/`
  are now rsync'd to the VPS as part of the pipeline (see the separate
  VPS-sync plan for the mechanics — not detailed here).

STEP 5 — LOG THE OUTCOME.
  Append one line to `Wikipedia Articles - Reference.md`'s Notes/caveats section recording what
  happened this run (date, mode, count before/after, any shortfall). Do not rewrite the rest of the
  document — Reference.md's Stage 1–3 methodology is stable; this skill only appends a run record.

NOTE — every data write (add / remove / exclude / rescore, or a standalone `rank_engine.py export`)
also regenerates `scoring-export.json` and copies it to the thejesuswebsite repo's `database/`
folder for the visualization widget. Luke has explicitly exempted this one outbound copy from
`!Checkpoint` (standing instruction, 2026-07-16) — do not gate it, and do not generalize the
exemption to anything else.

## ✅ OUTPUT
State: `Wikipedia Articles.csv`, `Wikipedia Articles - Scoring Detail.csv`, and `wiki-bulk-paste.txt`
  all agree with each other and with `excluded-titles.txt`; row count is the ceiling (255) or the
  documented shortfall if the pool couldn't supply enough qualifying candidates; `candidate-pool.tsv`
  reflects any fresh crawl. Note: the v2 Reference.md's §9 weights table, the threshold config file
  (`vector-family-thresholds.yaml`), and the gold-set label files are additional artefacts a `check`
  implicitly depends on being internally consistent (weight table matches rank_engine.py's formula,
  thresholds match what's calibrated against the frozen labels) even though `rank_engine.py check`
  does not verify those cross-file agreements automatically.
Log: "[WORKER: !TheJesusWebsite-Wikipedia] [SUCCESS|FAIL] mode=<check|topup> before=[N] after=[N] ceiling=255" → `Memory/Long-Term/Logs/skills.log`.

**Validation Check (Self-Test)**
```
VERIFY rank_engine.py check exits 0 ELSE report every printed issue to Luke, fix nothing automatically
```

**Error Path**
```
CATCH browser/harvest failure on one URL ➔ skip that title, log it, continue with the rest — do not abort the whole run over one page
CATCH pool exhausted before reaching target_new ➔ write what qualified, report the shortfall, do not pad with lower-quality picks
CATCH check finds a mismatch ➔ fail closed, surface every issue verbatim, do not auto-repair
```
