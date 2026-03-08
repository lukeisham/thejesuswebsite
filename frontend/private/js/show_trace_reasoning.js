/**
 * show_trace_reasoning.js
 * ───────────────────────
 * Displays the AI agent's decision trace for the most recent
 * query in the Trace Reasoning panel on the dashboard.
 */
(function initTraceReasoning() {
    "use strict";

    var outputEl = document.getElementById("trace-output");

    if (!outputEl) return;

    var token = sessionStorage.getItem("auth_token") || "";

    /**
     * Fetch the latest trace from the server.
     * Called after a chat message is sent (listens for a custom event)
     * or can be polled.
     */
    function loadTrace() {
        fetch("/api/v1/agent/trace", {
            headers: { Authorization: "Bearer " + token },
        })
            .then(function (res) {
                if (!res.ok) throw new Error("No trace available");
                return res.json();
            })
            .then(function (data) {
                renderTrace(data);
            })
            .catch(function () {
                // Silently keep the placeholder — trace may not exist yet
            });
    }

    /** Render trace steps into the output panel. */
    function renderTrace(data) {
        if (!data || !data.steps || data.steps.length === 0) {
            outputEl.innerHTML =
                '<p style="color:#999;">No trace data for this query.</p>';
            return;
        }

        var html = "";

        data.steps.forEach(function (step, i) {
            html +=
                '<div style="margin-bottom:6px;">' +
                '<strong style="color:var(--accent-color);">[' + (i + 1) + "]</strong> " +
                escapeHtml(step.reasoning || step.action || "—") +
                "</div>";
        });

        outputEl.innerHTML = html;
        outputEl.scrollTop = outputEl.scrollHeight;
    }

    /** Basic HTML escape. */
    function escapeHtml(text) {
        var div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    // Listen for a custom event dispatched after a chat message
    document.addEventListener("agent-response-received", function () {
        loadTrace();
    });

    // Initial load
    loadTrace();
})();
