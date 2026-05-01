// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RANK MODULE
//   File:    js/4.0_ranked_lists/dashboard/edit_rank.js
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
            <div class="providence-editor-grid">
                <!-- column_one: Action buttons -->
                <div class="providence-editor-col-actions">
                    <button class="blog-editor-action-btn" id="rank-save-btn">Save</button>
                    <button class="blog-editor-action-btn is-danger" id="rank-delete-btn">Delete Row</button>
                </div>

                <!-- column_two: Field documentation -->
                <div class="providence-editor-col-list">
                    <p>Override Fields</p>
                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">target_slug</label>
                    </div>
                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">pipeline</label>
                    </div>
                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">lock_rank</label>
                    </div>
                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">rank_position</label>
                    </div>
                </div>

                <!-- column_three: Rank override form -->
                <div class="providence-editor-col-editor">
                    <p class="text-muted rank-description">Select a specific record to forcefully lock its rank across algorithmic pipelines.</p>

                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">Target Record Slug:</label>
                        <input type="text" class="blog-editor-field-input" id="rank-slug-input" placeholder="e.g. tacitus-annals-15-44">
                    </div>

                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">List Pipeline:</label>
                        <select class="blog-editor-field-input" id="rank-pipeline-select">
                            <option>Wikipedia Mentions</option>
                            <option>Academic Debates</option>
                            <option>Popular Debates</option>
                        </select>
                    </div>

                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">
                            <input type="checkbox" id="lock-rank">
                            Lock Absolute Rank Position (Overrides Base multipliers)
                        </label>
                    </div>

                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">Hardcoded Rank Position:</label>
                        <input type="number" min="1" value="1" class="rank-input-narrow" id="rank-position-input">
                    </div>

                    <button class="blog-editor-action-btn rank-action-btn" id="rank-apply-btn">Apply Override</button>
                </div>
            </div>
        </div>
    `;

  container.innerHTML = html;

  // Render top-level section tab bar (Lists & Ranks active)
  if (typeof window.renderTabBar === "function") {
    window.renderTabBar(
      "edit-rank-card",
      [
        { name: "records", label: "Records", module: "records-edit" },
        {
          name: "lists-ranks",
          label: "Lists & Ranks",
          module: "lists-resources",
        },
        { name: "text-content", label: "Text Content", module: "text-blog" },
        {
          name: "configuration",
          label: "Configuration",
          module: "config-diagrams",
        },
      ],
      "lists-ranks",
    );
  }

  // Wire Apply Override button
  var applyBtn = document.getElementById("rank-apply-btn");
  if (applyBtn) {
    applyBtn.addEventListener("click", function () {
      var slug = document.getElementById("rank-slug-input");
      var pipeline = document.getElementById("rank-pipeline-select");
      var lockCheck = document.getElementById("lock-rank");
      var position = document.getElementById("rank-position-input");
      if (slug && pipeline) {
        alert(
          'Override queued for slug "' +
            slug.value +
            '" on pipeline "' +
            pipeline.value +
            '"' +
            (lockCheck && lockCheck.checked
              ? " (locked at position " +
                (position ? position.value : "?") +
                ")"
              : ""),
        );
      }
    });
  }
};
