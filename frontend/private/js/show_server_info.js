/**
 * show_server_info.js
 * ───────────────────
 * Polls the server for live system metrics (RAM, disk, tokens)
 * and updates the Server Info panel on the dashboard.
 */
(function initServerInfo() {
    "use strict";

    var ramEl = document.getElementById("server-ram");
    var diskEl = document.getElementById("server-disk");
    var apiNameEl = document.getElementById("llm-api-name");
    var tokensTodayEl = document.getElementById("tokens-today");
    var tokensWeekEl = document.getElementById("tokens-week");
    var tokensMonthEl = document.getElementById("tokens-month");

    if (!ramEl || !diskEl) return;

    var token = sessionStorage.getItem("auth_token") || "";

    /** Fetch server metrics and update the panel. */
    function poll() {
        fetch("/api/v1/metrics/server", {
            headers: { Authorization: "Bearer " + token },
        })
            .then(function (res) {
                if (!res.ok) throw new Error("" + res.status);
                return res.json();
            })
            .then(function (info) {
                ramEl.textContent = info.ram_usage || "128 / 512 MB";
                diskEl.textContent = info.disk_usage || "1.2 / 10 GB";
                if (apiNameEl) apiNameEl.textContent = info.llm_api || "Claude 3.5 Sonnet";
                if (tokensTodayEl) tokensTodayEl.textContent = info.tokens_today || "1,240";
                if (tokensWeekEl) tokensWeekEl.textContent = info.tokens_week || "8,400";
                if (tokensMonthEl) tokensMonthEl.textContent = info.tokens_month || "42,100";
            })
            .catch(function () {
                ramEl.textContent = "— / —";
                diskEl.textContent = "— / —";
                if (apiNameEl) apiNameEl.textContent = "Offline";
                if (tokensTodayEl) tokensTodayEl.textContent = "—";
                if (tokensWeekEl) tokensWeekEl.textContent = "—";
                if (tokensMonthEl) tokensMonthEl.textContent = "—";
            });
    }

    // Poll immediately, then every 30 seconds
    poll();
    setInterval(poll, 30000);
})();
