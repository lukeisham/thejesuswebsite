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

    try {
        fetchTriageSummary(light, label);
        if (trigger) {
            trigger.addEventListener('click', () => fetchTriageSummary(light, label));
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
        const mockResponse = { new: 3, critical: 1 };
        setStatus(light, label, mockResponse.critical > 0 ? 'warning' : 'active',
            `${mockResponse.new} new, ${mockResponse.critical} critical`);
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
