// =============================================================================
//
//   THE JESUS WEBSITE — EDIT INSERT RESPONSE POPULAR
//   File:    admin/frontend/edit_modules/edit_insert_response_popular.js
//   Version: 1.3.0
//   Purpose: Browsable challenge list with per-row [+ Add Response] [Remove]
//            [Edit] actions for inserting scholarly responses into popular
//            ranked lists.
//            Refactored to Providence 3-column grid per §18.1.
//
// =============================================================================

// Trigger: admin_app.js routing -> window.renderEditInsertResponsePopular
// Function: Renders a browsable list of popular challenges with inline
//           action buttons per row, plus a form area to add new response links.
// Output: Injects HTML into the specified container ID using admin CSS classes.

window.renderEditInsertResponsePopular = function (containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // --- Static sample data (to be replaced by real data source) ---
  const challenges = [
    { id: 1, name: "Did Jesus really exist?" },
    { id: 2, name: "Did the resurrection happen?" },
    { id: 3, name: "Are the Gospels historically reliable?" },
    { id: 4, name: "Was Jesus just a copy of pagan myths?" },
  ];

  const challengeRows = challenges
    .map(function (ch) {
      return `
                <div class="challenge-list-row">
                    <span class="challenge-list-name">${ch.name}</span>
                    <span class="challenge-list-actions">
                        <button class="btn-response-action is-add" data-id="${ch.id}">+ Add Response</button>
                        <button class="btn-response-action is-danger" data-id="${ch.id}">Remove</button>
                        <button class="btn-response-action" data-id="${ch.id}">Edit</button>
                    </span>
                </div>
            `;
    })
    .join("");

  container.innerHTML = `
        <div class="admin-card" id="edit-insert-response-popular-card">
            <div class="providence-editor-grid">
                <!-- column_one: Action buttons -->
                <div class="providence-editor-col-actions">
                    <button class="blog-editor-action-btn" id="irp-save-all">Save All</button>
                </div>

                <!-- column_two: (empty — reserved for future use) -->
                <div class="providence-editor-col-list"></div>

                <!-- column_three: Challenge list + Add form -->
                <div class="providence-editor-col-editor">
                    <div class="insert-response-desc">Browse popular challenges and insert, remove, or edit response links.</div>

                    <div class="challenge-list">
                        ${challengeRows}
                    </div>

                    <div class="core-identifiers-section irp-form-section">
                        <div class="section-heading-serif">Add Response Link</div>
                        <div class="field-row">
                            <span class="field-label">Challenge</span>
                            <select class="field-input" id="irp-challenge-select">
                                <option value="">Select a challenge...</option>
                                ${challenges
                                  .map(function (ch) {
                                    return `<option value="${ch.id}">${ch.name}</option>`;
                                  })
                                  .join("")}
                            </select>
                        </div>
                        <div class="field-row">
                            <span class="field-label">Response</span>
                            <input type="text" class="field-input" id="irp-response-input" placeholder="Response object reference or URL...">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

  // Render top-level section tab bar (Lists & Ranks active)
  if (typeof window.renderTabBar === "function") {
    window.renderTabBar(
      "edit-insert-response-popular-card",
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
};
