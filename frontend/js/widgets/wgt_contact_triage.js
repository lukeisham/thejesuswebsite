/**
 * wgt_contact_triage.js
 * Function: Collation and summarization of contact messages
 * Absorbs: widget_contact.js
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

const CARD_ID = 'wgt-contact-triage';

// START initContactTriage
export function initContactTriage() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const trigger = card.querySelector('.wgt-trigger');
    const light = card.querySelector('.traffic-light');
    const label = card.querySelector('.wgt-status-label');
    const autoCheck = card.querySelector('.wgt-auto');
    let pollInterval = null;

    try {
        fetchTriageSummary(light, label);
        if (trigger) {
            trigger.addEventListener('click', () => fetchTriageSummary(light, label));
        }

        if (autoCheck) {
            autoCheck.addEventListener('change', () => {
                if (autoCheck.checked) {
                    if (!pollInterval) {
                        pollInterval = setInterval(() => fetchTriageSummary(light, label), 30000);
                    }
                } else {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            });
            if (autoCheck.checked) {
                pollInterval = setInterval(() => fetchTriageSummary(light, label), 30000);
            }
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Init Error');
        console.error(`[Contact Triage] Init failed: ${error.message}`);
    }
}
// END

// START fetchTriageSummary
async function fetchTriageSummary(light, label) {
    try {
        setStatus(light, label, 'active', 'Checking...');
        // Lean Passthrough: GET /api/v1/contact/triage
        const response = await fetch('/api/v1/contact/triage');
        const result = await response.json();

        if (response.ok) {
            const isWarning = (result.critical || 0) > 0;
            setStatus(light, label, isWarning ? 'warning' : 'active',
                `${result.new || 0} new, ${result.critical || 0} critical`);
        } else {
            throw new Error(result.message || 'Fetch failed');
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Fetch Error');
        console.error(`[Contact Triage] Fetch failed: ${error.message}`);
    }
}
// END

function setStatus(light, label, status, text) {
    if (light) light.className = `traffic-light status-${status}`;
    if (label) label.textContent = text;
}

document.addEventListener('DOMContentLoaded', initContactTriage);
