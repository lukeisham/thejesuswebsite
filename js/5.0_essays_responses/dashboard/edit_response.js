// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RESPONSE MODULE
//   File:    js/5.0_essays_responses/dashboard/edit_response.js
//   Version: 2.0.0
//   Purpose: Debate response text editor with integrated Citation tools.
//            Refactored to Providence 3-column grid per §18.1.
//   Source:  guide_dashboard_appearance.md §5.1 / §5.2
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditResponse(containerId)
// Function: Renders a focused debate response editor with parent challenge selection and citation tools
// Output: Injects an interactive response drafting form into the specified container

window.renderEditResponse = function (containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const html = `
        <div class="admin-card" id="edit-response-card">
            <div class="providence-editor-grid">
                <!-- column_one: Action buttons + Challenge selector + Citation tools -->
                <div class="providence-editor-col-actions">
                    <button class="blog-editor-action-btn" id="response-save-btn">Save Response</button>

                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">Addressing Challenge (Parent)</label>
                        <select class="blog-editor-field-input" id="response-challenge-select">
                            <option>jesus-myth-theory</option>
                            <option>historicity-of-miracles</option>
                        </select>
                    </div>

                    <div class="response-insert-tools">
                        <button class="btn-outline-primary" id="response-insert-citation-btn">+ Insert Citation</button>
                        <button class="btn-outline-primary" id="response-insert-link-btn">+ Insert Record Link</button>
                    </div>
                </div>

                <!-- column_two: Markdown textarea (write pane) -->
                <div class="providence-editor-col-list">
                    <div class="blog-editor-textarea-pane">
                        <label class="blog-editor-pane-label">Markdown (Edit)</label>
                        <textarea class="blog-editor-textarea" id="response-markdown-textarea" placeholder="## The Evidence\nBased on the findings of..."></textarea>
                    </div>
                </div>

                <!-- column_three: Live preview pane -->
                <div class="providence-editor-col-editor">
                    <div class="blog-editor-textarea-pane">
                        <label class="blog-editor-pane-label is-preview">Live Preview</label>
                        <div class="blog-editor-preview-pane" id="response-preview-pane">
                            <h2 class="essay-preview-heading">The Evidence</h2>
                            <p class="essay-preview-paragraph">Based on the findings of...</p>
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
      "edit-response-card",
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
  var saveBtn = document.getElementById("response-save-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      var challenge = document.getElementById("response-challenge-select");
      var body = document.getElementById("response-markdown-textarea");
      console.log("Response save triggered:", {
        challenge: challenge ? challenge.value : "",
        markdown: body ? body.value : "",
      });
    });
  }

  // Wire Insert Citation button (stub)
  var citationBtn = document.getElementById("response-insert-citation-btn");
  if (citationBtn) {
    citationBtn.addEventListener("click", function () {
      console.log("Insert Citation clicked — stub");
    });
  }

  // Wire Insert Record Link button (stub)
  var linkBtn = document.getElementById("response-insert-link-btn");
  if (linkBtn) {
    linkBtn.addEventListener("click", function () {
      console.log("Insert Record Link clicked — stub");
    });
  }
};
