// =============================================================================
//
//   THE JESUS WEBSITE — EDIT ESSAY MODULE
//   File:    admin/frontend/edit_modules/edit_essay.js
//   Version: 1.1.0
//   Purpose: Focused text editor layout geared towards standard Context articles.
//   Source:  guide_dashboard_appearance.md §5.0
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditEssay(containerId)
// Function: Renders a side-by-side markdown editor and live preview for Context essays
// Output: Injects a dual-pane text editing interface into the specified container

window.renderEditEssay = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = `
        <div class="admin-card" id="edit-essay-card">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--color-border); margin-bottom: var(--space-4); padding-bottom: var(--space-2);">
                <h2 style="border: none; margin: 0; padding: 0; font-family: var(--font-serif);">EDIT CONTEXT ESSAY: <span style="font-family: inherit; font-weight: normal; color: var(--color-muted);">[ Title ]</span></h2>
                <button class="quick-action-btn" style="margin: 0; background-color: var(--color-text);">Save Changes</button>
            </div>

            <div style="display: flex; gap: var(--space-6); margin-bottom: var(--space-4);">
                
                <div style="flex: 1;">
                    <label style="font-weight: bold; display: block; margin-bottom: 4px;">Metadata:</label>
                    <div style="background-color: #fafafa; padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-sm);">
                        <div style="margin-bottom: var(--space-4);">
                            <label style="display: inline-block; width: 60px;">Author:</label>
                            <input type="text" style="width: calc(100% - 70px); padding: 4px; border: 1px solid #ccc;">
                        </div>
                        <div style="margin-bottom: var(--space-4);">
                            <label style="display: inline-block; width: 60px;">Date:</label>
                            <input type="text" style="width: calc(100% - 70px); padding: 4px; border: 1px solid #ccc;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 4px;">Abstract:</label>
                            <input type="text" style="width: 100%; padding: 4px; border: 1px solid #ccc;">
                        </div>
                    </div>
                </div>

                <div style="flex: 1; padding: var(--space-4); border: 1px dashed var(--color-border); background-color: #fdfdfd; border-radius: var(--radius-sm);">
                    <label style="font-weight: bold; display: block; margin-bottom: var(--space-2); color: var(--color-muted);">Live Preview Header:</label>
                    <h1 style="font-family: var(--font-serif); margin: 0;">Context Essay Title</h1>
                    <p style="font-style: italic; color: #555; margin-top: 4px;">By Author Name — Date</p>
                    <p style="font-size: var(--text-sm); line-height: 1.4; margin-top: var(--space-2);">
                        Abstract: Here is a brief abstract demonstrating the live preview updates.
                    </p>
                </div>

            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); min-height: 500px;">
                
                <div style="display: flex; flex-direction: column;">
                    <label style="font-weight: bold; background: var(--color-text); color: var(--color-bg); padding: var(--space-2); text-align: center; border-radius: var(--radius-sm) var(--radius-sm) 0 0;">Markdown (Edit)</label>
                    <textarea style="flex: 1; width: 100%; padding: var(--space-4); font-family: var(--font-mono); font-size: var(--text-sm); line-height: 1.6; border: 1px solid var(--color-border); border-top: none; resize: none; background-color: #fafafa;" placeholder="## Introduction\nThe historical context of **Judea**..."></textarea>
                </div>

                <div style="display: flex; flex-direction: column;">
                    <label style="font-weight: bold; background: #eee; padding: var(--space-2); text-align: center; border-radius: var(--radius-sm) var(--radius-sm) 0 0; border: 1px solid var(--color-border); border-bottom: none;">Live Preview (Auto-updates)</label>
                    <div style="flex: 1; padding: var(--space-4); border: 1px solid var(--color-border); background-color: #fff; overflow-y: auto;">
                        <h2 style="font-family: var(--font-serif); margin-top: 0;">Introduction</h2>
                        <p style="line-height: 1.6;">The historical context of <strong>Judea</strong>...</p>
                    </div>
                </div>

            </div>
        </div>
    `;

    container.innerHTML = html;
};
