/**
 * show_queue.js
 * ─────────────
 * Loads and displays the work queue (pending AI tasks
 * and processing status) in the dashboard Work Queue panel.
 */
(function initWorkQueue() {
    "use strict";

    var listEl = document.getElementById("queue-list");

    if (!listEl) return;

    var token = sessionStorage.getItem("auth_token") || "";

    /** Fetch work queue items and render them. */
    function loadQueue() {
        fetch("/api/v1/agent/queue", {
            headers: { Authorization: "Bearer " + token },
        })
            .then(function (res) {
                if (!res.ok) throw new Error("Failed to load queue");
                return res.json();
            })
            .then(function (items) {
                renderQueue(items);
            })
            .catch(function (err) {
                listEl.innerHTML =
                    '<li style="color:#999;">' + err.message + "</li>";
            });
    }

    /** Render queue items with status badges. */
    function renderQueue(items) {
        listEl.innerHTML = "";

        if (!items || items.length === 0) {
            listEl.innerHTML =
                '<li style="color:#999;">No items in queue — idle</li>';
            return;
        }

        items.forEach(function (item) {
            var li = document.createElement("li");

            var link = document.createElement("a");
            link.href = "#";
            link.textContent = item.description || item.task || "Task";

            var status = document.createElement("span");
            status.className = "label";
            status.style.cssFloat = "right";
            status.textContent = item.status || "pending";

            link.appendChild(status);
            li.appendChild(link);
            listEl.appendChild(li);
        });
    }

    // Poll immediately, then every 15 seconds
    loadQueue();
    setInterval(loadQueue, 15000);
})();
