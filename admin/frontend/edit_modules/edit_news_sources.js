// =============================================================================
//
//   THE JESUS WEBSITE — EDIT NEWS SOURCES
//   File:    admin/frontend/edit_modules/edit_news_sources.js
//   Version: 1.1.0
//   Purpose: UI mapping for adding and editing news sources/feed items.
//
// =============================================================================

// Trigger: admin_app.js routing -> window.renderEditNewsSources
// Function: Renders a form to manage external news crawler targets and manual items
// Output: Injects form HTML classes into the specified container ID

window.renderEditNewsSources = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="admin-card">
            <div class="admin-header flex justify-between align-center border-b pb-2 mb-4">
                <h2 class="font-serif">MANAGE: News Sources</h2>
                <button class="btn btn-primary">Add News Source</button>
            </div>
            <div class="form-group mb-4">
                <input type="text" class="form-input w-full p-2 border radius-sm" placeholder="Search news feeds or tags...">
            </div>
            <table class="w-full border-collapse font-mono text-sm">
                <thead>
                    <tr class="bg-muted border-b">
                        <th class="p-2 text-left">Publisher/Source Name</th>
                        <th class="p-2 text-left">URL Feed</th>
                        <th class="p-2 text-left">Status</th>
                        <th class="p-2 text-left">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="border-b">
                        <td class="p-2 font-bold">Biblical Archaeology Society</td>
                        <td class="p-2 text-primary">https://www.biblicalarchaeology.org/feed/</td>
                        <td class="p-2"><span class="badge">Active</span></td>
                        <td class="p-2"><button class="btn btn-sm">Edit</button></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
};
