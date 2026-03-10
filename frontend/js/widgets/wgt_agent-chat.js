/**
 * wgt_agent-chat.js
 * Function: Create and manage agent chat sessions
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

// Global state for Agent context (§2.2)
const widgetState = {};

const WIDGET_EVENTS = [
    'TokenMetricsEvent', 'ContactTriageEvent', 'DraftCountsEvent',
    'WikiSyncEvent', 'WikiWeightsEvent', 'ResearchSuggestEvent',
    'ChallengeSortEvent', 'ReflectionUpdateEvent', 'WorkflowQueueEvent',
    'SpellingCompleteEvent', 'SourcesUpdateEvent', 'DeadlinksEvent',
    'NewsCompleteEvent', 'PageMetricsEvent', 'UsersUpdateEvent',
    'SecurityAlertEvent', 'ServerMetricsEvent'
];

// START initAgentChat
export function initAgentChat() {
    const chatPanel = document.getElementById('chat-messages');

    if (!chatPanel) return;

    if (chatPanel.dataset.chatInit) return;
    chatPanel.dataset.chatInit = "true";

    try {

        // Declared at try-block scope so both the keydown listener and the
        // click-to-focus handler can safely reference it.
        const inlineInput = document.getElementById('chat-inline-input');

        // --- Inline contenteditable input ---
        if (inlineInput) {
            inlineInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // Prevent newline insertion
                    handleInlineChatSubmit();
                }
            });
        }

        // Initialized Widget State Collector (§2.2)
        WIDGET_EVENTS.forEach(eventName => {
            window.addEventListener(eventName, (e) => {
                if (e.detail) {
                    // widget_event_bus.js sends 'widget' (not 'widgetId')
                    widgetState[e.detail.widget || eventName] = {
                        event: eventName,
                        data: e.detail,
                        priority: e.detail.priority || 8,
                        received_at: new Date().toISOString()
                    };
                    // Phase 5 — Check for priority alerts
                    checkAlertThresholds(eventName, e.detail);
                }
            });
        });

        // Click anywhere in chat area focuses the inline input
        chatPanel.addEventListener('click', (e) => {
            if (!inlineInput) return; // guard if element missing

            // Don't steal focus if user is selecting text in a message
            const selection = window.getSelection();
            if (selection && selection.toString().length > 0) return;

            // Don't refocus if clicking on a link or button inside chat
            if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;

            inlineInput.focus();

            // Place cursor at end of any existing text
            if (inlineInput.textContent.length > 0) {
                const range = document.createRange();
                range.selectNodeContents(inlineInput);
                range.collapse(false); // collapse to end
                selection.removeAllRanges();
                selection.addRange(range);
            }
        });

        // Auto-monitoring
        const autoCheck = document.querySelector('#wgt-core-agent .wgt-auto');
        let pollInterval = null;

        if (autoCheck) {
            const heartbeat = async () => {
                try {
                    const response = await fetch('/api/v1/agent/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: 'ping' })
                    });
                    if (response.ok) {
                        updateWidgetStatus('active', 'Online');
                    }
                } catch (e) {
                    updateWidgetStatus('error', 'Offline');
                }
            };

            autoCheck.addEventListener('change', () => {
                if (autoCheck.checked) {
                    if (!pollInterval) pollInterval = setInterval(heartbeat, 30000);
                } else {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            });

            if (autoCheck.checked) {
                pollInterval = setInterval(heartbeat, 30000);
            }
        }

        // Auto-focus the inline input when the dashboard loads
        setTimeout(() => {
            if (inlineInput) inlineInput.focus();
        }, 300);

    } catch (error) {
        console.error("Chat initialization failed:", error);
    }
}
// END

/** 
 * Helper to update the widget traffic light and status label
 * @param {'idle'|'active'|'error'|'warning'} status 
 * @param {string} label 
 */
function updateWidgetStatus(status, label) {
    const wgt = document.getElementById('wgt-core-agent');
    if (!wgt) return;

    const light = wgt.querySelector('.traffic-light');
    const labelEl = wgt.querySelector('.wgt-status-label');

    if (light) {
        light.className = `traffic-light status-${status}`;
    }
    if (labelEl) {
        labelEl.textContent = label;
    }
}

/**
 * Safely append a message to the chat history
 */
function appendMessage(role, text, isAgent = false) {
    const history = document.getElementById('chat-messages');
    if (!history) return;

    const msgDiv = createMessageElement(role, text, isAgent);
    const inlineInput = document.getElementById('chat-inline-input');

    if (inlineInput && inlineInput.parentNode === history) {
        history.insertBefore(msgDiv, inlineInput);
    } else {
        history.appendChild(msgDiv);
    }

    history.scrollTop = history.scrollHeight;
    return msgDiv;
}

/**
 * Helper to create a message element WITHOUT appending it
 */
function createMessageElement(role, text, isAgent = false) {
    const msgDiv = document.createElement('div');
    msgDiv.style.marginBottom = '8px';
    if (isAgent) {
        msgDiv.style.borderLeft = '2px solid var(--accent-color)';
        msgDiv.style.paddingLeft = '5px';
    }

    const roleStrong = document.createElement('strong');
    roleStrong.textContent = `${role}: `;

    const textSpan = document.createElement('span');
    textSpan.style.color = isAgent ? 'inherit' : '#555';
    textSpan.textContent = text;

    msgDiv.appendChild(roleStrong);
    msgDiv.appendChild(textSpan);
    return msgDiv;
}

// START handleInlineChatSubmit
async function handleInlineChatSubmit() {
    const inlineInput = document.getElementById('chat-inline-input');
    const history = document.getElementById('chat-messages');
    if (!inlineInput || !history) return;

    const message = inlineInput.textContent.trim();
    if (!message) return;

    // Clear the inline input
    inlineInput.textContent = '';

    // Append user message to chat
    appendMessage('Admin', message, false);

    // Scroll to bottom
    history.scrollTop = history.scrollHeight;

    // Show thinking indicator
    updateWidgetStatus('active', 'Thinking...');

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'agent-loading';
    loadingDiv.style.cssText = "margin-bottom:8px; border-left: 2px solid var(--accent-color); padding-left: 5px; color: #888;";
    loadingDiv.innerHTML = `<strong>Agent:</strong> Working...`;
    // Insert loading indicator BEFORE the inline input (so input stays at bottom)
    history.insertBefore(loadingDiv, inlineInput);

    // Detect interaction mode
    const mode = detectInteractionMode(message);

    try {
        const response = await fetch('/api/v1/agent/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                interaction_mode: mode,
                widget_context: widgetState
            })
        });

        const result = await response.json();
        loadingDiv.remove();

        if (response.ok) {
            updateWidgetStatus('active', 'Online');
            // Insert agent response BEFORE the inline input
            const agentMsg = createMessageElement('Agent', result.response, true);
            history.insertBefore(agentMsg, inlineInput);

            if (result.action) {
                handleAgentAction(result);
            }

            if (result.data) {
                pushToViewer(result.data);
            }
        } else {
            updateWidgetStatus('error', 'Error');
            const errMsg = createMessageElement('Agent', 'Sorry, something went wrong. Please try again.', true);
            history.insertBefore(errMsg, inlineInput);
        }
    } catch (error) {
        if (loadingDiv.parentNode) loadingDiv.remove();
        updateWidgetStatus('error', 'Offline');
        const errMsg = createMessageElement('Agent', 'Unable to reach the agent. Check your connection.', true);
        history.insertBefore(errMsg, inlineInput);
    }

    // Keep input visible and scrolled into view
    history.scrollTop = history.scrollHeight;
    inlineInput.focus();
}

/**
 * Detects the interaction mode based on §7 of agent_guide.yml
 * @param {string} msg 
 * @returns {'execution'|'collaborative'|'review'|'monitor'}
 */
function detectInteractionMode(msg) {
    const text = msg.toLowerCase();

    // EXECUTION: Action-oriented commands
    if (/\b(run|process|fix|sync|deploy|update|check|send|delete|save)\b/.test(text)) {
        return 'execution';
    }
    // REVIEW: Critical analysis or report generation
    if (/\b(report|summarize|audit|review|analyze|explain|status)\b/.test(text)) {
        return 'review';
    }
    // MONITOR: Dashboard/Observation queries
    if (/\b(watch|monitor|observe|show|metrics|alerts|logs)\b/.test(text)) {
        return 'monitor';
    }
    // Default: COLLABORATIVE
    return 'collaborative';
}

function pushToViewer(data) {
    const resultsList = document.getElementById('viewer-results-list');
    if (!resultsList || !window.formatSystemData) return;

    // Clear placeholder if present
    if (resultsList.innerHTML.includes('would load here...') || resultsList.innerHTML.includes('Load data by clicking')) {
        resultsList.innerHTML = '';
    }

    const li = document.createElement('li');
    li.style.cssText = "display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid #eee;";

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'viewer-checkbox';
    checkbox.style.marginTop = '4px';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'viewer-data-content';
    contentDiv.style.cssText = "flex: 1; font-size: 0.85rem; color: #333;";
    contentDiv.dataset.raw = encodeURIComponent(typeof data === 'string' ? data : JSON.stringify(data));
    contentDiv.innerHTML = window.formatSystemData(data); // Safe because formatSystemData handles escaping/formatting

    li.appendChild(checkbox);
    li.appendChild(contentDiv);
    resultsList.prepend(li);
}

/**
 * Handle agent response actions (§4.2)
 */
function handleAgentAction(result) {
    if (result.verification_required) {
        showVerificationPrompt(result.action, result.response);
    } else {
        executeAgentAction(result.action);
    }
}

let pendingAction = null;

function showVerificationPrompt(action, context) {
    pendingAction = action;
    const history = document.getElementById('chat-messages');

    const promptDiv = document.createElement('div');
    promptDiv.style.cssText = "margin:8px 0; padding:10px; background:#fff3cd; border:1px solid #ffc107; border-radius:4px;";
    promptDiv.innerHTML = `
        <strong>Verification Required:</strong><br>
        ${context}<br><br>
        <button id="verify-proceed" style="margin-right:8px; padding:4px 12px; background:#28a745; color:white; border:none; border-radius:3px; cursor:pointer;">Proceed</button>
        <button id="verify-cancel" style="padding:4px 12px; background:#dc3545; color:white; border:none; border-radius:3px; cursor:pointer;">Cancel</button>
    `;

    // Insert before the inline input so the prompt stays visible above it
    const inlineInput = document.getElementById('chat-inline-input');
    if (inlineInput && inlineInput.parentNode === history) {
        history.insertBefore(promptDiv, inlineInput);
    } else {
        history.appendChild(promptDiv);
    }
    history.scrollTop = history.scrollHeight;

    document.getElementById('verify-proceed').addEventListener('click', () => {
        promptDiv.remove();
        if (pendingAction) {
            executeAgentAction(pendingAction);
            appendMessage('System', `Confirmed: executing ${pendingAction}`, false);
            pendingAction = null;
        }
    });

    document.getElementById('verify-cancel').addEventListener('click', () => {
        promptDiv.remove();
        appendMessage('System', 'Action cancelled.', false);
        pendingAction = null;
    });
}

function executeAgentAction(action) {
    const actionMap = {
        'run_news_crawler': 'wgt-news-crawler',
        'run_spelling_check': 'wgt-spelling',
        'run_wiki_sync': 'wgt-wiki-interface',
        'run_challenge_sort': 'wgt-challenge-ranker',
        'run_page_scraper': 'wgt-page-metrics',
        'run_deadlinks': 'wgt-deadlinks',
    };

    const widgetId = actionMap[action];
    if (!widgetId) return;

    const widget = document.getElementById(widgetId);
    if (!widget) return;

    const triggerBtn = widget.querySelector('.wgt-trigger');
    if (triggerBtn) {
        triggerBtn.click();
        appendMessage('System', `Agent triggered: ${action}`, false);
    }
}

/**
 * Proactive Alerting per agent_guide.yml §6 Priority Hierarchy.
 * Each priority level deduplicates independently — same-priority alert
 * will not re-fire for 60 seconds regardless of message text.
 */
const activeAlerts = new Set();

/**
 * Check alert thresholds per agent_guide.yml §6 priority order.
 * §7 chat_rules: "Proactive: Offer up contact summaries, token usage
 * or server stats when appropriate."
 * @param {string} eventName
 * @param {object} detail
 */
function checkAlertThresholds(eventName, detail) {
    // Priority 1 — Token Usage (ALWAYS alert; three severity tiers)
    if (eventName === 'TokenMetricsEvent' && detail.percent > 80) {
        const pct = detail.percent;
        const severity = pct > 95 ? 'CRITICAL' : pct > 90 ? 'WARNING' : 'INFO';
        showAlert(1, `[${severity}] Token usage at ${pct}% (${detail.used}/${detail.limit})`);
    }

    // Priority 2 — Critical Contact Triage
    if (eventName === 'ContactTriageEvent' && detail.critical_count > 0) {
        showAlert(2, `${detail.critical_count} critical contact(s) need triage`);
    }

    // Priority 3 — Incomplete Records / Drafts backlog
    if (eventName === 'DraftCountsEvent') {
        const total = (detail.records || 0) + (detail.essays || 0) + (detail.responses || 0);
        if (total > 10) {
            showAlert(3, `${total} drafts pending (${detail.records}R / ${detail.essays}E / ${detail.responses}Rsp)`);
        }
    }

    // Priority 5 — Self-reflection data unavailable
    if (eventName === 'ReflectionUpdateEvent' && !detail.has_trace && !detail.has_reflection) {
        showAlert(5, 'Agent self-reflection data unavailable — trace may be stale');
    }

    // Priority 5 — Spelling backlog
    if (eventName === 'SpellingCompleteEvent' && detail.errors_count > 20) {
        showAlert(5, `${detail.errors_count} spelling errors found across database`);
    }

    // Priority 6 — Dead links detected
    if (eventName === 'DeadlinksEvent' && detail.dead_count > 0) {
        showAlert(6, `${detail.dead_count} dead link(s) detected`);
    }

    // Priority 7 — Security alerts
    if (eventName === 'SecurityAlertEvent' && detail.critical_count > 5) {
        const types = Array.isArray(detail.event_types) ? detail.event_types.join(', ') : '';
        showAlert(7, `Security: ${detail.critical_count} critical events (${types})`);
    }
}

/**
 * Emit a proactive alert into the chat panel.
 * Deduplicates per priority level — once per minute at most.
 * @param {number} priority — 1 (highest) to 8 (lowest)
 * @param {string} message
 */
function showAlert(priority, message) {
    // Dedup key is priority-only so the same priority cannot flood the chat
    const alertKey = `P${priority}`;
    if (activeAlerts.has(alertKey)) return;
    activeAlerts.add(alertKey);

    // Allow the same priority to re-fire after 60 seconds
    setTimeout(() => activeAlerts.delete(alertKey), 60000);

    appendMessage(`Alert [P${priority}]`, message, true);
}

document.addEventListener('DOMContentLoaded', () => {
    initAgentChat();
});
