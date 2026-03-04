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

        // Lean Passthrough API logic here
        // Fetch to /api/v1/agent/chat
        setTimeout(() => {
            history.innerHTML += `<div style="margin-bottom:8px; border-left: 2px solid var(--accent-color); padding-left: 5px;"><strong>Agent:</strong> Acknowledged. Working on task.</div>`;
            history.scrollTop = history.scrollHeight;
        }, 500);
    } catch (error) {
        // Error Translation
        history.innerHTML += `<div class="error-msg" style="color: red;">Failed to send message: ${error.message}</div>`;
    }
}
// END

document.addEventListener('DOMContentLoaded', () => {
    initAgentChat();
});
