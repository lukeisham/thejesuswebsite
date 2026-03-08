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

    const autoCheck = card.querySelector('.wgt-auto');
    let pollInterval = null;

    try {
        pollReflectionLogs(light, label);

        if (trigger) {
            trigger.addEventListener('click', () => pollReflectionLogs(light, label));
        }

        if (autoCheck) {
            autoCheck.addEventListener('change', () => {
                if (autoCheck.checked) {
                    if (!pollInterval) {
                        pollInterval = setInterval(() => pollReflectionLogs(light, label), 30000);
                    }
                } else {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            });
            // Initial state
            if (autoCheck.checked) {
                pollInterval = setInterval(() => pollReflectionLogs(light, label), 30000);
            }
        }
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
        const [traceRes, reflectRes] = await Promise.all([
            fetch('/api/v1/agent/trace'),
            fetch('/api/v1/agent/reflection')
        ]);

        if (traceRes.ok && reflectRes.ok) {
            const traceData = await traceRes.json();
            const reflectData = await reflectRes.json();
            setStatus(light, label, 'idle', 'Done');
            // Logic to display traceData.trace and reflectData.reflection could be added here
        } else {
            throw new Error('Fetch failed');
        }
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
