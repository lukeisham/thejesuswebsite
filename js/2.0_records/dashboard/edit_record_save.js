// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RECORD: SAVE CHANGES BUTTON
//   File:    js/2.0_records/dashboard/edit_record_save.js
//   Version: 1.0.0
//   Purpose: Self-contained module that renders the [Save Changes] action
//            button into the Providence Column 1 (#canvas-col-actions) and
//            wires the full save pipeline: collect from sub-modules, validate
//            JSON blobs, generate ULID on create, set timestamps, POST/PUT to
//            /api/admin/records, and show status feedback.
//   Source:  guide_dashboard_appearance.md §2.2
//
// =============================================================================

// Trigger: edit_record.js orchestrator -> window.renderEditRecordSave(recordId, containerId, useProvidenceColumns)
// Function: Injects the [Save Changes] button into #canvas-col-actions (or
//           the legacy container) and binds the click handler to collect form
//           data from sub-module window.collectEdit*() APIs, validate, and
//           POST/PUT to the admin API.
// Output: Button rendered; on click, record is saved via API and status shown

window.renderEditRecordSave = function (
  recordId,
  containerId,
  useProvidenceColumns,
) {
  // In Providence mode, inject into the record-actions-group wrapper;
  // in legacy mode, inject directly into the container.
  var targetEl = null;
  if (useProvidenceColumns) {
    targetEl = document.getElementById("record-actions-group");
    if (!targetEl) {
      // Fallback: group wrapper not found, inject directly into col-actions
      targetEl = document.getElementById("canvas-col-actions");
    }
  } else if (containerId) {
    targetEl = document.getElementById(containerId);
  }
  if (!targetEl) return;

  // ---- Render the button ----
  var btnHtml =
    '<button class="blog-editor-action-btn" id="btn-save-record">Save Changes</button>';
  targetEl.insertAdjacentHTML("beforeend", btnHtml);

  // ---- Wire the click handler ----
  var saveBtn = document.getElementById("btn-save-record");
  if (!saveBtn) return;

  saveBtn.addEventListener("click", function () {
    var saveData = {};

    // ---- Core Identifiers (delegated to sub-module) ----
    if (typeof window.collectEditCore === "function") {
      var coreData = window.collectEditCore();
      saveData.title = coreData.title;
      saveData.slug = coreData.slug;
    }

    // ---- Taxonomy (delegated to sub-module) ----
    if (typeof window.collectEditTaxonomy === "function") {
      var taxData = window.collectEditTaxonomy();
      saveData.era = taxData.era;
      saveData.timeline = taxData.timeline;
      saveData.map_label = taxData.map_label;
      saveData.gospel_category = taxData.gospel_category;
      saveData.geo_id = taxData.geo_id;
      saveData.parent_id = taxData.parent_id;
    }

    // ---- Verses (JSON in hidden inputs) ----
    var pvEl = document.getElementById("record-primary-verse");
    saveData.primary_verse = pvEl ? pvEl.value : "[]";

    var svEl = document.getElementById("record-secondary-verse");
    saveData.secondary_verse = svEl ? svEl.value : "[]";

    // ---- Text Content (JSON in hidden inputs) ----
    var descEl = document.getElementById("record-description");
    saveData.description = descEl ? descEl.value : "[]";

    var snipEl = document.getElementById("record-snippet");
    saveData.snippet = snipEl ? snipEl.value : "[]";

    // ---- Bibliography (delegated to sub-module) ----
    if (typeof window.collectEditBibliography === "function") {
      var bibData = window.collectEditBibliography();
      saveData.bibliography = bibData.bibliography;
    }

    // ---- Miscellaneous (delegated to sub-module) ----
    if (typeof window.collectEditMisc === "function") {
      var miscData = window.collectEditMisc();
      saveData.metadata_json = miscData.metadata_json;
      saveData.iaa = miscData.iaa;
      saveData.pledius = miscData.pledius;
      saveData.manuscript = miscData.manuscript;
      saveData.url = miscData.url;
    }

    // ---- Relations & Links (context_links hidden field) ----
    var contextLinksEl = document.getElementById("context-links-hidden");
    saveData.context_links = contextLinksEl ? contextLinksEl.value : "[]";

    // ---- Validate JSON blobs ----
    var jsonFields = ["metadata_json", "url"];
    for (var ji = 0; ji < jsonFields.length; ji++) {
      var val = saveData[jsonFields[ji]];
      if (val && val.trim() !== "") {
        try {
          JSON.parse(val);
        } catch (e) {
          window._showEditRecordStatus(
            "Invalid JSON in " + jsonFields[ji] + ". Please fix and try again.",
            "error",
          );
          return;
        }
      }
    }

    // ---- Set timestamps and ID ----
    if (!recordId) {
      saveData.id = window._generateEditRecordUlid();
      saveData.created_at = new Date().toISOString();
      saveData.updated_at = saveData.created_at;
    } else {
      saveData.updated_at = new Date().toISOString();
    }

    var method = recordId ? "PUT" : "POST";
    var url = recordId
      ? "/api/admin/records/" + encodeURIComponent(recordId)
      : "/api/admin/records";

    window._showEditRecordStatus("Saving...", "loading");

    fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saveData),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Save failed with status " + res.status);
        return res.json();
      })
      .then(function () {
        window._showEditRecordStatus("Record saved successfully.", "success");
      })
      .catch(function (err) {
        console.error("Save error:", err);
        window._showEditRecordStatus(
          "Failed to save record. " + err.message,
          "error",
        );
      });
  });
};
