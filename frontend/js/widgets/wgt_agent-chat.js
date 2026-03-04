/**
 * wgt_agent-chat.js
 * Function: Create and manage agent chat sessions
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

// START initAgentChat
export function initAgentChat(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (container.dataset.chatInit) return;
    container.dataset.chatInit = "true";

    try {
        container.innerHTML = `
            <div class="chat-container">
                <h4>Agent Command Interface</h4>
                <div id="chat-history" class="chat-log"></div>
                <input type="text" id="chat-input" placeholder="Type a command or mode (e.g., /monitor)..." />
                <button id="btn-chat-send">Send</button>
            </div>
        `;
        document.getElementById('btn-chat-send').addEventListener('click', handleChatSubmit);
    } catch (error) {
        container.innerHTML = `<div class="error-msg">Chat initialization failed: ${error.message}</div>`;
    }
}
// END

// START handleChatSubmit
async function handleChatSubmit() {
    const inputField = document.getElementById('chat-input');
    const history = document.getElementById('chat-history');
    const message = inputField.value.trim();

    if (!message) return;

    try {
        history.innerHTML += `<div><strong>Admin:</strong> ${message}</div>`;
        inputField.value = '';

        // Lean Passthrough API logic here
        // Fetch to /api/v1/agent/chat
        setTimeout(() => {
            history.innerHTML += `<div><strong>Agent:</strong> Acknowledged. Working on task.</div>`;
            history.scrollTop = history.scrollHeight;
        }, 500);
    } catch (error) {
        // Error Translation
        history.innerHTML += `<div class="error-msg">Failed to send message: ${error.message}</div>`;
    }
}
// END
