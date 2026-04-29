// =============================================================================
//
//   THE JESUS WEBSITE — EDIT ESSAY MODULE
//   File:    admin/frontend/edit_modules/edit_essay.js
//   Version: 2.0.0
//   Purpose: Focused text editor layout geared towards standard Context articles.
//            Refactored to Providence 3-column grid per §18.1.
//   Source:  guide_dashboard_appearance.md §5.0
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditEssay(containerId)
// Function: Renders a side-by-side markdown editor and live preview for Context essays
// Output: Injects a dual-pane text editing interface into the specified container

window.renderEditEssay = function (containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const html = `
        <div class="admin-card" id="edit-essay-card">
            <div class="providence-editor-grid">
                <!-- column_one: Action buttons + Metadata fields -->
                <div class="providence-editor-col-actions">
                    <button class="blog-editor-action-btn" id="essay-save-btn">Save Changes</button>

                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">Author</label>
                        <input type="text" class="blog-editor-field-input" id="essay-author-input" placeholder="Author Name">
                    </div>

                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">Date</label>
                        <input type="text" class="blog-editor-field-input" id="essay-date-input" placeholder="YYYY-MM-DD">
                    </div>

                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">Abstract</label>
                        <input type="text" class="blog-editor-field-input" id="essay-abstract-input" placeholder="Brief abstract...">
                    </div>
                </div>

                <!-- column_two: Markdown textarea (write pane) -->
                <div class="providence-editor-col-list">
                    <div class="blog-editor-textarea-pane">
                        <label class="blog-editor-pane-label">Markdown (Edit)</label>
                        <textarea class="blog-editor-textarea" id="essay-markdown-textarea" placeholder="## Introduction\nThe historical context of **Judea**..."></textarea>
                    </div>
                </div>

                <!-- column_three: Live preview pane -->
                <div class="providence-editor-col-editor">
                    <div class="blog-editor-textarea-pane">
                        <label class="blog-editor-pane-label is-preview">Live Preview (Auto-updates)</label>
                        <div class="blog-editor-preview-pane" id="essay-preview-pane">
                            <h2 class="essay-preview-heading">Introduction</h2>
                            <p class="essay-preview-paragraph">The historical context of <strong>Judea</strong>...</p>
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
      "edit-essay-card",
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
  var saveBtn = document.getElementById("essay-save-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      var author = document.getElementById("essay-author-input");
      var date = document.getElementById("essay-date-input");
      var abst = document.getElementById("essay-abstract-input");
      var body = document.getElementById("essay-markdown-textarea");
      console.log("Essay save triggered:", {
        author: author ? author.value : "",
        date: date ? date.value : "",
        abstract: abst ? abst.value : "",
        markdown: body ? body.value : "",
      });
    });
  }
};
