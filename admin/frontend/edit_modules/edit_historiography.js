// =============================================================================
//
//   THE JESUS WEBSITE — EDIT HISTORIOGRAPHY MODULE
//   File:    admin/frontend/edit_modules/edit_historiography.js
//   Version: 1.1.0
//   Purpose: Text editor geared towards creating Historiography articles.
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditHistoriography(containerId)
// Function: Renders a markdown editor tailored for scholarly methodology and historiography articles
// Output: Injects a specialized dual-pane editor interface into the specified container

window.renderEditHistoriography = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Mirrors the clean essay interface design
    const html = `
        <div class="admin-card" id="edit-historiography-card">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--color-border); margin-bottom: var(--space-4); padding-bottom: var(--space-2);">
                <h2 style="border: none; margin: 0; padding: 0; font-family: var(--font-serif);">EDIT HISTORIOGRAPHY: <span style="font-family: inherit; font-weight: normal; color: var(--color-muted);">[ Title ]</span></h2>
                <button class="quick-action-btn" style="margin: 0; background-color: var(--color-text);">Save Changes</button>
            </div>

            <div style="display: flex; gap: var(--space-6); margin-bottom: var(--space-4);">
                <div style="flex: 1; background-color: #fafafa; padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-sm);">
                    <div style="margin-bottom: var(--space-4);">
                        <label style="display: inline-block; width: 60px;">Author:</label>
                        <input type="text" style="width: calc(100% - 70px); padding: 4px; border: 1px solid #ccc;">
                    </div>
                    <div style="margin-bottom: var(--space-4);">
                        <label style="display: inline-block; width: 60px;">Date:</label>
                        <input type="text" style="width: calc(100% - 70px); padding: 4px; border: 1px solid #ccc;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 4px;">Methodology Abstract:</label>
                        <input type="text" style="width: 100%; padding: 4px; border: 1px solid #ccc;">
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); min-height: 500px;">
                <div style="display: flex; flex-direction: column;">
                    <label style="font-weight: bold; background: var(--color-text); color: var(--color-bg); padding: var(--space-2); text-align: center; border-radius: var(--radius-sm) var(--radius-sm) 0 0;">Markdown (Edit)</label>
                    <textarea style="flex: 1; width: 100%; padding: var(--space-4); font-family: var(--font-mono); font-size: var(--text-sm); line-height: 1.6; border: 1px solid var(--color-border); border-top: none; resize: none; background-color: #fafafa;"></textarea>
                </div>
                <div style="display: flex; flex-direction: column;">
                    <label style="font-weight: bold; background: #eee; padding: var(--space-2); text-align: center; border-radius: var(--radius-sm) var(--radius-sm) 0 0; border: 1px solid var(--color-border); border-bottom: none;">Live Preview</label>
                    <div style="flex: 1; padding: var(--space-4); border: 1px solid var(--color-border); background-color: #fff; overflow-y: auto;"></div>
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
};
