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
- One small, specialised vector **store** per conceptual family, all sharing **a single ~90 MB MiniLM-class embedding model** (§3.2). Families differ by their example set, not by their model.
- Each store contains curated positive **and negative** example passages: the positives embody the idea the weight is looking for, the negatives are the near-misses that must not fire (§3.4.1).
- **The data/interpretation classifier runs first and governs everything.** It labels every body paragraph semantically, and its labels *are* the section buckets the rest of the rubric reads (§3.1.1). Headings are not consulted anywhere.
- Similarity scores map onto the capped integer contribution system via the mapping in §3.4.1, so explainability is preserved.
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
- `literary-analysis`
- `gnostic-over-emphasis`

**Plain-list families** (see §3.5):
- `ante-nicene`
- `jewish-context`
- `scholarly-commentary`
- `non-christian-ancient`
- `other-religion`

**Associated-term families** (see §3.6):
- `archaeological`
- `peer-reviewed-journal-or-book`

**Unchanged plain lookups** (see §3.8):
- `bible-verses`, `named-manuscripts`, `primary-source-quotes`, `wikipedia-quality`, `referencing-quality`, `no-bible-verses`, `maps-diagrams`

**Removed** (see §3.7):
- `passion-specific-criticism`

**Context-conditional detectors** (see §3.5.1):
- `religious-art`

### 3.1.1 Data-Interpretation Split Design

**This is the dominant matrix through which every article is measured.** The data/interpretation distinction is not merely one signal among 25 — it is the axis the whole rubric is built on, and it now has a single authoritative source: the vector classifier defined here. Headings are no longer consulted.

Wikipedia articles vary enormously in shape. A typical article opens with an introductory paragraph (with or without a heading), then runs through further headings and paragraphs; some carry a dozen headings, some almost none. Crucially, **an article's headings may or may not correspond to the data/interpretation split** — an article can separate account from analysis perfectly while labelling neither, or carry tidy "Interpretation" headings over text that never stops narrating. Heading-pattern matching cannot see this; semantic classification can.

The signal rewards a clear split, penalises a muddled one, and penalises hardest an article carrying only one side without the other (§9 row 3).

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

The three stores are queried together at scoring time. **Every body paragraph** is embedded and labelled:

- **data** — strong semantic match to the Information/Data store AND strong stylistic match to the data register.
- **interpretation** — strong semantic match to the Context/Interpretation store AND strong stylistic match to the interpretation register.
- **neither** — clears neither threshold.

Two structural elements are assigned by position rather than by the classifier, preserving the standing footnote rule: the **lede** and the **reference/footnote/bibliography list** are always **other**. Footnote text still counts for every weight (§3.2); "other" only means it sits outside the interpretation sections for placement purposes.

#### Separation ratio

Presence of both classes is not enough — an article that alternates narration and analysis paragraph by paragraph has not separated anything. Separation is measured as a computed metric over the labelled paragraph sequence:

```
transitions   = count of adjacent paragraph pairs whose labels differ
separation    = 1 − ( transitions / (labelled_paragraphs − 1) )
```

An article whose data paragraphs form one contiguous run and interpretation paragraphs another scores near **1.0**. One that alternates throughout scores near **0.0**. The clean-split threshold `t_sep` is calibrated on the gold set (§3.4.1, §11).

#### Tiered scoring

| Condition | Contribution |
|---|---|
| Both classes present **and** `separation ≥ t_sep` | **+10** — clear split |
| Both classes present but `separation < t_sep` | **−3** — content is there, structure is not |
| Only **one** class present (all data, or all interpretation) | **−5** — the article does one job and omits the other entirely |
| Neither class reaches threshold (too short / unclassifiable) | **0** — no judgment made |

#### This classifier replaces section bucketing everywhere

The labels produced here **are** the section buckets for the whole rubric. Every downstream consumer — the placement multipliers (rows 19, 21), balanced debate's interpretation-only scan (row 5), confessional balance (row 17), the criticism-heading exclusions (rows 22, 23), and Gnostic tier placement (row 16) — reads these labels, not headings.

This preserves the invariant Reference.md was protecting: the split signal and the placement multipliers share one definition of "data section" and "interpretation section", so the two can never disagree. The heading-pattern classifier is retired outright, along with its robustness rules for flat parser output, unmatched h3s, and ambiguous headings — none of which have any meaning once classification is semantic.

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

At scoring time, the interpretation-section text is embedded and compared against the store. The similarity score maps onto the capped contribution via the count function in §3.4.1:
- **+2 per distinct debate pattern detected**, capped at **+6** (the cap is reached at 3 distinct patterns)
- **Doubled to a maximum of +12** when 2+ named representatives are detected across the differing views
- The current placement rules continue to apply: scanned in interpretation-bucket text only, with other-religion sentences dropped before scanning

### 3.1.3 Anti-Supernatural Bias Vector Store Design

This signal penalises articles that frame supernatural claims (miracles, virgin birth, resurrection) as presumptively false. The vector-enhanced approach replaces keyword matching ("mythological", "naturalistic explanation", etc.) with a seven-dimension structural-bias analysis comparing the article's treatment of supernatural vs. naturalistic explanations.

#### Two-stage architecture: span labelling, then measurement

The seven dimensions are **not** all detectable by similarity search. Four are lexical/stylistic and can be matched against curated example passages; three are comparative measurements over the text and require arithmetic, not embeddings. The system therefore runs in two stages:

**Stage A — span labelling (embedding).** The article text is segmented into sentence-level spans, each embedded and labelled by the store as belonging to the **supernatural-claim view**, the **naturalistic-explanation view**, or **neither**. This produces two view-spans per article.

**Stage B — dimension measurement.** Dimensions 1, 2, 4 and 7a are scored by similarity against the store's biased/neutral exemplars. Dimensions 3, 5, 6 and 7b are computed arithmetically over the two view-spans produced in Stage A.

| # | Bias Marker | Detection method | What Is Measured | Biased Pattern | Neutral Pattern |
|---|---|---|---|---|---|
| 1 | **Attribution Verb Asymmetry** | **Embedding** | Verbs used to introduce claims per view | Favoured: *shows, demonstrates, documents* / Disfavoured: *claims, alleges, insists* | Both sides: *argues, contends, observes, notes* |
| 2 | **Epistemic Marking** | **Embedding** | Hedging, scare quotes, intensifiers | *so-called* reform, *allegedly* necessary, *supposedly* successful vs. *clearly* necessary | *necessary*, *the reform*, *described as successful by X* |
| 3 | **Granularity Asymmetry** | **Computed metric** | Sentence count, specificity, numbers per view | Favoured view gets context and motives; disfavoured gets vague summary. Precise numbers for one side's harms, vague for the other | Equal level of detail, causal context, and precision for both |
| 4 | **Labelling and Moral Lexicon** | **Embedding** | Titles and evaluative adjectives | *government* vs. *regime*, *soldiers* vs. *militants*, *brutal* vs. *firm*, *heroic* vs. *reckless* | Consistent neutral labels: *government, soldiers, forces, administration* |
| 5 | **Narrative Agency and Causality** | **Computed metric** | Active vs. passive voice, who is identified as cause | Favoured: *Mistakes were made* / Disfavoured: *X suppressed, destroyed. In retaliation* vs. *unprovoked* | Active voice for actions of both sides; causality explained for both |
| 6 | **Structural and Positional Bias** | **Computed metric** | Placement, order, citation density, rebuttal coupling | Lead states favoured view as fact; disfavoured only appears in a late "Criticism" section. View B always followed by *However…*. View A has 4 citations, View B has 0 | Lead states consensus *and* debate. Equal space, equal citation quality, critiques not glued to only one side |
| 7a | **Presupposition** | **Embedding** | Presupposed facts, concession framing | *Even Smith admits…*, *Smith finally acknowledged…* | *Smith notes…*, *Smith argues…* |
| 7b | **Omission** | **Computed metric** | Strongest-argument coverage per view | Includes only the weakest argument for the disfavoured view | Includes strongest argument for both; acknowledges what is still debated |

#### Computed-metric definitions

Each computed dimension produces a ratio between the two view-spans from Stage A. A dimension **fires** when its ratio exceeds the calibrated asymmetry threshold (§3.4.1) in the direction that disfavours the supernatural view.

| Dim | Metric | Fires when |
|---|---|---|
| **3** Granularity | For each view-span: sentence count, token count, and count of concrete specifics (numerals, dates, proper nouns, quantities) | The favoured span exceeds the disfavoured span on 2 of the 3 counts by more than the asymmetry threshold |
| **5** Narrative agency | For each view-span: ratio of passive constructions (auxiliary + past participle) to total finite verbs, and count of agent-deleted clauses | Passive/agent-deletion ratio is materially higher in the span describing the favoured view's actions |
| **6** Structural/positional | Per view-span: character offset of first mention, section-bucket of first mention, inline-citation count, and rebuttal adjacency (a contrastive marker — *however*, *but*, *although* — opening the sentence immediately following the span) | Disfavoured view appears later, carries fewer citations, or is rebuttal-coupled while the favoured view is not |
| **7b** Omission | Count of distinct argument-bearing spans per view, after Stage A labelling | One view carries argument-bearing spans and the other carries none, or fewer than the asymmetry threshold allows |

All four metrics are plain arithmetic over spans the embedding stage has already labelled — no LLM call, no GPU, consistent with §3.2.

#### Scoring integration

Each of the seven dimensions resolves to fired / not-fired. The capped penalty applies:

- **−2 per distinct bias dimension detected**, capped at **−8** (i.e. a maximum of 4 of the 7 dimensions counting)
- **Scope:** Miracle-category **and** Passion-category articles (see §3.9)
- Section-aware as before: text under criticism/historical/naturalistic/scholarly/skeptical headings is excluded from the scan
- `is_passion` articles are scored at raised sensitivity (§3.9)
- The placement multiplier does **not** apply to this signal (it is not an author-citation penalty)

### 3.1.4 OT–NT Discontinuity Vector Store Design

This signal uses the **same 7-dimension bias detection system** defined in §3.1.3, applied to the four schools of OT–NT continuity critique (proof-texting, divergent messianic expectations, Law abrogation, intertestamental theological evolution) plus contradiction/discrepancy framing.

Signal-specific differences from the anti-supernatural baseline:

- The **article-category scope is unrestricted** — this signal fires for any article, not only miracle/passion-category pages
- The **section-awareness rule is inverted**: for OT–NT discontinuity, interpretation-bucket text is **included** in the scan (the critique typically appears in scholarly/historical analysis sections, not in narrative account sections)
- **−3 per distinct critical pattern matched**, capped at **−6** (the "patterns" are the four schools + contradiction framing rather than the 7 bias dimensions, so the cap is reached at 2 patterns)
- The placement multiplier does **not** apply

### 3.1.5 Mythicist-Framing Vector Store Design

This signal uses the **same 7-dimension bias detection system** defined in §3.1.3, applied to Christ myth theory / mythicist content (denial of Jesus' historical existence).

Signal-specific differences from the anti-supernatural baseline:

- **−3 per author**, capped at **−7** (heavier penalty than Jesus Seminar — mythicism is a more radical position)
- The named-author list (Carrier, Price, Doherty) supplies the **count**; the vector store supplies the framing detection and the section labels the modifiers depend on
- **Placement multiplier** (applied after the cap): **×2** for any hit outside the interpretation sections — data/narrative, lede, or references — **×0.5** for interpretation-only hits, ×1 otherwise
- **Imbalance surcharge:** a further **−2** where the balanced-debate signal (§9 row 5) scored 0. Citing a mythicist author in an article that presents no scholarly back-and-forth at all is the worst case the rubric recognises
- Worst case: −7 × 2 − 2 = **−16**
- `is_passion` articles are scored at raised sensitivity (§3.9)

### 3.1.6 Jesus Seminar Bias Vector Store Design

This signal uses the **same 7-dimension bias detection system** defined in §3.1.3, applied to Jesus Seminar–affiliated content (critical-but-historicist scholarship treated as settled rather than contested). Each dimension has its own vector-embedding database built from the family's example set, but all share the identical 7-dimension structure.

Signal-specific differences from the anti-supernatural baseline:

- **−3 per author**, capped at **−6** (the cap is reached at 2 authors; the fixed list holds 3 names, so a third citation adds nothing before the modifiers)
- The named-author list (Funk, Crossan, Borg) supplies the **count**; the vector store supplies the framing detection and the section labels the modifiers depend on
- **Placement multiplier** (applied after the cap): **×2** for any hit outside the interpretation sections — data/narrative, lede, or references — **×0.5** for interpretation-only hits, ×1 otherwise. Citing Crossan as part of the factual account, or burying him in a bibliography, is penalised twice as hard as quarantining him as one scholarly view among others
- **Imbalance surcharge:** a further **−2** where the balanced-debate signal (§9 row 5) scored 0. An article that cites Jesus Seminar scholarship *and* presents no scholarly disagreement anywhere is presenting one school as settled fact
- Worst case: −6 × 2 − 2 = **−14**

### 3.1.7 Secular-Materialist Bias Vector Store Design

This signal uses the **same 7-dimension bias detection system** defined in §3.1.3, applied to miracle-specific secular-materialist or mythic presuppositions (naturalistic explanation, psychosomatic, mass hallucination, mythological, legendary development/accretion, scientifically explain/implausible). Each dimension has its own vector-embedding database.

Signal-specific differences from the anti-supernatural baseline:

- **−2 per distinct term**, capped at **−8**
- **Scoped to Miracle-category and Passion-category articles** (detected by Wikipedia category: Miracles of Jesus; Passion of Jesus / Crucifixion / Resurrection)
- `is_passion` articles are scored at raised sensitivity (§3.9)
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

### 3.1.9 Literary Analysis Vector Store Design

This signal rewards articles that engage in formal literary analysis — narrative criticism, rhetorical criticism, structural analysis, chiasm/discourse-level patterns, reader-response, intertextuality, genre analysis, and form criticism — rather than only historical or theological treatment.

The vector-embedding database is trained on curated examples of literary-analysis passages: discussions of narrative structure, rhetorical devices (inclusio, chiasm, parallelism), genre conventions (ancient biography, Greco-Roman historiography, aretalogy), intertextual allusion, reader-response framing, and form-critical segmentation.

Signal-specific parameters:

- **+6** for parable, teaching, and Bible-book articles (`is_parable` / `is_teaching` / `is_bible_book`) — literary analysis is the substance of these articles
- **+4** for all other articles — literary engagement is a real positive outside the core exegetical categories too, just not the article's whole point
- Both tiers are conditional on the store firing: an article with no literary-analysis content scores **0**, not +4
- The existing category flags gate which tier is awarded
- Scored against the full article text (not restricted to a single bucket)

### 3.1.10 Gnostic Over-Emphasis Vector Store Design

This signal replaces the flat keyword match ("Nag Hammadi", named Gnostic gospels, Valentinian/Sethian material) with a vector-embedding database trained on passages that treat Gnostic material as a significant or privileged source rather than a brief, contextualised mention.

#### Scope (widened)

The earlier interpretation-only scope under-fired badly: because reference lists sit in the **other** bucket and narrative text sits in **data**, an article built on the Gospel of Thomas, or one carrying a Gnostic-heavy bibliography, scored **0**. This signal was also the only weight in the rubric exempting footnotes, contradicting the standing footnote-parity rule (§3.2).

The scan now covers **all three buckets** — data, interpretation, and other (lede, references, footnotes, bibliography) — restoring footnote parity.

#### Tiered penalty

The store distinguishes an article that *leans on* Gnostic sources from one that merely notes their existence:

- **−2** when Gnostic material is detected anywhere in the article as a contextualised mention (named in passing, attributed, or reported as a historical datum)
- **−4** when the store judges Gnostic material to be **privileged** — used as an evidentiary basis for claims about Jesus, given comparable or greater weight than canonical sources, or carrying the article's interpretive framing rather than being reported about
- The two tiers are exclusive; maximum penalty **−4**
- The placement multiplier does **not** apply, but placement is an input to the tier: Gnostic material appearing in **data/narrative** sections counts toward the privileged tier, since presenting it as part of the factual account is the strongest form of over-emphasis
- `is_passion` articles are scored at raised sensitivity (§3.9)


### 3.2 Embedding & Retrieval Layer

**Scoring is an offline, developer-machine activity. The VPS never runs scoring.** Verified 2026-07-27: `deploy.sh` and `.github/workflows/deploy.yml` execute Node only — `npm install`, schema + migrations, `npm run pages`, sitemap, pm2 restart. No Python, pip, or virtualenv is in the deploy path, and **this refactor adds none to it**.

The scoring pipeline is: **embed and score locally (Python) → emit `scoring-export.json` → commit → the VPS's Node import step loads it into the database.** This mirrors how the v1 engine already works.

#### The VPS does host the vector stores — for serving, not scoring

Superseding earlier wording in this section (user decision, 2026-07-27): the vector stores **are** deployed to the VPS so the API can serve live semantic queries from them. Scoring and serving are separate concerns and only serving moves:

| | Runs where | Ships to VPS? |
|---|---|---|
| **Scoring** — build stores, calibrate thresholds, score 255 articles | Developer machine only | No. Only `scoring-export.json` travels, via git |
| **Serving** — answer live queries against the stores | VPS | Yes — stores, model, and a query-only runtime |

Consequences that shape every plan:

- **Stores reach the VPS by rsync, never by git.** `setup/` is gitignored, so the deploy path cannot carry them. A manual sync script pushes `vector-stores/` over the existing SSH access. This is deliberate: it keeps up to 1 GB of binary indexes out of repository history permanently.
- **Stores live outside the git working tree on the VPS.** `deploy.yml` runs `git reset --hard origin/main` inside `/var/www/thejesuswebsite`; anything placed there is destroyed on every deploy. The stores sit in a sibling path.
- **`deploy.sh` still gains no Python step.** Store and runtime updates are a separate, manually-run path — deploy stays Node-only, and a failed sync can never break a deploy.
- **Budgets differ by machine.** Developer disk: ~150 MB target, ~200 MB hard ceiling (§3.3). VPS: **1 GB approved**, against ~75 GB spare — the constraint that drove the ONNX-over-torch decision does not apply to the serving side.

**What "serving" actually serves (implemented 2026-07-29, wikipedia-v2-09-vps-vector-store-serving.md):** the FAISS stores hold hand-authored *calibration exemplars* per family, not per-article embeddings — there is no per-article vector store, so "find Wikipedia articles related to this one" is not something the live endpoint can do. What ships is a live version of the offline scoring step: `POST /wikipedia/signal-check` (Node) → `vector-sidecar` (Python, `127.0.0.1` only) takes free text + a family name and returns the nearest exemplar(s) plus a fire/no-fire verdict using the same nearest-neighbour-label rule as offline scoring (§3.4.1, line ~379). Building genuine "related articles" would need a new per-article embedding store — out of scope here; logged as a discovered ambiguity in `setup/Issues.md`.
- **No new runtime dependency may be added to `api/` itself.** Its list stays `express`, `better-sqlite3`, `sharp`. Any Python needed for serving runs as a separate supervised process, not inside the Node app.

Live-query serving is specified in its own plan; this section governs only where things run and how they get there.

Remaining properties:
- Offline-capable; no external API calls during scoring.
- **One shared MiniLM-class model (~90 MB) across all families**, not one model per family. Families differ by their *example set*, not by their embedding model — this keeps total disk and RAM footprint to a single ~90 MB model plus small per-family index files. Locked decision; see §8.
- **Hard dependency ceiling:** the embedding model must run on CPU without GPU, without `torch` if a lighter runtime (e.g. ONNX Runtime) suffices, and must not push the VPS's Python dependency surface past what the existing ranking scripts already require. Any proposal exceeding ~150 MB total model weight is out of scope.
- Article text is section-classified first; only the appropriate bucket(s) are embedded and queried.
- **Footnote / inline-citation parity:** Representative names, key terms, and bias markers are extracted from the full rendered article — body text, footnotes, and inline citations are treated identically. A scholar cited only in a footnote counts the same as one named in running prose. There is no footnote exemption anywhere in the vector pipeline.

### 3.3 Vector Storage (locked)

**Decision: small file-based indexes (FAISS or LanceDB embedded), managed by the existing Python ranking scripts.**

Rationale: the stores are regenerable build artefacts, not live application data. Keeping them as plain files on disk avoids coupling them to the application database, avoids compiling a SQLite extension for both macOS and the VPS, and leaves the deploy path (`deploy.sh`) untouched. At ~255 articles across a dozen families the vector count is in the thousands — retrieval performance is irrelevant at this scale, so the choice is made purely on operational simplicity.

**Settled empirically: FAISS, not LanceDB.** Both were permitted above; measurement decided it. Installed footprints in clean scratch virtualenvs (2026-07-27):

| Stack | Installed |
|---|---|
| `sentence-transformers` + torch | ~1 GB+ |
| `onnxruntime` + `numpy` + `lancedb` | ~421 MB |
| `onnxruntime` + `numpy` + `faiss-cpu` | **~178 MB** |

LanceDB pulls `pyarrow`, costing ~240 MB more for no benefit at a few thousand vectors. **All families — the classifier's three stores and the nine signal families — use `faiss-cpu`.** Mixing the two libraries across plans would reintroduce the pyarrow cost through the back door.

**Ceiling reality check.** ~178 MB exceeds the ~150 MB figure in §3.2, and that figure was an estimate written before anything was measured. `onnxruntime` (~75 MB) and `numpy` (~34 MB) are irreducible for a CPU-only embedding pipeline. Treat ~150 MB as the target and **~200 MB as the hard ceiling**; anything above 200 MB must be trimmed or disclosed explicitly, never shipped silently. The point of the ceiling was to prevent a ~1 GB torch install, and ~178 MB achieves that at a 5–6× reduction.

Rejected alternatives:
- **sqlite-vss** — would keep vectors inside the existing database, but requires a platform-compiled extension on both the dev Mac and the VPS for no benefit at this scale.
- **Chroma** — largest dependency surface of the three; rejected against the §3.2 ceiling.

Stores live inside `setup/Wikipedia algorithm/` (§8), must be commit-able or regenerable from their example sets, and must run without GPU.

### 3.4 Hybrid Scoring Logic

Exact signals continue to use the current keyword / list detectors, unchanged. For the conceptual signals there is **no generic "vector first with keyword fallback or boost"** — each signal gets a combination function tailored to the nature of the weight. Four function shapes cover the rubric:

| Function shape | Signals | How vector and list combine |
|---|---|---|
| **A — Distinct-pattern count** | Balanced debate (§3.1.2), OT–NT continuity (§3.1.4) | The store alone produces the count: number of distinct query spans clearing `t_fire` (§3.4.1). No list involved. Count × per-hit weight, then cap |
| **B — List counts, placement and balance modify** | Jesus Seminar (§3.1.6), mythicist (§3.1.5) | The **fixed name list produces the count** (it is a reliable citation counter). Two modifiers then apply in order: the **placement multiplier** from the §3.1.1 classifier (×2 for any hit outside the interpretation sections, ×0.5 interpretation-only), then an **imbalance surcharge** of −2 where the balanced-debate signal (row 5) scored 0. No stance judgment is attempted — see §11.2 |
| **C — Structural boolean** | Data/interpretation split (§3.1.1), confessional balance (§3.1.8) | Two or more stores must fire together for the signal to resolve true; the weight is flat. For confessional balance the fixed name lists identify *who* is cited and the store judges *whether both sides are represented* |
| **D — Tiered presence** | Literary analysis (§3.1.9), Gnostic over-emphasis (§3.1.10), anti-supernatural (§3.1.3), secular-materialist (§3.1.7) | The store fires or does not; if it fires, the tier is chosen by category flags (literary analysis) or by the store's own strength verdict plus placement (Gnostic). Dimensions from the 7-marker system resolve per §3.1.3's two-stage split |

Placement multipliers read the §3.1.1 classifier's labels (§3.4.2). Every contribution remains an integer respecting the cap in §9.

### 3.4.1 Similarity → Contribution Mapping

This is the mapping the whole spec depends on: how a continuous cosine score becomes a discrete integer count.

**Retrieval.** Each query span is embedded and matched against its family's index, returning the *k* = 5 nearest exemplars.

**Nearest-neighbour-label rule (not raw distance).** Every family index stores both **positive** exemplars (passages that embody the signal) and **negative** exemplars (passages that look superficially similar but must not fire — e.g. for anti-supernatural, a passage that *reports* a naturalistic explanation neutrally). A span whose nearest neighbour is a negative exemplar scores **0 regardless of cosine value**. This is what keeps a well-chosen negative set doing real work, rather than the threshold carrying everything.

**Score.** For spans surviving the label rule, `score = mean cosine of the positive exemplars within the top-k`.

**Two calibrated thresholds per family:**
- `t_fire` — below this, the span contributes nothing.
- `t_strong` — at or above this, the span counts toward the upper tier for shape-D signals (e.g. Gnostic "privileged" at −4 rather than "mention" at −2).

**Count.** For shape-A signals the contribution count is the number of **distinct** query spans clearing `t_fire`, deduplicated by matched exemplar so one pattern restated three ways counts once — mirroring the existing "DISTINCT patterns matched" rule in Reference.md.

**Asymmetry threshold.** For the computed metrics in §3.1.3, a dimension fires when the ratio between the two view-spans exceeds `t_asym`, calibrated the same way.

**Calibration procedure.** Thresholds are fitted on the gold set (§11), not guessed:
1. Score every gold article at a sweep of candidate thresholds.
2. Choose the value maximising F1 against the hand labels.
3. **Subject to a precision floor of 0.8** — where precision and recall trade off, take the higher-precision option. A signal that misses a real instance costs one article a few points; a signal that fires on a clean article corrupts the ranking and is invisible without inspection. Under-fire by preference.
4. Record the chosen thresholds, their F1, and their precision alongside the store. A store whose best achievable precision is under 0.8 does not ship — that family stays on its existing keyword detector until its example set improves (retained dormant, §11.4).

**Where thresholds live.** `t_fire`, `t_strong`, `t_asym`, `t_sep` and the Passion margin are **developer-machine calibration artefacts**, stored in a plain config file alongside the stores under `setup/Wikipedia algorithm/`. They do **not** go in the database — the production schema is unchanged (§6), and the VPS never runs scoring, so it has no use for them.

**Canonical store path:** `setup/Wikipedia algorithm/vector-stores/` — one subdirectory per family, for the classifier's three stores and the nine signal families alike.

### 3.4.2 Resolved: Section Classifier Authority

Earlier drafts left it ambiguous whether the vector classifier replaced section bucketing everywhere or only scored the split signal, which would have let the two disagree on the same article.

**Resolved: the vector classifier is the single bucketing authority (§3.1.1).** Headings are not consulted anywhere in the rubric. Every signal that reads "data section" or "interpretation section" reads the classifier's paragraph labels. The lede and reference list remain positionally assigned to **other**.

Consequence for implementation: the classifier runs **first**, once per article, and its output is an input to every other signal. It is the only component whose failure invalidates the whole score for that article, so it is the first family to be calibrated and the one held to the strictest gold-set standard (§11).

### 3.5 Plain List Lookups

These signals use **fixed keyword / name lists** matched against the rendered article text — no vector embeddings. They detect concrete presence/absence rather than conceptual framing.

| Signal | Method | Weight | Notes |
|---|---|---|---|
| **Ante-Nicene authors** | Fixed list of pre-325 AD Christian authors (Ignatius of Antioch, Polycarp, Justin Martyr, Irenaeus, Tertullian, Origen, Clement of Alexandria/Rome, Eusebius, Hippolytus, Cyprian) matched against body text + footnotes | **+2** per author, capped at **+6** | Distinct names counted; generic mention without a listed name counts as 1 |
| **Jewish context** | Fixed keyword list (Second Temple Judaism, Pharisees, Sadducees, synagogue, halakha, Torah, rabbinic, Essenes, Qumran, messianic expectation, Passover, Jewish custom/law/practice, Mishnah, Talmud, intertestamental) matched against body text + footnotes | **+2** per distinct concept, capped at **+6** | Each matched term counts as one hit |
| **Scholarly commentary** | Reference-list entries matched against named commentary series (Word Biblical Commentary, Anchor Bible, Hermeneia, ICC, NICNT/NIGTC, Pillar, Sacra Pagina) or the word "commentary" | **+1** per citation, capped at **+6** | Only fires for parable / teaching articles (`is_parable` / `is_teaching`); scores 0 elsewhere |
| **Non-Christian ancient sources** | Fixed list of 8 names (Josephus, Tacitus, Pliny the Younger, Suetonius, Mara bar Serapion, Lucian of Samosata, Celsus, Phlegon of Tralles) matched against body text + footnotes | **+2** per source, capped at **+6**; capped at **+3** for parable articles | Parable articles now earn a reduced credit rather than scoring 0 |
| **Other-religion sources** | Shared matcher (Qur'an, Muhammad, Hadith, Book of Mormon, Joseph Smith, LDS, Buddhist, Hindu, Sikh, Jain, Rastafari, Bahá'í, etc.) matched against body text + footnotes | **−3** flat | Same matcher drives the balanced-debate sentence exclusion |

### 3.5.1 Context-Conditional Detectors

These signals use advanced context analysis — evaluating combinations of article features (category, image presence, diagram/map presence) rather than matching a single keyword or pattern.

#### Religious Art

Evaluates the presence and type of visual media in the article against its category. The intent is explicit: **punish an article that carries a picture but no map or diagram, and reward one that carries both.**

- **If non-parable AND non-teaching article** (i.e. `is_parable` = false AND `is_teaching` = false):
  - Has a picture but **no** diagram or map → **−1** flat (religious artwork substituting for analytical content)
  - Has a picture **and** a diagram or map → **+1** flat (visual media balanced with analytical illustration)
- **If parable or teaching article:** weight does not fire (these articles legitimately use religious art as their subject matter)
- `is_passion` articles are scored at raised sensitivity (§3.9)

Detection uses image-alt-text and caption analysis plus DOM inspection for diagram/map indicators (e.g. mapframe, location-map templates, diagram-style SVG elements).

**Deliberate interaction with Maps and diagrams (§9 row 13).** An article with both a picture and a map earns +1 here *and* +1–2 from the maps/diagrams signal. This stacking is intended, not double-counting to be removed: row 13 rewards the presence of analytical illustration on its own merits, while this signal rewards the *balance* between artwork and illustration. An article with a map and no picture earns row 13 only; an article with a picture and no map is penalised here and earns nothing from row 13.

### 3.6 Associated Term Lookups

These signals match **format patterns and unique identifiers** in the reference list — ISBNs, DOIs, journal names, institutional markers — to classify citations by type rather than matching against a fixed name list.

| Signal | Method | Weight | Notes |
|---|---|---|---|
| **Archaeological site or artefact** | IAA / "archaeolog-" / "excavat-" / "ossuary" / "inscription" keyword match in body text + footnotes | **+2** flat; **+8** for location-category articles with an archaeology hit | Parable articles now score the standard **+2** rather than 0 |
| **Peer-reviewed journal article or scholarly book/monograph** | Reference-list entries matched against journal-ish markers (`journal`, `doi.org`, `jstor`, volume/issue patterns) or book-ish markers (`ISBN`, `University Press`, publisher patterns) | **+1** per citation, capped at **+2** per type | Format-based, not a fixed journal or publisher list |

### 3.7 Weights Removed

The following weight is removed from the rubric entirely in the refactored system:

| Weight | Rationale |
|---|---|
| **Passion-specific criticism** (swoon theory, stake theory, impalement theory) | Too narrow — these terms rarely appear in Wikipedia articles and the signal almost never fires in practice. The broader anti-supernatural and secular-materialist bias detectors already capture the underlying framing |

**The `is_passion` category flag is not retired.** It was previously consumed only by this removed signal. It is repurposed as a **sensitivity trigger** — see §3.9.

### 3.8 Unchanged Weights (Plain Lookups)

The following signals remain as pure keyword / fixed-list / DOM-inspection lookups with no vector component. Their detection logic is unchanged from the current system:

| Signal | Type |
|---|---|
| Bible verse citations | Regex match on chapter:verse patterns |
| Named manuscripts | Fixed list of well-known manuscripts (Codex Sinaiticus, Codex Vaticanus, Dead Sea Scrolls, etc.) |
| Primary-source quotes | Blockquote count + long (40+ char) quoted spans |
| Wikipedia quality rating | DOM inspection for Good Article / Featured Article indicators |
| Referencing quality | Single tiered lookup on `ref_count` (0 → −9; 1–4 → +3; 5–9 → +1; 10+ → 0), plus an independent −1 from DOM inspection for "citation needed" tags / maintenance banners. Absorbs the former separate *No references at all*, *Poor referencing*, and *Niche exposure bonus* signals |
| No Bible verse cited | Bible verse regex count = 0 |
| Maps and diagrams | Simple presence search — DOM inspection for mapframe templates, location-map elements, diagram-style SVGs, or captions containing "map"/"diagram"/"plan"/"floor plan" |

**Resolved — the two signals previously flagged as missing from §9:**
- **Niche exposure bonus** is *not* dropped. It is folded into **Referencing quality** (§9 row 24), which now spans the whole reference-count spectrum from 0 refs (−9) through the niche tiers (+3 / +1) to well-referenced (0). Same input, one signal, no new row — the rubric stays at 25 weights.
- **Historical / contextual information** (+2 in the old Reference.md) is **dropped**. It overlapped heavily with the archaeology signal (§3.6) and with Jewish context (§3.5), and its comparative-language keyword match ("parallels", "comparable to", "in the broader context") is exactly the kind of loose lexical proxy this refactor exists to remove.

### 3.9 Passion Sensitivity Trigger

The `is_passion` category flag (Wikipedia category strip contains "Passion of Jesus" / "Crucifixion of Jesus" / "Resurrection of Jesus") no longer gates a signal of its own. It now acts as a **sensitivity trigger**: Passion articles are the pages where anti-supernatural framing, mythicist citation, and Gnostic over-emphasis are most likely to appear and most consequential, so the detectors for those signals are tuned to fire more readily on them.

**Sensitivity raises detection likelihood; it does not change weights or caps.** A Passion article and a non-Passion article that both fire a signal score identically. The trigger only makes firing easier.

Applies to five signals:

| §9 row | Signal | What raised sensitivity means |
|---|---|---|
| 15 | Religious art | The picture test counts **any** rendered image, including infobox and gallery images, rather than requiring a substantive in-body picture — Passion articles are dense with devotional artwork, and that is exactly the case the penalty targets |
| 16 | Gnostic over-emphasis | `t_fire` and `t_strong` (§3.4.1) both lowered by the calibrated Passion margin — Gnostic passion/resurrection material reaches the privileged tier on weaker evidence |
| 21 | Mythicist bias | `t_fire` lowered on the framing store, so generic mythicist framing without a named author reaches the count threshold more readily. The placement multiplier and imbalance surcharge are unaffected — both are deterministic and take no sensitivity margin |
| 22 | Criticism of the supernatural worldview | `t_fire` and `t_asym` lowered — a computed dimension fires on a smaller asymmetry ratio between view-spans |
| 23 | Secular-materialist presuppositions | `t_fire` lowered; scope already extended to Passion articles (§3.1.7) |

**The Passion margin is one calibrated number, not five.** It is fitted on the Passion subset of the gold set (§11) under the same precision floor of 0.8 that governs the base thresholds. If lowering thresholds on Passion articles cannot hold that floor, the margin is zero and these signals score Passion articles exactly like any other — raised sensitivity is never allowed to buy recall at the cost of false positives.


## 4. Multistage Workflow

1. **Build / fine-tune** the per-family vector databases  
   (slow, iterative, human-reviewed expansion of example sets).
2. **Regather** the candidate pool.
3. **Select** the article set (~255)  and run the hybrid ranker.
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
- **§9 of this document is the source of truth for weights and caps** until `Wikipedia Articles - Reference.md` is rewritten to match it (§5). Where §9 and Reference.md disagree, §9 wins. Do not run `rank_engine.py rescore` until Reference.md has been brought into line — a rescore against the stale table would score every article under the old rubric.
- **Grounding in the scriptural text is deliberately the dominant positive.** Bible-verse citation (+12) is the joint-largest single positive, and the data/interpretation split (+9) sits directly behind it. An article's connection to the primary text is the single most important ranking factor. The known side effect is that longer articles are favoured; accepted.
- **Ranking is decided by net score alone.** There are no tie-break signals — ties resolve alphabetically by title (§12).
- No change to DB schema shape or public `/api/wikipedia` contract.
- Local + GitHub + VPS only; offline scoring required.
- One shared ~90 MB MiniLM-class embedding model; no GPU; dependency ceiling per §3.2.

## 7. Implementation Outline
1. **Build the gold set first** (§11) — hand-label the validation articles before any store exists, so thresholds have a target rather than being fitted to their own output.
2. Create initial per-family stores with small seed example sets, each with **both positive and negative exemplars** (§3.4.1).
3. Implement the two-stage bias pipeline (§3.1.3): embedding span-labelling, then computed metrics.
4. Implement the four combination functions (§3.4) and the similarity → contribution mapping (§3.4.1).
5. Calibrate `t_fire` / `t_strong` / `t_asym` and the Passion margin against the gold set, under the 0.8 precision floor.
6. Wire hybrid path into Stage 3 only.
7. Rewrite `Wikipedia Articles - Reference.md` to match §9, then trim the directory.
8. Execute one full multistage run and validate per §11 against the gold set, current rankings, and the animation widget.

## 8. Open Decisions

**Locked:**
- **Vector storage technology** — file-based indexes (FAISS or LanceDB embedded). Locked; rationale in §3.3.
- **Signal families and seed example sources** — see §3.1.
- **Directory location of the vector stores** — inside `setup/Wikipedia algorithm/`.
- **Model size / dependency ceiling** — one shared MiniLM-class model (~90 MB) across all families, CPU-only, ~150 MB total weight ceiling. Locked; see §3.2.

- **Section classifier authority** — the vector classifier replaces heading-based bucketing **everywhere**; headings are not consulted anywhere in the rubric. Locked; see §3.1.1 and §3.4.2.
- **Stance detection** — not attempted. Rows 19 and 21 use placement and balance as structural proxies instead. Locked; see §11.3.
- **Historical/contextual information** — dropped from the rubric. **Niche exposure** — retained, folded into Referencing quality (§9 row 24). Rubric stays at 25 weights. Locked; see §3.8.

- **Row 5 cap arithmetic** — resolved by re-basing to **+2 per pattern, cap +6, doubled to +12**. The cap is reached at 3 distinct patterns and the representative bonus is a true doubling, so no unexplained ceiling remains.
- **Row 24 / row 25 stacking** — an article with 0 references and no Bible verse takes **−9 and −10 together, a −19 floor**. This is intended and deliberate: an article that is both unsourced and disconnected from the primary text fails on both axes the rubric cares about, and should sit at the bottom of the list. Neither signal suppresses the other.

**Still open:** none. All decisions locked; see §7 for the implementation order.

## 9. Refactored Weights Table

**This table is the source of truth for the rest of this document.** Where any section above disagrees with it, this table wins. `Wikipedia Articles - Reference.md` has not yet been rewritten to match (§5, §7 step 7) and is stale until it is.

Each signal is mapped to its detection approach under the hybrid vector-embedding plan.

Rows are ranked by weight magnitude — strongest positive signal first, strongest negative signal last.

| # | Signal | Weight | How it works (new system) |
|---|---|---|---|
| 1 | Cites/mentions a specific manuscript | **+2** per distinct manuscript, capped at **+6**; max **+8** for teachings/Bible books | **Unchanged plain lookup** (§3.8) — fixed list of well-known manuscripts (Codex Sinaiticus, Vaticanus, Dead Sea Scrolls, etc.); generic "papyrus/codex/manuscript" mention counts as 1 |
| 2 | Cites a specific Bible verse | **+3** per citation, capped at **+12** | **Unchanged plain lookup** (§3.8) — regex match on chapter:verse patterns in rendered text; deduplicated |
| 3 | Data/interpretation split | **+10** clear split; **−3** both present but muddled; **−5** only one side present; **0** unclassifiable | **Vector** (§3.1.1) — **the dominant matrix.** Three stores (data bucket, interpretation bucket, linguistic register) label every body paragraph; a computed separation ratio decides the tier. Headings are not consulted. These labels **are** the section buckets for the entire rubric |
| 4 | Cites a scholarly commentary | **+1** per citation, capped at **+6**; only fires for parable/teaching articles | **Plain list lookup** (§3.5) — fixed series name list (Word Biblical, Anchor Bible, Hermeneia, NICNT, etc.) or "commentary" keyword; gating unchanged |
| 5 | Shows balanced debate in interpretation sections | **+2** per distinct debate pattern, capped at **+6**; **doubled** to max **+12** with 2+ named representatives | **Vector** (§3.1.2) — single store encoding longevity language, representative individuals, disagreement across both layers (data AND interpretation), and properly-anchored consensus. Replaces keyword-pattern matching |
| 6 | Cites an ante-Nicene author | **+2** per author, capped at **+6** | **Plain list lookup** (§3.5) — fixed name list (Ignatius, Polycarp, Justin Martyr, Irenaeus, Tertullian, Origen, Clement, Eusebius, Hippolytus, Cyprian); logic unchanged |
| 7 | Cites/mentions an archaeological site or artefact | **+2** flat; **+8** for location-category articles with an archaeology hit | **Associated term lookup** (§3.6) — IAA/"archaeolog-"/"excavat-"/"ossuary"/"inscription" keyword match; scores **+2** for parable articles; location bonus unchanged |
| 8 | Discusses Jewish context | **+2** per distinct concept, capped at **+6** | **Plain list lookup** (§3.5) — fixed keyword list (Second Temple, Pharisees, Torah, Qumran, Passover, Mishnah, etc.); logic unchanged |
| 9 | Cites/mentions a non-Christian ancient source | **+2** per source, capped at **+6**; scores **+3** for parable articles | **Plain list lookup** (§3.5) — fixed 8-name list (Josephus, Tacitus, Pliny, Suetonius, Mara bar Serapion, Lucian, Celsus, Phlegon); logic unchanged |
| 10 | Literary analysis | **+6** for parable / teaching / Bible-book articles; **+4** for all other articles | **Vector** (§3.1.9) — single vector-embedding database trained on literary-analysis passages: narrative criticism, rhetorical devices (inclusio, chiasm, parallelism), genre conventions, intertextual allusion, reader-response, form-critical segmentation. Tiered by article category |
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


## 10. Theoretical max score by article category

Assumes every positive signal fires at its cap and every negative signal scores 0.

| Row | Signal | Teaching | Book | Location | Parable | Other |
|-----|--------|:-------:|:----:|:--------:|:------:|:-----:|
| 1 | Named manuscripts | +8 | +8 | +6 | +6 | +6 |
| 2 | Bible verse citations | +12 | +12 | +12 | +12 | +12 |
| 3 | Data/interpretation split | +10 | +10 | +10 | +10 | +10 |
| 4 | Scholarly commentary | +6 | 0 | 0 | +6 | 0 |
| 5 | Balanced debate | +12 | +12 | +12 | +12 | +12 |
| 6 | Ante-Nicene authors | +6 | +6 | +6 | +6 | +6 |
| 7 | Archaeology | +2 | +2 | +8 | +2 | +2 |
| 8 | Jewish context | +6 | +6 | +6 | +6 | +6 |
| 9 | Non-Christian ancient | +6 | +6 | +6 | +3 | +6 |
| 10 | Literary analysis | +6 | +6 | +4 | +6 | +4 |
| 11 | Primary-source quotes | +4 | +4 | +4 | +4 | +4 |
| 12 | Journal/book citations | +4 | +4 | +4 | +4 | +4 |
| 13 | Maps and diagrams | +2 | +2 | +2 | +2 | +2 |
| 14 | Wikipedia quality | +1 | +1 | +1 | +1 | +1 |
| 15 | Religious art (best) | 0 | +1 | +1 | 0 | +1 |
| 16–23, 25 | Negatives (best) | 0 | 0 | 0 | 0 | 0 |
| 24 | Referencing quality | 0 | 0 | 0 | 0 | 0 |

| Type | Max |
|------|:---:|
| **Teaching** | **85** |
| **Book (Bible)** | **80** |
| **Location** | **82** |
| **Parable** | **80** |
| **Other** | **76** |

**Why row 24 contributes 0 to the theoretical maximum.** Its niche tiers (+3 at 1–4 refs, +1 at 5–9) are mutually exclusive with maxing the citation-count signals: reaching the commentary cap (+6, six citations) plus the journal/book cap (+4) requires roughly ten or more references, which puts the article in the 10+ tier at 0. The niche bonus exists to lift *short* articles toward this ceiling, not to raise the ceiling itself — so a maximally-sourced article never collects it. This is the intended behaviour: the two ends of the reference spectrum are being brought closer together, not stacked.

## 11. Validation & Gold Set

Without labelled data there is no way to tell whether a vector store is *better* than the keyword detector it replaces or merely *different* — rank churn on its own is unfalsifiable. Every store is therefore validated against a hand-labelled gold set built **before** the store exists.

### 11.1 Gold set construction

- **20–30 articles per vector family**, drawn from the existing ranked list (255 articles) plus deliberately-chosen near-misses from the candidate pool.
- Each article hand-labelled for that family only: does the signal genuinely fire, and at what count or tier?
- Every set must include **negative controls** — articles that trip the *old* keyword detector but should not fire. These are the cases the refactor exists to fix, and they become the negative exemplars in the store (§3.4.1).
- Labels are recorded once and frozen. A store is never re-labelled to agree with its own output.

### 11.2 The section classifier is the primary acceptance test

Because the §3.1.1 classifier is the dominant matrix — it scores row 3 *and* supplies the section buckets every placement-sensitive signal reads — it is the one component whose failure invalidates an article's entire score. It is therefore calibrated first and held to the strictest standard.

- Gold set: **40 articles** (larger than other families), spanning the full shape range — articles with many headings, few headings, and headings that actively mislead about the split.
- Each article hand-labelled twice: **per-paragraph** (data / interpretation / neither) and **per-article** (which of the four row-3 tiers it deserves).
- **Acceptance:** ≥0.85 paragraph-level agreement with the hand labels, and correct tier assignment on ≥0.85 of articles. Both must hold before any other family is calibrated, since every other family's gold-set results are meaningless if the buckets underneath them are wrong.
- The set must include articles whose headings *contradict* their actual structure in both directions — tidy "Interpretation" headings over pure narration, and clean account/analysis separation under headings that say nothing. These are the cases that justify replacing heading matching at all.

### 11.3 Stance-blindness: accepted limitation, addressed by proxy

Reference.md documents the same defect against three signals: *"an article that cites Crossan only to refute him scores the same penalty as one that cites him approvingly."* Name-matching cannot see stance — the name reads identically whether the article endorses the scholar or dismantles them.

**The refactor does not attempt to solve this by detecting stance.** Reliable approving-vs-refuting classification is a substantially harder problem than anything else in this spec, and a stance gate that is wrong 30% of the time is worse than no gate at all, because its errors are silent and unevenly distributed.

Instead, rows 19 and 21 use two **structural proxies** that are fully deterministic and need no stance judgment (§3.1.5, §3.1.6):

1. **Placement** — where the citation sits, per the §3.1.1 classifier. A critical author cited inside the interpretation sections is quarantined as one scholarly view among others (×0.5). Cited outside them — in the narrative account, the lede, or the bibliography — the article is presenting that scholarship as part of the factual record (×2).
2. **Balance** — whether the article shows any scholarly disagreement at all. An article citing Crossan while presenting zero back-and-forth takes a further −2.

These correlate with stance without measuring it: an article citing Crossan *to refute him* almost always does so inside an interpretation/criticism section and almost always exhibits balanced debate, so it lands at ×0.5 with no surcharge. An article adopting his conclusions as settled fact tends to state them in the narrative and show no disagreement, landing at ×2 plus the surcharge. The spread between those two outcomes is 4× plus a flat penalty.

**Residual limitation, stated plainly:** an article that cites Crossan in its narrative section purely to rebut him still takes the ×2. The proxy is directionally right, not exact. This is a known and accepted cost.

### 11.4 Acceptance criteria before the new ranker replaces the old

1. The section classifier meets its thresholds (§11.2). **Blocking for everything else.**
2. Every shipped store meets the 0.8 precision floor on its gold set (§3.4.1).
3. Rank churn is **explained, not merely measured**: for the 20 articles whose rank moves most, the per-signal contribution delta is inspected by hand and each movement traced to a specific signal. Unexplained movement blocks the run.
4. Contribution integers still sum exactly to `net_score` (already verified at write time by the export path).
5. The animation widget renders the new signal set without schema change (§4 step 5).

Any family failing 2 stays on its existing keyword detector; the hybrid design permits shipping family-by-family. **The classifier is the exception** — it has no fallback, because the heading-pattern classifier it replaces is retired (§3.1.1). If it fails 1, the refactor does not ship.

#### The keyword detectors are retained dormant, not deleted

This rule only works if the detectors still exist to fall back to. Earlier wording said the vector stores "replace" the keyword detectors, which read as licence to delete them — and would have removed the fallback before it was ever needed.

**Retain-dormant is the rule.** When a vector family ships, its keyword detector stays in the codebase behind a per-family flag: not called on the default path, but present, tested, and documented as that family's fallback. It is deleted only once its vector family has held the precision floor across a full run and the decision to drop the fallback is taken deliberately.

Two detectors are genuine deletions rather than dormant fallbacks, because their weights leave the rubric entirely and nothing falls back to them:
- **Passion-specific criticism** (§3.7) — weight removed.
- **Historical / contextual information** (§3.8) — weight removed.

Everything else that a vector family covers is retained dormant.

**Dormant detectors read vector buckets, not headings.** Some retained detectors are placement-sensitive (Jesus Seminar and mythicist need to know whether a citation sits inside the interpretation sections). Their original implementations derived that from heading-matched buckets, which are retired (§3.4.2). A dormant detector, when activated, therefore consumes the **§3.1.1 classifier's paragraph labels** exactly as its vector counterpart would. What falls back is the *detection* logic — the keyword and name matching — never the bucketing. There is one bucketing authority in the system and a fallback does not create a second.

This also means the classifier is a hard prerequisite for the fallback path, not just the vector path: if the classifier fails its gate (§11.2), no placement-sensitive fallback works either. That is consistent with the classifier having no fallback of its own.

## 12. Ranking Mechanics

Scoring produces a number; ranking turns numbers into an ordered list of every selected article (currently 255). This section defines that step completely.

### 12.1 From signals to net score

1. Each of the 25 signals (§9) produces an integer contribution, already capped and already multiplied by any category conditional or placement multiplier that applies.
2. `net_score` = plain sum of the 25 contributions. No further weighting, normalisation, or scaling.
3. Contributions **must sum exactly to `net_score`** — verified at write time by the export path (§11.4 criterion 4). A rounding step anywhere in the pipeline is a bug.

Multiplier truncation: where a placement multiplier produces a fraction, the result **truncates toward zero** (a halved single mythicist hit is −1, not −2 and not −1.5). Truncation happens once, immediately after the multiplier, before the contribution enters the sum.

### 12.2 Sort and tie-break

**Sort by `net_score`, descending. Rank 1 = highest score; the last rank equals the article count — currently 255, not a fixed 250.**

**There is no tie-break signal. Articles with equal `net_score` are ranked alphabetically by title.**

This is a deliberate simplification of the previous three-rule tie-break (verse count, then reference count, then alphabetical). Two consequences the plans must handle:

- **Ties will be common.** Integer scores across a range of roughly −60 to +84 across ~255 articles means clusters at popular values are expected, not exceptional. Alphabetical ordering inside a cluster is arbitrary by design — it is a stable, reproducible ordering, not a claim that *Bethlehem* is a better article than *Capernaum*.
- **Ranking is deterministic.** Same inputs always produce the same list, with no dependence on row order in the source data, dictionary iteration order, or sort stability. Any implementation must sort on the composite key `(−net_score, title)` rather than relying on a stable sort of a pre-sorted list.

Alphabetical comparison uses the **raw article title**, before the comma-to-hyphen substitution applied to output files (§13.3), so the ordering does not depend on an output formatting step.

### 12.3 Explainability requirement

Every article's score must be reconstructable from stored per-signal contributions without re-running the scorer. For vector signals this additionally means recording, per fired signal: the matched exemplar ID, the similarity score, and the threshold it cleared. A contribution that cannot be traced back to a specific exemplar is not explainable and fails the §6 constraint.

## 13. Self-Sufficiency: What `Wikipedia algorithm/` Must Contain

**This document is a design spec for the scoring layer, not a complete build spec for the pipeline.** It assumes several artefacts exist alongside it. `setup/Wikipedia algorithm/` currently contains only this file and the widget spec, so anything listed below that is not written into a plan will not exist there.

**Verified 2026-07-27.** The prior directory is now `setup/Wikipedia algorithm v1/` (renamed; `.rescore-progress.jsonl` no longer present). The pipeline scripts **do exist** — not in either algorithm directory, but under `setup/SKILLS/!TheJesusWebsite-Wikipedia/`. Plans 2 and 6 are therefore **port-and-adapt jobs, not greenfield builds**.

### 13.1 Existing assets — locate, do not rebuild

| Artefact | Actual location | Notes |
|---|---|---|
| `extract.js` | `setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/extract.js` (331 lines) | Browser-side DOM extraction of ~30 signals from a live Wikipedia page. Contains the current section-bucketing logic (to be **replaced** by the §3.1.1 classifier) and every non-vector detector (to be **retained**) |
| `rank_engine.py` | `setup/SKILLS/!TheJesusWebsite-Wikipedia/scripts/rank_engine.py` (696 lines) | Python orchestrator; drives extract.js via a headless-browser subprocess. Owns `rescore`, `exclude`, `remove`, `export` subcommands |
| Skill definition | `setup/SKILLS/!TheJesusWebsite-Wikipedia/skill.md` | The operating procedure for the whole pipeline |
| `import-wikipedia-scoring.js` | `api/scripts/import-wikipedia-scoring.js` | Exists, with a test at `api/tests/import-wikipedia-scoring.test.js`. Currently validates **28** signal keys — must be reduced to the 25 of §9 |
| `Wikipedia Articles - Reference.md` | `setup/Wikipedia algorithm v1/` | §9 of *this* file supersedes its weights table; its non-weights content must be ported (§13.4) |
| Data + companion files | `setup/Wikipedia algorithm v1/` | `Wikipedia Articles.csv` (255 articles), `Wikipedia Articles - Scoring Detail.csv` (41 columns), `candidate-pool.tsv` (512 candidates), `excluded-titles.txt` (21 titles), `scoring-export.json`, `wiki-bulk-paste.txt` |
| DB schema | `database/schema.sql` | Authoritative. `wikipedia_articles` (11 cols) + `wikipedia_article_signals` (5 cols, UNIQUE on article_id+signal_key) |

**Python is already in use** — `rank_engine.py` has a compiled `__pycache__` artefact for CPython 3.14. The embedding layer does not need to bootstrap Python from nothing, but the dependency ceiling in §3.2 still applies to anything new it adds.

### 13.2 Genuinely absent — must be authored

| Artefact | Referenced in | Status |
|---|---|---|
| A v2 `Wikipedia Articles - Reference.md` | §5, §6, §7 step 7, §9 preamble | Must be authored inside v2 (§13.4) |
| Stage 1 pool-creation criteria | §4 step 2 | Exists in v1 Reference.md; not stated in this document |
| Stage 2 selection criteria | §6 ("remain completely unchanged") | Exists in v1 Reference.md; not stated in this document |
| Category detection strings | `is_passion` given in §3.9 only | Five of six undefined here; all six exist in v1 Reference.md |
| Vector stores + example sets | §3.1, §3.3 | Do not exist anywhere. The core new build |
| Gold-set label files | §11 | Do not exist anywhere |

### 13.2 Category flags — the one table that must exist before any signal can be gated

Six flags gate or modify signals across the rubric. Only `is_passion` is defined in this document. A plan must establish all six, detected from the Wikipedia category strip (`#mw-normal-catlinks`) at harvest time and stored per article:

| Flag | Gates / modifies |
|---|---|
| `is_passion` | Sensitivity trigger for rows 15, 16, 21, 22, 23 (§3.9); scope for rows 22, 23 |
| `is_miracle` | Scope for rows 22, 23 (§3.1.3, §3.1.7) |
| `is_parable` | Row 4 gating; row 9 reduced cap; row 7 treatment; row 10 tier; row 15 suppression |
| `is_teaching` | Row 1 raised ceiling; row 4 gating; row 10 tier; row 15 suppression |
| `is_bible_book` | Row 1 raised ceiling; row 10 tier |
| `is_location` | Row 7 archaeology bonus (+2 → +8) |

Note that `is_parable` and `is_teaching` each affect **five** signals. An error in category detection propagates further than an error in any single detector, so category detection deserves its own validation pass alongside the classifier (§11.2).

### 13.3 Output format conventions

Carried forward unchanged; a plan that regenerates deliverables must preserve them:

- Deliverable columns are `title`, `url`, `ranking`.
- Any comma inside a **title** is replaced with a hyphen (*Mary, mother of Jesus* → *Mary - mother of Jesus*).
- Any comma inside a **URL** is percent-encoded as `%2C`.
- The result is safe to read as plain comma-separated text with no quoting or escaping anywhere.
- Sorting for rank assignment uses the raw title, before substitution (§12.2).

### 13.4 Recommended: make v2 self-contained

The cleanest resolution is for one plan to produce a **new** `Wikipedia Articles - Reference.md` inside v2 that carries §9's weights table plus the non-weights content currently stranded in the old directory. Until that exists, v2 cannot regenerate the list on its own, and §5's "trim Reference.md" step has no file to act on.

## 14. Worked Example

A single article scored end to end, to fix the order of operations. Values are illustrative.

**Article:** *Pool of Bethesda* — category strip yields `is_location = true`, all other flags false.

**Step 1 — classify (§3.1.1).** 14 body paragraphs. Classifier labels paragraphs 1–6 `data`, 7–11 `interpretation`, 12–14 `data`. Lede and reference list assigned `other` positionally.

**Step 2 — separation ratio.** Transitions between adjacent differing labels: 6→7 and 11→12 = 2 transitions over 13 adjacent pairs. `separation = 1 − 2/13 = 0.85`. Assume `t_sep = 0.70` → clean split.

**Step 3 — signal contributions.**

| Row | Signal | Raw finding | Contribution |
|---|---|---|---|
| 1 | Manuscripts | 1 named (Codex Sinaiticus) | +2 |
| 2 | Bible verses | 5 distinct citations, ×3, cap +12 | +12 |
| 3 | Data/interp split | clean (0.85 ≥ 0.70) | **+10** |
| 5 | Balanced debate | 2 distinct patterns, no named reps | +4 |
| 6 | Ante-Nicene | 0 | 0 |
| 7 | Archaeology | fires, `is_location` → bonus tier | **+8** |
| 8 | Jewish context | 3 concepts ×2, cap +6 | +6 |
| 9 | Non-Christian ancient | Josephus only | +2 |
| 10 | Literary analysis | store fires, non-parable tier | +4 |
| 11 | Primary-source quotes | 2 blockquotes | +2 |
| 12 | Journal/book | 3 journal + 1 book, cap +2 per type | +3 |
| 13 | Maps and diagrams | 1 site plan | +1 |
| 14 | GA/FA | not rated | 0 |
| 15 | Religious art | picture **and** diagram present | +1 |
| 19 | Jesus Seminar | Crossan cited once, in `interpretation` | −3 → ×0.5 → **−1** |
| 24 | Referencing quality | 22 refs → 10+ tier; no maintenance banner | 0 |
| 25 | No Bible verse | verses present | 0 |

Rows not listed score 0.

**Step 4 — net score.** Sum = **+54**.

**Step 5 — the row 19 detail that matters.** Crossan appears once, inside an interpretation paragraph. Base −3, capped at −6 (not reached), placement ×0.5 → −1.5, **truncated toward zero → −1**. The imbalance surcharge does *not* apply because balanced debate (row 5) scored +4, not 0. Had Crossan instead appeared in a `data` paragraph and balanced debate scored 0, the same single citation would produce −3 × 2 − 2 = **−8** — an eight-point swing on placement and balance alone, with no stance judgment (§11.3).

**Step 6 — rank.** *Pool of Bethesda* sorts into position by `(−54, "Pool of Bethesda")`. Any other article also scoring 54 sorts alphabetically against it.

## 15. Glossary

Terms used throughout with specific meanings:

| Term | Meaning |
|---|---|
| **Family** | One conceptual signal group with its own example set and index — e.g. `balanced-debate`. Families share the embedding model (§3.2) but not their examples |
| **Store / index** | The on-disk vector index for one family, holding positive and negative exemplars |
| **Exemplar** | A curated example passage inside a store. **Positive** = embodies the signal; **negative** = superficially similar but must not fire (§3.4.1) |
| **Span** | A unit of article text submitted as a query — sentence-level for bias detection (§3.1.3), paragraph-level for classification (§3.1.1) |
| **View-span** | In §3.1.3 only: the aggregate of all spans labelled as one side of a supernatural/naturalistic pair. Computed metrics compare two view-spans |
| **Bucket** | A section label — `data`, `interpretation`, or `other`. Produced by the classifier (§3.1.1), not by headings |
| **`t_fire`** | Per-family similarity threshold below which a span contributes nothing |
| **`t_strong`** | Per-family threshold at or above which a shape-D signal takes its upper tier |
| **`t_sep`** | Separation-ratio threshold distinguishing a clean split from a muddled one (§3.1.1) |
| **`t_asym`** | Asymmetry-ratio threshold for the computed bias metrics (§3.1.3) |
| **Passion margin** | Single calibrated amount by which thresholds drop on `is_passion` articles (§3.9) |
| **Function shape A–D** | The four vector/list combination patterns (§3.4) |
| **Placement multiplier** | ×2 / ×0.5 / ×1 applied to author-citation penalties by bucket (rows 19, 21) |
| **Imbalance surcharge** | Flat −2 added to rows 19/21 when balanced debate scores 0 |
| **Contribution** | One signal's final integer input to `net_score`, after caps, conditionals and multipliers |

## 16. Suggested Plan Decomposition

The work does not fit one plan. A workable split, ordered by dependency:

**Plan 1 — Foundation and contract.** Author the new in-v2 `Wikipedia Articles - Reference.md` (§13.4); establish the six category flags and their detection strings (§13.2); state the DB schema and output conventions (§13.3); port Stage 1 and Stage 2 criteria. *Blocks everything else — no signal can be gated until the flags exist.*

**Plan 2 — Harvest and extraction.** Rebuild `extract.js` equivalent: fetch rendered articles, extract body text, footnotes, reference list, DOM indicators (GA/FA, maintenance banners, images, maps/diagrams), and the category strip. Output the per-article raw signal record. *No embeddings involved; the plain and associated-term lookups (§3.5, §3.6, §3.8) can be fully implemented and tested here.*

**Plan 3 — Gold set.** Build the §11 gold sets before any store exists: 40 articles for the classifier with per-paragraph labels, 20–30 per vector family, negative controls throughout. *Deliberately precedes store construction — thresholds fitted to their own output are worthless.*

**Plan 4 — Classifier.** Implement §3.1.1 alone: the three stores, paragraph labelling, separation ratio, row 3 tiers, bucket output. Calibrate `t_sep` against Plan 3's labels to the §11.2 bar. *Blocks all placement-sensitive signals; has no fallback if it fails.*

**Plan 5 — Vector signal families.** The remaining nine families, the four combination functions (§3.4), the similarity→contribution mapping (§3.4.1), and the two-stage bias pipeline (§3.1.3). Shippable family-by-family; a family failing its precision floor stays on its keyword detector.

**Plan 6 — Scoring, ranking and export.** Assemble contributions, compute `net_score`, sort by `(−net_score, title)` (§12.2), write the deliverables and `scoring-export.json`, verify contributions sum exactly, confirm the animation widget renders unchanged.

Plans 2 and 3 can run in parallel. Plan 4 must complete before Plan 5's placement-sensitive families. Plan 6 needs 2, 4 and 5.
