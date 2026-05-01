// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RECORD: DISCARD BUTTON
//   File:    js/2.0_records/dashboard/edit_record_discard.js
//   Version: 1.0.0
//   Purpose: Self-contained module that renders the [Discard] action button
//            into the Providence Column 1 actions group and wires the
//            hard-reset handler to re-render the full editor via the
//            orchestrator, discarding all unsaved changes.
//   Source:  guide_dashboard_appearance.md §2.2
//
// =============================================================================

// Trigger: edit_record.js orchestrator -> window.renderEditRecordDiscard(recordId, containerId, useProvidenceColumns)
// Function: Injects the [Discard] button into #record-actions-group (or the
//           legacy container) and binds the click handler to hard-reset the
//           form by re-calling window.renderEditRecord with the same args.
// Output: Button rendered; on click, the editor is fully re-rendered

window.renderEditRecordDiscard = function (
  recordId,
  containerId,
  useProvidenceColumns,
) {
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
    '<button class="blog-editor-action-btn btn-discard-record" id="btn-discard-record">Discard</button>';
  targetEl.insertAdjacentHTML("beforeend", btnHtml);

  // ---- Wire the click handler ----
  var discardBtn = document.getElementById("btn-discard-record");
  if (!discardBtn) return;

  discardBtn.addEventListener("click", function () {
    if (typeof window.renderEditRecord === "function") {
      window.renderEditRecord(containerId, recordId, useProvidenceColumns);
    }
  });
};
