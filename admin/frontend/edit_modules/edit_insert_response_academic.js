// =============================================================================
//
//   THE JESUS WEBSITE — EDIT INSERT RESPONSE ACADEMIC
//   File:    admin/frontend/edit_modules/edit_insert_response_academic.js
//   Version: 1.1.0
//   Purpose: UI mapping for inserting scholarly responses into academic ranked lists.
//
// =============================================================================

// Trigger: admin_app.js routing -> window.renderEditInsertResponseAcademic
// Function: Renders a form to select an academic debate and attach a response reference
// Output: Injects form HTML classes into the specified container ID

window.renderEditInsertResponseAcademic = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="admin-card">
            <div class="admin-header flex justify-between align-center border-b pb-2 mb-4">
                <h2 class="font-serif">INSERT RESPONSE: Academic Debates</h2>
                <button class="btn btn-primary">Save Insertion</button>
            </div>
            <div class="form-group mb-4">
                <label class="font-bold text-sm block mb-1">Select Academic Challenge</label>
                <select class="form-input w-full p-2 border radius-sm">
                    <option>Select a challenge...</option>
                    <option value="1">The Synoptic Problem</option>
                    <option value="2">Q Source Debate</option>
                </select>
            </div>
            <div class="form-group mb-4">
                <label class="font-bold text-sm block mb-1">Response Essay Title / Link</label>
                <input type="text" class="form-input w-full p-2 border radius-sm" placeholder="Search available responses...">
            </div>
        </div>
    `;
};
