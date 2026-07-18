---
title: Wikipedia Article List — Criteria & Scoring Reference
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
last_updated: 2026-07-17
---

# Wikipedia Article List — Criteria & Scoring Reference

This document is the standing specification for the 250-article Wikipedia list on Jesus / the four Gospels: what goes into the candidate pool, what makes the cut, and how the cut is ranked. It is a reference to be applied on every run, not a log of past runs — for a record of what has actually changed over time, see the skill's own run output and `git`/file history rather than this document.

**Source of every title/URL:** live Wikipedia, browsed via `!HeadlessChromeBrowser` — never fabricated or recalled from memory.

**Maintained by:** the Skillbank skill `!TheJesusWebsite-Wikipedia` (`System/Skillbank/Church/!TheJesusWebsite-Wikipedia/`), which applies Stage 1–3 below on demand — tops the list up toward the 250 ceiling when short, or runs a consistency check when it's already full. This document is what the skill applies; the skill is the mechanism that applies it.

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

Ranking is separate from selection: a title is on the *list* because it passed Stage 2; its *rank number* is set by a weighted score based on how the article sources and substantiates its content. Rank 1 = highest net score, 250 = lowest.

**Method:** score every listed article against the weights below, sum to a net score, sort all 250 by net score (highest first), apply the tie-break rules on ties, and number 1–250.

**Source of truth:** THIS TABLE is authoritative. `scripts/rank_engine.py` (`net_score_from_signals`) and `scripts/extract.js` are implementations of it — if the code and this table ever disagree, the code is wrong and must be upgraded to match the table, never the other way around. After any such code fix (or any deliberate change to this table), run `rank_engine.py rescore` so every article is re-scored under the corrected rubric.

**Weight-cell convention:** a cell reading "+N per X, capped at ±M" means the underlying signal is a real count, multiplied and capped as stated. A cell with a bare "+N"/"−N" and no "per"/"capped" language means the signal is flat and binary — it either fires once or not at all, regardless of how many times the underlying condition is true in the article.

Rows below are ordered by weight, most positive first, most negative last — biggest reward for grounding at the top, biggest penalty for disconnection at the bottom.

| Signal | Weight | Notes |
|---|---|---|
| Cites a specific Bible verse (chapter:verse reference to the passage in question) | **+3** per citation, capped at **+9** | Rewards direct grounding in the scriptural text itself |
| **Data/interpretation split** — the article separates raw data/information (the narrative, the account, what the sources say) from how that data is understood, explained, and put into context (e.g. a "Biblical account"/"Narrative" section held apart from an "Interpretation"/"Scholarly views"/"Theological significance" section) | **+3** | Rewards structural clarity between the data itself and its interpretation. Detection uses the shared **section classifier** (see *Section buckets* below) — the same definition of "data section" and "interpretation section" that drives the placement multipliers, so the two can never disagree |
| Cites or mentions a specific manuscript (e.g. a named papyrus, codex, or textual witness) | **+2** per distinct manuscript, capped at **+6** — **doubled** (capped points ×2, max +12) for teaching/saying/idiom articles and books of the Bible (`is_teaching` / `is_bible_book`) | Rewards grounding in the primary textual record for every article, with extra weight where the textual witness matters most. Counted against a fixed list of well-known manuscripts (Codex Sinaiticus, Codex Vaticanus, Dead Sea Scrolls, etc.); falls back to a flat +2 (count of 1) if the article discusses a manuscript generically without naming one from the list |
| Cites an **ante-Nicene** (pre-325 AD) Christian author (e.g. Ignatius of Antioch, Polycarp, Justin Martyr, Irenaeus, Tertullian, Origen, Clement of Alexandria/Rome, Eusebius, Hippolytus, Cyprian) | **+2** per author, capped at **+6** | Early Christian testimony, cut off at Nicaea (325 AD) to keep this distinct from later theological/commentary sources |
| Cites/mentions an archaeological **site or artefact** (e.g. an IAA-documented find, an excavation, an inscription, an ossuary) | **+2** | Direct physical corroboration |
| Provides **historical/contextual** information — comparanda rather than a direct find (e.g. "a similar inscription," "parallels in Second Temple practice," discussion "in the broader context of...") | **+2** | Comparative-context signal — useful but weaker than a cited find |
| Cites a peer-reviewed journal article as a source | **+1** per citation, capped at **+5** | Rewards scholarly, checkable sourcing |
| Cites a scholarly book/monograph as a source | **+1** per citation, capped at **+5** | Rewards scholarly depth |
| Quotes a **primary source** directly (a blockquote, or a substantial quoted passage in the running text) | **+1** per quote, capped at **+4** | Rewards showing the actual ancient text rather than only paraphrasing or citing it |
| Discusses **Jewish context** of Jesus or the Gospels (e.g. Second Temple Judaism, Pharisees, Sadducees, synagogue, halakha, Torah, rabbinic, Essenes, Qumran, messianic expectation, Passover, Jewish custom/law/practice, Mishnah, Talmud, intertestamental) | **+1** per distinct concept, capped at **+4** | Rewards grounding Jesus and the Gospel narratives in their historical Jewish setting. Counted against a fixed keyword list; each matched term counts as one hit |
| Shows **balanced debate** in its interpretation sections — opposing viewpoints, evidence of scholarly discussion and disagreement (variations of: "others argue", "some scholars contend", "critics claim", "opponents maintain", "proponents counter", "in contrast", "conversely", "on the other hand", "alternative interpretation", "competing explanation", "a different perspective suggests", plus "scholars are divided", "no consensus") | **+1** per distinct debate pattern, capped at **+3** — **doubled** (max +6) when **2+ named representatives** are cited for the differing views (a personal name directly attributed a stance verb, e.g. "N. T. Wright argues…", "Raymond Brown contends…") | Rewards an interpretation section that presents genuine back-and-forth rather than a single settled reading — and rewards it more when each side has a cited voice. Scanned in **interpretation-bucket text only** (see *Section buckets*); sentences mentioning Islamic / Mormon / other-religion material are dropped before scanning, so interfaith comparison never earns this credit |
| Cites a scholarly **commentary** as a source (e.g. Word Biblical Commentary, Anchor Bible, Hermeneia, ICC, NICNT/NIGTC, Pillar, Sacra Pagina) | **+1** per citation, capped at **+3** — **only fires for parable / idiom / saying / teaching articles** (`is_parable` / `is_teaching`); scores 0 elsewhere | Minor positive — exegesis-focused sourcing rewarded where exegesis is the article's substance |
| Cites/mentions a **non-Christian ancient source** corroborating Jesus' existence (Josephus, Tacitus, Pliny the Younger, Suetonius, Mara bar Serapion, Lucian of Samosata, Celsus, Phlegon of Tralles) | **+1** per source, capped at **+3** | Minor positive — extrabiblical historical corroboration, distinct from the general primary-source-quote signal |
| Wikipedia itself rates the article **Good Article** or **Featured Article** | **+1** | Minor positive — a free, objective, already-peer-reviewed quality signal from Wikipedia's own process |
| Quotes from a **Gnostic** source specifically (Nag Hammadi texts, Gospel of Thomas/Judas/Philip/Mary, Valentinian/Sethian material) | **−1** | Minor negative, independent of the general primary-source-quote credit above (which still applies) |
| **Poor referencing** — incomplete footnotes (e.g. a live "citation needed" tag, or a maintenance banner asking for more/better citations) | **−1** | Minor negative — flags an article Wikipedia's own maintenance system considers under-sourced |
| Cites a Jesus Seminar–affiliated author (e.g. Robert Funk, John Dominic Crossan, Marcus Borg) approvingly / uncritically | **−2** per author, capped at **−6**, then the **placement multiplier** (below) applied | Penalizes reliance on that school of criticism being treated as settled rather than contested. Counted against the named-author list; falls back to a flat −2 (count of 1) if the article references "Jesus Seminar" generically without naming one of the three. **Detector limitation:** name-matching can't judge stance — an article that cites Crossan only to refute him scores the same penalty as one that cites him approvingly |
| Raises criticism of continuity between the Old and New Testaments — four schools of critique: **(a) contextual disconnection / proof-texting** (NT writers lifting OT passages from their original historical context; pesher/midrashic re-authoring, e.g. Isaiah 7:14 read against its Ahaz-era setting), **(b) divergent messianic expectations** (the Davidic political-victor Messiah of the Hebrew Bible vs. the NT's suffering divine Savior framed as a rupture, not fulfillment), **(c) abrogation of the Mosaic Law** (the Torah's "everlasting covenant" vs. Paul/Hebrews treating the Law as obsolete — supersessionism, covenantal discontinuity), **(d) intertestamental theological evolution** (NT concepts — developed angelology, dualism, resurrection, heaven/hell — as products of Hellenistic/Persian-influenced Second Temple apocalypticism rather than the classical OT), plus plain contradiction/discrepancy framing | **−2** per distinct critical pattern matched, capped at **−6** | Penalizes framing that treats OT–NT continuity as unresolved/contested. **Detector limitation:** keyword-pattern matching can't tell whether the article is raising the criticism approvingly or reporting it only to rebut it |
| Raises criticism of the supernatural worldview (e.g. treats miracles, virgin birth, or resurrection as inherently implausible) | **−2** per instance, capped at **−6** | Penalizes framing that treats the supernatural claims as presumptively false. **Detector limitation:** same stance-blindness — a "naturalistic explanation" mentioned only to be refuted still triggers the keyword match. **Note:** "swoon theory" was removed from this signal; it is now detected separately under Passion-specific criticism below |
| Raises **Passion-specific criticism** — swoon theory, stake theory / torture stake / impalement theory | **−2** per distinct term, capped at **−6** | Scoped to Passion articles only (detected by Wikipedia category: Passion of Jesus / Crucifixion / Resurrection). Each distinct term found counts as one hit |
| Raises **miracle-specific** secular-materialist or mythic presuppositions (e.g. naturalistic explanation, psychosomatic, mass hallucination, mythological, legendary development/accretion, scientifically explain/implausible) | **−2** per distinct term, capped at **−6** | Scoped to Miracle articles only (detected by Wikipedia category: Miracles of Jesus). **Section-aware:** text under headings containing "criticism"/"historical"/"naturalistic"/"scholarly"/"skeptical" is excluded from the scan — only mentions in the main narrative/account sections count |
| **Confessional balance** — fires whenever a **critical-biblical-scholarship historian** (Bart Ehrman, Gerd Lüdemann, Elaine Pagels, Paula Fredriksen, Reza Aslan, Maurice Casey, Hector Avalos, Dale B. Martin) is cited anywhere in the article, **including a bibliography/footnote-only citation** — a footnote counts as outside the interpretation sections (explicit call, 2026-07-17) | **−3** if cited **outside** the interpretation sections (data/narrative, lede, references); **−1** if cited inside the interpretation sections **without** a contrasting Evangelical author (N. T. Wright, Richard Bauckham, Craig Blomberg/Keener/Evans, Darrell Bock, Ben Witherington, Michael Licona, Gary Habermas, D. A. Carson, Douglas Moo, F. F. Bruce, I. Howard Marshall…); **0** if inside the interpretation sections **with** one | Not a blanket penalty on critical scholarship — a penalty on critical scholarship presented as settled data, or presented one-sided. Mixed placement (both inside and outside interpretation) takes the −3. No credit is ever given for the Evangelical author alone |
| Cites or references **other-religion** sources or authors (Islamic: Qur'an, Muhammad, Hadith; Mormon: Book of Mormon, Joseph Smith, LDS, Doctrine and Covenants; plus Buddhist, Hindu, Sikh, Jain, Rastafari, Bahá'í material) | **−3** | Moderate negative — sources from outside the Christian tradition being cited as authoritative about Jesus. Uses the same matcher as the balanced-debate sentence exclusion, so the two can never drift apart |
| Cites a **Christ myth theory / mythicist** author approvingly (e.g. Richard Carrier, Robert M. Price, Earl Doherty) | **−3** per author, capped at **−9**, then the **placement multiplier** (below) applied | Moderate negative — a more radical denial-of-existence position than Jesus Seminar's critical-but-historicist stance, so weighted heavier. **Detector limitation:** same stance-blindness as the Jesus Seminar row — approving vs. refuting citation aren't distinguished |
| Has **no references at all** | **−8** | Unsourced articles are penalized heavily |
| Cites **no** Bible verse anywhere in the article | **−10** | Heaviest penalty — disconnected from the primary text |

**Section buckets & placement multiplier (2026-07-17).** Every article's body text is bucketed at harvest time into **data** (text under narrative-family headings: "Biblical account", "Narrative", "Gospel account", "In the Gospel of…", etc.), **interpretation** (text under interpretation-family headings: "Interpretation", "Theological significance", "Scholarly views", "Historicity", "Criticism", "Analysis", "Authorship", etc.), and **other** (the lede, reference/footnote/bibliography lists, and everything else).

> **Standing rule (Luke, 2026-07-17): footnote/reference-list text COUNTS for every weight.** There is no footnote exemption anywhere in the rubric — a citation in the bibliography is a citation in the article, full stop. Reference lists sit in the **other** bucket, which for placement purposes is outside the interpretation sections.

Three further robustness rules:

1. Wikipedia's parser output is **flat** — headings are siblings of the paragraphs that follow, never ancestors — so bucketing walks the content in document order, reclassifying at each h2/h3. (The previous miracle-criticism "section-aware" scan walked ancestors and therefore never actually excluded anything; fixed the same day.)
2. An unmatched h3 inherits its parent h2's bucket; a heading matching **both** families (e.g. "Historical account") is classed **other**, so ambiguity never triggers a doubling or a halving.
3. A hit present in the page but in none of the walked buckets (e.g. a navbox) counts as **other** — never silently unplaced.

**Placement multiplier** — applies to the two negative-weight-**author** signals (Jesus Seminar, mythicist), on top of their capped penalty:

| Where the author appears | Multiplier | Rationale |
|---|---|---|
| Any hit in a **data** section | **×2** | Critical authors presented as part of the factual account is the worst case |
| Hits **only** in **interpretation** sections | **×0.5** | Properly quarantined as one scholarly view among others |
| Anything else (lede, references, mixed interp+other, ambiguous) | **×1** | Baseline |

The multiplied result truncates toward zero (a halved single mythicist hit is −1, not −2). The multiplier used per article is stored in the Scoring Detail CSV (`jesus_seminar_mult`, `mythicist_mult`).

**Tie-break (in order):**
1. Higher number of Bible verses cited wins.
2. If still tied, higher number of total references wins.
3. If still tied, alphabetical order by title.

**Article-category conditionals —** some signals only fire, or fire differently, depending on article category. Categories are detected via the Wikipedia category strip (`#mw-normal-catlinks`) at harvest time and stored in the detail CSV (`is_passion`, `is_miracle`, `is_parable`, `is_location`, `is_teaching`, `is_bible_book` columns). These do not produce their own net-score contribution; they gate other signals:

| Category | Detection | Effect |
|---|---|---|
| Passion | Category strip contains "Passion of Jesus" / "Crucifixion of Jesus" / "Resurrection of Jesus" | Passion-specific criticism signal fires (swoon/stake theory) |
| Miracle | Category strip contains "Miracles of Jesus" | Miracle-specific criticism signal fires (secular-materialist keywords); section-aware scan excludes text under criticism/historical/naturalistic/scholarly/skeptical headings |
| Parable | Category strip contains "Parables of Jesus" | `archaeological site/artefact` and `ancient historian` signals score as 0 (harvested but exempted — parables are narrative teachings, not historical/archaeological claims) |
| Location | Category strip contains "New Testament places" / "New Testament cities" / "Holy Land" / "Geography of Israel" / "Cities in Israel" / "Archaeological sites in Israel" / "Hebrew Bible places" | If `archaeological site/artefact` fires, an extra **+3** is added on top of the standard **+2** (total **+5**) |
| Niche | `ref_count` (total references) is less than 5 / less than 10 | A tiered exposure bonus: **+3** when under 5 references, **+1** when 5–9 — a stronger offset so a short, well-researched topic isn't punished by signals designed for major articles |
| Teaching | Category strip contains "Sayings of Jesus" / "teachings of Jesus" / "New Testament idioms" / "New Testament words and phrases" / "Sermon on the Mount" | Gates the commentary-citation signal; **doubles** the named-manuscript signal (see above) |
| Bible book | Category strip contains "Books of the New Testament" / "Canonical Gospels" / "Gospels", or title is "Gospel of Matthew/Mark/Luke/John" | **Doubles** the named-manuscript signal (see above) |

**How each signal is measured** — via an automated text/DOM scan of the live Wikipedia page (`scripts/extract.js`):
- **Bible verse count** — regex match on `<Book> <chapter>:<verse>` patterns in the rendered text, deduplicated.
- **Reference count** — count of list items in the reference/footnote list.
- **Journal / book / commentary citations** — reference-list entries matched against journal-ish markers (`journal`, `doi.org`, `jstor`), book-ish markers (`ISBN`, `University Press`), or named commentary series/`"commentary"` itself.
- **Archaeological site/artefact vs. historical context** — two independent checks: IAA/"archaeolog-"/"excavat-"/"ossuary"/"inscription" keywords for the former; comparative-language matches ("parallel," "comparable to," "analogous," "similar artefact/inscription/custom," "in the broader/historical/cultural context") for the latter.
- **Manuscript mentions** — count of distinct named manuscripts matched from a fixed list (Codex Sinaiticus, Codex Vaticanus, Codex Alexandrinus, Codex Bezae, Codex Ephraemi, Codex Washingtonianus, Chester Beatty Papyri, Bodmer Papyri, Dead Sea Scrolls, Papyrus 52/66/75); if none of those are named but the article still mentions "papyrus"/"codex"/"manuscript" generically, counts as 1.
- **Jesus Seminar authors** — count of distinct named authors matched (Robert Funk, John Dominic Crossan, Marcus Borg); if none are named but the article still mentions "Jesus Seminar" generically, counts as 1. Each hit's section placement (data / interpretation / other, per the bucket rules above) is also recorded to drive the placement multiplier; the same applies to mythicist authors.
- **Primary-source quotes** — count of `<blockquote>` elements plus long (40+ character) quoted spans in the running text. A blunt proxy: counts any substantial quotation, not only verified primary-source ones.
- **Gnostic-source quotation** — keyword match for "Gnostic," Nag Hammadi texts, the named Gnostic gospels, Valentinian/Sethian material. Flags the article discussing/quoting Gnostic material generally, not that a specific quoted passage is itself Gnostic.
- **Poor referencing** — presence of a live "citation needed" tag or an "additional citations needed"-style maintenance banner.
- **Wikipedia quality rating** — checks page indicator elements (`[id^="mw-indicator-"]`) for a title/caption containing "good article" or "featured article."
- **Ancient historians / ante-Nicene authors / mythicist authors** — each checks the rendered text for a fixed list of named individuals: Josephus/Tacitus/Pliny the Younger/Suetonius/Mara bar Serapion/Lucian of Samosata/Celsus/Phlegon for the first; Ignatius of Antioch/Polycarp/Justin Martyr/Irenaeus/Tertullian/Origen/Clement of Alexandria/Clement of Rome/Eusebius/Hippolytus/Cyprian for the second (cut off at the Council of Nicaea, 325 AD); Richard Carrier/Robert M. Price/Earl Doherty (or generic "mythicist"/"Christ myth theory" framing if none is named) for the third. Each is a real count of distinct names matched, not presence-only.
- **Data/interpretation section split** — the shared section classifier (see *Section buckets* above) must find at least one narrative-family heading AND at least one interpretation-family heading. Narrative patterns are anchored (a bare "account" or "in the" mid-heading no longer matches — the old loose regex matched headings like "In the arts").
- **OT–NT continuity criticism** — a fixed list of regex patterns covering the four schools above: proof-texting/out-of-context language, "pesher"/"midrash-", original-context arguments about OT prophecy; redefinition/reinterpretation language near "messiah"/"messianic," messianic-expectation contrasts (political/military/Davidic); "abrogat-"/"supersed-"/"obsolet-" near law/Torah/covenant/Mosaic, "supersessionis-"; "intertestamental" development/influence language, Hellenistic/Persian/Zoroastrian influence near apocalyptic/resurrection/dualism/angelology, Second Temple apocalypticism; plus the original contradiction/discrepancy-near-OT/prophecy patterns. The count is the number of DISTINCT patterns matched (feeding the −2-per capped weight), not raw instance frequency.
- **Supernatural-worldview criticism** — keyword/phrase patterns ("mythological," "historicity questioned," "naturalistic explanation," etc.), counted per instance in the text, feeding the −2-per-instance capped weight. **Note:** "swoon theory" was removed from the supernatural-criticism pattern; it is now detected by the Passion-specific criticism signal.
- **Jewish context** — count of distinct terms matched from a fixed keyword list (Second Temple Judaism, Pharisees, Sadducees, synagogue, halakha/halakhic, Torah, rabbinic/rabbinical, Essenes, Qumran, messianic expectation, Passover, Jewish custom/law/practice, Mishnah, Talmud, intertestamental) in the rendered article text.
- **Balanced debate** — the interpretation-bucket text is split into sentences; any sentence matching the shared other-religion matcher (see *Other-religion sources* below — the same list drives both) is dropped; the remainder is scanned against a fixed list of debate-marker patterns ("others argue/contend/suggest", "some scholars … while/whereas/others", "scholars are divided/disagree/differ", "on the other hand"/"by contrast"/"conversely", "alternative/opposing/competing/minority/dissenting view/interpretation/reading", "debated/disputed/contested/controversial", "critics claim", "opponents maintain", "proponents counter", "in contrast", "a different perspective suggests", "competing explanation", "defend/refute/rebut/counter-argument", "point of contention"/"no consensus"). Count = number of DISTINCT patterns matched. Separately, **named representatives** are counted: distinct capitalized personal names directly attributed a stance verb ("N. T. Wright argues", "Raymond Brown contends") within the same filtered interpretation text; 2+ distinct names doubles the capped bonus.
- **Confessional balance** — checks the critical-scholar name list (Ehrman etc.) against the section buckets; a hit in data or other (which includes footnotes/bibliography) counts as outside the interpretation sections, so a footnote citation still pings; only interpretation-confined hits reach the milder tiers. The Evangelical-contrast check tests the Evangelical name list against interpretation-bucket text only.
- **Other-religion sources** — presence of any term from the shared other-religion matcher (Qur'an/Quran, Muhammad, Hadith, Surah, Book of Mormon, Joseph Smith, Latter-day Saint, LDS, Doctrine and Covenants, Pearl of Great Price, Islam-/Muslim-/Mormon-/Buddhis-/Hindu-/Sikh-/Jain-/Rastafari-terms, Bahá'í, Bhagavad, Veda(s)) in the rendered article text. The same matcher drives the balanced-debate sentence exclusion.
- **Passion-specific criticism** — count of distinct terms matched from a fixed list (swoon theory, stake theory, torture stake, impalement theory); only fires for articles whose Wikipedia category strip includes "Passion of Jesus," "Crucifixion of Jesus," or "Resurrection of Jesus."
- **Miracle-specific criticism** — count of distinct terms matched from a fixed list (naturalistic explanation, psychosomatic, mass hallucination, mythological, legendary development/accretion, scientifically explain/implausible); only fires for articles whose Wikipedia category strip includes "Miracles of Jesus." Section-aware via the shared buckets: only **data + other** text is scanned — anything under an interpretation-family heading is excluded. (Previously implemented with an ancestor walk that never fired; see *Section buckets*.)

## List processing — pool → list → rank → file

The full pipeline, in order:

1. **Create the pool** — Stage 1: crawl, collect every mainspace article link, de-duplicate by URL. No judgment yet.
2. **Create the list** — Stage 2: apply the inclusion/exclusion rules to cut the pool down to the selected titles.
3. **Rank the list** — Stage 3: score every selected title against the weight table. Per-article inputs and computed net score are recorded in **`Wikipedia Articles - Scoring Detail.csv`** — that file *is* the ranking working table; sorting it by net score (then the tie-break rules) produces the final `ranking` value for each title.
4. **Write the deliverable file** — output the three columns (`title`, `url`, `ranking`) from the sorted table into `Wikipedia Articles.csv` and `wiki-bulk-paste.txt`. Any comma inside a **title** is replaced with a hyphen (e.g. *Mary, mother of Jesus* → *Mary - mother of Jesus*), and any comma inside a **URL** is percent-encoded as `%2C` (a legal URL character — doesn't change where the link resolves) — so every line is safe to read as plain comma-separated text with no quoting or escaping needed anywhere.

## Companion files

Authoritative state, meant to be read/written by tooling rather than hand-edited:
- **`excluded-titles.txt`** — the permanent named-exclusion denylist. A future one-off "exclude this specific article" request goes through `rank_engine.py exclude "<title>" ...`, which appends here AND removes the row from the live data in one step. For a removal that should NOT be permanent, use `rank_engine.py remove "<title>" ...` instead.
- **`candidate-pool.tsv`** — the cache of every `title\turl` pair discovered by crawling to date, so a top-up can draw on leftover candidates before re-crawling.
- **`wiki-bulk-paste.txt`** — the plain-text "title, url, rank" rendition of the full list, comma-space delimited, same hyphen/percent-encoding convention as the main CSV. The final end point of the pipeline; regenerated every time the deliverable files change.
- **`scoring-export.json`** — the machine-readable export for The Jesus Website's visualization widget: merged title/url/ranking/net_score per article, per-signal POINT contributions (caps and category conditionals applied — they sum exactly to net_score, verified at write time), uncapped raw signals, category flags, an embedded signal dictionary (label/weight/caveat per signal), and generation metadata. Regenerated on every data write AND copied to `/Users/lukeishammacbookair/Developer/thejesuswebsite/database/scoring-export.json` (copy skipped with a warning if that folder is absent). Also produced standalone via `rank_engine.py export`. Per Luke's explicit standing instruction (2026-07-16), this outbound copy SKIPS `!Checkpoint`.
- **`.rescore-progress.jsonl`** — a transient, resumable progress file used only during a `rank_engine.py rescore` run (a full re-harvest of every current article under the current weight table, used after a weight-table change). Deleted automatically on completion; its presence means a previous rescore was interrupted and should be re-run to resume.

## Data/scope notes

- Apocrypha/Gnostic gospels are excluded wholesale under Stage 2's current criteria; miracles, parables, and obscure Passion events are included in full. If the live data in `Wikipedia Articles.csv` doesn't yet reflect a criteria change made here, that's a separate step — this document defines the target state, applying it to the actual 250-article list is a run of the skill.
- Place-article coverage (Bethlehem, Nazareth, Jerusalem, Capernaum, Gethsemane, and similar) needs deliberate attention at Stage 1 — a category-only crawl has previously missed it entirely.
- A few Stage 2 calls sit at a judgment margin: narrated gospel scenes with doctrinal-sounding titles (e.g. *Great Commission*, *Olivet Discourse*, *Temptation of Christ*) are treated as narrative, not "purely theological," and are included; church-building/architecture articles (e.g. *Church of the Holy Sepulchre*, *Church of the Nativity*) are treated as leaning toward architecture/pilgrimage-site rather than gospel content, and are excluded.

**Run record (per skill STEP 5):**
- 2026-07-17 (8th pass) — mode=weights+rescore — new **standing rule from Luke: footnote/reference-list text counts for every weight — no footnote exemption anywhere in the rubric.** A briefly-introduced fourth "refs" section bucket (which exempted footnotes from prose-placement detection) was reverted the same day before any rescore completed under it; reference lists live in the 'other' bucket, and a footnote citation of a critical scholar counts as outside the interpretation sections for Confessional balance. Full rescore of all 255 run under this rule.
- 2026-07-17 (7th pass) — mode=add (single, Luke-named) — "Jerusalem during the Second Temple period" harvested and scored (net score 23, rank 87); 254 → 255 (ceiling 250 exceeded by explicit request). `check` exits 0 post-add.
- 2026-07-17 (6th pass) — mode=rescore — full re-harvest of all 254 currently-listed articles under the complete accumulated rubric (data/interp split rename, manuscript-bonus removal, all-articles manuscript credit doubled for teachings/Bible books, Islamic/Mormon → Other-religion expansion, niche tiers, gated commentary credit, expanded ancient-source list, Jesus Seminar/mythicist placement multipliers, balanced debate incl. named-representative doubling, and the new Confessional balance signal). No harvest failures. `check` exits 0 post-rescore (254 articles, all files consistent); website export regenerated (article_count 254). RESCORE NO LONGER PENDING.
- 2026-07-17 (5th pass) — mode=weights — (1) **Balanced debate** expanded: pattern list now covers "critics claim", "opponents maintain", "proponents counter", "in contrast", "competing explanation", "a different perspective suggests" variants, and the capped bonus is **doubled** (max +6) when 2+ distinct named representatives are cited for the differing views (new `balanced_debate_named` column). (2) New conditional signal **Confessional balance**: fires only when a critical-scholarship historian (Ehrman et al.) is cited — −3 outside the interpretation sections, −1 inside without a contrasting Evangelical author, 0 inside with one (new columns `critical_scholar_hits`, `critical_outside_interp`, `evangelical_contrast`). Signal count 27 → 28. **RESCORE STILL PENDING.**
- 2026-07-17 (4th pass) — mode=weights-refactor — (1) split signal renamed **Data/interpretation split** (raw data vs how it's understood/contextualized); (2) **Manuscript-article bonus removed** entirely (with the `is_manuscript` flag); (3) named-manuscript credit now scores for ALL articles, doubled (max +12) for teachings/sayings/idioms and books of the Bible (parables no longer special-cased); (4) Islamic/Mormon penalty expanded to **Other-religion sources** (adds Buddhist, Hindu, Sikh, Jain, Rastafari, Bahá'í; detail column renamed `islamic_mormon_hit` → `other_religion_hit`), sharing one matcher with the balanced-debate exclusion. Signal count 28 → 27. **RESCORE STILL PENDING.**
- 2026-07-17 (later still) — mode=weights — new positive signal **balanced debate**: +1 per distinct debate-marker pattern (capped +3), scanned in interpretation-bucket text only, with other-religion sentences excluded before scanning. New detail column `balanced_debate_hits`. **RESCORE STILL PENDING.**
- 2026-07-17 (later) — mode=exclude+weights — "Signs Gospel" and "Scourge" added to the permanent denylist (already removed earlier same day; live count stays 254). Section machinery rebuilt: document-order data/interp/other text buckets (fixing the ancestor-walk bug that made the miracle-criticism section exclusion a no-op, and tightening the loose narrative-heading regex); Jesus Seminar and mythicist penalties now carry a placement multiplier (×2 any hit in a data section, ×0.5 interp-only, ×1 otherwise), stored in the detail CSV. **RESCORE STILL PENDING.**
- 2026-07-17 — mode=remove+weights — removed "Signs Gospel" and "Scourge" (non-permanent; 256 → 254). Then four weight-table changes made per Luke: niche bonus tiered (+3 under 5 refs / +1 at 5–9); commentary credit gated to parables/idioms/sayings/teachings; named-manuscript credit gated to parables/teachings/books of the Bible; ancient-source list expanded to 8 names (added Mara bar Serapion, Lucian of Samosata, Celsus, Phlegon of Tralles). **RESCORE PENDING per Luke's instruction — the live data is still scored under the OLD rubric; run `rank_engine.py rescore` before trusting the ranking, and expect `export` to abort on a contribution mismatch until then.**
- 2026-07-16 (later) — mode=rescore — OT–NT criticism detector rebuilt around four schools of critique (proof-texting / messianic divergence / Law abrogation / intertestamental evolution), 16 distinct-count patterns; full rescore of all 256, no failures; signal now fires on 16 articles (was 0 everywhere).
- 2026-07-16 — mode=topup — full rescore of all 200 under corrected rubric (OT–NT and supernatural criticism now per-instance counts, capped −6), then 56 Luke-approved additions merged; 200 → 256 (ceiling 250 exceeded by explicit approval; future top-ups skip until below ceiling). No harvest failures, no shortfall.

## Weight summary

| Criterion | Weight |
|---|---|
| Bible verses | +3 per, capped +9 |
| Data/interpretation split | +3 |
| Manuscript mentions | +2 per, capped +6; doubled for teachings/Bible books |
| Ante-Nicene author mentions | +2 per, capped +6 |
| Archaeological site/artefact | +2 |
| Historical context | +2 |
| Journal citations | +1 per, capped +5 |
| Book citations | +1 per, capped +5 |
| Primary-source quotes | +1 per, capped +4 |
| Jewish context | +1 per, capped +4 |
| Balanced debate (interpretation sections only) | +1 per, capped +3; doubled with 2+ named representatives |
| Commentary citations (parables/teachings only) | +1 per, capped +3 |
| Ancient historian mentions (8-name list) | +1 per, capped +3 |
| Wikipedia quality rating | +1 |
| Niche exposure (tiered) | +3 if <5 refs; +1 if 5–9 refs |
| Gnostic source quoted | −1 |
| Poor referencing | −1 |
| Confessional balance (critical scholar cited) | 0 in interp with Evangelical contrast; −1 in interp without; −3 outside interp |
| Jesus Seminar citations | −2 per, capped −6, ×2 data / ×0.5 interp-only |
| OT–NT criticism | −2 per, capped −6 |
| Supernatural criticism | −2 per, capped −6 |
| Passion-specific criticism | −2 per, capped −6 |
| Miracle-specific criticism | −2 per, capped −6 |
| Other-religion sources | −3 |
| Mythicist citations | −3 per, capped −9, ×2 data / ×0.5 interp-only |
| No references | −8 |
| No Bible verses | −10 |

## Weight descriptions (name + how it's calculated)

| Weight | How it's calculated |
|---|---|
| Bible verses cited | Counts unique chapter:verse references (e.g. "John 3:16") in the article text; +3 each, up to +9 |
| Data/interpretation split | +3 flat if the article separates its raw data/information from how that data is understood and contextualized — at least one narrative-family heading ("Biblical account", "Narrative", "In the Gospel of…") AND at least one interpretation-family heading ("Interpretation", "Scholarly views", "Historicity"…) |
| Named manuscripts | Counts distinct manuscripts from a fixed list (Codex Sinaiticus, Dead Sea Scrolls, Papyrus 52…); a generic "papyrus/codex/manuscript" mention counts as 1; +2 each, up to +6 — **doubled** (max +12) for teachings/sayings/idioms and books of the Bible |
| Ante-Nicene authors | Counts distinct pre-325 AD Christian authors named (Ignatius, Polycarp, Justin Martyr, Irenaeus, Tertullian, Origen…); +2 each, up to +6 |
| Archaeological site/artefact | +2 flat if the text mentions an excavation, inscription, ossuary, or IAA/archaeology language — scores 0 for parables |
| Location + archaeology bonus | +3 extra (on top of the +2 above) when a location article (New Testament places/cities category) has an archaeology hit |
| Historical context | +2 flat for comparative-context language ("parallels", "comparable to", "in the broader historical context"…) |
| Journal citations | Counts reference-list entries with journal markers (journal, DOI, JSTOR…); +1 each, up to +5 |
| Book citations | Counts reference-list entries with book markers (ISBN, University Press…); +1 each, up to +5 |
| Primary-source quotes | Counts blockquotes plus long (40+ char) quoted spans; +1 each, up to +4 |
| Jewish context | Counts distinct terms from a fixed list (Second Temple, Pharisees, Torah, Qumran, Passover, Mishnah…); +1 each, up to +4 |
| Balanced debate | Counts distinct debate-marker patterns ("others argue", "some scholars contend", "critics claim", "opponents maintain", "proponents counter", "in contrast", "conversely", "alternative interpretation", "competing explanation", "a different perspective suggests", "no consensus"…) found in **interpretation-section text only**, after dropping sentences that mention other religions; +1 each, up to +3 — **doubled** (max +6) when 2+ named representatives are cited for the differing views ("N. T. Wright argues…") |
| Confessional balance | Fires only when a critical-scholarship historian (Bart Ehrman, Lüdemann, Pagels, Fredriksen…) is cited: **−3** if cited outside the interpretation sections, **−1** if inside them without a contrasting Evangelical author (Wright, Bauckham, Blomberg, Keener…), **0** if inside them with one |
| Commentary citations | Counts reference-list entries naming a scholarly commentary series (Word Biblical, Anchor, Hermeneia, NICNT…); +1 each, up to +3 — **only scores for parables and teachings/sayings/idioms** |
| Non-Christian ancient sources | Counts distinct names from the 8-source list (Josephus, Tacitus, Pliny the Younger, Suetonius, Mara bar Serapion, Lucian of Samosata, Celsus, Phlegon); +1 each, up to +3 — scores 0 for parables |
| Wikipedia quality rating | +1 flat if Wikipedia's own process rates the page Good Article or Featured Article |
| Niche exposure bonus | Tiered on total reference count: +3 if under 5 references, +1 if 5–9 — protects short, well-researched topics |
| Gnostic source quoted | −1 flat if the article discusses/quotes Gnostic material (Nag Hammadi, Gospel of Thomas…) |
| Poor referencing | −1 flat for a live "citation needed" tag or a citations-needed maintenance banner |
| Jesus Seminar citations | Counts named authors (Funk, Crossan, Borg; generic "Jesus Seminar" counts as 1); −2 each, capped −6 — then **doubled** if any hit sits in a data/narrative section, **halved** if hits sit only in interpretation sections |
| OT–NT continuity criticism | Counts distinct critical patterns across four schools (proof-texting, divergent messianic expectation, Law abrogation, intertestamental evolution) plus contradiction framing; −2 each, capped −6 |
| Supernatural criticism | Counts instances of naturalistic/mythological/historicity-doubting language; −2 each, capped −6 |
| Passion-specific criticism | Counts distinct terms (swoon theory, stake theory, impalement…) — Passion-category articles only; −2 each, capped −6 |
| Miracle-specific criticism | Counts distinct secular-materialist terms (naturalistic explanation, mass hallucination…) in non-interpretation text — Miracle-category articles only; −2 each, capped −6 |
| Other-religion sources | −3 flat if the text cites/mentions material from outside the Christian tradition — Islamic (Qur'an, Muhammad, Hadith), Mormon (Book of Mormon, Joseph Smith, LDS), Buddhist, Hindu, Sikh, Jain, Rastafari, or Bahá'í |
| Mythicist citations | Counts named authors (Carrier, Price, Doherty; generic "Christ myth theory" counts as 1); −3 each, capped −9 — then **doubled** if any hit sits in a data section, **halved** if interpretation-only |
| No references at all | −8 flat if the reference list is empty |
| No Bible verse cited | −10 flat if no chapter:verse reference appears anywhere |

## Weight names

| Weight |
|---|
| Bible verses cited |
| Data/interpretation split |
| Named manuscripts |
| Ante-Nicene authors |
| Archaeological site/artefact |
| Location + archaeology bonus |
| Historical context |
| Journal citations |
| Book citations |
| Primary-source quotes |
| Jewish context |
| Balanced debate |
| Confessional balance |
| Commentary citations |
| Non-Christian ancient sources |
| Wikipedia quality rating |
| Niche exposure bonus |
| Gnostic source quoted |
| Poor referencing |
| Jesus Seminar citations |
| OT–NT continuity criticism |
| Supernatural criticism |
| Passion-specific criticism |
| Miracle-specific criticism |
| Other-religion sources |
| Mythicist citations |
| No references at all |
| No Bible verse cited |
