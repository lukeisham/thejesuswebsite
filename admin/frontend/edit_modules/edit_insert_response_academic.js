// =============================================================================
//
//   THE JESUS WEBSITE — EDIT INSERT RESPONSE ACADEMIC
//   File:    admin/frontend/edit_modules/edit_insert_response_academic.js
//   Version: 1.3.0
//   Purpose: UI mapping for inserting scholarly responses into academic ranked lists.
//            Refactored to Providence 3-column grid per §18.1.
//
// =============================================================================

// Trigger: admin_app.js routing -> window.renderEditInsertResponseAcademic
// Function: Renders a form to select an academic debate and attach a response reference
// Output: Injects form HTML classes into the specified container ID

window.renderEditInsertResponseAcademic = function (containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
        <div class="admin-card" id="edit-insert-response-academic-card">
            <div class="providence-editor-grid">
                <!-- COL 1: Action buttons -->
                <div class="providence-editor-col-actions">
                    <button class="blog-editor-action-btn" id="insert-academic-save-btn">Save Insertion</button>
                </div>

                <!-- COL 2: (empty — reserved for future use) -->
                <div class="providence-editor-col-list"></div>

                <!-- COL 3: Insert form -->
                <div class="providence-editor-col-editor">
                    <div class="insert-response-desc">Select an academic debate challenge and link a response essay to insert into the ranked list.</div>

                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">Select Academic Challenge</label>
                        <select class="blog-editor-field-input" id="insert-academic-challenge-select">
                            <option>Select a challenge...</option>
                            <option value="1">The Synoptic Problem</option>
                            <option value="2">Q Source Debate</option>
                        </select>
                    </div>

                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">Response Essay Title / Link</label>
                        <input type="text" class="blog-editor-field-input" id="insert-academic-response-input" placeholder="Search available responses...">
                    </div>
                </div>
            </div>
        </div>
    `;

  // Render top-level section tab bar (Lists & Ranks active)
  if (typeof window.renderTabBar === "function") {
    window.renderTabBar(
      "edit-insert-response-academic-card",
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

  // Wire Save button (stub)
  var saveBtn = document.getElementById("insert-academic-save-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      var challenge = document.getElementById(
        "insert-academic-challenge-select",
      );
      var response = document.getElementById("insert-academic-response-input");
      console.log("Insert Response (Academic) save triggered:", {
        challenge: challenge ? challenge.value : "",
        response: response ? response.value : "",
      });
    });
  }
};
