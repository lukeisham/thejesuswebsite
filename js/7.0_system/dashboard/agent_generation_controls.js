// Trigger:  User clicks "View / Edit Docs" or "Generate Agents" buttons
//           in the System dashboard Architectural Docs section.
// Main:    handleViewEditDocs() / handleGenerateAgents() — initiates the
//           respective workflow by sending a POST request to the backend.
//           Displays status feedback via the shared Status Bar.
// Output:  Backend-triggered document management or agent generation.
//           Errors routed via window.surfaceError().

'use strict';

/* -----------------------------------------------------------------------------
   MODULE STATE
----------------------------------------------------------------------------- */
let _isGenerating = false;

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: handleViewEditDocs
   Opens the documentation editor or navigates to the documentation
   management interface. Sends a POST to the backend to prepare the
   documentation editing session.
----------------------------------------------------------------------------- */
async function handleViewEditDocs() {
    const btn = document.getElementById('btn-view-edit-docs');
    if (btn) btn.disabled = true;

    try {
        const response = await fetch('/api/admin/docs/open', {
            method: 'POST',
            credentials: 'same-origin',
        });

        if (!response.ok) {
            throw new Error(
                'Failed to open documentation editor (HTTP ' + response.status + ').'
            );
        }

        const result = await response.json();

        // If the backend returns a URL, navigate to it
        if (result.url) {
            window.open(result.url, '_blank');
        }

        if (typeof window.surfaceError === 'function') {
            window.surfaceError(
                result.message || 'Documentation editor opened successfully.'
            );
        }
    } catch (err) {
        console.error('[agent_generation_controls] View/Edit Docs failed:', err);

        if (typeof window.surfaceError === 'function') {
            window.surfaceError(
                'Error: Failed to open documentation editor. Check documentation permissions.'
            );
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: handleGenerateAgents
   Triggers the agent generation workflow on the backend. Sends a POST
   request to spawn new AI agents based on architectural documentation.
   Disables the button during generation and reports progress via the
   Status Bar.
----------------------------------------------------------------------------- */
async function handleGenerateAgents() {
    if (_isGenerating) return;

    const btn = document.getElementById('btn-generate-agents');
    _isGenerating = true;

    if (btn) {
        btn.disabled = true;
        btn.setAttribute('data-original-text', btn.textContent);
        btn.textContent = 'Generating...';
    }

    try {
        const response = await fetch('/api/admin/agents/generate', {
            method: 'POST',
            credentials: 'same-origin',
        });

        if (!response.ok) {
            const errorText = await response.text().catch(function () { return ''; });
            throw new Error(
                'Agent generation failed (HTTP ' + response.status + '). ' +
                (errorText || 'Check documentation permissions.')
            );
        }

        const result = await response.json();

        if (typeof window.surfaceError === 'function') {
            const agentCount = result.agents_created || 0;
            window.surfaceError(
                result.message ||
                `Agent generation complete. ${agentCount} agent(s) created.`
            );
        }
    } catch (err) {
        console.error('[agent_generation_controls] Agent generation failed:', err);

        if (typeof window.surfaceError === 'function') {
            window.surfaceError(
                'Error: Agent generation failed. Check documentation permissions.'
            );
        }
    } finally {
        _isGenerating = false;
        if (btn) {
            btn.disabled = false;
            const original = btn.getAttribute('data-original-text');
            if (original) {
                btn.textContent = original;
                btn.removeAttribute('data-original-text');
            }
        }
    }
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: handleSaveConfiguration
   Sends a PUT request to save the current system configuration.
   Triggered by the "Save Configuration" button in the function bar.
----------------------------------------------------------------------------- */
async function handleSaveConfiguration() {
    const btn = document.getElementById('btn-system-save-config');
    if (btn) btn.disabled = true;

    try {
        // Gather current configuration settings from the page
        const config = {
            saved_at: new Date().toISOString(),
        };

        const response = await fetch('/api/admin/system/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(config),
        });

        if (!response.ok) {
            throw new Error(
                'Failed to save configuration (HTTP ' + response.status + ').'
            );
        }

        if (typeof window.surfaceError === 'function') {
            window.surfaceError('System configuration saved successfully.');
        }
    } catch (err) {
        console.error('[agent_generation_controls] Save config failed:', err);

        if (typeof window.surfaceError === 'function') {
            window.surfaceError(
                'Error: Failed to save configuration. Check server logs.'
            );
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: handleRestartServices
   Sends a POST request to restart backend services. Displays a confirmation
   prompt before proceeding.
----------------------------------------------------------------------------- */
async function handleRestartServices() {
    const confirmed = confirm(
        'Are you sure you want to restart backend services? This may cause a brief interruption.'
    );
    if (!confirmed) return;

    const btn = document.getElementById('btn-system-restart');
    if (btn) btn.disabled = true;

    try {
        const response = await fetch('/api/admin/services/restart', {
            method: 'POST',
            credentials: 'same-origin',
        });

        if (!response.ok) {
            throw new Error(
                'Failed to restart services (HTTP ' + response.status + ').'
            );
        }

        if (typeof window.surfaceError === 'function') {
            window.surfaceError(
                'Services restart initiated. The dashboard will refresh shortly.'
            );
        }

        // Wait a moment then reload the page
        setTimeout(function () {
            window.location.reload();
        }, 3000);
    } catch (err) {
        console.error('[agent_generation_controls] Restart failed:', err);

        if (typeof window.surfaceError === 'function') {
            window.surfaceError(
                'Error: Failed to restart services. Check server logs.'
            );
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}

/* -----------------------------------------------------------------------------
   PUBLIC: initAgentGenerationControls
   Called by dashboard_system.js when the System module is loaded.
   Wires click handlers to the function bar and docs control buttons.
----------------------------------------------------------------------------- */
function initAgentGenerationControls() {
    // Function bar buttons
    const btnSaveConfig = document.getElementById('btn-system-save-config');
    const btnRestart = document.getElementById('btn-system-restart');

    if (btnSaveConfig) {
        btnSaveConfig.addEventListener('click', handleSaveConfiguration);
    }

    if (btnRestart) {
        btnRestart.addEventListener('click', handleRestartServices);
    }

    // Docs control buttons
    const btnViewEdit = document.getElementById('btn-view-edit-docs');
    const btnGenerate = document.getElementById('btn-generate-agents');

    if (btnViewEdit) {
        btnViewEdit.addEventListener('click', handleViewEditDocs);
    }

    if (btnGenerate) {
        btnGenerate.addEventListener('click', handleGenerateAgents);
    }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.handleViewEditDocs = handleViewEditDocs;
window.handleGenerateAgents = handleGenerateAgents;
window.handleSaveConfiguration = handleSaveConfiguration;
window.handleRestartServices = handleRestartServices;
window.initAgentGenerationControls = initAgentGenerationControls;
