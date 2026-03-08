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
    const autoCheck = card.querySelector('.wgt-auto');
    let pollInterval = null;

    try {
        // Poll status on load
        fetchWikiStatus(light, label);

        if (trigger) {
            trigger.addEventListener('click', () => handleWikiSync(light, label));
        }

        if (autoCheck) {
            autoCheck.addEventListener('change', () => {
                if (autoCheck.checked) {
                    if (!pollInterval) {
                        pollInterval = setInterval(() => fetchWikiStatus(light, label), 60000);
                    }
                } else {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            });
            // Initial state
            if (autoCheck.checked) {
                pollInterval = setInterval(() => fetchWikiStatus(light, label), 60000);
            }
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
        const response = await fetch('/api/v1/tools/wiki/status');
        const result = await response.json();

        if (response.ok) {
            setStatus(light, label, result.running ? 'active' : 'idle',
                result.running ? 'Processing' : `Last: ${result.last_run}`);
        }
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
        const response = await fetch('/api/v1/tools/wiki/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();
        if (response.ok) {
            setStatus(light, label, 'idle', 'Sync done');
        } else {
            throw new Error(result.message || 'Sync failed');
        }
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
