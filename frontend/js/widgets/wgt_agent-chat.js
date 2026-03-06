/**
 * wgt_agent-chat.js
 * Function: Create and manage agent chat sessions
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

// START initAgentChat
export function initAgentChat() {
    // The new 3-row layout explicitly provides the chat container and UI elements
    const chatPanel = document.getElementById('chat-messages');
    const inputField = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');

    if (!chatPanel || !inputField || !sendBtn) return;

    if (chatPanel.dataset.chatInit) return;
    chatPanel.dataset.chatInit = "true";

    try {
        sendBtn.addEventListener('click', handleChatSubmit);

        // Add "Enter" key trigger
        inputField.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleChatSubmit();
        });
    } catch (error) {
        chatPanel.innerHTML = `<div class="error-msg" style="color:var(--ui-error)">Chat initialization failed: ${error.message}</div>`;
    }
}
// END

// START handleChatSubmit
async function handleChatSubmit() {
    const inputField = document.getElementById('chat-input');
    const history = document.getElementById('chat-messages');
    const message = inputField.value.trim();

    if (!message) return;

    try {
        history.innerHTML += `<div style="margin-bottom:8px;"><strong>Admin:</strong> <span style="color:#555;">${message}</span></div>`;
        inputField.value = '';

        // Add a temporary loading message
        const loadingId = 'loading-' + Date.now();
        history.innerHTML += `<div id="${loadingId}" style="margin-bottom:8px; border-left: 2px solid var(--accent-color); padding-left: 5px; color: #888;"><strong>Agent:</strong> Working...</div>`;
        history.scrollTop = history.scrollHeight;

        // Fetch to /api/v1/agent/chat
        const response = await fetch('/api/v1/agent/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        const result = await response.json();

        // Remove loading message
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();

        if (response.ok) {
            history.innerHTML += `<div style="margin-bottom:8px; border-left: 2px solid var(--accent-color); padding-left: 5px;"><strong>Agent:</strong> ${result.response}</div>`;

            // If the agent returned structured data, pump it into the System Data Viewer
            if (result.data) {
                const resultsList = document.getElementById('viewer-results-list');
                const viewerStatus = document.getElementById('viewer-status-indicator');

                if (resultsList && window.formatSystemData) {
                    // Quick check if this looks like a draft vs system data
                    const isDraft = typeof result.data === 'string' && !result.data.trim().startsWith('{');

                    // Add a new list item with checkbox
                    const li = document.createElement('li');
                    li.style.cssText = "display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid #eee;";
                    li.innerHTML = `
                        <input type="checkbox" class="viewer-checkbox" style="margin-top: 4px;">
                        <div style="flex: 1; font-size: 0.85rem; color: #333;" class="viewer-data-content" data-raw="${encodeURIComponent(typeof result.data === 'string' ? result.data : JSON.stringify(result.data))}">
                            ${window.formatSystemData(result.data)}
                        </div>
                    `;

                    // If list only has placeholder, clear it
                    if (resultsList.innerHTML.includes('would load here...') || resultsList.innerHTML.includes('Load data by clicking')) {
                        resultsList.innerHTML = '';
                    }

                    resultsList.prepend(li); // Put newest on top

                    // Auto-focus the relevant tab visually if needed (optional UX enhancement)
                    history.innerHTML += `<div style="margin-bottom:8px; font-size: 0.85rem; color: #666; font-style: italic;">[Data pushed to System Data Viewer]</div>`;
                }
            }
        } else {
            history.innerHTML += `<div class="error-msg" style="color: red; margin-bottom: 8px; border-left: 2px solid red; padding-left: 5px;"><strong>Agent Error:</strong> ${result.response || 'Unknown error'}</div>`;
        }

        history.scrollTop = history.scrollHeight;
    } catch (error) {
        // Error Translation
        history.innerHTML += `<div class="error-msg" style="color: red;">Failed to send message: ${error.message}</div>`;
    }
}
// END

document.addEventListener('DOMContentLoaded', () => {
    initAgentChat();
});
