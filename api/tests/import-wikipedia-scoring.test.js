// Import script tests — covers deriveCap (all conditional rules, multipliers,
// truncation), validateArticle and validateContribution (unknown keys,
// contribution exceeding cap, wrong-sign contribution, Σcontributions ≠
// net_score), and slugFromTitle.
//
// Uses Node built-in test runner (node:test + node:assert/strict), matching the
// existing suite convention. Migrated to the 25-key rubric (§9 of
// Wikipedia_alogrithm_refractor.md) from the prior 28-key set.

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

/** Minimal valid article fixture — override fields per test.
 * balanced_debate_hits defaults to 1 (non-zero) so jesus_seminar/mythicist's
 * imbalance surcharge doesn't silently apply to unrelated tests. */
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
      primary_source_quotes: 0,
      poor_referencing: false,
      wiki_quality: false,
      ancient_historian_hits: 0,
      mythicist_hits: 0,
      narrative_interp_tier: "unclassifiable",
      jesus_seminar_hits: 0,
      jesus_seminar_mult: 1.0,
      mythicist_mult: 1.0,
      ot_nt_criticism: 0,
      jewish_context_hits: 0,
      other_religion_hit: false,
      balanced_debate_hits: 1,
      balanced_debate_named: 0,
      critical_scholar_hits: 0,
      critical_outside_interp: false,
      evangelical_contrast: false,
      has_picture: false,
      has_diagram_or_map: false,
      maps_diagrams_count: 0,
      literary_analysis_hit: false,
      secular_materialist_hits: 0,
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
  test("bible_verses cap is +12", () => {
    assert.equal(
      deriveCap("bible_verses", {}, { verse_count: 23, ref_count: 68 }),
      12,
    );
  });

  test("ante_nicene cap is +6", () => {
    assert.equal(deriveCap("ante_nicene", {}, {}), 6);
  });

  test("primary_quotes cap is +4", () => {
    assert.equal(deriveCap("primary_quotes", {}, {}), 4);
  });

  test("jewish_context cap is +6", () => {
    assert.equal(deriveCap("jewish_context", {}, {}), 6);
  });

  test("wiki_quality cap is +1", () => {
    assert.equal(deriveCap("wiki_quality", {}, {}), 1);
  });

  test("journal_or_book cap is +4 (2 per type)", () => {
    assert.equal(deriveCap("journal_or_book", {}, {}), 4);
  });

  test("maps_diagrams cap is +2", () => {
    assert.equal(deriveCap("maps_diagrams", {}, {}), 2);
  });
});

// ── deriveCap — unconditional negative ──────────────────────────────────────

describe("deriveCap — unconditional negative", () => {
  test("ot_nt_criticism cap is -6", () => {
    assert.equal(deriveCap("ot_nt_criticism", {}, {}), -6);
  });

  test("other_religion cap is -3", () => {
    assert.equal(deriveCap("other_religion", {}, {}), -3);
  });

  test("no_bible_verse cap is -10", () => {
    assert.equal(deriveCap("no_bible_verse", {}, {}), -10);
  });

  test("gnostic_over_emphasis cap is -4", () => {
    assert.equal(deriveCap("gnostic_over_emphasis", {}, {}), -4);
  });
});

// ── deriveCap — narrative_interp_split (tiered) ─────────────────────────────

describe("deriveCap — narrative_interp_split", () => {
  test("clear_split → +10", () => {
    assert.equal(
      deriveCap("narrative_interp_split", {}, { narrative_interp_tier: "clear_split" }),
      10,
    );
  });

  test("muddled → -3", () => {
    assert.equal(
      deriveCap("narrative_interp_split", {}, { narrative_interp_tier: "muddled" }),
      -3,
    );
  });

  test("one_sided → -5", () => {
    assert.equal(
      deriveCap("narrative_interp_split", {}, { narrative_interp_tier: "one_sided" }),
      -5,
    );
  });

  test("unclassifiable → 0", () => {
    assert.equal(
      deriveCap("narrative_interp_split", {}, { narrative_interp_tier: "unclassifiable" }),
      0,
    );
  });

  test("missing tier → 0", () => {
    assert.equal(deriveCap("narrative_interp_split", {}, {}), 0);
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

  test("manuscripts: 8 (not doubled) with is_teaching", () => {
    assert.equal(
      deriveCap(
        "manuscripts",
        { is_teaching: true, is_bible_book: false },
        {},
      ),
      8,
    );
  });

  test("manuscripts: 8 with is_bible_book", () => {
    assert.equal(
      deriveCap(
        "manuscripts",
        { is_teaching: false, is_bible_book: true },
        {},
      ),
      8,
    );
  });

  test("arch_site: +2 for non-location (parable no longer zeroed)", () => {
    assert.equal(deriveCap("arch_site", { is_parable: true }, {}), 2);
    assert.equal(deriveCap("arch_site", { is_parable: false }, {}), 2);
  });

  test("arch_site: +8 for is_location (absorbs old location_bonus)", () => {
    assert.equal(deriveCap("arch_site", { is_location: true }, {}), 8);
  });

  test("balanced_debate: base 6 with <2 named representatives", () => {
    assert.equal(
      deriveCap("balanced_debate", {}, { balanced_debate_named: 1 }),
      6,
    );
    assert.equal(
      deriveCap("balanced_debate", {}, { balanced_debate_named: 0 }),
      6,
    );
  });

  test("balanced_debate: ×2 (= 12) with 2+ named representatives", () => {
    assert.equal(
      deriveCap("balanced_debate", {}, { balanced_debate_named: 2 }),
      12,
    );
    assert.equal(
      deriveCap("balanced_debate", {}, { balanced_debate_named: 5 }),
      12,
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

  test("commentaries: +6 when is_teaching", () => {
    assert.equal(
      deriveCap("commentaries", { is_parable: false, is_teaching: true }, {}),
      6,
    );
  });

  test("commentaries: +6 when is_parable", () => {
    assert.equal(
      deriveCap("commentaries", { is_parable: true, is_teaching: false }, {}),
      6,
    );
  });

  test("ancient_historians: +6 for non-parable", () => {
    assert.equal(deriveCap("ancient_historians", { is_parable: false }, {}), 6);
  });

  test("ancient_historians: +3 (lower cap) for parable", () => {
    assert.equal(deriveCap("ancient_historians", { is_parable: true }, {}), 3);
  });

  test("literary_analysis: +6 for teaching/bible_book/parable", () => {
    assert.equal(
      deriveCap("literary_analysis", { is_teaching: true }, {}),
      6,
    );
    assert.equal(
      deriveCap("literary_analysis", { is_bible_book: true }, {}),
      6,
    );
    assert.equal(
      deriveCap("literary_analysis", { is_parable: true }, {}),
      6,
    );
  });

  test("literary_analysis: +4 for other articles", () => {
    assert.equal(deriveCap("literary_analysis", {}, {}), 4);
  });

  test("religious_art: 0 for parable/teaching articles regardless of raw signals", () => {
    assert.equal(
      deriveCap(
        "religious_art",
        { is_parable: true },
        { has_picture: true, has_diagram_or_map: true },
      ),
      0,
    );
    assert.equal(
      deriveCap(
        "religious_art",
        { is_teaching: true },
        { has_picture: true, has_diagram_or_map: true },
      ),
      0,
    );
  });

  test("religious_art: 0 when no picture", () => {
    assert.equal(deriveCap("religious_art", {}, { has_picture: false }), 0);
  });

  test("religious_art: -1 when picture but no diagram/map", () => {
    assert.equal(
      deriveCap(
        "religious_art",
        {},
        { has_picture: true, has_diagram_or_map: false },
      ),
      -1,
    );
  });

  test("religious_art: +1 when picture AND diagram/map", () => {
    assert.equal(
      deriveCap(
        "religious_art",
        {},
        { has_picture: true, has_diagram_or_map: true },
      ),
      1,
    );
  });
});

// ── deriveCap — conditional negative ────────────────────────────────────────

describe("deriveCap — conditional negative", () => {
  test("confessional_balance: 0 when no critical scholar cited", () => {
    assert.equal(
      deriveCap("confessional_balance", {}, { critical_scholar_hits: 0 }),
      0,
    );
  });

  test("confessional_balance: -3 outside interpretation sections", () => {
    assert.equal(
      deriveCap(
        "confessional_balance",
        {},
        { critical_scholar_hits: 1, critical_outside_interp: true },
      ),
      -3,
    );
  });

  test("confessional_balance: -1 inside without Evangelical contrast", () => {
    assert.equal(
      deriveCap(
        "confessional_balance",
        {},
        {
          critical_scholar_hits: 1,
          critical_outside_interp: false,
          evangelical_contrast: false,
        },
      ),
      -1,
    );
  });

  test("confessional_balance: 0 inside with Evangelical contrast", () => {
    assert.equal(
      deriveCap(
        "confessional_balance",
        {},
        {
          critical_scholar_hits: 1,
          critical_outside_interp: false,
          evangelical_contrast: true,
        },
      ),
      0,
    );
  });

  test("jesus_seminar: base -6 with mult 1.0 and balanced debate present", () => {
    assert.equal(
      deriveCap(
        "jesus_seminar",
        {},
        { jesus_seminar_mult: 1.0, balanced_debate_hits: 1 },
      ),
      -6,
    );
  });

  test("jesus_seminar: -12 with mult 2 (doubled)", () => {
    assert.equal(
      deriveCap(
        "jesus_seminar",
        {},
        { jesus_seminar_mult: 2, balanced_debate_hits: 1 },
      ),
      -12,
    );
  });

  test("jesus_seminar: -3 with mult 0.5 (truncate toward zero)", () => {
    // −6 × 0.5 = −3, Math.trunc(−3) = −3
    assert.equal(
      deriveCap(
        "jesus_seminar",
        {},
        { jesus_seminar_mult: 0.5, balanced_debate_hits: 1 },
      ),
      -3,
    );
  });

  test("jesus_seminar: defaults to multiplier 1 when missing", () => {
    assert.equal(
      deriveCap("jesus_seminar", {}, { balanced_debate_hits: 1 }),
      -6,
    );
  });

  test("jesus_seminar: further -2 imbalance surcharge when balanced_debate = 0", () => {
    assert.equal(
      deriveCap(
        "jesus_seminar",
        {},
        { jesus_seminar_mult: 1.0, balanced_debate_hits: 0 },
      ),
      -8,
    );
  });

  test("jesus_seminar: worst case -14 (×2 mult and imbalance surcharge)", () => {
    assert.equal(
      deriveCap(
        "jesus_seminar",
        {},
        { jesus_seminar_mult: 2, balanced_debate_hits: 0 },
      ),
      -14,
    );
  });

  test("supernatural_criticism: 0 unless is_miracle or is_passion", () => {
    assert.equal(
      deriveCap(
        "supernatural_criticism",
        { is_miracle: false, is_passion: false },
        {},
      ),
      0,
    );
  });

  test("supernatural_criticism: -8 when is_miracle", () => {
    assert.equal(
      deriveCap("supernatural_criticism", { is_miracle: true }, {}),
      -8,
    );
  });

  test("supernatural_criticism: -8 when is_passion", () => {
    assert.equal(
      deriveCap("supernatural_criticism", { is_passion: true }, {}),
      -8,
    );
  });

  test("secular_materialist: 0 unless is_miracle or is_passion", () => {
    assert.equal(
      deriveCap(
        "secular_materialist",
        { is_miracle: false, is_passion: false },
        {},
      ),
      0,
    );
  });

  test("secular_materialist: -8 when is_miracle or is_passion", () => {
    assert.equal(
      deriveCap("secular_materialist", { is_miracle: true }, {}),
      -8,
    );
    assert.equal(
      deriveCap("secular_materialist", { is_passion: true }, {}),
      -8,
    );
  });

  test("mythicist: base -7 with mult 1.0 and balanced debate present", () => {
    assert.equal(
      deriveCap("mythicist", {}, { mythicist_mult: 1.0, balanced_debate_hits: 1 }),
      -7,
    );
  });

  test("mythicist: -14 with mult 2 (doubled)", () => {
    assert.equal(
      deriveCap("mythicist", {}, { mythicist_mult: 2, balanced_debate_hits: 1 }),
      -14,
    );
  });

  test("mythicist: -3 with mult 0.5 (truncate toward zero)", () => {
    // −7 × 0.5 = −3.5, Math.trunc(−3.5) = −3
    assert.equal(
      deriveCap("mythicist", {}, { mythicist_mult: 0.5, balanced_debate_hits: 1 }),
      -3,
    );
  });

  test("mythicist: defaults to multiplier 1 when missing", () => {
    assert.equal(deriveCap("mythicist", {}, { balanced_debate_hits: 1 }), -7);
  });

  test("mythicist: further -2 imbalance surcharge when balanced_debate = 0", () => {
    assert.equal(
      deriveCap("mythicist", {}, { mythicist_mult: 1.0, balanced_debate_hits: 0 }),
      -9,
    );
  });

  test("mythicist: worst case -16 (×2 mult and imbalance surcharge)", () => {
    assert.equal(
      deriveCap("mythicist", {}, { mythicist_mult: 2, balanced_debate_hits: 0 }),
      -16,
    );
  });

  test("referencing_quality: -9 when ref_count = 0", () => {
    assert.equal(deriveCap("referencing_quality", {}, { ref_count: 0 }), -9);
  });

  test("referencing_quality: +3 when 1 ≤ ref_count ≤ 4", () => {
    assert.equal(deriveCap("referencing_quality", {}, { ref_count: 1 }), 3);
    assert.equal(deriveCap("referencing_quality", {}, { ref_count: 4 }), 3);
  });

  test("referencing_quality: +1 when 5 ≤ ref_count ≤ 9", () => {
    assert.equal(deriveCap("referencing_quality", {}, { ref_count: 5 }), 1);
    assert.equal(deriveCap("referencing_quality", {}, { ref_count: 9 }), 1);
  });

  test("referencing_quality: 0 when ref_count ≥ 10", () => {
    assert.equal(deriveCap("referencing_quality", {}, { ref_count: 10 }), 0);
    assert.equal(deriveCap("referencing_quality", {}, { ref_count: 100 }), 0);
  });

  test("referencing_quality: independent -1 for poor referencing stacks with tier", () => {
    assert.equal(
      deriveCap("referencing_quality", {}, { ref_count: 1, poor_referencing: true }),
      2,
    );
    assert.equal(
      deriveCap("referencing_quality", {}, { ref_count: 10, poor_referencing: true }),
      -1,
    );
    assert.equal(
      deriveCap("referencing_quality", {}, { ref_count: 0, poor_referencing: true }),
      -10,
    );
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
    const result = validateContribution("bible_verses", 5, 12, "Test");
    assert.equal(result.valid, true);
  });

  test("accepts contribution = cap", () => {
    const result = validateContribution("bible_verses", 12, 12, "Test");
    assert.equal(result.valid, true);
  });

  test("accepts contribution 0", () => {
    const result = validateContribution("bible_verses", 0, 12, "Test");
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
    const result = validateContribution("bible_verses", 13, 12, "Test");
    assert.equal(result.valid, false);
    assert.ok(result.error.includes("exceeds cap"));
  });

  test("rejects positive contribution on negative-cap signal", () => {
    const result = validateContribution("confessional_balance", 1, -3, "Test");
    assert.equal(result.valid, false);
    assert.ok(result.error.includes("wrong sign"));
  });

  test("rejects negative contribution on positive-cap signal", () => {
    const result = validateContribution("bible_verses", -1, 12, "Test");
    assert.equal(result.valid, false);
    assert.ok(result.error.includes("wrong sign"));
  });

  test("rejects non-zero contribution when cap is 0", () => {
    const result = validateContribution(
      "supernatural_criticism",
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
      net_score: 20,
      categories: {
        is_passion: false,
        is_miracle: false,
        is_parable: false,
        is_location: false,
        is_teaching: false,
        is_bible_book: false,
      },
    });
    // bible_verses: 12 (cap 12), journal_or_book: 4 (cap 4), wiki_quality: 1
    // (cap 1), primary_quotes: 3 (≤ cap 4) = 20
    article.contributions.bible_verses = 12;
    article.contributions.journal_or_book = 4;
    article.contributions.wiki_quality = 1;
    article.contributions.primary_quotes = 3;
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
    // manuscripts should be 8 because is_teaching (not doubled)
    assert.equal(result.caps.manuscripts, 8);
    // bible_verses should be 12
    assert.equal(result.caps.bible_verses, 12);
  });

  test("supernatural_criticism/secular_materialist gated together on is_miracle", () => {
    const article = makeArticle({
      net_score: -16,
      categories: { is_miracle: true },
    });
    article.contributions.supernatural_criticism = -8;
    article.contributions.secular_materialist = -8;
    const result = validateArticle(article);
    assert.equal(result.valid, true, result.errors.join("; "));
    assert.equal(result.caps.supernatural_criticism, -8);
    assert.equal(result.caps.secular_materialist, -8);
  });
});

// ── KNOWN_SIGNAL_KEYS ───────────────────────────────────────────────────────

describe("KNOWN_SIGNAL_KEYS", () => {
  test("contains exactly 25 keys", () => {
    assert.equal(KNOWN_SIGNAL_KEYS.size, 25);
  });

  test("no longer contains removed/folded/merged v1 keys", () => {
    for (const removed of [
      "historical_context",
      "passion_criticism",
      "location_bonus",
      "miracle_criticism",
      "no_references",
      "poor_referencing",
      "niche_bonus",
      "journals",
      "books",
      "gnostic_quoted",
    ]) {
      assert.equal(KNOWN_SIGNAL_KEYS.has(removed), false, removed);
    }
  });

  test("contains the new/renamed v2 keys", () => {
    for (const added of [
      "journal_or_book",
      "gnostic_over_emphasis",
      "referencing_quality",
      "literary_analysis",
      "maps_diagrams",
      "religious_art",
      "secular_materialist",
    ]) {
      assert.equal(KNOWN_SIGNAL_KEYS.has(added), true, added);
    }
  });
});
