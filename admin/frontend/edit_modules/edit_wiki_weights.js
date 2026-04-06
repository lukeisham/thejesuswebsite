// =============================================================================
//
//   THE JESUS WEBSITE — EDIT WIKI WEIGHTS MODULE
//   File:    admin/frontend/edit_modules/edit_wiki_weights.js
//   Version: 1.1.0
//   Purpose: Table UI to adjust numerical ranking multipliers for Wikipedia lists.
//   Source:  guide_dashboard_appearance.md §4.1
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditWikiWeights(containerId)
// Function: Renders a tabular interface for adjusting numerical ranking multipliers for Wikipedia records
// Output: Injects a weight-management table with search and save controls into the specified container

window.renderEditWikiWeights = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = `
        <div class="admin-card" id="edit-wiki-weights-card">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--color-border); margin-bottom: var(--space-4); padding-bottom: var(--space-2);">
                <h2 style="border: none; margin: 0; padding: 0; font-family: var(--font-serif);">RANKED LIST: Wikipedia Weights</h2>
                <button class="quick-action-btn" style="margin: 0; background-color: var(--color-text);">Save All Multipliers</button>
            </div>

            <div style="margin-bottom: var(--space-4);">
                <input type="text" placeholder="Search by Record Slug..." style="width: 100%; padding: var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius-sm);">
            </div>

            <table style="width: 100%; border-collapse: collapse; text-align: left; font-family: var(--font-mono); font-size: var(--text-sm);">
                <thead>
                    <tr style="background-color: #fafafa; border-bottom: 2px solid var(--color-border);">
                        <th style="padding: var(--space-2);">Item Slug</th>
                        <th style="padding: var(--space-2);">Base Score (Pipeline)</th>
                        <th style="padding: var(--space-2);">Administrative Multiplier</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: var(--space-3) var(--space-2);">tacitus-annals-15-44</td>
                        <td style="padding: var(--space-3) var(--space-2); color: var(--color-primary); font-weight: bold;">98,401</td>
                        <td style="padding: var(--space-2);"><input type="number" step="0.1" value="1.2" style="width: 80px; padding: var(--space-1); border: 1px solid #ccc;"> x</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: var(--space-3) var(--space-2);">josephus-antiquities</td>
                        <td style="padding: var(--space-3) var(--space-2); color: var(--color-primary); font-weight: bold;">95,123</td>
                        <td style="padding: var(--space-2);"><input type="number" step="0.1" value="1.15" style="width: 80px; padding: var(--space-1); border: 1px solid #ccc;"> x</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: var(--space-3) var(--space-2);">pliny-the-younger-epistles</td>
                        <td style="padding: var(--space-3) var(--space-2); color: var(--color-primary); font-weight: bold;">80,004</td>
                        <td style="padding: var(--space-2);"><input type="number" step="0.1" value="1.0" style="width: 80px; padding: var(--space-1); border: 1px solid #ccc;"> x</td>
                    </tr>
                </tbody>
            </table>

            <div style="margin-top: var(--space-6); text-align: right;">
                <button style="background: transparent; border: 1px solid var(--color-primary); color: var(--color-primary); padding: var(--space-2) var(--space-4); border-radius: var(--radius-sm); cursor: pointer; font-weight: bold;">+ Add Custom Override Reference</button>
            </div>
        </div>
    `;

    container.innerHTML = html;
};
