/**
 * wgt_token_metrics.js
 * Function: Monitor token usage metrics
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

import { dispatchWidgetEvent } from './widget_event_bus.js';

const CARD_ID = 'wgt-token-metrics';

// START initTokenMetrics
export function initTokenMetrics() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const trigger = card.querySelector('.wgt-trigger');
    const light = card.querySelector('.traffic-light');
    const label = card.querySelector('.wgt-status-label');
    const autoCheck = card.querySelector('.wgt-auto');
    let pollInterval = null;

    try {
        pollTokenUsage(light, label);

        if (trigger) {
            trigger.addEventListener('click', () => pollTokenUsage(light, label));
        }

        if (autoCheck) {
            autoCheck.addEventListener('change', () => {
                if (autoCheck.checked) {
                    if (!pollInterval) {
                        pollInterval = setInterval(() => pollTokenUsage(light, label), 30000);
                    }
                } else {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            });
            // Initial state
            if (autoCheck.checked) {
                pollInterval = setInterval(() => pollTokenUsage(light, label), 30000);
            }
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
        const response = await fetch('/api/v1/metrics/tokens');
        const result = await response.json();

        if (response.ok) {
            const used = result.used || 0;
            const limit = result.limit || 1;
            const pct = Math.round((used / limit) * 100);
            setStatus(light, label, pct > 80 ? 'warning' : 'active', `${pct}% used`);

            // Dispatch event for Agent integration (§6 Priority 1)
            dispatchWidgetEvent(CARD_ID, 'TokenMetricsEvent', {
                used: used,
                limit: limit,
                percent: pct,
                priority: 1
            });
        } else {
            throw new Error(result.message || 'Fetch failed');
        }
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
