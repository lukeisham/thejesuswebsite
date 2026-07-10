#!/usr/bin/env node
// generate-sitemap.js — database-driven sitemap.xml generator.
//
// Queries every published content table for its slug + modification date,
// builds absolute https://www.thejesuswebsite.org/… URLs for all list and
// detail pages, and writes frontend/sitemap.xml. Uses only Node built-ins
// plus the existing better-sqlite3 config.
//
// Run:  npm run sitemap   or   node scripts/generate-sitemap.js
//
// This script is the source of truth for the sitemap. After this runs,
// the hand-maintained sitemap is replaced. robots.txt already points
// crawlers at /sitemap.xml.

const fs = require("fs");
const path = require("path");
const db = require("../config");

const BASE_URL = "https://thejesuswebsite.org";
const OUTPUT_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "frontend",
  "sitemap.xml",
);

/**
 * Escape XML special characters in text content.
 */
function xmlEscape(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Format a Date or date-like value as YYYY-MM-DD for sitemap <lastmod>.
 * Returns null if the value is not a valid date.
 */
function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// ── Section / index pages (static, no DB query) ──────────────────────────────

const SECTION_PAGES = [
  { loc: "/", priority: "1.0", changefreq: "weekly" },
  { loc: "/evidence/", priority: "0.9", changefreq: "weekly" },
  { loc: "/evidence/search.html", priority: "0.8", changefreq: "weekly" },
  { loc: "/evidence/arbor.html", priority: "0.7", changefreq: "monthly" },
  { loc: "/evidence/timeline/", priority: "0.7", changefreq: "monthly" },
  { loc: "/evidence/maps/", priority: "0.7", changefreq: "monthly" },
  {
    loc: "/evidence/maps/roman-empire.html",
    priority: "0.7",
    changefreq: "monthly",
  },
  { loc: "/evidence/maps/levant.html", priority: "0.7", changefreq: "monthly" },
  { loc: "/evidence/maps/judea.html", priority: "0.7", changefreq: "monthly" },
  {
    loc: "/evidence/maps/galilee.html",
    priority: "0.7",
    changefreq: "monthly",
  },
  {
    loc: "/evidence/maps/jerusalem.html",
    priority: "0.7",
    changefreq: "monthly",
  },
  {
    loc: "/evidence/maps/roman-empire/zoom-roman-empire.html",
    priority: "0.6",
    changefreq: "monthly",
  },
  {
    loc: "/evidence/maps/levant/zoom-levant.html",
    priority: "0.6",
    changefreq: "monthly",
  },
  {
    loc: "/evidence/maps/judea/zoom-judea.html",
    priority: "0.6",
    changefreq: "monthly",
  },
  {
    loc: "/evidence/maps/galilee/zoom-galilee.html",
    priority: "0.6",
    changefreq: "monthly",
  },
  {
    loc: "/evidence/maps/jerusalem/zoom-jerusalem.html",
    priority: "0.6",
    changefreq: "monthly",
  },
  { loc: "/contextual-essays/", priority: "0.7", changefreq: "monthly" },
  { loc: "/debate/", priority: "0.8", changefreq: "monthly" },
  { loc: "/news-and-blog/", priority: "0.8", changefreq: "weekly" },
  { loc: "/news-and-blog/blog/", priority: "0.7", changefreq: "weekly" },
  { loc: "/news-and-blog/news/", priority: "0.7", changefreq: "weekly" },
  { loc: "/resources/", priority: "0.6", changefreq: "monthly" },
  {
    loc: "/resources/sermons-and-sayings.html",
    priority: "0.5",
    changefreq: "monthly",
  },
  { loc: "/resources/parables.html", priority: "0.5", changefreq: "monthly" },
  { loc: "/resources/objects.html", priority: "0.5", changefreq: "monthly" },
  { loc: "/resources/people.html", priority: "0.5", changefreq: "monthly" },
  { loc: "/resources/sites.html", priority: "0.5", changefreq: "monthly" },
  { loc: "/resources/ot-verses.html", priority: "0.5", changefreq: "monthly" },
  {
    loc: "/resources/internal-witnesses.html",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    loc: "/resources/external-witnesses.html",
    priority: "0.5",
    changefreq: "monthly",
  },
  { loc: "/resources/places.html", priority: "0.5", changefreq: "monthly" },
  {
    loc: "/resources/world-events.html",
    priority: "0.5",
    changefreq: "monthly",
  },
  { loc: "/resources/miracles.html", priority: "0.5", changefreq: "monthly" },
  { loc: "/resources/events.html", priority: "0.5", changefreq: "monthly" },
  {
    loc: "/resources/apologetics.html",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    loc: "/resources/manuscripts.html",
    priority: "0.5",
    changefreq: "monthly",
  },
  { loc: "/resources/sources.html", priority: "0.5", changefreq: "monthly" },
  { loc: "/about.html", priority: "0.6", changefreq: "monthly" },
];

// ── Content type → URL mapping ───────────────────────────────────────────────
//
// URL patterns MUST match the frontend router (getResultUrl in search.js,
// getSegment-based URL parsing in each detail module).

const CONTENT_TYPES = [
  {
    table: "evidence",
    urlPrefix: "/evidence/single/",
    slugColumn: "slug",
    dateColumn: "updated_at",
    priority: "0.8",
  },
  {
    table: "context_essays",
    urlPrefix: "/contextual-essays/",
    slugColumn: "slug",
    dateColumn: "updated_at",
    priority: "0.7",
  },
  {
    table: "responses",
    urlPrefix: "/debate/responses/",
    slugColumn: "slug",
    dateColumn: "updated_at",
    priority: "0.7",
  },
  {
    table: "blog_posts",
    urlPrefix: "/news-and-blog/blog/",
    slugColumn: "slug",
    dateColumn: "updated_at",
    priority: "0.7",
  },
  {
    table: "historiography",
    urlPrefix: "/debate/historiography/",
    slugColumn: "slug",
    dateColumn: "updated_at",
    priority: "0.7",
  },
  {
    table: "challenges",
    urlPrefix: "/debate/popular-challenges/",
    slugColumn: "slug",
    dateColumn: null,
    priority: "0.7",
    extraWhere: "AND academic_popular = 'popular'",
  },
  {
    table: "challenges",
    urlPrefix: "/debate/academic-challenges/",
    slugColumn: "slug",
    dateColumn: null,
    priority: "0.7",
    extraWhere: "AND academic_popular = 'academic'",
  },
  {
    table: "news_articles",
    urlPrefix: "/news-and-blog/news/",
    slugColumn: "slug",
    dateColumn: null,
    priority: "0.7",
  },
];

// ── Build the sitemap ────────────────────────────────────────────────────────

function buildSitemap() {
  const urls = [];
  const today = new Date().toISOString().slice(0, 10);

  // 1. Section / index pages — use today as lastmod (they change with deploys).
  for (const page of SECTION_PAGES) {
    urls.push({
      loc: `${BASE_URL}${page.loc}`,
      lastmod: today,
      changefreq: page.changefreq,
      priority: page.priority,
    });
  }

  // 2. Detail pages from each content type.
  for (const type of CONTENT_TYPES) {
    const dateSelect = type.dateColumn
      ? `${type.dateColumn} AS mod_date`
      : "NULL AS mod_date";

    const rows = db
      .prepare(
        `SELECT ${type.slugColumn} AS slug, ${dateSelect}
         FROM ${type.table}
         WHERE published_draft = 1
           AND ${type.slugColumn} IS NOT NULL
           ${type.extraWhere || ""}`,
      )
      .all();

    for (const row of rows) {
      urls.push({
        loc: `${BASE_URL}${type.urlPrefix}${encodeURIComponent(row.slug)}`,
        lastmod: formatDate(row.mod_date) || today,
        priority: type.priority,
      });
    }
  }

  return urls;
}

function renderXml(urls) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const url of urls) {
    xml += "  <url>\n";
    xml += `    <loc>${xmlEscape(url.loc)}</loc>\n`;
    xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    if (url.changefreq) {
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    }
    if (url.priority) {
      xml += `    <priority>${url.priority}</priority>\n`;
    }
    xml += "  </url>\n";
  }

  xml += "</urlset>\n";
  return xml;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    console.error(`[sitemap] Output directory does not exist: ${dir}`);
    process.exit(1);
  }

  const urls = buildSitemap();
  const xml = renderXml(urls);

  fs.writeFileSync(OUTPUT_PATH, xml, "utf8");
  console.log(
    `[sitemap] Wrote ${urls.length} URLs to ${path.relative(process.cwd(), OUTPUT_PATH)}`,
  );
}

if (require.main === module) {
  main();
}

module.exports = { buildSitemap, renderXml, CONTENT_TYPES, SECTION_PAGES };
