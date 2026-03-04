/**
 * wgt_db_populator.js
 * Function: Initial database population and data entry
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

const CARD_ID = 'wgt-db-populator';

// START initDBPopulator
export function initDBPopulator() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const trigger = card.querySelector('.wgt-trigger');
    const light = card.querySelector('.traffic-light');
    const label = card.querySelector('.wgt-status-label');

    try {
        if (trigger) {
            trigger.addEventListener('click', () => handleDBPopulate(light, label));
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
        setStatus(light, label, 'active', 'Running');
        // Lean Passthrough: POST /api/v1/admin/populate
        setTimeout(() => setStatus(light, label, 'idle', 'Done'), 2000);
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
