"""Prompts for the Wikipedia paragraph labeller (data / interpretation).

Read by llm_label_corpus.py and llm_label_validate.py, which label with DeepSeek.
jev_pilot_label.py repeats the two definitions in short form (JEV_CRITERIA), so
a change to RUBRIC needs the same change there, or the engines label different tasks.

The wording follows DATA_INTERPRETATION_TIERS.md and the human labels in
gold-set-three-tier.csv. The scorer merges data and close into one descriptive
class (scorer.compute_separation_ratio), so the labeller does not assign close.
labels-corpus.json records the prompt version it was made with
(llm_label_corpus.py), and its labels do not change when this file changes:
relabel the corpus after an edit.
"""

SYSTEM_PROMPT = """You are labelling Wikipedia paragraphs about Jesus and the New Testament.

For each paragraph, assign exactly one of these two labels:
- "data": The paragraph reports something a reader can check by opening a text or
  a record: what a primary source says, what evidence shows, a quotation, a
  retelling of a gospel narrative, which texts contain an event, how two texts
  differ, a plain statement about a text's structure, wording or style, what an
  author who wrote before AD 451 reports, or what a modern author found in a
  record or an excavation.
- "interpretation": The paragraph makes a claim about meaning or about the
  sources: theology and doctrine, what believers, scholars, commentators, later
  writers, legends or tradition hold or say, identifications, theories,
  authorship, dating, sources or genre, hedged guesses and approximate dates (most
  likely, perhaps, might, may have, c., "AD 30 or 33"), church practice, and claims of significance that quote no
  source.

If a paragraph contains any interpretation, even beside data, label it
"interpretation". Only a paragraph that contains data alone is "data".

Respond with a JSON object only: {"labels": [...]}, one label per paragraph,
in the same order as the paragraphs were provided. Do not include any
reasoning, explanation, or text outside the JSON object."""

RUBRIC = """Label each of the following paragraphs as "data" or "interpretation" using these criteria.
Ask: can a reader check the claim by opening the text or the record? If yes, it is
DATA. If it is a claim that someone makes about a text, it is INTERPRETATION.

DATA — a reader can check it:
- What a primary source says or what physical evidence shows: a fact, event,
  place, date, quotation (a bare quotation with no framing from scripture or an
  ancient source is DATA), manuscript reading, or finding. E.g. "The Pilate
  inscription was found at Caesarea Maritima in 1961."
- A retelling of what a gospel narrative says, with its sequence and
  cross-references: "Jesus adds that unless he departs the Holy Spirit will not
  arrive."
- Which gospels or sources contain an event: "The feeding of the five thousand is
  reported in all four gospels."
- Two texts side by side, or how they differ, without explaining why: "The
  Synoptics place the event near Bethsaida, while John locates it on the eastern
  shore."
- A plain statement about a text that a reader can see by opening it: a word
  count, which verses contain a phrase, its structure, wording, style or literary
  technique, where a New Testament word comes from or how it was translated: "The
  sermon is structured around six antitheses." "Mark sandwiches the cleansing of
  the temple between the two halves of the fig tree episode."
- An ancient author (writing before AD 451, the Council of Chalcedon) reported as a
  source, or quoted, even when the author explains a passage: "Cyprian wrote about
  footwashing." "Jerome describes in De Viris Illustribus that James is the same as
  James, son of Alphaeus." A quotation of Chrysostom on a parable is DATA.
- A modern author reporting a record, a count, an excavation or a find, and who
  did the work: "Socin found from an Ottoman village list that Bethlehem had 539
  houses." "Excavations resulted in the discovery of two public buildings."

INTERPRETATION — someone's claim about meaning or about the sources:
- Theological meaning, doctrine, or what a passage means for faith.
- What Christians believe or teach: "The resurrection of Jesus is the Christian
  belief that God raised Jesus from the dead."
- What scholars or commentators hold, date, assume, agree on, or dispute, a debate
  or a consensus, and a modern author's opinion or inference (argued, suggests,
  observes, notes, believes, may have): "Most scholars date Mark to around AD
  66-74." A belief or a debate beside a find report makes the paragraph
  INTERPRETATION.
- A hedged guess about a date, a meaning or a motive (most likely, perhaps,
  probably, might, could, may have), and an approximate date (c., circa, "AD 30 or
  33"): "The crucifixion occurred most likely in AD 30 or AD 33." "Paul (c. 5 - c.
  64 or 67) was a Christian apostle."
- Identifying one person or place with another; theories, hypotheses and criteria.
- A claim about who wrote a text, when, from which sources, or to which genre it
  belongs, including a hypothetical source such as Q: "The author of Matthew drew
  on a hypothetical sayings collection."
- What later writers (after AD 451), legends, tradition, art or fiction say about
  a figure or event; church practice, rites, devotions and sainthood; what people
  locally believe. A quotation of a later commentator who explains a passage
  (Bede on a miracle) is INTERPRETATION. A quotation of a modern scholar, cited by
  author and year, is INTERPRETATION. A phrase that names an interpretive
  school ("ancient Christian tradition") or judges ("unanimously recognized")
  marks interpretation even when ancient authors are named.
- A claim of significance or centrality that quotes no source: "The city is central
  to the narratives of the gospels."

If a paragraph contains any interpretation, even beside data, it is INTERPRETATION.
Only a paragraph that contains data alone is DATA.

Respond with a JSON object: {"labels": ["data", "interpretation", ...]} — exactly
one label per paragraph, in order, with no additional text or explanation."""
