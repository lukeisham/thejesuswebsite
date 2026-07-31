# The Three Tiers of Linguistic Clues in Academic Writing

This document defines the linguistic boundary between data presentation and
interpretation — the axis Signal 3 (row 3, §3.1.1 of `ALGORITHM_GUIDE_the_how.md`)
is built on. The classifier and the LLM labeller must both distinguish
paragraphs that merely *present* what primary sources say from paragraphs
that *analyse, evaluate, or draw conclusions from* those sources. Getting
this boundary right is the single most important classification task in
the pipeline.

**Domain focus:** Wikipedia articles about Jesus and the four Gospels. Primary
texts means the Bible (Gospels, OT quotations/allusions), ancient historians
(Josephus, Tacitus, Pliny, Suetonius, Mara bar Serapion, Lucian, Celsus,
Phlegon), Ante-Nicene authors (Ignatius through Cyprian), named manuscripts
(Sinaiticus, Vaticanus, P52, P66, P75, Bezae, etc.), and archaeological
reports about New-Testament-period sites.

## Determination and weighting principle

The classifier looks for a distinction between tiers 1 & 2 (descriptive) and
tier 3 (interpretive). Every Wikipedia article is about *something*; the
question is whether its content splits between describing that thing and
interpreting or contextualising it. Tier 1 is often concentrated in the lede
or opening paragraphs. Tiers 2 and 3 sometimes mix together, and articles
that mix them without a clean separation should be scored worse than
articles with a clean split — that decision is made on content, not on
whether the paragraphs or headings are tidy. Articles with no discernible
separation between tiers are the hardest case for the detector, since
getting the +10/−5/0/0 weighting right (`ALGORITHM_GUIDE_the_how.md` §9)
depends on the detection itself being accurate.

---

## 1. Data & Primary Evidence (The "What")

**Function:** Objective reporting of what a primary source *says* or what
physical evidence *shows*. The paragraph presents facts that another scholar
could verify by opening the same source — a verse reference, a manuscript
reading, an archaeological measurement, a direct quotation. No analytical
claim is advanced; the paragraph's work is citation and description.

### Linguistic Clues

| Category | Signals |
|---|---|
| **Citation formulas** | "Mark 1:15 records…", "According to Matthew…", "In Luke's account…", "Josephus states…", "Tacitus reports…", "Eusebius writes…", "As Paul argues in Romans…" |
| **Verse-level anchors** | Chapter:verse references used as sentence subjects or direct objects: "John 20:28 calls Jesus 'my Lord and my God'" |
| **Direct quotation** | Block quotes, inline quotes with attribution, quotation marks around verbatim text: "Jesus said to them, '…'" |
| **Manuscript description** | "Codex Sinaiticus reads…", "P52 contains…", "the Western text has…", "folio 14r preserves…", precise codicological/palaeographic detail |
| **Source attribution** | Simple attribution verbs (*states, writes, records, reports, notes, lists, mentions, describes*) with a named source agent |
| **Synoptic parallels (descriptive)** | "Matthew's version includes the Beatitudes (5:3-12); Luke's parallel (6:20-23) lists four blessings followed by four woes" — differences listed without explanation |
| **Archaeological reporting** | "Excavations at Capernaum uncovered a first-century basalt synagogue foundation beneath the fourth-century white limestone synagogue" |
| **Paraphrase without analysis** | Stating what a passage says in the author's own words without adding evaluation: "The parable describes a man who sows seed on four types of soil" |
| **Tense patterns** | Past tense for completed events and historical authors' actions; present tense for what the text "says" or "reads"; neutral/factive verbs |
| **Concrete detail density** | High ratio of specific nouns (personal names, place names, dates, measurements, manuscript shelfmarks) to abstract nouns |
| **Low modifier count** | Minimal adjectival/adverbial modification; facts are stated, not characterised |

### Examples (Jesus / Gospels Domain)

**Direct quotation of a biblical passage:**
> Mark 1:15 records Jesus's first public proclamation: "The time is
> fulfilled, and the kingdom of God is at hand; repent and believe in the
> gospel."

**Citation of an ancient historian (verbatim or close paraphrase):**
> Josephus (*Antiquities* 18.3.3) describes Jesus as "a wise man, if it be
> lawful to call him a man," and reports that he "drew over to him both many
> of the Jews and many of the Gentiles."

**Manuscript variant report (no adjudication):**
> Codex Bezae inserts an additional saying at Luke 6:5 — "On the same day,
> seeing a man working on the Sabbath, he said to him, 'Man, if you know what
> you are doing, you are blessed; but if you do not know, you are cursed and a
> transgressor of the law'" — which is absent from the Alexandrian text-type.

**Synoptic comparison (descriptive only — differences stated, not explained):**
> Matthew traces Jesus's genealogy through David and Abraham in three groups
> of fourteen generations (Matthew 1:1-17). Luke traces through Adam to God
> and lists seventy-seven generations (Luke 3:23-38). Matthew names four women
> in the genealogy (Tamar, Rahab, Ruth, Bathsheba); Luke names none.

**Ante-Nicene citation (reporting what a church father wrote):**
> Irenaeus (*Against Heresies* 3.1.1) states that "Matthew published his
> Gospel among the Hebrews in their own language, while Peter and Paul were
> preaching the gospel in Rome and founding the church there."

**Archaeological data point:**
> The Pilate inscription, a limestone block discovered at Caesarea Maritima in
> 1961, bears a Latin dedication reading "[…]TIVS PILATVS[…]PRAEFECTVS
> IVDA[EAE]," confirming Pilate's title as *praefectus* rather than
> *procurator*.

**Descriptive paraphrase (what the text contains, not what it means):**
> The parable describes a father with two sons. The younger son demands his
> inheritance, leaves home, squanders it, and returns destitute. The father
> runs to meet him, clothes him, and throws a feast. The older son refuses to
> join.

### What this tier is NOT

- It is NOT evaluating whether a source is reliable or authentic.
- It is NOT explaining *why* an author wrote something.
- It is NOT comparing sources to draw a conclusion (though it may list differences factually).
- It is NOT using a quotation as evidence *for* a claim the paragraph is making.

---

## 2. Internal / Close Analysis (The "How")

**Function:** Extended examination of the primary text's internal mechanics —
syntax, rhetoric, structure, vocabulary, genre, source relationships,
manuscript tradition. The paragraph stays *within* the text and its material
features; it does not yet reach outward to historical reconstruction or
theological meaning. It answers "how does this text work?" rather than "what
does this text mean?"

### Linguistic Clues

| Category | Signals |
|---|---|
| **Comparative analysis** | "whereas Matthew has…", "Luke omits Mark's…", "both accounts agree that…", "only John includes…", "the Synoptics lack this detail" |
| **Source-critical language** | "the triple tradition…", "M material…", "L material…", "the Q source…", "the Markan priority…", "the two-source hypothesis…", "minor agreements of Matthew and Luke against Mark" |
| **Form-critical categorisation** | "follows the form of a miracle story…", "exhibits the structure of a pronouncement story…", "conforms to the pattern of a healing narrative…", "the elements of a call story are present here…" |
| **Text-critical evaluation** | "the majority reading…", "attested in P75 and B…", "the harder reading is…", "a scribal harmonisation to the Matthean parallel…", "the *lectio difficilior* is…" |
| **Rhetorical / literary analysis** | "the inclusio frames…", "the chiasm centres on…", "Mark sandwiches this episode between…", "the repetition of 'immediately' (*euthys*) drives…", "the narrative slows at…" |
| **Greek / Hebrew / Aramaic analysis** | "the aorist ἐβαπτίσθη indicates punctiliar action…", "the Hebrew imperfect conveys ongoing…", "the Aramaic *talitha koum* is translated for Mark's Greek audience as…", "*logos* carries the double sense of…" |
| **Structural observation** | "the pericope divides into three movements…", "the parable follows an A-B-A' ring structure…", "the discourse is framed by…", "the narrative hinge occurs at verse 28 where…" |
| **Tense patterns** | Literary present tense dominant ("Mark constructs…", "the verb shifts from imperfect to aorist…"); present tense used for text-internal features |
| **Confidence register** | High confidence for observable features ("the text clearly places…", "the structure reveals…"); lower hedging than Tier 3 |

### Examples (Jesus / Gospels Domain)

**Synoptic literary analysis (structure, not meaning):**
> Mark sandwiches the cleansing of the temple (11:15-19) between the two
> halves of the fig tree episode (11:12-14 and 11:20-25). This Markan
> intercalation links the two episodes structurally — the fig tree's withering
> frames the temple action — so that the reader interprets one through the
> other.

**Greek vocabulary analysis:**
> The phrase "kingdom of God" (βασιλεία τοῦ θεοῦ) appears fourteen times in
> Mark but is consistently replaced with "kingdom of heaven" (βασιλεία τῶν
> οὐρανῶν) in Matthew's parallel passages, with only four exceptions (Matthew
> 12:28; 19:24; 21:31; 21:43). This pattern reflects Matthew's characteristic
> Jewish reverential circumlocution for the divine name.

**Text-critical evaluation of a variant:**
> The longer ending of Mark (16:9-20) is absent from Codex Sinaiticus (א) and
> Codex Vaticanus (B), the two earliest complete manuscripts of Mark. It
> appears in a shorter, independent form in one Old Latin manuscript (Codex
> Bobbiensis, *k*). The vocabulary of verses 9-20 is markedly non-Markan:
> eighteen words appear nowhere else in Mark's Gospel, and the transition from
> verse 8 to verse 9 is grammatically awkward — the subject of the sentence
> shifts from the women to Jesus without a connecting particle.

**Source-critical observation (structural, not interpretive):**
> Of the 661 verses in Mark, approximately 600 appear in Matthew, and roughly
> 350 in Luke. The material shared by Matthew and Luke but absent from Mark —
> approximately 235 verses, predominantly sayings — constitutes the
> hypothetical Q source. Matthew's unique material (M) includes the visit of
> the Magi (2:1-12) and the parable of the unforgiving servant (18:23-35);
> Luke's unique material (L) includes the parables of the Good Samaritan
> (10:25-37) and the Prodigal Son (15:11-32).

**Form-critical analysis of genre:**
> The healing of the paralytic lowered through the roof (Mark 2:1-12) embeds a
> controversy dialogue (verses 6-10) within a miracle story frame (verses
> 1-5, 11-12). The pronouncement "the Son of Man has authority on earth to
> forgive sins" (verse 10) functions as the climactic saying typical of the
> pronouncement-story form identified by Bultmann.

**Narrative-critical observation of characterisation:**
> In Mark's Gospel, the disciples consistently fail to understand Jesus's
> identity and mission. Mark uses the verb ἀκολουθέω ("to follow") for the
> disciples in the early chapters (1:18; 2:14-15), but after Peter's
> confession at Caesarea Philippi (8:29), the disciples shift from following
> to misunderstanding (8:32-33; 9:32; 10:35-37), culminating in their flight
> at the arrest (14:50).

### What this tier is NOT

- It is NOT asking what the passage meant to its original audience (that's Tier 3).
- It is NOT drawing theological conclusions (that's Tier 3).
- It is NOT connecting to external historical data outside the text.
- It is NOT arguing for or against the authenticity of a saying (that's Tier 3).
- It IS sometimes a close call with Tier 3 — the key test is: does the paragraph
  reach beyond the observable features of the text itself? If it stays within the
  text's language and structure, it's Tier 2.

---

## 3. Interpretation & Contextualization (The "Why" & "So What?")

**Function:** Applying specific methodologies (historical criticism, social-
scientific models, redaction criticism, literary theory, theological hermeneutics)
to infer authorial intent, historical reality behind the text, theological
meaning, community context, or theoretical conclusions. The paragraph *uses*
primary texts as evidence for a claim that cannot be verified simply by opening
the source. It answers "what does this mean?" and "why does it matter?"

### Linguistic Clues

| Category | Signals |
|---|---|
| **Historical Jesus reconstruction** | "the historical Jesus likely…", "the criterion of embarrassment suggests…", "authentic Jesus tradition…", "the criterion of multiple attestation supports…", "it is improbable the early church would have invented…", "Jesus probably spoke of…" |
| **Redaction-critical conclusions** | "Matthew's addition of… reflects his community's concern with…", "Luke alters Mark's portrait of the disciples in order to…", "by relocating this saying to the Sermon on the Mount, Matthew presents Jesus as…" |
| **Theological interpretation** | "this passage teaches…", "the theological significance of…", "Christologically, the passage asserts…", "the eschatological dimension of…", "the soteriological implication is…" |
| **Methodological framing** | "applying a postcolonial reading of…", "through a feminist hermeneutical lens…", "using social-scientific models of honour and shame…", "employing reader-response criticism…", "drawing on memory theory…" |
| **Epistemic hedging** | *probably, may reflect, could suggest, it is plausible that, appears to indicate, seems to imply, might be, is best understood as, likely represents* — high density of these signals is the single strongest Tier-3 indicator |
| **Modal verbs** | *would have, could have, might have, must have* — reconstructing counterfactuals or inferring unobservable states |
| **Abstract / theoretical vocabulary** | *agency, social stratification, honour-shame dynamics, covenant theology, realised eschatology, high Christology, proto-orthodox, community formation, identity construction, power relations* |
| **Scholarly attribution + stance** | "Ehrman argues…", "Wright contends…", "Meier concludes…", "Sanders demonstrates…", "Dunn has shown…" — naming a scholar AND characterising their contribution as persuasive |
| **Macro-connectives** | *thus, therefore, consequently, it follows that, this implies that, the implication is, this suggests that* — drawing a conclusion from preceding data or analysis |
| **Historical-context claims** | "this reflects Second Temple Jewish expectations of…", "Hellenistic influence on the community explains…", "the post-70 CE context accounts for…", "within first-century Galilean agrarian society…" |
| **Authenticity judgments** | "the saying is likely authentic because…", "this passage appears to be a later community creation…", "the *ipsissima vox* of Jesus is preserved here…", "the evangelist has shaped this tradition to address…" |
| **Debate positioning** | "the consensus view holds…", "a minority of scholars contend…", "the traditional attribution has been challenged by…", "recent scholarship has overturned…", "the debate turns on whether…" |

### Examples (Jesus / Gospels Domain)

**Redaction-critical conclusion:**
> Matthew's addition of the flight to Egypt (2:13-15) and his quotation of
> Hosea 11:1 ("Out of Egypt I have called my son") constructs a Moses-typology
> that presents Jesus as the new and greater Moses. This reflects Matthew's
> broader program of portraying Jesus as the fulfilment and surpassing of
> Israel's foundational figures, likely addressed to a community in debate
> with formative Judaism about the true heir of Israel's scriptures.

**Historical Jesus reconstruction using criteria of authenticity:**
> Applying the criterion of multiple attestation, Jesus's use of *Abba* as an
> address to God appears in Mark (14:36), the Q tradition (Matthew 6:9 //
> Luke 11:2), and independent Pauline material (Romans 8:15; Galatians 4:6).
> The term's appearance across three independent strands of tradition, combined
> with the criterion of dissimilarity — *Abba* as an intimate familial address
> is atypical of both first-century Jewish prayer convention and early
> Christian liturgical practice — suggests this mode of address originates
> with the historical Jesus rather than the post-Easter community.

**Theological interpretation:**
> The christological title "Son of Man" (ὁ υἱὸς τοῦ ἀνθρώπου) functions on
> three levels in Mark's Gospel: it appears in sayings about Jesus's earthly
> authority (2:10, 2:28), his suffering and death (8:31; 9:31; 10:33-34), and
> his future eschatological glory (8:38; 13:26; 14:62). Mark thus holds
> together a paradox — the Son of Man who suffers is also the Son of Man who
> will come in glory — suggesting that for Mark, Jesus's authority is
> expressed precisely through his suffering rather than despite it.

**Social-scientific interpretation:**
> When the prodigal son demands his inheritance while his father is still
> living (Luke 15:12), he is, within the honour-shame framework of
> first-century Mediterranean society, effectively wishing his father dead.
> The father's response — running to meet the son (15:20) — is equally
> shocking: an elderly Middle Eastern patriarch would not run; running
> requires lifting one's robes and exposing the legs, a shameful act. Luke
> constructs this double breach of social convention to emphasise the
> radical, honour-relinquishing nature of divine forgiveness.

**Scholarly debate reporting (interpretive, not neutral):**
> E.P. Sanders' concept of "covenantal nomism" — that first-century Judaism
> understood Torah observance not as a means of *entering* the covenant but of
> *staying within* a covenant already established by God's grace — has
> reshaped the debate about Jesus's conflicts with the Pharisees. The "New
> Perspective on Paul" (Dunn, Wright) extends this insight by arguing that
> Paul's polemic against "works of the law" targets Jewish ethnic boundary
> markers (circumcision, food laws, calendar observance) rather than a
> supposed legalistic works-righteousness. This has required a corresponding
> re-reading of Jesus's Sabbath and purity controversies as intra-Jewish
> disputes about covenant identity rather than a rejection of Torah itself.

**Connecting text to historical context:**
> Jesus's cleansing of the temple (Mark 11:15-17) is best understood against
> the backdrop of the temple's economic role in first-century Jerusalem.
> Following Herod the Great's massive expansion of the temple complex
> (begun ~20 BCE), the institution functioned not only as a religious centre
> but as Jerusalem's primary economic engine — the site of pilgrimage,
> currency exchange (Tyrian shekels for the temple tax), animal commerce, and
> a treasury that held private deposits. Jesus's action and his quotation of
> Isaiah 56:7 and Jeremiah 7:11 would have been perceived as a symbolic
> prophetic critique of the entire temple economy, not merely an objection to
> commercial activity in a sacred space.

### What this tier is NOT

- It is NOT simply reporting that a scholar holds a view — it is advancing,
  evaluating, or synthesising that view into a claim.
- It is NOT listing differences between sources — it is explaining *why* those
  differences matter.

---

## Boundary Cases: Common Grey Zones

Real paragraphs frequently mix tiers. The following heuristics help assign the
dominant tier when signals are ambiguous.

### 1. "According to [source], [claim]"

| Construction | Tier | Why |
|---|---|---|
| "According to Mark 1:15, Jesus proclaimed the kingdom." | **1** | Reports what the text says; no analysis |
| "According to Schweitzer, Jesus proclaimed an imminent apocalyptic kingdom." | **3** | Cites a scholar to advance a specific interpretive claim |
| "According to Matthew 5:17, Jesus came not to abolish the law but to fulfil it — a statement that Matthew's community likely deployed against Pauline-influenced critics." | **3** | The first clause is Tier-1 citation; the second clause is Tier-3 redactional inference. The paragraph's *work* is interpretive, so it's Tier 3 |

**Heuristic:** if the paragraph uses the source as a launchpad for a claim the source
itself doesn't make, it's Tier 3.

### 2. Synoptic comparison: data or interpretation?

| Paragraph shape | Tier | Why |
|---|---|---|
| "Matthew has 'kingdom of heaven'; Mark has 'kingdom of God.'" | **1** | Pure difference listing |
| "Matthew has 'kingdom of heaven'; Mark has 'kingdom of God.' Matthew substitutes 'heaven' for 'God' as a Jewish reverential circumlocution." | **3** | The second sentence explains the difference |
| "Matthew has 'kingdom of heaven' (32×) while Mark uses 'kingdom of God' (14×). Matthew retains 'kingdom of God' in only four passages (12:28; 19:24; 21:31; 21:43). The consistent substitution pattern is a well-established feature of Matthew's redaction." | **2** | Counts, patterns, and the claim "well-established feature" are close analysis without reaching for theological meaning or community context |

**Heuristic:** if the paragraph stays at the level of *what* the texts say and *how*
they relate structurally, it's Tier 1 or 2. The moment it explains *why* the
difference exists in terms of authorial intent, community context, or theological
program, it's Tier 3.

### 3. Paraphrasing a gospel narrative or parable

| Paragraph shape | Tier | Why |
|---|---|---|
| "The parable of the Good Samaritan (Luke 10:30-35) describes a man beaten by robbers. A priest and a Levite pass by; a Samaritan stops, bandages his wounds, and pays for his care." | **1** | Pure descriptive paraphrase |
| "The parable's structure places the priest and Levite in parallel — both 'see' and 'pass by on the other side' (10:31-32) — before the Samaritan's series of seven compassionate actions (10:33-35) breaks the pattern emphatically." | **2** | Close structural analysis; no claim about meaning |
| "Luke places this parable immediately after a lawyer's question about inheriting eternal life (10:25), forcing the reader to reinterpret 'neighbour' not as a fellow Israelite but as the ethnic outsider — a Lukan theme that culminates in the mission to the Gentiles in Acts." | **3** | Uses the structure to make a claim about Luke's theological program |

### 4. Reporting scholarly views

| Paragraph shape | Tier | Why |
|---|---|---|
| "Scholars are divided on the dating of Mark's Gospel, with proposals ranging from the mid-50s to the early 70s CE." | **1** | Reports the state of the field; no argument advanced |
| "The majority of scholars date Mark to shortly before or after 70 CE, citing the Olivet Discourse's apparent allusion to the temple's destruction (Mark 13:2, 14)." | **2** | Reports a scholarly consensus AND the evidence cited for it — still not arguing for/against |
| "Mark's Gospel is best dated to shortly after 70 CE. The specificity of Mark 13:14's 'abomination of desolation' and the Gospel's concern with suffering and persecution fit a post-war context in which the temple's destruction required theological explanation." | **3** | Takes a position and argues for it using evidence |

**Heuristic:** reporting *that* scholars hold a view (or what evidence they cite) is
Tier 1 or 2. Arguing *for* or *against* a view is Tier 3. The presence of "best,"
"most likely," "probably," or "persuasively" attached to a scholarly claim signals
Tier 3.

### 5. Presenting archaeological evidence

| Paragraph shape | Tier | Why |
|---|---|---|
| "Excavations at Capernaum uncovered a first-century basalt synagogue foundation." | **1** | Reports a finding |
| "The Capernaum synagogue's first-century basalt foundation underlies the fourth-century limestone structure, indicating continuous sacred use of the site across at least three centuries." | **2** | Observes a structural/chronological relationship within the data |
| "The existence of a first-century synagogue at Capernaum corroborates the Gospel accounts of Jesus teaching in Galilean synagogues (Mark 1:21; Luke 4:31), suggesting the evangelists' portrayal of Jesus's Galilean ministry has a plausible archaeological foundation." | **3** | Uses the data to support a claim about historical reliability of the Gospels |

---

## Summary: The Quick Test

For any paragraph, ask three questions in order:

1. **Does the paragraph make a claim that cannot be verified by opening the cited source?**
   - No → Tier 1 (Data)
   - Yes → continue to question 2

2. **Does the paragraph's claim stay within the observable features of the text itself (structure, language, genre, source relationships, textual tradition)?**
   - Yes → Tier 2 (Close Analysis)
   - No → continue to question 3

3. **Does the paragraph reach outward to historical reconstruction, theological meaning, community context, or methodological/theoretical conclusions?**
   - Yes → Tier 3 (Interpretation)
