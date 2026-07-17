#!/usr/bin/env node
/**
 * Wikipedia scoring import — loads database/scoring-export.json (255 articles ×
 * 28 signal contributions) into wikipedia_articles + wikipedia_article_signals.
 *
 * Usage:
 *   cd api
 *   node scripts/import-wikipedia-scoring.js [--export <path>] [--publish]
 *
 * Options:
 *   --export <path>  Override the default path to the scoring export JSON.
 *   --publish        Create new articles with published_draft = 1 (default: 0).
 *                    Intended for the local smoke-test; deploy.sh calls without it.
 *
 * Design: single transaction, all-or-nothing (JS-2). Validates every article
 * record before writing — URL present, all 28 contribution keys known,
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

// ── 28 known signal keys (order matches the plan cap-derivation table) ──────

const KNOWN_SIGNAL_KEYS = new Set([
  "bible_verses",
  "narrative_interp_split",
  "manuscripts",
  "ante_nicene",
  "arch_site",
  "location_bonus",
  "historical_context",
  "journals",
  "books",
  "primary_quotes",
  "jewish_context",
  "balanced_debate",
  "commentaries",
  "ancient_historians",
  "wiki_quality",
  "niche_bonus",
  "confessional_balance",
  "gnostic_quoted",
  "poor_referencing",
  "jesus_seminar",
  "ot_nt_criticism",
  "supernatural_criticism",
  "passion_criticism",
  "miracle_criticism",
  "other_religion",
  "mythicist",
  "no_references",
  "no_bible_verse",
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
    // ── Positive, unconditional ────────────────────────────────────────────
    bible_verses: 9,
    narrative_interp_split: 3,
    ante_nicene: 6,
    historical_context: 2,
    journals: 5,
    books: 5,
    primary_quotes: 4,
    jewish_context: 4,
    ancient_historians: 3,
    wiki_quality: 1,

    // ── Positive, conditional ─────────────────────────────────────────────
    // manuscripts: base +6; ×2 (= +12) for teachings or Bible books
    // (rubric: "doubled for teachings/books of the Bible")
    manuscripts() {
      const base = 6;
      if (categories.is_teaching || categories.is_bible_book) return base * 2;
      return base;
    },

    // arch_site: +2 flat, but scores 0 for parables (rubric: "scores 0 for parables")
    arch_site() {
      if (categories.is_parable) return 0;
      return 2;
    },

    // location_bonus: +3 flat, but 0 unless the article is a location
    // (rubric: "location articles with an archaeology hit")
    location_bonus() {
      if (!categories.is_location) return 0;
      return 3;
    },

    // balanced_debate: base +3; ×2 (= +6) when 2+ named representatives cited
    // (rubric: "doubled when 2+ named representatives cited")
    balanced_debate() {
      const base = 3;
      if ((rawSignals.balanced_debate_named || 0) >= 2) return base * 2;
      return base;
    },

    // commentaries: +3 per, capped +3, but only for parables/teachings
    // (rubric: "only for parables/idioms/sayings/teachings")
    commentaries() {
      if (!categories.is_parable && !categories.is_teaching) return 0;
      return 3;
    },

    // niche_bonus: tiered — +3 if <5 refs; +1 if 5–9; 0 otherwise
    // (rubric: "tiered — protects short, well-researched niche topics")
    niche_bonus() {
      const refs = rawSignals.ref_count;
      if (refs == null) return 0;
      if (refs < 5) return 3;
      if (refs <= 9) return 1;
      return 0;
    },

    // ── Negative, unconditional ────────────────────────────────────────────
    confessional_balance: -3,
    gnostic_quoted: -1,
    poor_referencing: -1,
    ot_nt_criticism: -6,
    supernatural_criticism: -6,
    other_religion: -3,
    no_references: -8,
    no_bible_verse: -10,

    // ── Negative, conditional ─────────────────────────────────────────────

    // jesus_seminar: capped −6, × placement multiplier, truncated toward zero
    // (rubric: "x2 in data sections, x0.5 if interpretation-only")
    jesus_seminar() {
      const base = -6;
      const mult = rawSignals.jesus_seminar_mult;
      if (mult == null) return base;
      // Truncate toward zero: Math.trunc handles negative numbers correctly
      // e.g. Math.trunc(-6 * 0.5) = Math.trunc(-3) = -3
      return Math.trunc(base * mult);
    },

    // passion_criticism: capped −6, but Passion articles only
    passion_criticism() {
      if (!categories.is_passion) return 0;
      return -6;
    },

    // miracle_criticism: capped −6, but Miracle articles only
    miracle_criticism() {
      if (!categories.is_miracle) return 0;
      return -6;
    },

    // mythicist: capped −9, × placement multiplier, truncated toward zero
    // (rubric: "x2 in data sections, x0.5 if interpretation-only")
    mythicist() {
      const base = -9;
      const mult = rawSignals.mythicist_mult;
      if (mult == null) return base;
      // Truncate toward zero (−9 × 0.5 = −4.5 → −4)
      return Math.trunc(base * mult);
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

  // Every contribution key must be one of the 28 known signals
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

// ── Main import logic ───────────────────────────────────────────────────────

/**
 * Parse CLI arguments (minimal, no external dependency).
 *
 * @param {string[]} argv
 * @returns {{ exportPath: string, publish: boolean }}
 */
function parseArgs(argv) {
  const args = { exportPath: null, publish: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--export" && i + 1 < argv.length) {
      args.exportPath = argv[++i];
    } else if (argv[i] === "--publish") {
      args.publish = true;
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
        wikipedia_article_rank_number = ?
    WHERE id = ?
  `);

  const insertArticle = db.prepare(`
    INSERT INTO wikipedia_articles (slug, wikipedia_article_title, wikipedia_article_url, wikipedia_article_rank_number, published_draft)
    VALUES (@slug, @title, @url, @rank, @published)
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
  });

  txn();

  console.log(
    `[wikipedia-import] Updated: ${updatedCount} | Created: ${createdCount} | Signals written: ${signalCount}`,
  );

  // ── Warn about DB articles absent from the export ───────────────────────
  const exportUrls = new Set(validated.map((v) => v.article.url));
  const dbArticles = db
    .prepare("SELECT id, wikipedia_article_title, wikipedia_article_url FROM wikipedia_articles")
    .all();

  const absent = dbArticles.filter((row) => !exportUrls.has(row.wikipedia_article_url));
  if (absent.length > 0) {
    console.warn(
      `\n⚠  ${absent.length} article(s) in the database are absent from the export (not deleted):`,
    );
    for (const row of absent) {
      console.warn(`  • #${row.id}: ${row.wikipedia_article_title} (${row.wikipedia_article_url})`);
    }
  }

  console.log("\n[wikipedia-import] Done.");
}

// ── Export pure helpers for testing (SR-1: same-file exports pattern) ──────

module.exports = {
  deriveCap,
  validateContribution,
  validateArticle,
  slugFromTitle,
  KNOWN_SIGNAL_KEYS,
};

// Only run main() when invoked directly (require.main === module).
if (require.main === module) {
  main();
}
