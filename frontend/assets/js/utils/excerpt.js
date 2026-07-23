/**
 * Plain-text-first excerpt builder for markdown blog bodies.
 *
 * blog_content is markdown, not HTML — stripping tags alone leaves raw
 * `##`, `**`, `|` table pipes and `[mla:N]` markers visible in summary
 * cards. renderExcerpt() removes shortcodes/block syntax, truncates the
 * remaining plain text at a word boundary, then applies **bold** / *italic*
 * formatting to what's left.
 *
 * Safety contract: the return value is safe to assign to `innerHTML`
 * because author text is HTML-escaped *before* any `<strong>`/`<em>` tags
 * are added — those two tags are the only markup this function can ever
 * emit. Callers must not concatenate anything else onto the result (JS-6).
 *
 * @module utils/excerpt
 */

function escapeHTML(str) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

/**
 * Strip block-level shortcodes/markers and markdown block syntax, leaving
 * plain text.
 *
 * @param {string} markdown
 * @returns {string}
 */
function stripToPlainText(markdown) {
  let text = markdown;

  // Shortcode markers
  text = text.replace(/\[figure[^\]]*\]/g, "");
  text = text.replace(/\[(?:mla|id):\d+\]/g, "");
  text = text.replace(/\[pullquote\]([\s\S]*?)\[\/pullquote\]/g, "$1");

  const lines = text.split("\n").filter((line) => {
    const trimmed = line.trim();
    // Drop table rows and separator/horizontal-rule lines
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) return false;
    if (/^\|?[\s\-:|]+\|?$/.test(trimmed) && trimmed.includes("-")) return false;
    return true;
  });

  text = lines
    .map((line) => {
      let l = line.trim();
      l = l.replace(/^#{1,3}\s+/, "");
      l = l.replace(/^[\-\*]\s+/, "");
      l = l.replace(/^\d+\.\s+/, "");
      return l;
    })
    .join(" ");

  // Collapse the paragraph-break token to a space, then all whitespace runs
  text = text.replace(/\\\\/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Truncate plain text to `maxLength` characters at a word boundary.
 *
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
function truncatePlain(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
}

/**
 * Apply **bold** / *italic* inline formatting to already-escaped text.
 *
 * @param {string} escaped
 * @returns {string}
 */
function formatInline(escaped) {
  let result = escaped.replace(/\*\*(.+?)\*\*/g, (_, t) => `<strong>${t}</strong>`);
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, (_, t) => `<em>${t}</em>`);
  // Any *  / ** left unmatched by truncation is a stray marker, not a tag —
  // drop it rather than showing raw asterisks in the excerpt.
  result = result.replace(/\*/g, "");
  return result;
}

/**
 * Build a formatted excerpt from raw markdown blog content.
 *
 * @param {string} markdown - Raw markdown source (e.g. post.blog_content).
 * @param {number} maxLength - Maximum plain-text character count.
 * @returns {string} Safe HTML string containing only text plus <strong>/<em>.
 */
export function renderExcerpt(markdown, maxLength) {
  if (typeof markdown !== "string" || markdown.length === 0) return "";

  const plain = stripToPlainText(markdown);
  if (plain.length === 0) return "";

  const truncated = truncatePlain(plain, maxLength);
  const escaped = escapeHTML(truncated);
  return formatInline(escaped);
}
