/**
 * wgt_agent_workflow.js
 * Function: Manage tasks, either based on priority or user input
 * Absorbs: show_queue.js
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

// START initAgentWorkflow
export function initAgentWorkflow() {
    const card = document.getElementById('wgt-agent-workflow');
    if (!card) return;
    if (card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const trigger = card.querySelector('.wgt-trigger');
    const light = card.querySelector('.traffic-light');
    const label = card.querySelector('.wgt-status-label');
    const autoCheck = card.querySelector('.wgt-auto');
    let pollInterval = null;

    try {
        // Poll the task queue on load
        fetchWorkflowQueue(light, label);

        if (trigger) {
            trigger.addEventListener('click', () => {
                runNextTask(light, label);
            });
        }

        if (autoCheck) {
            autoCheck.addEventListener('change', () => {
                // Auto mode: poll every 30s
                if (autoCheck.checked) {
                    if (!pollInterval) {
                        pollInterval = setInterval(() => fetchWorkflowQueue(light, label), 30000);
                    }
                } else {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            });
            // Initial state
            if (autoCheck.checked) {
                pollInterval = setInterval(() => fetchWorkflowQueue(light, label), 30000);
            }
        }
    } catch (error) {
        if (label) label.textContent = 'Error';
        if (light) { light.className = 'traffic-light status-error'; }
        console.error(`[Agent Workflow] Init failed: ${error.message}`);
    }
}
// END

// START fetchWorkflowQueue
async function fetchWorkflowQueue(light, label) {
    try {
        // Lean Passthrough to /api/v1/agent/queue
        const response = await fetch('/api/v1/agent/queue');
        const result = await response.json();

        if (response.ok) {
            setStatus(light, label, result.running > 0 ? 'active' : 'idle',
                result.running > 0 ? `Running (${result.pending} queued)` : `${result.pending} queued`);
        } else {
            throw new Error(result.message || 'Fetch failed');
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Fetch Error');
        console.error(`[Agent Workflow] Queue fetch failed: ${error.message}`);
    }
}
// END

// START runNextTask
async function runNextTask(light, label) {
    try {
        setStatus(light, label, 'active', 'Triggered');

        // POST to /api/v1/agent/queue/run-next
        const response = await fetch('/api/v1/agent/queue/run-next', {
            method: 'POST'
        });
        const result = await response.json();

        if (response.ok) {
            setTimeout(() => fetchWorkflowQueue(light, label), 1000);
        } else {
            throw new Error(result.message || 'Run failed');
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Run Error');
        console.error(`[Agent Workflow] Run task failed: ${error.message}`);
    }
}
// END


// START setStatus
function setStatus(light, label, status, text) {
    if (!light || !label) return;
    light.className = `traffic-light status-${status}`;
    label.textContent = text;
}
// END

document.addEventListener('DOMContentLoaded', initAgentWorkflow);
