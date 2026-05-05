// Trigger:  window.loadModule("system") → dashboard_app.js calls
//           window.renderSystem()
// Main:    renderSystem() — injects the system dashboard HTML, sets the
//           Providence canvas layout, and initialises all sub-modules:
//           display_system_data, agent_monitor, mcp_monitor,
//           test_execution_logic, and agent_generation_controls.
//           Starts real-time polling for health data, agent activity,
//           and MCP server status.
// Output:  Fully functional System monitoring dashboard in the Providence
//          work canvas. All sub-modules polling and wired. Errors routed
//          through window.surfaceError().

'use strict';

/* -----------------------------------------------------------------------------
   MODULE STATE
----------------------------------------------------------------------------- */
let _isActive = false;

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderSystem
   Called by dashboard_app.js when the user navigates to the System module.
   1. Sets the Providence canvas layout (full-width, no sidebar).
   2. Fetches and injects the system dashboard HTML into the main column.
   3. Initialises all sub-modules in dependency order.
   4. Starts real-time polling for health data, agent activity, and MCP.
----------------------------------------------------------------------------- */
async function renderSystem() {

    /* -------------------------------------------------------------------------
       1. SET LAYOUT — System dashboard uses the full main column without
          the Providence sidebar.
    ------------------------------------------------------------------------- */
    if (typeof window._setLayoutColumns === 'function') {
        window._setLayoutColumns(false, '1fr');
    }

    /* -------------------------------------------------------------------------
       2. INJECT HTML — Fetch the system dashboard template and inject it
          into the Providence main column.
    ------------------------------------------------------------------------- */
    try {
        const response = await fetch('/admin/frontend/dashboard_system.html');
        if (!response.ok) {
            throw new Error(
                'Failed to load system dashboard template (HTTP ' + response.status + ')'
            );
        }
        const html = await response.text();

        if (typeof window._setColumn === 'function') {
            window._setColumn('main', html);
        }
    } catch (err) {
        console.error('[dashboard_system] Template load failed:', err);
        if (typeof window.surfaceError === 'function') {
            window.surfaceError(
                'Error: Unable to load the System dashboard. Please refresh and try again.'
            );
        }
        return;
    }

    /* -------------------------------------------------------------------------
       3. INITIALISE SUB-MODULES
       Each sub-module exposes an init function on window. We call them
       after HTML injection so DOM elements are available.
    ------------------------------------------------------------------------- */

    // 3a. Start system data polling (health cards)
    if (typeof window.startSystemDataPolling === 'function') {
        window.startSystemDataPolling();
    } else {
        console.warn('[dashboard_system] startSystemDataPolling not found — is display_system_data.js loaded?');
    }

    // 3b. Start agent activity monitor
    if (typeof window.startAgentMonitorPolling === 'function') {
        window.startAgentMonitorPolling();
    } else {
        console.warn('[dashboard_system] startAgentMonitorPolling not found — is agent_monitor.js loaded?');
    }

    // 3c. Start MCP server monitor
    if (typeof window.startMcpMonitorPolling === 'function') {
        window.startMcpMonitorPolling();
    } else {
        console.warn('[dashboard_system] startMcpMonitorPolling not found — is mcp_monitor.js loaded?');
    }

    // 3d. Initialise test execution buttons
    if (typeof window.initTestExecution === 'function') {
        window.initTestExecution();
    } else {
        console.warn('[dashboard_system] initTestExecution not found — is test_execution_logic.js loaded?');
    }

    // 3e. Initialise agent generation and docs controls
    if (typeof window.initAgentGenerationControls === 'function') {
        window.initAgentGenerationControls();
    } else {
        console.warn('[dashboard_system] initAgentGenerationControls not found — is agent_generation_controls.js loaded?');
    }

    // 3f. Surface initial status
    if (typeof window.surfaceError === 'function') {
        window.surfaceError('System dashboard loaded. Monitoring active.');
    }

    _isActive = true;
}

/* -----------------------------------------------------------------------------
   PUBLIC: stopSystemModule
   Called externally to clean up all polling intervals when the user
   navigates away from the System module. This is a best-effort cleanup
   function; polling stops when the page is unloaded regardless.
----------------------------------------------------------------------------- */
function stopSystemModule() {
    if (!_isActive) return;
    _isActive = false;

    if (typeof window.stopSystemDataPolling === 'function') {
        window.stopSystemDataPolling();
    }
    if (typeof window.stopAgentMonitorPolling === 'function') {
        window.stopAgentMonitorPolling();
    }
    if (typeof window.stopMcpMonitorPolling === 'function') {
        window.stopMcpMonitorPolling();
    }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_app.js when routing to this module
----------------------------------------------------------------------------- */
window.renderSystem = renderSystem;
window.stopSystemModule = stopSystemModule;
