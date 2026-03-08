/**
 * wgt_users.js
 * Wrapper: binds #wgt-users traffic-light card → toggles #users-panel.
 * The detail UI (user list + add form) is handled by widget_user_manager.js.
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

const CARD_ID = 'wgt-users';
const PANEL_ID = 'users-panel';

// START initUsersWidget
export function initUsersWidget() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const autoCheck = card.querySelector('.wgt-auto');
    let pollInterval = null;

    try {
        fetchUserCount(light, label);

        if (trigger) {
            trigger.addEventListener('click', () => togglePanel(PANEL_ID, light, label));
        }

        if (autoCheck) {
            autoCheck.addEventListener('change', () => {
                if (autoCheck.checked) {
                    if (!pollInterval) {
                        pollInterval = setInterval(() => fetchUserCount(light, label), 300000);
                    }
                } else {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            });
            // Initial state
            if (autoCheck.checked) {
                pollInterval = setInterval(() => fetchUserCount(light, label), 300000);
            }
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Init Error');
        console.error(`[Users Widget] Init failed: ${error.message}`);
    }
}
// END

// START fetchUserCount
async function fetchUserCount(light, label) {
    try {
        // Lean Passthrough: GET /api/v1/admin/users
        const res = await fetch('/api/v1/admin/users');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const count = Array.isArray(data) ? data.length : 0;
        setStatus(light, label, 'idle', `${count} users`);
    } catch (error) {
        setStatus(light, label, 'idle', 'Offline');
        console.warn(`[Users Widget] Count fetch failed: ${error.message}`);
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
        setStatus(light, label, 'active', 'Open');
    } else {
        area.style.display = 'none';
        fetchUserCount(light, label);
    }
}
// END

function setStatus(light, label, status, text) {
    if (light) light.className = `traffic-light status-${status}`;
    if (label) label.textContent = text;
}

document.addEventListener('DOMContentLoaded', initUsersWidget);
