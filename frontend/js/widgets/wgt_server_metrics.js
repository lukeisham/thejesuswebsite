/**
 * wgt_server_metrics.js
 * Function: Monitor server metrics (CPU, Memory, Disk)
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

// START initServerMetrics
export function initServerMetrics(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (container.dataset.serverMetricsInit) return;
    container.dataset.serverMetricsInit = "true";

    try {
        container.innerHTML = `<p>Loading server metrics...</p>`;
        pollServerMetrics(container);
        // Set polling interval
        setInterval(() => pollServerMetrics(container), 30000);
    } catch (error) {
        container.innerHTML = `<div class="error-msg">Failed to init server metrics: ${error.message}</div>`;
    }
}
// END

// START pollServerMetrics
async function pollServerMetrics(container) {
    try {
        // Future fetch to /api/v1/metrics/server
        container.innerHTML = `
            <div class="m-svg-frame">
                <h3>Server Health</h3>
                <p>CPU: 12% | RAM: 1.2GB/4GB | Disk: OK</p>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="error-msg">Server metrics unavailable: ${error.message}</div>`;
    }
}
// END
