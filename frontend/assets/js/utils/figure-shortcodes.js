/**
 * Shared [figure] shortcode grammar for frontend parsers.
 *
 * The pattern is the single source of truth for the grammar consumed by
 * both `content-markers.js` (public renderer) and `evidence-detail.js`
 * (pictures-section extraction) — before this module the same regex
 * literal existed twice and could silently drift.
 *
 * @module utils/figure-shortcodes
 */

const FIGURE_SHORTCODE_SOURCE =
  '\\[figure\\s+src="([^"]*)"(?:\\s+caption="([^"]*)")?(?:\\s+align="(left|right)")?\\]';

/**
 * A fresh `[figure]`-matching RegExp with the `g` flag. Returns a new
 * instance on every call — a shared module-level `/g` literal carries
 * `lastIndex` state across call sites, which is exactly the kind of
 * intermittent bug that would only show up on the second figure of the
 * second call.
 *
 * @returns {RegExp}
 */
export function FIGURE_SHORTCODE_PATTERN() {
  return new RegExp(FIGURE_SHORTCODE_SOURCE, "g");
}

/**
 * Parse every `[figure]` shortcode in `text`, in document order.
 *
 * @param {string} text
 * @returns {Array<{src: string, caption: string, align: (string|null)}>}
 */
export function parseFigureShortcodes(text) {
  if (typeof text !== "string") return [];

  const figures = [];
  const re = FIGURE_SHORTCODE_PATTERN();
  let match;

  while ((match = re.exec(text)) !== null) {
    figures.push({
      src: match[1] || "",
      caption: match[2] || "",
      align: match[3] || null,
    });
  }

  return figures;
}
