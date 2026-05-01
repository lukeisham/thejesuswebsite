// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RECORD: VIEW LIVE BUTTON
//   File:    js/2.0_records/dashboard/edit_record_view_live.js
//   Version: 1.0.0
//   Purpose: Self-contained module that renders the [View Live] action button
//            into the Providence Column 1 actions group only when a
//            recordId is provided, and wires opening the public-facing record
//            page in a new browser tab using the record's slug.
//   Source:  guide_dashboard_appearance.md §2.2
//
// =============================================================================

// Trigger: edit_record.js orchestrator -> window.renderEditRecordViewLive(recordId, containerId, useProvidenceColumns)
// Function: If recordId is provided, injects the [View Live] button into
//           #record-actions-group (or the legacy container) and binds the
//           click handler to read the current slug value from the editor's
//           slug input and open the public URL in a new tab.
//           If recordId is null/undefined, does nothing (new record mode).
// Output: Button rendered (existing record) or silently skipped (new record);
//         on click, public page opens in a new tab (or status error if slug
//         is empty)

window.renderEditRecordViewLive = function (
  recordId,
  containerId,
  useProvidenceColumns,
) {
  // Only render when editing an existing record
  if (!recordId) return;

  var targetEl = null;
  if (useProvidenceColumns) {
    targetEl = document.getElementById("record-actions-group");
    if (!targetEl) {
      targetEl = document.getElementById("canvas-col-actions");
    }
  } else if (containerId) {
    targetEl = document.getElementById(containerId);
  }
  if (!targetEl) return;

  // ---- Render the button ----
  var btnHtml =
    '<button class="blog-editor-action-btn btn-view-live-record" id="btn-view-live-record">View Live</button>';
  targetEl.insertAdjacentHTML("beforeend", btnHtml);

  // ---- Wire the click handler ----
  var viewLiveBtn = document.getElementById("btn-view-live-record");
  if (!viewLiveBtn) return;

  viewLiveBtn.addEventListener("click", function () {
    var slugEl = document.getElementById("record-slug");
    var slug = slugEl ? slugEl.value.trim() : "";
    if (!slug) {
      window._showEditRecordStatus(
        "Cannot open live view: slug is empty.",
        "error",
      );
      return;
    }
    var publicUrl = window.location.origin + "/" + slug;
    window.open(publicUrl, "_blank");
  });
};
