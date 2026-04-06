// =============================================================================
//
//   THE JESUS WEBSITE — EDIT INSERT RESPONSE POPULAR
//   File:    admin/frontend/edit_modules/edit_insert_response_popular.js
//   Version: 1.1.0
//   Purpose: UI mapping for inserting scholarly responses into popular ranked lists.
//
// =============================================================================

// Trigger: admin_app.js routing -> window.renderEditInsertResponsePopular
// Function: Renders a form to select a popular query and attach a response reference
// Output: Injects form HTML classes into the specified container ID

window.renderEditInsertResponsePopular = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="admin-card">
            <div class="admin-header flex justify-between align-center border-b pb-2 mb-4">
                <h2 class="font-serif">INSERT RESPONSE: Popular Queries</h2>
                <button class="btn btn-primary">Save Insertion</button>
            </div>
            <div class="form-group mb-4">
                <label class="font-bold text-sm block mb-1">Select Popular Challenge</label>
                <select class="form-input w-full p-2 border radius-sm">
                    <option>Select a popular challenge...</option>
                    <option value="1">Did Jesus really exist?</option>
                    <option value="2">Did the resurrection happen?</option>
                </select>
            </div>
            <div class="form-group mb-4">
                <label class="font-bold text-sm block mb-1">Response Content / Link</label>
                <input type="text" class="form-input w-full p-2 border radius-sm" placeholder="Select response object to attach...">
            </div>
        </div>
    `;
};
