#!/usr/bin/env node
/**
 * Wikipedia scoring import — loads database/scoring-export.json (255 articles ×
 * 25 signal contributions, per Wikipedia_alogrithm_refractor.md §9) into
 * wikipedia_articles + wikipedia_article_signals.
 *
 * Usage:
 *   cd api
 *   node scripts/import-wikipedia-scoring.js [--export <path>] [--publish]
 *
 * Options:
 *   --export <path>   Override the default path to the scoring export JSON.
 *   --publish         Create new articles with published_draft = 1 (default: 0).
 *                     Intended for the local smoke-test; deploy.sh calls without it.
 *   --purge-missing   DELETE articles from the DB whose URLs are absent from the
 *                     export (default: warn only). Signals cascade via FK.
 *
 * Design: single transaction, all-or-nothing (JS-2). Validates every article
 * record before writing — URL present, all 25 contribution keys known,
 * |contribution| ≤ |derived cap| with matching sign, Σcontributions = net_score.
 * Aborts loudly (non-zero exit) before any write if validation fails.
 *
 * Matches existing DB articles by wikipedia_article_url (never by title —
 * titles diverge between the DB and the export for articles whose titles
 * contain characters that the bulk-paste pipeline normalised). Updates matched
 * rows' title + rank; creates unmatched rows (slug from title). Signals are
 * delete-and-reinserted wholesale (prepared named-parameter INSERT inside the
 * transaction), which also purges stale signal keys from earlier dev seeding.
 *
 * Matches the shape of api/scripts/import-geoip.js (plain Node script, npm run
 * entry, invoked from deploy.sh). Pure helpers exported via module.exports for
 * testing (SR-1: one file per job, same pattern as generate-sitemap.js).
 */

const fs = require("fs");
const path = require("path");
const db = require("../config");

// ── 25 known signal keys (§9 of Wikipedia_alogrithm_refractor.md) ───────────
//
// Migrated from the 28-key v1 set: historical_context and passion_criticism
// were dropped outright (weight left the rubric); location_bonus folded into
// arch_site; miracle_criticism folded into supernatural_criticism;
// no_references/poor_referencing/niche_bonus merged into referencing_quality;
// journals/books merged into journal_or_book; gnostic_quoted renamed
// gnostic_over_emphasis; literary_analysis/maps_diagrams/religious_art/
// secular_materialist are new (vector or plain-lookup) signals.

const KNOWN_SIGNAL_KEYS = new Set([
  "bible_verses",
  "data_interp_split",
  "manuscripts",
  "ante_nicene",
  "arch_site",
  "journal_or_book",
  "primary_quotes",
  "jewish_context",
  "balanced_debate",
  "commentaries",
  "ancient_historians",
  "wiki_quality",
  "confessional_balance",
  "gnostic_over_emphasis",
  "jesus_seminar",
  "ot_nt_criticism",
  "supernatural_criticism",
  "other_religion",
  "mythicist",
  "referencing_quality",
  "no_bible_verse",
  "literary_analysis",
  "maps_diagrams",
  "religious_art",
  "secular_materialist",
]);

// Pending signals (§9 activation checklist): these are documented subset of
// KNOWN_SIGNAL_KEYS whose real data is not yet flowing from the pipeline.
// They count toward max_possible as if scoring their full positive potential
// so they don't silently drag scores down. The all-zero integrity check skips
// them so a pipeline gap doesn't block the import.
const PENDING_SIGNAL_KEYS = new Set([
  "literary_analysis",
  // Temporary (2026-07-31, Issues.md #161): harvest_one() in rank_engine.py
  // no longer computes the keyword-detector fields these five signals fall
  // back to, so they score 0 for every article. Unrelated to Signal 3 — do
  // not remove until #161 is fixed and a rescore shows real, varied values.
  "balanced_debate",
  "confessional_balance",
  "ot_nt_criticism",
  "supernatural_criticism",
  "secular_materialist",
]);

// ── Cap derivation ──────────────────────────────────────────────────────────

/**
 * Derive the per-article cap (max magnitude) for a signal.
 *
 * Cap = the maximum points magnitude this article could earn/lose for the
 * signal, with conditionals resolved from `categories` and `raw_signals`. A
 * returned cap of 0 means the signal's condition is not met for this article
 * (e.g. passion_criticism for a non-passion article), and its contribution
 * must be 0 — this is validated by the caller.
 *
 * Cap-derivation rules are encoded as data + small named functions, not a
 * comment-explained switch (JS-1 / JS-4).
 *
 * @param {string} key - Signal key.
 * @param {Object} categories - Article categories (e.g. { is_teaching: true }).
 * @param {Object} rawSignals - Raw harvested signal values.
 * @returns {number} Derived cap (can be negative for penalty signals).
 */
function deriveCap(key, categories, rawSignals) {
  const rules = {
    // ── Positive, unconditional (§9 rows 2, 6, 9(base handled below), 11, 14) ─
    bible_verses: 12, // row 2: +3 per citation, capped +12
    ante_nicene: 6, // row 6: +2 per author, capped +6
    primary_quotes: 4, // row 11: +1 per quote, capped +4
    jewish_context: 6, // row 8: +2 per concept, capped +6
    wiki_quality: 1, // row 14: flat
    journal_or_book: 4, // row 12: +1 per citation, capped +2 per type (2 types)

    // ── Positive, conditional ─────────────────────────────────────────────

    // row 3: data/interpretation split — tiered on the classifier's row-3 tier
    // (§3.1.1). Weights mirror classifier/config.py (source of truth — see
    // TIER_CLEAR / TIER_MUDDLED / TIER_ONE_SIDED / TIER_UNCLASSIFIABLE).
    // +10 clear split, -5 muddled (the worst outcome — mixing description and
    // interpretation without a clean separation), 0 one-sided (short
    // single-tier articles aren't penalised), 0 unclassifiable.
    //
    // The classifier's own tier accuracy (0.641) is still below its
    // acceptance gate (0.85) — see setup/issues.md #163 for the open
    // question of whether classifier-derived tiers or the separately
    // validated LLM labels should drive this signal.
    data_interp_split() {
      if (rawSignals.data_interp_pending) return 10;
      const tier = rawSignals.data_interp_tier;
      if (tier === "clear_split") return 10;
      if (tier === "muddled") return -5;
      if (tier === "one_sided") return 0;
      return 0;
    },

    // row 1: manuscripts — base +6; +8 (not doubled) for teachings/Bible books
    manuscripts() {
      if (categories.is_teaching || categories.is_bible_book) return 8;
      return 6;
    },

    // row 7: arch_site — +2 flat; +8 for location-category articles with an
    // archaeology hit. Absorbs the old location_bonus key. No parable
    // exception (row 7 scores +2 for parables, same as the default).
    arch_site() {
      return categories.is_location ? 8 : 2;
    },

    // row 5: balanced_debate — base +6; doubled to +12 with 2+ named reps
    balanced_debate() {
      const base = 6;
      if ((rawSignals.balanced_debate_named || 0) >= 2) return base * 2;
      return base;
    },

    // row 4: commentaries — +1 per citation, capped +6, only parable/teaching
    commentaries() {
      if (!categories.is_parable && !categories.is_teaching) return 0;
      return 6;
    },

    // row 9: ancient_historians — +2 per source, capped +6; capped +3 for
    // parable articles (a lower, not higher, cap)
    ancient_historians() {
      return categories.is_parable ? 3 : 6;
    },

    // row 10: literary_analysis — +6 for parable/teaching/Bible-book, +4 else
    literary_analysis() {
      if (categories.is_teaching || categories.is_bible_book || categories.is_parable) {
        return 6;
      }
      return 4;
    },

    // row 13: maps_diagrams — +1 per, capped +2
    maps_diagrams: 2,

    // row 15: religious_art — does not fire for parable/teaching articles;
    // −1 if a picture with no diagram/map, +1 if picture AND diagram/map
    religious_art() {
      if (categories.is_parable || categories.is_teaching) return 0;
      if (!rawSignals.has_picture) return 0;
      return rawSignals.has_diagram_or_map ? 1 : -1;
    },

    // ── Negative, unconditional ────────────────────────────────────────────
    ot_nt_criticism: -6, // row 20: −3 per pattern, capped −6
    other_religion: -3, // row 18: flat
    no_bible_verse: -10, // row 25: flat
    gnostic_over_emphasis: -4, // row 16: −2 contextualised / −4 privileged, max −4

    // ── Negative, conditional ─────────────────────────────────────────────

    // row 17: confessional_balance — −3 outside interpretation sections,
    // −1 inside without an Evangelical contrast, 0 inside with one; 0 if no
    // critical scholar is cited at all
    confessional_balance() {
      if (!rawSignals.critical_scholar_hits) return 0;
      if (rawSignals.critical_outside_interp) return -3;
      if (rawSignals.evangelical_contrast) return 0;
      return -1;
    },

    // row 19: jesus_seminar — capped −6, × placement multiplier (truncated
    // toward zero), then a further −2 if balanced debate (row 5) scored 0
    jesus_seminar() {
      const base = -6;
      const mult = rawSignals.jesus_seminar_mult;
      let capped = mult == null ? base : Math.trunc(base * mult);
      if ((rawSignals.balanced_debate_hits || 0) === 0) capped += -2;
      return capped;
    },

    // row 22: supernatural_criticism — −2 per instance, capped −8; absorbs
    // the old miracle_criticism key — Miracle- and Passion-scoped
    supernatural_criticism() {
      if (!categories.is_miracle && !categories.is_passion) return 0;
      return -8;
    },

    // row 21: mythicist — capped −7, × placement multiplier (truncated
    // toward zero), then a further −2 if balanced debate (row 5) scored 0
    mythicist() {
      const base = -7;
      const mult = rawSignals.mythicist_mult;
      let capped = mult == null ? base : Math.trunc(base * mult);
      if ((rawSignals.balanced_debate_hits || 0) === 0) capped += -2;
      return capped;
    },

    // row 23: secular_materialist — −2 per term, capped −8; Miracle- and
    // Passion-scoped like row 22, but no placement multiplier
    secular_materialist() {
      if (!categories.is_miracle && !categories.is_passion) return 0;
      return -8;
    },

    // row 24: referencing_quality — tiered on ref_count, plus an independent
    // −1 for poor referencing (citation-needed banners etc.)
    referencing_quality() {
      const refs = rawSignals.ref_count;
      let tier = 0;
      if (refs === 0) tier = -9;
      else if (refs != null && refs <= 4) tier = 3;
      else if (refs != null && refs <= 9) tier = 1;
      const poorPenalty = rawSignals.poor_referencing ? -1 : 0;
      return tier + poorPenalty;
    },
  };

  const rule = rules[key];
  if (typeof rule === "function") return rule();
  if (typeof rule === "number") return rule;
  // Unknown key — should be caught during validation before this is called.
  return 0;
}

// ── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate a single contribution entry.
 *
 * @param {string} key - Signal key.
 * @param {number} contribution - Points earned.
 * @param {number} cap - Derived cap for this signal.
 * @param {string} title - Article title (for error messages).
 * @returns {{ valid: boolean, error: string|null }}
 */
function validateContribution(key, contribution, cap, title) {
  if (!KNOWN_SIGNAL_KEYS.has(key)) {
    return { valid: false, error: `${title}: unknown signal key "${key}"` };
  }

  // Cap of 0 means the signal's condition is not met for this article;
  // contribution must also be 0. Check this before magnitude (more specific).
  if (cap === 0 && contribution !== 0) {
    return {
      valid: false,
      error: `${title}: contribution ${contribution} on "${key}" but cap is 0 (condition not met)`,
    };
  }

  // |contribution| must be ≤ |cap|
  if (Math.abs(contribution) > Math.abs(cap)) {
    return {
      valid: false,
      error: `${title}: contribution ${contribution} exceeds cap ${cap} for "${key}"`,
    };
  }

  // contribution sign must match cap sign (or both zero)
  if (cap !== 0) {
    const contribSign = Math.sign(contribution);
    const capSign = Math.sign(cap);
    if (contribSign !== 0 && contribSign !== capSign) {
      return {
        valid: false,
        error: `${title}: contribution ${contribution} has wrong sign for "${key}" (cap = ${cap})`,
      };
    }
  }

  return { valid: true, error: null };
}

/**
 * Validate a complete article record from the export.
 *
 * @param {Object} article - Export article record.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateArticle(article) {
  const errors = [];

  // Required top-level fields
  if (!article.title || typeof article.title !== "string") {
    errors.push("article missing title");
  }
  if (!article.url || typeof article.url !== "string") {
    errors.push(`${article.title || "(unknown)"}: missing url`);
  }
  if (typeof article.ranking !== "number" || article.ranking < 1) {
    errors.push(`${article.title || "(unknown)"}: missing or invalid ranking`);
  }
  if (typeof article.net_score !== "number") {
    errors.push(`${article.title || "(unknown)"}: missing net_score`);
  }
  if (!article.contributions || typeof article.contributions !== "object") {
    errors.push(`${article.title || "(unknown)"}: missing contributions`);
  }
  if (!article.raw_signals || typeof article.raw_signals !== "object") {
    errors.push(`${article.title || "(unknown)"}: missing raw_signals`);
  }
  if (!article.categories || typeof article.categories !== "object") {
    errors.push(`${article.title || "(unknown)"}: missing categories`);
  }

  if (errors.length > 0) return { valid: false, errors };

  const title = article.title;
  const contributions = article.contributions;

  // Every contribution key must be one of the 25 known signals
  for (const key of Object.keys(contributions)) {
    if (!KNOWN_SIGNAL_KEYS.has(key)) {
      errors.push(`${title}: unknown signal key "${key}" in contributions`);
    }
  }

  if (errors.length > 0) return { valid: false, errors };

  // Derive caps and validate each contribution
  let sum = 0;
  const caps = {};

  for (const key of KNOWN_SIGNAL_KEYS) {
    const contribution = contributions[key] !== undefined ? contributions[key] : 0;
    const cap = deriveCap(key, article.categories, article.raw_signals);
    caps[key] = cap;

    const result = validateContribution(key, contribution, cap, title);
    if (!result.valid) {
      errors.push(result.error);
    }

    sum += contribution;
  }

  // Σcontributions must equal net_score
  if (sum !== article.net_score) {
    errors.push(
      `${title}: sum of contributions (${sum}) ≠ net_score (${article.net_score})`,
    );
  }

  return { valid: errors.length === 0, errors, caps };
}

// ── Slug generation ─────────────────────────────────────────────────────────

/**
 * Derive a URL-safe slug from a Wikipedia article title.
 *
 * @param {string} title
 * @returns {string}
 */
function slugFromTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

// ── Integrity checks ─────────────────────────────────────────────────────────

/**
 * Verify that every non-pending signal key has at least one article with a
 * non-zero contribution. Returns an array of keys that are all-zero (empty on
 * success). Pending keys are skipped because their real data isn't flowing yet.
 *
 * @param {Array<{article: Object}>} validatedArticles
 * @param {Set<string>} pendingKeys
 * @returns {string[]} Zeroed non-pending keys.
 */
function checkNonPendingSignalsNonZero(validatedArticles, pendingKeys) {
  const keyHasNonZero = new Map();
  for (const key of KNOWN_SIGNAL_KEYS) {
    if (!pendingKeys.has(key)) keyHasNonZero.set(key, false);
  }
  for (const { article } of validatedArticles) {
    const contributions = article.contributions;
    for (const key of keyHasNonZero.keys()) {
      if ((contributions[key] || 0) !== 0) {
        keyHasNonZero.set(key, true);
      }
    }
  }
  const zeroKeys = [];
  for (const [key, hasNonZero] of keyHasNonZero) {
    if (!hasNonZero) zeroKeys.push(key);
  }
  return zeroKeys;
}

// ── Main import logic ───────────────────────────────────────────────────────

/**
 * Parse CLI arguments (minimal, no external dependency).
 *
 * @param {string[]} argv
 * @returns {{ exportPath: string, publish: boolean }}
 */
function parseArgs(argv) {
  const args = { exportPath: null, publish: false, purgeMissing: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--export" && i + 1 < argv.length) {
      args.exportPath = argv[++i];
    } else if (argv[i] === "--publish") {
      args.publish = true;
    } else if (argv[i] === "--purge-missing") {
      args.purgeMissing = true;
    }
  }
  return args;
}

/**
 * Main entry point. Parses args, loads and validates the export JSON, then
 * runs a single transaction to upsert articles and replace their signals.
 */
function main() {
  const args = parseArgs(process.argv.slice(2));

  // SQLite disables foreign keys by default — re-confirm for safety so ON
  // DELETE CASCADE actually fires during the --purge-missing path.
  db.pragma("foreign_keys = ON");

  const exportPath =
    args.exportPath ||
    path.resolve(__dirname, "..", "..", "database", "scoring-export.json");

  console.log(`[wikipedia-import] Reading export: ${exportPath}`);

  if (!fs.existsSync(exportPath)) {
    console.error(`ERROR: Scoring export not found at ${exportPath}`);
    process.exit(1);
  }

  // ── Load and parse ──────────────────────────────────────────────────────
  let exportData;
  try {
    const raw = fs.readFileSync(exportPath, "utf8");
    exportData = JSON.parse(raw);
  } catch (err) {
    console.error(`ERROR: Failed to parse scoring export: ${err.message}`);
    process.exit(1);
  }

  // Validate meta
  if (!exportData.meta || !Array.isArray(exportData.articles)) {
    console.error("ERROR: Export missing meta or articles array.");
    process.exit(1);
  }

  const articles = exportData.articles;
  if (articles.length === 0) {
    console.error("ERROR: Export contains zero articles.");
    process.exit(1);
  }

  console.log(
    `[wikipedia-import] Export meta: ${exportData.meta.article_count} articles, generated ${exportData.meta.generated}`,
  );

  // ── Validate every article before any DB write ──────────────────────────
  console.log(`[wikipedia-import] Validating ${articles.length} articles...`);

  const validated = [];
  let allErrors = [];

  for (const article of articles) {
    const result = validateArticle(article);
    if (!result.valid) {
      allErrors = allErrors.concat(result.errors);
    } else {
      validated.push({ article, caps: result.caps });
    }
  }

  if (allErrors.length > 0) {
    console.error(`\nValidation FAILED — ${allErrors.length} error(s):`);
    for (const err of allErrors) {
      console.error(`  • ${err}`);
    }
    console.error("\nABORTING: no data written to database.");
    process.exit(1);
  }

  console.log(`[wikipedia-import] All ${validated.length} articles valid.`);

  // ── All-zero integrity check ─────────────────────────────────────────────
  const zeroKeys = checkNonPendingSignalsNonZero(validated, PENDING_SIGNAL_KEYS);
  if (zeroKeys.length > 0) {
    console.error(
      `\nIntegrity FAILED — ${zeroKeys.length} non-pending signal key(s) are all-zero across the entire corpus:`,
    );
    for (const key of zeroKeys) {
      console.error(`  • ${key}`);
    }
    console.error(
      "\nABORTING: a non-pending signal must not be all-zero. " +
        "If this key truly has no data, mark it pending in PENDING_SIGNAL_KEYS.",
    );
    process.exit(1);
  }

  // ── Upsert articles and replace signals (single transaction) ────────────
  console.log(`[wikipedia-import] Importing into database...`);

  const matchByUrl = db.prepare(`
    SELECT id, slug, wikipedia_article_title
    FROM wikipedia_articles
    WHERE wikipedia_article_url = ?
  `);

  const updateArticle = db.prepare(`
    UPDATE wikipedia_articles
    SET wikipedia_article_title = ?,
        wikipedia_article_rank_number = ?,
        scored_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const insertArticle = db.prepare(`
    INSERT INTO wikipedia_articles (slug, wikipedia_article_title, wikipedia_article_url, wikipedia_article_rank_number, published_draft, scored_at)
    VALUES (@slug, @title, @url, @rank, @published, CURRENT_TIMESTAMP)
  `);

  const deleteSignals = db.prepare(`
    DELETE FROM wikipedia_article_signals
    WHERE wikipedia_article_id = ?
  `);

  const insertSignal = db.prepare(`
    INSERT INTO wikipedia_article_signals (wikipedia_article_id, signal_key, contribution, cap)
    VALUES (@articleId, @key, @contribution, @cap)
  `);

  const publishDraft = args.publish ? 1 : 0;

  let updatedCount = 0;
  let createdCount = 0;
  let signalCount = 0;
  let purgedCount = 0;

  // URL set built before the transaction so the closure can reference it.
  const exportUrls = new Set(validated.map((v) => v.article.url));

  const txn = db.transaction(() => {
    for (const { article, caps } of validated) {
      const existing = matchByUrl.get(article.url);

      let articleId;
      if (existing) {
        // Update existing
        updateArticle.run(article.title, article.ranking, existing.id);
        articleId = existing.id;
        updatedCount++;
      } else {
        // Create new
        const slug = slugFromTitle(article.title);
        const result = insertArticle.run({
          slug,
          title: article.title,
          url: article.url,
          rank: article.ranking,
          published: publishDraft,
        });
        articleId = result.lastInsertRowid;
        createdCount++;
      }

      // Delete-and-reinsert signals for this article
      deleteSignals.run(articleId);

      const contributions = article.contributions;
      for (const key of KNOWN_SIGNAL_KEYS) {
        const contribution = contributions[key] !== undefined ? contributions[key] : 0;
        const cap = caps[key];

        insertSignal.run({
          articleId,
          key,
          contribution,
          cap,
        });
        signalCount++;
      }
    }

    // ── Purge / warn about DB articles absent from the export ──────────────
    const dbArticles = db
      .prepare("SELECT id, wikipedia_article_title, wikipedia_article_url FROM wikipedia_articles")
      .all();

    const absent = dbArticles.filter((row) => !exportUrls.has(row.wikipedia_article_url));
    if (absent.length > 0) {
      if (args.purgeMissing) {
        const purgeStmt = db.prepare("DELETE FROM wikipedia_articles WHERE id = ?");
        for (const row of absent) {
          console.warn(`  • Purging #${row.id}: ${row.wikipedia_article_title} (${row.wikipedia_article_url})`);
          purgeStmt.run(row.id);
          purgedCount++;
        }
        console.warn(`\n⚠  Purged ${purgedCount} article(s) absent from the export.`);
      } else {
        console.warn(
          `\n⚠  ${absent.length} article(s) in the database are absent from the export (not deleted):`,
        );
        for (const row of absent) {
          console.warn(`  • #${row.id}: ${row.wikipedia_article_title} (${row.wikipedia_article_url})`);
        }
      }
    }
  });

  txn();

  console.log(
    `[wikipedia-import] Updated: ${updatedCount} | Created: ${createdCount} | Signals written: ${signalCount}` +
      (purgedCount > 0 ? ` | Purged: ${purgedCount}` : ""),
  );

  console.log("\n[wikipedia-import] Done.");
}

// ── Export pure helpers for testing (SR-1: same-file exports pattern) ──────

module.exports = {
  deriveCap,
  validateContribution,
  validateArticle,
  slugFromTitle,
  KNOWN_SIGNAL_KEYS,
  PENDING_SIGNAL_KEYS,
  checkNonPendingSignalsNonZero,
  parseArgs,
};

// Only run main() when invoked directly (require.main === module).
if (require.main === module) {
  main();
}
