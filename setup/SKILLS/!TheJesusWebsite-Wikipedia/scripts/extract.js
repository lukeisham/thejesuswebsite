(function(){
  var text = document.body.innerText;
  var bibleBooks = "Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalm|Psalms|Proverbs|Ecclesiastes|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation";
  var verseRe = new RegExp("\\b(?:" + bibleBooks + ")\\s+\\d{1,3}:\\d{1,3}(?:[-–]\\d{1,3})?", "g");
  var verseMatches = text.match(verseRe) || [];
  var uniqueVerses = Array.from(new Set(verseMatches));

  var refNodes = document.querySelectorAll('.references li, ol.references li, .reflist li');
  var refTexts = Array.from(refNodes).map(function(n){ return n.textContent; });
  var refCount = refTexts.length;

  var journalCount = refTexts.filter(function(t){ return /journal|doi\.org|jstor|Quarterly|Bulletin/i.test(t); }).length;
  var bookCount = refTexts.filter(function(t){ return /ISBN|University Press|Press[,.]|Publishing/i.test(t); }).length;
  var commentaryCount = refTexts.filter(function(t){
    return /commentary|Word Biblical Commentary|Anchor (Bible|Yale Bible)|Hermeneia|NICNT|NIGTC|International Critical Commentary|Pillar New Testament Commentary|Tyndale.{0,20}Commentar|Sacra Pagina/i.test(t);
  }).length;

  var iaaHit = /Israel Antiquities Authority|\bIAA\b/i.test(text);
  var archHit = /archaeolog/i.test(text);
  var archSiteHit = iaaHit || archHit || /excavat\w*|archaeological (site|find|discovery)|\bossuary\b|\binscription\b/i.test(text);
  var historicalContextHit = /\bparallel(?:s|ed)?\b|comparable to|analogous|similar (?:artifact|inscription|custom|practice|find)s?|in the (?:broader|wider|historical|cultural) context|for comparison/i.test(text);
  var manuscriptNames = ["Codex Sinaiticus", "Codex Vaticanus", "Codex Alexandrinus", "Codex Bezae",
    "Codex Ephraemi", "Codex Washingtonianus", "Chester Beatty Papyri", "Bodmer Papyri",
    "Dead Sea Scrolls", "Papyrus 52", "Papyrus 66", "Papyrus 75"];
  var manuscriptCount = (function(){
    var count = manuscriptNames.filter(function(n){ return text.indexOf(n) !== -1; }).length;
    if (count === 0 && /\bpapyri\b|\bpapyrus\b|\bcodex\b|\bcodices\b|\bmanuscripts?\b/i.test(text)) count = 1;
    return count;
  })();

  // --- Section text buckets: data / interpretation / other ---------------------------------
  // Wikipedia parser output is FLAT — h2/h3 headings are SIBLINGS of the paragraphs that follow
  // them, never ancestors — so ancestor-walking cannot attribute text to a section. Instead,
  // walk the content in document order, reclassifying the current bucket at each heading.
  // The lede (before the first heading), references, infoboxes, etc. land in 'other'.
  // A heading matching BOTH heading families (e.g. "Historical account") is 'other' — ambiguous
  // placement must not trigger a doubling or a halving.
  var narrativeHeadRe = /^(the |a )?(biblical |gospel |synoptic |matthean |markan |marcan |lukan |lucan |johannine )?(account|narrative|episode|story)s?\b|^narrative\b|^in the (gospel|gospels|synoptics?|new testament)\b|^(biblical|gospel|synoptic) accounts?\b/i;
  var interpHeadRe = /interpret|theolog|significan|symbolis|scholar|historicity|historical|analys|criticis|exegesis|commentar|meaning|views|reception|debate|skeptic|naturalistic|authorship|composition/i;
  // NOTE (Luke's standing rule, 2026-07-17): footnote/reference-list text COUNTS for every
  // weight — it is ordinary 'other'-bucket content, same as the lede. Do not exempt it.
  function classifyHeading(h){
    var isNarr = narrativeHeadRe.test(h);
    var isInterp = interpHeadRe.test(h);
    if (isNarr && isInterp) return 'other';
    if (isNarr) return 'data';
    if (isInterp) return 'interp';
    return 'other';
  }
  var buckets = {data: '', interp: '', other: ''};
  var sawNarrativeHeading = false, sawInterpHeading = false;
  (function(){
    var root = document.querySelector('#mw-content-text .mw-parser-output') || document.querySelector('#mw-content-text') || document.body;
    var current = 'other', h2class = 'other';
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === 1) {
        if (node.tagName === 'H2' || node.tagName === 'H3') {
          var ht = node.textContent.replace(/\[edit\]/g, '').trim();
          var cls = classifyHeading(ht);
          if (cls === 'data') sawNarrativeHeading = true;
          if (cls === 'interp') sawInterpHeading = true;
          if (node.tagName === 'H2') { h2class = cls; current = cls; }
          else { current = (cls === 'other') ? h2class : cls; } // unmatched h3 inherits its h2's class
        }
      } else {
        var p = node.parentElement;
        if (p && p.closest && p.closest('h2, h3')) continue; // heading text itself isn't section content
        buckets[current] += ' ' + node.textContent;
      }
    }
  })();
  // Placement of a negative-weight author list across the buckets. Uses regexes so multi-form
  // names ("Robert M. Price" / "Robert M Price") match. If no named author matches but the
  // generic phrase does, the generic phrase's placement is used (count = 1, as before).
  function placementOf(nameRes, genericRe){
    var found = nameRes.filter(function(re){ return re.test(text); });
    var probes = found.length ? found : (genericRe && genericRe.test(text) ? [genericRe] : []);
    var out = {count: found.length ? found.length : (probes.length ? 1 : 0), inData: false, inInterp: false, inOther: false};
    probes.forEach(function(re){
      if (re.test(buckets.data)) out.inData = true;
      if (re.test(buckets.interp)) out.inInterp = true;
      if (re.test(buckets.other)) out.inOther = true;
    });
    // Edge case: the name appears in body innerText but in none of the walked buckets (e.g. only
    // in a collapsed navbox rendered outside the parser output) — treat as 'other', never as a
    // silent zero-placement that python would read as interp-only or data.
    if (out.count > 0 && !out.inData && !out.inInterp && !out.inOther) out.inOther = true;
    return out;
  }

  // --- Balanced debate (interpretation sections only) ---------------------------------------
  // Rewards genuine opposing-viewpoint discussion in the interpretation sections. Sentences that
  // mention Islamic / Mormon / other-religion material are dropped BEFORE scanning, so interfaith
  // "debate" never earns this credit. Count = number of DISTINCT patterns matched (cap in python).
  // Shared other-religion matcher — drives BOTH the other-religion-sources penalty and the
  // balanced-debate sentence exclusion, so the two can never drift apart.
  var otherReligionRe = /Qur'an|Quran|Muhammad|Hadith|Surah|Book of Mormon|Joseph Smith|Latter-day Saint|\bLDS\b|Doctrine and Covenants|Pearl of Great Price|Islam\w*|Muslim\w*|Mormon\w*|Buddhis\w*|Hindu\w*|\bSikh\w*|\bJain\w*|Rastafari\w*|Bah[aá]['’]?[ií]\b|Bhagavad|\bVedas?\b/i;

  var balancedDebateHits, balancedDebateNamedAuthors;
  (function(){
    var debateText = buckets.interp
      .split(/(?<=[.!?])\s+/)
      .filter(function(s){ return !otherReligionRe.test(s); })
      .join(' ');
    var debatePatterns = [
      /\bothers? (?:argue|contend|suggest|maintain|hold|propose|counter|claim)/i,
      /\bsome (?:scholars|commentators|interpreters|critics)\b[^.]{0,120}\b(?:while|whereas|but|however|others)\b/i,
      /\b(?:scholars|commentators|interpreters|opinions?) (?:are divided|disagree|differ|dispute|debate)/i,
      /\bcritics? (?:claim|argue|contend|maintain|counter|respond|object)/i,
      /\bopponents? (?:maintain|argue|contend|claim|counter|object)/i,
      /\bproponents? (?:counter|argue|contend|maintain|respond|claim)/i,
      /\bon the other hand\b|\bby contrast\b|\bin contrast\b|\bconversely\b/i,
      /\b(?:an? )?(?:alternative|opposing|competing|rival|minority|dissenting) (?:view|interpretation|explanation|position|reading|opinion|hypothesis|theor)/i,
      /\ba different (?:perspective|view|reading|interpretation) (?:suggest|hold|propose|argue|maintain)/i,
      /\bdebated?\b|\bdisputed\b|\bcontested\b|\bcontroversial\b/i,
      /\b(?:defen[dc]|refut|rebut|counter-?argu)\w*/i,
      /\bpoints? of (?:contention|disagreement)\b|\bno (?:scholarly )?consensus\b/i
    ];
    balancedDebateHits = debatePatterns.filter(function(p){ return p.test(debateText); }).length;
    // Named-representative detection: a capitalized personal name (2+ name-parts, initials
    // allowed) directly attributed a stance verb — e.g. "N. T. Wright argues", "Raymond Brown
    // contends". Distinct matched name strings are counted; >= 2 distinct named representatives
    // means the differing views each have a cited voice, which doubles the bonus in scoring.
    var nameAttrRe = /\b((?:[A-Z](?:[a-z]+|\.)\s+){1,3}[A-Z][a-z]+)\s+(?:argue|contend|claim|maintain|counter|suggest|propose|respond|object|hold|dispute)/g;
    var names = {};
    var mAttr;
    while ((mAttr = nameAttrRe.exec(debateText)) !== null) { names[mAttr[1]] = true; }
    balancedDebateNamedAuthors = Object.keys(names).length;
  })();

  // --- Confessional balance -------------------------------------------------------------------
  // Fires whenever a critical-biblical-scholarship historian (Bart Ehrman or similar) is cited
  // ANYWHERE in the article — footnote/bibliography citations included (they live in the 'other'
  // bucket, which counts as outside the interpretation sections). Only a citation confined to
  // the interpretation sections reaches the milder tiers; the contrasting-Evangelical check
  // (interpretation text only) decides between them.
  var criticalScholarPlace = placementOf(
    [/Bart (?:D\.? )?Ehrman/i, /\bEhrman\b/, /G(?:e|é)rd L(?:ü|u)demann/i, /Elaine Pagels/i,
     /Paula Fredriksen/i, /Reza Aslan/i, /Maurice Casey/i, /Hector Avalos/i, /Dale B\.? Martin/i],
    null
  );
  var evangelicalRe = /N\.?\s?T\.?\s?Wright|Tom Wright|Richard Bauckham|Craig (?:L\.? )?Blomberg|Craig (?:S\.? )?Keener|Craig (?:A\.? )?Evans|Darrell (?:L\.? )?Bock|Ben Witherington|Michael (?:R\.? )?Licona|Gary (?:R\.? )?Habermas|D\.?\s?A\.?\s?Carson|Douglas (?:J\.? )?Moo|F\.?\s?F\.?\s?Bruce|I\.? Howard Marshall|evangelical scholar/i;
  var evangelicalInInterp = evangelicalRe.test(buckets.interp);

  var jesusSeminarPlace = placementOf(
    [/Robert Funk/, /John Dominic Crossan/, /Marcus Borg/],
    /Jesus Seminar/i
  );
  var jesusSeminarCount = jesusSeminarPlace.count;

  var blockquoteCount = document.querySelectorAll('#mw-content-text blockquote').length;
  var longQuoteMatches = (text.match(/"[^"\n]{40,}"/g) || []).length;
  var primarySourceQuoteCount = blockquoteCount + longQuoteMatches;
  var gnosticSourceHit = /\bGnostic\b|Nag Hammadi|Gospel of Thomas|Gospel of Judas|Gospel of Philip|Gospel of Mary|Valentinian|Sethian|Gospel of Truth/i.test(text);

  var poorReferencingHit = /citation needed|additional citations for verification|improve this article by adding citations|this article needs additional citations|unsourced material may be challenged/i.test(text);

  var qualityIndicators = document.querySelectorAll('[id^="mw-indicator-"]');
  var wikiQualityHit = false;
  Array.from(qualityIndicators).forEach(function(el){
    var titled = el.querySelector('[title]');
    var titleText = (el.textContent || '') + ' ' + (titled ? titled.getAttribute('title') || '' : '');
    if (/good article|featured article/i.test(titleText)) wikiQualityHit = true;
  });

  var ancientHistorianNames = ["Josephus", "Tacitus", "Pliny the Younger", "Suetonius",
    "Mara bar Serapion", "Lucian of Samosata", "Celsus", "Phlegon"];
  var ancientHistorianCount = ancientHistorianNames.filter(function(n){ return text.indexOf(n) !== -1; }).length;

  var anteNiceneNames = ["Ignatius of Antioch", "Polycarp", "Justin Martyr", "Irenaeus", "Tertullian",
    "Origen", "Clement of Alexandria", "Clement of Rome", "Eusebius", "Hippolytus", "Cyprian"];
  var anteNiceneCount = anteNiceneNames.filter(function(n){ return text.indexOf(n) !== -1; }).length;

  var mythicistPlace = placementOf(
    [/Richard Carrier/i, /Robert M\.? Price/i, /Earl Doherty/i],
    /\bmythicis[tm]\b|Christ myth theory/i
  );
  var mythicistCount = mythicistPlace.count;

  // Data/interpretation split now derives from the SAME classifier as the section buckets — one
  // definition of "data section" and "interpretation section" for the +3 split reward AND the
  // placement multipliers, so they can never disagree. (The old standalone regexes here were
  // loose — bare "account" and "in the" matched headings like "In the arts".)
  var narrativeHeading = sawNarrativeHeading;
  var interpHeading = sawInterpHeading;

  // "swoon theory" removed from general superCrit — handled by passionCriticismHits below
  // OT–NT continuity criticism: fixed pattern list covering the four schools of critique in
  // Reference.md (proof-texting / divergent messianic expectation / Law abrogation /
  // intertestamental evolution) plus the original contradiction patterns. Count = number of
  // DISTINCT patterns matched (cap applied in rank_engine.py).
  var otntPatterns = [
    // (a) contextual disconnection / proof-texting
    /proof.?text\w*/i,
    /(?:quot|taken|lift|used|ripp)\w*[^.]{0,60}out of (?:its )?(?:original )?context/i,
    /\bpesher\b/i,
    /\bmidrash\w*/i,
    /original (?:historical )?context[^.]{0,80}(?:Isaiah|prophec\w*|Hebrew Bible|Old Testament)/i,
    // (b) divergent messianic expectations
    /(?:redefin|reinterpret|transform|re-?work)\w*[^.]{0,80}(?:messiah|messianic)/i,
    /messianic expectation\w*[^.]{0,80}(?:differ|contrast|political|military|geopolitical|Davidic)/i,
    /(?:political|military|geopolitical)[^.]{0,60}(?:messiah|Davidic king)/i,
    // (c) abrogation of the Mosaic Law
    /(?:abrogat|supersed|obsolet)\w*[^.]{0,80}(?:law|Torah|covenant|Mosaic)/i,
    /(?:law|Torah|covenant|Mosaic)[^.]{0,80}(?:abrogat|supersed|obsolet|annul)\w*/i,
    /supersessionis\w*/i,
    // (d) intertestamental theological evolution
    /intertestamental[^.]{0,80}(?:develop|influence|apocalyptic|evolution)\w*/i,
    /(?:Hellenistic|Persian|Zoroastrian)[^.]{0,80}(?:influence|borrow|origin)\w*[^.]{0,80}(?:apocalyptic|resurrection|dualis|angel)/i,
    /Second Temple[^.]{0,60}apocalyptic\w*/i,
    // original contradiction/discrepancy patterns
    /(contradict|discrepanc|inconsisten)\w*[^.]{0,100}(Old Testament|prophecy|prophecies|Hebrew Bible)/i,
    /(Old Testament|prophecy|prophecies|Hebrew Bible)[^.]{0,100}(contradict|discrepanc|inconsisten)\w*/i
  ];
  var contOTNT = otntPatterns.filter(function(p){ return p.test(text); }).length;
  // Supernatural criticism: per-instance count (cap applied in rank_engine.py)
  var superCrit = (text.match(/mytholog\w*|legendary accretion|historicity[^.]{0,30}(question|doubt|dispute)\w*|skeptic\w*|naturalistic explanation|hallucinat\w*/gi) || []).length;

  // --- Article categories (from category strip) ---
  var categoryLinks = document.querySelectorAll('#mw-normal-catlinks a');
  var categories = Array.from(categoryLinks).map(function(a){ return a.textContent.trim(); });
  var isPassion = categories.some(function(c){ return /Passion of Jesus|Crucifixion of Jesus|Resurrection of Jesus/i.test(c); });
  var isMiracle = categories.some(function(c){ return /Miracles of Jesus/i.test(c); });
  var isParable = categories.some(function(c){ return /Parables of Jesus/i.test(c); });
  var isLocation = categories.some(function(c){
    return /New Testament places|New Testament cities|Holy Land|Geography of Israel|Cities in Israel|Archaeological sites in Israel|Hebrew Bible places/i.test(c);
  });
  var pageTitle = document.title.replace(' - Wikipedia','');
  // Teachings: sayings, idioms, discourses, doctrines-and-teachings category family
  var isTeaching = categories.some(function(c){
    return /Sayings of Jesus|teachings of Jesus|New Testament idioms|New Testament words and phrases|Sermon on the Mount/i.test(c);
  });
  // Books of the Bible: the four canonical Gospels / NT-book articles
  var isBibleBook = categories.some(function(c){
    return /Books of the New Testament|Canonical Gospels|^Gospels$/i.test(c);
  }) || /^Gospel of (Matthew|Mark|Luke|John)$/i.test(pageTitle);

  // --- Jewish context ---
  var jewishContextTerms = [
    "Second Temple Judaism", "Second Temple period", "Pharisees", "Sadducees",
    "synagogue", "halakha", "halakhic", "Torah", "rabbinic", "rabbinical",
    "Essenes", "Qumran", "messianic expectation", "Passover", "Jewish custom",
    "Jewish law", "Jewish practice", "Mishnah", "Talmud",
    "intertestamental", "inter-testamental"
  ];
  var jewishContextHits = jewishContextTerms.filter(function(t){ return text.indexOf(t) !== -1; }).length;

  // --- Other-religion sources (Islamic, Mormon, Buddhist, Hindu, Sikh, Jain, Rastafari, Bahá'í…) ---
  // Same shared matcher as the balanced-debate exclusion above.
  var otherReligionHit = otherReligionRe.test(text);

  // --- Passion-specific criticism (scoped to Passion articles only) ---
  var passionCritTerms = ["swoon theory", "stake theory", "torture stake", "impalement theory"];
  var passionCriticismHits = 0;
  if (isPassion) {
    passionCriticismHits = passionCritTerms.filter(function(t){
      return text.toLowerCase().indexOf(t.toLowerCase()) !== -1;
    }).length;
  }

  // --- Miracle-specific criticism (scoped to Miracle articles, non-excluded sections only) ---
  var miracleCriticismHits = 0;
  if (isMiracle) {
    var miracleCritTerms = [
      "naturalistic explanation", "psychosomatic", "mass hallucination",
      "mythological", "legendary development", "legendary accretion",
      "scientifically explain", "scientifically implausible"
    ];
    // Scan only non-interpretation text: the shared section buckets (data + other) — text under
    // interpretation-family headings (criticism/historical/scholarly/skeptical/etc.) is excluded.
    // (The previous implementation walked ANCESTORS to find the section heading, but headings are
    // siblings in the parser output, so it never actually excluded anything.)
    var miracleText = buckets.data + ' ' + buckets.other;
    miracleCriticismHits = miracleCritTerms.filter(function(t){
      return miracleText.toLowerCase().indexOf(t.toLowerCase()) !== -1;
    }).length;
  }

  return {
    title: pageTitle,
    verseCount: uniqueVerses.length,
    refCount: refCount,
    journalCount: journalCount,
    bookCount: bookCount,
    commentaryCount: commentaryCount,
    iaaHit: iaaHit,
    archHit: archHit,
    archSiteHit: archSiteHit,
    historicalContextHit: historicalContextHit,
    manuscriptCount: manuscriptCount,
    jesusSeminarCount: jesusSeminarCount,
    jesusSeminarInData: jesusSeminarPlace.inData,
    jesusSeminarInInterp: jesusSeminarPlace.inInterp,
    jesusSeminarInOther: jesusSeminarPlace.inOther,
    primarySourceQuoteCount: primarySourceQuoteCount,
    gnosticSourceHit: gnosticSourceHit,
    poorReferencingHit: poorReferencingHit,
    wikiQualityHit: wikiQualityHit,
    ancientHistorianCount: ancientHistorianCount,
    anteNiceneCount: anteNiceneCount,
    mythicistCount: mythicistCount,
    mythicistInData: mythicistPlace.inData,
    mythicistInInterp: mythicistPlace.inInterp,
    mythicistInOther: mythicistPlace.inOther,
    narrativeHeading: narrativeHeading,
    interpHeading: interpHeading,
    contOTNT: contOTNT,
    superCrit: superCrit,
    balancedDebateHits: balancedDebateHits,
    balancedDebateNamedAuthors: balancedDebateNamedAuthors,
    criticalScholarCount: criticalScholarPlace.count,
    criticalScholarInData: criticalScholarPlace.inData,
    criticalScholarInInterp: criticalScholarPlace.inInterp,
    criticalScholarInOther: criticalScholarPlace.inOther,
    evangelicalInInterp: evangelicalInInterp,
    // New signals
    jewishContextHits: jewishContextHits,
    otherReligionHit: otherReligionHit,
    passionCriticismHits: passionCriticismHits,
    miracleCriticismHits: miracleCriticismHits,
    // Article categories (for scoring conditionals)
    isPassion: isPassion,
    isMiracle: isMiracle,
    isParable: isParable,
    isLocation: isLocation,
    isTeaching: isTeaching,
    isBibleBook: isBibleBook
  };
})()
