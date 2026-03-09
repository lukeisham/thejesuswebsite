import { dispatchWidgetEvent } from './widget_event_bus.js';

const CARD_ID_WIDGET = 'wgt-self-reflection';
const CARD_ID_EVENT = 'wgt-agent-reflection';

// CARD_ID removed

// START initSelfReflection
export function initSelfReflection() {
    const card = document.getElementById(CARD_ID_WIDGET);
    if (!card || card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const trigger = card.querySelector('.wgt-trigger');
    const light = card.querySelector('.traffic-light');
    const label = card.querySelector('.wgt-status-label');

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

            // Dispatch event for Agent integration (§6 Priority 5)
            dispatchWidgetEvent(CARD_ID_EVENT, 'ReflectionUpdateEvent', {
                has_trace: !!(traceData.steps || traceData.trace),
                has_reflection: !!reflectData.reflection,
                step_count: traceData.steps ? traceData.steps.length : 0,
                priority: 5
            });
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
