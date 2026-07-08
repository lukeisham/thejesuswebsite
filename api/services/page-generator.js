// page-generator.js — static page generator service.
//
// Reads the shared content-pages config, queries the DB for a published row,
// renders an escaped <head> SEO block, replaces the template's <!-- SEO -->
// placeholder, and writes the output file. No HTTP concerns — pure data layer.
//
// Exports: { generatePage(type, slug), removePage(type, slug), generateAll() }

const fs = require("fs");
const path = require("path");
const db = require("../config");
const { CONTENT_PAGES } = require("../config/content-pages");

const BASE_URL = "https://www.thejesuswebsite.org";

// ── HTML escaping ────────────────────────────────────────────────────────────

const ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

/**
 * Escape a value for safe interpolation into HTML attributes and text content.
 * Mirrors the frontend templates.js escape discipline.
 */
function escapeHTML(str) {
  if (typeof str !== "string") str = String(str ?? "");
  return str.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

/**
 * Truncate text to a maximum length, appending an ellipsis if needed.
 */
function truncate(text, maxLen) {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).trimEnd() + "\u2026";
}

// ── SEO block renderer ───────────────────────────────────────────────────────

/**
 * Build the complete <head> SEO replacement block for a content item.
 * This replaces the <!-- SEO --> placeholder in the template.
 *
 * @param {import('../config/content-pages').ContentPageConfig} config
 * @param {Object} row - The database row
 * @returns {string} HTML fragment for <head>
 */
function renderSeoBlock(config, row) {
  const title = row[config.titleColumn] || "";
  const description = config.descriptionColumn
    ? row[config.descriptionColumn] || ""
    : "";
  const ogImage = config.imageColumn ? row[config.imageColumn] || "" : "";
  const canonicalUrl = `${BASE_URL}${config.urlPattern}${encodeURIComponent(row.slug)}`;
  const datePublished = config.dateColumn ? row[config.dateColumn] : null;

  let html = "";

  // <title>
  html += `  <title>${escapeHTML(title)} — ${escapeHTML(config.sectionLabel)} — The Jesus Website</title>\n`;

  // Meta description
  if (description) {
    html += `  <meta name="description" content="${escapeHTML(truncate(description, 160))}">\n`;
  }

  // Open Graph
  html += `  <meta property="og:title" content="${escapeHTML(title)} — ${escapeHTML(config.sectionLabel)} — The Jesus Website">\n`;
  if (description) {
    html += `  <meta property="og:description" content="${escapeHTML(truncate(description, 160))}">\n`;
  }
  html += `  <meta property="og:type" content="article">\n`;
  html += `  <meta property="og:site_name" content="The Jesus Website">\n`;
  html += `  <meta property="og:url" content="${escapeHTML(canonicalUrl)}">\n`;
  if (ogImage) {
    html += `  <meta property="og:image" content="${escapeHTML(ogImage)}">\n`;
  }

  // Twitter Card
  html += `  <meta name="twitter:card" content="summary_large_image">\n`;

  // Canonical
  html += `  <link rel="canonical" href="${escapeHTML(canonicalUrl)}">\n`;

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": config.jsonLdType,
    headline: title,
    url: canonicalUrl,
  };
  if (description) jsonLd.description = truncate(description, 160);
  if (datePublished) jsonLd.datePublished = datePublished;
  if (config.jsonLdType === "ScholarlyArticle") {
    jsonLd.author = { "@type": "Person", name: "Luke Isham" };
  }
  if (
    config.jsonLdType === "BlogPosting" ||
    config.jsonLdType === "NewsArticle"
  ) {
    jsonLd.author = { "@type": "Person", name: "Luke Isham" };
  }
  html += `  <script type="application/ld+json">\n  ${JSON.stringify(jsonLd)}\n  </script>\n`;

  return html;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a static HTML page for a single published content item.
 * Reads the template, replaces the <!-- SEO --> placeholder with per-item
 * metadata, and writes the output file.
 *
 * @param {string} type - Content type key (e.g. "evidence", "blog-posts")
 * @param {string} slug - The item's URL slug
 * @returns {{ ok: boolean, path?: string, error?: string }}
 */
function generatePage(type, slug) {
  const config = CONTENT_PAGES[type];
  if (!config) {
    return { ok: false, error: `Unknown content type: ${type}` };
  }

  if (!slug || typeof slug !== "string") {
    return { ok: false, error: "A slug is required." };
  }

  // 1. Read the template.
  if (!fs.existsSync(config.templatePath)) {
    return {
      ok: false,
      error: `Template not found: ${config.templatePath}`,
    };
  }
  const template = fs.readFileSync(config.templatePath, "utf8");

  // 2. Check the placeholder exists (fail loudly if missing — JS-2).
  if (!template.includes("<!-- SEO -->")) {
    return {
      ok: false,
      error: `Template is missing the <!-- SEO --> placeholder: ${config.templatePath}`,
    };
  }

  // 3. Load the published row from the DB.
  const row = db
    .prepare(
      `SELECT * FROM ${config.table}
       WHERE ${config.slugColumn} = ?
         AND published_draft = 1
         ${config.extraWhere || ""}`,
    )
    .get(slug);

  if (!row) {
    return {
      ok: false,
      error: `No published row found for slug "${slug}" in ${config.table}`,
    };
  }

  // 4. Render the SEO block.
  const seoBlock = renderSeoBlock(config, row);

  // 5. Replace the placeholder and write the output file.
  const output = template.replace("<!-- SEO -->", seoBlock);
  const outputPath = path.join(config.outputDir, `${slug}.html`);

  // Ensure the output directory exists.
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  // Write atomically: write to temp file, then rename (JS-2: never leave a
  // half-written file if the process crashes mid-write).
  const tmpPath = outputPath + ".tmp";
  fs.writeFileSync(tmpPath, output, "utf8");
  fs.renameSync(tmpPath, outputPath);

  return { ok: true, path: outputPath };
}

/**
 * Remove a generated static page (called on unpublish).
 *
 * Refuses to remove reserved filenames ("index", "[slug]") so no caller can
 * ever unlink a static asset or template file (JS-2: defensive reject).
 *
 * @param {string} type - Content type key
 * @param {string} slug - The item's URL slug
 * @returns {{ ok: boolean, error?: string }}
 */
function removePage(type, slug) {
  const config = CONTENT_PAGES[type];
  if (!config) {
    return { ok: false, error: `Unknown content type: ${type}` };
  }

  if (!slug || typeof slug !== "string") {
    return { ok: false, error: "A slug is required." };
  }

  // Reject reserved filenames (JS-2: defensive reject — never unlink static
  // assets or templates through the remove-page path).
  if (slug === "index" || slug === "[slug]") {
    return {
      ok: false,
      error: `Refusing to remove reserved filename: ${slug}.html`,
    };
  }

  const outputPath = path.join(config.outputDir, `${slug}.html`);

  if (!fs.existsSync(outputPath)) {
    return { ok: true }; // Already gone — not an error.
  }

  fs.unlinkSync(outputPath);
  return { ok: true };
}

/**
 * Generate pages for all published content items across all types.
 * Returns a summary of successes and failures.
 *
 * @returns {{ generated: number, errors: string[] }}
 */
function generateAll() {
  let generated = 0;
  const errors = [];

  for (const type of Object.keys(CONTENT_PAGES)) {
    const config = CONTENT_PAGES[type];

    // Query all published slugs for this type.
    const rows = db
      .prepare(
        `SELECT ${config.slugColumn} AS slug
         FROM ${config.table}
         WHERE published_draft = 1
           AND ${config.slugColumn} IS NOT NULL
           ${config.extraWhere || ""}`,
      )
      .all();

    for (const row of rows) {
      const result = generatePage(type, row.slug);
      if (result.ok) {
        generated++;
      } else {
        errors.push(`${type}/${row.slug}: ${result.error}`);
      }
    }
  }

  return { generated, errors };
}

module.exports = { generatePage, removePage, generateAll };
