// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RECORD: DELETE BUTTON
//   File:    js/2.0_records/dashboard/edit_record_delete.js
//   Version: 1.0.0
//   Purpose: Self-contained module that renders the [Delete] action button
//            into the Providence Column 1 actions group only when a
//            recordId is provided, and wires the confirmation-gated DELETE
//            API call to /api/admin/records/:id with navigation back to the
//            All Records list on success.
//   Source:  guide_dashboard_appearance.md §2.2
//
// =============================================================================

// Trigger: edit_record.js orchestrator -> window.renderEditRecordDelete(recordId, containerId, useProvidenceColumns)
// Function: If recordId is provided, injects the [Delete] button into
//           #record-actions-group (or the legacy container) and binds the
//           click handler with a confirmation dialog and DELETE API call.
//           If recordId is null/undefined, does nothing (new record mode).
// Output: Button rendered (existing record) or silently skipped (new record);
//         on confirmed click, record is deleted and user is navigated back to
//         the All Records list

window.renderEditRecordDelete = function (
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
    '<button class="blog-editor-action-btn is-danger" id="btn-delete-record">Delete</button>';
  targetEl.insertAdjacentHTML("beforeend", btnHtml);

  // ---- Wire the click handler ----
  var deleteBtn = document.getElementById("btn-delete-record");
  if (!deleteBtn) return;

  deleteBtn.addEventListener("click", function () {
    if (
      !confirm(
        "Are you sure you want to delete this record? This action cannot be undone.",
      )
    )
      return;

    window._showEditRecordStatus("Deleting...", "loading");

    fetch("/api/admin/records/" + encodeURIComponent(recordId), {
      method: "DELETE",
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Delete failed with status " + res.status);
        // Navigate back to §2.1 All Records list
        var editLink = document.querySelector('[data-module="records-edit"]');
        if (editLink) {
          editLink.click();
        } else {
          window.location.reload();
        }
      })
      .catch(function (err) {
        console.error("Delete error:", err);
        window._showEditRecordStatus(
          "Failed to delete record. " + err.message,
          "error",
        );
      });
  });
};
