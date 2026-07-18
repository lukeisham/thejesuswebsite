---
name: "!TheJesusWebsite-Wikipedia"
description: >
  Maintain the ranked Wikipedia-article list for The Jesus Website
  (Memory/Long-Term/The-Jesus-Website/Wikipedia/). If the list is below its 250-article ceiling,
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
intent: "Keep The Jesus Website's 250-article Wikipedia list topped up and internally consistent without re-doing finished work — collect+score only what's missing, otherwise just verify; handle one-off named exclusions cleanly."
version: 1.6.0
dependencies: [scripts/rank_engine.py, scripts/extract.js, "Wikipedia Articles - Reference.md", excluded-titles.txt, candidate-pool.tsv, wiki-bulk-paste.txt, scoring-export.json]
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
weights, not this skill.md.

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
  1. Update the weight table in `Wikipedia Articles - Reference.md` Stage 3, AND the matching
     detection logic in `scripts/extract.js` and the scoring formula in `scripts/rank_engine.py`
     (`net_score_from_signals`, `DETAIL_FIELDS`, `row_from_signals`, `detail_row_to_internal`) —
     all three must move together or `check` will start comparing apples to oranges.
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
  table by net score (then the tie-break rules), confirms no title on `excluded-titles.txt` has
  crept back in, AND confirms `wiki-bulk-paste.txt` — the pipeline's plain-text end point — matches
  what `Wikipedia Articles.csv` currently says. It is read-only — never writes.

  MATCH result:
    CASE exit 0 AND row count >= 250 (ceiling met) →
      Report the check result to Luke. DONE — no collection needed. This is the "sufficient to
      meet the ceiling" path: skip straight to STEP 5.
    CASE exit 0 AND row count < 250 (below ceiling) →
      Continue to STEP 2 — top up the shortfall (target_new = 250 − current count).
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
  This opens each new URL via `!HeadlessChromeBrowser`, extracts the Stage-3 signals (28 as of
  v1.6.0 — Bible verses, section split, manuscripts, citations, archaeology, Jewish context,
  balanced debate, the criticism/negative-author families with their data/interpretation
  placement multipliers, etc. — the full list is Reference.md's Stage 3 weight table and its
  end-of-document Weight-descriptions table), computes the net score per that weight table, merges the new rows
  with the existing already-scored rows (reusing their stored signals — never re-harvests
  what's already scored), resorts everyone by net score then the tie-break rules, renumbers
  `ranking` 1..N, and rewrites `Wikipedia Articles.csv` (comma-in-title → hyphen, comma-in-URL →
  `%2C`, per Reference.md's List Processing section), `Wikipedia Articles - Scoring Detail.csv`, AND
  `wiki-bulk-paste.txt` — the plain-text "title, url, rank" end point of the whole pipeline. All
  three are rewritten together on every `add` run (even a no-op one with nothing new to add) so
  they can never drift out of sync with each other.

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
  all agree with each other and with `excluded-titles.txt`; row count is the ceiling (250) or the
  documented shortfall if the pool couldn't supply enough qualifying candidates; `candidate-pool.tsv`
  reflects any fresh crawl.
Log: "[WORKER: !TheJesusWebsite-Wikipedia] [SUCCESS|FAIL] mode=<check|topup> before=[N] after=[N] ceiling=250" → `Memory/Long-Term/Logs/skills.log`.

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
