// Markdown parser tests — verifies renderMarkdown() produces correct HTML
// for headings, bold, italic, lists, tables, and paragraphs.
// Uses node:test + node:assert.
//
// Since renderMarkdown lives in a frontend ES module (not require-able from
// CommonJS), the function under test is reproduced inline here. Both copies
// must stay in sync — any change to frontend/assets/js/utils/markdown.js
// should be mirrored here.
//
// NOTE: this file is in api/tests/ because content-marker-payloads.test.js
// already covers a frontend-shared util in the same directory, establishing
// the convention.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── Markdown renderer (synced copy of frontend/assets/js/utils/markdown.js) ───

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

function escapePreservingMarkers(text) {
  const markers = [];
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

function formatInline(line) {
  let result = line.replace(/\*\*(.+?)\*\*/g, (_, text) => {
    return `<strong>${escapePreservingMarkers(text)}</strong>`;
  });
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, (_, text) => {
    return `<em>${escapePreservingMarkers(text)}</em>`;
  });
  return result;
}

function renderMarkdown(text) {
  if (typeof text !== "string") return "";

  const lines = text.split("\n");
  const output = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (trimmed === "") {
      i++;
      continue;
    }

    // Pipe table
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && (trimmed.match(/\|/g) || []).length >= 2) {
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : "";
      if (nextLine.startsWith("|") && /^\|[\s\-:|]+\|$/.test(nextLine)) {
        const headerCells = trimmed.split("|").slice(1, -1).map((c) => c.trim());
        const alignments = nextLine.split("|").slice(1, -1).map((c) => {
          const cell = c.trim();
          if (cell.startsWith(":") && cell.endsWith(":")) return "center";
          if (cell.endsWith(":")) return "right";
          return "left";
        });
        i += 2;
        const bodyRows = [];
        while (i < lines.length) {
          const bodyLine = lines[i].trim();
          if (bodyLine.startsWith("|") && bodyLine.endsWith("|")) {
            const cells = bodyLine.split("|").slice(1, -1).map((c) => c.trim());
            bodyRows.push(cells);
            i++;
          } else {
            break;
          }
        }
        let tableHtml = "<table><thead><tr>";
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

    // Headings
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

    // Unordered list
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

    // Ordered list
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

    // Paragraph
    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== "") {
      const line = lines[i].trim();
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
      output.push(`<p>${formatInline(escapePreservingMarkers(paraText))}</p>`);
    }
  }

  return output.join("\n");
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("renderMarkdown", () => {

  test("headings — h1, h2, h3", () => {
    const input = "# Top Heading\n\n## Section\n\n### Subsection\n\nSome text.";
    const result = renderMarkdown(input);
    assert.ok(result.includes("<h1>Top Heading</h1>"));
    assert.ok(result.includes("<h2>Section</h2>"));
    assert.ok(result.includes("<h3>Subsection</h3>"));
    assert.ok(result.includes("<p>Some text.</p>"));
  });

  test("bold and italic inline formatting", () => {
    const input = "This is **bold** and *italic* text.";
    const result = renderMarkdown(input);
    assert.ok(result.includes("<strong>bold</strong>"));
    assert.ok(result.includes("<em>italic</em>"));
  });

  test("bold-italic nesting: **text with *italic* inside**", () => {
    const input = "Outer **bold and *nested italic* here** end.";
    const result = renderMarkdown(input);
    assert.ok(result.includes("<strong>bold and"));
    assert.ok(result.includes("<em>nested italic</em>"));
  });

  test("unordered list with dashes", () => {
    const input = "- First item\n- Second item\n- Third item";
    const result = renderMarkdown(input);
    assert.ok(result.includes("<ul>"));
    assert.ok(result.includes("<li>First item</li>"));
    assert.ok(result.includes("<li>Second item</li>"));
    assert.ok(result.includes("<li>Third item</li>"));
    assert.ok(result.includes("</ul>"));
  });

  test("ordered list", () => {
    const input = "1. Alpha\n2. Beta\n3. Gamma";
    const result = renderMarkdown(input);
    assert.ok(result.includes("<ol>"));
    assert.ok(result.includes("<li>Alpha</li>"));
    assert.ok(result.includes("<li>Beta</li>"));
    assert.ok(result.includes("<li>Gamma</li>"));
    assert.ok(result.includes("</ol>"));
  });

  test("pipe table with header, separator, and body rows", () => {
    const input = "| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 25 |";
    const result = renderMarkdown(input);
    assert.ok(result.includes("<table>"));
    assert.ok(result.includes("<thead>"));
    assert.ok(result.includes("<th>Name</th>"));
    assert.ok(result.includes("<th>Age</th>"));
    assert.ok(result.includes("<td>Alice</td>"));
    assert.ok(result.includes("<td>30</td>"));
    assert.ok(result.includes("<td>Bob</td>"));
    assert.ok(result.includes("<td>25</td>"));
    assert.ok(result.includes("</table>"));
  });

  test("pipe table with alignment — right-aligned column", () => {
    const input = "| Item | Price |\n|------|------:|\n| Apple | 1.50 |";
    const result = renderMarkdown(input);
    // Verify right alignment is present on a table header cell
    assert.ok(result.includes('style="text-align:right"'), `expected text-align:right in output, got: ${result}`);
    // Verify it's on a <th>, not a <td>
    assert.ok(/<th[^>]*text-align:right/.test(result), `right alignment should be on a <th>, got: ${result}`);
  });

  test("paragraph with multiple lines", () => {
    const input = "Line one.\nLine two.\nLine three.";
    const result = renderMarkdown(input);
    assert.ok(result.includes("<p>Line one.\nLine two.\nLine three.</p>"));
  });

  test("shortcode markers pass through untouched", () => {
    const input = 'See [mla:1] for details and [figure src="/img.webp" caption="A caption"] here.';
    const result = renderMarkdown(input);
    assert.ok(result.includes("[mla:1]"));
    assert.ok(result.includes('[figure src="/img.webp" caption="A caption"]'));
    // Should be wrapped in a paragraph
    assert.ok(result.startsWith("<p>"));
  });

  test("HTML special characters are escaped", () => {
    const input = "Use <div> tags and & entities carefully.";
    const result = renderMarkdown(input);
    assert.ok(result.includes("&lt;div&gt;"));
    assert.ok(result.includes("&amp;"));
    assert.ok(!result.includes("<div>"));
  });

  test("pullquote shortcode passes through", () => {
    const input = "[pullquote]A memorable quote[/pullquote]";
    const result = renderMarkdown(input);
    assert.ok(result.includes("[pullquote]"));
    assert.ok(result.includes("[/pullquote]"));
  });

  test("empty string returns empty string", () => {
    assert.equal(renderMarkdown(""), "");
  });

  test("non-string returns empty string", () => {
    assert.equal(renderMarkdown(null), "");
    assert.equal(renderMarkdown(undefined), "");
    assert.equal(renderMarkdown(123), "");
  });
});
