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
    const autoCheck = card.querySelector('.wgt-auto');
    let pollInterval = null;

    try {
        if (trigger) {
            trigger.addEventListener('click', () => handleChallengeSort(light, label));
        }

        if (autoCheck) {
            autoCheck.addEventListener('change', () => {
                if (autoCheck.checked) {
                    if (!pollInterval) {
                        pollInterval = setInterval(() => handleChallengeSort(light, label), 60000);
                    }
                } else {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            });
            // Initial state
            if (autoCheck.checked) {
                pollInterval = setInterval(() => handleChallengeSort(light, label), 60000);
            }
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
        const response = await fetch('/api/v1/tools/challenge/sort', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (response.ok) {
            setStatus(light, label, 'idle', 'Sort done');
        } else {
            throw new Error(result.message || 'Sort failed');
        }
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
