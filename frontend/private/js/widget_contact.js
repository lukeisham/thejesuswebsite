/**
 * widget_contact.js
 * ─────────────────
 * Polls the backend for unread Contact Form submissions.
 * When found, visually renders them, dispatches an event to the internal Agent Chat,
 * and clears them from the server so they don't persist in the Work Queue.
 */

(function initContactWidget() {
    "use strict";

    var contactList = document.getElementById("contact-list");
    if (!contactList || contactList.dataset.wgtInit) return;
    contactList.dataset.wgtInit = "true";

    var POLL_INTERVAL = 10000; // 10 seconds

    function formatTime(isoString) {
        var d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function renderContacts(dataArray) {
        if (!dataArray || dataArray.length === 0) return; // Only update on action

        // If it was empty placeholder, clear it
        if (contactList.innerHTML.includes("Waiting for new messages")) {
            contactList.innerHTML = "";
        }

        dataArray.forEach(function (msg) {
            // Build UI Node
            var li = document.createElement("li");
            li.style.cssText = "padding: 8px 0; border-bottom: 1px solid #eee; display: flex; flex-direction: column; gap: 4px;";

            var topRow = document.createElement("div");
            topRow.style.cssText = "display: flex; justify-content: space-between; align-items: center;";

            var titleSpan = document.createElement("strong");
            titleSpan.style.cssText = "font-size: 0.85rem; color: #111827;";
            titleSpan.textContent = msg.name + " (" + msg.email + ")";

            var badge = document.createElement("span");
            if (msg.source_type === "Human") {
                badge.style.cssText = "padding: 2px 6px; border-radius: 4px; font-weight: bold; background: #f0fdf4; color: #16a34a; border: 1px solid #4ade80; font-size: 0.65rem; text-transform: uppercase;";
            } else {
                badge.style.cssText = "padding: 2px 6px; border-radius: 4px; font-weight: bold; background: #eff6ff; color: #2563eb; border: 1px solid #93c5fd; font-size: 0.65rem; text-transform: uppercase;";
            }
            badge.textContent = msg.source_type;

            var copyBtn = document.createElement("button");
            copyBtn.innerHTML = "📄";
            copyBtn.style.cssText = "background: none; border: none; cursor: pointer; padding: 0 4px; font-size: 0.8rem; opacity: 0.6; margin-left: 8px;";
            copyBtn.title = "Copy Sender & Message";
            copyBtn.onclick = function () {
                var cStr = "From: " + msg.name + " (" + msg.email + ")\n" +
                    "Subject: " + msg.subject + "\n" +
                    "Date: " + formatTime(msg.sent_at) + "\n\n" +
                    msg.body;
                navigator.clipboard.writeText(cStr).then(function () {
                    copyBtn.innerHTML = "✅";
                    setTimeout(function () { copyBtn.innerHTML = "📄"; }, 2000);
                }).catch(console.error);
            };

            var rightCol = document.createElement("div");
            rightCol.style.display = "flex";
            rightCol.style.alignItems = "center";
            rightCol.appendChild(badge);
            rightCol.appendChild(copyBtn);

            topRow.appendChild(titleSpan);
            topRow.appendChild(rightCol);

            var midRow = document.createElement("div");
            midRow.style.cssText = "font-size: 0.75rem; color: #6b7280; display: flex; justify-content: space-between;";
            midRow.innerHTML = "<span>" + msg.subject + "</span><span>" + formatTime(msg.sent_at) + "</span>";

            var btmRow = document.createElement("div");
            btmRow.style.cssText = "font-size: 0.8rem; color: #4b5563; margin-top: 4px; white-space: pre-wrap;";
            btmRow.textContent = msg.body;

            li.appendChild(topRow);
            li.appendChild(midRow);
            li.appendChild(btmRow);

            // Insert at top
            contactList.insertBefore(li, contactList.firstChild);

            // Forward to Agent Chat
            var summaryStr = "Received a new form submission from **" + msg.name + "**.\n" +
                "The system suspects the sender is a **" + msg.source_type + "**.\n" +
                "Message: \"" + msg.body.substring(0, 150) + "...\"";

            var ev = new CustomEvent("ContactSummaryEvent", { detail: summaryStr });
            window.dispatchEvent(ev);

            // Mark Read explicitly to delete it from the Work Queue since we observed it natively
            markContactRead(msg.msg_id);
        });
    }

    function markContactRead(id) {
        var token = sessionStorage.getItem("auth_token") || "";
        fetch("/api/v1/admin/contacts/" + encodeURIComponent(id) + "/read", {
            method: "PATCH",
            headers: { "Authorization": "Bearer " + token }
        }).catch(console.error);
    }

    function pollContacts() {
        var token = sessionStorage.getItem("auth_token") || "";
        fetch("/api/v1/admin/contacts/unread", {
            headers: { "Authorization": "Bearer " + token }
        })
            .then(function (res) {
                if (!res.ok) throw new Error("Contact Fetch failed");
                return res.json();
            })
            .then(renderContacts)
            .catch(function (err) {
                console.error("Admin Contact Sync Error:", err);
            });
    }

    // Begin Loop
    setInterval(pollContacts, POLL_INTERVAL);
    pollContacts(); // Initial run

})();
