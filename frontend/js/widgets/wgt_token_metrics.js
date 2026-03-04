/**
 * wgt_token_metrics.js
 * Function: Monitor token usage metrics
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

const CARD_ID = 'wgt-token-metrics';

// START initTokenMetrics
export function initTokenMetrics() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const trigger = card.querySelector('.wgt-trigger');
    const light = card.querySelector('.traffic-light');
    const label = card.querySelector('.wgt-status-label');

    try {
        pollTokenUsage(light, label);
        setInterval(() => pollTokenUsage(light, label), 60000);
        if (trigger) {
            trigger.addEventListener('click', () => pollTokenUsage(light, label));
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Init Error');
        console.error(`[Token Metrics] Init failed: ${error.message}`);
    }
}
// END

// START pollTokenUsage
async function pollTokenUsage(light, label) {
    try {
        setStatus(light, label, 'active', 'Syncing...');
        // Lean Passthrough: GET /api/v1/metrics/tokens
        const mock = { used: 42000, limit: 1000000 };
        const pct = Math.round((mock.used / mock.limit) * 100);
        setStatus(light, label, pct > 80 ? 'warning' : 'active', `${pct}% used`);
    } catch (error) {
        setStatus(light, label, 'error', 'Fetch Error');
        console.error(`[Token Metrics] Poll failed: ${error.message}`);
    }
}
// END

function setStatus(light, label, status, text) {
    if (light) light.className = `traffic-light status-${status}`;
    if (label) label.textContent = text;
}

document.addEventListener('DOMContentLoaded', initTokenMetrics);
