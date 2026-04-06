// =============================================================================
//
//   THE JESUS WEBSITE — EDIT NEWS SNIPPETS
//   File:    admin/frontend/edit_modules/edit_news_snippet.js
//   Version: 1.1.0
//   Purpose: UI mapping for short-form data entry of news alerts/updates.
//
// =============================================================================

// Trigger: admin_app.js routing -> window.renderEditNewsSnippet
// Function: Renders a form to manage news snippet content, headlines, and external links
// Output: Injects form HTML classes into the specified container ID

window.renderEditNewsSnippet = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="admin-card">
            <div class="admin-header flex justify-between align-center border-b pb-2 mb-4">
                <h2 class="font-serif">EDIT NEWS SNIPPET</h2>
                <button class="btn btn-primary">Save Snippet</button>
            </div>
            <div class="form-group mb-4">
                <label class="font-bold text-sm block mb-1">Publish Date</label>
                <input type="date" class="form-input w-full p-2 border radius-sm">
            </div>
            <div class="form-group mb-4">
                <label class="font-bold text-sm block mb-1">Headline</label>
                <input type="text" class="form-input w-full p-2 border radius-sm" placeholder="Enter snippet headline...">
            </div>
            <div class="form-group mb-4">
                <label class="font-bold text-sm block mb-1">Snippet / Summary (Markdown)</label>
                <textarea class="form-input w-full p-2 border radius-sm" rows="5" placeholder="Enter markdown summary..."></textarea>
            </div>
            <div class="form-group mb-4">
                <label class="font-bold text-sm block mb-1">External Link (Optional URL)</label>
                <input type="url" class="form-input w-full p-2 border radius-sm" placeholder="https://...">
            </div>
        </div>
    `;
};
