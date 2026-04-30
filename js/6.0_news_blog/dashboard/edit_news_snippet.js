// =============================================================================
//
//   THE JESUS WEBSITE — EDIT NEWS SNIPPETS
//   File:    js/6.0_news_blog/dashboard/edit_news_snippet.js
//   Version: 1.3.0
//   Purpose: UI mapping for short-form data entry of news alerts/updates.
//            Refactored to Providence 3-column grid per §18.1.
//
// =============================================================================

// Trigger: admin_app.js routing -> window.renderEditNewsSnippet
// Function: Renders a form to manage news snippet content, headlines, and external links
// Output: Injects form HTML classes into the specified container ID

window.renderEditNewsSnippet = function (containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
        <div class="admin-card" id="edit-news-snippet-card">
            <div class="providence-editor-grid">
                <!-- column_one: Action buttons -->
                <div class="providence-editor-col-actions">
                    <button class="blog-editor-action-btn" id="news-snippet-save-btn">Save Snippet</button>
                </div>

                <!-- column_two: Field documentation -->
                <div class="providence-editor-col-list">
                    <p class="blog-editor-list-heading">Snippet Fields</p>
                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">publish_date</label>
                    </div>
                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">headline</label>
                    </div>
                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">snippet_body</label>
                    </div>
                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">external_link</label>
                    </div>
                </div>

                <!-- column_three: Snippet form -->
                <div class="providence-editor-col-editor">
                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">Publish Date</label>
                        <input type="date" class="blog-editor-field-input" id="news-snippet-date-input">
                    </div>
                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">Headline</label>
                        <input type="text" class="blog-editor-field-input" id="news-snippet-headline-input" placeholder="Enter snippet headline...">
                    </div>
                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">Snippet body</label>
                        <textarea class="news-snippet-textarea" id="news-snippet-body-input" placeholder="Enter markdown summary..."></textarea>
                    </div>
                    <div class="blog-editor-field">
                        <label class="blog-editor-field-label">External link</label>
                        <input type="url" class="blog-editor-field-input" id="news-snippet-link-input" placeholder="https://...">
                    </div>
                </div>
            </div>
        </div>
    `;

  // Render top-level section tab bar (Text Content active)
  if (typeof window.renderTabBar === "function") {
    window.renderTabBar(
      "edit-news-snippet-card",
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
  var saveBtn = document.getElementById("news-snippet-save-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      var date = document.getElementById("news-snippet-date-input");
      var headline = document.getElementById("news-snippet-headline-input");
      var body = document.getElementById("news-snippet-body-input");
      var link = document.getElementById("news-snippet-link-input");
      console.log("News snippet save triggered:", {
        publish_date: date ? date.value : "",
        headline: headline ? headline.value : "",
        snippet_body: body ? body.value : "",
        external_link: link ? link.value : "",
      });
    });
  }
};
