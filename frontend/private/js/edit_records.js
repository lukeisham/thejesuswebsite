/**
 * edit_records.js
 * ───────────────
 * Quick-edit interface for records in the dashboard.
 * Lists records and allows adding new ones.
 */
(function initEditRecords() {
    "use strict";

    var listEl = document.getElementById("records-edit-list");
    var addBtn = document.getElementById("add-record");

    if (!listEl) return;

    var token = sessionStorage.getItem("auth_token") || "";

    var allRecords = []; // Cache for local search filtering

    // Form elements
    var formEl = document.getElementById("record-detail-form");
    var idField = document.getElementById("record-id-field");
    var nameField = document.getElementById("record-name-field");
    var typeField = document.getElementById("record-type-field");
    var regionField = document.getElementById("record-region-field");
    var categoryField = document.getElementById("record-category-field");
    var descField = document.getElementById("record-desc-field");

    var clearBtn = document.getElementById("clear-record-form");
    var saveDraftBtn = document.getElementById("save-record-draft");
    var publishBtn = document.getElementById("publish-record");

    function clearForm() {
        if (!idField) return;
        idField.value = "";
        nameField.value = "";
        typeField.value = "";
        regionField.value = "";
        categoryField.value = "";
        descField.value = "";
        formEl.style.display = "block";
    }

    function populateForm(r) {
        if (!idField) return;
        idField.value = r.id || "";
        nameField.value = r.name || r.title || "";
        typeField.value = r.type || "";
        regionField.value = r.region || "";
        categoryField.value = r.category || "";
        descField.value = Array.isArray(r.description) ? r.description.join("\n") : (r.description || "");
        formEl.style.display = "block";
    }

    /** Fetch records from the server. */
    function loadRecords() {
        // Only load if authorized, though backend might not strictly check for dashboard views yet 
        fetch("/api/v1/records", {
            headers: { Authorization: "Bearer " + token },
        })
            .then(function (res) {
                if (!res.ok) throw new Error("Failed to load records");
                return res.json();
            })
            .then(function (records) {
                allRecords = records;
                renderList(records);
            })
            .catch(function (err) {
                listEl.innerHTML =
                    '<li style="color:#999;">' + err.message + "</li>";
            });
    }

    // --- Search Functionality ---
    var searchInput = document.getElementById("search-records-input");
    if (searchInput) {
        searchInput.addEventListener("input", function (e) {
            var q = e.target.value.toLowerCase();
            var filtered = allRecords.filter(function (r) {
                return (r.name || r.title || "").toLowerCase().indexOf(q) !== -1;
            });
            renderList(filtered);
        });
    }

    /** Render record list items. */
    function renderList(records) {
        listEl.innerHTML = "";

        if (!records || records.length === 0) {
            listEl.innerHTML =
                '<li style="color:#999;">No records loaded.</li>';
            return;
        }

        records.forEach(function (r) {
            var item;
            if (typeof window.createRecordCard === "function") {
                item = window.createRecordCard(r);
                item.style.cursor = "pointer";
                item.style.marginBottom = "10px";
                item.addEventListener("click", function () {
                    populateForm(r);
                });
                listEl.appendChild(item);
            } else {
                var li = document.createElement("li");
                var link = document.createElement("a");
                link.href = "#";
                link.textContent = r.name || r.title || "Untitled Record";
                link.addEventListener("click", function (e) {
                    e.preventDefault();
                    populateForm(r);
                });
                var region = document.createElement("span");
                region.className = "label";
                region.style.cssFloat = "right";
                region.textContent = r.region || "—";
                link.appendChild(region);
                li.appendChild(link);
                listEl.appendChild(li);
            }
        });
    }

    /** Add a new record. */
    if (addBtn) {
        addBtn.addEventListener("click", function () {
            clearForm();
        });
    }

    if (clearBtn) clearBtn.addEventListener("click", clearForm);

    function getFormData() {
        return {
            id: idField.value,
            name: nameField.value,
            type: typeField.value,
            region: regionField.value,
            category: categoryField.value,
            description: descField.value.split("\n").filter(function (l) { return l.trim(); })
        };
    }

    if (saveDraftBtn) {
        saveDraftBtn.addEventListener("click", function () {
            var data = getFormData();
            fetch("/api/v1/records/draft", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token
                },
                body: JSON.stringify(data)
            }).then(function (res) {
                if (res.ok) alert("Draft saved!");
                else alert("Save failed.");
            });
        });
    }

    if (publishBtn) {
        publishBtn.addEventListener("click", function () {
            var data = getFormData();
            fetch("/api/v1/records/publish", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token
                },
                body: JSON.stringify(data)
            }).then(function (res) {
                if (res.ok) alert("Published!");
                else alert("Publish failed.");
            });
        });
    }

    // Initial load
    loadRecords();
})();
