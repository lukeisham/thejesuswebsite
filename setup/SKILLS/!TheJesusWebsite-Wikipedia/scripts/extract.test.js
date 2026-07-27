// Unit tests for extract.js — the Wikipedia article signal extractor.
//
// extract.js is a raw browser-eval script (no module.exports, no imports — SR-2 forbids external
// libraries). It is loaded here as source text and run inside a node:vm context against a
// hand-built fake `document`, since the selectors extract.js calls are a small fixed set of
// literal strings — a full CSS engine (e.g. jsdom) isn't needed to exercise it faithfully.
//
// Uses Node built-in test runner (node:test + node:assert/strict), matching the existing suite
// convention (see api/tests/import-wikipedia-scoring.test.js).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

const SOURCE = fs.readFileSync(path.join(__dirname, "extract.js"), "utf8");

// ── Fake DOM helpers ────────────────────────────────────────────────────────

/** A queryable stub: querySelector/querySelectorAll read from a shared selector->elements map. */
function makeQueryable(registry) {
  return {
    querySelectorAll(sel) { return registry[sel] || []; },
    querySelector(sel) { return (registry[sel] && registry[sel][0]) || null; },
  };
}

/** A fake element. `closest` matches against the `closestSel` list; `query` is its own nested
 * selector->elements map for calls like el.querySelector('[title]'). */
function el(textContent, { attrs = {}, closestSel = [], query = {} } = {}) {
  const q = makeQueryable(query);
  return Object.assign({
    textContent,
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    closest(sel) { return closestSel.includes(sel) ? this : null; },
  }, q);
}

/** query: selector string -> array of el() stubs, shared by document AND document.body (extract.js
 * falls back to document.body when '#mw-content-text' isn't registered). */
function makeFakeDocument({ innerText = "", title = "Test Article - Wikipedia", query = {} } = {}) {
  const q = makeQueryable(query);
  return Object.assign({
    title,
    body: Object.assign({ innerText }, makeQueryable(query)),
  }, q);
}

function runExtract({ innerText, title, query, dormantFallbacks } = {}) {
  const document = makeFakeDocument({ innerText, title, query });
  const window = dormantFallbacks ? { __DORMANT_FALLBACKS__: dormantFallbacks } : {};
  const context = vm.createContext({ document, window });
  return vm.runInContext(SOURCE, context);
}

function refList(n) {
  return Array.from({ length: n }, () => el("A reference."));
}

// ── Bible verses ────────────────────────────────────────────────────────────

describe("bible verse citations", () => {
  test("counts a single citation", () => {
    const r = runExtract({ innerText: "As it says in John 3:16, God so loved the world." });
    assert.equal(r.verseCount, 1);
  });

  test("deduplicates repeated citations", () => {
    const r = runExtract({ innerText: "John 3:16 is famous. Later, John 3:16 is quoted again." });
    assert.equal(r.verseCount, 1);
  });

  test("counts distinct citations separately", () => {
    const r = runExtract({ innerText: "See John 3:16 and also Romans 8:28 for context." });
    assert.equal(r.verseCount, 2);
  });

  test("zero when no verse cited", () => {
    const r = runExtract({ innerText: "No scripture citation appears in this text at all." });
    assert.equal(r.verseCount, 0);
  });
});

// ── Referencing quality tiers (§9 row 24) ────────────────────────────────────

describe("refQualityTier boundaries", () => {
  test("0 refs -> zero", () => {
    const r = runExtract({ query: { ".references li, ol.references li, .reflist li": refList(0) } });
    assert.equal(r.refQualityTier, "zero");
  });

  test("1 ref -> niche", () => {
    const r = runExtract({ query: { ".references li, ol.references li, .reflist li": refList(1) } });
    assert.equal(r.refQualityTier, "niche");
  });

  test("4 refs -> niche", () => {
    const r = runExtract({ query: { ".references li, ol.references li, .reflist li": refList(4) } });
    assert.equal(r.refQualityTier, "niche");
  });

  test("5 refs -> supported", () => {
    const r = runExtract({ query: { ".references li, ol.references li, .reflist li": refList(5) } });
    assert.equal(r.refQualityTier, "supported");
  });

  test("9 refs -> supported", () => {
    const r = runExtract({ query: { ".references li, ol.references li, .reflist li": refList(9) } });
    assert.equal(r.refQualityTier, "supported");
  });

  test("10 refs -> wellsourced", () => {
    const r = runExtract({ query: { ".references li, ol.references li, .reflist li": refList(10) } });
    assert.equal(r.refQualityTier, "wellsourced");
  });

  test("hasCitationNeeded detects maintenance banner independently of ref count", () => {
    const r = runExtract({
      innerText: "This article needs additional citations for verification.",
      query: { ".references li, ol.references li, .reflist li": refList(12) },
    });
    assert.equal(r.refQualityTier, "wellsourced");
    assert.equal(r.hasCitationNeeded, true);
  });

  test("hasCitationNeeded false when no banner present", () => {
    const r = runExtract({ innerText: "A perfectly ordinary article body." });
    assert.equal(r.hasCitationNeeded, false);
  });
});

// ── Maps & diagrams (§9 row 13) ──────────────────────────────────────────────

describe("maps and diagrams", () => {
  const SEL = ".mw-kartographer-map, .mw-kartographer-container, .locmap, .location-map, svg.diagram, figure.diagram";
  const CAPTION_SEL = ".thumbcaption, figcaption";

  test("detects a mapframe element", () => {
    const r = runExtract({ query: { [SEL]: [el("")] } });
    assert.equal(r.mapsAndDiagramsCount, 1);
    assert.equal(r.hasDiagramOrMap, true);
  });

  test("detects a caption mentioning map/diagram/plan", () => {
    const r = runExtract({ query: { [CAPTION_SEL]: [el("Floor plan of the temple courts")] } });
    assert.equal(r.mapsAndDiagramsCount, 1);
  });

  test("caption without map/diagram/plan keywords does not count", () => {
    const r = runExtract({ query: { [CAPTION_SEL]: [el("A portrait of the apostle")] } });
    assert.equal(r.mapsAndDiagramsCount, 0);
    assert.equal(r.hasDiagramOrMap, false);
  });

  test("caps at 2 even with many hits", () => {
    const r = runExtract({
      query: {
        [SEL]: [el(""), el(""), el("")],
        [CAPTION_SEL]: [el("map"), el("diagram")],
      },
    });
    assert.equal(r.mapsAndDiagramsCount, 2);
  });
});

// ── Religious art picture test, both widths (§9 row 15) ──────────────────────

describe("religious art picture detection", () => {
  test("no images -> both narrow and wide are false", () => {
    const r = runExtract({});
    assert.equal(r.hasPictureNarrow, false);
    assert.equal(r.hasPictureWide, false);
  });

  test("an infobox-only image counts for wide but not narrow", () => {
    const r = runExtract({ query: { img: [el("", { closestSel: [".infobox"] })] } });
    assert.equal(r.hasPictureWide, true);
    assert.equal(r.hasPictureNarrow, false);
  });

  test("a gallery-only image counts for wide but not narrow", () => {
    const r = runExtract({ query: { img: [el("", { closestSel: [".gallery"] })] } });
    assert.equal(r.hasPictureWide, true);
    assert.equal(r.hasPictureNarrow, false);
  });

  test("a substantive in-body image counts for both", () => {
    const r = runExtract({ query: { img: [el("", { closestSel: [] })] } });
    assert.equal(r.hasPictureWide, true);
    assert.equal(r.hasPictureNarrow, true);
  });
});

// ── Archaeology (§9 row 7) ────────────────────────────────────────────────────

describe("archaeological site or artefact", () => {
  for (const phrase of [
    "the Israel Antiquities Authority confirmed the find",
    "an archaeological excavation uncovered the site",
    "the ossuary bears a first-century inscription",
  ]) {
    test(`fires on: "${phrase}"`, () => {
      const r = runExtract({ innerText: phrase });
      assert.equal(r.archSiteHit, true);
    });
  }

  test("does not fire on unrelated text", () => {
    const r = runExtract({ innerText: "A quiet discussion of literary themes." });
    assert.equal(r.archSiteHit, false);
  });
});

// ── Manuscripts ───────────────────────────────────────────────────────────────

describe("manuscript matching", () => {
  test("named manuscript counted", () => {
    const r = runExtract({ innerText: "The passage is preserved in Codex Sinaiticus." });
    assert.equal(r.manuscriptCount, 1);
  });

  test("two named manuscripts counted", () => {
    const r = runExtract({ innerText: "Compare Codex Sinaiticus with Codex Vaticanus on this point." });
    assert.equal(r.manuscriptCount, 2);
  });

  test("generic mention falls back to count 1", () => {
    const r = runExtract({ innerText: "Only a fragmentary papyrus survives of this passage." });
    assert.equal(r.manuscriptCount, 1);
  });

  test("no mention at all -> 0", () => {
    const r = runExtract({ innerText: "Nothing textual is discussed here." });
    assert.equal(r.manuscriptCount, 0);
  });
});

// ── Primary-source quotes ──────────────────────────────────────────────────────

describe("primary-source quote counting", () => {
  test("counts blockquotes", () => {
    const r = runExtract({ query: { "#mw-content-text blockquote": [el(""), el("")] } });
    assert.equal(r.primarySourceQuoteCount, 2);
  });

  test("counts long (40+ char) quoted spans in body text", () => {
    const longQuote = '"This is a quotation that runs well past forty characters in length."';
    const r = runExtract({ innerText: `The text reads: ${longQuote}` });
    assert.equal(r.primarySourceQuoteCount, 1);
  });

  test("short quoted spans (<40 chars) are not counted", () => {
    const r = runExtract({ innerText: 'He said "too short".' });
    assert.equal(r.primarySourceQuoteCount, 0);
  });
});

// ── Category flags ───────────────────────────────────────────────────────────

describe("article category detection", () => {
  const catQuery = (label) => ({ "#mw-normal-catlinks a": [el(label)] });

  test("Passion category", () => {
    const r = runExtract({ query: catQuery("Passion of Jesus") });
    assert.equal(r.isPassion, true);
  });

  test("Miracle category", () => {
    const r = runExtract({ query: catQuery("Miracles of Jesus") });
    assert.equal(r.isMiracle, true);
  });

  test("Parable category", () => {
    const r = runExtract({ query: catQuery("Parables of Jesus") });
    assert.equal(r.isParable, true);
  });

  test("Location category", () => {
    const r = runExtract({ query: catQuery("Holy Land") });
    assert.equal(r.isLocation, true);
  });

  test("Teaching category", () => {
    const r = runExtract({ query: catQuery("Sayings of Jesus") });
    assert.equal(r.isTeaching, true);
  });

  test("Bible book category", () => {
    const r = runExtract({ query: catQuery("Books of the New Testament") });
    assert.equal(r.isBibleBook, true);
  });

  test("Gospel-titled page is a Bible book even without the category", () => {
    const r = runExtract({ title: "Gospel of Mark - Wikipedia" });
    assert.equal(r.isBibleBook, true);
  });

  test("no category flags fire on a plain article", () => {
    const r = runExtract({});
    assert.equal(r.isPassion, false);
    assert.equal(r.isMiracle, false);
    assert.equal(r.isParable, false);
    assert.equal(r.isLocation, false);
    assert.equal(r.isTeaching, false);
    assert.equal(r.isBibleBook, false);
  });
});

// ── Genuinely deleted signals (§3.7/§3.8) ────────────────────────────────────

describe("deleted signals are absent", () => {
  test("historicalContextHit is not produced", () => {
    const r = runExtract({ innerText: "This is comparable to similar artifacts found elsewhere." });
    assert.equal("historicalContextHit" in r, false);
  });

  test("passionCriticismHits is not produced", () => {
    const r = runExtract({
      innerText: "The swoon theory has been proposed by some.",
      query: { "#mw-normal-catlinks a": [el("Passion of Jesus")] },
    });
    assert.equal("passionCriticismHits" in r, false);
  });

  test("narrativeHeading and interpHeading (retired bucketing) are not produced", () => {
    const r = runExtract({});
    assert.equal("narrativeHeading" in r, false);
    assert.equal("interpHeading" in r, false);
  });
});

// ── Dormant fallbacks (§11.4) ─────────────────────────────────────────────────

describe("dormant fallbacks default off", () => {
  test("all dormant fields are absent by default", () => {
    const r = runExtract({
      innerText: "Some scholars argue this while others disagree. Bart Ehrman and Richard Carrier " +
        "and John Dominic Crossan are all mentioned, along with proof-texting and mythological framing.",
      query: { "#mw-normal-catlinks a": [el("Miracles of Jesus")] },
    });
    for (const key of [
      "balancedDebateHits", "balancedDebateNamedAuthors", "criticalScholarCount", "evangelicalHit",
      "jesusSeminarCount", "mythicistCount", "contOTNT", "superCrit", "miracleCriticismHits",
    ]) {
      assert.equal(key in r, false, `expected "${key}" to be absent by default`);
    }
  });
});

describe("dormant fallbacks reappear and fire correctly when flagged on", () => {
  test("balancedDebate", () => {
    const r = runExtract({
      innerText: "Some scholars argue this reading while others disagree entirely.",
      dormantFallbacks: { balancedDebate: true },
    });
    assert.ok("balancedDebateHits" in r);
    assert.ok(r.balancedDebateHits >= 1);
  });

  test("confessionalBalance", () => {
    const r = runExtract({
      innerText: "Bart Ehrman contends the passage is a later addition.",
      dormantFallbacks: { confessionalBalance: true },
    });
    // Two distinct name patterns in the fixed list both match "Bart Ehrman" (the full-name form
    // and the bare-surname form) — matchCount counts matched PATTERNS, same as the original
    // placementOf() behaviour it replaces.
    assert.equal(r.criticalScholarCount, 2);
    assert.equal(r.evangelicalHit, false);
  });

  test("jesusSeminar", () => {
    const r = runExtract({
      innerText: "John Dominic Crossan places this saying among the inauthentic material.",
      dormantFallbacks: { jesusSeminar: true },
    });
    assert.equal(r.jesusSeminarCount, 1);
  });

  test("mythicist", () => {
    const r = runExtract({
      innerText: "Richard Carrier has argued for the mythicist position on this figure.",
      dormantFallbacks: { mythicist: true },
    });
    assert.equal(r.mythicistCount, 1);
  });

  test("otNtContinuity", () => {
    const r = runExtract({
      innerText: "Critics describe this as proof-texting drawn from the Old Testament.",
      dormantFallbacks: { otNtContinuity: true },
    });
    assert.ok(r.contOTNT >= 1);
  });

  test("supernaturalCriticism", () => {
    const r = runExtract({
      innerText: "Skeptics regard the account as mythological in origin.",
      dormantFallbacks: { supernaturalCriticism: true },
    });
    assert.ok(r.superCrit >= 1);
  });

  test("miracleCriticism fires only for Miracle-category articles", () => {
    const withMiracle = runExtract({
      innerText: "Some describe the healing as psychosomatic in nature.",
      query: { "#mw-normal-catlinks a": [el("Miracles of Jesus")] },
      dormantFallbacks: { miracleCriticism: true },
    });
    assert.equal(withMiracle.miracleCriticismHits, 1);

    const withoutMiracle = runExtract({
      innerText: "Some describe the healing as psychosomatic in nature.",
      dormantFallbacks: { miracleCriticism: true },
    });
    assert.equal(withoutMiracle.miracleCriticismHits, 0);
  });
});
