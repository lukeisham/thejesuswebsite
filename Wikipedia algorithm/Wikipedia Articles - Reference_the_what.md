---
title: Wikipedia Article List — Criteria & Scoring Reference (v2)
project: The Jesus Website
type: Reference
status: Active
maintained_by: "!TheJesusWebsite-Wikipedia"
related_files:
  - Wikipedia Articles.csv
  - Wikipedia Articles - Scoring Detail.csv
  - wiki-bulk-paste.txt
  - excluded-titles.txt
  - candidate-pool.tsv
  - scoring-export.json
last_updated: 2026-07-27
---

# Wikipedia Article List — Criteria & Scoring Reference (v2)

This document is the standing specification for the 255-article Wikipedia list on Jesus / the four Gospels: what goes into the candidate pool, what makes the cut, and how the cut is ranked. It consolidates the weights table from `Wikipedia_alogrithm_refractor.md` §9 (the source of truth for all weights and caps) with the selection criteria, category-flag detection rules, and pipeline documentation carried forward from v1.

**Source of every title/URL:** live Wikipedia, browsed via `!HeadlessChromeBrowser` — never fabricated or recalled from memory.

**Source of truth for weights:** section 9 of `Wikipedia_alogrithm_refractor.md` is the authoritative source for the 25-row weights table below. Where this Reference.md and the refactor spec ever disagree, the refactor spec wins. Do not run `rank_engine.py rescore` until this document has been brought into line — a rescore against a stale table would score every article under the old rubric.

**Maintained by:** the Skillbank skill `!TheJesusWebsite-Wikipedia` (`System/Skillbank/Church/!TheJesusWebsite-Wikipedia/`), which applies Stage 1–3 below on demand — tops the list up toward the 255 ceiling when short, or runs a consistency check when it's already full.

## Stage 1 — Pool creation criteria

Goal at this stage is breadth, not judgment — cast a wide net, decide what to keep at Stage 2.

| Aspect | Rule |
|---|---|
| Seed categories | `Category:Jesus`, `Category:Gospels`, and their subcategories: Nativity, Ministry, Passion, Resurrection, the Twelve Apostles, the Synoptic Gospels, the Gospel of John, Parables, Miracles, Doctrines and teachings. Apocryphal/Gnostic gospel categories are deliberately NOT seeded — Stage 2 excludes that entire category, so there's no point crawling it |
| Place coverage | Also crawl location-focused sources — e.g. the `New Testament places associated with Jesus` article's link graph — so major sites (Bethlehem, Nazareth, Jerusalem, Capernaum, Gethsemane, etc.) aren't missed; a category-only crawl has historically under-covered places |
| Depth | One to two hops out from each seed (the category itself, plus the categories/articles it directly lists) |
| What counts as a candidate | Any mainspace article link (`/wiki/<Title>`) surfaced. `Category:` links are followed for further crawling but are never candidates themselves |
| Filtering at this stage | None. Everything is kept, including material that will clearly be cut at Stage 2 — the point is to not miss anything before judgment is applied |
| Caching | Every discovered `title\turl` pair is appended to `candidate-pool.tsv`, de-duplicated, so a later top-up can draw on leftover candidates before re-crawling |

## Stage 2 — Selection criteria

Applied to every candidate in the pool to decide whether it makes the list.

| Rule | Decision | Examples |
|---|---|---|
| Talk pages / non-mainspace pages | **Exclude** | never collected at Stage 1 in the first place |
| Disambiguation pages | **Exclude** | *Four Gospels (disambiguation)* |
| Apocryphal / Gnostic gospels | **Exclude — all of them** | *Gospel of Thomas*, *Gospel of Judas*, *Gospel of Mary*, *Gospel of Philip*, *Gospel of Barnabas*, *Gospel of Nicodemus*, *Gospel of Bartholomew*, *Infancy gospels*, *Secret Gospel of Mark*, *Didache*, and every lesser-known one — no exception for "well-known" apocrypha |
| Theological / doctrinal topics | **Exclude** | *Logos (Christianity)*, *Son of man (Christianity)*, *Pre-existence of Christ*, *New Covenant*, *Paschal mystery* |
| Jesus in popular culture | **Exclude** | paintings, statues, films, folk festivals, hymns — e.g. *Agnus Dei (Zurbarán)*, *The Gospel of John (2003 film)*, *Las Posadas* |
| Jesus in other religions | **Exclude** | *Disciples of Jesus in Islam*, *Mansions of Rastafari* |
| Irrelevant / mis-tagged results | **Exclude** | anything that surfaced via category cross-listing but isn't actually about Jesus/the Gospels — e.g. *Twelve Apostles Stone Circle* (an Australian rock formation), *Charlotte Hussey (researcher)* |
| Individual miracles | **Include — full coverage** | every miracle account gets its own row; no trimming for redundancy |
| Individual parables | **Include — full coverage** | every parable gets its own row; no trimming for redundancy |
| Obscure Passion events | **Include — full coverage** | e.g. *Malchus*, *Naked fugitive*, *Scourge*, *Pilate's court*, *Bargain of Judas* |
| Core subject, the four Gospels, apostles, family, followers, historical figures, places, gospel-origins scholarship | **Include** | directly about Jesus, the Gospels, or the immediate people/places/events/scholarship surrounding them |
| Individual Bible-verse stub pages | **Exclude** | e.g. *Matthew 1:6* — a single verse is not a substantive standalone article |
| Books/commentaries about Jesus as their own subject | **Exclude** | e.g. *The Aquarian Gospel of Jesus the Christ*, *The Sermon on the Mount (book)* |

**Positive inclusion bar** (applies on top of the table above): a candidate must be a substantive, standalone encyclopedia article — not a stub, not a list/overview page duplicating content already covered by a more specific article in the list.

**Permanent named exclusions:** independent of the criteria above, `excluded-titles.txt` holds a denylist of specific titles excluded by explicit one-off instruction regardless of how they'd otherwise score or qualify. Check it before adding any candidate; a title only leaves that file if explicitly told to restore it.

## Stage 3 — Ranking criteria

Ranking is separate from selection: a title is on the *list* because it passed Stage 2; its *rank number* is set by a weighted score based on how the article sources and substantiates its content. Rank 1 = highest net score, 255 = lowest.

**Method:** score every listed article against the weights below, sum to a net score, sort all 255 by net score (highest first), apply the tie-break rules on ties, and number 1–255.

**Source of truth:** The weights table below is drawn from `Wikipedia_alogrithm_refractor.md` §9, which is authoritative. Where this Reference.md and §9 disagree, §9 wins. After any change to this table, run `rank_engine.py rescore` so every article is re-scored under the corrected rubric.

**Weight-cell convention:** a cell reading "+N per X, capped at ±M" means the underlying signal is a real count, multiplied and capped as stated. A cell with a bare "+N"/"−N" and no "per"/"capped" language means the signal is flat and binary — it either fires once or not at all, regardless of how many times the underlying condition is true in the article.

Rows are ranked by weight magnitude — strongest positive signal first, strongest negative signal last.

| # | Signal | Weight | How it works (new system) |
|---|---|---|---|
| 1 | Cites/mentions a specific manuscript | **+2** per distinct manuscript, capped at **+6**; max **+8** for teachings/Bible books | **Unchanged plain lookup** (§3.8) — fixed list of well-known manuscripts (Codex Sinaiticus, Vaticanus, Dead Sea Scrolls, etc.); generic "papyrus/codex/manuscript" mention counts as 1 |
| 2 | Cites a specific Bible verse | **+3** per citation, capped at **+12** | **Unchanged plain lookup** (§3.8) — regex match on chapter:verse patterns in rendered text; deduplicated |
| 3 | Data/interpretation split | **+10** clear split; **−3** both present but muddled; **−5** only one side present; **0** unclassifiable | **Vector** (§3.1.1) — **the dominant matrix.** Three stores (data bucket, interpretation bucket, linguistic register) label every body paragraph; a computed separation ratio decides the tier. Headings are not consulted. These labels **are** the section buckets for the entire rubric |<br>**Pending**: currently unable to score above 0 for any article — no keyword fallback exists. Unblocked by `bucket-labels.json` (Plan 4, §11.2 ≥0.85 gate) / `vector-family-scores.json` (Plan 5, §11.4 ≥0.80 precision floor). See `Issues.md` #141.
| 4 | Cites a scholarly commentary | **+1** per citation, capped at **+6**; only fires for parable/teaching articles | **Plain list lookup** (§3.5) — fixed series name list (Word Biblical, Anchor Bible, Hermeneia, NICNT, etc.) or "commentary" keyword; gating unchanged |
| 5 | Shows balanced debate in interpretation sections | **+2** per distinct debate pattern, capped at **+6**; **doubled** to max **+12** with 2+ named representatives | **Vector** (§3.1.2) — single store encoding longevity language, representative individuals, disagreement across both layers (data AND interpretation), and properly-anchored consensus. Replaces keyword-pattern matching |
| 6 | Cites an ante-Nicene author | **+2** per author, capped at **+6** | **Plain list lookup** (§3.5) — fixed name list (Ignatius, Polycarp, Justin Martyr, Irenaeus, Tertullian, Origen, Clement, Eusebius, Hippolytus, Cyprian); logic unchanged |
| 7 | Cites/mentions an archaeological site or artefact | **+2** flat; **+8** for location-category articles with an archaeology hit | **Associated term lookup** (§3.6) — IAA/"archaeolog-"/"excavat-"/"ossuary"/"inscription" keyword match; scores **+2** for parable articles; location bonus unchanged |
| 8 | Discusses Jewish context | **+2** per distinct concept, capped at **+6** | **Plain list lookup** (§3.5) — fixed keyword list (Second Temple, Pharisees, Torah, Qumran, Passover, Mishnah, etc.); logic unchanged |
| 9 | Cites/mentions a non-Christian ancient source | **+2** per source, capped at **+6**; scores **+3** for parable articles | **Plain list lookup** (§3.5) — fixed 8-name list (Josephus, Tacitus, Pliny, Suetonius, Mara bar Serapion, Lucian, Celsus, Phlegon); logic unchanged |
| 10 | Literary analysis | **+6** for parable / teaching / Bible-book articles; **+4** for all other articles | **Vector** (§3.1.9) — single vector-embedding database trained on literary-analysis passages: narrative criticism, rhetorical devices (inclusio, chiasm, parallelism), genre conventions, intertextual allusion, reader-response, form-critical segmentation. Tiered by article category |<br>**Pending**: currently unable to score above 0 for any article — no keyword fallback exists. Unblocked by `bucket-labels.json` (Plan 4, §11.2 ≥0.85 gate) / `vector-family-scores.json` (Plan 5, §11.4 ≥0.80 precision floor). See `Issues.md` #141.
| 11 | Quotes a primary source directly | **+1** per quote, capped at **+4** | **Unchanged plain lookup** (§3.8) — blockquote count + long (40+ char) quoted spans |
| 12 | Cites a peer-reviewed journal article or scholarly book/monograph | **+1** per citation, capped at **+2** per type | **Associated term lookup** (§3.6) — reference-list entries matched against journal-ish markers (`journal`, `doi.org`, `jstor`, volume/issue patterns) or book-ish markers (`ISBN`, `University Press`, publisher patterns). No fixed journal or publisher list |
| 13 | Maps and diagrams | **+1** per map/diagram, capped at **+2** | **Unchanged plain lookup** (§3.8) — simple presence search via DOM inspection for mapframe templates, location-map elements, diagram-style SVGs, or captions containing "map"/"diagram"/"plan"/"floor plan" |
| 14 | Wikipedia Good Article / Featured Article | **+1** flat | **Unchanged plain lookup** (§3.8) — DOM inspection for GA/FA indicators |
| 15 | Religious art | **−1** if non-parable/non-teaching article has a picture but no diagram/map; **+1** if non-parable/non-teaching article has a picture AND a diagram/map | **Context-conditional** (§3.5.1) — evaluates image presence, diagram/map presence, and article category together. Does not fire for parable or teaching articles. Raised sensitivity on `is_passion` (§3.9). Stacks deliberately with row 13 |
| 16 | Gnostic over-emphasis | **−2** for a contextualised mention; **−4** where Gnostic material is treated as a privileged source. Max **−4** | **Vector embedding database** (§3.1.10) — trained on passages treating Gnostic material as significant/privileged rather than a passing mention. Scans **all buckets** (data, interpretation, references/footnotes) — footnote parity restored. Placement feeds the tier: hits in data/narrative sections count toward the privileged tier |
| 17 | Confessional balance | **−3** outside interpretation / **−1** inside without Evangelical contrast / **0** inside with one | **Vector** (§3.1.8) — uses balanced debate vector-embedding structure (§3.1.2). Fires only when critical scholars are present but the balanced debate store finds NO Evangelical/confessional schools, historians, or arguments in interpretation sections. Fixed-list name checks run alongside. Placement logic unchanged |
| 18 | Cites/mentions other-religion sources | **−3** flat | **Plain list lookup** (§3.5) — shared matcher (Qur'an, Muhammad, Hadith, Book of Mormon, LDS, Buddhist, Hindu, Sikh, Jain, Rastafari, Bahá'í). Same matcher drives balanced-debate sentence exclusion. Logic unchanged |
| 19 | Jesus seminar bias | **−3** per author, capped at **−6**; then **×2** if cited outside the interpretation sections / **×0.5** if interpretation-only; then a further **−2** if balanced debate (row 5) scored 0. Worst case **−14** | **Vector bias** (§3.1.6) — fixed list (Funk, Crossan, Borg) supplies the count; the §3.1.1 classifier supplies placement. No stance detection is attempted — placement and balance act as structural proxies (§11.3) |
| 20 | OT–NT continuity criticism | **−3** per distinct critical pattern, capped at **−6** | **Vector bias** (§3.1.4) — same 7-dimension bias detection system (§3.1.3), applied to four schools (proof-texting, messianic divergence, Law abrogation, intertestamental evolution) + contradiction framing. Interpretation text included in scan (inverted section-awareness) |
| 21 | Mythicist bias | **−3** per author, capped at **−7**; then **×2** if cited outside the interpretation sections / **×0.5** if interpretation-only; then a further **−2** if balanced debate (row 5) scored 0. Worst case **−16** | **Vector bias** (§3.1.5) — fixed list (Carrier, Price, Doherty) supplies the count; the §3.1.1 classifier supplies placement. No stance detection is attempted (§11.3). Raised sensitivity on `is_passion` (§3.9) |
| 22 | Criticism of the supernatural worldview | **−2** per instance, capped at **−8** | **Vector bias** (§3.1.3) — 7-dimension system split into embedding-detected markers (1, 2, 4, 7a) and computed metrics (3, 5, 6, 7b). Miracle- **and Passion-scoped**, section-aware (criticism-heading text excluded). Raised sensitivity on `is_passion` (§3.9) |
| 23 | Secular-materialist presuppositions | **−2** per distinct term, capped at **−8** | **Vector bias** (§3.1.7) — same 7-dimension system (§3.1.3), own vector-embedding database. Miracle- **and Passion-scoped**, section-aware (criticism-heading text excluded). Raised sensitivity on `is_passion` (§3.9). Placement multiplier does NOT apply |
| 24 | Referencing quality | Tiered on `ref_count`: **−9** if 0 refs; **+3** if 1–4; **+1** if 5–9; **0** if 10+. Plus **−1**, independently, for poor referencing | **Unchanged plain lookup** (§3.8) — one signal spanning the whole reference-count spectrum, absorbing the former niche-exposure bonus. Zero references is a failure; *few* references on a genuinely niche topic is forgiven, so short well-sourced articles aren't punished by the count-based signals. The −1 poor-referencing penalty (DOM inspection for "citation needed" tags / maintenance banners) applies on top of whichever tier fires |
| 25 | Cites no Bible verse anywhere | **−10** flat | **Unchanged plain lookup** (§3.8) — Bible verse regex count = 0 |

**Tie-break:** alphabetical by raw article title (before comma-to-hyphen substitution).
No verse-count or reference-count secondary keys — this is a deliberate simplification
(§12.2 of the refactor spec). Ties are expected; alphabetical ordering inside a
score-cluster is arbitrary by design, not a claim about relative quality.

## Category flags

**Article-category conditionals —** some signals only fire, or fire differently, depending on article category. Categories are detected via the Wikipedia category strip (`#mw-normal-catlinks`) at harvest time and stored in the detail CSV (`is_passion`, `is_miracle`, `is_parable`, `is_location`, `is_teaching`, `is_bible_book` columns). These do not produce their own net-score contribution; they gate other signals:

| Category | Detection | Effect |
|---|---|---|
| Passion | Category strip contains "Passion of Jesus" / "Crucifixion of Jesus" / "Resurrection of Jesus" | Passion-specific criticism signal fires (swoon/stake theory) |
| Miracle | Category strip contains "Miracles of Jesus" | Miracle-specific criticism signal fires (secular-materialist keywords); section-aware scan excludes text under criticism/historical/naturalistic/scholarly/skeptical headings |
| Parable | Category strip contains "Parables of Jesus" | `archaeological site/artefact` and `ancient historian` signals score as 0 (harvested but exempted — parables are narrative teachings, not historical/archaeological claims) |
| Location | Category strip contains "New Testament places" / "New Testament cities" / "Holy Land" / "Geography of Israel" / "Cities in Israel" / "Archaeological sites in Israel" / "Hebrew Bible places" | If `archaeological site/artefact` fires, an extra **+6** is added on top of the standard **+2** (total **+8**) |
| Teaching | Category strip contains "Sayings of Jesus" / "teachings of Jesus" / "New Testament idioms" / "New Testament words and phrases" / "Sermon on the Mount" | Gates the commentary-citation signal; **doubles** the named-manuscript signal |
| Bible book | Category strip contains "Books of the New Testament" / "Canonical Gospels" / "Gospels", or title is "Gospel of Matthew/Mark/Luke/John" | **Doubles** the named-manuscript signal |

## How each signal is measured

Implemented via an automated text/DOM scan of the live Wikipedia page (`scripts/extract.js`):

- **Bible verse count** — regex match on `<Book> <chapter>:<verse>` patterns in the rendered text, deduplicated.
- **Reference count** — count of list items in the reference/footnote list.
- **Journal / book / commentary citations** — reference-list entries matched against journal-ish markers (`journal`, `doi.org`, `jstor`), book-ish markers (`ISBN`, `University Press`), or named commentary series / `"commentary"` itself.
- **Archaeological site/artefact** — IAA/"archaeolog-"/"excavat-"/"ossuary"/"inscription" keywords.
- **Manuscript mentions** — count of distinct named manuscripts matched from a fixed list (Codex Sinaiticus, Codex Vaticanus, Codex Alexandrinus, Codex Bezae, Codex Ephraemi, Codex Washingtonianus, Chester Beatty Papyri, Bodmer Papyri, Dead Sea Scrolls, Papyrus 52/66/75); if none of those are named but the article still mentions "papyrus"/"codex"/"manuscript" generically, counts as 1.
- **Jesus Seminar authors** — count of distinct named authors matched (Robert Funk, John Dominic Crossan, Marcus Borg); if none are named but the article still mentions "Jesus Seminar" generically, counts as 1. Each hit's section placement (data / interpretation / other, per the bucket rules above) is also recorded to drive the placement multiplier; the same applies to mythicist authors.
- **Primary-source quotes** — count of `<blockquote>` elements plus long (40+ character) quoted spans in the running text. A blunt proxy: counts any substantial quotation, not only verified primary-source ones.
- **Gnostic-source quotation** — keyword match for "Gnostic," Nag Hammadi texts, the named Gnostic gospels, Valentinian/Sethian material. Flags the article discussing/quoting Gnostic material generally, not that a specific quoted passage is itself Gnostic.
- **Poor referencing** — presence of a live "citation needed" tag or an "additional citations needed"-style maintenance banner.
- **Wikipedia quality rating** — checks page indicator elements (`[id^="mw-indicator-"]`) for a title/caption containing "good article" or "featured article."
- **Ancient historians / ante-Nicene authors / mythicist authors** — each checks the rendered text for a fixed list of named individuals: Josephus/Tacitus/Pliny the Younger/Suetonius/Mara bar Serapion/Lucian of Samosata/Celsus/Phlegon for the first; Ignatius of Antioch/Polycarp/Justin Martyr/Irenaeus/Tertullian/Origen/Clement of Alexandria/Clement of Rome/Eusebius/Hippolytus/Cyprian for the second (cut off at the Council of Nicaea, 325 AD); Richard Carrier/Robert M. Price/Earl Doherty (or generic "mythicist"/"Christ myth theory" framing if none is named) for the third. Each is a real count of distinct names matched, not presence-only.
- **Data/interpretation section split** — the shared section classifier must find at least one narrative-family heading AND at least one interpretation-family heading. Narrative patterns are anchored (a bare "account" or "in the" mid-heading no longer matches — the old loose regex matched headings like "In the arts").
- **OT–NT continuity criticism** — a fixed list of regex patterns covering the four schools: proof-texting/out-of-context language, "pesher"/"midrash-", original-context arguments about OT prophecy; redefinition/reinterpretation language near "messiah"/"messianic," messianic-expectation contrasts (political/military/Davidic); "abrogat-"/"supersed-"/"obsolet-" near law/Torah/covenant/Mosaic, "supersessionis-"; "intertestamental" development/influence language, Hellenistic/Persian/Zoroastrian influence near apocalyptic/resurrection/dualism/angelology, Second Temple apocalypticism; plus contradiction/discrepancy patterns near OT/prophecy. The count is the number of DISTINCT patterns matched (feeding the −2-per capped weight), not raw instance frequency.
- **Supernatural-worldview criticism** — keyword/phrase patterns ("mythological," "historicity questioned," "naturalistic explanation," etc.), counted per instance in the text, feeding the −2-per-instance capped weight. **Note:** "swoon theory" was removed from the supernatural-criticism pattern; it is now detected by the Passion-specific criticism signal.
- **Jewish context** — count of distinct terms matched from a fixed keyword list (Second Temple Judaism, Pharisees, Sadducees, synagogue, halakha/halakhic, Torah, rabbinic/rabbinical, Essenes, Qumran, messianic expectation, Passover, Jewish custom/law/practice, Mishnah, Talmud, intertestamental) in the rendered article text.
- **Balanced debate** — the interpretation-bucket text is split into sentences; any sentence matching the shared other-religion matcher is dropped; the remainder is scanned against a fixed list of debate-marker patterns ("others argue/contend/suggest", "some scholars … while/whereas/others", "scholars are divided/disagree/differ", "on the other hand"/"by contrast"/"conversely", "alternative/opposing/competing/minority/dissenting view/interpretation/reading", "debated/disputed/contested/controversial", "critics claim", "opponents maintain", "proponents counter", "in contrast", "a different perspective suggests", "competing explanation", "defend/refute/rebut/counter-argument", "point of contention"/"no consensus"). Count = number of DISTINCT patterns matched. Separately, **named representatives** are counted: distinct capitalized personal names directly attributed a stance verb ("N. T. Wright argues", "Raymond Brown contends") within the same filtered interpretation text; 2+ distinct names doubles the capped bonus.
- **Confessional balance** — checks the critical-scholar name list (Ehrman etc.) against the section buckets; a hit in data or other (which includes footnotes/bibliography) counts as outside the interpretation sections, so a footnote citation still pings; only interpretation-confined hits reach the milder tiers. The Evangelical-contrast check tests the Evangelical name list against interpretation-bucket text only.
- **Other-religion sources** — presence of any term from the shared other-religion matcher (Qur'an/Quran, Muhammad, Hadith, Surah, Book of Mormon, Joseph Smith, Latter-day Saint, LDS, Doctrine and Covenants, Pearl of Great Price, Islam-/Muslim-/Mormon-/Buddhis-/Hindu-/Sikh-/Jain-/Rastafari-terms, Bahá'í, Bhagavad, Veda(s)) in the rendered article text. The same matcher drives the balanced-debate sentence exclusion.
- **Passion-specific criticism** — count of distinct terms matched from a fixed list (swoon theory, stake theory, torture stake, impalement theory); only fires for articles whose Wikipedia category strip includes "Passion of Jesus," "Crucifixion of Jesus," or "Resurrection of Jesus."
- **Miracle-specific criticism** — count of distinct terms matched from a fixed list (naturalistic explanation, psychosomatic, mass hallucination, mythological, legendary development/accretion, scientifically explain/implausible); only fires for articles whose Wikipedia category strip includes "Miracles of Jesus." Section-aware via the shared buckets: only **data + other** text is scanned — anything under an interpretation-family heading is excluded.

## List processing — pool → list → rank → file

The full pipeline, in order:

1. **Create the pool** — Stage 1: crawl, collect every mainspace article link, de-duplicate by URL. No judgment yet.
2. **Create the list** — Stage 2: apply the inclusion/exclusion rules to cut the pool down to the selected titles.
3. **Rank the list** — Stage 3: score every selected title against the weight table. Per-article inputs and computed net score are recorded in **`Wikipedia Articles - Scoring Detail.csv`** — that file *is* the ranking working table; sorting it by net score (then the tie-break rules) produces the final `ranking` value for each title.
4. **Write the deliverable files** — output the three columns (`title`, `url`, `ranking`) from the sorted table into `Wikipedia Articles.csv` and `wiki-bulk-paste.txt`. Any comma inside a **title** is replaced with a hyphen (e.g. *Mary, mother of Jesus* → *Mary - mother of Jesus*), and any comma inside a **URL** is percent-encoded as `%2C` (a legal URL character — doesn't change where the link resolves) — so every line is safe to read as plain comma-separated text with no quoting or escaping needed anywhere.
5. **Manage companion files** — regenerate `scoring-export.json` from the updated data, and ensure `excluded-titles.txt` and `candidate-pool.tsv` are in sync with the current state.

## Output file conventions

Deliverable columns are `title`, `url`, `ranking`:

- Any **comma** inside a **title** is replaced with a **hyphen** (e.g. *Mary, mother of Jesus* → *Mary - mother of Jesus*).
- Any **comma** inside a **URL** is percent-encoded as **`%2C`** (a legal URL character — doesn't change where the link resolves).
- The result is safe to read as **plain CSV with no quoting** — every line is valid comma-separated text without any quoting or escaping needed.

These conventions apply to both `Wikipedia Articles.csv` and `wiki-bulk-paste.txt`.

## Companion files

Authoritative state, meant to be read/written by tooling rather than hand-edited:

- **`excluded-titles.txt`** — the permanent named-exclusion denylist. A future one-off "exclude this specific article" request goes through `rank_engine.py exclude "<title>" ...`, which appends here AND removes the row from the live data in one step. For a removal that should NOT be permanent, use `rank_engine.py remove "<title>" ...` instead.
- **`candidate-pool.tsv`** — the cache of every `title\turl` pair discovered by crawling to date, so a top-up can draw on leftover candidates before re-crawling.
- **`wiki-bulk-paste.txt`** — the plain-text "title, url, rank" rendition of the full list, comma-space delimited, same hyphen/percent-encoding convention as the main CSV. The final end point of the pipeline; regenerated every time the deliverable files change.
- **`scoring-export.json`** — the machine-readable export for The Jesus Website's visualization widget: merged title/url/ranking/net_score per article, per-signal POINT contributions (caps and category conditionals applied — they sum exactly to net_score, verified at write time), uncapped raw signals, category flags, an embedded signal dictionary (label/weight/caveat per signal), and generation metadata. Regenerated on every data write AND copied to `/Users/lukeishammacbookair/Developer/thejesuswebsite/database/scoring-export.json` (copy skipped with a warning if that folder is absent). Also produced standalone via `rank_engine.py export`. Per Luke's explicit standing instruction (2026-07-16), this outbound copy SKIPS `!Checkpoint`.
- **`.rescore-progress.jsonl`** — a transient, resumable progress file used only during a `rank_engine.py rescore` run (a full re-harvest of every current article under the current weight table, used after a weight-table change). Deleted automatically on completion; its presence means a previous rescore was interrupted and should be re-run to resume.

## Appendix: Database schema shape

The schema is authoritative at `database/schema.sql` and this document does not change it. The relevant tables are:

### `wikipedia_articles` (11 columns)

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Internal row ID |
| `slug` | TEXT UNIQUE NOT NULL | URL-safe identifier |
| `wikipedia_article_title` | TEXT | The article title as it appears on Wikipedia |
| `wikipedia_article_url` | TEXT | Full Wikipedia URL |
| `wikipedia_article_latest_revision_date` | TEXT | Date of the most recent Wikipedia revision when harvested |
| `wikipedia_article_rank_number` | INTEGER | Rank 1–255 (1 = highest net score) |
| `wikipedia_rank_pluses` | INTEGER | Sum of all positive signal contributions |
| `wikipedia_rank_minuses` | INTEGER | Sum of all negative signal contributions |
| `published_draft` | INTEGER DEFAULT 0 | 0 = draft, 1 = published |
| `metadata_keywords` | TEXT | Comma-separated keywords for search/filtering |
| `created_at` | DATETIME DEFAULT CURRENT_TIMESTAMP | When the row was uploaded to this website (NOT the Wikipedia article's own revision date). Drives the "Last updated" line on the public list |

### `wikipedia_article_signals` (5 columns)

One row per (article, signal) — 25 rows per published article. `signal_key` matches keys in the static `SIGNAL_DICTIONARY` (`frontend/assets/js/utils/wikipedia-signals.js`). `contribution` is points earned (negative for negative signals); `cap` is that signal's max magnitude for this article (also negative for negative signals).

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Internal row ID |
| `wikipedia_article_id` | INTEGER NOT NULL | FK → `wikipedia_articles(id)` ON DELETE CASCADE |
| `signal_key` | TEXT NOT NULL | Matches keys in `SIGNAL_DICTIONARY` |
| `contribution` | INTEGER NOT NULL DEFAULT 0 | Points earned (negative for negative signals) |
| `cap` | INTEGER NOT NULL | Max magnitude for this article (negative for negative signals) |

UNIQUE constraint on `(wikipedia_article_id, signal_key)`.

## Data/scope notes

- Apocrypha/Gnostic gospels are excluded wholesale under Stage 2's current criteria; miracles, parables, and obscure Passion events are included in full. If the live data in `Wikipedia Articles.csv` doesn't yet reflect a criteria change made here, that's a separate step — this document defines the target state, applying it to the actual 255-article list is a run of the skill.
- Place-article coverage (Bethlehem, Nazareth, Jerusalem, Capernaum, Gethsemane, and similar) needs deliberate attention at Stage 1 — a category-only crawl has previously missed it entirely.
- A few Stage 2 calls sit at a judgment margin: narrated gospel scenes with doctrinal-sounding titles (e.g. *Great Commission*, *Olivet Discourse*, *Temptation of Christ*) are treated as narrative, not "purely theological," and are included; church-building/architecture articles (e.g. *Church of the Holy Sepulchre*, *Church of the Nativity*) are treated as leaning toward architecture/pilgrimage-site rather than gospel content, and are excluded.
- 2026-07-30 run: mode=exclude+topup. Excluded 7 titles (*Christ myth theory*, *Church of the Holy Sepulchre*, *Textual variants in the Gospel of John*, *List of gospels*, *Gospel of Philip*, *Gospel of James*, then separately *Shroud of Turin* after it was added and reconsidered). Replaced with 6: *Mount Tabor*, *Praetorium*, *Mara bar Serapion on Jesus*, *Caesarea Maritima*, *Chorazin*, *Magdala*. Before/after: 255 → 255. No shortfall. Also fixed a `rank_engine.py` bug found mid-run: `_REPO_ROOT` had one extra `dirname()` call, resolving to the parent of the repo instead of the repo root, which silently broke the `scoring-export.json` → `database/` copy.
