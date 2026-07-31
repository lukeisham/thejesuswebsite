(function(){
  // --- Dormant fallback flags (§11.4 of ALGORITHM_GUIDE_the_how.md) ------------------------------
  // Each vector family (balanced debate, confessional balance, Jesus Seminar, mythicist, OT-NT
  // continuity, supernatural criticism, miracle criticism) keeps its old keyword/list detector in
  // this file, gated off by default. Flip a family's flag to `true` to reactivate its dormant
  // fallback — e.g. when that family's vector store misses the 0.8 precision floor (§3.4.1). The
  // detection logic below runs and is testable regardless of the flag; the flag only
  // controls whether the field appears in the return object, so downstream code never mistakes a
  // dormant field for an active one. Tests may override via window.__DORMANT_FALLBACKS__ before
  // this script is evaluated.
  var DORMANT_FALLBACKS = Object.assign({
    balancedDebate: false,
    confessionalBalance: false,
    jesusSeminar: false,
    mythicist: false,
    otNtContinuity: false,
    supernaturalCriticism: false,
    miracleCriticism: false
  }, (typeof window !== 'undefined' && window.__DORMANT_FALLBACKS__) || {});

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

  var manuscriptNames = ["Codex Sinaiticus", "Codex Vaticanus", "Codex Alexandrinus", "Codex Bezae",
    "Codex Ephraemi", "Codex Washingtonianus", "Chester Beatty Papyri", "Bodmer Papyri",
    "Dead Sea Scrolls", "Papyrus 52", "Papyrus 66", "Papyrus 75"];
  var manuscriptCount = (function(){
    var count = manuscriptNames.filter(function(n){ return text.indexOf(n) !== -1; }).length;
    if (count === 0 && /\bpapyri\b|\bpapyrus\b|\bcodex\b|\bcodices\b|\bmanuscripts?\b/i.test(text)) count = 1;
    return count;
  })();

  // --- Referencing quality, tiered (§9 row 24) --------------------------------------------------
  // Absorbs the former separate "No references at all", "Poor referencing", and "Niche exposure
  // bonus" signals into one tiered lookup on ref_count. The weight mapping (zero -> -9, niche -> +3,
  // supported -> +1, wellsourced -> 0) is applied in rank_engine.py — this file exports only the
  // raw tier. "Citation needed" / maintenance-banner detection is an independent boolean.
  var refQualityTier = refCount === 0 ? "zero" : (refCount < 5 ? "niche" : (refCount < 10 ? "supported" : "wellsourced"));
  var hasCitationNeeded = /citation needed|additional citations for verification|improve this article by adding citations|this article needs additional citations|unsourced material may be challenged/i.test(text);

  // --- Maps & diagrams (§9 row 13) ----------------------------------------------------------------
  var contentRoot = document.querySelector('#mw-content-text') || document.body;
  var mapDiagramEls = contentRoot.querySelectorAll('.mw-kartographer-map, .mw-kartographer-container, .locmap, .location-map, svg.diagram, figure.diagram');
  var captionEls = contentRoot.querySelectorAll('.thumbcaption, figcaption');
  var captionMapHits = Array.from(captionEls).filter(function(el){
    return /\bmaps?\b|\bdiagrams?\b|\bplans?\b|floor plan/i.test(el.textContent);
  }).length;
  var mapsAndDiagramsCount = Math.min(mapDiagramEls.length + captionMapHits, 2);
  var hasDiagramOrMap = mapsAndDiagramsCount > 0;

  // --- Religious art picture test, both widths (§9 row 15) -----------------------------------------
  // The choice between narrow and wide is a scoring decision (is_passion sensitivity, §3.9 row 15)
  // made in rank_engine.py, not here. Extraction reports both booleans unconditionally.
  var allImages = contentRoot.querySelectorAll('img');
  var hasPictureWide = allImages.length > 0;
  var hasPictureNarrow = Array.from(allImages).some(function(img){
    return !(img.closest && (img.closest('.infobox') || img.closest('.gallery')));
  });

  var blockquoteCount = document.querySelectorAll('#mw-content-text blockquote').length;
  var longQuoteMatches = (text.match(/"[^"\n]{40,}"/g) || []).length;
  var primarySourceQuoteCount = blockquoteCount + longQuoteMatches;
  var gnosticSourceHit = /\bGnostic\b|Nag Hammadi|Gospel of Thomas|Gospel of Judas|Gospel of Philip|Gospel of Mary|Valentinian|Sethian|Gospel of Truth/i.test(text);

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
  var isTeaching = categories.some(function(c){
    return /Sayings of Jesus|teachings of Jesus|New Testament idioms|New Testament words and phrases|Sermon on the Mount/i.test(c);
  });
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
  // Shared matcher — also drives the balanced-debate sentence exclusion below.
  var otherReligionRe = /Qur'an|Quran|Muhammad|Hadith|Surah|Book of Mormon|Joseph Smith|Latter-day Saint|\bLDS\b|Doctrine and Covenants|Pearl of Great Price|Islam\w*|Muslim\w*|Mormon\w*|Buddhis\w*|Hindu\w*|\bSikh\w*|\bJain\w*|Rastafari\w*|Bah[aá]['’]?[ií]\b|Bhagavad|\bVedas?\b/i;
  var otherReligionHit = otherReligionRe.test(text);

  // --- Dormant fallback: named-list count with generic-phrase fallback --------------------------
  // Shared by the Jesus Seminar, mythicist, and confessional-balance (critical-scholar) families.
  // Returns a raw count only — no section placement. Placement for a dormant family, when
  // activated, is resolved in rank_engine.py against the §3.1.1 classifier's paragraph labels
  // (bucket-labels.json), never against headings — see ALGORITHM_GUIDE_the_how.md's "Open
  // dependency" note. This file does not revive heading-based bucketing under any path.
  function matchCount(nameRes, genericRe, scanText){
    var found = nameRes.filter(function(re){ return re.test(scanText); });
    if (found.length) return found.length;
    return (genericRe && genericRe.test(scanText)) ? 1 : 0;
  }

  // --- Balanced debate (dormant fallback for §3.1.2) ----------------------------------------------
  var balancedDebateHits = 0, balancedDebateNamedAuthors = 0;
  if (DORMANT_FALLBACKS.balancedDebate) {
    (function(){
      // Interpretation-only scoping required section buckets, which are retired (§3.4.2); the
      // dormant path scans the full article text instead, other-religion sentences still dropped.
      var debateText = text
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
      var nameAttrRe = /\b((?:[A-Z](?:[a-z]+|\.)\s+){1,3}[A-Z][a-z]+)\s+(?:argue|contend|claim|maintain|counter|suggest|propose|respond|object|hold|dispute)/g;
      var names = {};
      var mAttr;
      while ((mAttr = nameAttrRe.exec(debateText)) !== null) { names[mAttr[1]] = true; }
      balancedDebateNamedAuthors = Object.keys(names).length;
    })();
  }

  // --- Confessional balance (dormant fallback for §3.1.8) ------------------------------------------
  var criticalScholarCount = 0, evangelicalHit = false;
  if (DORMANT_FALLBACKS.confessionalBalance) {
    criticalScholarCount = matchCount(
      [/Bart (?:D\.? )?Ehrman/i, /\bEhrman\b/, /G(?:e|é)rd L(?:ü|u)demann/i, /Elaine Pagels/i,
       /Paula Fredriksen/i, /Reza Aslan/i, /Maurice Casey/i, /Hector Avalos/i, /Dale B\.? Martin/i],
      null, text
    );
    var evangelicalRe = /N\.?\s?T\.?\s?Wright|Tom Wright|Richard Bauckham|Craig (?:L\.? )?Blomberg|Craig (?:S\.? )?Keener|Craig (?:A\.? )?Evans|Darrell (?:L\.? )?Bock|Ben Witherington|Michael (?:R\.? )?Licona|Gary (?:R\.? )?Habermas|D\.?\s?A\.?\s?Carson|Douglas (?:J\.? )?Moo|F\.?\s?F\.?\s?Bruce|I\.? Howard Marshall|evangelical scholar/i;
    evangelicalHit = evangelicalRe.test(text);
  }

  // --- Jesus Seminar (dormant fallback for §3.1.6) --------------------------------------------------
  var jesusSeminarCount = 0;
  if (DORMANT_FALLBACKS.jesusSeminar) {
    jesusSeminarCount = matchCount([/Robert Funk/, /John Dominic Crossan/, /Marcus Borg/], /Jesus Seminar/i, text);
  }

  // --- Mythicist (dormant fallback for §3.1.5) ------------------------------------------------------
  var mythicistCount = 0;
  if (DORMANT_FALLBACKS.mythicist) {
    mythicistCount = matchCount([/Richard Carrier/i, /Robert M\.? Price/i, /Earl Doherty/i], /\bmythicis[tm]\b|Christ myth theory/i, text);
  }

  // --- OT-NT continuity criticism (dormant fallback for §3.1.4) --------------------------------------
  var contOTNT = 0;
  if (DORMANT_FALLBACKS.otNtContinuity) {
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
    contOTNT = otntPatterns.filter(function(p){ return p.test(text); }).length;
  }

  // --- Supernatural criticism (dormant fallback for §3.1.3) -----------------------------------------
  var superCrit = 0;
  if (DORMANT_FALLBACKS.supernaturalCriticism) {
    superCrit = (text.match(/mytholog\w*|legendary accretion|historicity[^.]{0,30}(question|doubt|dispute)\w*|skeptic\w*|naturalistic explanation|hallucinat\w*/gi) || []).length;
  }

  // --- Miracle-specific criticism (dormant fallback for §3.1.7's miracle-scoped keyword set) --------
  var miracleCriticismHits = 0;
  if (DORMANT_FALLBACKS.miracleCriticism && isMiracle) {
    // The original section-exclusion (criticism/historical/scholarly/skeptical headings) required
    // heading-based buckets, which are retired; the dormant path scans the full article text.
    var miracleCritTerms = [
      "naturalistic explanation", "psychosomatic", "mass hallucination",
      "mythological", "legendary development", "legendary accretion",
      "scientifically explain", "scientifically implausible"
    ];
    var lowerText = text.toLowerCase();
    miracleCriticismHits = miracleCritTerms.filter(function(t){
      return lowerText.indexOf(t.toLowerCase()) !== -1;
    }).length;
  }

  var result = {
    title: pageTitle,
    verseCount: uniqueVerses.length,
    refCount: refCount,
    journalCount: journalCount,
    bookCount: bookCount,
    commentaryCount: commentaryCount,
    archSiteHit: archSiteHit,
    manuscriptCount: manuscriptCount,
    refQualityTier: refQualityTier,
    hasCitationNeeded: hasCitationNeeded,
    mapsAndDiagramsCount: mapsAndDiagramsCount,
    hasPictureNarrow: hasPictureNarrow,
    hasPictureWide: hasPictureWide,
    hasDiagramOrMap: hasDiagramOrMap,
    primarySourceQuoteCount: primarySourceQuoteCount,
    gnosticSourceHit: gnosticSourceHit,
    wikiQualityHit: wikiQualityHit,
    ancientHistorianCount: ancientHistorianCount,
    anteNiceneCount: anteNiceneCount,
    jewishContextHits: jewishContextHits,
    otherReligionHit: otherReligionHit,
    isPassion: isPassion,
    isMiracle: isMiracle,
    isParable: isParable,
    isLocation: isLocation,
    isTeaching: isTeaching,
    isBibleBook: isBibleBook
  };

  if (DORMANT_FALLBACKS.balancedDebate) {
    result.balancedDebateHits = balancedDebateHits;
    result.balancedDebateNamedAuthors = balancedDebateNamedAuthors;
  }
  if (DORMANT_FALLBACKS.confessionalBalance) {
    result.criticalScholarCount = criticalScholarCount;
    result.evangelicalHit = evangelicalHit;
  }
  if (DORMANT_FALLBACKS.jesusSeminar) {
    result.jesusSeminarCount = jesusSeminarCount;
  }
  if (DORMANT_FALLBACKS.mythicist) {
    result.mythicistCount = mythicistCount;
  }
  if (DORMANT_FALLBACKS.otNtContinuity) {
    result.contOTNT = contOTNT;
  }
  if (DORMANT_FALLBACKS.supernaturalCriticism) {
    result.superCrit = superCrit;
  }
  if (DORMANT_FALLBACKS.miracleCriticism) {
    result.miracleCriticismHits = miracleCriticismHits;
  }

  return result;
})()
