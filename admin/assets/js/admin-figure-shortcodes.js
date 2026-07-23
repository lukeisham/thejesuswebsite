// Pure [figure] shortcode parser/serializer, shared by the insert-image flow
// and the caption-editing panel so both write the exact same grammar as the
// public renderer (frontend/assets/js/utils/content-markers.js Step 2).
//
// No DOM, no globals beyond window.AdminFigureShortcodes — classic script,
// with a trailing module.exports guard so node --test can require the real
// file instead of a re-implemented copy.

// Runs as a classic script in the browser (window is the global) and via
// node --test under CommonJS (no window) — fall back to `global` there.
var globalScope = typeof window !== "undefined" ? window : global;

globalScope.AdminFigureShortcodes = {};

var AdminFigureShortcodes = globalScope.AdminFigureShortcodes;

// Mirrors content-markers.js exactly: src required, caption optional,
// align optional and restricted to left|right.
var FIGURE_RE = /\[figure\s+src="([^"]*)"(?:\s+caption="([^"]*)")?(?:\s+align="(left|right)")?\]/g;

/**
 * Decode the &quot; escaping used to keep captions from breaking out of the
 * shortcode's caption="..." attribute.
 *
 * @param {string} caption
 * @returns {string}
 */
function decodeCaption(caption) {
  if (!caption) return "";
  return caption.replace(/&quot;/g, '"');
}

/**
 * Escape double-quotes so a caption can't break out of caption="...".
 *
 * @param {string} caption
 * @returns {string}
 */
function encodeCaption(caption) {
  if (!caption) return "";
  return caption.replace(/"/g, "&quot;");
}

/**
 * Parse every [figure] shortcode in `text`, in document order.
 *
 * @param {string} text
 * @returns {Array<{src: string, caption: string, align: (string|null), start: number, end: number, raw: string}>}
 */
function parseFigures(text) {
  if (typeof text !== "string") return [];

  var figures = [];
  // Use a fresh RegExp each call — a shared /g literal carries lastIndex
  // state across call sites, which is exactly the kind of intermittent bug
  // that only shows up on the second figure of the second call.
  var re = new RegExp(FIGURE_RE.source, "g");
  var match;

  while ((match = re.exec(text)) !== null) {
    figures.push({
      src: match[1] || "",
      caption: decodeCaption(match[2] || ""),
      align: match[3] || null,
      start: match.index,
      end: match.index + match[0].length,
      raw: match[0],
    });
  }

  return figures;
}

/**
 * Build a [figure] shortcode string from src/caption/align.
 *
 * An empty/whitespace-only caption drops the caption= attribute entirely.
 * An align of "none", "", null, or undefined drops the align= attribute
 * entirely — align="none" must never be emitted, since the public
 * renderer's regex only accepts left|right and would leave it unmatched.
 *
 * @param {{src: string, caption?: string, align?: string}} figure
 * @returns {string}
 */
function buildFigureShortcode(figure) {
  figure = figure || {};
  var src = figure.src || "";
  var caption = (figure.caption || "").trim();
  var align = figure.align;

  var out = '[figure src="' + src + '"';
  if (caption) {
    out += ' caption="' + encodeCaption(caption) + '"';
  }
  if (align === "left" || align === "right") {
    out += ' align="' + align + '"';
  }
  out += "]";
  return out;
}

/**
 * Replace the shortcode at `figure`'s [start, end) span with a rebuilt
 * shortcode carrying the given caption/align, leaving the rest of `text`
 * byte-identical. Splice by offset, never by value — two figures can
 * legitimately share the same src.
 *
 * @param {string} text
 * @param {{src: string, start: number, end: number}} figure
 * @param {{caption?: string, align?: string}} updates
 * @returns {string}
 */
function replaceFigureAt(text, figure, updates) {
  updates = updates || {};
  var replacement = buildFigureShortcode({
    src: figure.src,
    caption: updates.caption,
    align: updates.align,
  });
  return text.slice(0, figure.start) + replacement + text.slice(figure.end);
}

/**
 * Remove the shortcode at `figure`'s [start, end) span from `text`.
 * If the shortcode occupies its own line (a newline immediately follows
 * its end), that single trailing newline is removed too so deletion
 * doesn't leave a blank paragraph behind.
 *
 * @param {string} text
 * @param {{start: number, end: number}} figure
 * @returns {string}
 */
function removeFigureAt(text, figure) {
  var end = figure.end;
  if (text.charAt(end) === "\n") {
    end += 1;
  }
  var spliced = text.slice(0, figure.start) + text.slice(end);
  // Paragraphs are separated by a blank line ("\n\n"). Removing a shortcode
  // that sat in its own paragraph, between two blank lines, would otherwise
  // leave a run of 3+ newlines (an empty paragraph) at the seam.
  return spliced.replace(/\n{3,}/g, "\n\n");
}

AdminFigureShortcodes.parseFigures = parseFigures;
AdminFigureShortcodes.buildFigureShortcode = buildFigureShortcode;
AdminFigureShortcodes.replaceFigureAt = replaceFigureAt;
AdminFigureShortcodes.removeFigureAt = removeFigureAt;
AdminFigureShortcodes.encodeCaption = encodeCaption;
AdminFigureShortcodes.decodeCaption = decodeCaption;

if (typeof module !== "undefined" && module.exports) {
  module.exports = AdminFigureShortcodes;
}
