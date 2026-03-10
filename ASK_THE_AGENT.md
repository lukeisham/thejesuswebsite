# ASK THE AGENT — Direct Chat Input Refactor

**Project:** The Jesus Website
**Component:** AI Agent Conversation Panel (Dashboard)
**Date:** March 10, 2026
**Author:** Luke Isham
**Purpose:** Replace the separate "Ask the Agent" input box and Send button with direct, click-to-type chat behaviour inside the `#chat-messages` container itself. The user clicks in the conversation area, sees a flashing cursor, types their message, and presses Enter to send.

---

## Implementation Status (Post-Review)

**Reviewed:** March 10, 2026 — Gemini Flash implementation reviewed and patched by Claude.

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Add `#chat-inline-input` contenteditable div + CSS placeholder | ✅ Complete |
| Phase 2 | `handleInlineChatSubmit()`, `createMessageElement()`, keydown listener | ✅ Complete |
| Phase 3 | Remove old `#chat-input`, `#chat-send`, `handleChatSubmit()`, orphaned listeners | ✅ Complete |
| Phase 4 | Click-to-focus, sticky positioning, auto-focus on load | ✅ Complete (patched) |
| Phase 5 | Remove placeholder `<p>` tag | ✅ Complete |
| Phase 6 | Second-pass verification | ✅ Complete (patched) |

**Patches applied by Claude after review:**

| File | Bug | Fix |
|------|-----|-----|
| `wgt_agent-chat.js` | `inlineInput` declared inside `if (inlineInput)` block but referenced outside it in the click handler — would throw `ReferenceError` if element missing | Moved `const inlineInput` declaration to top of try block; added `if (!inlineInput) return` guard in click handler |
| `wgt_agent-chat.js` | `showVerificationPrompt()` used `history.appendChild(promptDiv)` — places verification prompt after the inline input, pushing it out of view | Changed to `history.insertBefore(promptDiv, inlineInput)` with same fallback pattern as the rest of the module |
| `dashboard.html` | `#chat-inline-input` had `position: sticky; bottom: 0; background: #fff; z-index: 1` duplicated as inline styles, overriding the CSS rule that uses `var(--bg-primary, #fff)` | Removed duplicate properties from inline style; CSS rule now governs sticky/z-index/background |

---

## How This Plan Works

This plan is divided into **Phases** with small sequential steps. Each phase ends with a **Checkpoint** — a self-test you MUST run before moving to the next phase. Phase 6 is a **second-pass review** where you verify your own work against the actual codebase structs, field names, and element IDs.

**CRITICAL RULE:** Do NOT guess field names, element IDs, CSS class names, or API response fields. Always refer to the exact values listed in this plan. If a value is not listed here, read the source file to confirm before using it.

---

## Current State (Do Not Change These)

These are the facts about the current codebase. Refer to them throughout.

### HTML Elements (in `frontend/private/dashboard.html`)

| Element | ID | Class | Location |
|---------|----|-------|----------|
| Chat messages container | `chat-messages` | `chat-messages` | Line ~686 |
| Text input field | `chat-input` | _(none, inline styles)_ | Line ~693 |
| Send button | `chat-send` | `btn-primary` | Line ~695 |
| Input row wrapper | _(none)_ | `chat-input-row` | Line ~692 |
| Chat panel wrapper | _(none)_ | `chat-container` | Line ~685 |

### JavaScript (in `frontend/js/widgets/wgt_agent-chat.js`)

| Function | Purpose |
|----------|---------|
| `initAgentChat()` | Sets up event listeners on `#chat-input` and `#chat-send` |
| `handleChatSubmit()` | Reads `#chat-input` value, POSTs to `/api/v1/agent/chat`, appends response |
| `appendMessage(role, text, isAgent)` | Creates a `<div>` with role label and text, appends to `#chat-messages` |
| `detectInteractionMode(msg)` | Regex-based classification returning `execution`, `review`, `monitor`, or `collaborative` |
| `updateWidgetStatus(status, label)` | Updates traffic light on `wgt-core-agent` widget |

### API Endpoint

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| POST | `/api/v1/agent/chat` | `{ message, interaction_mode, widget_context }` | `{ response, success, action, data }` |

### CSS (in `frontend/private/dashboard.html` lines ~90-110)

```css
.chat-container { display: flex; flex-direction: column; height: 100%; min-height: 300px; }
.chat-messages { flex: 1; overflow-y: auto; border: 1px solid var(--border-color); padding: 10px; margin-bottom: 10px; background: #fafaf9; }
.chat-input-row { display: flex; gap: 8px; }
```

---

## Phase 1: Add Inline Editable Input Area Inside `#chat-messages`

**Goal:** Create a fixed-to-bottom input line inside the chat messages container that acts as the new typing area. The user clicks in the conversation, a cursor appears at the bottom, and they type directly.

### Step 1A: Add the inline input element to dashboard.html

1. Open `frontend/private/dashboard.html`
2. Find the `#chat-messages` div (line ~686). It currently contains:
   ```html
   <div class="chat-messages" id="chat-messages"
       style="height: 350px; overflow-y: auto; padding: 15px; background: #fafafafa; display: flex; flex-direction: column; gap: 10px;">
       <p style="color: #999; font-style: italic; text-align: center; width: 100%;">
           Start a conversation with the agent below…
       </p>
   </div>
   ```
3. **Add** a new editable div at the END of `#chat-messages`, just before the closing `</div>`:
   ```html
   <div id="chat-inline-input" contenteditable="true"
       data-placeholder="Type a message and press Enter…"
       style="min-height: 1.4em; padding: 8px 12px; border-top: 1px solid var(--border-color);
              outline: none; font-family: var(--font-sans); font-size: 0.95rem;
              color: var(--text-primary); caret-color: var(--accent-color);
              flex-shrink: 0; margin-top: auto; width: 100%; box-sizing: border-box;">
   </div>
   ```

**Why `contenteditable="true"`?** It gives a native flashing cursor on click, supports multi-line if needed, and lives inside the scrollable conversation flow.

**Why `margin-top: auto`?** In a flex-column container, this pushes the input to the bottom of the visible area, even when there are few messages.

### Step 1B: Add placeholder behaviour CSS

1. Open `frontend/style.css`
2. Find the `/* --- System Health Feed --- */` section (added in previous refactor)
3. **Before** that section, add a new block:

```css
/* --- Chat Inline Input --- */
#chat-inline-input:empty::before {
    content: attr(data-placeholder);
    color: #999;
    font-style: italic;
    pointer-events: none;
}

#chat-inline-input:focus {
    background: #fff;
    border-top-color: var(--accent-color);
}

#chat-inline-input br:only-child {
    display: none;
}
```

**What this does:**
- Shows placeholder text when the div is empty (via CSS `::before` pseudo-element reading the `data-placeholder` attribute)
- Highlights the input area on focus
- Hides the stray `<br>` that browsers insert into empty contenteditable divs

### Checkpoint 1

- [ ] Open `dashboard.html` in a browser
- [ ] The conversation area should show the placeholder text "Type a message and press Enter…" at the bottom
- [ ] Clicking the text should show a flashing cursor
- [ ] The placeholder should disappear when you start typing
- [ ] The old input box and Send button should STILL be visible (we haven't removed them yet)

---

## Phase 2: Wire Up the Inline Input to the Existing Chat Handler

**Goal:** Make Enter on the new inline input trigger the same `handleChatSubmit()` logic, reading from `#chat-inline-input` instead of `#chat-input`.

### Step 2A: Modify `initAgentChat()` in `wgt_agent-chat.js`

1. Open `frontend/js/widgets/wgt_agent-chat.js`
2. Find `initAgentChat()` (line ~20)
3. **IMPORTANT:** The event listener setup is wrapped in a `try { ... } catch` block starting at line 30. You must add the new code INSIDE this try block.
4. Locate the existing event listener setup (inside the try block):
   ```javascript
   sendBtn.addEventListener('click', handleChatSubmit);
   inputField.addEventListener('keypress', (e) => {
       if (e.key === 'Enter') handleChatSubmit();
   });
   ```
5. **After** those lines (still inside the try block), add a new block for the inline input:
   ```javascript
   // --- Inline contenteditable input ---
   const inlineInput = document.getElementById('chat-inline-input');
   if (inlineInput) {
       inlineInput.addEventListener('keydown', (e) => {
           if (e.key === 'Enter' && !e.shiftKey) {
               e.preventDefault(); // Prevent newline insertion
               handleInlineChatSubmit();
           }
       });
   }
   ```

**Why `keydown` not `keypress`?** `keypress` is deprecated and doesn't fire reliably for Enter in contenteditable divs across all browsers. `keydown` is the standard.

**Why `!e.shiftKey`?** Allows Shift+Enter for a newline if the user wants multi-line input.

**NOTE on `initAgentChat()` structure:** The function also contains placeholder clearing (lines 54-56) and auto-monitoring/heartbeat setup (lines 59-90). Do NOT move or modify those sections. Only add the inline input listener between the existing send/keypress listeners and the placeholder clearing block.

### Step 2B: Create `handleInlineChatSubmit()` function

1. In the same file (`wgt_agent-chat.js`), find `handleChatSubmit()` (line ~147)
2. **Before** `handleChatSubmit()`, add this new function:

```javascript
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
        loadingDiv.remove();
        updateWidgetStatus('error', 'Offline');
        const errMsg = createMessageElement('Agent', 'Unable to reach the agent. Check your connection.', true);
        history.insertBefore(errMsg, inlineInput);
    }

    // Keep input visible and scrolled into view
    history.scrollTop = history.scrollHeight;
    inlineInput.focus();
}
```

### Step 2C: Create `createMessageElement()` helper

**Why a new helper?** The existing `appendMessage()` uses `history.appendChild()`, but we need `history.insertBefore()` to place messages above the inline input. Rather than modifying `appendMessage()` (which may be called from other places like `system_feed.js` alerts), we create a separate helper that returns the element without appending it.

1. In `wgt_agent-chat.js`, **after** the existing `appendMessage()` function (line ~144), add:

```javascript
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
```

### Step 2D: Verify `widgetState` is accessible

The `handleInlineChatSubmit()` function references `widgetState` (used to send widget context to the API). Confirm this variable is defined at module scope in `wgt_agent-chat.js`.

1. Search `wgt_agent-chat.js` for `widgetState` or `let widgetState` or `const widgetState`
2. It should exist near the top of the file as module-level state
3. **Do NOT create a new one** — the existing variable is shared between both submit handlers

### Checkpoint 2

- [ ] Open dashboard in browser, refresh
- [ ] Click inside the conversation area at the bottom (the inline input)
- [ ] Type a message and press Enter
- [ ] The user message should appear above the input line (labelled "Admin:")
- [ ] A "Working..." indicator should appear
- [ ] The agent response should appear when returned (labelled "Agent:")
- [ ] The inline input should remain at the bottom and retain focus
- [ ] The old input box and Send button should STILL work in parallel (both paths active)
- [ ] Press Shift+Enter — should insert a newline, NOT submit

---

## Phase 3: Remove the Old Input Box and Send Button

**Goal:** Once the inline input is confirmed working, remove the old `#chat-input`, `#chat-send`, and `.chat-input-row` elements.

### Step 3A: Remove HTML elements

1. Open `frontend/private/dashboard.html`
2. Find the `.chat-input-row` div (line ~692):
   ```html
   <div class="chat-input-row">
       <input type="text" id="chat-input" placeholder="Ask the agent…"
           style="flex: 1; padding: 8px; border: 1px solid var(--border-color); font-family: var(--font-sans);">
       <button id="chat-send" class="btn-primary">Send</button>
   </div>
   ```
3. **Delete** the entire `<div class="chat-input-row">...</div>` block (3 lines)

### Step 3B: Remove orphaned event listeners in `initAgentChat()`

1. Open `frontend/js/widgets/wgt_agent-chat.js`
2. In `initAgentChat()`, find and **delete** these two variable declarations:
   ```javascript
   const inputField = document.getElementById('chat-input');
   const sendBtn = document.getElementById('chat-send');
   ```
3. Find and **delete** these event listener lines (inside the try block):
   ```javascript
   sendBtn.addEventListener('click', handleChatSubmit);
   inputField.addEventListener('keypress', (e) => {
       if (e.key === 'Enter') handleChatSubmit();
   });
   ```
4. Update the guard clause at the top of the function. Change:
   ```javascript
   if (!chatPanel || !inputField || !sendBtn) return;
   ```
   to:
   ```javascript
   if (!chatPanel) return;
   ```
5. **ALSO** find the placeholder clearing block (inside the try block):
   ```javascript
   if (chatPanel.innerHTML.includes('Start a conversation')) {
       chatPanel.innerHTML = '';
   }
   ```
   **Delete** these 3 lines — the placeholder `<p>` is removed in Phase 5A, and using `innerHTML = ''` would wipe out the `#chat-inline-input` div that's now inside `#chat-messages`.

### Step 3C: Remove the old `handleChatSubmit()` function

1. In `wgt_agent-chat.js`, find `async function handleChatSubmit()` (line ~147)
2. **Delete** the entire function (approximately 60-70 lines, from `async function handleChatSubmit() {` to its closing `}`)
3. **Do NOT delete** `handleInlineChatSubmit()` — that is the replacement
4. **Do NOT delete** `appendMessage()` — it may still be called from other modules (system alerts)

### Step 3D: Remove orphaned CSS

1. Open `frontend/private/dashboard.html` (the inline `<style>` block around line ~90)
2. Find the `.chat-input-row` rule:
   ```css
   .chat-input-row {
       display: flex;
       gap: 8px;
   }
   ```
3. **Delete** this rule (3 lines)
4. **Do NOT delete** `.chat-container` or `.chat-messages` — these are still used

### Checkpoint 3

- [ ] Open dashboard in browser, refresh
- [ ] The old text input box and Send button should be gone
- [ ] The conversation area should show only messages and the inline input at the bottom
- [ ] Clicking in the conversation area should place cursor in the inline input
- [ ] Typing and pressing Enter should send the message
- [ ] No console errors should appear
- [ ] Run: `grep -rn "chat-input\|chat-send\|chat-input-row" frontend/` — should return NO matches except possibly in comments or this plan file

---

## Phase 4: Adjust Scroll and Focus Behaviour

**Goal:** Ensure the inline input is always visible, the conversation scrolls naturally, and clicking anywhere in the chat area focuses the input.

### Step 4A: Add click-to-focus on the chat container

1. Open `frontend/js/widgets/wgt_agent-chat.js`
2. In `initAgentChat()`, after the `inlineInput` event listener block, add:

```javascript
// Click anywhere in chat area focuses the inline input
chatPanel.addEventListener('click', (e) => {
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
```

### Step 4B: Ensure inline input stays visible on scroll

1. In `frontend/style.css`, find the `/* --- Chat Inline Input --- */` section added in Phase 1
2. **Add** to that section:

```css
#chat-inline-input {
    position: sticky;
    bottom: 0;
    background: var(--bg-primary, #fff);
    z-index: 1;
}
```

**Why `position: sticky; bottom: 0`?** This keeps the input pinned to the bottom of the scrollable area. As messages accumulate and the user scrolls up, the input remains visible at the bottom edge.

### Step 4C: Auto-focus on page load

1. In `initAgentChat()`, at the **very end** of the function (after all event listener setup), add:

```javascript
// Auto-focus the inline input when the dashboard loads
setTimeout(() => {
    if (inlineInput) inlineInput.focus();
}, 300);
```

**Why `setTimeout`?** Other dashboard initialisation scripts run on DOMContentLoaded. A small delay ensures the chat panel is fully rendered before stealing focus.

### Checkpoint 4

- [ ] Open dashboard, the inline input should auto-focus (cursor flashing)
- [ ] Click on a chat message — focus should move to the inline input
- [ ] Select text in a message — focus should NOT move (text selection preserved)
- [ ] Send several messages to fill the container — the input should remain pinned at the bottom
- [ ] Scroll up through message history — the input should remain visible (sticky)
- [ ] After sending a message, the input should retain focus for immediate next message

---

## Phase 5: Remove Initial Placeholder Paragraph

**Goal:** The old static placeholder paragraph ("Start a conversation with the agent below…") should be removed since the inline input's own placeholder serves this purpose.

### Step 5A: Remove the placeholder `<p>` tag

1. Open `frontend/private/dashboard.html`
2. Inside `#chat-messages`, find:
   ```html
   <p style="color: #999; font-style: italic; text-align: center; width: 100%;">
       Start a conversation with the agent below…
   </p>
   ```
3. **Delete** these 3 lines entirely

### Step 5B: Update the inline input placeholder text (optional improvement)

1. In `dashboard.html`, find the `#chat-inline-input` div you added in Phase 1
2. Change the `data-placeholder` attribute to a more inviting message:
   ```
   data-placeholder="Click here and start typing to chat with the agent…"
   ```

### Checkpoint 5

- [ ] Open dashboard — no static placeholder paragraph should appear
- [ ] The inline input should show its own placeholder text at the bottom
- [ ] Clicking shows the cursor; placeholder disappears when typing
- [ ] Sending a message works as before
- [ ] The conversation area should feel clean and direct

---

## Phase 6: Second-Pass Verification (MANDATORY)

**This phase is NOT optional.** You must complete every step to catch mistakes made in earlier phases.

### 6A: Verify HTML element IDs match JavaScript references

Run these checks:

1. **Open `frontend/private/dashboard.html`** and confirm:
   - `id="chat-messages"` exists EXACTLY once
   - `id="chat-inline-input"` exists EXACTLY once
   - `id="chat-input"` does NOT exist anywhere (removed in Phase 3)
   - `id="chat-send"` does NOT exist anywhere (removed in Phase 3)
   - `class="chat-input-row"` does NOT exist anywhere (removed in Phase 3)

2. **Open `frontend/js/widgets/wgt_agent-chat.js`** and confirm:
   - `getElementById('chat-messages')` — matches HTML ✓
   - `getElementById('chat-inline-input')` — matches HTML ✓
   - `getElementById('chat-input')` — should NOT appear (removed in Phase 3)
   - `getElementById('chat-send')` — should NOT appear (removed in Phase 3)

### 6B: Verify API field names in `handleInlineChatSubmit()`

Cross-reference your `fetch()` call against the actual Rust backend:

1. **Open `app/app_ui/src/agent_api.rs`** and read the `AgentChatRequest` struct:
   ```rust
   pub struct AgentChatRequest {
       pub message: String,
       pub interaction_mode: Option<String>,
       pub widget_context: Option<serde_json::Value>,
   }
   ```

2. Now open your `handleInlineChatSubmit()` and confirm the `body: JSON.stringify()` sends EXACTLY:
   - `message` (string) ← matches `pub message: String` ✓
   - `interaction_mode` (string) ← matches `pub interaction_mode: Option<String>` ✓
   - `widget_context` (object) ← matches `pub widget_context: Option<serde_json::Value>` ✓

3. **Check the response fields.** Open `agent_api.rs` and read `AgentChatResponse`:
   ```rust
   pub struct AgentChatResponse {
       pub response: String,
       pub data: Option<String>,
   }
   ```
   Plus the full JSON adds: `success`, `action`, `verification_required`

4. Confirm your handler reads:
   - `result.response` ← matches `pub response: String` ✓
   - `result.action` ← comes from handler metadata extraction ✓
   - `result.data` ← matches `pub data: Option<String>` ✓

### 6C: Verify no orphaned references remain

Run these terminal commands and verify ZERO matches (excluding this plan file and comments):

```bash
grep -rn "chat-input-row" frontend/private/dashboard.html
grep -rn "getElementById.*chat-input['\"])" frontend/js/widgets/wgt_agent-chat.js
grep -rn "getElementById.*chat-send" frontend/js/widgets/wgt_agent-chat.js
grep -rn "handleChatSubmit" frontend/js/widgets/wgt_agent-chat.js
```

All four commands should return **no matches**.

### 6D: Verify CSS is complete and correct

1. Open `frontend/style.css` and confirm these rules exist:
   - `#chat-inline-input:empty::before` — placeholder styling
   - `#chat-inline-input:focus` — focus highlight
   - `#chat-inline-input` — sticky positioning

2. Open `frontend/private/dashboard.html` inline `<style>` and confirm:
   - `.chat-input-row` rule is REMOVED
   - `.chat-container` rule STILL EXISTS
   - `.chat-messages` rule STILL EXISTS

### 6E: Verify no duplicate function definitions

1. In `wgt_agent-chat.js`, count occurrences of each function name:
   - `function handleInlineChatSubmit` — should appear EXACTLY once
   - `function handleChatSubmit` — should appear ZERO times (deleted in Phase 3)
   - `function appendMessage` — should appear EXACTLY once (kept for external use)
   - `function createMessageElement` — should appear EXACTLY once (added in Phase 2)
   - `function initAgentChat` — should appear EXACTLY once

### 6F: Verify no `innerHTML = ''` clearing remains that would destroy the inline input

Search `wgt_agent-chat.js` for ALL occurrences of `.innerHTML = ''` or `.innerHTML=""`. If any of these target `#chat-messages` (the `history` or `chatPanel` variable), they will destroy the `#chat-inline-input` div. These lines MUST be deleted or changed to remove only message divs (not the inline input).

The old code had two such lines:
1. In `initAgentChat()`: `chatPanel.innerHTML = '';` (placeholder clearing)
2. In `handleChatSubmit()`: `history.innerHTML = '';` (placeholder clearing)

Both should be gone — `initAgentChat()`'s was removed in Phase 3B, and `handleChatSubmit()` was deleted entirely in Phase 3C.

**Confirm:** `grep -n "innerHTML.*=.*''" frontend/js/widgets/wgt_agent-chat.js` returns ZERO matches.

### 6G: Verify `insertBefore` target is correct

In `handleInlineChatSubmit()`, every `history.insertBefore(element, inlineInput)` call passes `inlineInput` as the reference node. Confirm that:

1. `inlineInput` is `document.getElementById('chat-inline-input')`
2. `inlineInput` is a child of `history` (`document.getElementById('chat-messages')`)
3. Messages will therefore appear ABOVE the input, INSIDE the chat container

If `inlineInput` is NOT a child of `history`, `insertBefore` will throw a `NotFoundError`. This would happen if the `#chat-inline-input` div was placed outside `#chat-messages` in the HTML.

### 6H: Test the full flow end-to-end

1. Open the dashboard in a browser
2. DevTools Console should show: `System Feed: Initializing passive monitoring...` (from system_feed.js)
3. Click in the chat area — cursor should appear at the bottom
4. Type "hello" and press Enter
5. "Admin: hello" should appear above the input
6. "Agent: Working..." should appear
7. Agent response should replace the loading indicator
8. Input should retain focus
9. Type another message — should work identically
10. No console errors at any point

---

## Files Changed Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `frontend/private/dashboard.html` | MODIFY | Add `#chat-inline-input` contenteditable div inside `#chat-messages`; remove `#chat-input`, `#chat-send`, and `.chat-input-row`; remove old placeholder `<p>`; remove `.chat-input-row` CSS rule |
| `frontend/js/widgets/wgt_agent-chat.js` | MODIFY | Add `handleInlineChatSubmit()`, `createMessageElement()`, inline input keydown listener, click-to-focus handler, auto-focus; remove `handleChatSubmit()`, old input/button references |
| `frontend/style.css` | MODIFY | Add `/* --- Chat Inline Input --- */` section with `#chat-inline-input` rules (placeholder, focus, sticky) |

---

## Architecture Notes

- **No backend changes required.** The existing `POST /api/v1/agent/chat` endpoint is used unchanged.
- **No new dependencies.** Uses native `contenteditable` attribute — no libraries needed.
- **`appendMessage()` is kept.** Other modules (like `system_feed.js` alert injection) may call it. Only the old `handleChatSubmit()` is removed.
- **`widgetState` is shared.** Both the old and new submit handlers reference the same module-level variable. No duplication.
- **WebSocket upgrade is possible later.** The backend already has a `/ws` route with basic echo. Future work could upgrade from REST polling to WebSocket for real-time responses.

---

**End of Plan**
