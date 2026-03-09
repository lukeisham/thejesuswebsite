/**
 * wgt_db_populator.js
 * Function: Initial database population and data entry
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 *
 * Orchestration:
 *   1. Fetch all 6 static list HTML pages in parallel
 *   2. Parse each with DOMParser via list_page_parser.js
 *   3. POST /api/v1/admin/populate with {wipe: true, records: [...]}
 *   4. Display result counts
 */

import { parseListPage } from '../lib/list_page_parser.js';
import { parseBibleRef } from '../lib/bible_ref_parser.js';
import { dispatchWidgetEvent } from './widget_event_bus.js';

const CARD_ID = 'wgt-db-populator';

// The 6 source pages to parse
const SOURCE_PAGES = [
    'list_miracles.html',
    'list_events.html',
    'list_people.html',
    'list_places.html',
    'list_ot_verses.html',
    'list_objects.html',
];

// START initDBPopulator
export function initDBPopulator() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const trigger = card.querySelector('.wgt-trigger');
    const light = card.querySelector('.traffic-light');
    const label = card.querySelector('.wgt-status-label');
    const autoCheck = card.querySelector('.wgt-auto');
    let pollInterval = null;

    try {
        if (trigger) {
            trigger.addEventListener('click', () => handleDBPopulate(light, label));
        }

        if (autoCheck) {
            autoCheck.addEventListener('change', () => {
                if (autoCheck.checked) {
                    if (!pollInterval) {
                        pollInterval = setInterval(() => handleDBPopulate(light, label), 300000);
                    }
                } else {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            });
            // Initial state
            if (autoCheck.checked) {
                pollInterval = setInterval(() => handleDBPopulate(light, label), 300000);
            }
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Init Error');
        console.error(`[DB Populator] Init failed: ${error.message}`);
    }
}
// END

// START handleDBPopulate
async function handleDBPopulate(light, label) {
    try {
        // ── Step 1: Fetch all 6 HTML pages in parallel ──────────────
        setStatus(light, label, 'active', 'Fetching pages...');

        const fetches = SOURCE_PAGES.map(async (page) => {
            try {
                const resp = await fetch(`/${page}`);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const html = await resp.text();
                return { page, html, error: null };
            } catch (err) {
                console.warn(`[DB Populator] Skipping ${page}: ${err.message}`);
                return { page, html: null, error: err.message };
            }
        });

        const results = await Promise.all(fetches);
        const skipped = results.filter(r => r.error);
        if (skipped.length > 0) {
            console.warn(`[DB Populator] Skipped ${skipped.length} pages:`, skipped.map(s => s.page));
        }

        // ── Step 2: Parse each page into records ────────────────────
        setStatus(light, label, 'active', 'Parsing...');
        const allRecords = [];

        for (const { page, html } of results) {
            if (!html) continue;
            try {
                const items = parseListPage(html, page);
                for (const item of items) {
                    // Build the payload item for the backend
                    const record = {
                        name: item.title,
                        category: item.category,
                        primary_verse_str: item.primaryRef || '',
                        secondary_verse_str: item.secondaryRef || null,
                        description: item.description,
                    };
                    allRecords.push(record);
                }
            } catch (err) {
                console.warn(`[DB Populator] Parse error for ${page}: ${err.message}`);
            }
        }

        if (allRecords.length === 0) {
            setStatus(light, label, 'error', 'No records parsed');
            console.error('[DB Populator] No records extracted from any page');
            return;
        }

        // ── Step 3: POST to backend ─────────────────────────────────
        setStatus(light, label, 'active', `Uploading ${allRecords.length} records...`);

        const response = await fetch('/api/v1/admin/populate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wipe: true,
                records: allRecords,
            }),
        });

        const result = await response.json();

        if (response.ok) {
            const msg = `Done: ${result.data?.successful ?? '?'}/${result.data?.total_requested ?? allRecords.length} records`;
            setStatus(light, label, 'idle', msg);

            // Dispatch event for Agent integration
            dispatchWidgetEvent(CARD_ID, 'DBPopulateEvent', {
                total_requested: result.data?.total_requested ?? allRecords.length,
                successful: result.data?.successful ?? 0,
                failed: result.data?.failed ?? 0,
                priority: 4,
            });

            if (result.data?.failed > 0) {
                console.warn(`[DB Populator] ${result.data.failed} records failed:`, result.data.errors);
            }
        } else {
            throw new Error(result.message || 'Populate failed');
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Error');
        console.error(`[DB Populator] Failed: ${error.message}`);
    }
}
// END

function setStatus(light, label, status, text) {
    if (light) light.className = `traffic-light status-${status}`;
    if (label) label.textContent = text;
}

document.addEventListener('DOMContentLoaded', initDBPopulator);
