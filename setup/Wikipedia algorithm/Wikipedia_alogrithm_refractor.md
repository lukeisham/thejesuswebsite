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


### 3.1 Signal Families

**Vector-embedding families:**
- `data-interpretation-split`
- `balanced-debate`
- `anti-supernatural`
- `ot-nt-discontinuity`
- `mythicist-framing`
- `jesus-seminar`
- `secular-materialist`
- `confessional-balance`

**Plain-list families** (see §3.5):
- `ante-nicene`
- `jewish-context`
- `scholarly-commentary`
- `non-christian-ancient`
- `other-religion`

**Associated-term families** (see §3.6):
- `archaeological`
- `peer-reviewed-journal`
- `scholarly-book`

**Unchanged plain lookups** (see §3.8):
- `bible-verses`, `named-manuscripts`, `primary-source-quotes`, `historical-context`, `wikipedia-quality`, `poor-referencing`, `no-references`, `no-bible-verses`, `niche-exposure`, `gnostic-source`

**Removed** (see §3.7):
- `passion-specific-criticism`

### 3.1.1 Data-Interpretation Split Design

This signal determines whether an article cleanly separates raw data/information from interpretation/context — currently a flat +3 when both section families are detected. The vector-enhanced approach replaces heading-pattern matching with three semantic vector-embedding stores queried together.

#### Information / Data Bucket Vector Store

Semantic content associated with the data/narrative side of the article:

- **Topic markers:** Background, Context, Historical background, Sources, Primary sources, Chronology, Timeline, Events, The event, Account, Narrative, What happened, Evidence, Archaeological evidence
- **Citation & attribution architecture:** Primary sources, archaeological sites and artefacts, archaeological reports — concrete, verifiable references

#### Context / Interpretation Bucket Vector Store

Semantic content associated with the interpretation/analysis side:

- **Topic markers:** Interpretation, Analysis, Meaning, Significance, Historiography, Historical interpretations, Scholarly debate, Theories, Legacy, Assessment, Reception, Modern scholarship, Evaluation
- **Citation & attribution architecture:** Secondary sources, variety allowed — broader scholarly discourse
- **Additional markers:** Methodology terms, contrastive markers ("however", "by contrast", "on the other hand")

#### Linguistic Register Vector Store

Captures syntactic and stylistic shift between the two section types, independent of topic:

| Feature | Data / Information sections | Interpretation / Context sections |
|---|---|---|
| **Tense** | Past tense, concrete: "In 44 BCE…", "The army marched to…" | Present tense, abstract: "Historians argue…", "This is seen as…" |
| **Specificity** | Specific entities, dates, places, numbers | General / abstract referents |
| **Verb choice** | Neutral, factive: "occurred", "included", "documented", "found" | Hedging and evaluative: "likely", "probably", "suggests", "indicates", "arguably", "significant" |
| **Attribution** | — | Named scholars / schools: "According to Gibbon…", "revisionist historians", "orthodox view" |

#### Combined Query Logic

The three stores are queried together at scoring time. An article earns the +3 data/interpretation split credit when it embeds both:

1. Sections whose text is a strong semantic match to the **Information/Data Bucket store** AND a strong stylistic match to the **data register** side of the Linguistic Register store.
2. Sections whose text is a strong semantic match to the **Context/Interpretation Bucket store** AND a strong stylistic match to the **interpretation register** side of the Linguistic Register store.

This replaces the current heading-pattern classifier entirely — the data/interpretation split is now detected from the article's actual content and voice, not from its section headings.

### 3.1.2 Balanced Debate Vector Store Design

This signal rewards interpretation sections that present genuine scholarly back-and-forth rather than a single settled reading. The vector-enhanced approach replaces keyword-pattern matching ("others argue", "critics claim", etc.) with a single store encoding the structural features of authentic balanced debate.

#### Positive signals (what the store encodes)

**1. Longevity language** — the debate is presented as established, not a one-off disagreement:
- "a long-standing debate since the 1960s"
- "a central question in Roman studies"
- "the traditional view held from Gibbon until…"
- References to identifiable **schools of thought** (named traditions, movements, or methodological camps)

**2. Representative individuals** — each view or argument is anchored to a named scholar:
- "N. T. Wright argues…", "Raymond Brown contends…", "E. P. Sanders maintains…"
- Views or arguments presented without representative individuals are a **red flag** — unattributed positions may indicate the author's own synthesis masquerading as a debate

**3. Disagreement across both layers** — genuine debate shows splits at two levels:
- **Data / information:** disagreement about what the sources actually say, what the archaeological record shows, which manuscripts read which way
- **Interpretation / methodology:** disagreement about how to weigh the evidence, which critical framework to apply, what the data means
- A debate that only disagrees about interpretation while treating the data as uncontested is weaker than one that surfaces tension at both layers

**4. Consensus language, properly anchored** — statements of scholarly agreement must be supported:
- **Valid:** "Most scholars agree that…" followed by representative names and justifying language ("Ehrman, Sanders, and Fredriksen each conclude, on independent grounds, that…")
- **Red flag:** Consensus language without representative names AND without justifying reasoning — bare "scholars agree" claims suggest the author is dismissing a debate rather than reporting one

#### Scoring integration

At scoring time, the interpretation-section text is embedded and compared against the store. The similarity score maps onto the existing capped contribution:
- **+1 per distinct debate pattern detected**, capped at **+3**
- **Doubled (max +6)** when 2+ named representatives are detected across the differing views
- The current placement rules continue to apply: scanned in interpretation-bucket text only, with other-religion sentences dropped before scanning

### 3.1.3 Anti-Supernatural Bias Vector Store Design

This signal penalises articles that frame supernatural claims (miracles, virgin birth, resurrection) as presumptively false. The vector-enhanced approach replaces keyword matching ("mythological", "naturalistic explanation", etc.) with a store encoding seven dimensions of structural bias. Each dimension is measured by the LLM / embedding model comparing the article's treatment of supernatural vs. naturalistic explanations.

| # | Bias Marker | What Is Measured | Biased Pattern | Neutral Pattern |
|---|---|---|---|---|
| 1 | **Attribution Verb Asymmetry** | Verbs used to introduce claims per view | Favoured: *shows, demonstrates, documents* / Disfavoured: *claims, alleges, insists* | Both sides: *argues, contends, observes, notes* |
| 2 | **Epistemic Marking** | Hedging, scare quotes, intensifiers | *so-called* reform, *allegedly* necessary, *supposedly* successful vs. *clearly* necessary | *necessary*, *the reform*, *described as successful by X* |
| 3 | **Granularity Asymmetry** | Sentence count, specificity, numbers per view | Favoured view gets context and motives; disfavoured gets vague summary. Precise numbers for one side's harms, vague for the other | Equal level of detail, causal context, and precision for both |
| 4 | **Labelling and Moral Lexicon** | Titles and evaluative adjectives | *government* vs. *regime*, *soldiers* vs. *militants*, *brutal* vs. *firm*, *heroic* vs. *reckless* | Consistent neutral labels: *government, soldiers, forces, administration* |
| 5 | **Narrative Agency and Causality** | Active vs. passive voice, who is identified as cause | Favoured: *Mistakes were made* / Disfavoured: *X suppressed, destroyed. In retaliation* vs. *unprovoked* | Active voice for actions of both sides; causality explained for both |
| 6 | **Structural and Positional Bias** | Placement, order, citation density, rebuttal coupling | Lead states favoured view as fact; disfavoured only appears in a late "Criticism" section. View B always followed by *However…*. View A has 4 citations, View B has 0 | Lead states consensus *and* debate. Equal space, equal citation quality, critiques not glued to only one side |
| 7 | **Presupposition and Omission** | Presupposed facts, missing context, strawman vs. steelman | *Even Smith admits…*, *Smith finally acknowledged…*. Includes weakest argument for disfavoured view; omits key treaty or evidence | *Smith notes…*, *Smith argues…*. Includes strongest argument for both; acknowledges what is still debated |

#### Scoring integration

At scoring time, the article text is embedded and compared against the bias store. Each of the seven dimensions produces a similarity score; dimensions exceeding a threshold count as a detected bias instance. The existing capped penalty continues to apply:

- **−2 per distinct bias pattern detected**, capped at **−6** (i.e. a maximum of 3 of the 7 dimensions firing)
- Section-aware as before: Miracle-category articles exclude text under criticism/historical/naturalistic/scholarly/skeptical headings from the scan
- The placement multiplier does **not** apply to this signal (it is not an author-citation penalty)

### 3.1.4 OT–NT Discontinuity Vector Store Design

This signal uses the **same 7-dimension bias detection system** defined in §3.1.3, applied to the four schools of OT–NT continuity critique (proof-texting, divergent messianic expectations, Law abrogation, intertestamental theological evolution) plus contradiction/discrepancy framing.

Signal-specific differences from the anti-supernatural baseline:

- The **article-category scope is unrestricted** — this signal fires for any article, not only miracle/passion-category pages
- The **section-awareness rule is inverted**: for OT–NT discontinuity, interpretation-bucket text is **included** in the scan (the critique typically appears in scholarly/historical analysis sections, not in narrative account sections)
- **−2 per distinct critical pattern matched**, capped at **−6** (same cap, but the "patterns" are the four schools + contradiction framing rather than the 7 bias dimensions)
- The placement multiplier does **not** apply

### 3.1.5 Mythicist-Framing Vector Store Design

This signal uses the **same 7-dimension bias detection system** defined in §3.1.3, applied to Christ myth theory / mythicist content (denial of Jesus' historical existence).

Signal-specific differences from the anti-supernatural baseline:

- **−3 per author**, capped at **−9** (heavier penalty than anti-supernatural — mythicism is a more radical position)
- The **placement multiplier does apply** to this signal: ×2 for hits in data sections, ×0.5 for interpretation-only hits (same author-citation multiplier logic as Jesus Seminar)
- The named-author list (Carrier, Price, Doherty) continues to be detected by the existing fixed-list path alongside the vector store — the vector store detects the framing; the fixed list counts the citations

### 3.1.6 Jesus Seminar Bias Vector Store Design

This signal uses the **same 7-dimension bias detection system** defined in §3.1.3, applied to Jesus Seminar–affiliated content (critical-but-historicist scholarship treated as settled rather than contested). Each dimension has its own vector-embedding database built from the family's example set, but all share the identical 7-dimension structure.

Signal-specific differences from the anti-supernatural baseline:

- **−2 per author**, capped at **−6**
- The **placement multiplier does apply**: ×2 for hits in data sections, ×0.5 for interpretation-only hits (same author-citation multiplier logic as mythicist)
- The named-author list (Funk, Crossan, Borg) continues to be detected by the existing fixed-list path alongside the vector store — the vector store detects the framing; the fixed list counts the citations

### 3.1.7 Secular-Materialist Bias Vector Store Design

This signal uses the **same 7-dimension bias detection system** defined in §3.1.3, applied to miracle-specific secular-materialist or mythic presuppositions (naturalistic explanation, psychosomatic, mass hallucination, mythological, legendary development/accretion, scientifically explain/implausible). Each dimension has its own vector-embedding database.

Signal-specific differences from the anti-supernatural baseline:

- **−2 per distinct term**, capped at **−6**
- **Scoped to Miracle-category articles only** (detected by Wikipedia category: Miracles of Jesus)
- **Section-aware:** text under headings containing "criticism"/"historical"/"naturalistic"/"scholarly"/"skeptical" is excluded from the scan — only mentions in the main narrative/account sections count
- The placement multiplier does **not** apply

### 3.1.8 Confessional Balance (Balanced Debate Structure)

This signal is refactored to use the **balanced debate vector-embedding structure** (§3.1.2). It fires **only** when no Confessional or Evangelical schools, historians, or arguments are mentioned in the interpretation sections — i.e. the article presents critical scholarship without any contrasting conservative/Evangelical voice.

Refactored logic:

- The interpretation-section text is embedded and compared against the balanced debate store
- If the article's interpretation sections contain critical-scholarship content (detected via the existing fixed-list name check: Ehrman, Lüdemann, Pagels, Fredriksen, etc.) but the balanced debate store finds **no** representative individuals, schools, or arguments from the Evangelical/confessional side (Wright, Bauckham, Blomberg, Keener, Evans, Bock, Witherington, Licona, Habermas, Carson, Moo, Bruce, Marshall, etc.), the penalty fires
- **−3** if critical scholars cited **outside** the interpretation sections (data/narrative, lede, references)
- **−1** if cited inside interpretation sections **without** Evangelical contrast
- **0** if inside interpretation sections **with** Evangelical contrast (balanced debate store confirms both sides present)
- Mixed placement (both inside and outside interpretation) takes the −3
- No credit is ever given for the Evangelical author alone
- The existing fixed-list name checks remain alongside the vector store — the store detects structural balance vs. one-sidedness; the lists count the citations


### 3.2 Embedding & Retrieval Layer
- Fully local: runs on developer machines, GitHub (if required for CI), and the production VPS.
- Offline-capable; no external API calls during scoring.
- Per-family models (small sentence-transformer class or equivalent).
- Article text is section-classified first; only the appropriate bucket(s) are embedded and queried.
- **Footnote / inline-citation parity:** Representative names, key terms, and bias markers are extracted from the full rendered article — body text, footnotes, and inline citations are treated identically. A scholar cited only in a footnote counts the same as one named in running prose. There is no footnote exemption anywhere in the vector pipeline.

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

### 3.5 Plain List Lookups

These signals use **fixed keyword / name lists** matched against the rendered article text — no vector embeddings. They detect concrete presence/absence rather than conceptual framing.

| Signal | Method | Weight | Notes |
|---|---|---|---|
| **Ante-Nicene authors** | Fixed list of pre-325 AD Christian authors (Ignatius of Antioch, Polycarp, Justin Martyr, Irenaeus, Tertullian, Origen, Clement of Alexandria/Rome, Eusebius, Hippolytus, Cyprian) matched against body text + footnotes | **+2** per author, capped at **+6** | Distinct names counted; generic mention without a listed name counts as 1 |
| **Jewish context** | Fixed keyword list (Second Temple Judaism, Pharisees, Sadducees, synagogue, halakha, Torah, rabbinic, Essenes, Qumran, messianic expectation, Passover, Jewish custom/law/practice, Mishnah, Talmud, intertestamental) matched against body text + footnotes | **+1** per distinct concept, capped at **+4** | Each matched term counts as one hit |
| **Scholarly commentary** | Reference-list entries matched against named commentary series (Word Biblical Commentary, Anchor Bible, Hermeneia, ICC, NICNT/NIGTC, Pillar, Sacra Pagina) or the word "commentary" | **+1** per citation, capped at **+3** | Only fires for parable / teaching articles (`is_parable` / `is_teaching`); scores 0 elsewhere |
| **Non-Christian ancient sources** | Fixed list of 8 names (Josephus, Tacitus, Pliny the Younger, Suetonius, Mara bar Serapion, Lucian of Samosata, Celsus, Phlegon of Tralles) matched against body text + footnotes | **+1** per source, capped at **+3** | Scores 0 for parable articles |
| **Other-religion sources** | Shared matcher (Qur'an, Muhammad, Hadith, Book of Mormon, Joseph Smith, LDS, Buddhist, Hindu, Sikh, Jain, Rastafari, Bahá'í, etc.) matched against body text + footnotes | **−3** flat | Same matcher drives the balanced-debate sentence exclusion |

### 3.6 Associated Term Lookups

These signals match **format patterns and unique identifiers** in the reference list — ISBNs, DOIs, journal names, institutional markers — to classify citations by type rather than matching against a fixed name list.

| Signal | Method | Weight | Notes |
|---|---|---|---|
| **Archaeological site or artefact** | IAA / "archaeolog-" / "excavat-" / "ossuary" / "inscription" keyword match in body text + footnotes | **+2** flat; **+5** for location-category articles with an archaeology hit | Scores 0 for parable articles |
| **Peer-reviewed journal article** | Reference-list entries matched against journal-ish markers: `journal`, `doi.org`, `jstor`, volume/issue patterns | **+1** per citation, capped at **+5** | Format-based, not a fixed journal list |
| **Scholarly book / monograph** | Reference-list entries matched against book-ish markers: `ISBN`, `University Press`, publisher patterns | **+1** per citation, capped at **+5** | Format-based, not a fixed publisher list |

### 3.7 Weights Removed

The following weight is removed from the rubric entirely in the refactored system:

| Weight | Rationale |
|---|---|
| **Passion-specific criticism** (swoon theory, stake theory, impalement theory) | Too narrow — these terms rarely appear in Wikipedia articles and the signal almost never fires in practice. The broader anti-supernatural and secular-materialist bias detectors already capture the underlying framing |

### 3.8 Unchanged Weights (Plain Lookups)

The following signals remain as pure keyword / fixed-list / DOM-inspection lookups with no vector component. Their detection logic is unchanged from the current system:

| Signal | Type |
|---|---|
| Bible verse citations | Regex match on chapter:verse patterns |
| Named manuscripts | Fixed list of well-known manuscripts (Codex Sinaiticus, Codex Vaticanus, Dead Sea Scrolls, etc.) |
| Primary-source quotes | Blockquote count + long (40+ char) quoted spans |
| Historical / contextual information | Comparative-language keyword match ("parallels", "comparable to", "in the broader context") |
| Wikipedia quality rating | DOM inspection for Good Article / Featured Article indicators |
| Poor referencing | DOM inspection for "citation needed" tags / maintenance banners |
| No references at all | Reference-list count = 0 |
| No Bible verse cited | Bible verse regex count = 0 |
| Niche exposure bonus | Tiered on `ref_count` (< 5 → +3; 5–9 → +1) |
| Gnostic source quoted | Keyword match for Nag Hammadi, named Gnostic gospels, Valentinian/Sethian material |


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

## 9. Refactored Weights Table

Reproduction of the authoritative weights table from `Wikipedia Articles - Reference.md`, with each signal mapped to its new detection approach under the hybrid vector-embedding plan. Weights and caps are unchanged unless noted.

| # | Signal | Weight | How it works (new system) |
|---|---|---|---|
| 1 | Cites a specific Bible verse | **+3** per citation, capped at **+10** | **Unchanged plain lookup** (§3.8) — regex match on chapter:verse patterns in rendered text; deduplicated |
| 2 | Data/interpretation split | **+7** flat | **Vector** (§3.1.1) — three vector stores (information/data bucket, context/interpretation bucket, linguistic register) queried together; article earns credit when sections semantically AND stylistically match both buckets. Replaces heading-pattern classifier entirely |
| 3 | Cites/mentions a specific manuscript | **+2** per distinct manuscript, capped at **+6**; doubled (max +12) for teachings/Bible books | **Unchanged plain lookup** (§3.8) — fixed list of well-known manuscripts (Codex Sinaiticus, Vaticanus, Dead Sea Scrolls, etc.); generic "papyrus/codex/manuscript" mention counts as 1 |
| 4 | Cites an ante-Nicene author | **+2** per author, capped at **+6** | **Plain list lookup** (§3.5) — fixed name list (Ignatius, Polycarp, Justin Martyr, Irenaeus, Tertullian, Origen, Clement, Eusebius, Hippolytus, Cyprian); logic unchanged |
| 5 | Cites/mentions an archaeological site or artefact | **+2** flat; **+6** for location-category articles with an archaeology hit | **Associated term lookup** (§3.6) — IAA/"archaeolog-"/"excavat-"/"ossuary"/"inscription" keyword match; scores 0 for parable articles; location bonus unchanged |
| 6 | Cites a peer-reviewed journal article | **+1** per citation, capped at **+4** | **Associated term lookup** (§3.6) — reference-list entries matched against format markers: `journal`, `doi.org`, `jstor`, volume/issue patterns. No fixed journal list |
| 7 | Cites a scholarly book/monograph | **+1** per citation, capped at **+4** | **Associated term lookup** (§3.6) — reference-list entries matched against format markers: `ISBN`, `University Press`, publisher patterns. No fixed publisher list |
| 8 | Quotes a primary source directly | **+1** per quote, capped at **+3** | **Unchanged plain lookup** (§3.8) — blockquote count + long (40+ char) quoted spans |
| 9 | Discusses Jewish context | **+2** per distinct concept, capped at **+5** | **Plain list lookup** (§3.5) — fixed keyword list (Second Temple, Pharisees, Torah, Qumran, Passover, Mishnah, etc.); logic unchanged |
| 10 | Shows balanced debate in interpretation sections | **+1** per distinct debate pattern, capped at **+3**; doubled (max +6) with 2+ named representatives | **Vector** (§3.1.2) — single store encoding longevity language, representative individuals, disagreement across both layers (data AND interpretation), and properly-anchored consensus. Replaces keyword-pattern matching |
| 11 | Cites a scholarly commentary | **+1** per citation, capped at **+3**; only fires for parable/teaching articles | **Plain list lookup** (§3.5) — fixed series name list (Word Biblical, Anchor Bible, Hermeneia, NICNT, etc.) or "commentary" keyword; gating unchanged |
| 12 | Cites/mentions a non-Christian ancient source | **+1** per source, capped at **+3**; scores 0 for parable articles | **Plain list lookup** (§3.5) — fixed 8-name list (Josephus, Tacitus, Pliny, Suetonius, Mara bar Serapion, Lucian, Celsus, Phlegon); logic unchanged |
| 13 | Wikipedia Good Article / Featured Article | **+1** flat | **Unchanged plain lookup** (§3.8) — DOM inspection for GA/FA indicators |
| 14 | Quotes from a Gnostic source | **−1** flat | **Unchanged plain lookup** (§3.8) — keyword match for Nag Hammadi, named Gnostic gospels, Valentinian/Sethian material |
| 15 | Referencing quality | **−8** if no references at all; **−1** if poor referencing | **Unchanged plain lookup** (§3.8) — reference-list count = 0 for no references; DOM inspection for "citation needed" tags / maintenance banners for poor referencing |
| 17 | Jesus seminar bias | **−2** per author, capped at **−6**, then placement multiplier applied | **Vector bias** (§3.1.6) — same 7-dimension bias detection system (§3.1.3), with its own vector-embedding database. Fixed-list name check (Funk, Crossan, Borg) runs alongside. ×2 data / ×0.5 interp-only placement multiplier unchanged |
| 18 | OT–NT continuity criticism | **−2** per distinct critical pattern, capped at **−6** | **Vector bias** (§3.1.4) — same 7-dimension bias detection system (§3.1.3), applied to four schools (proof-texting, messianic divergence, Law abrogation, intertestamental evolution) + contradiction framing. Interpretation text included in scan (inverted section-awareness) |
| 19 | criticism of the supernatural worldview | **−2** per instance, capped at **−6** | **Vector bias** (§3.1.3) — 7-dimension bias detection system measuring attribution verb asymmetry, epistemic marking, granularity asymmetry, labelling, narrative agency, structural/positional bias, and presupposition/omission. Miracle-scoped with section-awareness (criticism-heading text excluded) |
| 21 | Secular-materialist presuppositions | **−2** per distinct term, capped at **−6** | **Vector bias** (§3.1.7) — same 7-dimension bias detection system (§3.1.3), with its own vector-embedding database. Miracle-scoped, section-aware (criticism-heading text excluded). Placement multiplier does NOT apply |
| 22 | Confessional balance | **−3** outside interpretation / **−1** inside without Evangelical contrast / **0** inside with one | **Vector** (§3.1.8) — uses balanced debate vector-embedding structure (§3.1.2). Fires only when critical scholars are present but the balanced debate store finds NO Evangelical/confessional schools, historians, or arguments in interpretation sections. Fixed-list name checks run alongside. Placement logic unchanged |
| 23 | Cites/mentions other-religion sources | **−3** flat | **Plain list lookup** (§3.5) — shared matcher (Qur'an, Muhammad, Hadith, Book of Mormon, LDS, Buddhist, Hindu, Sikh, Jain, Rastafari, Bahá'í). Same matcher drives balanced-debate sentence exclusion. Logic unchanged |
| 24 | Mythicist bias | **−3** per author, capped at **−9**, then placement multiplier applied | **Vector bias** (§3.1.5) — same 7-dimension bias detection system (§3.1.3), with its own vector-embedding database. Fixed-list name check (Carrier, Price, Doherty) runs alongside. ×2 data / ×0.5 interp-only placement multiplier unchanged |
| 26 | Cites no Bible verse anywhere | **−10** flat | **Unchanged plain lookup** (§3.8) — Bible verse regex count = 0 |

### Summary by approach

| Approach | Count | Signals |
|---|---|---|
| **Vector embedding** | 7 | Data/interpretation split, balanced debate, anti-supernatural, OT–NT discontinuity, Jesus Seminar, miracle-specific (secular-materialist), confessional balance |
| **Vector bias (7-dimension)** | 5 | Anti-supernatural, OT–NT discontinuity, mythicist-framing, Jesus Seminar, secular-materialist |
| **Plain list lookup** | 5 | Ante-Nicene authors, Jewish context, scholarly commentary, non-Christian ancient sources, other-religion sources |
| **Associated term lookup** | 3 | Archaeological site/artefact, peer-reviewed journal, scholarly book/monograph |
| **Unchanged plain lookup** | 10 | Bible verses, named manuscripts, primary-source quotes, Wikipedia quality, poor referencing, niche exposure, Gnostic source, no references, no Bible verses, location+archaeology bonus |
| **Removed** | 1 | Passion-specific criticism |
