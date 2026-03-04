/**
 * wgt_research_suggest.js
 * Function: Dynamic search results for suggested resources
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

const CARD_ID = 'wgt-research-suggest';

// START initResearchSuggest
export function initResearchSuggest() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const trigger = card.querySelector('.wgt-trigger');
    const light = card.querySelector('.traffic-light');
    const label = card.querySelector('.wgt-status-label');

    try {
        if (trigger) {
            trigger.addEventListener('click', () => fetchSuggestions(light, label));
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Init Error');
        console.error(`[Research Suggest] Init failed: ${error.message}`);
    }
}
// END

// START fetchSuggestions
async function fetchSuggestions(light, label) {
    try {
        setStatus(light, label, 'active', 'Generating...');
        // Lean Passthrough: GET /api/v1/research/suggest
        setTimeout(() => setStatus(light, label, 'idle', 'Done'), 1500);
    } catch (error) {
        setStatus(light, label, 'error', 'Error');
        console.error(`[Research Suggest] Fetch failed: ${error.message}`);
    }
}
// END

function setStatus(light, label, status, text) {
    if (light) light.className = `traffic-light status-${status}`;
    if (label) label.textContent = text;
}

document.addEventListener('DOMContentLoaded', initResearchSuggest);
