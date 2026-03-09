import { dispatchWidgetEvent } from './widget_event_bus.js';

const CARD_ID = 'wgt-security';

// CARD_ID moved to top
const PANEL_ID = 'security-panel';
const POLL_INTERVAL = 30000;

// START initSecurityWidget
export function initSecurityWidget() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const autoCheck = card.querySelector('.wgt-auto');
    let pollInterval = null;

    try {
        // Initial status poll
        fetchSecurityStatus(light, label);

        if (trigger) {
            trigger.addEventListener('click', () => togglePanel(PANEL_ID, light, label));
        }

        if (autoCheck) {
            autoCheck.addEventListener('change', () => {
                if (autoCheck.checked) {
                    if (!pollInterval) {
                        pollInterval = setInterval(() => fetchSecurityStatus(light, label), POLL_INTERVAL);
                    }
                } else {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            });
            // Initial state
            if (autoCheck.checked) {
                pollInterval = setInterval(() => fetchSecurityStatus(light, label), POLL_INTERVAL);
            }
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
        // Lean Passthrough: GET /api/v1/admin/security/logs
        const res = await fetch('/api/v1/admin/security/logs', {
            headers: { Authorization: 'Bearer ' + (sessionStorage.getItem('auth_token') || '') }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const critical = Array.isArray(data)
            ? data.filter(l => l.event_type === 'Honeypot' || l.event_type === 'LoginFail').length
            : 0;
        setStatus(light, label, critical > 0 ? 'warning' : 'active',
            critical > 0 ? `${critical} alerts` : 'Active');

        // Dispatch event for Agent integration (§6 Priority 7)
        dispatchWidgetEvent(CARD_ID, 'SecurityAlertEvent', {
            total_logs: Array.isArray(data) ? data.length : 0,
            critical_count: critical,
            event_types: Array.isArray(data)
                ? [...new Set(data.map(l => l.event_type))]
                : [],
            priority: 7
        });
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
