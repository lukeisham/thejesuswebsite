// =============================================================================
//
//   THE JESUS WEBSITE — EDIT POPULAR WEIGHTS MODULE
//   File:    admin/frontend/edit_modules/edit_popular_weights.js
//   Version: 1.1.0
//   Purpose: UI mapping for configuring popular historical challenge rankings.
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditPopularWeights(containerId)
// Function: Renders a tabular interface for configuring ranking multipliers for popular historical queries
// Output: Injects a popular weight-configuration table into the specified container

window.renderEditPopularWeights = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = `
        <div class="admin-card" id="edit-popular-weights-card">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--color-border); margin-bottom: var(--space-4); padding-bottom: var(--space-2);">
                <h2 style="border: none; margin: 0; padding: 0; font-family: var(--font-serif);">RANKED LIST: Popular Challenges</h2>
                <button class="quick-action-btn" style="margin: 0; background-color: var(--color-text);">Save All Multipliers</button>
            </div>
            <div style="margin-bottom: var(--space-4);">
                <input type="text" placeholder="Search by Record Slug..." style="width: 100%; padding: var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius-sm);">
            </div>
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-family: var(--font-mono); font-size: var(--text-sm);">
                <thead>
                    <tr style="background-color: #fafafa; border-bottom: 2px solid var(--color-border);">
                        <th style="padding: var(--space-2);">Challenge Slug</th>
                        <th style="padding: var(--space-2);">Base Score (Pipeline)</th>
                        <th style="padding: var(--space-2);">Administrative Multiplier</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: var(--space-3) var(--space-2);">jesus-myth-theory</td>
                        <td style="padding: var(--space-3) var(--space-2); color: var(--color-primary); font-weight: bold;">5,000</td>
                        <td style="padding: var(--space-2);"><input type="number" step="0.1" value="0.8" style="width: 80px; padding: var(--space-1); border: 1px solid #ccc;"> x</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = html;
};
