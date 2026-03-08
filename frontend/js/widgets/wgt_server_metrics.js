/**
 * wgt_server_metrics.js
 * Function: Monitor server metrics (CPU, Memory, Disk)
 * Absorbs: show_server_info.js
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

const CARD_ID = 'wgt-server-metrics';

// START initServerMetrics
export function initServerMetrics() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const trigger = card.querySelector('.wgt-trigger');
    const light = card.querySelector('.traffic-light');
    const label = card.querySelector('.wgt-status-label');
    const autoCheck = card.querySelector('.wgt-auto');
    let pollInterval = null;

    try {
        pollServerMetrics(light, label);

        if (trigger) {
            trigger.addEventListener('click', () => pollServerMetrics(light, label));
        }

        if (autoCheck) {
            autoCheck.addEventListener('change', () => {
                if (autoCheck.checked) {
                    if (!pollInterval) {
                        pollInterval = setInterval(() => pollServerMetrics(light, label), 30000);
                    }
                } else {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            });
            // Initial state
            if (autoCheck.checked) {
                pollInterval = setInterval(() => pollServerMetrics(light, label), 30000);
            }
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Init Error');
        console.error(`[Server Metrics] Init failed: ${error.message}`);
    }
}
// END

// START pollServerMetrics
async function pollServerMetrics(light, label) {
    try {
        setStatus(light, label, 'active', 'Pinging...');

        // Lean Passthrough: GET /api/v1/metrics/server
        const response = await fetch('/api/v1/metrics/server');
        const result = await response.json();

        if (response.ok) {
            setStatus(light, label, 'active', 'Monitoring');
            // result.cpu, result.memory, result.uptime available for UI labels if needed
        } else {
            throw new Error(result.message || 'Ping failed');
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Ping Error');
        console.error(`[Server Metrics] Poll failed: ${error.message}`);
    }
}
// END

function setStatus(light, label, status, text) {
    if (light) light.className = `traffic-light status-${status}`;
    if (label) label.textContent = text;
}

document.addEventListener('DOMContentLoaded', initServerMetrics);
