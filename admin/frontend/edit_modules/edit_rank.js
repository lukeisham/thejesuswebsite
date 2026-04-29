// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RANK MODULE
//   File:    admin/frontend/edit_modules/edit_rank.js
//   Version: 1.2.0
//   Purpose: Form to manually override automated rankings for specific records.
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditRank(containerId)
// Function: Renders a form to manually override automated pipeline rankings for a specific record
// Output: Injects a rank-lock form with target slug, pipeline selector, and position input

window.renderEditRank = function (containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const html = `
        <div class="admin-card" id="edit-rank-card">
            <h2 class="section-heading-serif">MANUAL RANK OVERRIDE</h2>

            <div class="rank-inner-card">
                <p class="text-muted rank-description">Select a specific record to forcefully lock its rank across algorithmic pipelines.</p>

                <div class="field-row-double rank-field-grid">
                    <div class="field-row-inner rank-field-wrapper">
                        <label class="field-label">Target Record Slug:</label>
                        <input type="text" class="field-input" placeholder="e.g. tacitus-annals-15-44">
                    </div>
                    <div class="field-row-inner rank-field-wrapper">
                        <label class="field-label">List Pipeline:</label>
                        <select class="field-input">
                            <option>Wikipedia Mentions</option>
                            <option>Academic Debates</option>
                            <option>Popular Debates</option>
                        </select>
                    </div>
                </div>

                <div class="rank-checkbox-row">
                    <input type="checkbox" id="lock-rank">
                    <label for="lock-rank" class="rank-lock-label">Lock Absolute Rank Position (Overrides Base multipliers)</label>
                </div>

                <div class="rank-position-row">
                    <label class="field-label">Hardcoded Rank Position:</label>
                    <input type="number" min="1" value="1" class="rank-input-narrow">
                </div>

                <div class="rank-action-row">
                    <button class="quick-action-btn">Apply Override</button>
                </div>
            </div>
        </div>
    `;

  container.innerHTML = html;
};
