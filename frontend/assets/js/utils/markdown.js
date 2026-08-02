/**
 * Minimal markdown-to-HTML renderer.
 *
 * Supports the subset needed by blog body content:
 *   - # / ## / ### headings
 *   - **bold**, *italic*, and `highlight`
 *   - \\ forced line break (renders as <br>; works anywhere inline text is
 *     processed — paragraphs, list items, headings, table cells. Two
 *     consecutive \\ \\ produce a blank line's worth of gap.)
 *   - Unordered lists (- or * prefix)
 *   - Ordered lists (1. prefix)
 *   - Pipe tables (optional `{w:N}` tokens in the separator row set
 *     proportional column widths, e.g. `|{w:2}---|---|` — see
 *     parseSeparatorCell(); optional `{colspan:N}`/`{rowspan:N}` tokens on a
 *     header/body cell merge it with adjacent `{continue}` cells — see
 *     resolveTableGrid())
 *   - Blockquotes (> prefix; consecutive > lines become one <blockquote>,
 *     each line its own paragraph — no nesting, no multi-line continuation)
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
 * Process inline formatting inside a line: **bold**, *italic*, and
 * `highlight`. Handles bold first (double asterisk) so bold-italic nesting
 * works. Escapes text inside tags.
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
  // Highlight: `text`
  result = result.replace(/`(.+?)`/g, (_, text) => {
    return `<span class="text-highlight">${escapePreservingMarkers(text)}</span>`;
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
 * Parse a pipe-table separator cell (e.g. `:---:`, `---:`, `{w:2}---`) into
 * its alignment and optional column-width weight.
 *
 * The `{w:N}` token (N a positive number, decimals allowed) may appear
 * anywhere in the cell alongside the usual `-`/`:` alignment markers.
 * Non-numeric, negative, or zero weights are treated as absent (JS-2) —
 * the column falls back to `auto` width.
 *
 * @param {string} cellText - Raw separator cell text (untrimmed).
 * @returns {{align: 'left'|'center'|'right', weight: number|null}}
 */
function parseSeparatorCell(cellText) {
  const cell = cellText.trim();

  let weight = null;
  const weightMatch = cell.match(/\{w:(\d+(?:\.\d+)?)\}/);
  if (weightMatch) {
    const parsed = parseFloat(weightMatch[1]);
    if (Number.isFinite(parsed) && parsed > 0) weight = parsed;
  }

  // Strip any {w:...} token (valid or not) before reading alignment markers.
  const withoutWeight = cell.replace(/\{w:[^}]*\}/, "").trim();

  let align = "left";
  if (withoutWeight.startsWith(":") && withoutWeight.endsWith(":")) align = "center";
  else if (withoutWeight.endsWith(":")) align = "right";

  return { align, weight };
}

/**
 * Convert per-column weights into rounded percentage widths. Columns with
 * no explicit weight share an implicit weight of 1. Returns `null` when no
 * column has an explicit weight (i.e. no width hints were given at all).
 *
 * @param {Array<number|null>} weights
 * @returns {Array<number>|null}
 */
function calculateColumnWidths(weights) {
  if (!weights.some((w) => w !== null)) return null;
  const effective = weights.map((w) => (w === null ? 1 : w));
  const sum = effective.reduce((a, b) => a + b, 0);
  return effective.map((w) => Math.round((w / sum) * 10000) / 100);
}

/**
 * Parse a pipe-table header/body cell for merged-cell tokens: `{colspan:N}`,
 * `{rowspan:N}`, and the bare `{continue}` placeholder that marks a grid
 * position swallowed by an adjacent merge.
 *
 * N must be a positive integer greater than 1 to take effect; non-numeric,
 * negative, zero, or `1` values degrade to no span (JS-2) — the same
 * defensive pattern as `parseSeparatorCell()`'s `{w:N}` handling.
 *
 * @param {string} cellText - Raw cell text (untrimmed).
 * @returns {{text: string, colspan: number, rowspan: number, isContinuation: boolean}}
 */
function parseCellSpanTokens(cellText) {
  const cell = cellText.trim();
  const isContinuation = cell === "{continue}";

  let colspan = 1;
  const colspanMatch = cell.match(/\{colspan:(\d+)\}/);
  if (colspanMatch) {
    const parsed = parseInt(colspanMatch[1], 10);
    if (Number.isFinite(parsed) && parsed > 1) colspan = parsed;
  }

  let rowspan = 1;
  const rowspanMatch = cell.match(/\{rowspan:(\d+)\}/);
  if (rowspanMatch) {
    const parsed = parseInt(rowspanMatch[1], 10);
    if (Number.isFinite(parsed) && parsed > 1) rowspan = parsed;
  }

  const text = cell
    .replace(/\{colspan:[^}]*\}/, "")
    .replace(/\{rowspan:[^}]*\}/, "")
    .replace(/\{continue\}/, "")
    .trim();

  return { text, colspan, rowspan, isContinuation };
}

/**
 * Build a per-row array of "slots" (one per grid column) describing how a
 * pipe-table row's raw cells resolve after the colspan pass. Each slot is
 * one of:
 *   - `{ kind: "owner", colIndex, colspan, rowspanIntent, text }` — a real
 *     cell, possibly swallowing `{continue}` cells to its right.
 *   - `{ kind: "absorbed-colspan", colIndex }` — a `{continue}` cell
 *     consumed by an owner to its left.
 *   - `{ kind: "continuation", colIndex }` — a `{continue}` cell not (yet)
 *     claimed by colspan; a candidate for the rowspan pass, or a stray
 *     placeholder that renders as an ordinary empty cell (JS-2).
 *
 * Rows shorter than `columnCount` are padded with empty cells, matching the
 * table's pre-existing tolerance for short rows.
 *
 * @param {Array<string>} rawCells
 * @param {number} columnCount
 * @returns {Array<object>}
 */
function buildRowSlots(rawCells, columnCount) {
  const parsed = Array.from({ length: columnCount }, (_, ci) =>
    parseCellSpanTokens(rawCells[ci] || ""),
  );
  const slots = new Array(columnCount);
  let ci = 0;
  while (ci < columnCount) {
    const cell = parsed[ci];
    if (cell.isContinuation) {
      slots[ci] = { kind: "continuation", colIndex: ci };
      ci++;
      continue;
    }
    let span = 1;
    while (
      span < cell.colspan &&
      ci + span < columnCount &&
      parsed[ci + span].isContinuation
    ) {
      span++;
    }
    // JS-3: colspan wins over rowspan when a cell declares both.
    const rowspanIntent = cell.colspan > 1 && cell.rowspan > 1 ? 1 : cell.rowspan;
    slots[ci] = { kind: "owner", colIndex: ci, colspan: span, rowspanIntent, text: cell.text };
    for (let k = 1; k < span; k++) {
      slots[ci + k] = { kind: "absorbed-colspan", colIndex: ci + k };
    }
    ci += span;
  }
  return slots;
}

/**
 * Resolve a pipe table's header + body rows into their final merged-cell
 * grid, in two passes: colspan (per row, via `buildRowSlots()`), then
 * rowspan (per column, top to bottom, body rows only — there is only ever
 * one header row, so a header rowspan is meaningless and ignored).
 *
 * A `{rowspan:N}` only takes effect over `{continue}` cells directly below
 * it at the same column; it clamps to however many consecutive `{continue}`
 * cells are actually present (JS-2), exactly like the colspan pass.
 *
 * @param {Array<string>} headerCells
 * @param {Array<Array<string>>} bodyRows
 * @returns {{header: Array<{text: string, colIndex: number, colspan: number}>,
 *            body: Array<Array<{text: string, colIndex: number, colspan: number, rowspan: number}>>}}
 */
function resolveTableGrid(headerCells, bodyRows) {
  const columnCount = headerCells.length;

  const headerSlots = buildRowSlots(headerCells, columnCount);
  const bodyRowSlots = bodyRows.map((row) => buildRowSlots(row, columnCount));

  // Rowspan pass — per column, top to bottom, body rows only.
  for (let colIndex = 0; colIndex < columnCount; colIndex++) {
    for (let ri = 0; ri < bodyRowSlots.length; ri++) {
      const slot = bodyRowSlots[ri][colIndex];
      if (slot.kind !== "owner") continue;
      let span = 1;
      while (
        span < slot.rowspanIntent &&
        ri + span < bodyRowSlots.length &&
        bodyRowSlots[ri + span][colIndex].kind === "continuation"
      ) {
        bodyRowSlots[ri + span][colIndex].kind = "absorbed-rowspan";
        span++;
      }
      slot.rowspan = span;
    }
  }

  const toRenderCells = (slots, includeRowspan) =>
    slots
      .filter((slot) => slot.kind === "owner" || slot.kind === "continuation")
      .map((slot) =>
        slot.kind === "owner"
          ? {
              text: slot.text,
              colIndex: slot.colIndex,
              colspan: slot.colspan,
              ...(includeRowspan ? { rowspan: slot.rowspan } : {}),
            }
          : {
              // Stray, unclaimed {continue} — renders as an ordinary empty cell.
              text: "",
              colIndex: slot.colIndex,
              colspan: 1,
              ...(includeRowspan ? { rowspan: 1 } : {}),
            },
      );

  return {
    header: toRenderCells(headerSlots, false),
    body: bodyRowSlots.map((slots) => toRenderCells(slots, true)),
  };
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
      if (nextLine.startsWith("|") && /^\|[\s\-:|{}.\w]+\|$/.test(nextLine)) {
        const headerCells = trimmed
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        const separatorCells = nextLine
          .split("|")
          .slice(1, -1)
          .map(parseSeparatorCell);
        const alignments = separatorCells.map((c) => c.align);
        const widths = calculateColumnWidths(separatorCells.map((c) => c.weight));

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
        const grid = resolveTableGrid(headerCells, bodyRows);

        // A colspanned cell's width is the sum of every column it spans.
        const cellStyle = (colIndex, colspan) => {
          const parts = [];
          const align = alignments[colIndex];
          if (align && align !== "left") parts.push(`text-align:${align}`);
          if (widths) {
            const w = widths.slice(colIndex, colIndex + colspan).reduce((a, b) => a + b, 0);
            parts.push(`width:${w}%`);
          }
          return parts.length ? ` style="${parts.join(";")}"` : "";
        };

        const cellAttrs = (colIndex, colspan, rowspan) => {
          const spanAttrs = [];
          if (colspan > 1) spanAttrs.push(`colspan="${colspan}"`);
          if (rowspan > 1) spanAttrs.push(`rowspan="${rowspan}"`);
          const prefix = spanAttrs.length ? ` ${spanAttrs.join(" ")}` : "";
          return prefix + cellStyle(colIndex, colspan);
        };

        const tableClass = widths ? "content-table content-table--fixed" : "content-table";
        let tableHtml = `<table class="${tableClass}"><thead><tr>`;
        for (const cell of grid.header) {
          tableHtml += `<th${cellAttrs(cell.colIndex, cell.colspan, 1)}>${formatInline(escapePreservingMarkers(cell.text))}</th>`;
        }
        tableHtml += "</tr></thead><tbody>";
        for (const row of grid.body) {
          tableHtml += "<tr>";
          for (const cell of row) {
            tableHtml += `<td${cellAttrs(cell.colIndex, cell.colspan, cell.rowspan)}>${formatInline(escapePreservingMarkers(cell.text))}</td>`;
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
      const items = [];
      while (i < lines.length && /^[\-\*]\s/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^[\-\*]\s+/, "");
        items.push(`<li>${formatInline(escapePreservingMarkers(itemText))}</li>`);
        i++;
      }
      output.push(`<ul>\n${items.join("\n")}\n</ul>`);
      continue;
    }

    // ── Ordered list ────────────────────────────────────────────────────
    if (/^\d+\.\s/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+\.\s+/, "");
        items.push(`<li>${formatInline(escapePreservingMarkers(itemText))}</li>`);
        i++;
      }
      output.push(`<ol>\n${items.join("\n")}\n</ol>`);
      continue;
    }

    // ── Blockquote ──────────────────────────────────────────────────────
    // Consecutive lines starting with ">" (optionally preceded by
    // whitespace) become one <blockquote>, each line its own paragraph.
    if (/^>/.test(trimmed)) {
      const quoteLines = [];
      while (i < lines.length && /^>/.test(lines[i].trim())) {
        const quoteText = lines[i].trim().replace(/^>\s?/, "");
        quoteLines.push(`<p>${formatInline(escapePreservingMarkers(quoteText))}</p>`);
        i++;
      }
      output.push(`<blockquote>\n${quoteLines.join("\n")}\n</blockquote>`);
      continue;
    }

    // ── Paragraph ───────────────────────────────────────────────────────
    // Collect consecutive non-blank, non-special lines into one paragraph
    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== "") {
      const line = lines[i].trim();
      // Stop if we hit a heading, list, table, or blockquote start
      if (
        line.startsWith("#") ||
        /^[\-\*]\s/.test(line) ||
        /^\d+\.\s/.test(line) ||
        /^>/.test(line) ||
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

  return output.join("\n\n");
}
