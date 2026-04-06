// =============================================================================
//
//   THE JESUS WEBSITE — EDIT MLA SOURCES
//   File:    admin/frontend/edit_modules/edit_mla_sources.js
//   Version: 1.1.0
//   Purpose: UI mapping for editing MLA source bibliography data.
//
// =============================================================================

// Trigger: admin_app.js routing -> window.renderEditMlaSources
// Function: Renders a layout to add, edit, or remove MLA bibliographic sources
// Output: Injects form HTML classes into the specified container ID

window.renderEditMlaSources = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="admin-card">
            <div class="admin-header flex justify-between align-center border-b pb-2 mb-4">
                <h2 class="font-serif">BIBLIOGRAPHY: MLA Sources</h2>
                <button class="btn btn-primary">Add New Source</button>
            </div>
            <div class="form-group mb-4">
                <input type="text" class="form-input w-full p-2 border radius-sm" placeholder="Search authors or titles...">
            </div>
            <table class="w-full border-collapse font-mono text-sm">
                <thead>
                    <tr class="bg-muted border-b">
                        <th class="p-2 text-left">Author</th>
                        <th class="p-2 text-left">Title</th>
                        <th class="p-2 text-left">Year</th>
                        <th class="p-2 text-left">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="border-b">
                        <td class="p-2">Ehrman, Bart D.</td>
                        <td class="p-2 text-primary font-bold">Did Jesus Exist?</td>
                        <td class="p-2">2012</td>
                        <td class="p-2"><button class="btn btn-sm">Edit</button></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
};
