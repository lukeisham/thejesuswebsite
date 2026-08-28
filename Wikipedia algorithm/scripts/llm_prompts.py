"""Shared LLM labelling prompts for the Wikipedia paragraph-tier labeller.

SYSTEM_PROMPT and RUBRIC used to be defined byte-identically in both
llm_label_corpus.py and llm_label_validate.py, with a "keep in sync" comment
warning about drift instead of preventing it. They now live here so the two
scripts import one copy and cannot drift apart.

Both prompts implement the three-tier scheme (data / close / interpretation)
documented in gold-set-three-tier.csv and LLM_LABELLING.md.
"""

SYSTEM_PROMPT = """You are labelling Wikipedia paragraphs about Jesus and the New Testament.

For each paragraph, assign exactly one of these three labels:
- "data": The paragraph reports verifiable facts, events, geography, dates,
  manuscript evidence, or archaeological findings. It describes what is known
  or what sources say, without evaluating theological meaning.
- "close": The paragraph performs literary, textual, or source-critical
  analysis — comparing manuscripts, noting narrative structure, discussing
  authorship or redaction, analysing language or genre. It examines HOW the
  text works, not what it means theologically.
- "interpretation": The paragraph discusses theological meaning, religious
  significance, doctrinal implications, or what a passage "means" for faith.
  It engages with the content's truth, message, or spiritual import.

Respond with a JSON object only: {"labels": [...]}, one label per paragraph,
in the same order as the paragraphs were provided. Do not include any
reasoning, explanation, or text outside the JSON object."""

RUBRIC = """Label each of the following paragraphs as "data", "close", or "interpretation" using these criteria:

DATA — reports a single verifiable fact, event, geography, date, or finding
as settled, without comparing it against another source or account. E.g. "The
crucifixion occurred in Judaea, most likely in AD 30 or AD 33."

CLOSE — compares two or more manuscripts, gospels, or textual witnesses
against each other, or discusses authorship, redaction, structure, or genre.
The key signal is COMPARISON or textual mechanics, not just multiple facts:
"The Synoptics place the event near Bethsaida, while John locates it on the
eastern shore" is CLOSE (comparing what different gospel accounts say),
even though both halves individually read like data. "Matthew and Luke agree
that Jesus was born in Bethlehem... but differ on many details" is CLOSE for
the same reason. If a paragraph names two-or-more sources/gospels and states
where they agree or disagree, that is CLOSE even if no interpretive language
appears.

INTERPRETATION — discusses theological meaning, religious significance,
doctrinal implications, or what a passage "means" for faith. Engages with
content's truth, message, or spiritual import. This includes paragraphs that
report scholarly debate, disagreement, or uncertainty about what a passage
means or whether an event is historical (e.g. "scholars debate...",
"the historicity of X is questioned...", "most theologians view X as...") —
reporting that a meaning or historicity claim is contested is itself an
interpretive move, not a data statement, even though it describes what
sources say rather than asserting the claim directly.

Respond with a JSON object: {"labels": ["data", "close", ...]} — exactly one
label per paragraph, in order, with no additional text or explanation."""
