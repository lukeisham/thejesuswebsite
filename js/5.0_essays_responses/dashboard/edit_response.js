// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RESPONSE MODULE
//   File:    js/5.0_essays_responses/dashboard/edit_response.js
//   Version: 2.1.0
//   Purpose: Debate response text editor with integrated Citation tools.
//            Refactored to Providence 3-column grid per §18.1.
//   Source:  guide_dashboard_appearance.md §5.1 / §5.2
//
//   Changelog:
//     v2.1.0 — Providence grid refactor: split single container.innerHTML dump
//              into three _setColumn() calls targeting "actions", "list", and
//              "editor". Uses _clearColumnContent("editor") before populating
//              the editor column. renderTabBar still targets canvas-col-editor
//              so the tab bar prepends into the editor column.
//     v2.0.0 — Initial version with container.innerHTML injection.
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditResponse(containerId)
// Function: Renders a focused debate response editor with parent challenge
//           selection and citation tools across the three Providence columns
// Output: Populates the three Providence grid columns (canvas-col-actions,
//         canvas-col-list, canvas-col-editor) via _setColumn()

window.renderEditResponse = function (containerId) {
  // containerId is "canvas-col-editor" when routed via dashboard_app.js loadModule().
  // We keep it for renderTabBar compatibility but no longer dump innerHTML into it.

  // ----- COL 1: Action buttons -----
  _setColumn(
    "actions",
    "<!-- column_one: Action buttons -->" +
      '<button class="blog-editor-action-btn" id="response-save-btn">Save Response</button>',
  );

  // ----- COL 2: Parent challenge select + insert tools -----
  _setColumn(
    "list",
    "<!-- column_two: Parent challenge + insert tools -->" +
      '<div class="blog-editor-field">' +
      '<label class="blog-editor-field-label">Addressing Challenge (Parent)</label>' +
      '<select class="blog-editor-field-input" id="response-challenge-select">' +
      "<option>jesus-myth-theory</option>" +
      "<option>historicity-of-miracles</option>" +
      "</select>" +
      "</div>" +
      '<div class="response-insert-tools">' +
      '<button class="btn-outline-primary" id="response-insert-citation-btn">+ Insert Citation</button>' +
      '<button class="btn-outline-primary" id="response-insert-link-btn">+ Insert Record Link</button>' +
      "</div>",
  );

  // ----- COL 3: Markdown textarea + Live Preview -----
  _clearColumnContent("editor");
  _setColumn(
    "editor",
    "<!-- column_three: Markdown editor + preview -->" +
      '<div class="blog-editor-textarea-pane">' +
      '<label class="blog-editor-pane-label">Markdown (Edit)</label>' +
      '<textarea class="blog-editor-textarea" id="response-markdown-textarea" placeholder="## The Evidence\nBased on the findings of..."></textarea>' +
      "</div>" +
      '<div class="blog-editor-textarea-pane">' +
      '<label class="blog-editor-pane-label is-preview">Live Preview</label>' +
      '<div class="blog-editor-preview-pane" id="response-preview-pane">' +
      '<h2 class="essay-preview-heading">The Evidence</h2>' +
      '<p class="essay-preview-paragraph">Based on the findings of...</p>' +
      "</div>" +
      "</div>",
  );

  // Render top-level section tab bar (Text Content active)
  // containerId is "canvas-col-editor" — renderTabBar prepends into the editor column
  if (typeof window.renderTabBar === "function") {
    window.renderTabBar(
      containerId,
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
