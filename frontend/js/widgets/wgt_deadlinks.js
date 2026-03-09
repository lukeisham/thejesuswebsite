import { dispatchWidgetEvent } from './widget_event_bus.js';

const CARD_ID = 'wgt-deadlinks';

// CARD_ID moved to top
const PANEL_ID = 'deadlinks-panel';

// START initDeadlinksWidget
export function initDeadlinksWidget() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const autoCheck = card.querySelector('.wgt-auto');
    let pollInterval = null;

    try {
        // Mirror the run-deadlinks button's state to the traffic light
        watchScanButton(light, label);

        if (trigger) {
            trigger.addEventListener('click', () => togglePanel(PANEL_ID, light, label));
        }

        if (autoCheck) {
            autoCheck.addEventListener('change', () => {
                if (autoCheck.checked) {
                    if (!pollInterval) {
                        pollInterval = setInterval(() => {
                            const runBtn = document.getElementById('run-deadlinks');
                            if (runBtn && !runBtn.disabled) runBtn.click();
                        }, 300000);
                    }
                } else {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            });
            // Initial state
            if (autoCheck.checked) {
                pollInterval = setInterval(() => {
                    const runBtn = document.getElementById('run-deadlinks');
                    if (runBtn && !runBtn.disabled) runBtn.click();
                }, 300000);
            }
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Init Error');
        console.error(`[Deadlinks Widget] Init failed: ${error.message}`);
    }
}
// END

// START watchScanButton
// Observes the run-deadlinks button inside the panel so we can reflect
// its scanning state on the traffic light without touching widget_deadlinks.js.
function watchScanButton(light, label) {
    const observer = new MutationObserver(() => {
        const runBtn = document.getElementById('run-deadlinks');
        if (!runBtn) return;
        const isScanning = runBtn.disabled;
        setStatus(light, label, isScanning ? 'active' : 'idle',
            isScanning ? 'Scanning...' : 'Idle');

        // Dispatch event for Agent integration (§6 Priority 6)
        // Note: Actual dead count discovery happens in the detail script;
        // this wrapper notifies completion/status.
        dispatchWidgetEvent(CARD_ID, 'DeadlinksEvent', {
            scanning: isScanning,
            priority: 6
        });
    });

    // Observe the panel once it's injected
    const waitForPanel = setInterval(() => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) {
            observer.observe(panel, { attributes: true, subtree: true, attributeFilter: ['disabled'] });
            clearInterval(waitForPanel);
        }
    }, 500);
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
        setStatus(light, label, 'idle', 'Idle');
    }
}
// END

function setStatus(light, label, status, text) {
    if (light) light.className = `traffic-light status-${status}`;
    if (label) label.textContent = text;
}

document.addEventListener('DOMContentLoaded', initDeadlinksWidget);
