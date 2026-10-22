## Validation: Wikipedia Algorithm v2 Foundation & Contract

**Plan:** `wikipedia-v2-01-foundation-and-contract.md`  
**Date:** 2026-07-27

## Manual checks

- [ ] File exists: `/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Wikipedia algorithm v2/Wikipedia Articles - Reference.md` and is > 500 lines
- [ ] File contains §9 weights table (25 rows, each with Signal, Weight, and "How it works" columns)
- [ ] File contains Stage 1 pool creation criteria (seed categories, place coverage, depth, candidate definition, caching)
- [ ] File contains Stage 2 selection criteria (inclusion/exclusion rules, positive bar, permanent exclusions)
- [ ] File documents all six category flags with detection strings: `is_passion`, `is_miracle`, `is_parable`, `is_teaching`, `is_bible_book`, `is_location`
- [ ] File describes five-stage list processing pipeline (create pool, create list, rank, write deliverable, manage companions)
- [ ] File documents output conventions (comma→hyphen in titles, %2C in URLs, CSV format)
- [ ] File includes companion files descriptions (excluded-titles.txt, candidate-pool.tsv, scoring-export.json, wiki-bulk-paste.txt, .rescore-progress.jsonl)
- [ ] File includes DB schema shape appendix documenting `wikipedia_articles` (11 cols) and `wikipedia_article_signals` (5 cols, UNIQUE constraint)
- [ ] File: `/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Wikipedia algorithm v2/excluded-titles.txt` exists and contains 21 lines
- [ ] File: `/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Wikipedia algorithm v2/candidate-pool.tsv` exists and contains 513 lines (512 candidates + 1 header)
- [ ] No file in v2 directory contains cross-references to `/setup/Wikipedia algorithm v1/` (verify via grep)
- [ ] Weights table matches §9 of `Wikipedia_alogrithm_refractor.md` (lines 512–546) exactly, not v1 Reference.md
- [ ] Category detection strings for `is_passion`, `is_miracle`, `is_parable` match v1 Reference.md lines 127–137 verbatim

## Code-review checks

- [ ] **JS-1** — Reference.md is self-documenting: category detection strings are complete and unambiguous; signal descriptions explain *why* each weight exists, not just *what* it detects.
- [ ] **SR-1** — Companion data files exist only in v2 (not duplicated across v1 and v2).
- [ ] No schema changes — `database/schema.sql` remains unchanged; Reference.md merely documents existing columns.

---

## Validation: Wikipedia v2 Harvest & Extraction (Non-Vector Signals)

**Plan:** `wikipedia-v2-02-harvest-and-extraction.md`  
**Date:** 2026-07-27

### Manual checks

- [ ] File exists: `setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/extract.js` and has ≤150 lines (down from 331 after removals)
- [ ] Removed: heading classification function `classifyHeading()`, narrative/interpretation heading regexes, bucket assignment loop (lines 31–73)
- [ ] Removed: all placement tracking fields (`jesusSeminarInData`, `jesusSeminarInInterp`, `jesusSeminarInOther`, `mythicistInData/Interp/Other`, `criticalScholarInData/Interp/Other`, `evangelicalInInterp`, `narrativeHeading`, `interpHeading`)
- [ ] Removed: signals entirely deleted from v2 rubric (`passionCriticismHits`, `miracleCriticismHits`, `balancedDebateHits`, `balancedDebateNamedAuthors`, `contOTNT`, `superCrit`, `jesusSeminarCount`, `mythicistCount`, `ancientHistorianCount`, `criticalScholarPlace`)
- [ ] Added: `refQualityTier` (string: "zero"/"niche"/"supported"/"wellsourced"), `hasCitationNeeded` (boolean), `mapsAndDiagramsCount` (0–2), `religiousArtScore` (-1/0/+1)
- [ ] Preserved: `verseCount`, `refCount`, `journalCount`, `bookCount`, `commentaryCount`, `manuscriptCount`, `primarySourceQuoteCount`, `wikiQualityHit`, `anteNiceneCount`, `archSiteHit`, `jewishContextHits`, `otherReligionHit`, six category flags
- [ ] File: `setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/extract.test.js` exists and contains ≥10 test cases covering: Bible verse deduplication, refQualityTier boundaries (0/1/5/10 refs), manuscript generic fallback, maps/diagrams detection, religious art context-conditional (parable exemption, picture±map combinations), archaeology keyword matches
- [ ] File: `api/tests/wikipedia-extraction.test.js` exists and tests full extract.js output shape via subprocess call
- [ ] File: `setup/Wikipedia algorithm v2/extraction-signals.md` exists and documents each signal with: name, detection method, output type, weight row, boundary conditions
- [ ] File: `setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/rank_engine.py` updated to match §9 weights (referencing-quality tiering, maps/diagrams capping, religious-art scoring, removal of obsolete signals)
- [ ] Test run: `npm test -- api/tests/wikipedia-extraction.test.js setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/extract.test.js` passes with 0 failures

### Code-review checks

- [ ] **JS-1** — Signal names are self-documenting (`refQualityTier` not `refQ`, `religiousArtScore` not `artS`)
- [ ] **JS-2** — All DOM queries check for element presence before accessing properties; missing elements return sensible defaults (count 0, tier "wellsourced", score 0)
- [ ] **SR-1** — Extract logic remains in one file; not split across multiple modules
- [ ] **SR-3** — Regex patterns are compiled once, not inside loops; DOM queries cached when repeated
- [ ] Verify v1 heading-bucketing logic (narrativeHeadRe, interpHeadRe, TreeWalker section classifier) is fully removed
- [ ] Verify new referencing-quality tiers are correctly mapped: 0 refs → "zero", 1–4 → "niche", 5–9 → "supported", 10+ → "wellsourced"
- [ ] Verify religious-art scorer exempts parable and teaching articles correctly (`!isParable && !isTeaching`)
- [ ] Verify `hasCitationNeeded` detection uses standard regex: `/citation needed|additional citations|improve this article/i`
- [ ] Verify maps/diagrams detection includes: mapframe templates, location-map elements, diagram SVGs, captions with "map"/"diagram"/"plan"/"floor plan"
- [ ] Verify no signals return undefined or null — all return 0, empty string, false, or expected value type
- [ ] Verify no new external dependencies added to `package.json` (extract.js uses only DOM APIs)
- [ ] Verify rank_engine.py weight table now omits: passionCriticismHits, miracleCriticismHits, confessional balance, balanced debate, OT–NT continuity, super-crit, mythicist, Jesus Seminar

---

## Validation: Wikipedia Algorithm v2 Gold Set Validation Data

**Plan:** `wikipedia-v2-03-gold-set.md`  
**Date:** 2026-07-27

### Manual checks

- [ ] File exists: `/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Wikipedia algorithm v2/gold-set-section-classifier.csv` with ≥40 rows (article count + 1 header)
- [ ] Classifier CSV columns present: `article_title`, `wikipedia_url`, `ranking`, `per_paragraph_labels`, `tier_assignment`, `notes`
- [ ] All 11 `is_bible_book` articles from Wikipedia Articles.csv are represented in classifier CSV (verify via title lookup)
- [ ] At least 20 of the 27 `is_passion` articles appear in classifier CSV
- [ ] Classifier CSV tier assignments are one of: "clear_split", "muddled", "one_side_only", "unclassifiable"
- [ ] Classifier CSV per_paragraph_labels field contains valid JSON array with `{para_num: N, label: <enum>, confidence: 0.0–1.0}` objects
- [ ] Label enums in per_paragraph_labels are one of: "data", "interpretation", "neither", "other"
- [ ] File exists: `/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Wikipedia algorithm v2/gold-set-vector-families.csv` with ≥200 rows
- [ ] Vector-families CSV columns present: `family_name`, `article_title`, `wikipedia_url`, `signal_fires`, `tier_if_applicable`, `exemplar_ids_matched`, `notes`
- [ ] Family names in vector-families CSV are one of: `data-interpretation-split`, `balanced-debate`, `anti-supernatural`, `ot-nt-discontinuity`, `mythicist-framing`, `jesus-seminar`, `secular-materialist`, `confessional-balance`, `literary-analysis`, `gnostic-over-emphasis`
- [ ] Signal_fires column contains only boolean values (true/false)
- [ ] Tier_if_applicable is empty for shape-A/B/C families (balanced-debate, balanced-debate, ot-nt-discontinuity, mythicist-framing, jesus-seminar, confessional-balance), and one of "upper"/"lower" for shape-D families (anti-supernatural, secular-materialist, literary-analysis, gnostic-over-emphasis)
- [ ] No duplicate (family_name, article_title) rows in vector-families CSV
- [ ] File exists: `/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Wikipedia algorithm v2/gold-set-negative-controls.csv` with ≥50 rows
- [ ] Negative-controls CSV columns present: `article_title`, `wikipedia_url`, `family_name`, `old_detector_fired`, `should_fire_new`, `reason`
- [ ] All article_title values in negative-controls CSV exist in candidate-pool.tsv (NOT in Wikipedia Articles.csv ranked 255)
- [ ] Old_detector_fired and should_fire_new columns contain only boolean values (true/false)
- [ ] Family names in negative-controls CSV match the 10 vector-embedding families
- [ ] Reason field is non-empty for all rows
- [ ] No duplicate (family_name, article_title) rows in negative-controls CSV
- [ ] File exists: `/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Wikipedia algorithm v2/GOLD_SET_LABELLING_PROCEDURE.md` and is >1500 words
- [ ] Procedure document covers: paragraph-level labelling (data/interpretation/neither/other with linguistic registers), tier assignment rules, per-family labelling guidance for all 10 families with positive indicators and red flags, confidence scoring explanation, quality checks
- [ ] File exists: `/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Wikipedia algorithm v2/CATEGORY_FLAGS_VALIDATION.md` and documents all six flags with detection strings
- [ ] Category-flags CSV lists which signals each flag gates or modifies (cross-check against §13.2 of Wikipedia_alogrithm_refractor.md)
- [ ] File exists: `/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Wikipedia algorithm v2/GOLD_SET_README.md` and contains 1-page summary (not full procedure)
- [ ] File exists: `/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Wikipedia algorithm v2/tests/validate-gold-set.test.js` and runs without errors: `node /Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Wikipedia\ algorithm\ v2/tests/validate-gold-set.test.js`
- [ ] Validation script checks: (1) all article_title values exist in Wikipedia Articles.csv, (2) Wikipedia URLs are syntactically valid, (3) JSON in per_paragraph_labels parses, (4) confidence scores are 0.0–1.0, (5) tier assignments match valid enums, (6) no duplicate (family, article) pairs, (7) reason fields non-empty, (8) signal_fires/old_detector_fired/should_fire_new are boolean, (9) family_name values match 10 families
- [ ] Validation script exit code 0 on all three CSV files: `node .../validate-gold-set.test.js`
- [ ] Spot-check: Open classifier CSV in Excel/text editor and verify per_paragraph_labels field is valid JSON (copy one row, paste into JSON validator)
- [ ] Spot-check: Verify one `is_bible_book` article title from classifier CSV exists in Wikipedia Articles.csv
- [ ] Spot-check: Pick one family from vector-families CSV, verify all family_name entries in that family's rows match the family name
- [ ] Row counts: classifier ≥40, vector-families ≥200 (20 per family minimum × 10), negative-controls ≥50

### Code-review checks

- [ ] **JS-2** — Validation script uses early returns and explicit error messages identifying the failing row and constraint (e.g., "Row 15: per_paragraph_labels JSON parse failed: Unexpected token...")
- [ ] **JS-4** — Labelling procedure document explains *why* the data/interpretation split is important and why it replaces heading matching, not just *what* the labels mean
- [ ] No new external dependencies added to `package.json` (validation script uses only Node built-ins)
- [ ] Validation script uses node:test (built-in test runner) and node:assert/strict (per Vibe rules), not Jest or Vitest
- [ ] Files in `/setup/Wikipedia algorithm v2/` are all CSV, markdown, or test.js — no other formats

---

## Validation: Wikipedia v2 Scoring, Ranking & Export

**Plan:** `wikipedia-v2-06-scoring-ranking-export.md`  
**Date:** 2026-07-27

### Manual checks

- [ ] For 5 random articles in a test/sample export, sum the 25 `contribution` values in `wikipedia_article_signals` and confirm they equal exactly the article's `net_score` in `wikipedia_articles` (Σcontributions = net_score, no rounding drift)
- [ ] Rank assignment covers exactly 1..N for the actual article count (255 for the full run) — grep the export/output for a hardcoded `250` and confirm none exists in ranking logic
- [ ] Sort key is `(−net_score, raw_title)`: pick two articles with equal `net_score`, confirm the one whose **raw** (pre comma→hyphen) title is alphabetically first gets the lower (better) rank
- [ ] Tie-break uses the RAW title, not the output title — construct or find a case where comma→hyphen substitution would change alphabetical order, and confirm ranking used the raw title's order, not the substituted one
- [ ] Multiplier truncation is applied exactly once, immediately after the multiplier, toward zero (e.g. −6 × 0.5 = −3, −9 × 0.5 = −4, not −4.5 or re-truncated on a later pass)
- [ ] `KNOWN_SIGNAL_KEYS` / contributions object contains exactly 25 keys per article, matching §9's 25 signal rows (no 28-key leftovers, no missing new keys: `literary_analysis`, `maps_diagrams`, `religious_art`, `secular_materialist`, `journal_or_book`, `referencing_quality`, `gnostic_over_emphasis`)
- [ ] `Wikipedia Articles.csv`: title column uses comma→hyphen substitution (e.g. "Mary - mother of Jesus"), url column uses `%2C` encoding for commas, 3 columns (`title`, `url`, `ranking`), row 1 header + 255 data rows
- [ ] `wiki-bulk-paste.txt`: same comma→hyphen title substitution and `%2C` URL encoding as the CSV, same 255 rows, delimiter is tab/space not a literal comma
- [ ] Both `Wikipedia Articles.csv` and `wiki-bulk-paste.txt` agree with each other row-for-row (same title/url/ranking per article) — no drift between the two deliverable formats
- [ ] `bucket-labels.json` (Plan 4's output, `setup/Wikipedia algorithm v2/bucket-labels.json`) is read directly by the assembly step and its row-3 tier drives `narrative_interp_split`'s +10/−3/−5/0 contribution
- [ ] `vector-family-scores.json` (Plan 5's output, `setup/Wikipedia algorithm v2/vector-family-scores.json`) is read directly by the assembly step and its per-family scores map into the contributions for §9 rows 5, 10, 16, 17, 19, 20, 21, 22, 23
- [ ] Missing or malformed `bucket-labels.json` / `vector-family-scores.json` causes a loud failure (JS-2), not a silent 0-contribution default

### Code-review checks

- [ ] **JS-1** — Signal keys, caps, and multiplier logic are self-documenting; only "why" comments present
- [ ] **JS-2** — Validation is exhaustive and all-or-nothing; no article is written with a partial or unsummed contribution set
- [ ] **SQL-1 / SQL-2** — All DB writes use prepared statements with named parameters and `?` placeholders, never string-interpolated article data
- [ ] Verify the two upstream file-based interfaces (`bucket-labels.json`, `vector-family-scores.json`) are referenced by name and path in Plan 6's own tasks/notes, not just implied
