/**
 * wgt_spelling.js
 * Function: Real-time grammar and spell-check in dashboard
 * Absorbs: widget_spellcheck.js
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

const CARD_ID = 'wgt-spelling';

// START initSpellingChecker
export function initSpellingChecker() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const trigger = card.querySelector('.wgt-trigger');
    const light = card.querySelector('.traffic-light');
    const label = card.querySelector('.wgt-status-label');
    const autoCheck = card.querySelector('.wgt-auto');
    let pollInterval = null;

    // Also attach to CRUD essay/response textareas for real-time checking
    const textareas = document.querySelectorAll('#essay-body-input, #response-body-input');

    try {
        if (trigger) {
            trigger.addEventListener('click', () => runSpellCheck(light, label));
        }
        textareas.forEach(ta => ta.addEventListener('input', debounceSpellCheck));

        if (autoCheck) {
            autoCheck.addEventListener('change', () => {
                if (autoCheck.checked) {
                    if (!pollInterval) {
                        pollInterval = setInterval(() => runSpellCheck(light, label), 60000);
                    }
                } else {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            });
            // Initial state
            if (autoCheck.checked) {
                pollInterval = setInterval(() => runSpellCheck(light, label), 60000);
            }
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Init Error');
        console.error(`[Spelling] Init failed: ${error.message}`);
    }
}
// END

// START debounceSpellCheck
let _spellTimeout = null;
function debounceSpellCheck(event) {
    clearTimeout(_spellTimeout);
    _spellTimeout = setTimeout(async () => {
        try {
            const text = event.target.value;
            if (text.length > 5) {
                // Lean Passthrough: POST /api/v1/spelling/check
                const response = await fetch('/api/v1/spelling/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
                const result = await response.json();
                console.log('[Spelling] Check result:', result);
            }
        } catch (error) {
            console.error(`[Spelling] Debounce check failed: ${error.message}`);
        }
    }, 1000);
}
// END

// START runSpellCheck
async function runSpellCheck(light, label) {
    try {
        setStatus(light, label, 'active', 'Scanning');

        // Lean Passthrough: POST /api/v1/spelling/check-all
        const response = await fetch('/api/v1/spelling/check-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (response.ok) {
            const count = result.errors_count || 0;
            const status = count > 0 ? 'warning' : 'idle';
            const statusText = count > 0 ? `${count} Issues` : 'Clear';
            setStatus(light, label, status, statusText);
        } else {
            throw new Error(result.message || 'API Error');
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Error');
        console.error(`[Spelling] Scan failed: ${error.message}`);
    }
}
// END

function setStatus(light, label, status, text) {
    if (light) light.className = `traffic-light status-${status}`;
    if (label) label.textContent = text;
}

document.addEventListener('DOMContentLoaded', initSpellingChecker);
