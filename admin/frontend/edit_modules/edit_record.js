// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RECORD MODULE
//   File:    admin/frontend/edit_modules/edit_record.js
//   Version: 1.1.0
//   Purpose: Form layout for editing a single row in the records table.
//   Source:  guide_dashboard_appearance.md §2.2
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditRecord(containerId, recordId)
// Function: Renders a full-field admin form for creating or editing a single archive record row
// Output: Injects the edit-record form HTML into the specified container element

window.renderEditRecord = function(containerId, recordId = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = `
        <div class="admin-card" id="edit-record-card">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--color-border); margin-bottom: var(--space-4); padding-bottom: var(--space-2);">
                <h2 style="border: none; margin: 0; padding: 0;">${recordId ? 'EDIT RECORD: ' + recordId : 'CREATE NEW RECORD'}</h2>
                <div>
                    <button class="quick-action-btn" style="background-color: var(--color-muted); color: var(--color-text);">Discard</button>
                    <button class="quick-action-btn">Save Changes</button>
                    ${recordId ? '<button class="quick-action-btn" style="background-color: #2e7d32;">View Live</button>' : ''}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); margin-bottom: var(--space-6);">
                <div>
                    <label style="font-weight: bold; display: block; margin-bottom: var(--space-2);">Title:</label>
                    <input type="text" id="record-title" style="width: 100%; padding: var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius-sm);" placeholder="Record Title">
                </div>
                <div>
                    <label style="font-weight: bold; display: block; margin-bottom: var(--space-2);">Slug (ID):</label>
                    <input type="text" id="record-slug" style="width: 100%; padding: var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius-sm);" placeholder="url-friendly-slug">
                </div>
            </div>

            <div id="picture-upload-container"></div>

            <div style="margin-bottom: var(--space-6); padding: var(--space-4); background-color: #fafafa; border: 1px solid var(--color-border); border-radius: var(--radius-sm);">
                <h3 style="margin-top: 0; font-family: var(--font-serif); margin-bottom: var(--space-4);">Taxonomy & Diagrams (Maps/Timeline data):</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
                    <div>
                        <label style="display:block; margin-bottom: 4px;">Era:</label>
                        <select style="width: 100%; padding: var(--space-2); border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
                            <option>OldTestament</option>
                            <option>Life</option>
                            <option>PassionWeek</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; margin-bottom: 4px;">Timeline:</label>
                        <select style="width: 100%; padding: var(--space-2); border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
                            <option>PassionFridayCrucifixionBegins</option>
                            <option>GalileeMinistry</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; margin-bottom: 4px;">Map Label:</label>
                        <select style="width: 100%; padding: var(--space-2); border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
                            <option>Overview</option>
                            <option>Jerusalem</option>
                            <option>Galilee</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; margin-bottom: 4px;">Gospel Category:</label>
                        <select style="width: 100%; padding: var(--space-2); border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
                            <option>event</option>
                            <option>person</option>
                            <option>theme</option>
                        </select>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: var(--space-6);">
                <h3 style="font-family: var(--font-serif); margin-bottom: var(--space-2);">Text Content:</h3>
                <textarea style="width: 100%; height: 250px; padding: var(--space-4); font-family: var(--font-mono); margin-bottom: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-sm);" placeholder="WYSIWYG Editor Block / Main Description..."></textarea>
                <textarea style="width: 100%; height: 100px; padding: var(--space-4); font-family: var(--font-mono); border: 1px solid var(--color-border); border-radius: var(--radius-sm);" placeholder="Abstract / Synopsis..."></textarea>
            </div>

            <!-- Injected Child Modules -->
            <div id="relations-links-container" style="margin-bottom: var(--space-6);"></div>
            <div id="sources-container"></div>
        </div>
    `;

    container.innerHTML = html;

    // Load edit_links module if the script has been parsed
    if (typeof window.renderEditLinks === 'function') {
        window.renderEditLinks('relations-links-container');
    }

    // Load edit_picture module if the script has been parsed
    if (typeof window.renderEditPicture === 'function' && recordId) {
        window.renderEditPicture('picture-upload-container', recordId);
    }
};
