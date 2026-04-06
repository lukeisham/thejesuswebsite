// =============================================================================
//
//   THE JESUS WEBSITE — EDIT LISTS MODULE
//   File:    admin/frontend/edit_modules/edit_lists.js
//   Version: 1.1.0
//   Purpose: UI for streamlining bulk organization of records into lists.
//   Source:  guide_dashboard_appearance.md §2.0
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditLists(containerId, listName)
// Function: Renders an admin UI for bulk-organizing and reordering records within a named list
// Output: Injects a drag-sortable list editor with record search into the specified container

window.renderEditLists = function(containerId, listName = 'Old Testament Verses') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = `
        <div class="admin-card" id="edit-lists-card">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--color-border); margin-bottom: var(--space-4); padding-bottom: var(--space-2);">
                <h2 style="border: none; margin: 0; padding: 0; font-family: var(--font-serif);">EDIT ORDINARY LIST: [ ${listName} ]</h2>
                <button class="quick-action-btn" style="margin: 0;">Save List</button>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-6); align-items: start;">
                <!-- Current List Ordering Area -->
                <div>
                    <h3 style="margin-top: 0; margin-bottom: var(--space-4); font-size: var(--text-base); font-family: var(--font-serif);">List Items</h3>
                    <ul style="list-style: none; padding: 0; margin: 0; border: 1px solid var(--color-border); border-radius: var(--radius-sm); border-bottom: none;">
                        
                        <li style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); border-bottom: 1px solid var(--color-border); background: #fafafa;">
                            <span style="cursor: grab; font-family: var(--font-mono); font-size: var(--text-sm);">☰ [Isaiah 53]</span>
                            <button style="background: none; border: none; color: #d32f2f; cursor: pointer; font-size: var(--text-sm); font-weight: bold;">Remove</button>
                        </li>
                        
                        <li style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); border-bottom: 1px solid var(--color-border); background: #fff;">
                            <span style="cursor: grab; font-family: var(--font-mono); font-size: var(--text-sm);">☰ [Psalm 22]</span>
                            <button style="background: none; border: none; color: #d32f2f; cursor: pointer; font-size: var(--text-sm); font-weight: bold;">Remove</button>
                        </li>

                        <li style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); border-bottom: 1px solid var(--color-border); background: #fafafa;">
                            <span style="cursor: grab; font-family: var(--font-mono); font-size: var(--text-sm);">☰ [Zechariah 12]</span>
                            <button style="background: none; border: none; color: #d32f2f; cursor: pointer; font-size: var(--text-sm); font-weight: bold;">Remove</button>
                        </li>

                    </ul>
                    <p class="text-sm text-muted" style="margin-top: 8px;">(Drag '☰' handle to reorder items securely)</p>
                </div>

                <!-- Add By Tools Area -->
                <div style="padding: var(--space-4); background-color: #fafafa; border: 1px solid var(--color-border); border-radius: var(--radius-sm);">
                    
                    <h3 style="margin-top: 0; font-size: var(--text-sm); margin-bottom: var(--space-2);">Search Records Explorer</h3>
                    <input type="text" placeholder="Search records to add..." style="width: 100%; padding: var(--space-2); margin-bottom: var(--space-6); border: 1px solid var(--color-border); border-radius: var(--radius-sm);">

                    <h3 style="margin-top: 0; font-size: var(--text-sm); margin-bottom: var(--space-2);">Bulk Add by Slugs (CSV/Line)</h3>
                    <textarea style="width: 100%; height: 100px; padding: var(--space-2); font-family: var(--font-mono); border: 1px solid var(--color-border); border-radius: var(--radius-sm); margin-bottom: var(--space-4);" placeholder="slug-1,\nslug-2,\n..."></textarea>
                    
                    <button class="quick-action-btn" style="width: 100%; margin: 0; background-color: var(--color-text);">Bulk Add Config</button>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
};
