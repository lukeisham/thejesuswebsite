/**
 * wgt_agent-chat.js
 * Function: Create and manage agent chat sessions
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

// START initAgentChat
export function initAgentChat() {
    const chatPanel = document.getElementById('chat-messages');
    const inputField = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');

    if (!chatPanel || !inputField || !sendBtn) return;

    if (chatPanel.dataset.chatInit) return;
    chatPanel.dataset.chatInit = "true";

    try {
        sendBtn.addEventListener('click', handleChatSubmit);
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleChatSubmit();
        });

        // Restore custom event listeners for agent notifications
        window.addEventListener("CrawlSummaryEvent", (e) => {
            if (e.detail) appendMessage('Agent', e.detail, true);
        });

        window.addEventListener("ContactSummaryEvent", (e) => {
            if (e.detail) appendMessage('Agent', e.detail, true);
        });

        // Clear placeholder on start
        if (chatPanel.innerHTML.includes('Start a conversation')) {
            chatPanel.innerHTML = '';
        }

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
    history.appendChild(msgDiv);
    history.scrollTop = history.scrollHeight;

    return msgDiv;
}

// START handleChatSubmit
async function handleChatSubmit() {
    const inputField = document.getElementById('chat-input');
    const history = document.getElementById('chat-messages');
    const message = inputField.value.trim();

    if (!message) return;

    // Remove placeholder if it still exists
    if (history.innerHTML.includes('Start a conversation')) {
        history.innerHTML = '';
    }

    // Append User Message
    appendMessage('Admin', message, false);
    inputField.value = '';

    // Update status to Thinking
    updateWidgetStatus('active', 'Thinking...');

    // Add a temporary loading message
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = "margin-bottom:8px; border-left: 2px solid var(--accent-color); padding-left: 5px; color: #888;";
    loadingDiv.innerHTML = `<strong>Agent:</strong> Working...`;
    history.appendChild(loadingDiv);
    history.scrollTop = history.scrollHeight;

    try {
        const response = await fetch('/api/v1/agent/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        const result = await response.json();
        loadingDiv.remove();

        if (response.ok) {
            updateWidgetStatus('active', 'Online');
            appendMessage('Agent', result.response, true);

            // Handle structured data for the System Data Viewer
            if (result.data) {
                pushToViewer(result.data);
                const infoDiv = document.createElement('div');
                infoDiv.style.cssText = "margin-bottom:8px; font-size: 0.85rem; color: #666; font-style: italic;";
                infoDiv.textContent = "[Data pushed to System Data Viewer]";
                history.appendChild(infoDiv);
            }
        } else {
            updateWidgetStatus('error', 'Error');
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = "color: red; margin-bottom: 8px; border-left: 2px solid red; padding-left: 5px;";
            errorDiv.innerHTML = `<strong>Agent Error:</strong> ${result.response || 'Unknown error'}`;
            history.appendChild(errorDiv);
        }
    } catch (error) {
        updateWidgetStatus('error', 'Error');
        loadingDiv.remove();
        const errorDiv = document.createElement('div');
        errorDiv.style.color = 'red';
        errorDiv.textContent = `Failed to send message: ${error.message}`;
        history.appendChild(errorDiv);
    }
    history.scrollTop = history.scrollHeight;
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

document.addEventListener('DOMContentLoaded', () => {
    initAgentChat();
});
