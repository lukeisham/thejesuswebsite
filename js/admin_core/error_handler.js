/* =============================================================================
   THE JESUS WEBSITE — SHARED ERROR HANDLER
   File:    js/admin_core/error_handler.js
   Version: 1.0.0
   Trigger: Any dashboard module calls window.surfaceError(message) to route
            an error or status message to the universal Status Bar footer.
   Main:    surfaceError(message) — prepends a timestamp, writes the message
            into the #admin-error-footer DOM element, and logs to console.
            Safe to call before DOMContentLoaded (queues messages and flushes
            once the DOM is ready).
   Output:  Timestamped message displayed in the dashboard error footer.
   Consumer: All dashboard edit modules (records, arbor, essays, news, etc.)
             call this shared handler instead of implementing their own
             error display logic.
============================================================================= */

/* -----------------------------------------------------------------------------
   MESSAGE QUEUE — holds messages received before DOM is ready
----------------------------------------------------------------------------- */
let _errorQueue = [];
let _domReady = false;

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: surfaceError
   Exposed globally as window.surfaceError for consumption by all dashboard
   modules. Accepts a plain string message.
----------------------------------------------------------------------------- */
function surfaceError(message) {
    if (typeof message !== "string") {
        message = String(message);
    }

    // Prepend timestamp
    const now = new Date();
    const timestamp = now.toISOString().substring(11, 23); // HH:MM:SS.sss
    const formattedMessage = `[${timestamp}] ${message}`;

    // Always log to console for debugging
    console.log(`[surfaceError] ${formattedMessage}`);

    // If DOM is ready, write directly. Otherwise queue for later flush.
    if (_domReady) {
        _writeToFooter(formattedMessage);
    } else {
        _errorQueue.push(formattedMessage);
    }
}

/* -----------------------------------------------------------------------------
   INTERNAL: Write a message into the error footer DOM element
----------------------------------------------------------------------------- */
function _writeToFooter(message) {
    const footerEl = document.getElementById("admin-error-footer");
    if (!footerEl) {
        // Footer element not found — log and ignore
        console.warn("[error_handler] #admin-error-footer not found — cannot display:", message);
        return;
    }

    // Only show the most recent message — replace content
    footerEl.innerHTML = `<span class="error-footer__message">${_escapeHtml(message)}</span>`;
}

/* -----------------------------------------------------------------------------
   INTERNAL: Flush queued messages after DOM is ready
----------------------------------------------------------------------------- */
function _flushQueue() {
    _domReady = true;
    if (_errorQueue.length > 0) {
        // Write the most recent queued message (last one wins)
        const lastMessage = _errorQueue[_errorQueue.length - 1];
        _writeToFooter(lastMessage);
        _errorQueue = [];
    }
}

/* -----------------------------------------------------------------------------
   INTERNAL: Escape HTML to prevent injection in footer display
----------------------------------------------------------------------------- */
function _escapeHtml(text) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

/* -----------------------------------------------------------------------------
   INITIALISATION: Listen for DOMContentLoaded to flush queued messages
----------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", _flushQueue);

// If DOM is already loaded (script loaded late), flush immediately
if (document.readyState === "interactive" || document.readyState === "complete") {
    _flushQueue();
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — all dashboard modules call window.surfaceError()
   window.surfaceStatus is an alias for non-error informational messages.
----------------------------------------------------------------------------- */
window.surfaceError = surfaceError;
window.surfaceStatus = surfaceError;
