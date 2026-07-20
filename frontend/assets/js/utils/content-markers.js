/**
 * Shared content-marker parser for body text across all five content types
 * (contextual essays, responses, historiography articles, blog posts, evidence)
 * plus evidence descriptions.
 *
 * Replaces local parseJournalBody / parseBlogBody / parseEvidenceBody
 * with one parser function. Parses block-level [figure] shortcodes and
 * inline [mla:N] / [id:N] markers into HTML.
 *
 * Accepts two input shapes:
 *   - **Raw text** (essays, responses, historiography, evidence) — every
 *     paragraph is HTML-escaped, wrapped in `<p>`, and inline markers are
 *     resolved inside the escaped text.
 *   - **Markdown-rendered HTML** (blog posts) — the text has already been
 *     through `renderMarkdown()`, so blocks start with `<p`, `<h1`–`<h3`,
 *     `<ul`, `<ol`, `<table`, or `<blockquote`. These blocks are passed
 *     through without re-escaping; `<p>` blocks have inline markers resolved
 *     on the inner (already-escaped) text. `<figure>` and `<aside>` blocks
 *     (produced by this parser's own shortcode expansion) are also passed
 *     through. If an inline `[figure ...]` shortcode expands *inside* a
 *     `<p>` block (i.e. it shared a markdown line with other prose), the
 *     resulting `<figure>` is extracted into its own sibling block —
 *     `<figure>` is a block element and cannot legally nest inside `<p>` —
 *     splitting the surrounding text into separate `<p>` blocks before and
 *     after it. A `<p>` whose entire content is a single `<figure>` (no
 *     other text on that line) is left nested exactly as-is, since there is
 *     no prose to split out.
 *
 * @module content-markers
 *
 * ## Marker Grammar
 *
 * ### Block-level (own paragraph)
 *   [figure src="/path/to/img.webp" caption="Alt text"]
 *   [figure src="/path/to/img.webp" caption="Alt text" align="right"]
 *   [figure src="/path/to/img.webp" caption="Alt text" align="left"]
 *
 * ### Inline (anywhere inside paragraph prose)
 *   [mla:N]  — superscript citation link (or parenthetical for blogs)
 *   [id:N]   — inline identifier badge
 *
 * ## Resolution
 * Markers are resolved against the arrays passed in options. A marker whose
 * id is not found in the linked set renders nothing (graceful degradation).
 *
 * ## Accessibility
 * Every <img> carries an alt attribute. Inline markers are wrapped with
 * hair-space `.sr-only` text nodes so Copy Contents produces readable output.
 *
 * @param {string} text - Raw body text, or markdown-rendered HTML with
 *   shortcode markers preserved.
 * @param {object} options
 * @param {Array<{id: number, citation?: string, author?: string, title?: string, ...}>} [options.mlaSources]
 * @param {Array<{id: number, label?: string, ...}>} [options.identifiers]
 * @param {'superscript'|'parenthetical'} [options.citationStyle='superscript']
 * @param {boolean} [options.pullQuotes=false] - Enable [pullquote] shortcode (blog only)
 * @returns {string} Safe HTML string
 */
export function parseContentBody(text, options = {}) {
  if (typeof text !== "string") return "";

  const {
    mlaSources = [],
    identifiers = [],
    citationStyle = "superscript",
    pullQuotes = false,
  } = options;

  // Build lookup maps keyed by id for O(1) marker resolution
  const mlaMap = new Map();
  for (const src of mlaSources) {
    if (src && typeof src.id === "number") mlaMap.set(src.id, src);
  }
  const idMap = new Map();
  for (const id of identifiers) {
    if (id && typeof id.id === "number") idMap.set(id.id, id);
  }

  let processed = text;

  // ── Step 1: Pull-quote shortcode (blog only) ─────────────────────────
  if (pullQuotes) {
    processed = processed.replace(
      /\[pullquote\]([\s\S]*?)\[\/pullquote\]/g,
      (_, content) =>
        `<aside class="pull-quote">${escapeHTML(content.trim())}</aside>`,
    );
  }

  // ── Step 2: Figure shortcode (block-level, own paragraph) ────────────
  processed = processed.replace(
    /\[figure\s+src="([^"]*)"(?:\s+caption="([^"]*)")?(?:\s+align="(left|right)")?\]/g,
    (_, src, caption, align) => {
      const cap = caption
        ? `<figcaption>${escapeHTML(caption)}</figcaption>`
        : "";
      const alt = escapeHTML(caption || "");

      let figureClass = "";
      if (align === "left") figureClass = ' class="figure-align-left"';
      else if (align === "right") figureClass = ' class="figure-align-right"';

      const safeSrc = escapeHTML(src);
      return `<figure${figureClass}><img src="${safeSrc}" alt="${alt}" loading="lazy">${cap}</figure>`;
    },
  );

  // ── Step 3: Split into paragraphs on blank lines ─────────────────────
  const paragraphs = processed.split(/\n\n+/).filter((p) => p.trim());

  // Blocks produced by renderMarkdown() — these start with an HTML tag
  // and must not be re-escaped.
  const MARKDOWN_TAGS = /^<(p|h[1-3]|ul|ol|table|blockquote)\b/;

  return paragraphs
    .map((p) => {
      const trimmed = p.trim();
      // Block elements that already render as blocks — pass through unchanged
      if (
        trimmed.startsWith("<figure") ||
        trimmed.startsWith("<aside")
      ) {
        return trimmed;
      }

      // Markdown-rendered blocks — already escaped by renderMarkdown,
      // must not be double-escaped (JS-2).
      const mdMatch = trimmed.match(MARKDOWN_TAGS);
      if (mdMatch) {
        const tag = mdMatch[1];
        // <p> blocks: resolve inline markers on the inner text
        if (tag === "p") {
          const inner = trimmed.slice(3, -4); // strip <p> and </p>
          const resolved = resolveInlineMarkers(
            inner,
            mlaMap,
            idMap,
            citationStyle,
          );
          // An inline [figure ...] shortcode (Step 2) may have expanded to
          // raw <figure> HTML inside this <p>. <figure> is a block element
          // and browsers auto-close the <p> when they hit it, producing
          // unpredictable rendering — split it out into a sibling block.
          if (resolved.includes("<figure")) {
            return splitParagraphAroundFigures(resolved);
          }
          return `<p>${resolved}</p>`;
        }
        // Other block types (h1-h3, ul, ol, table, blockquote):
        // pass through unchanged — inline markers inside headings/lists
        // are already resolved with escapePreservingMarkers in renderMarkdown.
        return trimmed;
      }

      // ── Step 4: Raw text path — escape then wrap ───────────────────
      const innerHTML = resolveInlineMarkers(
        escapeHTML(trimmed),
        mlaMap,
        idMap,
        citationStyle,
      ).replace(/\n/g, "<br>");

      return `<p>${innerHTML}</p>`;
    })
    .join("");
}

/**
 * Split a `<p>`-block's resolved inner HTML around any `<figure>...</figure>`
 * blocks it contains, so figures become standalone sibling blocks instead of
 * being nested inside `<p>` (invalid HTML — block content inside `<p>`).
 *
 * Text before/between/after figures is re-wrapped in its own `<p>` (empty
 * segments are dropped). If the content is a single figure with no
 * surrounding text at all, the original nested `<p><figure>...</figure></p>`
 * form is returned unchanged, since there is nothing to split out.
 *
 * @param {string} resolved - Inner HTML of a `<p>` block, markers already
 *   resolved, containing at least one `<figure>` tag.
 * @returns {string} Concatenated HTML blocks.
 */
function splitParagraphAroundFigures(resolved) {
  const FIGURE_RE = /<figure[^>]*>[\s\S]*?<\/figure>/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = FIGURE_RE.exec(resolved)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: resolved.slice(lastIndex, match.index) });
    }
    segments.push({ type: "figure", content: match[0] });
    lastIndex = FIGURE_RE.lastIndex;
  }
  if (lastIndex < resolved.length) {
    segments.push({ type: "text", content: resolved.slice(lastIndex) });
  }

  const hasSurroundingText = segments.some(
    (seg) => seg.type === "text" && seg.content.trim(),
  );
  if (!hasSurroundingText) {
    return `<p>${resolved}</p>`;
  }

  return segments
    .map((seg) => {
      if (seg.type === "figure") return seg.content;
      if (!seg.content.trim()) return "";
      return `<p>${seg.content}</p>`;
    })
    .join("");
}

// ─── Inline marker resolution ────────────────────────────────────────────────

/**
 * Find and replace [mla:N] and [id:N] markers within already-escaped text.
 * Markers whose id is not found render nothing (JS-2).
 *
 * Each marker is wrapped with invisible hair-space `.sr-only` nodes so
 * Copy Contents (footer.js `getStrippedBodyText`) renders readable text
 * with spaces around the marker label (e.g. "inscription 12" not "inscription12").
 * The `.sr-only` class has zero visual footprint (1px × 1px, clipped).
 *
 * @param {string} escapedText - Already HTML-escaped prose
 * @param {Map<number, object>} mlaMap
 * @param {Map<number, object>} idMap
 * @param {'superscript'|'parenthetical'} citationStyle
 * @returns {string} HTML with markers resolved
 */
function resolveInlineMarkers(escapedText, mlaMap, idMap, citationStyle) {
  // We use a regex that matches both [mla:N] and [id:N]. The text is already escaped
  // so the brackets are literal. N must be a positive integer.
  // When we replace, we re-insert the marker content as raw HTML (escaped where needed).

  const SPACER = '<span class="sr-only">&hairsp;</span>';

  return escapedText.replace(
    /\[(mla|id):(\d+)\]/g,
    (match, type, numStr) => {
      const n = parseInt(numStr, 10);

      if (type === "mla") {
        return resolveMlaMarker(n, mlaMap, citationStyle);
      }
      if (type === "id") {
        return resolveIdMarker(n, idMap);
      }

      // Unknown type — render nothing
      return "";
    },
  );
}

/**
 * Resolve an [mla:N] marker against the mlaSources lookup.
 */
function resolveMlaMarker(n, mlaMap, citationStyle) {
  const source = mlaMap.get(n);
  if (!source) return "";

  const author = formatMlaAuthor(source);

  if (citationStyle === "parenthetical") {
    // Blog style: inline parenthetical "(Author)"
    const label = author || `Source ${n}`;
    return `<span class="inline-citation inline-citation--parenthetical">(${escapeHTML(label)})</span>`;
  }

  // Superscript style: <sup> with anchor to bibliography
  const label = author
    ? escapeHTML(author)
    : String(n);
  return (
    `<span class="sr-only">&hairsp;</span>` +
    `<sup class="inline-citation"><a href="#mla-${n}">${label}</a></sup>` +
    `<span class="sr-only">&hairsp;</span>`
  );
}

/**
 * Resolve an [id:N] marker against the identifiers lookup.
 */
function resolveIdMarker(n, idMap) {
  const identifier = idMap.get(n);
  if (!identifier) return "";

  const label = getIdentifierLabel(identifier);
  if (!label) return "";

  return (
    `<span class="sr-only">&hairsp;</span>` +
    `<span class="inline-identifier">${escapeHTML(label)}</span>` +
    `<span class="sr-only">&hairsp;</span>`
  );
}

// ─── Identifier label formatting ─────────────────────────────────────────────

/**
 * Derive the most meaningful human-readable label from an identifier row.
 * Priority: manuscript_number, iaa_number, pleiades_name, source_title,
 * event_name, individual, isbn_book_title.
 *
 * Mirrors the label logic used in evidence-detail.js info-row rendering
 * so inline [id:N] badges read the same as the identifiers panel.
 *
 * @param {object} identifier
 * @returns {string}
 */
export function getIdentifierLabel(identifier) {
  if (!identifier) return "";
  return (
    identifier.manuscript_number ||
    identifier.iaa_number ||
    identifier.pleiades_name ||
    identifier.source_title ||
    identifier.event_name ||
    identifier.individual ||
    identifier.isbn_book_title ||
    identifier.label ||
    ""
  );
}

/**
 * Format a short author reference from an MLA source row.
 * Uses the author field most relevant to the source type.
 *
 * @param {object} source - Resolved mla_sources row
 * @returns {string}
 */
function formatMlaAuthor(source) {
  return (
    source.mla_book_author ||
    source.mla_journal_article_author ||
    source.mla_website_author ||
    ""
  );
}

// ─── HTML escaping ───────────────────────────────────────────────────────────

/**
 * Escape HTML special characters. Mirrors the local escapeHTML in every
 * detail script. The shared parser includes its own so callers don't need
 * to pass one in.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  if (typeof str !== "string") return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}
