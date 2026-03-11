/**
 * html_to_ascii.js
 * Function: Converts raw DOM nodes into clean plain text and ASCII diagrams for slide export.
 * Rules: Strict Interface, No Side Effects, Pure Functions Only
 */

// START htmlNodeToText
/**
 * Recursively converts a DOM node into a plain text / ASCII string.
 * This is the main entry point for element conversion.
 * @param {Node} node
 * @returns {string}
 */
export function htmlNodeToText(node) {
    if (!node) return '';

    // Text nodes: return their raw text value
    if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent.trim();
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();

    // Skip elements that should never appear in a slide
    if (['script', 'style', 'nav', 'footer', 'header', 'button'].includes(tag)) {
        return '';
    }

    // Headings: just extract the text (the caller handles heading-level logic)
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
        return node.innerText.trim();
    }

    // Paragraphs and divs: recurse through children and join
    if (['p', 'div', 'section', 'article', 'blockquote'].includes(tag)) {
        return childrenToText(node, '\n').trim();
    }

    // Unordered / ordered list
    if (tag === 'ul' || tag === 'ol') {
        return listToAscii(node, tag);
    }

    // List items (standalone)
    if (tag === 'li') {
        return `  - ${childrenToText(node, ' ').trim()}`;
    }

    // Tables: convert to ASCII grid
    if (tag === 'table') {
        return tableToAscii(node);
    }

    // Anchors: strip the link, keep the text
    if (tag === 'a') {
        return node.innerText.trim();
    }

    // Images: replace with a placeholder label
    if (tag === 'img') {
        const alt = node.getAttribute('alt');
        return alt ? `[Image: ${alt}]` : '[Image]';
    }

    // Strong / em: no special formatting for slides, just text
    if (['strong', 'b', 'em', 'i', 'span'].includes(tag)) {
        return childrenToText(node, '').trim();
    }

    // Fallback: recurse children
    return childrenToText(node, '\n').trim();
}
// END htmlNodeToText


// START childrenToText
/**
 * Iterates over a node's children and joins their text representations.
 * @param {Element} node
 * @param {string} separator
 * @returns {string}
 */
function childrenToText(node, separator) {
    return Array.from(node.childNodes)
        .map(child => htmlNodeToText(child))
        .filter(text => text.length > 0)
        .join(separator);
}
// END childrenToText


// START listToAscii
/**
 * Converts a <ul> or <ol> into an ASCII bulleted or numbered list.
 * @param {Element} listNode
 * @param {'ul' | 'ol'} type
 * @returns {string}
 */
function listToAscii(listNode, type) {
    const items = Array.from(listNode.querySelectorAll(':scope > li'));
    return items.map((li, idx) => {
        const text = childrenToText(li, ' ').trim();
        if (type === 'ol') {
            return `  ${idx + 1}. ${text}`;
        }
        return `  - ${text}`;
    }).join('\n');
}
// END listToAscii


// START tableToAscii
/**
 * Converts an HTML <table> to a simple ASCII grid.
 * Truncates cell content to 30 characters to keep columns tight.
 * @param {Element} tableNode
 * @returns {string}
 */
function tableToAscii(tableNode) {
    const rows = Array.from(tableNode.querySelectorAll('tr'));
    if (rows.length === 0) return '[Empty Table]';

    // Extract raw text to determine column widths
    const data = rows.map(row =>
        Array.from(row.querySelectorAll('th, td')).map(cell =>
            cell.innerText.trim().slice(0, 30)
        )
    );

    const colCount = Math.max(...data.map(row => row.length));
    const colWidths = Array.from({ length: colCount }, (_, colIdx) =>
        Math.max(...data.map(row => (row[colIdx] || '').length), 3)
    );

    const divider = '+' + colWidths.map(w => '-'.repeat(w + 2)).join('+') + '+';

    const lines = data.map((row, rowIdx) => {
        const cells = Array.from({ length: colCount }, (_, colIdx) => {
            const content = row[colIdx] || '';
            return ' ' + content.padEnd(colWidths[colIdx]) + ' ';
        });
        const rowLine = '|' + cells.join('|') + '|';
        return rowIdx === 0 ? [divider, rowLine, divider] : [rowLine];
    }).flat();

    return [divider, ...lines, divider].join('\n');
}
// END tableToAscii
