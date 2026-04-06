// =============================================================================
//
//   THE JESUS WEBSITE — EDIT RESPONSE MODULE
//   File:    admin/frontend/edit_modules/edit_response.js
//   Version: 1.1.0
//   Purpose: Debate response text editor with integrated Citation tools.
//   Source:  guide_dashboard_appearance.md §5.1 / §5.2
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditResponse(containerId)
// Function: Renders a focused debate response editor with parent challenge selection and citation tools
// Output: Injects an interactive response drafting form into the specified container

window.renderEditResponse = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = `
        <div class="admin-card" id="edit-response-card">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--color-border); margin-bottom: var(--space-4); padding-bottom: var(--space-2);">
                <h2 style="border: none; margin: 0; padding: 0; font-family: var(--font-serif);">EDIT RESPONSE: <span style="font-family: inherit; font-weight: normal; color: var(--color-muted);">[ Title ]</span></h2>
                <button class="quick-action-btn" style="margin: 0; background-color: var(--color-text);">Save Response</button>
            </div>

            <div style="padding: var(--space-4); background-color: #fafafa; border: 1px solid var(--color-border); border-radius: var(--radius-sm); margin-bottom: var(--space-6);">
                <label style="font-weight: bold; display: block; margin-bottom: var(--space-2);">Addressing Challenge (Parent):</label>
                <select style="width: 100%; padding: var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius-sm);">
                    <option>jesus-myth-theory</option>
                    <option>historicity-of-miracles</option>
                </select>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); min-height: 450px;">
                
                <div style="display: flex; flex-direction: column;">
                    <label style="font-weight: bold; background: var(--color-text); color: var(--color-bg); padding: var(--space-2); text-align: center; border-radius: var(--radius-sm) var(--radius-sm) 0 0;">Markdown (Edit)</label>
                    <textarea style="flex: 1; width: 100%; padding: var(--space-4); font-family: var(--font-mono); font-size: var(--text-sm); line-height: 1.6; border: 1px solid var(--color-border); border-top: none; border-bottom: none; resize: none; background-color: #fafafa;" placeholder="## The Evidence\nBased on the findings of..."></textarea>
                    
                    <div style="background: #fafafa; padding: var(--space-2); border: 1px solid var(--color-border); border-radius: 0 0 var(--radius-sm) var(--radius-sm); text-align: center; display: flex; gap: var(--space-2); justify-content: center;">
                        <button style="border: 1px solid var(--color-primary); background: #fff; color: var(--color-primary); padding: 4px 12px; cursor: pointer; border-radius: var(--radius-sm); font-size: 12px; font-weight: bold;">+ Insert Citation</button>
                        <button style="border: 1px solid var(--color-primary); background: #fff; color: var(--color-primary); padding: 4px 12px; cursor: pointer; border-radius: var(--radius-sm); font-size: 12px; font-weight: bold;">+ Insert Record Link</button>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column;">
                    <label style="font-weight: bold; background: #eee; padding: var(--space-2); text-align: center; border-radius: var(--radius-sm) var(--radius-sm) 0 0; border: 1px solid var(--color-border); border-bottom: none;">Live Preview</label>
                    <div style="flex: 1; padding: var(--space-4); border: 1px solid var(--color-border); background-color: #fff; overflow-y: auto;">
                        <h2 style="font-family: var(--font-serif); margin-top: 0;">The Evidence</h2>
                        <p style="line-height: 1.6;">Based on the findings of...</p>
                    </div>
                </div>

            </div>
        </div>
    `;

    container.innerHTML = html;
};
