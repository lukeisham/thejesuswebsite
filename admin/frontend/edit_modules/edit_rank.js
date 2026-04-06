// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RANK MODULE
//   File:    admin/frontend/edit_modules/edit_rank.js
//   Version: 1.1.0
//   Purpose: Form to manually override automated rankings for specific records.
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditRank(containerId)
// Function: Renders a form to manually override automated pipeline rankings for a specific record
// Output: Injects a rank-lock form with target slug, pipeline selector, and position input

window.renderEditRank = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = `
        <div class="admin-card" id="edit-rank-card">
            <h2 style="font-family: var(--font-serif); margin-bottom: var(--space-4);">MANUAL RANK OVERRIDE</h2>
            
            <div style="padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background-color: #fafafa;">
                <p class="text-sm text-muted mb-4">Select a specific record to forcefully lock its rank across algorithmic pipelines.</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-4);">
                    <div>
                        <label>Target Record Slug:</label>
                        <input type="text" placeholder="e.g. tacitus-annals-15-44" style="width: 100%; padding: var(--space-2); margin-top: 4px; border: 1px solid var(--color-border);">
                    </div>
                    <div>
                        <label>List Pipeline:</label>
                        <select style="width: 100%; padding: var(--space-2); margin-top: 4px; border: 1px solid var(--color-border);">
                            <option>Wikipedia Mentions</option>
                            <option>Academic Debates</option>
                            <option>Popular Debates</option>
                        </select>
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: var(--space-4);">
                    <input type="checkbox" id="lock-rank">
                    <label for="lock-rank" style="font-weight: bold; color: #d32f2f;">Lock Absolute Rank Position (Overrides Base multipliers)</label>
                </div>
                
                <div style="margin-top: var(--space-4);">
                    <label>Hardcoded Rank Position:</label>
                    <input type="number" min="1" value="1" style="width: 80px; padding: var(--space-2); margin-left: var(--space-2); border: 1px solid var(--color-border);">
                </div>

                <div style="margin-top: var(--space-6);">
                    <button class="quick-action-btn">Apply Override</button>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
};
