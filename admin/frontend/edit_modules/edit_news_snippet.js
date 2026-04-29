// =============================================================================
//
//   THE JESUS WEBSITE — EDIT NEWS SNIPPETS
//   File:    admin/frontend/edit_modules/edit_news_snippet.js
//   Version: 1.2.0
//   Purpose: UI mapping for short-form data entry of news alerts/updates.
//
// =============================================================================

// Trigger: admin_app.js routing -> window.renderEditNewsSnippet
// Function: Renders a form to manage news snippet content, headlines, and external links
// Output: Injects form HTML classes into the specified container ID

window.renderEditNewsSnippet = function (containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
        <div class="admin-card">
            <div class="action-bar-header">
                <h2>EDIT NEWS SNIPPET</h2>
                <div class="action-bar-buttons">
                    <button class="quick-action-btn">Save Snippet</button>
                </div>
            </div>
            <div class="field-row">
                <label class="field-label">Publish Date</label>
                <input type="date" class="field-input">
            </div>
            <div class="field-row">
                <label class="field-label">Headline</label>
                <input type="text" class="field-input" placeholder="Enter snippet headline...">
            </div>
            <div class="field-row">
                <label class="field-label">Snippet body</label>
                <textarea class="news-snippet-textarea" placeholder="Enter markdown summary..."></textarea>
            </div>
            <div class="field-row">
                <label class="field-label">External link</label>
                <input type="url" class="field-input" placeholder="https://...">
            </div>
        </div>
    `;
};
