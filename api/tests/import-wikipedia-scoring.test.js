// Import script tests — covers deriveCap (all conditional rules, multipliers,
// truncation), validateArticle and validateContribution (unknown keys,
// contribution exceeding cap, wrong-sign contribution, Σcontributions ≠
// net_score), and slugFromTitle.
//
// Uses Node built-in test runner (node:test + node:assert/strict), matching the
// existing suite convention.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const {
  deriveCap,
  validateContribution,
  validateArticle,
  slugFromTitle,
  KNOWN_SIGNAL_KEYS,
} = require("../scripts/import-wikipedia-scoring");

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Minimal valid article fixture — override fields per test. */
function makeArticle(overrides = {}) {
  return {
    ranking: 1,
    title: "Test Article",
    url: "https://en.wikipedia.org/wiki/Test",
    net_score: 0,
    contributions: Object.fromEntries(
      [...KNOWN_SIGNAL_KEYS].map((k) => [k, 0]),
    ),
    raw_signals: {
      verse_count: 0,
      ref_count: 10,
      manuscript_hits: 0,
      ante_nicene_hits: 0,
      journal_hits: 0,
      book_hits: 0,
      commentary_hits: 0,
      arch_site: false,
      historical_context: false,
      primary_source_quotes: 0,
      gnostic_source_quoted: false,
      poor_referencing: false,
      wiki_quality: false,
      ancient_historian_hits: 0,
      mythicist_hits: 0,
      narrative_and_interp_sections: false,
      jesus_seminar_hits: 0,
      jesus_seminar_mult: 1.0,
      mythicist_mult: 1.0,
      ot_nt_criticism: 0,
      supernatural_criticism: 0,
      jewish_context_hits: 0,
      other_religion_hit: false,
      passion_criticism_hits: 0,
      miracle_criticism_hits: 0,
      balanced_debate_hits: 0,
      balanced_debate_named: 0,
      critical_scholar_hits: 0,
      critical_outside_interp: false,
      evangelical_contrast: false,
    },
    categories: {
      is_passion: false,
      is_miracle: false,
      is_parable: false,
      is_location: false,
      is_teaching: false,
      is_bible_book: false,
    },
    ...overrides,
  };
}

// ── slugFromTitle ───────────────────────────────────────────────────────────

describe("slugFromTitle", () => {
  test("lowercases and replaces spaces with hyphens", () => {
    assert.equal(slugFromTitle("Gospel of Mark"), "gospel-of-mark");
  });

  test("strips trailing hyphens", () => {
    assert.equal(slugFromTitle("Jesus "), "jesus");
  });

  test("handles special characters", () => {
    assert.equal(
      slugFromTitle("Mary, mother of Jesus"),
      "mary-mother-of-jesus",
    );
  });

  test("handles consecutive special characters", () => {
    assert.equal(slugFromTitle("Foo -- Bar"), "foo-bar");
  });
});

// ── deriveCap — unconditional ───────────────────────────────────────────────

describe("deriveCap — unconditional positive", () => {
  test("bible_verses cap is +9", () => {
    assert.equal(
      deriveCap("bible_verses", {}, { verse_count: 23, ref_count: 68 }),
      9,
    );
  });

  test("narrative_interp_split cap is +3", () => {
    assert.equal(deriveCap("narrative_interp_split", {}, {}), 3);
  });

  test("ante_nicene cap is +6", () => {
    assert.equal(deriveCap("ante_nicene", {}, {}), 6);
  });

  test("historical_context cap is +2", () => {
    assert.equal(deriveCap("historical_context", {}, {}), 2);
  });

  test("journals cap is +5", () => {
    assert.equal(deriveCap("journals", {}, {}), 5);
  });

  test("books cap is +5", () => {
    assert.equal(deriveCap("books", {}, {}), 5);
  });

  test("primary_quotes cap is +4", () => {
    assert.equal(deriveCap("primary_quotes", {}, {}), 4);
  });

  test("jewish_context cap is +4", () => {
    assert.equal(deriveCap("jewish_context", {}, {}), 4);
  });

  test("ancient_historians cap is +3", () => {
    assert.equal(deriveCap("ancient_historians", {}, {}), 3);
  });

  test("wiki_quality cap is +1", () => {
    assert.equal(deriveCap("wiki_quality", {}, {}), 1);
  });
});

// ── deriveCap — unconditional negative ──────────────────────────────────────

describe("deriveCap — unconditional negative", () => {
  test("confessional_balance cap is -3", () => {
    assert.equal(deriveCap("confessional_balance", {}, {}), -3);
  });

  test("gnostic_quoted cap is -1", () => {
    assert.equal(deriveCap("gnostic_quoted", {}, {}), -1);
  });

  test("poor_referencing cap is -1", () => {
    assert.equal(deriveCap("poor_referencing", {}, {}), -1);
  });

  test("ot_nt_criticism cap is -6", () => {
    assert.equal(deriveCap("ot_nt_criticism", {}, {}), -6);
  });

  test("supernatural_criticism cap is -6", () => {
    assert.equal(deriveCap("supernatural_criticism", {}, {}), -6);
  });

  test("other_religion cap is -3", () => {
    assert.equal(deriveCap("other_religion", {}, {}), -3);
  });

  test("no_references cap is -8", () => {
    assert.equal(deriveCap("no_references", {}, {}), -8);
  });

  test("no_bible_verse cap is -10", () => {
    assert.equal(deriveCap("no_bible_verse", {}, {}), -10);
  });
});

// ── deriveCap — conditional positive ────────────────────────────────────────

describe("deriveCap — conditional positive", () => {
  test("manuscripts: base 6 without teaching or bible_book", () => {
    assert.equal(
      deriveCap(
        "manuscripts",
        { is_teaching: false, is_bible_book: false },
        {},
      ),
      6,
    );
  });

  test("manuscripts: ×2 (= 12) with is_teaching", () => {
    assert.equal(
      deriveCap(
        "manuscripts",
        { is_teaching: true, is_bible_book: false },
        {},
      ),
      12,
    );
  });

  test("manuscripts: ×2 (= 12) with is_bible_book", () => {
    assert.equal(
      deriveCap(
        "manuscripts",
        { is_teaching: false, is_bible_book: true },
        {},
      ),
      12,
    );
  });

  test("arch_site: 0 for parable", () => {
    assert.equal(deriveCap("arch_site", { is_parable: true }, {}), 0);
  });

  test("arch_site: +2 for non-parable", () => {
    assert.equal(deriveCap("arch_site", { is_parable: false }, {}), 2);
  });

  test("location_bonus: 0 unless is_location", () => {
    assert.equal(deriveCap("location_bonus", { is_location: false }, {}), 0);
  });

  test("location_bonus: +3 when is_location", () => {
    assert.equal(deriveCap("location_bonus", { is_location: true }, {}), 3);
  });

  test("balanced_debate: base 3 with <2 named representatives", () => {
    assert.equal(
      deriveCap("balanced_debate", {}, { balanced_debate_named: 1 }),
      3,
    );
  });

  test("balanced_debate: base 3 with 0 named representatives", () => {
    assert.equal(
      deriveCap("balanced_debate", {}, { balanced_debate_named: 0 }),
      3,
    );
  });

  test("balanced_debate: ×2 (= 6) with 2 named representatives", () => {
    assert.equal(
      deriveCap("balanced_debate", {}, { balanced_debate_named: 2 }),
      6,
    );
  });

  test("balanced_debate: ×2 (= 6) with 5 named representatives", () => {
    assert.equal(
      deriveCap("balanced_debate", {}, { balanced_debate_named: 5 }),
      6,
    );
  });

  test("commentaries: 0 unless is_parable or is_teaching", () => {
    assert.equal(
      deriveCap(
        "commentaries",
        { is_parable: false, is_teaching: false },
        {},
      ),
      0,
    );
  });

  test("commentaries: +3 when is_teaching", () => {
    assert.equal(
      deriveCap("commentaries", { is_parable: false, is_teaching: true }, {}),
      3,
    );
  });

  test("commentaries: +3 when is_parable", () => {
    assert.equal(
      deriveCap("commentaries", { is_parable: true, is_teaching: false }, {}),
      3,
    );
  });

  test("niche_bonus: +3 when ref_count < 5", () => {
    assert.equal(deriveCap("niche_bonus", {}, { ref_count: 4 }), 3);
    assert.equal(deriveCap("niche_bonus", {}, { ref_count: 0 }), 3);
  });

  test("niche_bonus: +1 when 5 ≤ ref_count ≤ 9", () => {
    assert.equal(deriveCap("niche_bonus", {}, { ref_count: 5 }), 1);
    assert.equal(deriveCap("niche_bonus", {}, { ref_count: 9 }), 1);
  });

  test("niche_bonus: 0 when ref_count ≥ 10", () => {
    assert.equal(deriveCap("niche_bonus", {}, { ref_count: 10 }), 0);
    assert.equal(deriveCap("niche_bonus", {}, { ref_count: 100 }), 0);
  });

  test("niche_bonus: 0 when ref_count is missing", () => {
    assert.equal(deriveCap("niche_bonus", {}, {}), 0);
  });
});

// ── deriveCap — conditional negative ────────────────────────────────────────

describe("deriveCap — conditional negative", () => {
  test("jesus_seminar: base -6 with mult 1.0", () => {
    assert.equal(
      deriveCap("jesus_seminar", {}, { jesus_seminar_mult: 1.0 }),
      -6,
    );
  });

  test("jesus_seminar: -12 with mult 2 (doubled)", () => {
    assert.equal(
      deriveCap("jesus_seminar", {}, { jesus_seminar_mult: 2 }),
      -12,
    );
  });

  test("jesus_seminar: -3 with mult 0.5 (truncate toward zero)", () => {
    // −6 × 0.5 = −3, Math.trunc(−3) = −3
    assert.equal(
      deriveCap("jesus_seminar", {}, { jesus_seminar_mult: 0.5 }),
      -3,
    );
  });

  test("jesus_seminar: defaults to multiplier 1 when missing", () => {
    assert.equal(deriveCap("jesus_seminar", {}, {}), -6);
  });

  test("passion_criticism: 0 unless is_passion", () => {
    assert.equal(
      deriveCap("passion_criticism", { is_passion: false }, {}),
      0,
    );
  });

  test("passion_criticism: -6 when is_passion", () => {
    assert.equal(
      deriveCap("passion_criticism", { is_passion: true }, {}),
      -6,
    );
  });

  test("miracle_criticism: 0 unless is_miracle", () => {
    assert.equal(
      deriveCap("miracle_criticism", { is_miracle: false }, {}),
      0,
    );
  });

  test("miracle_criticism: -6 when is_miracle", () => {
    assert.equal(
      deriveCap("miracle_criticism", { is_miracle: true }, {}),
      -6,
    );
  });

  test("mythicist: base -9 with mult 1.0", () => {
    assert.equal(deriveCap("mythicist", {}, { mythicist_mult: 1.0 }), -9);
  });

  test("mythicist: -18 with mult 2 (doubled)", () => {
    assert.equal(deriveCap("mythicist", {}, { mythicist_mult: 2 }), -18);
  });

  test("mythicist: -4 with mult 0.5 (truncate toward zero)", () => {
    // −9 × 0.5 = −4.5, Math.trunc(−4.5) = −4
    assert.equal(deriveCap("mythicist", {}, { mythicist_mult: 0.5 }), -4);
  });

  test("mythicist: defaults to multiplier 1 when missing", () => {
    assert.equal(deriveCap("mythicist", {}, {}), -9);
  });
});

// ── validateContribution ────────────────────────────────────────────────────

describe("validateContribution", () => {
  test("rejects unknown signal key", () => {
    const result = validateContribution(
      "not_a_key",
      0,
      0,
      "Test Article",
    );
    assert.equal(result.valid, false);
    assert.ok(result.error.includes("unknown signal key"));
  });

  test("accepts contribution ≤ cap for positive signals", () => {
    const result = validateContribution("bible_verses", 5, 9, "Test");
    assert.equal(result.valid, true);
  });

  test("accepts contribution = cap", () => {
    const result = validateContribution("bible_verses", 9, 9, "Test");
    assert.equal(result.valid, true);
  });

  test("accepts contribution 0", () => {
    const result = validateContribution("bible_verses", 0, 9, "Test");
    assert.equal(result.valid, true);
  });

  test("accepts negative contribution ≤ |negative cap|", () => {
    // confessional_balance: cap -3, contribution -1
    const result = validateContribution(
      "confessional_balance",
      -1,
      -3,
      "Test",
    );
    assert.equal(result.valid, true);
  });

  test("rejects contribution exceeding cap magnitude", () => {
    const result = validateContribution("bible_verses", 10, 9, "Test");
    assert.equal(result.valid, false);
    assert.ok(result.error.includes("exceeds cap"));
  });

  test("rejects positive contribution on negative-cap signal", () => {
    const result = validateContribution("confessional_balance", 1, -3, "Test");
    assert.equal(result.valid, false);
    assert.ok(result.error.includes("wrong sign"));
  });

  test("rejects negative contribution on positive-cap signal", () => {
    const result = validateContribution("bible_verses", -1, 9, "Test");
    assert.equal(result.valid, false);
    assert.ok(result.error.includes("wrong sign"));
  });

  test("rejects non-zero contribution when cap is 0", () => {
    const result = validateContribution(
      "passion_criticism",
      -2,
      0,
      "Test",
    );
    assert.equal(result.valid, false);
    assert.ok(result.error.includes("cap is 0"));
  });
});

// ── validateArticle ─────────────────────────────────────────────────────────

describe("validateArticle", () => {
  test("rejects article with unknown signal key in contributions", () => {
    const article = makeArticle();
    article.contributions.unknown_key = 5;
    const result = validateArticle(article);
    assert.equal(result.valid, false);
  });

  test("rejects missing title", () => {
    const article = makeArticle({ title: undefined });
    const result = validateArticle(article);
    assert.equal(result.valid, false);
  });

  test("rejects missing url", () => {
    const article = makeArticle({ url: undefined });
    const result = validateArticle(article);
    assert.equal(result.valid, false);
  });

  test("rejects missing ranking", () => {
    const article = makeArticle({ ranking: undefined });
    const result = validateArticle(article);
    assert.equal(result.valid, false);
  });

  test("rejects ranking < 1", () => {
    const article = makeArticle({ ranking: 0 });
    const result = validateArticle(article);
    assert.equal(result.valid, false);
  });

  test("rejects missing net_score", () => {
    const article = makeArticle({ net_score: undefined });
    const result = validateArticle(article);
    assert.equal(result.valid, false);
  });

  test("rejects missing contributions", () => {
    const article = makeArticle({ contributions: undefined });
    const result = validateArticle(article);
    assert.equal(result.valid, false);
  });

  test("rejects missing raw_signals", () => {
    const article = makeArticle({ raw_signals: undefined });
    const result = validateArticle(article);
    assert.equal(result.valid, false);
  });

  test("rejects missing categories", () => {
    const article = makeArticle({ categories: undefined });
    const result = validateArticle(article);
    assert.equal(result.valid, false);
  });

  test("rejects when Σcontributions ≠ net_score", () => {
    const article = makeArticle({ net_score: 50 });
    // All contributions are 0, so sum = 0 ≠ 50
    const result = validateArticle(article);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => e.includes("net_score")),
      "should report net_score mismatch",
    );
  });

  test("accepts valid article where contributions sum to net_score", () => {
    const article = makeArticle({
      net_score: 19,
      raw_signals: {
        ...makeArticle().raw_signals,
        verse_count: 10,
        ref_count: 15,
      },
      categories: {
        is_passion: false,
        is_miracle: false,
        is_parable: false,
        is_location: false,
        is_teaching: false,
        is_bible_book: false,
      },
    });
    // Set contributions that sum to 19
    // bible_verses: 9 (cap 9), journals: 5 (cap 5), books: 5 (cap 5) = 19
    article.contributions.bible_verses = 9;
    article.contributions.journals = 5;
    article.contributions.books = 5;
    const result = validateArticle(article);
    assert.equal(result.valid, true, result.errors.join("; "));
  });

  test("rejects contribution exceeding cap via actual cap derivation", () => {
    // manuscripts cap is 6 for non-teaching, non-bible_book
    const article = makeArticle({
      net_score: 12,
      categories: { is_teaching: false, is_bible_book: false },
    });
    article.contributions.manuscripts = 12; // cap should be 6
    const result = validateArticle(article);
    assert.equal(result.valid, false);
  });

  test("returns derived caps on valid article", () => {
    const article = makeArticle({
      categories: { is_teaching: true, is_bible_book: false },
    });
    const result = validateArticle(article);
    assert.equal(result.valid, true);
    // manuscripts should be 12 because is_teaching
    assert.equal(result.caps.manuscripts, 12);
    // bible_verses should be 9
    assert.equal(result.caps.bible_verses, 9);
  });
});

// ── KNOWN_SIGNAL_KEYS ───────────────────────────────────────────────────────

describe("KNOWN_SIGNAL_KEYS", () => {
  test("contains exactly 28 keys", () => {
    assert.equal(KNOWN_SIGNAL_KEYS.size, 28);
  });
});
