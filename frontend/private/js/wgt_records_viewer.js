/**
 * wgt_records_viewer.js
 * ─────────────────────
 * Wires the System Data Viewer panel for the "Records" tab.
 *
 * When the user clicks the "Records" viewer tab:
 *   - Fetches all records from GET /api/v1/records
 *   - Renders them as checkable rows in #viewer-results-list
 *   - Wires #btn-viewer-delete  → DELETE /api/v1/records/:id (for each checked row)
 *   - Wires #btn-viewer-edit    → populate the CRUD form with the first selected record
 *   - Wires #btn-viewer-publish → (noop for records — they're already published; shows message)
 *   - Wires #viewer-select-all  → check/uncheck all rows
 */
(function initRecordsViewer() {
    "use strict";

    var token = sessionStorage.getItem("auth_token") || "";

    var viewerList  = document.getElementById("viewer-results-list");
    var selectAll   = document.getElementById("viewer-select-all");
    var deleteBtn   = document.getElementById("btn-viewer-delete");
    var editBtn     = document.getElementById("btn-viewer-edit");
    var publishBtn  = document.getElementById("btn-viewer-publish");

    if (!viewerList) return;

    // Track whether this viewer is currently showing records
    var activeForRecords = false;
    var viewerRecords = [];   // cache of currently displayed records

    // ── Helpers ───────────────────────────────────────────────────────────

    function authHeaders(extra) {
        return Object.assign({ Authorization: "Bearer " + token }, extra || {});
    }

    function getCheckedIds() {
        return Array.from(viewerList.querySelectorAll(".viewer-checkbox:checked"))
            .map(function (cb) { return cb.dataset.recordId; })
            .filter(Boolean);
    }

    function getCheckedRecords() {
        var ids = getCheckedIds();
        return viewerRecords.filter(function (r) { return ids.indexOf(r.id) !== -1; });
    }

    // ── Render ────────────────────────────────────────────────────────────

    function loadAndRender() {
        viewerList.innerHTML =
            '<li style="color:#999;font-size:0.85rem;padding:8px;">Loading records…</li>';
        activeForRecords = true;

        fetch("/api/v1/records", { headers: authHeaders() })
            .then(function (res) {
                if (!res.ok) throw new Error("Failed to load records (" + res.status + ")");
                return res.json();
            })
            .then(function (json) {
                var records = (json && json.data && json.data.records) ? json.data.records : [];
                viewerRecords = records;
                renderRows(records);
            })
            .catch(function (err) {
                viewerList.innerHTML =
                    '<li style="color:#c0392b;font-size:0.85rem;padding:8px;">' + err.message + "</li>";
            });
    }

    function renderRows(records) {
        viewerList.innerHTML = "";
        if (!records || records.length === 0) {
            viewerList.innerHTML =
                '<li style="color:#999;font-size:0.85rem;padding:8px;">No records found.</li>';
            return;
        }

        records.forEach(function (r) {
            var li = document.createElement("li");
            li.style.cssText =
                "display:flex;gap:10px;align-items:flex-start;padding:8px 0;" +
                "border-bottom:1px solid #eee;";

            var cb = document.createElement("input");
            cb.type = "checkbox";
            cb.className = "viewer-checkbox";
            cb.dataset.recordId = r.id;
            cb.style.marginTop = "3px";

            var info = document.createElement("div");
            info.style.cssText = "flex:1;font-size:0.85rem;";
            info.innerHTML =
                '<strong>' + (r.name || "Untitled") + '</strong>' +
                ' <span style="color:#888;font-size:0.75rem;">' + (r.category || "") + '</span>' +
                (r.timeline && r.timeline.era
                    ? ' <span style="color:#aaa;font-size:0.72rem;margin-left:6px;">' + r.timeline.era + '</span>'
                    : '') +
                '<br><span style="color:#999;font-size:0.75rem;">' +
                (Array.isArray(r.description) ? r.description[0] || "" : (r.description || "")).substring(0, 100) +
                '</span>';

            li.appendChild(cb);
            li.appendChild(info);
            viewerList.appendChild(li);
        });
    }

    // ── Button handlers ───────────────────────────────────────────────────

    function handleDelete() {
        if (!activeForRecords) return;
        var ids = getCheckedIds();
        if (ids.length === 0) { alert("Select at least one record to delete."); return; }

        if (!confirm("Delete " + ids.length + " record(s)? This cannot be undone.")) return;

        var pending = ids.length;
        var failed = 0;

        ids.forEach(function (id) {
            fetch("/api/v1/records/" + encodeURIComponent(id), {
                method: "DELETE",
                headers: authHeaders(),
            })
            .then(function (res) {
                if (!res.ok) failed++;
                pending--;
                if (pending === 0) {
                    var msg = failed === 0
                        ? "Deleted " + ids.length + " record(s)."
                        : "Deleted " + (ids.length - failed) + ", failed " + failed + ".";
                    alert(msg);
                    loadAndRender(); // Refresh
                }
            })
            .catch(function () {
                failed++;
                pending--;
                if (pending === 0) {
                    alert("Deleted " + (ids.length - failed) + ", failed " + failed + ".");
                    loadAndRender();
                }
            });
        });
    }

    function handleEdit() {
        if (!activeForRecords) return;
        var selected = getCheckedRecords();
        if (selected.length === 0) { alert("Select a record to edit."); return; }
        if (selected.length > 1) { alert("Select only one record to edit."); return; }

        // Delegate to edit_records.js via the exposed global
        if (typeof window.editRecordInCRUD === "function") {
            window.editRecordInCRUD(selected[0]);
            // Also switch the left panel to the Records CRUD tab
            var crudTab = document.querySelector('.tab[data-target="crud-records"]');
            if (crudTab) crudTab.click();
        } else {
            alert("CRUD editor not ready. Please wait for the page to fully load.");
        }
    }

    function handlePublish() {
        if (!activeForRecords) return;
        alert("Records are already published. Use 'Edit in CRUD' to make changes and re-publish.");
    }

    function handleSelectAll() {
        if (!activeForRecords) return;
        var checked = selectAll ? selectAll.checked : false;
        viewerList.querySelectorAll(".viewer-checkbox").forEach(function (cb) {
            cb.checked = checked;
        });
    }

    // ── Tab detection ─────────────────────────────────────────────────────
    // Listen for clicks on the viewer tab strip and activate when "Records" is chosen

    document.addEventListener("click", function (e) {
        var tab = e.target.closest
            ? e.target.closest('.viewer-tabs .tab[data-target="view-records"]')
            : null;
        if (tab) {
            activeForRecords = true;
            loadAndRender();
        } else if (e.target.closest && e.target.closest(".viewer-tabs .tab")) {
            // User switched away from Records tab
            activeForRecords = false;
        }
    });

    // ── Wire action buttons ───────────────────────────────────────────────
    // These buttons are shared with other viewer modes. We only intercept when
    // activeForRecords is true; otherwise let the existing handlers run normally.

    if (deleteBtn) {
        deleteBtn.addEventListener("click", function (e) {
            if (!activeForRecords) return;
            e.stopImmediatePropagation(); // Prevent other listeners for records mode
            handleDelete();
        }, true); // capture phase so we run first
    }

    if (editBtn) {
        editBtn.addEventListener("click", function (e) {
            if (!activeForRecords) return;
            e.stopImmediatePropagation();
            handleEdit();
        }, true);
    }

    if (publishBtn) {
        publishBtn.addEventListener("click", function (e) {
            if (!activeForRecords) return;
            e.stopImmediatePropagation();
            handlePublish();
        }, true);
    }

    if (selectAll) {
        selectAll.addEventListener("change", handleSelectAll);
    }

})();
