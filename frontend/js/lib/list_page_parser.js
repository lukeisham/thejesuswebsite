/**
 * list_page_parser.js
 * Parses the 6 static list HTML pages into structured record objects
 * for the DB Populator widget.
 *
 * Three parsing strategies:
 *  1. Standard — miracles, events, people, objects
 *     <strong>Title</strong> <span class="label">Ref</span> — desc
 *  2. Places — no label span; refs embedded in description parentheses
 *     <strong>Title</strong> — desc (Lk 4:16–30)
 *  3. OT Verses — title IS the OT ref; NT secondary in description
 *     <strong>Isaiah 7:14</strong> — desc (Mt 1:23)
 */

import {
    parseBibleRef,
    splitMultipleRefs,
    extractParentheticalRefs,
} from './bible_ref_parser.js';

// ── Category mapping ──────────────────────────────────────────────
const CATEGORY_MAP = {
    'list_miracles.html': 'Event',
    'list_events.html':   'Event',
    'list_people.html':   'Person',
    'list_places.html':   'Location',
    'list_ot_verses.html':'Theme',
    'list_objects.html':  'Theme',
};

/**
 * Determine parsing strategy from the source filename.
 * @param {string} sourceFile — e.g. "list_places.html"
 * @returns {'standard'|'places'|'ot_verses'}
 */
function getStrategy(sourceFile) {
    if (sourceFile.includes('list_places'))    return 'places';
    if (sourceFile.includes('list_ot_verses')) return 'ot_verses';
    return 'standard';
}

/**
 * Strip HTML tags and collapse whitespace from a string.
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Get the description text from a <li> element, minus the title and label parts.
 * @param {Element} li
 * @returns {string}
 */
function getDescription(li) {
    // Clone and remove strong + label spans, then read remaining text
    const clone = li.cloneNode(true);
    const strongs = clone.querySelectorAll('strong');
    strongs.forEach(el => el.remove());
    const labels = clone.querySelectorAll('span.label');
    labels.forEach(el => el.remove());
    let text = stripHtml(clone.innerHTML);
    // Remove leading dash/em-dash separator
    text = text.replace(/^[\s—–\-]+/, '').trim();
    return text;
}

/**
 * Parse a list page HTML string into an array of record objects.
 *
 * @param {string} htmlString — raw HTML of the page
 * @param {string} sourceFile — filename, e.g. "list_miracles.html"
 * @returns {Array<{
 *   title: string,
 *   primaryRef: string|null,
 *   secondaryRef: string|null,
 *   description: string,
 *   category: string
 * }>}
 */
export function parseListPage(htmlString, sourceFile) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const strategy = getStrategy(sourceFile);
    const category = CATEGORY_MAP[sourceFile] || 'Theme';
    const items = [];

    // Select all <li> inside <ul class="record-list"> that are within
    // the main content area (skip sidebar nav lists which also use record-list)
    const allLists = doc.querySelectorAll('main ul.record-list, section ul.record-list');
    const listItems = [];
    allLists.forEach(ul => {
        ul.querySelectorAll(':scope > li').forEach(li => listItems.push(li));
    });

    for (const li of listItems) {
        try {
            const record = parseItem(li, strategy, category);
            if (record && record.title) {
                items.push(record);
            }
        } catch (err) {
            console.warn(`[ListParser] Skipping item: ${err.message}`);
        }
    }

    return items;
}

/**
 * Parse a single <li> element into a record object.
 *
 * @param {Element} li
 * @param {'standard'|'places'|'ot_verses'} strategy
 * @param {string} category
 * @returns {{title: string, primaryRef: string|null, secondaryRef: string|null, description: string, category: string}|null}
 */
function parseItem(li, strategy, category) {
    const strong = li.querySelector('strong');
    if (!strong) return null;

    const rawTitle = strong.textContent.trim();
    if (!rawTitle) return null;

    // Truncate to 80 chars (Record name max)
    const title = rawTitle.length > 80 ? rawTitle.slice(0, 80) : rawTitle;
    const description = getDescription(li);

    let primaryRef = null;
    let secondaryRef = null;

    if (strategy === 'standard') {
        // Extract from <span class="label">
        const label = li.querySelector('span.label');
        if (label) {
            const refText = label.textContent.trim();
            const refs = splitMultipleRefs(refText);
            if (refs.length >= 1) primaryRef = refs[0];
            if (refs.length >= 2) secondaryRef = refs[1];
        }
        // Also check description for parenthetical refs if no label found
        if (!primaryRef) {
            const parentRefs = extractParentheticalRefs(li.textContent);
            if (parentRefs.length >= 1) primaryRef = parentRefs[0];
            if (parentRefs.length >= 2) secondaryRef = parentRefs[1];
        }

    } else if (strategy === 'places') {
        // No label span — extract refs from description parentheses
        const parentRefs = extractParentheticalRefs(li.textContent);
        if (parentRefs.length >= 1) primaryRef = parentRefs[0];
        if (parentRefs.length >= 2) secondaryRef = parentRefs[1];

    } else if (strategy === 'ot_verses') {
        // Title IS the OT reference (e.g. "Isaiah 7:14")
        primaryRef = rawTitle;
        // Secondary refs come from parenthetical NT refs in description
        const parentRefs = extractParentheticalRefs(description);
        if (parentRefs.length >= 1) secondaryRef = parentRefs[0];
    }

    return {
        title,
        primaryRef,
        secondaryRef,
        description,
        category,
    };
}
