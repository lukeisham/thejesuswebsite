/**
 * wgt_sources.js
 * Wrapper: binds #wgt-sources traffic-light card → toggles #sources-panel.
 * The detail UI is handled by the existing widget_sources.js private script.
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

const CARD_ID = 'wgt-sources';
const PANEL_ID = 'sources-panel';

// START initSourcesWidget
export function initSourcesWidget() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const trigger = card.querySelector('.wgt-trigger');
    const light = card.querySelector('.traffic-light');
    const label = card.querySelector('.wgt-status-label');

    try {
        // Poll source count for traffic light
        fetchSourceCount(light, label);

        if (trigger) {
            trigger.addEventListener('click', () => togglePanel(PANEL_ID, light, label));
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Init Error');
        console.error(`[Sources Widget] Init failed: ${error.message}`);
    }
}
// END

// START fetchSourceCount
async function fetchSourceCount(light, label) {
    try {
        // Lean Passthrough: GET /api/v1/sources
        const res = await fetch('/api/v1/sources');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const count = Array.isArray(data) ? data.length : 0;
        setStatus(light, label, count > 0 ? 'active' : 'idle', `${count} sources`);
    } catch (error) {
        setStatus(light, label, 'idle', 'Offline');
        console.warn(`[Sources Widget] Count fetch failed: ${error.message}`);
    }
}
// END

// START togglePanel
function togglePanel(panelId, light, label) {
    const area = document.getElementById('detail-panel-area');
    const panel = document.getElementById(panelId);
    if (!area || !panel) return;

    const isOpen = panel.style.display !== 'none';
    // Close all detail panels first
    document.querySelectorAll('.detail-panel').forEach(p => p.style.display = 'none');

    if (!isOpen) {
        area.style.display = 'block';
        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setStatus(light, label, 'active', 'Open');
    } else {
        area.style.display = 'none';
    }
}
// END

function setStatus(light, label, status, text) {
    if (light) light.className = `traffic-light status-${status}`;
    if (label) label.textContent = text;
}

// Wire close buttons
document.addEventListener('DOMContentLoaded', () => {
    initSourcesWidget();
    document.querySelectorAll('.detail-close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const panelId = btn.getAttribute('data-panel');
            const panel = document.getElementById(panelId);
            if (panel) panel.style.display = 'none';
            const anyVisible = [...document.querySelectorAll('.detail-panel')].some(p => p.style.display !== 'none');
            if (!anyVisible) {
                const area = document.getElementById('detail-panel-area');
                if (area) area.style.display = 'none';
            }
        });
    });
});
