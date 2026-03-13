/**
 * edit_records.js
 * ───────────────
 * Full CRUD interface for Records in the admin dashboard.
 *
 * Operations:
 *   CREATE  – "+ Add Record" clears the form; "Save & Publish" posts to POST /api/v1/records/publish
 *   READ    – On load, fetches all records and renders them in the list and feed view
 *   UPDATE  – Clicking an existing record populates the form; "Save & Publish" detects an id
 *             and sends PUT /api/v1/records/:id instead
 *   DELETE  – "✕" button on each list row sends DELETE /api/v1/records/:id
 *   DRAFT   – "Save Draft" always posts to POST /api/v1/records/draft
 */
(function initEditRecords() {
    "use strict";

    var listEl = document.getElementById("records-edit-list");
    var addBtn = document.getElementById("add-record");
    if (!listEl) return;

    var token = sessionStorage.getItem("auth_token") || "";
    var allRecords = [];

    // ── Form field refs ───────────────────────────────────────────────────
    var formEl        = document.getElementById("record-detail-form");
    var idField       = document.getElementById("record-id-field");
    var nameField     = document.getElementById("record-name-field");
    var categoryField = document.getElementById("record-category-field");
    var contentField  = document.getElementById("record-content-field");
    var keywordsField = document.getElementById("record-keywords-field");
    var descField     = document.getElementById("record-desc-field");
    var pvBook        = document.getElementById("record-pv-book");
    var pvChapter     = document.getElementById("record-pv-chapter");
    var pvVerse       = document.getElementById("record-pv-verse");
    var svBook        = document.getElementById("record-sv-book");
    var svChapter     = document.getElementById("record-sv-chapter");
    var svVerse       = document.getElementById("record-sv-verse");
    var tlEvent       = document.getElementById("record-tl-event");
    var tlEra         = document.getElementById("record-tl-era");
    var tlDesc        = document.getElementById("record-tl-desc");
    var mapType       = document.getElementById("record-map-type");
    var mapLat        = document.getElementById("record-map-lat");
    var mapLng        = document.getElementById("record-map-lng");
    var mapLabel      = document.getElementById("record-map-label");
    var picField      = document.getElementById("record-picture-field");
    var bibContainer  = document.getElementById("record-bib-entries");
    var infoBar       = document.getElementById("record-info-bar");
    var infoId        = document.getElementById("record-info-id");
    var infoCreated   = document.getElementById("record-info-created");
    var infoUpdated   = document.getElementById("record-info-updated");

    var clearBtn      = document.getElementById("clear-record-form");
    var saveDraftBtn  = document.getElementById("save-record-draft");
    var publishBtn    = document.getElementById("publish-record");
    var formHeading   = formEl ? formEl.querySelector("h4") : null;

    // ── Helpers ───────────────────────────────────────────────────────────

    function authHeaders(extra) {
        return Object.assign({ Authorization: "Bearer " + token }, extra || {});
    }

    function showStatus(msg, isError) {
        var el = document.getElementById("record-crud-status");
        if (!el) {
            el = document.createElement("p");
            el.id = "record-crud-status";
            el.style.cssText = "font-size:0.8rem;padding:6px 0;margin:4px 0;";
            if (formEl) formEl.insertBefore(el, formEl.firstChild);
        }
        el.textContent = msg;
        el.style.color = isError ? "#c0392b" : "#27ae60";
        clearTimeout(el._timer);
        el._timer = setTimeout(function () { el.textContent = ""; }, 4000);
    }

    // ── Form population / clearing ────────────────────────────────────────

    function clearForm() {
        if (!formEl) return;
        idField.value = "";
        nameField.value = "";
        if (categoryField) categoryField.value = "";
        if (contentField) contentField.value = "";
        if (keywordsField) keywordsField.value = "";
        descField.value = "";
        if (pvBook) pvBook.value = "";
        if (pvChapter) pvChapter.value = "";
        if (pvVerse) pvVerse.value = "";
        if (svBook) svBook.value = "";
        if (svChapter) svChapter.value = "";
        if (svVerse) svVerse.value = "";
        if (tlEvent) tlEvent.value = "";
        if (tlEra) tlEra.value = "";
        if (tlDesc) tlDesc.value = "";
        if (mapType) mapType.value = "";
        if (mapLat) mapLat.value = "";
        if (mapLng) mapLng.value = "";
        if (mapLabel) mapLabel.value = "";
        if (picField) picField.value = "";
        if (bibContainer) bibContainer.innerHTML = "";
        if (formHeading) formHeading.textContent = "New Record";
        if (infoBar)     { infoBar.style.display = "none"; }
        if (infoId)      infoId.textContent = "";
        if (infoCreated) infoCreated.textContent = "";
        if (infoUpdated) infoUpdated.textContent = "";
        formEl.style.display = "block";
    }

    function populateForm(r) {
        if (!formEl) return;
        idField.value = r.id || "";
        nameField.value = r.name || "";

        // Category: PascalCase ("Event", "Location", "Person", "Theme")
        if (categoryField) categoryField.value = r.category || "";

        // Content type comes from r.content.category (lowercase: "miracle" etc.)
        if (contentField) {
            var ct = (r.content && r.content.category) ? r.content.category : "";
            contentField.value = ct.toLowerCase();
        }

        // Keywords from r.metadata.keywords array
        if (keywordsField) {
            keywordsField.value = (r.metadata && Array.isArray(r.metadata.keywords))
                ? r.metadata.keywords.join(", ")
                : "";
        }

        // Description: Vec<String> → newline-separated
        descField.value = Array.isArray(r.description)
            ? r.description.join("\n")
            : (r.description || "");

        // Primary verse: { book: "John", chapter: 3, verse: 16 }
        if (r.primary_verse) {
            if (pvBook) pvBook.value = r.primary_verse.book || "";
            if (pvChapter) pvChapter.value = r.primary_verse.chapter || "";
            if (pvVerse) pvVerse.value = r.primary_verse.verse || "";
        }
        // Secondary verse (optional)
        if (r.secondary_verse) {
            if (svBook) svBook.value = r.secondary_verse.book || "";
            if (svChapter) svChapter.value = r.secondary_verse.chapter || "";
            if (svVerse) svVerse.value = r.secondary_verse.verse || "";
        } else {
            if (svBook) svBook.value = "";
            if (svChapter) svChapter.value = "";
            if (svVerse) svVerse.value = "";
        }

        // Timeline: { event_name, era (kebab-case), description }
        if (r.timeline) {
            if (tlEvent) tlEvent.value = r.timeline.event_name || "";
            if (tlEra) tlEra.value = r.timeline.era || "";
            if (tlDesc) tlDesc.value = r.timeline.description || "";
        }

        // Map: { label: "Overview", points: [{ latitude, longitude, title }] }
        if (r.map_data) {
            if (mapType) mapType.value = r.map_data.label || "";
            var pt = r.map_data.points && r.map_data.points[0];
            if (pt) {
                if (mapLat) mapLat.value = pt.latitude || "";
                if (mapLng) mapLng.value = pt.longitude || "";
                if (mapLabel) mapLabel.value = pt.title || "";
            } else {
                if (mapLat) mapLat.value = "";
                if (mapLng) mapLng.value = "";
                if (mapLabel) mapLabel.value = "";
            }
        }

        // Bibliography: [{ author: { Name: "..." }, title: { Full: "..." } }]
        if (bibContainer && Array.isArray(r.bibliography)) {
            bibContainer.innerHTML = "";
            r.bibliography.forEach(function (src) {
                var authorVal = src.author
                    ? (src.author.Name || src.author.Orcid || JSON.stringify(src.author))
                    : "";
                var titleVal = src.title
                    ? (src.title.Full || src.title.Short || JSON.stringify(src.title))
                    : "";
                addBibEntryWithValues(authorVal, titleVal);
            });
        }

        // ── Populate read-only info bar ──
        if (infoBar) {
            infoBar.style.display = "block";
            if (infoId)      infoId.textContent  = r.id || "—";
            if (infoCreated) infoCreated.textContent =
                r.created_at ? new Date(r.created_at).toLocaleString() : "Unknown";
            if (infoUpdated) infoUpdated.textContent =
                r.updated_at ? new Date(r.updated_at).toLocaleString() : "Never updated";
        }

        if (formHeading) formHeading.textContent = "Editing: " + (r.name || "Record");
        formEl.style.display = "block";
        formEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // ── Collect form → PublishRecordRequest payload ───────────────────────
    // Shape: { name, description, category, primary_verse, timeline, map_data }

    function getPublishPayload() {
        var pvBookVal = pvBook ? pvBook.value : "";
        var pvCh = pvChapter ? (parseInt(pvChapter.value, 10) || 1) : 1;
        var pvVs = pvVerse ? (parseInt(pvVerse.value, 10) || 1) : 1;
        var primaryVerseStr = pvBookVal
            ? (pvBookVal + " " + pvCh + ":" + pvVs)
            : "John 1:1";

        return {
            name: nameField.value.trim(),
            description: descField.value.trim(),
            category: categoryField ? (categoryField.value || "Theme") : "Theme",
            primary_verse: primaryVerseStr,
            timeline: {
                event_name: tlEvent ? tlEvent.value.trim() : "",
                era: tlEra ? (tlEra.value || "theme") : "theme",
            },
            map_data: {
                region: mapType ? (mapType.value || "Overview") : "Overview",
                lat: mapLat ? (parseFloat(mapLat.value) || 0.0) : 0.0,
                lng: mapLng ? (parseFloat(mapLng.value) || 0.0) : 0.0,
            },
        };
    }

    function getDraftPayload() {
        return {
            id: (idField && idField.value) ? idField.value : undefined,
            name: nameField.value.trim(),
            type: categoryField ? (categoryField.value || "Theme") : "Theme",
            region: mapType ? (mapType.value || "Overview") : "Overview",
        };
    }

    // ── Bibliography helpers ──────────────────────────────────────────────

    function addBibEntryWithValues(author, title) {
        if (!bibContainer) return;
        var div = document.createElement("div");
        div.className = "bib-entry";
        div.style.cssText = "display:flex;gap:4px;margin-bottom:4px;";
        div.innerHTML =
            '<input type="text" class="bib-author input-field" placeholder="Author"' +
            ' style="flex:1;padding:8px;box-sizing:border-box;">' +
            '<input type="text" class="bib-title input-field" placeholder="Title"' +
            ' style="flex:2;padding:8px;box-sizing:border-box;">' +
            '<button type="button" class="btn-secondary" style="padding:4px 8px;"' +
            ' onclick="this.closest(\'.bib-entry\').remove();">&times;</button>';
        bibContainer.appendChild(div);
        div.querySelector(".bib-author").value = author || "";
        div.querySelector(".bib-title").value = title || "";
    }

    // Expose globally so the inline onclick="addBibEntry()" in dashboard.html works
    window.addBibEntry = function () { addBibEntryWithValues("", ""); };

    // ── Render list ───────────────────────────────────────────────────────

    function loadRecords() {
        fetch("/api/v1/records", { headers: authHeaders() })
            .then(function (res) {
                if (!res.ok) throw new Error("Load failed (" + res.status + ")");
                return res.json();
            })
            .then(function (json) {
                var records = (json && json.data && json.data.records) ? json.data.records : [];
                allRecords = records;
                renderList(records);
            })
            .catch(function (err) {
                listEl.innerHTML = '<li style="color:#c0392b;">' + err.message + "</li>";
            });
    }

    function renderList(records) {
        listEl.innerHTML = "";
        var feedEl = document.getElementById("record-feed");
        if (feedEl) feedEl.innerHTML = "";

        if (!records || records.length === 0) {
            listEl.innerHTML = '<li style="color:#999;">No records found.</li>';
            if (feedEl) feedEl.innerHTML =
                '<p style="color:#999;padding:20px;text-align:center;">No records match.</p>';
            return;
        }

        records.forEach(function (r) {

            // ── List row ──
            var li = document.createElement("li");
            li.style.cssText =
                "display:flex;align-items:center;gap:6px;padding:5px 2px;" +
                "border-bottom:1px solid var(--border-color,#eee);";

            var nameLink = document.createElement("a");
            nameLink.href = "#";
            nameLink.style.cssText = "flex:1;font-size:0.85rem;color:var(--text-color,#333);";
            nameLink.textContent = r.name || "Untitled";
            nameLink.addEventListener("click", function (e) {
                e.preventDefault();
                populateForm(r);
                var crudTab = document.querySelector('.tab[data-target="crud-records"]');
                if (crudTab) crudTab.click();
            });

            var catBadge = document.createElement("span");
            catBadge.className = "label";
            catBadge.style.cssText = "font-size:0.7rem;white-space:nowrap;";
            catBadge.textContent = r.category || "—";

            var delBtn = document.createElement("button");
            delBtn.title = "Delete this record";
            delBtn.textContent = "✕";
            delBtn.style.cssText =
                "background:none;border:none;color:#c0392b;cursor:pointer;" +
                "font-size:0.85rem;padding:2px 5px;line-height:1;flex-shrink:0;";
            delBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                deleteRecord(r.id, r.name, li);
            });

            li.appendChild(nameLink);
            li.appendChild(catBadge);
            li.appendChild(delBtn);
            listEl.appendChild(li);

            // ── Feed item ──
            if (feedEl && typeof window.createRecordFeedItem === "function") {
                var feedItem = window.createRecordFeedItem(r);
                feedItem.style.cursor = "pointer";
                feedItem.addEventListener("click", function () {
                    populateForm(r);
                    var crudTab = document.querySelector('.tab[data-target="crud-records"]');
                    if (crudTab) crudTab.click();
                });
                feedEl.appendChild(feedItem);
            }
        });
    }

    // ── CRUD operations ───────────────────────────────────────────────────

    function deleteRecord(id, name, rowEl) {
        if (!confirm('Delete "' + (name || id) + '"?\nThis cannot be undone.')) return;

        fetch("/api/v1/records/" + encodeURIComponent(id), {
            method: "DELETE",
            headers: authHeaders(),
        })
        .then(function (res) {
            return res.json().then(function (j) { return { ok: res.ok, body: j }; });
        })
        .then(function (r) {
            if (r.ok) {
                allRecords = allRecords.filter(function (rec) { return rec.id !== id; });
                if (rowEl && rowEl.parentNode) rowEl.parentNode.removeChild(rowEl);
                showStatus('Deleted "' + (name || id) + '"');
                if (idField && idField.value === id) clearForm();
            } else {
                showStatus((r.body && r.body.message) || "Delete failed", true);
            }
        })
        .catch(function (err) { showStatus("Delete error: " + err.message, true); });
    }

    function saveAsDraft() {
        var data = getDraftPayload();
        if (!data.name) { showStatus("Name is required", true); return; }

        fetch("/api/v1/records/draft", {
            method: "POST",
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(data),
        })
        .then(function (res) {
            return res.json().then(function (j) { return { ok: res.ok, body: j }; });
        })
        .then(function (r) {
            if (r.ok) showStatus("Draft saved");
            else showStatus((r.body && r.body.message) || "Draft save failed", true);
        })
        .catch(function (err) { showStatus("Error: " + err.message, true); });
    }

    function publishOrUpdate() {
        var payload = getPublishPayload();
        if (!payload.name) { showStatus("Name is required", true); return; }

        var existingId = idField ? idField.value.trim() : "";
        var isUpdate = Boolean(existingId);
        var url    = isUpdate
            ? "/api/v1/records/" + encodeURIComponent(existingId)
            : "/api/v1/records/publish";
        var method = isUpdate ? "PUT" : "POST";

        fetch(url, {
            method: method,
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        })
        .then(function (res) {
            return res.json().then(function (j) { return { ok: res.ok, body: j }; });
        })
        .then(function (r) {
            if (r.ok) {
                showStatus(isUpdate ? "Record updated ✓" : "Record published ✓");
                loadRecords();
                if (!isUpdate) clearForm();
            } else {
                showStatus((r.body && r.body.message) || (isUpdate ? "Update failed" : "Publish failed"), true);
            }
        })
        .catch(function (err) { showStatus("Error: " + err.message, true); });
    }

    // ── Expose populateForm for viewer panel "Edit in CRUD" button ────────
    window.editRecordInCRUD = function (record) {
        populateForm(record);
        var crudTab = document.querySelector('.tab[data-target="crud-records"]');
        if (crudTab) crudTab.click();
    };

    // ── Event listeners ───────────────────────────────────────────────────

    if (addBtn) addBtn.addEventListener("click", clearForm);
    if (clearBtn) clearBtn.addEventListener("click", clearForm);
    if (saveDraftBtn) saveDraftBtn.addEventListener("click", saveAsDraft);
    if (publishBtn) publishBtn.addEventListener("click", publishOrUpdate);

    var searchInput = document.getElementById("search-records-input");
    if (searchInput) {
        searchInput.addEventListener("input", function (e) {
            var q = e.target.value.toLowerCase();
            var filtered = allRecords.filter(function (r) {
                return (r.name || "").toLowerCase().indexOf(q) !== -1;
            });
            renderList(filtered);
        });
    }

    // ── Initial load ──────────────────────────────────────────────────────
    loadRecords();

})();
