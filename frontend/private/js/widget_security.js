/**
 * widget_security.js
 * ──────────────────
 * Periodically fetches and renders the latest 50 security logs (Honeypot, Rate Limits, Auth).
 */

(function initSecurityWidget() {
    "use strict";

    var listEl = document.getElementById("security-list");
    if (!listEl || listEl.dataset.wgtInit) return;
    listEl.dataset.wgtInit = "true";

    var POLL_INTERVAL = 30000; // 30 seconds

    function formatTime(isoString) {
        var d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function getLabelColor(eventType) {
        switch (eventType) {
            case "Honeypot": return "background: #fdf2f2; color: #dc2626; border: 1px solid #f87171;"; // Red
            case "RateLimit": return "background: #fffbeb; color: #d97706; border: 1px solid #fbbf24;"; // Yellow
            case "LoginSuccess": return "background: #f0fdf4; color: #16a34a; border: 1px solid #4ade80;"; // Green
            case "LoginFail": return "background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5;"; // Red
            case "LoginRequest": return "background: #eff6ff; color: #2563eb; border: 1px solid #93c5fd;"; // Blue
            default: return "background: #f3f4f6; color: #4b5563; border: 1px solid #d1d5db;"; // Gray
        }
    }

    function fetchLogs() {
        fetch("/api/v1/admin/security/logs", {
            headers: { "Authorization": "Bearer " + sessionStorage.getItem("auth_token") }
        })
            .then(function (res) {
                if (!res.ok) throw new Error("Failed to load logs");
                return res.json();
            })
            .then(function (data) {
                listEl.innerHTML = "";
                if (!data || data.length === 0) {
                    var li = document.createElement("li");
                    li.innerHTML = '<span style="color: #999; font-size: 0.85rem;">No security events recorded.</span>';
                    listEl.appendChild(li);
                    return;
                }

                data.forEach(function (log) {
                    var li = document.createElement("li");
                    li.style.cssText = "padding: 8px 0; border-bottom: 1px solid #eee; display: flex; flex-direction: column; gap: 4px;";

                    var topRow = document.createElement("div");
                    topRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;";

                    var typeLabel = document.createElement("span");
                    typeLabel.textContent = log.event_type;
                    typeLabel.style.cssText = "padding: 2px 6px; border-radius: 4px; font-weight: bold; font-family: var(--font-sans); text-transform: uppercase; font-size: 0.65rem; " + getLabelColor(log.event_type);

                    var timeSpan = document.createElement("span");
                    timeSpan.textContent = formatTime(log.created_at);
                    timeSpan.style.color = "#999";

                    var text = (log.ip_address ? "[" + log.ip_address + "] " : "") + (log.details || "No details provided.");

                    var copyBtn = document.createElement("button");
                    copyBtn.innerHTML = "📄";
                    copyBtn.style.cssText = "background: none; border: none; cursor: pointer; padding: 0 4px; font-size: 0.8rem; opacity: 0.6;";
                    copyBtn.title = "Copy Log Details";
                    copyBtn.onclick = function () {
                        var cStr = log.event_type + " | " + formatTime(log.created_at) + "\n" + text;
                        navigator.clipboard.writeText(cStr).then(function () {
                            copyBtn.innerHTML = "✅";
                            setTimeout(function () { copyBtn.innerHTML = "📄"; }, 2000);
                        }).catch(console.error);
                    };

                    var rightCol = document.createElement("div");
                    rightCol.style.display = "flex";
                    rightCol.style.alignItems = "center";
                    rightCol.style.gap = "4px";
                    rightCol.appendChild(timeSpan);
                    rightCol.appendChild(copyBtn);

                    topRow.appendChild(typeLabel);
                    topRow.appendChild(rightCol);

                    var bottomRow = document.createElement("div");
                    bottomRow.style.cssText = "font-size: 0.85rem; color: #444; word-break: break-all;";
                    bottomRow.textContent = text;

                    li.appendChild(topRow);
                    li.appendChild(bottomRow);
                    listEl.appendChild(li);
                });
            })
            .catch(function (err) {
                console.error("Security Widget Error:", err);
                listEl.innerHTML = '<li><span style="color: red; font-size: 0.85rem;">Error loading logs.</span></li>';
            });
    }

    // Initial fetch
    fetchLogs();

    // Poll periodically
    setInterval(fetchLogs, POLL_INTERVAL);
})();
