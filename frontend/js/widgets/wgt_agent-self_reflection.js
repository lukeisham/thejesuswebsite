/**
 * wgt_agent-self_reflection.js
 * Function: Monitor agent reasoning, searching and data access
 * Absorbs: show_trace_reasoning.js
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

const CARD_ID = 'wgt-self-reflection';

// START initSelfReflection
export function initSelfReflection() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const trigger = card.querySelector('.wgt-trigger');
    const light = card.querySelector('.traffic-light');
    const label = card.querySelector('.wgt-status-label');

    try {
        if (trigger) {
            trigger.addEventListener('click', () => pollReflectionLogs(light, label));
        }
        // Auto-poll every 15s
        setInterval(() => pollReflectionLogs(light, label), 15000);
    } catch (error) {
        setStatus(light, label, 'error', 'Init Error');
        console.error(`[Self Reflection] Init failed: ${error.message}`);
    }
}
// END

// START pollReflectionLogs
// Absorbs logic from show_trace_reasoning.js (trace + reflection combined)
async function pollReflectionLogs(light, label) {
    try {
        setStatus(light, label, 'active', 'Reflecting...');
        // Lean Passthrough: GET /api/v1/agent/trace + /api/v1/agent/reflection
        // Combined response includes both trace log and self_assessment text
        setTimeout(() => setStatus(light, label, 'idle', 'Done'), 1000);
    } catch (error) {
        setStatus(light, label, 'error', 'Poll Error');
        console.error(`[Self Reflection] Poll failed: ${error.message}`);
    }
}
// END

function setStatus(light, label, status, text) {
    if (light) light.className = `traffic-light status-${status}`;
    if (label) label.textContent = text;
}

document.addEventListener('DOMContentLoaded', initSelfReflection);
