# Literary Analysis Signal Specification (Signal 10)

## 1. Purpose

This document defines the detection rules and calibration criteria for the **literary-analysis presence vector** (Signal 10). The detector distinguishes three tiers of engagement with Gospel texts in Wikipedia articles:

| Tier | Description | Fires? |
|------|-------------|--------|
| **Tier 1** | Factual reporting, plot summary, or naming a literary form without analysis | **No** — zero contribution |
| **Tier 2** | Formal / rhetorical analysis — the article itself performs close reading or identifies literary structure | **Yes** — +6 or +4 |
| **Tier 3** | Literary-theoretical interpretation — the article applies a named literary-critical framework | **Yes** — +6 or +4 |

The core question the detector answers:

> *Is the article itself doing literary analysis, or is it merely reporting that someone else did?*

---

## 2. Tier Definitions

### 2.1 Tier 1 — Plot / Data (does NOT fire)

Tier 1 covers **descriptive or reporting language** that does not constitute literary analysis performed by the article. This includes:

- Paraphrasing what happens in a passage
- Naming a genre or literary form without analyzing it (e.g., `"this is a parable"`)
- Reporting that a scholar performed analysis without the article performing it (e.g., `"Culpepper argues Mark uses intercalation"`)
- Listing verses, manuscripts, or textual variants
- Stating where a passage appears (e.g., `"this pericope is unique to Luke"`)

**Linguistic clues (non-exhaustive):**

- `"appears in"`, `"is found in"`
- `"describes"`, `"narrates"`, `"consists of"`
- `"recounts"`, `"tells the story of"`
- `"argues that"`, `"according to"`, `"notes that"` — when the article is attributing analysis to a scholar rather than performing it
- `"is a parable"`, `"is a miracle story"`, `"is an apocalypse"` — bare form-naming without structural elaboration

**Examples:**

> `"The Parable of the Good Samaritan appears only in Luke 10:25–37."`

> `"Mark 4:1–20 contains the Parable of the Sower and its interpretation."`

> `"Joachim Jeremias argues that the parable reflects a first-century Palestinian setting."`  
> *(Attribution only; the article is not itself performing the analysis.)*

### 2.2 Tier 2 — Formal / Rhetorical Analysis (fires, +6 or +4)

Tier 2 covers articles where **the article itself** performs close reading or identifies literary structure. The key distinction from Tier 1 is *agency*: the article, not a cited scholar, is doing the analysis.

Characteristics:

- **Identifies specific literary devices**: inclusio, chiasm, parallelism, intercalation (Markan sandwich), ring composition, antithetical parallelism, a fortiori argument
- **Segments text by form**: `"verses 1–8 form a chiasm"`, `"the parable can be divided into three movements"`
- **Rhetorical analysis of effect**: `"the repetition of 'immediately' creates urgency"`
- **Comparative literary observation**: `"unlike Mark, Luke arranges this material to highlight the reversal"`
- **Genre-convention analysis**: `"follows the standard mashal form with a nimshal application"`
- **Structural framing**: `"the healing of the blind man frames the discipleship discourse"`

**Linguistic clues (non-exhaustive):**

- `"is structured"`, `"forms a"`, `"employs"`
- `"uses the device of"`, `"creates a"`, `"builds toward"`
- `"the pattern of"`, `"arranged chiastically"`
- `"framed by"`, `"sandwiched between"`, `"bracketed by"`
- `"the structure mirrors"`, `"the narrative arc"`

**Examples:**

> `"Mark sandwiches the cleansing of the temple within the fig-tree narrative to interpret each event through the other."`

> `"The chiasm in Matthew 7:6 structures the passage around the central prohibition against giving what is holy to dogs."`

> `"The parable follows the standard mashal form: a short narrative from everyday life followed by a nimshal application."`

> `"Verses 1–8 form a chiasm whose pivot is the confession in verse 4."`

### 2.3 Tier 3 — Literary-Theoretical Interpretation (fires, +6 or +4)

Tier 3 covers articles that apply a **named literary-critical framework or theory** to the Gospel text. This is a superset of Tier 2 analysis elevated by theoretical self-awareness.

Characteristics:

- **Narrative criticism**: `"from a narrative-critical perspective, the implied reader is led to identify with the disciples' misunderstanding"`
- **Reader-response criticism**: `"the reader is positioned to identify with Peter's failure"`
- **Intertextuality**: `"echoes/alludes to"`, `"intertextual connection with Isaiah's suffering servant"`
- **Deconstruction**: `"subverts"`, `"destabilizes"`, `"undermines a straightforward reading"`
- **Feminist / gender criticism**: explicit framework application (e.g., `"a feminist reading of the Syrophoenician woman reveals..."`)
- **Postcolonial criticism**: explicit framework application
- **Form criticism applied analytically** (beyond mere labeling): `"the Sitz im Leben of this pericope suggests a community wrestling with Gentile inclusion"`
- **Rhetorical criticism**: `"the rhetorical strategy of the Sermon on the Mount follows classical dispositio"`

**Linguistic clues (non-exhaustive):**

- `"from a [school] perspective"`, `"a [school] reading would suggest"`
- `"invites the reader to"`, `"positions the reader"`
- `"subverts the expectation"`, `"deconstructs"`
- `"the implied reader"`, `"the narratee"`, `"the ideal audience"`
- `"echoes of"`, `"alludes to"` (when developing an intertextual argument)
- `"focalized through"`, `"the narrative voice"`

**Examples:**

> `"From a narrative-critical perspective, the implied reader is led to identify with the disciples' misunderstanding throughout Mark's Gospel."`

> `"The story subverts the reader's expectation that the priest will help, destabilizing the hearer's assumptions about religious authority."`

> `"The Johannine prologue echoes the creation narrative of Genesis 1, establishing an intertextual framework for the entire Gospel."`

---

## 3. Boundary Cases

The hardest distinctions lie at the Tier-1/2 boundary (attribution vs. performance) and the Tier-2/3 boundary (formal analysis vs. theoretical framing). The table below codifies the decisions.

| Example | Tier | Why |
|---|---|---|
| `"The parable of the Good Samaritan appears only in Luke"` | 1 | Names a literary fact without analysis |
| `"The parable follows the standard mashal form"` | 2 | Identifies formal structure — the article performs the classification |
| `"Culpepper argues Mark uses intercalation"` | 1 | Reports another's analysis; the article does not perform it |
| `"Mark sandwiches the cleansing of the temple within the fig-tree narrative"` | 2 | The article identifies the structure — no attribution hedge |
| `"The chiasm in Matthew 7:6 structures the passage around the central prohibition"` | 2 | Identifies and explains a literary device |
| `"The story is a parable"` | 1 | Bare form-naming with no structural elaboration |
| `"The parable can be divided into three movements: setup, confrontation, reversal"` | 2 | Segments the text by form — structural analysis |
| `"From a narrative-critical perspective, the implied reader is led to identify with the disciples' misunderstanding"` | 3 | Applies a named theoretical framework |
| `"The story subverts the reader's expectation that the priest will help"` | 3 | Performs deconstructive reading (subverts expectations = destabilizes a straightforward reading) |
| `"Mark's Gospel employs irony to critique the disciples"` | 2 | Rhetorical analysis of how the text achieves an effect |
| `"A postcolonial reading of the Gerasene demoniac reveals Roman imperial imagery"` | 3 | Explicitly names and applies a theoretical framework |
| `"Joachim Jeremias identifies ten parables as authentic to the historical Jesus"` | 1 | Attribution to a scholar; no analysis performed by the article |
| `"The repetition of 'immediately' (euthys) in Mark 1 creates a sense of urgent, breathless action"` | 2 | Rhetorical analysis of literary effect |
| `"The Fourth Gospel focalizes the passion narrative through Jesus's sovereign control"` | 3 | Narrative-critical terminology (focalization) applied analytically |
| `"Matthew 5–7 is called the Sermon on the Mount"` | 1 | Bare naming with zero analysis |

---

## 4. Acceptance Gates

The detector must pass the following calibration criteria before deployment.

| Metric | Requirement | Reasoning |
|--------|-------------|-----------|
| **Precision floor** | ≥ 0.80 | Must not fire on Tier-1 articles; a lower precision means the signal is noisy and dilutes the grid |
| **Recall floor** | ≥ 0.60 | Must catch the majority of Tier-2/3 articles; a lower recall means the signal is missing substantive analysis |
| **Fire-rate band** | 15–50% of the 255-article corpus | A detector firing on <5% is indistinguishable from today's zeroed signal (it contributes nothing). A detector firing on >50% suggests the Tier-1/2 boundary is too loose and plot-summary language is leaking through |
| **F1 minimum** | ≥ 0.65 | Harmonic mean of precision and recall; ensures a balanced detector that is neither overly conservative nor indiscriminate |
| **Tier-1 false-positive rate** | ≤ 10% | At most 1 in 10 Tier-1 articles may be misclassified as literary analysis |

### Reasoning

A precision-only gate admits a near-silent detector — one that fires on very few articles but is nearly always correct. That detector would not contribute meaningful signal to the grid. The **recall floor** ensures the detector actually fires on real literary analysis. The **fire-rate band** acts as a coarse sanity check: if the detector fires on <5% of the corpus, it is functionally silent; if it fires on >50%, the Tier-1/2 boundary is too loose. Together, these three gates require the detector to be both *accurate* and *useful*.

---

## 5. Category-Dependent Tiering

The signal applies different contribution values depending on the article's category:

| Category Flag | Contribution When Store Fires | Contribution When Store Does NOT Fire |
|---------------|-------------------------------|---------------------------------------|
| `is_parable` | **+6** | 0 |
| `is_teaching` | **+6** | 0 |
| `is_bible_book` | **+6** | 0 |
| All other articles | **+4** | 0 |

### Reasoning

**Parable, teaching, and Bible-book articles** inherently concern Gospel texts — a parable article is about a parable, a teaching article is about a teaching. Literary analysis is not merely expected in these articles; it is definitional to quality coverage. These articles earn the full **+6** when the store fires.

**All other articles** — places, people, events, concepts — may contain literary analysis as a bonus signal of editorial depth. A biographical article on Pontius Pilate that includes narrative-critical analysis of Pilate's portrayal in the Gospels is doing something extraordinary. These articles earn **+4**: the signal is a positive quality indicator but not definitional to the article's purpose.

When the store does **not** fire, contribution is **0** regardless of category. There is no penalty for absence of literary analysis; the signal is purely additive.

---

## Appendix A: Quick-Reference Detection Checklist

Use the following decision tree when evaluating an article:

1. **Is the article doing analysis, or just reporting?**
   - Reporting / naming / attributing → Tier 1 → **NO FIRE**
   - Performing analysis → continue to step 2

2. **What kind of analysis?**
   - Identifying devices, structure, rhetorical technique → Tier 2 → **FIRE**
   - Applying a named theoretical framework → Tier 3 → **FIRE**

3. **Is there an attribution hedge?** (`"X argues"`, `"according to Y"`, `"Z contends"`)
   - Yes → the article is probably reporting, not performing → suspect Tier 1
   - No attribution, analysis in the article's own voice → suspect Tier 2 or 3

---

## Appendix B: Relationship to Other Signals

Signal 10 is part of the Wikipedia article classifier grid. It is independent of:

- **Signal 3 (narrative summary detector)**: Tier-1 plot paraphrase may overlap with narrative-summary language, but Signal 10 is specifically gated to NOT fire on Tier 1. An article can score high on narrative summary and still score 0 on literary analysis.
- **Signal 7 (theological depth detector)**: Literary analysis may coincide with theological depth, but the detectors are orthogonal. Signal 10 cares about *how* the text is discussed (literary-critical methods); Signal 7 cares about *what theological content* is present.

The signals are designed to be complementary, not redundant.
