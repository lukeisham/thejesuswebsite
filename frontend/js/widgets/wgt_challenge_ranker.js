/**
 * wgt_challenge_ranker.js
 * Function: UI for Challenge engine search/merge actions
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

const CARD_ID = 'wgt-challenge-engine';

// START initChallengeRanker
export function initChallengeRanker() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const trigger = card.querySelector('.wgt-trigger');
    const light = card.querySelector('.traffic-light');
    const label = card.querySelector('.wgt-status-label');

    try {
        if (trigger) {
            trigger.addEventListener('click', () => handleChallengeSort(light, label));
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Init Error');
        console.error(`[Challenge Ranker] Init failed: ${error.message}`);
    }
}
// END

// START handleChallengeSort
async function handleChallengeSort(light, label) {
    try {
        setStatus(light, label, 'active', 'Sorting...');
        // Lean Passthrough: POST /api/v1/tools/challenge/sort
        setTimeout(() => setStatus(light, label, 'idle', 'Sort done'), 1500);
    } catch (error) {
        setStatus(light, label, 'error', 'Sort Error');
        console.error(`[Challenge Ranker] Sort failed: ${error.message}`);
    }
}
// END

function setStatus(light, label, status, text) {
    if (light) light.className = `traffic-light status-${status}`;
    if (label) label.textContent = text;
}

document.addEventListener('DOMContentLoaded', initChallengeRanker);
