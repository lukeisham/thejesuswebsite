// =============================================================================
//
//   THE JESUS WEBSITE — EDIT INSERT RESPONSE ACADEMIC
//   File:    admin/frontend/edit_modules/edit_insert_response_academic.js
//   Version: 1.2.0
//   Purpose: UI mapping for inserting scholarly responses into academic ranked lists.
//
// =============================================================================

// Trigger: admin_app.js routing -> window.renderEditInsertResponseAcademic
// Function: Renders a form to select an academic debate and attach a response reference
// Output: Injects form HTML classes into the specified container ID

window.renderEditInsertResponseAcademic = function (containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
        <div class="admin-card">
            <div class="action-bar-header">
                <h2>INSERT RESPONSE: Academic Debates</h2>
                <div class="action-bar-buttons">
                    <button class="quick-action-btn">Save Insertion</button>
                </div>
            </div>
            <div class="field-row">
                <label class="field-label">Select Academic Challenge</label>
                <select class="field-input">
                    <option>Select a challenge...</option>
                    <option value="1">The Synoptic Problem</option>
                    <option value="2">Q Source Debate</option>
                </select>
            </div>
            <div class="field-row">
                <label class="field-label">Response Essay Title / Link</label>
                <input type="text" class="field-input" placeholder="Search available responses...">
            </div>
        </div>
    `;
};
