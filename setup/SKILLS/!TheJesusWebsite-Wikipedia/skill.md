---
name: "!TheJesusWebsite-Wikipedia"
description: >
  Maintain the fixed 255-article canonical Wikipedia list for The Jesus Website
  (`Wikipedia algorithm/Wikipedia Articles.csv`). The list is NOT auto-topped-up —
  it only grows or shrinks when Luke explicitly names articles to add or remove.
  Default action is a read-only consistency check across the deliverable files.
  Also handles permanently excluding a named article on request (removes it from
  the live list too, not just a denylist entry), and weight-table changes when
  Luke edits the scoring rubric itself. Read this when Luke asks to "add this
  Wikipedia article to the Jesus list", "check the Jesus article ranking",
  "exclude this article from the Jesus list", "rescore the Wikipedia list", or
  references `Wikipedia Articles.csv` / `ALGORITHM_GUIDE_the_what.md` in that
  folder. One of three parallel trackers under The-Jesus-Website/ — see also
  `!TheJesusWebsite-Challenges` for the Popular/Academic Challenges trackers
  (siblings, not this skill's scope).
type: Skill
status: Active
domain: Church
intent: "Keep The Jesus Website's fixed 255-article Wikipedia list internally consistent without re-doing finished work — verify by default, add/remove/rescore only on Luke's explicit request; handle named exclusions and weight-table changes cleanly."
version: 3.0.0
dependencies: [scripts/rank_engine.py, scripts/extract.js, "../../../Wikipedia algorithm/ALGORITHM_GUIDE_the_what.md", "../../../Wikipedia algorithm/ALGORITHM_GUIDE_the_how.md", vector-family-thresholds.yaml, gold-set-section-classifier.csv, gold-set-three-tier.csv, gold-set-vector-families.csv, gold-set-negative-controls.csv, excluded-titles.txt, candidate-pool.tsv, wiki-bulk-paste.txt, scoring-export.json, bucket-labels.json]
calibration:
  context: Church
  level: Extended
  scope: Local
memory_footprint:
  read: [Memory/Long-Term/The-Jesus-Website/Wikipedia]
  write: [Memory/Long-Term/The-Jesus-Website/Wikipedia]
---

## Lifecycle note (2026-07-31)

This skill remains the primary entry point for Wikipedia-list work, but was
rewritten from its v2.0.0 form to match the post-31-July-2026 process:

- The article list is a **fixed canonical set**, not a pool re-gathered toward
  a ceiling on every run. There is no automatic "top up if below 255" trigger
  any more — additions and removals happen only when Luke explicitly names
  article(s). `check` (STEP 1) never chains into collection on its own.
- `Wikipedia Articles - Reference.md` no longer exists. Its content now lives
  in `ALGORITHM_GUIDE_the_what.md` (Stage 1–3: pool/selection criteria and the
  authoritative §9 weights table) and `ALGORITHM_GUIDE_the_how.md` (Stage 4–6:
  the technical pipeline, per-signal detection methods, and code locations) —
  both in `Wikipedia algorithm/`, same folder as the CSVs.
- The engine script is `setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/rank_engine.py`
  in this repo — not a `System/Skillbank/...` path from another vault.
- Signal 3 (data/interpretation split) is now scored via the offline
  MiniLM/FAISS classifier's output (`bucket-labels.json`), not a live
  per-run vector call — see `ALGORITHM_GUIDE_the_how.md` Stage 4.
- Run-outcome logging (old STEP 5) now goes to `setup/issues.md`, per the
  project rule that history/auditing lives only in completed plans or
  `issues.md` — not scattered across doc "Notes/caveats" sections.

## ⚡ TRIGGER
Primary: `!TheJesusWebsite-Wikipedia`
Fires when: Luke asks to check, verify, or audit the Jesus/Gospels Wikipedia
article list, add or remove specific articles, exclude a title, or change the
scoring rubric — or references any file in `Wikipedia algorithm/` or this
skill's folder.
Scope: that one list only — `Popular Challenges/` and `Academic Challenges/`
belong to the sibling skill `!TheJesusWebsite-Challenges`, not this one.
Full method and rationale live in `Wikipedia algorithm/ALGORITHM_GUIDE_the_what.md`
(Stage 1–3: what qualifies for the list and the §9 weights table) and
`ALGORITHM_GUIDE_the_how.md` (Stage 4–6: the technical pipeline and per-signal
detection methods) — read both before the first run of a session; they are
the source of truth for selection criteria and scoring weights, not this
skill.md.

## 🛠️ LOGIC

STEP 0 — NAMED EXCLUSION REQUEST (separate from the flow below; run instead of
  it when Luke names one or more specific articles to permanently exclude).
  RUN `python3 "setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/rank_engine.py" exclude "<Title 1>" "<Title 2>" ...`
  using the exact title(s) as they appear in `Wikipedia Articles.csv`. This appends to
  `excluded-titles.txt` and removes any matching row from all three deliverable files in one step —
  never leave a title in the live list that's also on the denylist (STEP 1's check would flag it).
  This drops the row count below 255 — follow up with STEP 2 (ADD REQUEST) only if Luke also asked
  for a replacement; otherwise the list is simply smaller now, which is fine.
  If Luke wants a title removed but NOT permanently banned (it could come back later), use
  `... rank_engine.py remove "<Title>" ...` instead — same effect on the live data, but nothing is
  written to `excluded-titles.txt`.

STEP 0b — WEIGHT-TABLE CHANGE (run instead of the flow below when Luke changes the Stage 3
  scoring criteria itself — new signal, changed weight, removed signal — rather than asking about
  specific articles).
  1. Update all six places a weight-table change touches before `rescore` is safe to run:
     (a) the §9 weights table in `ALGORITHM_GUIDE_the_what.md` (the only place the weight/cap
        values live — `ALGORITHM_GUIDE_the_how.md` §3 documents detection method and code
        location per signal, not the weight values themselves; do not duplicate the values there);
     (b) the matching detection logic in `scripts/extract.js`;
     (c) the scoring formula in `scripts/rank_engine.py`
        (`net_score_from_signals`, `DETAIL_FIELDS`, `row_from_signals`,
        `detail_row_to_internal`);
     (d) the vector-store threshold config file (`vector-family-thresholds.yaml`:
        `t_fire`, `t_strong`, `t_asym`, `t_sep`, and the Passion margin)
        for any vector-scored signal being changed;
     (e) the gold-set label files (the acceptance criteria in `ALGORITHM_GUIDE_the_how.md` §11.4
        must be re-checked against the frozen labels before a rescore is trusted — a weight change
        does not require re-labelling, but the criteria must be re-verified);
     (f) the per-family vector-store index itself, if the change alters
        what the store should fire on (re-seeding/re-embedding, not
        just re-weighting).
     A change is not safe to `rescore` under until every applicable one of these six has moved.
     Note: the vector classifier (`ALGORITHM_GUIDE_the_how.md` §3.1.1) is the sole paragraph-level
     bucketing authority for the whole rubric — heading-based section bucketing is retired. It has
     no per-signal detection logic to "move together" the way individual weights do — it is
     calibrated once, separately, against its own gold set (§11.2), and any change to its behaviour
     requires re-validating every placement-sensitive signal downstream, not just the classifier itself.
  2. RUN `python3 "setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/rank_engine.py" rescore`
     — this fully re-harvests and rescores EVERY currently-present article from scratch under the
     new rubric (it does not reuse old signals the way `add` does), so the whole list stays judged
     on one consistent scale rather than mixing old-rubric and new-rubric scores. It's resumable
     via `.rescore-progress.jsonl` if interrupted — just re-run the same command.
  3. Continue to STEP 1 afterward to confirm the rescore left everything consistent.

STEP 1 — CHECK (default action; run this whenever Luke just asks to check/verify/audit the list).
  RUN `python3 "setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/rank_engine.py" check`
  This reads `Wikipedia Articles.csv` + `Wikipedia Articles - Scoring Detail.csv`, confirms the two
  files agree on which titles exist and that `ranking` matches a fresh sort of the Scoring Detail
  table by the composite key `(−net_score, raw_title)` — descending net score,
  ties broken alphabetically on the unmodified article title — confirms no title on
  `excluded-titles.txt` has crept back in, AND confirms `wiki-bulk-paste.txt` — the pipeline's
  plain-text end point — matches what `Wikipedia Articles.csv` currently says. It is read-only —
  never writes, and never triggers collection on its own regardless of row count.

  MATCH result:
    CASE exit 0 →
      Report the check result to Luke (including current row count vs. the 255 canonical size).
      DONE. Only proceed to STEP 2 if Luke separately asked to add specific articles.
    CASE exit 1 (inconsistency found) →
      STOP. Report every issue printed verbatim to Luke. Do NOT auto-repair, do NOT proceed to
      STEP 2 — a mismatch usually means a manual edit needs reconciling first. Fail closed.

STEP 2 — ADD REQUEST (only when Luke explicitly names article(s) to add, or asks to top up a
  shortfall left by an exclusion; never triggered automatically by a low row count).
  Read `candidate-pool.tsv` (title\turl per line) — the cached pool from the original crawl, kept
  for reuse. FILTER out any title already in `Wikipedia Articles.csv` and any title in
  `excluded-titles.txt`. If Luke named specific titles not already in the pool, resolve their URLs
  directly (via `!HeadlessChromeBrowser`) rather than crawling. If Luke asked for a broader top-up
  with no specific titles named, apply `ALGORITHM_GUIDE_the_what.md` Stage 1's seed
  categories/depth to crawl for candidates, APPEND every newly-discovered `title\turl` pair to
  `candidate-pool.tsv` (de-duplicated).

STEP 3 — SELECT (only reached from STEP 2; mirrors `ALGORITHM_GUIDE_the_what.md` Stage 2 —
  judgment, not a script). Apply the exact inclusion/exclusion table in that document to the
  candidates from STEP 2 — read it fresh each time rather than trusting this summary, since it's
  the source of truth and can change. This step is agent judgment, same as the original build — do
  not skip it or wave every candidate through. WRITE the selected `title\turl` pairs to a scratch
  file, one per line, tab-separated.

STEP 3b — LUKE REVIEW GATE (mandatory — never proceed to STEP 4 without it).
  Present the full selected candidate list to Luke IN CHAT and wait for his response. This is an
  iterative gate, not a one-shot approval:
    - Luke may strike titles → drop them (add to `excluded-titles.txt` only if he says the
      exclusion is permanent; otherwise just leave them in the pool for future consideration).
    - Luke may ask for more / different candidates → cycle back to STEP 2 and STEP 3, then present
      the revised list again. Repeat as many rounds as needed.
    - Only when Luke explicitly approves the list → continue to STEP 4 with the approved titles
      exactly as approved (no additions after approval).
  If Luke is unreachable, fail closed: leave the scratch file in `Sandbox/`, write nothing to the
  live data, and report where things stand.

STEP 4 — HARVEST, SCORE, MERGE, WRITE (deterministic — the script does this part).
  RUN `python3 "setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/rank_engine.py" add --input <scratch file>`
  This opens each new URL via `!HeadlessChromeBrowser`, extracts the Stage-3 signals (25 as of
  v2.0.0 — see `ALGORITHM_GUIDE_the_what.md` §9 for the full weights table and
  `ALGORITHM_GUIDE_the_how.md` §3 for per-signal detection method, keyword vs. vector), computes
  the net score per that table, and merges the new
  rows with the existing already-scored rows (reusing their stored signals — never re-harvests what's
  already scored).

  Before any signal is scored, the §3.1.1 vector classifier runs once per article and labels every
  body paragraph data/close/interpretation/other; every other placement-sensitive signal reads
  those labels rather than re-deriving them from headings. If the classifier fails its own
  acceptance gate for an article, that article's whole score is invalid, not just the split signal.

  The pipeline then resorts everyone by the composite key `(−net_score, raw_title)`, renumbers
  `ranking` 1..N, and rewrites `Wikipedia Articles.csv` (comma-in-title → hyphen, comma-in-URL →
  `%2C`, per `ALGORITHM_GUIDE_the_what.md`'s List Processing section), `Wikipedia Articles -
  Scoring Detail.csv`, AND `wiki-bulk-paste.txt` — the plain-text "title, url, rank" end point of
  the whole pipeline. All three are rewritten together on every `add` run (even a no-op one with
  nothing new to add) so they can never drift out of sync with each other.

  Dormant keyword fallbacks: each vector-scored signal family keeps its pre-refactor keyword
  detector in `scripts/extract.js` behind a per-family flag (`DORMANT_FALLBACKS`), inactive by
  default. A family only falls back to its dormant detector if it fails the 0.8 precision floor on
  its gold set; the fallback still reads the vector classifier's paragraph labels for placement
  rather than reviving heading-based bucketing.

  Vector-store VPS sync: in addition to the existing `scoring-export.json` copy to the
  thejesuswebsite repo's `database/` folder, the per-family vector-store indexes under `Wikipedia
  algorithm/vector-stores/` are rsync'd to the VPS as part of the pipeline.

STEP 5 — LOG THE OUTCOME.
  Append one row to `setup/issues.md` recording what happened this run (date, mode, count
  before/after, any shortfall or anomaly) if anything noteworthy occurred — routine no-op checks
  don't need a row. Do not write run notes into `ALGORITHM_GUIDE_the_what.md` or `_the_how.md` —
  those are live reference docs, not a log.

NOTE — every data write (add / remove / exclude / rescore, or a standalone `rank_engine.py export`)
also regenerates `scoring-export.json` and copies it to the thejesuswebsite repo's `database/`
folder for the visualization widget. Luke has explicitly exempted this one outbound copy from
`!Checkpoint` (standing instruction, 2026-07-16) — do not gate it, and do not generalize the
exemption to anything else.

## ⚠️ wiki-bulk-paste.txt is NOT a deploy step
`wiki-bulk-paste.txt` is a human-readable cross-check artifact only (title, url, rank —
no signal scores). The actual deploy path is: `scoring-export.json` → committed to
`database/` → `git push` → `deploy.sh` runs `import-wikipedia-scoring.js --publish
--purge-missing` on the VPS, which carries real signal contributions into the DB.
Do NOT paste `wiki-bulk-paste.txt` into the admin "Bulk Upload Articles" form — that
form creates title/url/rank-only rows with no scores and defaults them to draft,
and it never updates or removes existing rows. (Incident, 2026-07-30: someone deleted
all existing wikipedia_articles rows via "Delete All" and then bulk-pasted
wiki-bulk-paste.txt believing it was the final publish step, wiping every article's
signal scores and leaving the public page blank until a manual DB migration fixed it.)

## ✅ OUTPUT
State: `Wikipedia Articles.csv`, `Wikipedia Articles - Scoring Detail.csv`, and `wiki-bulk-paste.txt`
  all agree with each other and with `excluded-titles.txt`; row count reflects the current canonical
  list (255 as of 2026-07-31, but not auto-enforced — it only changes via explicit add/remove
  requests); `candidate-pool.tsv` reflects any fresh crawl from an ADD REQUEST. Note:
  `ALGORITHM_GUIDE_the_what.md`'s §9 weights table, the threshold config file
  (`vector-family-thresholds.yaml`), and the gold-set label files are additional artefacts a `check`
  implicitly depends on being internally consistent (weight table matches rank_engine.py's formula,
  thresholds match what's calibrated against the frozen labels) even though `rank_engine.py check`
  does not verify those cross-file agreements automatically.
Log: "[WORKER: !TheJesusWebsite-Wikipedia] [SUCCESS|FAIL] mode=<check|add|exclude|rescore> before=[N] after=[N]" → `Memory/Long-Term/Logs/skills.log`.

**Validation Check (Self-Test)**
```
VERIFY rank_engine.py check exits 0 ELSE report every printed issue to Luke, fix nothing automatically
```

**Error Path**
```
CATCH browser/harvest failure on one URL ➔ skip that title, log it, continue with the rest — do not abort the whole run over one page
CATCH check finds a mismatch ➔ fail closed, surface every issue verbatim, do not auto-repair
```
