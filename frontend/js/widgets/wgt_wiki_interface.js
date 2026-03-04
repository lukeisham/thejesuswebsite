/**
 * wgt_wiki_interface.js
 * Function: UI for Wikipedia engine search/merge actions
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

const CARD_ID = 'wgt-wiki-engine';

// START initWikiInterface
export function initWikiInterface() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const trigger = card.querySelector('.wgt-trigger');
    const light = card.querySelector('.traffic-light');
    const label = card.querySelector('.wgt-status-label');

    try {
        // Poll status on load
        fetchWikiStatus(light, label);

        if (trigger) {
            trigger.addEventListener('click', () => handleWikiSync(light, label));
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Init Error');
        console.error(`[Wiki Engine] Init failed: ${error.message}`);
    }
}
// END

// START fetchWikiStatus
async function fetchWikiStatus(light, label) {
    try {
        // Lean Passthrough: GET /api/v1/tools/wiki/status
        const mockStatus = { running: false, last_run: '2026-03-04' };
        setStatus(light, label, mockStatus.running ? 'active' : 'idle',
            mockStatus.running ? 'Processing' : `Last: ${mockStatus.last_run}`);
    } catch (error) {
        setStatus(light, label, 'error', 'Fetch Error');
        console.error(`[Wiki Engine] Status fetch failed: ${error.message}`);
    }
}
// END

// START handleWikiSync
async function handleWikiSync(light, label) {
    try {
        setStatus(light, label, 'active', 'Syncing...');
        // Lean Passthrough: POST /api/v1/tools/wiki/sync
        setTimeout(() => setStatus(light, label, 'idle', 'Sync done'), 2000);
    } catch (error) {
        setStatus(light, label, 'error', 'Sync Error');
        console.error(`[Wiki Engine] Sync failed: ${error.message}`);
    }
}
// END

function setStatus(light, label, status, text) {
    if (light) light.className = `traffic-light status-${status}`;
    if (label) label.textContent = text;
}

document.addEventListener('DOMContentLoaded', initWikiInterface);
