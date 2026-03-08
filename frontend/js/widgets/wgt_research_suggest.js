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
    const autoCheck = card.querySelector('.wgt-auto');
    let pollInterval = null;

    try {
        if (trigger) {
            trigger.addEventListener('click', () => fetchSuggestions(light, label));
        }

        if (autoCheck) {
            autoCheck.addEventListener('change', () => {
                if (autoCheck.checked) {
                    if (!pollInterval) {
                        pollInterval = setInterval(() => fetchSuggestions(light, label), 300000);
                    }
                } else {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            });
            if (autoCheck.checked) {
                pollInterval = setInterval(() => fetchSuggestions(light, label), 300000);
            }
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
        const response = await fetch('/api/v1/research/suggest');
        const result = await response.json();

        if (response.ok) {
            setStatus(light, label, 'idle', 'Done');
            // Logic to display result.suggestions could be added here
        } else {
            throw new Error(result.message || 'Fetch failed');
        }
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
