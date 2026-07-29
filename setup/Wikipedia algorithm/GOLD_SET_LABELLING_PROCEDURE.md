# Gold-Set Labelling Procedure

This is the reproducible procedure used to hand-label `gold-set-section-classifier.csv`,
`gold-set-vector-families.csv`, and `gold-set-negative-controls.csv`. It exists so a second rater
(human or another LLM session) can extend or audit the gold set using the same rules the first
pass used — consistency of method matters more here than any single label, because thresholds in
Plans 4–5 are calibrated against whatever this file describes.

**Labels are frozen once recorded (§11.1).** A vector store's output is never used to re-label a
gold-set row. If a calibrated store disagrees with a gold-set label, the label stands and the
store's thresholds or example set are revised — not the other way around.

## 1. Section-classifier paragraph-level labelling

For each body paragraph of an article, in reading order (skip infobox/references/external-links/
navboxes — only prose paragraphs under headings, plus the lede), assign one of three labels:

- **`data`** — concrete, verifiable, past-tense narrative content: background, chronology, events,
  primary-source or archaeological evidence, "what happened." Specific entities, dates, places,
  numbers. Neutral factive verbs: *occurred, included, documented, found*.
- **`interpretation`** — abstract, present-tense, hedged, scholarly content: analysis, meaning,
  significance, historiography, scholarly debate, methodology. Hedging/evaluative verbs: *likely,
  probably, suggests, indicates, arguably, significant*. Named-scholar attribution ("Barnett
  argues…", "this is seen by historians as…").
- **`neither`** — doesn't clearly fit either: a bare list, a one-line transition, boilerplate.

**The three linguistic registers** (§3.1.1 of the refactor spec) that distinguish `data` from
`interpretation`, independent of topic:

| Feature | `data` | `interpretation` |
|---|---|---|
| Tense | Past, concrete ("In 44 BCE…") | Present, abstract ("Historians argue…") |
| Specificity | Specific entities/dates/numbers | General/abstract referents |
| Verb choice | Neutral, factive | Hedging, evaluative |
| Attribution | — | Named scholars/schools |

A paragraph can read as topically "historical" and still be `interpretation` if it's making an
argument about what the history means, and vice versa — topic is a weak signal next to register.

**Headings are never consulted for the label itself** — only used afterward, in the `notes`
field, to flag when they mislead (a heading that says "Historical account" over paragraphs that
are actually pure interpretation, or an un-headed section that's pure narrative). This is
deliberate: the whole point of retiring the old heading-keyword classifier is that headings and
content disagree often enough to matter (§3.1.1), and a labeller who defers to headings reproduces
the exact defect being replaced.

## 2. Tier assignment

Compute over the paragraphs labelled `data` or `interpretation` only (`neither` paragraphs are
dropped from this calculation, per §3.1.1's separation-ratio definition):

```
transitions = count of adjacent (data/interpretation)-only paragraph pairs whose labels differ
separation  = 1 − (transitions / (labelled_paragraphs − 1))     [= 1.0 if 0 or 1 labelled paragraphs]
```

| Condition | `tier_assignment` |
|---|---|
| Both classes present, `separation ≥ 0.70` | `clear_split` — data and interpretation each form their own contiguous block |
| Both classes present, `separation < 0.70` | `muddled` — they alternate paragraph-by-paragraph; content is there, structure isn't |
| Only one class reaches the threshold at all | `one_side_only` — the article does one job and skips the other entirely |
| Neither class reaches a handful of paragraphs (too short/thin) | `unclassifiable` — no judgement possible |

`t_sep = 0.70` here is the pilot value used for this gold-set pass; the refactor spec (§3.1.1)
leaves the final calibrated `t_sep` to be fitted against the frozen gold labels in Plan 4 — this
gold set is exactly that fitting target, not itself pre-calibrated to it.

## 3. Vector-family labelling: positive indicators per family

For each of the 10 vector-embedding families, "firing" means the following (condensed from
`Wikipedia_alogrithm_refractor.md` §3.1.2–§3.1.10 — consult those sections for the full
definition when in doubt):

| Family | Fires when… | Red flags (do NOT count as firing) |
|---|---|---|
| **data-interpretation-split** | The article's data and interpretation content separate into distinct runs (see §1–2 above) | A muddled or one-sided article — that's `lower`/no-fire, not a weaker version of firing |
| **balanced-debate** | Interpretation sections show: (a) longevity language (debate framed as long-standing / named school of thought); (b) representative individuals named with stance verbs; (c) disagreement at *both* the data layer and the interpretation layer; (d) properly-anchored consensus language (named + reasoned, not bare) | Unattributed "some argue…"; a bare "scholars agree" claim with no names/reasoning |
| **anti-supernatural** | Structural asymmetry disfavouring the supernatural-claim view across 2+ of: attribution-verb asymmetry, epistemic marking, granularity asymmetry, labelling/moral lexicon, narrative-agency bias, structural/positional bias, presupposition/omission (§3.1.3) | Neutral reporting that skeptics/naturalistic explanations exist, with no asymmetry — this is balanced coverage, not bias |
| **ot-nt-discontinuity** | Critical/discontinuity framing via one of: proof-texting/decontextualization, divergent-messianic-expectation framing, Law-abrogation framing, intertestamental-evolution framing, or contradiction/discrepancy framing | Neutral scholarly discussion of fulfillment or continuity — this signal fires on *tension* framing specifically |
| **mythicist-framing** | Carrier/Price/Doherty or "Christ myth theory" cited; framing (not just presence) is what's judged — is it narrative-embedded (worst), interpretation-quarantined, or cited-to-refute? | "Myth" in an unrelated sense (e.g. Greek mythology) |
| **jesus-seminar** | Funk/Crossan/Borg or "the Jesus Seminar" cited; judge placement/framing the same way as mythicist | A footnote-only citation with no substantive framing at all is a much weaker case — record it, but the notes should say so |
| **secular-materialist** | Miracle-article secular-materialist terms (naturalistic explanation, psychosomatic, mass hallucination, mythological, legendary development/accretion, scientifically explain/implausible) appear **in the narrative/account section itself** | The same terms confined to a clearly-labelled "interpretations"/"skeptical views" section — that's balanced reporting |
| **confessional-balance** | A critical scholar (Ehrman, Lüdemann, Pagels, Fredriksen, Aslan, Casey, Avalos, Martin) is cited **and** no Evangelical/confessional counter-voice (Wright, Bauckham, Blomberg, Keener, Evans, Bock, Witherington, Licona, Habermas, Carson, Moo, Bruce, Marshall, Barnett) appears in the interpretation sections | Critical scholar cited *with* an Evangelical counter-voice present — that's balance, not a violation; no critical scholar cited at all — signal doesn't apply |
| **literary-analysis** | Genuine narrative/rhetorical/genre/intertextual/reader-response/form-critical engagement with the text as literature | Historical or theological discussion alone, however thorough — that's not literary analysis |
| **gnostic-over-emphasis** | Gnostic material used as evidentiary basis for claims about Jesus, given comparable/greater weight than canonical sources, or carrying the article's interpretive framing (**upper** tier); OR named/attributed/reported as a historical datum in passing (**lower** tier) | No Gnostic material at all, or a single trivial mention that doesn't even reach "lower" |

Only `anti-supernatural`, `secular-materialist`, `literary-analysis`, and `gnostic-over-emphasis`
carry an upper/lower tier (shape-D signals, §3.4); the rest leave `tier_if_applicable` empty.

## 4. Negative controls

A negative control is an article (drawn from `candidate-pool.tsv`, never from the ranked 255,
since those are already scored) where the **old keyword/pattern detector** would fire but a real
read says it shouldn't. `old_detector_fired` and `should_fire_new` must disagree — that
disagreement is what makes the row useful (§11.1: "these are the cases the refactor exists to
fix"). Typical patterns worth hunting for:

- A fixed-list author (Ehrman, Crossan, Carrier, etc.) cited only to be **refuted**, not endorsed.
- A keyword (e.g. "mythological", "Gnostic", "debated") appearing in an unrelated sense or context.
- A pattern confined to a section a naive detector doesn't know to exclude (e.g. a clearly-labelled
  "Criticism" or "Skeptical views" heading).
- Balanced content where the old detector's single-keyword match can't see the balance already
  present nearby.

The `reason` field must explain the mismatch concretely enough that a second rater could verify it
without re-deriving your judgement from scratch.

## 5. Confidence scoring (paragraph labels only)

`confidence` is a 0.0–1.0 float per paragraph in the classifier gold set, representing how sure
the single rater is of that paragraph's label (this pilot pass used one rater per chunk, not
multi-rater agreement — a future pass with independent second labelling would use inter-rater
agreement instead, per §11.2's ≥0.85 target). Rough calibration used across this gold set:

- **0.9–1.0** — unambiguous: clear past-tense narration, or clear present-tense scholarly hedging.
- **0.7–0.85** — fairly clear, minor stylistic mixing.
- **0.5–0.65** — genuinely ambiguous; register signals point in different directions, or the
  paragraph is short enough that one sentence could tip it either way.
- **Below 0.5** — was avoided; if a paragraph is this uncertain it should usually be `neither`.

## 6. Quality checks — when a second pass is warranted

Flag (in `notes`, and separately to whoever reviews this gold set) any article where:

- An article has **zero** interpretation paragraphs despite being a substantial, well-developed
  page — check whether the rater under-labelled rather than the article genuinely being one-sided.
- `tier_assignment` disagrees with what the headings alone would suggest, in either direction —
  this is expected and valuable (§3.1.1's whole reason for existing), but should be double-checked
  once rather than assumed.
- Confidence scores cluster low (many paragraphs under 0.65) — the article itself may be poorly
  suited to this classification scheme (e.g. list-heavy, dialogue-heavy) rather than the rater
  being unsure; note this explicitly rather than forcing a label.
- A vector-family judgement and a negative-control judgement disagree about the same underlying
  article (shouldn't happen since negative controls are drawn from the separate out-of-scope
  candidate pool, but check if it ever does — it would indicate a selection-list bug, not a
  labelling bug).

## Real examples from the pilot pass

Every example below is drawn from an article that was actually fetched and read for this pass —
see `gold-set-section-classifier.csv` / `gold-set-vector-families.csv` / `gold-set-negative-controls.csv`
for the full rows.

**Heading contradicts content (§1, the case this classifier exists to catch).** *Naked fugitive*
has an unheaded lead that is narrative data, then an "Identity" section that reads as a clean
block of scholarly speculation — headings tracked content well here. Contrast *Chronology of
Jesus*: nearly every section header (e.g. "Birth year") sounds like a settled-fact bucket, but the
paragraphs underneath interleave concrete historical anchors with active scholarly dating debate
almost sentence-by-sentence — labelled `muddled`, not `clear_split`, despite the tidy headings.

**One-sided article (`one_side_only`).** *Oral gospel traditions*: every heading is itself a
historiographic/methodological topic, so the entire article is scholarly debate and named-scholar
attribution with zero narrative "what happened" content — no data paragraphs exist to split
against.

**Balanced debate, positive case (§3 family table).** *Gospel of John* fires strongly: named
scholars disagree on authorship (traditional attribution vs. Licona/McDonald & Sanders vs. a
literary-creation theory), the 20th-century "Johannine Community" paradigm is framed as
long-standing consensus now challenged by Bauckham/Skinner, and disagreement spans both the data
layer (textual evidence) and the interpretation layer (how to read it).

**Balanced debate, red-flag case correctly NOT firing.** *Historicity of Jesus* superficially
looks like it has debate — mythicist scholars are named — but their positions are dismissed as
methodological failure rather than engaged with as a legitimate competing view; the article
explicitly situates mythicism "outside legitimate scholarly disagreement." This is the
settled-consensus-vs-marginalized-fringe pattern the balanced-debate signal should NOT reward, and
was labelled `signal_fires: false` for exactly that reason.

**Negative control catching an old-detector false positive (gnostic-over-emphasis).**
*Nag Hammadi Codex II* — title and body are saturated with "Nag Hammadi" (guaranteed old-keyword
trip), but the article is purely codicological (leaf counts, physical dimensions, scribal hand)
with zero claims about the historical Jesus. `old_detector_fired: true`, `should_fire_new: false`.

**Negative control showing honest scarcity, not padding (mythicist-framing).** Of 15 out-of-scope
candidates checked for the mythicist-framing family, only one (*Christ myth theory* itself)
contained any of the three named authors or "myth"/"mythic" in any sense at all — the labelling
agent verified this by reading all 15 rather than assuming, and reported exactly one negative
control instead of inventing more to hit a target count.

## Provenance of this pilot pass

This gold set's first pass (2026-07-28) was produced by 14 independent labelling agents working
from real Wikipedia article content (WebFetch), each scoped to either one classifier-set chunk of
10 articles or one vector family's positive pool + negative-control pool. Article *selection*
(which 40 articles, which ~20–25 per family, which negative-control candidates) was done
mechanically from `database/scoring-export.json` (the ranked-255 export, used as a substitute for
the missing `Wikipedia Articles.csv` — see `setup/Issues.md`) and `candidate-pool.tsv`; only the
qualitative *labelling* was delegated. This was an explicit scope decision (a "scaled-down real
pilot," not full coverage) made with the project owner given the scale of the full plan (300+
articles) — see the session that produced this file for the full reasoning. Extending this gold
set to the plan's fuller 20–30-per-family targets, or adding independent second-rater labels for
inter-rater agreement, is future work, not a defect in this pass.
