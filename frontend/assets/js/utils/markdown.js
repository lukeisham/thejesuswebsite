/**
 * Minimal markdown-to-HTML renderer.
 *
 * Supports the subset needed by blog body content:
 *   - # / ## / ### headings
 *   - **bold** and *italic*
 *   - \\ forced line break (renders as <br>; works anywhere inline text is
 *     processed — paragraphs, list items, headings, table cells. Two
 *     consecutive \\ \\ produce a blank line's worth of gap.)
 *   - Unordered lists (- or * prefix)
 *   - Ordered lists (1. prefix)
 *   - Pipe tables
 *   - Paragraphs (text blocks separated by blank lines)
 *
 * Shortcode markers ([figure ...], [mla:N], [pullquote], [id:N]) are
 * passed through untouched so that content-markers.js can resolve them
 * afterwards.
 *
 * Safe HTML: output is plain HTML tags only — user-supplied text is
 * HTML-escaped before being wrapped in markdown-generated tags. No raw
 * user input is interpolated as HTML (JS-6).
 *
 * @module utils/markdown
 */

/**
 * Escape HTML special characters but preserve bracket shortcode markers
 * ([figure ...], [mla:N], [id:N], [pullquote]...[/pullquote]) so that
 * content-markers.js can resolve them later.
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

/**
 * Extract bracket shortcode markers, escape the remaining text, then
 * restore markers. This prevents quote characters inside markers like
 * [figure src="/img.webp"] from being HTML-escaped.
 *
 * @param {string} text
 * @returns {string}
 */
function escapePreservingMarkers(text) {
  const markers = [];
  // Match: [mla:N], [id:N], [figure ...], [pullquote]...[/pullquote]
  const protected_ = text.replace(
    /(\[(?:mla|id):\d+\]|\[figure[^\]]*\]|\[pullquote\][\s\S]*?\[\/pullquote\])/g,
    (match) => {
      markers.push(match);
      return `\x00MARKER${markers.length - 1}\x00`;
    },
  );
  const escaped = escapeHTML(protected_);
  return escaped.replace(/\x00MARKER(\d+)\x00/g, (_, idx) => markers[parseInt(idx, 10)]);
}

/**
 * Process inline formatting inside a line: **bold** and *italic*.
 * Handles bold first (double asterisk) so bold-italic nesting works.
 * Escapes text inside tags.
 *
 * @param {string} line - A single line of text (already escaped)
 * @returns {string} HTML with inline formatting applied
 */
function formatInline(line) {
  // Bold: **text**
  let result = line.replace(/\*\*(.+?)\*\*/g, (_, text) => {
    return `<strong>${escapePreservingMarkers(text)}</strong>`;
  });
  // Italic: *text* (but not **)
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, (_, text) => {
    return `<em>${escapePreservingMarkers(text)}</em>`;
  });
  // Forced line break: \\ (runs last so a token adjacent to **bold**\\ is
  // not consumed by the emphasis regexes above). A single backslash is
  // left untouched (literal).
  result = result.replace(/\\\\/g, "<br>");
  return result;
}

/**
 * Strip trailing <br> tag(s) from the end of a block's inner HTML. A \\
 * token at the end of a paragraph/heading/list-item would otherwise leave
 * a stray empty line right before the closing tag.
 *
 * @param {string} html
 * @returns {string}
 */
function stripTrailingBreaks(html) {
  return html.replace(/(<br>)+$/, "");
}

/**
 * Render a markdown string to HTML.
 *
 * @param {string} text - Raw markdown text
 * @returns {string} Safe HTML string
 */
export function renderMarkdown(text) {
  if (typeof text !== "string") return "";

  const lines = text.split("\n");
  const output = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Blank line — skip
    if (trimmed === "") {
      i++;
      continue;
    }

    // ── Pipe table ──────────────────────────────────────────────────────
    // A pipe table starts with a line containing |, with at least two pipes
    // and content between them. Consume header row, separator row, then body rows.
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && (trimmed.match(/\|/g) || []).length >= 2) {
      // Must have a next line that is a separator row
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : "";
      if (nextLine.startsWith("|") && /^\|[\s\-:|]+\|$/.test(nextLine)) {
        const headerCells = trimmed
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        const alignments = nextLine
          .split("|")
          .slice(1, -1)
          .map((c) => {
            const cell = c.trim();
            if (cell.startsWith(":") && cell.endsWith(":")) return "center";
            if (cell.endsWith(":")) return "right";
            return "left";
          });

        i += 2; // Consume header + separator

        // Collect body rows
        const bodyRows = [];
        while (i < lines.length) {
          const bodyLine = lines[i].trim();
          if (bodyLine.startsWith("|") && bodyLine.endsWith("|")) {
            const cells = bodyLine
              .split("|")
              .slice(1, -1)
              .map((c) => c.trim());
            bodyRows.push(cells);
            i++;
          } else {
            break;
          }
        }

        // Build table HTML
        let tableHtml = '<table class="content-table"><thead><tr>';
        for (let ci = 0; ci < headerCells.length; ci++) {
          const align = alignments[ci];
          const style = align && align !== "left" ? ` style="text-align:${align}"` : "";
          tableHtml += `<th${style}>${formatInline(escapePreservingMarkers(headerCells[ci]))}</th>`;
        }
        tableHtml += "</tr></thead><tbody>";
        for (const row of bodyRows) {
          tableHtml += "<tr>";
          for (let ci = 0; ci < headerCells.length; ci++) {
            const align = alignments[ci];
            const style = align && align !== "left" ? ` style="text-align:${align}"` : "";
            tableHtml += `<td${style}>${formatInline(escapePreservingMarkers(row[ci] || ""))}</td>`;
          }
          tableHtml += "</tr>";
        }
        tableHtml += "</tbody></table>";
        output.push(tableHtml);
        continue;
      }
    }

    // ── Headings ────────────────────────────────────────────────────────
    if (trimmed.startsWith("### ")) {
      output.push(`<h3>${formatInline(escapePreservingMarkers(trimmed.slice(4)))}</h3>`);
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      output.push(`<h2>${formatInline(escapePreservingMarkers(trimmed.slice(3)))}</h2>`);
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      output.push(`<h1>${formatInline(escapePreservingMarkers(trimmed.slice(2)))}</h1>`);
      i++;
      continue;
    }

    // ── Unordered list ──────────────────────────────────────────────────
    if (/^[\-\*]\s/.test(trimmed)) {
      output.push("<ul>");
      while (i < lines.length && /^[\-\*]\s/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^[\-\*]\s+/, "");
        output.push(`<li>${formatInline(escapePreservingMarkers(itemText))}</li>`);
        i++;
      }
      output.push("</ul>");
      continue;
    }

    // ── Ordered list ────────────────────────────────────────────────────
    if (/^\d+\.\s/.test(trimmed)) {
      output.push("<ol>");
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+\.\s+/, "");
        output.push(`<li>${formatInline(escapePreservingMarkers(itemText))}</li>`);
        i++;
      }
      output.push("</ol>");
      continue;
    }

    // ── Paragraph ───────────────────────────────────────────────────────
    // Collect consecutive non-blank, non-special lines into one paragraph
    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== "") {
      const line = lines[i].trim();
      // Stop if we hit a heading, list, or table start
      if (
        line.startsWith("#") ||
        /^[\-\*]\s/.test(line) ||
        /^\d+\.\s/.test(line) ||
        (line.startsWith("|") && line.endsWith("|"))
      ) {
        break;
      }
      paraLines.push(line);
      i++;
    }
    if (paraLines.length > 0) {
      const paraText = paraLines.join("\n");
      const inner = stripTrailingBreaks(formatInline(escapePreservingMarkers(paraText)));
      output.push(`<p>${inner}</p>`);
    }
  }

  return output.join("\n");
}
