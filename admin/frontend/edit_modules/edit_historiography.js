// =============================================================================
//
//   THE JESUS WEBSITE — EDIT HISTORIOGRAPHY MODULE
//   File:    admin/frontend/edit_modules/edit_historiography.js
//   Version: 2.0.0
//   Purpose: Text editor geared towards creating Historiography articles.
//            Refactored to Providence 3-column grid per §18.1.
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditHistoriography(containerId)
// Function: Renders a markdown editor tailored for scholarly methodology and historiography articles
// Output: Injects a specialized dual-pane editor interface into the specified container

window.renderEditHistoriography = function (containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const html = `
        <div class="admin-card" id="edit-historiography-card">
            <div class="providence-editor-grid">
                <!-- column_one: Action buttons + Metadata fields -->
                <div class="providence-editor-col-actions">
                    <button class="blog-editor-action-btn" id="hist-save-btn">Save Changes</button>

                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">Author</label>
                        <input type="text" class="blog-editor-field-input" id="hist-author-input" placeholder="Author Name">
                    </div>

                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">Date</label>
                        <input type="text" class="blog-editor-field-input" id="hist-date-input" placeholder="YYYY-MM-DD">
                    </div>

                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">Methodology Abstract</label>
                        <input type="text" class="blog-editor-field-input" id="hist-abstract-input" placeholder="Brief methodology abstract...">
                    </div>
                </div>

                <!-- column_two: Markdown textarea (write pane) -->
                <div class="providence-editor-col-list">
                    <div class="blog-editor-textarea-pane">
                        <label class="blog-editor-pane-label">Markdown (Edit)</label>
                        <textarea class="blog-editor-textarea" id="hist-markdown-textarea" placeholder="## Methodology\nThe historiographical approach to **early Christian sources**..."></textarea>
                    </div>
                </div>

                <!-- column_three: Live preview pane -->
                <div class="providence-editor-col-editor">
                    <div class="blog-editor-textarea-pane">
                        <label class="blog-editor-pane-label is-preview">Live Preview (Auto-updates)</label>
                        <div class="blog-editor-preview-pane" id="hist-preview-pane">
                            <h2 class="essay-preview-heading">Methodology</h2>
                            <p class="essay-preview-paragraph">The historiographical approach to <strong>early Christian sources</strong>...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

  container.innerHTML = html;

  // Render top-level section tab bar (Text Content active)
  if (typeof window.renderTabBar === "function") {
    window.renderTabBar(
      "edit-historiography-card",
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
      "text-content",
    );
  }

  // Wire Save button (stub)
  var saveBtn = document.getElementById("hist-save-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      var author = document.getElementById("hist-author-input");
      var date = document.getElementById("hist-date-input");
      var abst = document.getElementById("hist-abstract-input");
      var body = document.getElementById("hist-markdown-textarea");
      console.log("Historiography save triggered:", {
        author: author ? author.value : "",
        date: date ? date.value : "",
        abstract: abst ? abst.value : "",
        markdown: body ? body.value : "",
      });
    });
  }
};
