/**
 * wgt_security.js
 * Wrapper: binds #wgt-security traffic-light card → toggles #security-panel.
 * The detail UI (log rendering) is handled by widget_security.js private script.
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

const CARD_ID = 'wgt-security';
const PANEL_ID = 'security-panel';
const POLL_INTERVAL = 30000;

// START initSecurityWidget
export function initSecurityWidget() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const trigger = card.querySelector('.wgt-trigger');
    const light = card.querySelector('.traffic-light');
    const label = card.querySelector('.wgt-status-label');

    try {
        // Initial status poll
        fetchSecurityStatus(light, label);
        setInterval(() => fetchSecurityStatus(light, label), POLL_INTERVAL);

        if (trigger) {
            trigger.addEventListener('click', () => togglePanel(PANEL_ID, light, label));
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Init Error');
        console.error(`[Security Widget] Init failed: ${error.message}`);
    }
}
// END

// START fetchSecurityStatus
async function fetchSecurityStatus(light, label) {
    try {
        // Lean Passthrough: GET /api/admin/security/logs
        const res = await fetch('/api/admin/security/logs', {
            headers: { Authorization: 'Bearer ' + (sessionStorage.getItem('auth_token') || '') }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const critical = Array.isArray(data)
            ? data.filter(l => l.event_type === 'Honeypot' || l.event_type === 'LoginFail').length
            : 0;
        setStatus(light, label, critical > 0 ? 'warning' : 'active',
            critical > 0 ? `${critical} alerts` : 'Active');
    } catch (error) {
        // Stay green — offline doesn't mean insecure
        setStatus(light, label, 'active', 'Active');
        console.warn(`[Security Widget] Status poll failed: ${error.message}`);
    }
}
// END

// START togglePanel
function togglePanel(panelId, light, label) {
    const area = document.getElementById('detail-panel-area');
    const panel = document.getElementById(panelId);
    if (!area || !panel) return;

    const isOpen = panel.style.display !== 'none';
    document.querySelectorAll('.detail-panel').forEach(p => p.style.display = 'none');

    if (!isOpen) {
        area.style.display = 'block';
        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        area.style.display = 'none';
    }
}
// END

function setStatus(light, label, status, text) {
    if (light) light.className = `traffic-light status-${status}`;
    if (label) label.textContent = text;
}

document.addEventListener('DOMContentLoaded', initSecurityWidget);
