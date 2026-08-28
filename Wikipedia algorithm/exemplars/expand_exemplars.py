#!/usr/bin/env python3
"""Generate additional literary-analysis exemplars and append to existing JSONL files."""

import json
from pathlib import Path

BASE = Path(__file__).resolve().parent

# ──────────────────────────────────────────────
# POSITIVE EXEMPLARS (literary analysis)
# ──────────────────────────────────────────────
positive_exemplars = [
    # ── 1. Chiastic / Ring Structure Analysis (6 entries) ──
    {
        "id": "lit-pos-019",
        "text": "The vine and branches discourse in John 15:1–17 is structured as an extended chiasm centred on the command to abide in Christ. The outer frame (vv. 1–2, 16–17) addresses fruit-bearing and divine election; the middle ring (vv. 3–6, 9–15) contrasts abiding and withering; and the central pivot (vv. 7–8) promises answered prayer and glorification of the Father. This concentric architecture underscores the mutual indwelling as the discourse's theological core."
    },
    {
        "id": "lit-pos-020",
        "text": "The cleansing of the Temple in Mark 11:15–19 is framed by the cursing of the fig tree (11:12–14) and its withering (11:20–25), forming an A-B-A' intercalation. This ring structure compels the reader to interpret the Temple action through the lens of the fig tree's judgement, suggesting that the Temple, like the barren tree, has failed to produce the fruit expected of it. The literary technique transforms two episodes into a single theological statement."
    },
    {
        "id": "lit-pos-021",
        "text": "Scholars have identified a large-scale chiastic structure spanning the entirety of Mark's Gospel. The confession at Caesarea Philippi (8:27–30) sits at the structural centre, flanked symmetrically by two healings of blind men (8:22–26 and 10:46–52). This arrangement implies that recognising Jesus's identity is the Gospel's central concern, and that spiritual sight is the interpretive key to the entire narrative."
    },
    {
        "id": "lit-pos-022",
        "text": "The Lord's Prayer in Matthew 6:9–13 exhibits a concentric design: the opening address to the Father and closing doxology frame three petitions concerning God's honour and three concerning human need. The central petition for daily bread forms the hinge, linking the heavenly and earthly spheres. This careful symmetry suggests liturgical shaping and invites the praying community to locate itself at the intersection of divine sovereignty and human dependence."
    },
    {
        "id": "lit-pos-023",
        "text": "The Apocalypse of John is organised around a series of septets — seven churches, seven seals, seven trumpets, seven bowls — that themselves exhibit chiastic patterning. The seventh seal opens into the seven trumpets, and the seventh trumpet into the seven bowls, creating a telescoping structure. This recursive design generates an intensifying momentum that mirrors the escalating judgement portrayed in the visions, drawing the reader deeper into the prophetic narrative."
    },
    {
        "id": "lit-pos-024",
        "text": "The parable of the Workers in the Vineyard (Matthew 20:1–16) is framed by the identical maxim 'the last will be first, and the first last' (19:30 and 20:16), forming an inclusio that governs the parable's interpretation. The ring composition signals that the intervening narrative about equal wages is not primarily about economic justice but about the reversal of conventional hierarchies in the kingdom, a theme the framing device encodes at the structural level."
    },

    # ── 2. Narrative Criticism (6 entries) ──
    {
        "id": "lit-pos-025",
        "text": "From a narrative-critical perspective, the implied reader of John's Gospel is positioned to know more than the characters within the story. When Nicodemus misunderstands Jesus's statement about being 'born again' (John 3:4), the reader, who has already encountered the prologue's theological vocabulary, recognises the double entendre between anōthen as 'again' and 'from above.' This dramatic irony invites the reader into a privileged hermeneutical position."
    },
    {
        "id": "lit-pos-026",
        "text": "The narrator of Luke's Gospel employs internal focalisation at critical moments to grant access to characters' interior states. Mary 'treasured all these things in her heart' (Luke 2:19, 2:51) provides a rare glimpse into her subjectivity, while the rich ruler's sadness (18:23) exposes the emotional cost of discipleship refused. These focalisation shifts create readerly empathy and signal moments of heightened theological significance."
    },
    {
        "id": "lit-pos-027",
        "text": "Mark's narrator deploys prolepsis — flash-forwards that anticipate future events — to generate narrative tension. Jesus's prediction that the Temple will be destroyed (13:2) hangs over the subsequent trial narrative, where the charge about destroying the Temple reappears (14:58). The reader, armed with the earlier prediction, perceives the irony in the false witnesses' testimony and recognises the theological truth concealed within the misrepresentation."
    },
    {
        "id": "lit-pos-028",
        "text": "The temporal ellipsis between Jesus's adolescence in Luke 2 and his public ministry in Luke 3 — roughly eighteen narrative years compressed into a single verse (2:52) — creates what narratologists call a gap. This silence invites the reader to supply coherence, and the summary statement that Jesus 'increased in wisdom' provides the only hermeneutical clue. The gap functions to foreground the theological significance of the baptismal inauguration that follows."
    },
    {
        "id": "lit-pos-029",
        "text": "The passion narrative in John differs markedly from the Synoptic accounts in its characterisation of Jesus. The Johannine Jesus actively orchestrates events — stepping forward to identify himself (18:4), commanding the soldiers to release the disciples (18:8), and declaring 'It is finished' (19:30) as a sovereign pronouncement. This narrative technique constructs a Christology of control and accomplishment absent from the Markan portrait of abandonment."
    },
    {
        "id": "lit-pos-030",
        "text": "The narrator of Acts employs the first-person plural in the so-called 'we' passages (16:10–17; 20:5–15; 21:1–18; 27:1–28:16), creating the impression of an eyewitness presence. Whether this represents genuine authorial participation or a literary convention of ancient sea-voyage narratives remains debated, but the effect is to enhance the narrative's verisimilitude and to draw the reader into closer identification with Paul's missionary enterprise."
    },

    # ── 3. Rhetorical / Discourse Analysis (6 entries) ──
    {
        "id": "lit-pos-031",
        "text": "Jesus's rhetorical questions in the Fourth Gospel function not as requests for information but as pedagogical provocations designed to expose misunderstanding and invite deeper reflection. When he asks Philip, 'Have I been with you so long, and you still do not know me?' (John 14:9), the question operates simultaneously as rebuke, revelation, and invitation — a multi-layered speech act characteristic of Johannine discourse strategy."
    },
    {
        "id": "lit-pos-032",
        "text": "The Sermon on the Mount employs the rhetorical device of antithesis with the repeated formula 'You have heard that it was said ... but I say to you' (Matthew 5:21–48). Each antithesis intensifies rather than abolishes the Torah commandment, moving from external act to internal disposition. The cumulative rhetorical effect is to position Jesus not merely as an interpreter of Moses but as a sovereign legislator who speaks with authority surpassing that of Sinai."
    },
    {
        "id": "lit-pos-033",
        "text": "The 'I am' sayings in John's Gospel, each followed by a predicate metaphor ('the bread of life,' 'the light of the world,' 'the good shepherd'), function as a distinct discourse pattern. These self-identifications echo the divine name revealed in Exodus 3:14 and are embedded within extended dialogues that develop the metaphor through misunderstanding, clarification, and polemic. The pattern itself constitutes a recognisable Johannine rhetorical genre."
    },
    {
        "id": "lit-pos-034",
        "text": "Paul's argument in Galatians 3–4 progresses through a series of rhetorical questions, allegorical interpretation, and personal appeal, following the conventions of Greco-Roman forensic oratory. The shift from third-person theological argument (3:1–29) to second-person direct address (4:8–20) marks the transition from probatio to peroratio, as Paul moves from establishing his case to demanding a verdict from the Galatian congregations."
    },
    {
        "id": "lit-pos-035",
        "text": "The repetition of the Hebrew term hineni ('here I am') at three critical junctures in the Binding of Isaac narrative (Genesis 22:1, 7, 11) functions as a discourse marker that tracks Abraham's evolving posture before God. The first is readiness, the second is filial anguish, and the third is obedient relief. The identical word, inflected by its narrative context, carries dramatically different pragmatic force at each occurrence."
    },
    {
        "id": "lit-pos-036",
        "text": "The diatribe in Romans 2:1–5 addresses an imaginary interlocutor with the accusatory 'O man, every one of you who judges,' employing the rhetorical technique of apostrophe. By suddenly turning from the depraved Gentiles of chapter 1 to a self-righteous Jewish dialogue partner, Paul springs a rhetorical trap: the reader who has been nodding in agreement at the catalogue of Gentile vices suddenly finds himself condemned by the same standard."
    },

    # ── 4. Intertextuality and Allusion (6 entries) ──
    {
        "id": "lit-pos-037",
        "text": "The Johannine prologue deliberately echoes the opening of Genesis, employing the identical phrase en archē ('in the beginning'), yet transforms the Genesis creation account by identifying the pre-existent Logos as the agent through whom all things came into being. Carson observes that this intertextual gesture positions Jesus within the same creative framework as the God of Israel while simultaneously claiming for him a role that Genesis reserves for God alone."
    },
    {
        "id": "lit-pos-038",
        "text": "Matthew's formula quotations — introduced by 'this took place to fulfil what was spoken by the prophet' — function as an intertextual system that maps the events of Jesus's life onto the narrative grid of Israel's scriptures. The quotation from Hosea 11:1, 'Out of Egypt I called my son,' originally referred to Israel's exodus, but Matthew's hermeneutical move recasts Jesus as the embodiment of Israel, recapitulating the nation's history in his own person."
    },
    {
        "id": "lit-pos-039",
        "text": "The cry of dereliction from the cross, 'My God, my God, why have you forsaken me?' (Mark 15:34), is a direct citation of Psalm 22:1. The intertextual resonance extends beyond the opening verse: the psalm moves from lament to vindication, and the Markan reader who knows the psalm's full arc perceives that the cry of abandonment is not the final word but the beginning of a trajectory toward deliverance."
    },
    {
        "id": "lit-pos-040",
        "text": "Paul's Christ-hymn in Philippians 2:6–11 alludes to the figure of Adam from Genesis 1–3 and the Suffering Servant of Isaiah 53. Unlike Adam, who grasped at equality with God, Christ 'did not count equality with God a thing to be grasped' but emptied himself. This intertextual contrast establishes Christ as the anti-type who reverses the primordial human rebellion through his obedient self-emptying."
    },
    {
        "id": "lit-pos-041",
        "text": "The Beatitudes in Matthew 5 draw extensively on Isaiah 61, which announced good news to the poor and liberty to captives. The Matthean Jesus appropriates the prophetic voice, and the third-person declarations of the Isaianic herald become first-person pronouncements of blessing. This intertextual strategy positions Jesus not as a commentator on Isaiah but as the one who actualises and fulfils the prophetic promise."
    },
    {
        "id": "lit-pos-042",
        "text": "The description of the new Jerusalem descending from heaven in Revelation 21–22 alludes to the paradise imagery of Genesis 2 and Ezekiel 47, with the river of the water of life and the tree of life bearing twelve kinds of fruit. Richard Bauckham argues that these intertextual echoes construct an eschatological hermeneutic in which the end recapitulates the beginning, but in a mode of fulfilment that exceeds the original creation."
    },

    # ── 5. Genre / Form Analysis (6 entries) ──
    {
        "id": "lit-pos-043",
        "text": "The temptation narrative in Matthew 4:1–11 follows the conventions of the ancient disputation genre, wherein a protagonist engages in a verbal contest with an adversary through a series of scriptural citations and counter-citations. Each round conforms to a consistent pattern: the tempter issues a challenge supported by scripture, and Jesus responds with a counter-text from Deuteronomy, progressively asserting his hermeneutical mastery."
    },
    {
        "id": "lit-pos-044",
        "text": "The pronouncement story in Mark 12:13–17, concerning tribute to Caesar, exhibits the classic form-critical elements: a hostile question designed to entrap (vv. 13–14), Jesus's penetrating counter-response that exposes the questioners' motives (v. 15), and a climactic pronouncement that transcends the terms of the original question (v. 17). The form serves to establish Jesus's authority precisely at the point where his opponents seek to undermine it."
    },
    {
        "id": "lit-pos-045",
        "text": "The farewell discourse in John 13–17 draws on the conventions of Jewish testamentary literature, a genre exemplified by the Testaments of the Twelve Patriarchs. The gathering of successors, the prediction of the speaker's departure, ethical exhortation, and promises of future divine presence are all features that align the Johannine discourse with this established literary tradition, lending Jesus's words the weight of a dying patriarch's final testament."
    },
    {
        "id": "lit-pos-046",
        "text": "The parable of the Sower (Mark 4:1–9) belongs to the genre of agricultural mashal, employing the familiar Palestinian scene of a farmer broadcasting seed to make a theological point about the reception of the word. The narrative economy — a single action, four outcomes, no character development — is characteristic of the parabolic form, which achieves its rhetorical force through compression and the element of surprise in the extravagant final yield."
    },
    {
        "id": "lit-pos-047",
        "text": "The book of Revelation combines three distinct literary genres: apocalyptic, prophetic, and epistolary. The opening address identifies the work as an apokalypsis (1:1), a prophēteia (1:3), and a letter to seven churches (1:4). This generic hybridity is not incidental but strategic: the epistolary frame grounds the visions in specific historical communities, while the apocalyptic-prophetic content orients those communities toward eschatological hope."
    },
    {
        "id": "lit-pos-048",
        "text": "The miracle at Cana (John 2:1–11) has been analysed as an epiphany story that follows a pattern of need, dialogue expressing hesitation, miraculous provision, and recognition. Unlike the healing miracles in the Synoptics, however, the Johannine miracle concludes not with acclamation but with a narrative comment about the manifestation of Jesus's glory and the disciples' belief, signalling that the sign (sēmeion) functions to reveal divine identity rather than merely to elicit wonder."
    },

    # ── 6. Comparative Literary Analysis (6 entries) ──
    {
        "id": "lit-pos-049",
        "text": "Unlike the Synoptic Gospels, which place the cleansing of the Temple during the final week of Jesus's ministry, John positions it at the very beginning (John 2:13–22). This structural relocation transforms the episode from a precipitating cause of Jesus's arrest into a programmatic statement that frames the entire ministry. The Johannine arrangement signals that the replacement of the Temple by Christ's body is not a consequence of his rejection but the theological premise of his mission."
    },
    {
        "id": "lit-pos-050",
        "text": "Matthew's version of the healing of the centurion's servant (Matthew 8:5–13) expands Mark's bare account by inserting the saying about many coming from east and west to sit at table with the patriarchs (8:11–12). This redactional addition transforms a local healing story into a programmatic declaration of Gentile inclusion and Jewish exclusion, a theological emphasis characteristic of Matthew's narrative interests."
    },
    {
        "id": "lit-pos-051",
        "text": "Luke relocates Jesus's visit to Nazareth from its Markan position in the middle of the Galilean ministry (Mark 6:1–6) to the programmatic beginning of the public mission (Luke 4:16–30), and substantially expands it with the Isaiah citation and the Elijah-Elisha examples. This narrative repositioning makes the Nazareth sermon the hermeneutical key to the entire Gospel, establishing the themes of prophetic rejection, Gentile mission, and social reversal from the outset."
    },
    {
        "id": "lit-pos-052",
        "text": "The centurion's confession at the foot of the cross — 'Truly this man was the Son of God' (Mark 15:39) — gains its full literary force only when compared with its Synoptic parallels. Matthew adds cosmic signs (27:51–53), while Luke changes the centurion's words to 'Certainly this man was innocent' (23:47), replacing Mark's Christological climax with a juridical declaration. Each redactional decision reflects the evangelist's distinctive theological programme."
    },
    {
        "id": "lit-pos-053",
        "text": "The three versions of the call of the first disciples (Mark 1:16–20, Matthew 4:18–22, Luke 5:1–11) exhibit progressive expansion. Mark's terse summons — 'Follow me, and I will make you become fishers of men' — becomes in Luke an elaborate narrative involving a miraculous catch of fish and Peter's confession of sinfulness. Luke's expansion transforms an authoritative call into a theophanic encounter, heightening the Christological significance of the episode."
    },
    {
        "id": "lit-pos-054",
        "text": "Comparing the two accounts of the death of Judas — Matthew 27:3–10, where he hangs himself, and Acts 1:18–19, where he falls headlong and bursts open — reveals a literary divergence that resists harmonisation. Matthew frames the death as suicide motivated by remorse, incorporating the purchased field into a fulfilment citation from Zechariah, while Acts presents it as divine retribution, a sudden and grotesque judgement. The contrasting presentations serve the distinct narrative goals of each work."
    },

    # ── 7. Structural / Compositional Analysis (6 entries) ──
    {
        "id": "lit-pos-055",
        "text": "The Gospel of Matthew is structured around five major discourses — the Sermon on the Mount (5–7), the Missionary Discourse (10), the Parables Discourse (13), the Community Discourse (18), and the Eschatological Discourse (24–25) — each framed by narrative sections and concluded with the formula 'when Jesus had finished these sayings.' B.W. Bacon proposed that this five-book structure deliberately evokes the Pentateuch, presenting Jesus as the new Moses."
    },
    {
        "id": "lit-pos-056",
        "text": "The parable of the Ten Minas (Luke 19:11–27) is structured in three distinct scenes: the nobleman's departure and commissioning of servants (vv. 12–14), the servants' accounting upon his return (vv. 15–26), and the judgement on the rebellious citizens (v. 27). The tripartite structure corresponds to Luke's overarching eschatological framework of departure, interim responsibility, and final reckoning."
    },
    {
        "id": "lit-pos-057",
        "text": "The book of Acts is organised around a geographical programme announced in the risen Christ's commission: 'you will be my witnesses in Jerusalem, and in all Judea and Samaria, and to the end of the earth' (1:8). The narrative unfolds in three corresponding movements — the Jerusalem church (chs. 1–7), the Judean and Samaritan mission (chs. 8–12), and the Pauline mission to the Gentiles (chs. 13–28) — each culminating in a summary statement of church growth."
    },
    {
        "id": "lit-pos-058",
        "text": "The alternating pattern of narrative and discourse that structures the Gospel of Matthew creates a rhythmic literary experience. Each narrative block provides the context — healings, controversies, travels — that the subsequent discourse interprets. This architecture ensures that the reader oscillates between action and reflection, between the particularity of Jesus's deeds and the universality of his teaching."
    },
    {
        "id": "lit-pos-059",
        "text": "The passion narrative in all four Gospels follows a broadly identical sequence — arrest, Jewish hearing, Roman trial, crucifixion, burial — yet each evangelist arranges the material to foreground distinct theological concerns. Mark's account is structured around the progressive isolation and abandonment of Jesus, while Luke organises his material to present Jesus as the innocent righteous sufferer who extends forgiveness and compassion even from the cross."
    },
    {
        "id": "lit-pos-060",
        "text": "The narrative of the raising of Lazarus (John 11:1–44) is built around a sequence of seven dialogues — with the disciples, with Martha, with Mary, with the mourners, and Jesus's three prayers to the Father. This dialogical architecture structures the episode not as a straightforward miracle story but as a progressive revelation of Jesus's identity, with each conversation deepening the Christological disclosure that culminates in the declaration 'I am the resurrection and the life.'"
    },

    # ── 8. Reader-Response / Rhetorical Effect (6 entries) ──
    {
        "id": "lit-pos-061",
        "text": "The parable of the Good Samaritan (Luke 10:30–37) derives its rhetorical force from the subversion of reader expectations. The two religious professionals who pass by are precisely those whom the original audience would have expected to render aid, while the Samaritan — an ethnic and religious outsider — is the one who embodies neighbourly compassion. The narrative structure compels the reader to undergo the same reversal of categories that the parable advocates."
    },
    {
        "id": "lit-pos-062",
        "text": "Mark's Gospel ends at 16:8 with the women fleeing the empty tomb in fear and silence — a conclusion so troubling that later scribes supplied more satisfying endings. Scholars such as Frank Kermode argue that this abrupt ending is a deliberate literary strategy: it leaves the reader suspended in the same state of trembling and astonishment as the women, forcing the reader to resolve the tension by becoming a witness in the women's place."
    },
    {
        "id": "lit-pos-063",
        "text": "The historical present tense in Mark's Gospel — the use of present-tense verbs to narrate past events — occurs with notable frequency at moments of heightened drama, such as Jesus's arrest (14:43–46). This shift in verbal aspect creates a sense of immediacy, drawing the reader into the narrated moment as if it were unfolding in real time. The technique transforms a past historical report into a present experiential encounter."
    },
    {
        "id": "lit-pos-064",
        "text": "The parable of the rich man and Lazarus (Luke 16:19–31) ends with the refusal of the rich man's brothers to be persuaded 'even if someone should rise from the dead' (v. 31). For the post-resurrection reader of Luke's Gospel, this statement resonates with deep irony: the reader knows that someone has indeed risen, yet many still refuse to believe. The parable thus implicates the reader in its own narrative logic, transforming a story about characters into an indictment of the audience."
    },
    {
        "id": "lit-pos-065",
        "text": "Jesus's question 'Who do you say that I am?' (Mark 8:29) functions as what narrative critics identify as a reader-engaging device. The question is addressed to the disciples within the story, but its placement at the Gospel's structural midpoint and its open-ended phrasing invite the reader to supply an answer. The narrative pauses at this crucial juncture to demand that the reader make the same confession Peter makes — or withhold it."
    },
    {
        "id": "lit-pos-066",
        "text": "The Fourth Gospel's asides — narrative comments addressed directly to the reader, such as 'he said this to test him, for he himself knew what he would do' (John 6:6) — create a privileged relationship between the narrator and the implied reader. These metanarrative intrusions give the reader access to Jesus's interior knowledge and intentions, positioning the reader as an insider who understands what the characters within the story do not."
    },

    # ── 9. Literary-Theoretical Frameworks (6 entries) ──
    {
        "id": "lit-pos-067",
        "text": "A deconstructive reading of the household codes in Ephesians 5:21–6:9, as advanced by Elisabeth Schüssler Fiorenza, reveals a tension between the egalitarian summons to mutual submission in 5:21 and the patriarchal hierarchy reasserted in the verses that follow. The text simultaneously subverts and reinscribes the Greco-Roman domestic order, exposing an ideological instability that resists any straightforward ethical appropriation."
    },
    {
        "id": "lit-pos-068",
        "text": "Feminist criticism has drawn attention to the women who finance Jesus's ministry in Luke 8:1–3 — Mary Magdalene, Joanna, and Susanna — figures whom the narrative mentions but does not develop. Elisabeth Schüssler Fiorenza argues that their presence hints at a stratum of tradition in which women played leadership roles that the final form of the text both preserves and marginalises, creating a tension between historical memory and patriarchal redaction."
    },
    {
        "id": "lit-pos-069",
        "text": "Postcolonial interpretation of the healing of the centurion's servant (Matthew 8:5–13) reads the encounter through the lens of imperial power dynamics. The centurion, as a representative of Roman occupation, acknowledges Jesus's authority by analogy with his own military command structure. Musa Dube argues that the narrative simultaneously legitimates Jesus's authority by comparison with imperial power while critiquing the very systems of domination it invokes."
    },
    {
        "id": "lit-pos-070",
        "text": "A socio-rhetorical reading of Philemon, as practised by Vernon Robbins, examines the interplay of epistolary convention, patron-client relationships, and deliberative rhetoric. Paul's carefully calibrated appeal — in which he neither commands nor remains silent but adopts the posture of a debtor — mobilises the cultural codes of reciprocity to achieve a social outcome the letter's surface argument declines to name explicitly: the manumission of Onesimus."
    },
    {
        "id": "lit-pos-071",
        "text": "Queer reading strategies applied to the account of the centurion and his pais (Matthew 8:5–13) have interrogated the assumption that the relationship between the centurion and the servant was merely one of master and subordinate. The Greek term pais can denote a slave, a child, or a beloved, and the centurion's evident distress at the servant's illness invites interpretations that recognise the affective depth of a bond the text itself does not categorise."
    },
    {
        "id": "lit-pos-072",
        "text": "Trauma theory illuminates Mark's passion narrative by attending to the textual symptoms of communal trauma — the flight of the disciples, the silence of the women, the repeated failures of testimony. The narrative's fragmentation and emphasis on failure, rather than being signs of literary ineptitude, may reflect the psychological aftermath of persecution. The text bears witness to a community whose own experience of betrayal and abandonment is inscribed in the story it tells."
    },

    # ── Additional entries across all categories (8 more to hit ~60) ──
    # Category: Chiastic / Ring Structure
    {
        "id": "lit-pos-073",
        "text": "The story of the raising of Jairus's daughter in Mark 5 is enveloped within the healing of the woman with the haemorrhage, forming a classic Markan sandwich structure. The intercalation creates a temporal delay that heightens the dramatic tension — by the time Jesus reaches the house, the girl is reported dead — and establishes a thematic link between the two female figures, both of whom are restored through faith despite circumstances that appear hopeless."
    },

    # Category: Narrative Criticism
    {
        "id": "lit-pos-074",
        "text": "The narrator of Mark's Gospel withholds Jesus's identity from the characters within the story while granting it to the reader from the very first verse: 'The beginning of the gospel of Jesus Christ, the Son of God' (1:1). This narrative strategy generates sustained dramatic irony throughout the Gospel, as the reader watches human and demonic characters gradually — and incompletely — arrive at a recognition the reader has possessed from the opening line."
    },

    # Category: Rhetorical / Discourse Analysis
    {
        "id": "lit-pos-075",
        "text": "The series of seven woes pronounced against the scribes and Pharisees in Matthew 23 follows the rhetorical pattern of prophetic denunciation familiar from Amos and Isaiah. Each woe begins with an identical formula and specifies a particular hypocrisy, building through repetition toward the climactic lament over Jerusalem (23:37–39). The accumulation generates a rhetorical momentum that transforms critique into elegy."
    },

    # Category: Intertextuality and Allusion
    {
        "id": "lit-pos-076",
        "text": "The feeding of the five thousand (Mark 6:30–44) is narrated with language that echoes the wilderness provision of manna in Exodus 16 and the miraculous feeding by Elisha in 2 Kings 4:42–44. The reference to the crowds sitting on 'green grass' (v. 39) evokes the shepherd of Psalm 23, layering pastoral and eschatological connotations onto the miraculous meal. Each intertextual echo positions Jesus within Israel's tradition of divinely mediated provision."
    },

    # Category: Genre / Form Analysis
    {
        "id": "lit-pos-077",
        "text": "The wisdom sayings collected in the Epistle of James exhibit the stylistic hallmarks of Jewish wisdom literature — aphoristic concision, imperative address, antithetical parallelism — yet James deploys these forms in the service of a distinctly eschatological ethic. The parametric genre is thus infused with an urgency that distinguishes it from the more reflective tone of Proverbs or Sirach, reflecting a community for whom the imminent parousia inflects every moral exhortation."
    },

    # Category: Comparative Literary Analysis
    {
        "id": "lit-pos-078",
        "text": "The Matthean and Lukan infancy narratives, while sharing several elements — the virginal conception, the birth in Bethlehem, the Davidic lineage — diverge dramatically in their narrative architecture and theological emphases. Matthew's account is structured around Joseph's dreams and the fulfilment of prophecy, foregrounding Jesus's Davidic and Mosaic identity, while Luke's centres on Mary's experience and the hymns of praise, emphasising Jesus's solidarity with the poor and marginalised."
    },

    # Category: Structural / Compositional Analysis
    {
        "id": "lit-pos-079",
        "text": "The body of the Epistle to the Romans can be divided into a doctrinal section (chs. 1–11) and a parametric section (chs. 12–15), a structure familiar from several Pauline letters. The theological argument culminates in the doxology of 11:33–36, and the ethical instructions that follow are grounded in the 'therefore' of 12:1, signalling that the imperative of Christian conduct derives entirely from the indicative of divine mercy expounded in the preceding chapters."
    },

    # Category: Reader-Response / Rhetorical Effect
    {
        "id": "lit-pos-080",
        "text": "The parable of the Unforgiving Servant (Matthew 18:23–35) derives its rhetorical power from the shocking disproportion between the debts — ten thousand talents, an astronomical sum, versus a hundred denarii, a modest amount. The original hearer would have gasped at the first figure's implausibility and then been outraged by the servant's refusal to extend the mercy he had just received. The narrative activates the hearer's sense of justice in order to convict the hearer of the same offence."
    },
]

# ──────────────────────────────────────────────
# NEGATIVE EXEMPLARS (non-literary-analysis)
# ──────────────────────────────────────────────
negative_exemplars = [
    # ── 1. Plain Plot Summary (8 entries) ──
    {
        "id": "lit-neg-013",
        "text": "Jesus travelled from Galilee to Jerusalem for the Passover festival, a journey that took him through Samaria. Along the way he healed ten lepers, only one of whom — a Samaritan — returned to thank him."
    },
    {
        "id": "lit-neg-014",
        "text": "The disciples were fishing on the Sea of Galilee throughout the night but had caught nothing. At dawn, Jesus appeared on the shore and instructed them to cast the net on the right side of the boat, resulting in a large catch of one hundred and fifty-three fish."
    },
    {
        "id": "lit-neg-015",
        "text": "After the Last Supper, Jesus and his disciples went to the Garden of Gethsemane on the Mount of Olives, where he prayed while they struggled to stay awake. Judas Iscariot arrived with a crowd armed with swords and clubs, and Jesus was arrested."
    },
    {
        "id": "lit-neg-016",
        "text": "Jesus attended a wedding in Cana of Galilee along with his mother and his disciples. When the wine ran out, his mother informed him of the situation, and he instructed the servants to fill six stone water jars with water, which was then drawn out as wine."
    },
    {
        "id": "lit-neg-017",
        "text": "John the Baptist preached in the wilderness of Judea, calling people to repent and be baptised in the Jordan River. Many came from Jerusalem and the surrounding region, and John baptised them as they confessed their sins."
    },
    {
        "id": "lit-neg-018",
        "text": "Paul travelled from Antioch to Iconium, Lystra, and Derbe on his first missionary journey, preaching in synagogues and establishing churches. In Lystra, he healed a man who had been lame from birth, and the crowds attempted to offer sacrifices to him and Barnabas."
    },
    {
        "id": "lit-neg-019",
        "text": "The angel Gabriel appeared to Zechariah while he was serving in the Temple and told him that his wife Elizabeth would bear a son, who was to be named John. Zechariah doubted the message and was struck mute until the child's birth."
    },
    {
        "id": "lit-neg-020",
        "text": "Jesus entered Jericho and encountered Zacchaeus, a wealthy chief tax collector who had climbed a sycamore tree in order to see him. Jesus called Zacchaeus down and announced that he would stay at his house that day."
    },

    # ── 2. Historical / Archaeological Facts (8 entries) ──
    {
        "id": "lit-neg-021",
        "text": "The Pool of Siloam was discovered during construction work in the City of David neighbourhood of Jerusalem in 2004. The pool, measuring approximately 70 metres by 50 metres, dates to the Second Temple period and is widely identified as the site mentioned in John 9, where Jesus healed a man born blind."
    },
    {
        "id": "lit-neg-022",
        "text": "Herod Antipas ruled as tetrarch of Galilee and Perea from 4 BCE until approximately 39 CE, when Emperor Caligula exiled him to Gaul. He was the son of Herod the Great and is the Herod who appears in the passion narrative, to whom Pilate sent Jesus for judgement."
    },
    {
        "id": "lit-neg-023",
        "text": "The synagogue at Capernaum, whose white limestone ruins are visible today, was built in the fourth or fifth century CE atop the remains of an earlier first-century basalt structure. The earlier building may be the synagogue where Jesus taught, as mentioned in the Gospels."
    },
    {
        "id": "lit-neg-024",
        "text": "The Pilate Stone, discovered at Caesarea Maritima in 1961, is a limestone block bearing a dedicatory inscription that names Pontius Pilate as prefect of Judea. It is the only known archaeological artefact from the first century to mention Pilate by name and title."
    },
    {
        "id": "lit-neg-025",
        "text": "The first-century fishing boat discovered in the mud of the Sea of Galilee in 1986, during a drought that lowered the water level, measured 8.2 metres in length and could hold approximately fifteen people. Radiocarbon dating places its construction between 40 BCE and 40 CE, making it contemporaneous with the ministry of Jesus."
    },
    {
        "id": "lit-neg-026",
        "text": "The site of et-Tell in the northern Galilee region is widely identified by archaeologists as the biblical Bethsaida, the hometown of the apostles Peter, Andrew, and Philip. Excavations have revealed Iron Age fortifications and Hellenistic-Roman period housing."
    },
    {
        "id": "lit-neg-027",
        "text": "The wealth of the Jerusalem Temple in the first century CE was legendary, supported by the annual half-shekel tax paid by Jews throughout the diaspora, as well as by votive offerings and the commerce generated by pilgrimage festivals. Josephus records that the Temple treasury was vast enough to attract the attention of Roman procurators."
    },
    {
        "id": "lit-neg-028",
        "text": "The ossuary of Caiaphas, the high priest who presided over the trial of Jesus, was discovered in a burial cave in the Jerusalem neighbourhood of Talpiot in 1990. The limestone bone box bears the Aramaic inscription 'Yehosef bar Qayafa' and contained the remains of several individuals, including a man approximately sixty years old."
    },

    # ── 3. Theological Doctrine (without literary analysis) (8 entries) ──
    {
        "id": "lit-neg-029",
        "text": "The doctrine of the hypostatic union, formally articulated at the Council of Chalcedon in 451 CE, asserts that Jesus Christ possesses two complete natures — divine and human — united in one person without confusion, change, division, or separation. This formulation became the standard of Christological orthodoxy for the majority of Christian traditions."
    },
    {
        "id": "lit-neg-030",
        "text": "The doctrine of original sin, developed most fully by Augustine of Hippo in his debates with Pelagius, holds that all human beings inherit a fallen nature and the guilt of Adam's transgression. Baptism is understood as the sacrament that washes away this inherited sin and incorporates the believer into the body of Christ."
    },
    {
        "id": "lit-neg-031",
        "text": "The Nicene Creed, adopted at the Council of Nicaea in 325 and expanded at Constantinople in 381, affirms belief in 'one Lord Jesus Christ, the only-begotten Son of God, begotten of the Father before all ages, Light from Light, true God from true God, begotten not made, consubstantial with the Father.'"
    },
    {
        "id": "lit-neg-032",
        "text": "The Protestant doctrine of justification by faith alone (sola fide), a central tenet of the Reformation, teaches that sinners are declared righteous before God not on the basis of their own merits or works but solely through faith in the atoning work of Christ. This was a point of sharp disagreement between Martin Luther and the Roman Catholic Church."
    },
    {
        "id": "lit-neg-033",
        "text": "The concept of theosis, or deification, is central to Eastern Orthodox soteriology and draws on the patristic maxim attributed to Athanasius: 'God became man so that man might become god.' This is understood not as an ontological transformation into the divine essence but as participation in the divine energies through union with Christ."
    },
    {
        "id": "lit-neg-034",
        "text": "The Roman Catholic doctrine of transubstantiation, defined at the Fourth Lateran Council in 1215 and reaffirmed at Trent, teaches that during the Eucharistic consecration the substance of the bread and wine is converted into the substance of the body and blood of Christ, while the accidents — the outward appearance — remain unchanged."
    },
    {
        "id": "lit-neg-035",
        "text": "The Calvinist doctrine of limited atonement, also called particular redemption, teaches that Christ's death was intended to save only the elect — those whom God predestined for salvation — rather than all humanity. This doctrine was one of the five points of Calvinism articulated at the Synod of Dort in 1618–1619."
    },
    {
        "id": "lit-neg-036",
        "text": "The Catholic and Orthodox churches recognise seven sacraments: baptism, confirmation (or chrismation), Eucharist, penance, anointing of the sick, holy orders, and matrimony. Most Protestant traditions recognise only baptism and the Eucharist as sacraments instituted by Christ in the New Testament."
    },

    # ── 4. Named Attribution / Reported Analysis (8 entries) ──
    {
        "id": "lit-neg-037",
        "text": "Rudolf Bultmann argued that the miracle stories in the Gospels reflect Hellenistic influence on the oral tradition and that the original Palestinian Jesus tradition contained far fewer miraculous elements. In Bultmann's reconstruction, the early church transformed Jesus from an ethical teacher into a Hellenistic divine man."
    },
    {
        "id": "lit-neg-038",
        "text": "According to N.T. Wright, the parables of Jesus should be read within the context of Israel's return from exile, and they function as prophetic critiques aimed at Israel's leaders and narratives of national restoration. Wright contends that the prodigal son parable retells the story of Israel's exile and restoration."
    },
    {
        "id": "lit-neg-039",
        "text": "Raymond E. Brown proposed that the Johannine community developed in five distinct phases, beginning with a group of Jewish disciples of John the Baptist who transferred their allegiance to Jesus, progressing through conflict with the synagogue, and culminating in a community that defined itself over against both Judaism and other Christian groups."
    },
    {
        "id": "lit-neg-040",
        "text": "E.P. Sanders argued that first-century Palestinian Judaism should be understood as 'covenantal nomism,' in which obedience to the law was not a means of earning salvation but of maintaining one's status within the covenant already established by God's grace. Sanders's work challenged the traditional Protestant portrayal of Judaism as a religion of legalistic works-righteousness."
    },
    {
        "id": "lit-neg-041",
        "text": "Albert Schweitzer argued in his landmark study 'The Quest of the Historical Jesus' (1906) that Jesus was an apocalyptic prophet who expected the imminent end of the world and the establishment of God's kingdom. Schweitzer claimed that the liberal Protestant portraits of Jesus as a teacher of ethical ideals were projections of the scholars' own values onto the historical figure."
    },
    {
        "id": "lit-neg-042",
        "text": "Richard Bauckham has argued, in contrast to the form-critical consensus, that the Gospels are based on eyewitness testimony and that the named characters function as guarantors of the traditions associated with them. Bauckham points to the inclusion of named individuals in the passion narrative as evidence for the controlled transmission of the material."
    },
    {
        "id": "lit-neg-043",
        "text": "John Dominic Crossan's reconstruction of the historical Jesus places him within the context of Mediterranean peasant society and depicts him as an itinerant Cynic-style sage whose teaching subverted social hierarchies through open commensality and the rejection of patronage systems. Crossan identifies the non-eschatological sayings in Q and the Gospel of Thomas as the earliest stratum of the Jesus tradition."
    },
    {
        "id": "lit-neg-044",
        "text": "Gerd Theissen's sociological analysis of the Jesus movement characterised the earliest Palestinian followers of Jesus as 'wandering charismatics' who abandoned homes and family ties to follow Jesus's radical ethic of homelessness and non-violence. Theissen used sociological models derived from the study of millenarian movements to explain the development of early Christian communities."
    },

    # ── 5. Lexical / Translation Notes (8 entries) ──
    {
        "id": "lit-neg-045",
        "text": "The Greek word σπλαγχνίζομαι (splanchnizomai), often translated as 'to have compassion,' literally refers to a movement in the inward parts or bowels. In the Gospels, it describes Jesus's visceral emotional response before acts of healing or feeding the crowds, indicating a compassion rooted in physical feeling rather than abstract benevolence."
    },
    {
        "id": "lit-neg-046",
        "text": "The Aramaic phrase talitha koum, preserved untranslated in Mark 5:41, means 'little girl, arise.' It is one of several Aramaic expressions retained in the Gospels, alongside ephphatha ('be opened,' Mark 7:34) and eloi eloi lema sabachthani ('my God, my God, why have you forsaken me,' Mark 15:34), likely reflecting the underlying oral tradition."
    },
    {
        "id": "lit-neg-047",
        "text": "The Greek term ἐκκλησία (ekklēsia), commonly translated as 'church,' originally referred to the assembly of citizens in a Greek city-state. In the Septuagint, it translates the Hebrew qahal, the assembly of Israel before God. Paul and the early Christians adopted the term to designate the gathered community of believers."
    },
    {
        "id": "lit-neg-048",
        "text": "The Hebrew term mashal (מָשָׁל), often rendered as 'parable' or 'proverb,' encompasses a wide semantic range in the Hebrew Bible, including figurative sayings, taunt songs, and allegorical narratives. In the Synoptic Gospels, the corresponding Greek term παραβολή (parabolē) primarily designates the narrative parables of Jesus."
    },
    {
        "id": "lit-neg-049",
        "text": "The word translated 'righteousness' in English New Testaments corresponds to the Greek δικαιοσύνη (dikaiosynē), which in Paul's usage can denote either a forensic status of acquittal before God or the ethical quality of upright conduct. The precise sense in a given passage often depends on whether Paul is drawing on Hebrew covenantal or Greek forensic conceptual frameworks."
    },
    {
        "id": "lit-neg-050",
        "text": "The term 'Son of Man' (ὁ υἱὸς τοῦ ἀνθρώπου) appears over eighty times in the Gospels and is consistently placed on the lips of Jesus. In Aramaic, bar enash can function as a circumlocution for 'I' or as a reference to the heavenly figure of Daniel 7:13. The precise nuance varies by context, contributing to ongoing scholarly debate about its significance for Jesus's self-understanding."
    },
    {
        "id": "lit-neg-051",
        "text": "The Greek word πίστις (pistis), usually rendered 'faith,' can also mean 'faithfulness,' 'trust,' or 'pledge,' depending on context. The so-called πίστις Χριστοῦ debate — whether the phrase in passages such as Galatians 2:16 should be translated as 'faith in Christ' (objective genitive) or 'the faithfulness of Christ' (subjective genitive) — has significant implications for Pauline soteriology."
    },
    {
        "id": "lit-neg-052",
        "text": "The Hebrew word hesed (חֶסֶד), appearing throughout the Old Testament, is translated variously as 'lovingkindness,' 'steadfast love,' 'mercy,' or 'covenant faithfulness.' It describes God's enduring loyalty to Israel grounded in covenant relationship. In the New Testament, the concept is rendered by Greek terms such as ἔλεος (eleos, mercy) and χάρις (charis, grace)."
    },

    # ── 6. Manuscript / Textual Criticism (8 entries) ──
    {
        "id": "lit-neg-053",
        "text": "Codex Sinaiticus, dating to the mid-fourth century, is one of the two oldest complete manuscripts of the Greek Bible. It was discovered by Constantin von Tischendorf at St Catherine's Monastery on Mount Sinai between 1844 and 1859. The manuscript contains the entire New Testament and portions of the Old Testament in Greek."
    },
    {
        "id": "lit-neg-054",
        "text": "The longer ending of Mark (16:9–20) is absent from Codex Sinaiticus and Codex Vaticanus, the two earliest complete Greek manuscripts, and is regarded by most textual critics as a secondary addition composed in the second century. The shorter ending found in some manuscripts offers an alternative conclusion that likewise lacks early attestation."
    },
    {
        "id": "lit-neg-055",
        "text": "The pericope of the woman caught in adultery (John 7:53–8:11) is absent from the earliest Greek manuscripts, including P66 and P75, as well as from Codex Sinaiticus and Codex Vaticanus. It appears in later manuscripts at various locations, including after John 7:36, John 21:25, and Luke 21:38, indicating that it circulated independently before being inserted into the Gospel of John."
    },
    {
        "id": "lit-neg-056",
        "text": "The Johannine Comma (1 John 5:7–8 in the King James Version), which contains an explicit Trinitarian formula, is absent from all Greek manuscripts written before the fourteenth century. Erasmus omitted it from his first two editions of the Greek New Testament, but included it in the third edition under pressure, on the condition that a Greek manuscript containing it could be produced."
    },
    {
        "id": "lit-neg-057",
        "text": "Papyrus 52 (P52), also known as the Rylands Library Papyrus, is a small fragment containing portions of John 18:31–33 and 37–38. It is widely considered the earliest surviving manuscript of the New Testament, with most palaeographers dating it to the first half of the second century, placing it within a few decades of the autograph's composition."
    },
    {
        "id": "lit-neg-058",
        "text": "Codex Bezae Cantabrigiensis, a fifth-century bilingual manuscript containing the Gospels and Acts in Greek and Latin, is notable for its distinctive Western text-type readings. Among its unique variants is the inclusion at Luke 6:5 of a story about a man working on the Sabbath, a passage found in no other Greek manuscript."
    },
    {
        "id": "lit-neg-059",
        "text": "The text of Acts exists in two distinct textual traditions: the Alexandrian text-type, represented by Codex Vaticanus and Papyrus 74, and the so-called Western text, represented by Codex Bezae. The Western text of Acts is approximately eight per cent longer than the Alexandrian, with numerous expansions that elaborate on narrative details and theological points."
    },
    {
        "id": "lit-neg-060",
        "text": "The verse Mark 1:41, in which Jesus heals a leper, is subject to a significant textual variant: the earliest manuscripts describe Jesus as 'moved with anger' (ὀργισθείς), while the later majority reading describes him as 'moved with compassion' (σπλαγχνισθείς). The more difficult reading, 'anger,' is preferred by most critical editions, including the Nestle-Aland and the United Bible Societies' Greek New Testament."
    },
]

# ──────────────────────────────────────────────
# LOAD, APPEND, VERIFY
# ──────────────────────────────────────────────

def load_existing(path):
    entries = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entries.append(json.loads(line))
    return entries

def append_exemplars(path, existing, new):
    seen_ids = {e["id"] for e in existing}
    to_append = [e for e in new if e["id"] not in seen_ids]
    with open(path, "a", encoding="utf-8") as f:
        for e in to_append:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")
    return len(to_append)

# Positive file
pos_path = BASE / "literary-analysis-positive.jsonl"
pos_existing = load_existing(pos_path)
print(f"Positive file: existing entries = {len(pos_existing)}")
n_pos_added = append_exemplars(pos_path, pos_existing, positive_exemplars)
pos_new_total = load_existing(pos_path)
print(f"  Added {n_pos_added} new positive entries → total = {len(pos_new_total)}")

# Negative file
neg_path = BASE / "literary-analysis-negative.jsonl"
neg_existing = load_existing(neg_path)
print(f"Negative file: existing entries = {len(neg_existing)}")
n_neg_added = append_exemplars(neg_path, neg_existing, negative_exemplars)
neg_new_total = load_existing(neg_path)
print(f"  Added {n_neg_added} new negative entries → total = {len(neg_new_total)}")

# Verify counts
print()
assert len(pos_new_total) >= 60, f"Positive count {len(pos_new_total)} < 60"
assert len(neg_new_total) >= 60, f"Negative count {len(neg_new_total)} < 60"
print("✅ Both files meet the ≥60 target.")

# Verify no duplicate IDs
pos_ids = [e["id"] for e in pos_new_total]
neg_ids = [e["id"] for e in neg_new_total]
assert len(pos_ids) == len(set(pos_ids)), "Duplicate positive IDs found!"
assert len(neg_ids) == len(set(neg_ids)), "Duplicate negative IDs found!"
print("✅ No duplicate IDs in either file.")

# Verify all entries are valid JSON on a single line
for path in [pos_path, neg_path]:
    with open(path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            assert isinstance(obj, dict), f"Line {i} in {path} is not a JSON object"
            assert "text" in obj and isinstance(obj["text"], str) and len(obj["text"]) > 30, \
                f"Line {i} in {path} has too-short text"
print("✅ All entries are valid single-line JSON objects with substantial text.")

print("\nDone. All checks passed.")
