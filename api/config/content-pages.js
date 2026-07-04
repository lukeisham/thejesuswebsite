// content-pages.js — single source of truth for publishable content types.
//
// Every entry maps a URL-friendly type key to its template, output directory,
// public URL pattern, and DB columns. Both the page generator and the sitemap
// generator consume this config so they never disagree on URLs or column names.
//
// Adding a new content type: add an entry here, then add its model to
// routes/publish.js MODELS map, and create its [slug].html template.

const path = require("path");

const FRONTEND_DIR = path.resolve(__dirname, "..", "..", "frontend");

/**
 * @typedef {Object} ContentPageConfig
 * @property {string} type          - URL-friendly type key (matches publish route)
 * @property {string} templatePath  - Absolute path to [slug].html template
 * @property {string} outputDir     - Absolute path to directory for generated files
 * @property {string} urlPattern    - Public URL prefix (e.g. "/evidence/single/")
 * @property {string} table         - Database table name
 * @property {string} slugColumn    - Column for the slug
 * @property {string} titleColumn   - Column for the page title
 * @property {string|null} descriptionColumn - Column for meta description (null if none)
 * @property {string|null} imageColumn - Column for OG image (null if none)
 * @property {string} sectionLabel  - Human-readable section name for <title> suffix
 * @property {string} jsonLdType    - Schema.org type for JSON-LD
 * @property {string|null} dateColumn - Column for datePublished (null if none)
 */

/** @type {Record<string, ContentPageConfig>} */
const CONTENT_PAGES = {
  evidence: {
    type: "evidence",
    templatePath: path.join(FRONTEND_DIR, "evidence", "single", "[slug].html"),
    outputDir: path.join(FRONTEND_DIR, "evidence", "single"),
    urlPattern: "/evidence/single/",
    table: "evidence",
    slugColumn: "slug",
    titleColumn: "title",
    descriptionColumn: "description",
    imageColumn: null,
    sectionLabel: "Evidence",
    jsonLdType: "CreativeWork",
    dateColumn: "created_at",
  },
  essays: {
    type: "essays",
    templatePath: path.join(FRONTEND_DIR, "contextual-essays", "[slug].html"),
    outputDir: path.join(FRONTEND_DIR, "contextual-essays"),
    urlPattern: "/contextual-essays/",
    table: "context_essays",
    slugColumn: "slug",
    titleColumn: "essay_title",
    descriptionColumn: null,
    imageColumn: null,
    sectionLabel: "Contextual Essays",
    jsonLdType: "ScholarlyArticle",
    dateColumn: "created_at",
  },
  responses: {
    type: "responses",
    templatePath: path.join(FRONTEND_DIR, "debate", "responses", "[slug].html"),
    outputDir: path.join(FRONTEND_DIR, "debate", "responses"),
    urlPattern: "/debate/responses/",
    table: "responses",
    slugColumn: "slug",
    titleColumn: "response_title",
    descriptionColumn: null,
    imageColumn: null,
    sectionLabel: "Response",
    jsonLdType: "ScholarlyArticle",
    dateColumn: "created_at",
  },
  historiography: {
    type: "historiography",
    templatePath: path.join(
      FRONTEND_DIR,
      "debate",
      "historiography",
      "[slug].html",
    ),
    outputDir: path.join(FRONTEND_DIR, "debate", "historiography"),
    urlPattern: "/debate/historiography/",
    table: "historiography",
    slugColumn: "slug",
    titleColumn: "essay_title",
    descriptionColumn: null,
    imageColumn: null,
    sectionLabel: "Historiography",
    jsonLdType: "ScholarlyArticle",
    dateColumn: "created_at",
  },
  "blog-posts": {
    type: "blog-posts",
    templatePath: path.join(
      FRONTEND_DIR,
      "news-and-blog",
      "blog",
      "[slug].html",
    ),
    outputDir: path.join(FRONTEND_DIR, "news-and-blog", "blog"),
    urlPattern: "/news-and-blog/blog/",
    table: "blog_posts",
    slugColumn: "slug",
    titleColumn: "blog_title",
    descriptionColumn: null,
    imageColumn: "hero_image",
    sectionLabel: "Blog",
    jsonLdType: "BlogPosting",
    dateColumn: "created_at",
  },
  "news-articles": {
    type: "news-articles",
    templatePath: path.join(
      FRONTEND_DIR,
      "news-and-blog",
      "news",
      "[slug].html",
    ),
    outputDir: path.join(FRONTEND_DIR, "news-and-blog", "news"),
    urlPattern: "/news-and-blog/news/",
    table: "news_articles",
    slugColumn: "slug",
    titleColumn: "news_article_title",
    descriptionColumn: null,
    imageColumn: null,
    sectionLabel: "News",
    jsonLdType: "NewsArticle",
    dateColumn: null,
  },
  "popular-challenges": {
    type: "popular-challenges",
    templatePath: path.join(
      FRONTEND_DIR,
      "debate",
      "popular-challenges",
      "[slug].html",
    ),
    outputDir: path.join(FRONTEND_DIR, "debate", "popular-challenges"),
    urlPattern: "/debate/popular-challenges/",
    table: "challenges",
    slugColumn: "slug",
    titleColumn: "challenge_title",
    descriptionColumn: "challenge_summary",
    imageColumn: null,
    sectionLabel: "Popular Challenge",
    jsonLdType: "Article",
    dateColumn: null,
    // challenges has an academic_popular discriminator
    extraWhere: "AND academic_popular = 'popular'",
  },
  "academic-challenges": {
    type: "academic-challenges",
    templatePath: path.join(
      FRONTEND_DIR,
      "debate",
      "academic-challenges",
      "[slug].html",
    ),
    outputDir: path.join(FRONTEND_DIR, "debate", "academic-challenges"),
    urlPattern: "/debate/academic-challenges/",
    table: "challenges",
    slugColumn: "slug",
    titleColumn: "challenge_title",
    descriptionColumn: "challenge_summary",
    imageColumn: null,
    sectionLabel: "Academic Challenge",
    jsonLdType: "Article",
    dateColumn: null,
    extraWhere: "AND academic_popular = 'academic'",
  },
};

module.exports = { CONTENT_PAGES };
