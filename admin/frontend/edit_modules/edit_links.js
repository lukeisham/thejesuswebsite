// =============================================================================
//
//   THE JESUS WEBSITE — EDIT LINKS MODULE
//   File:    admin/frontend/edit_modules/edit_links.js
//   Version: 1.1.0
//   Purpose: UI fragment for assigning related entities to a record.
//   Source:  guide_dashboard_appearance.md §2.2
//
// =============================================================================

// Trigger: edit_record.js -> window.renderEditLinks(containerId) after record form renders
// Function: Renders a sub-panel listing relations and external links assigned to the current record
// Output: Injects a linked-entities list with Add/Remove actions into the specified container

window.renderEditLinks = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = `
        <div style="padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background-color: var(--color-bg);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
                <h3 style="margin: 0; font-family: var(--font-serif);">Relations & Links (edit_links.js)</h3>
                <button class="quick-action-btn" style="font-size: var(--text-sm); padding: 4px 8px; margin: 0;">+ Add Link</button>
            </div>
            
            <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-2) var(--space-4); background: #fdfdfd; margin-bottom: var(--space-2); border: 1px solid #ddd; border-radius: var(--radius-sm);">
                    <span style="font-family: var(--font-mono); font-size: var(--text-sm);">Context_Essay_Crucifixion (Type: Context)</span>
                    <button style="border: none; background: transparent; cursor: pointer; color: #d32f2f; font-weight: bold;">Remove</button>
                </li>
                 <li style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-2) var(--space-4); background: #fdfdfd; border: 1px solid #ddd; border-radius: var(--radius-sm);">
                    <span style="font-family: var(--font-mono); font-size: var(--text-sm);">Resource_Link_12 (Type: External URL)</span>
                    <button style="border: none; background: transparent; cursor: pointer; color: #d32f2f; font-weight: bold;">Remove</button>
                </li>
            </ul>
        </div>
    `;

    container.innerHTML = html;
};
