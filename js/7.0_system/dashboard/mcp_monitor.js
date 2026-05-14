// Trigger:  Called by dashboard_system.js (renderSystem) on module load.
//           MCP server now runs on stdio transport — no HTTP health
//           endpoint to poll. Replaced former 10s polling with a static
//           status indicator noting the server uses stdio.
// Main:    renderMcpStdioStatus() — renders a static MCP status card
//           indicating the server runs via stdio transport. No HTTP
//           polling or error-log streaming. Maintains the same card DOM
//           structure so dashboard_system.js can mount it unaffected.
//           Exposes startMcpMonitorPolling() and stopMcpMonitorPolling()
//           as empty stubs for backward compatibility.
// Output:  Static MCP server status card showing stdio transport label.
// Version: 1.2.0

"use strict";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderMcpStdioStatus
   Renders a static MCP status card indicating that the MCP server operates
   via stdio transport (stdin/stdout) rather than an HTTP endpoint. No
   polling or health-check requests are made.
   Called once on module load.
----------------------------------------------------------------------------- */
function renderMcpStdioStatus() {
  const statusEl = document.getElementById("mcp-status");
  const detailEl = document.getElementById("mcp-detail");

  if (!statusEl) return;

  // Clear any existing state classes
  statusEl.classList.remove(
    "health-card__value--loading",
    "health-card__value--ok",
    "health-card__value--degraded",
    "health-card__value--error",
    "health-card__value--offline",
  );

  // Static healthy indicator — server runs persistently via systemd
  statusEl.textContent = "Online (stdio)";
  statusEl.classList.add("health-card__value--ok");

  if (detailEl) {
    detailEl.textContent =
      "Transport: stdio | No HTTP endpoint | External AI agents connect via MCP protocol";
  }
}

/* -----------------------------------------------------------------------------
   PUBLIC: startMcpMonitorPolling
   Stub for backward compatibility with dashboard_system.js.
   Since the MCP server now uses stdio transport, no polling is needed.
   Calls renderMcpStdioStatus() once to render the static status card.
----------------------------------------------------------------------------- */
function startMcpMonitorPolling() {
  renderMcpStdioStatus();
}

/* -----------------------------------------------------------------------------
   PUBLIC: stopMcpMonitorPolling
   Stub for backward compatibility with dashboard_system.js.
   No-op since no polling interval exists.
----------------------------------------------------------------------------- */
function stopMcpMonitorPolling() {
  // No-op — stdio transport requires no polling
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.renderMcpStdioStatus = renderMcpStdioStatus;
window.startMcpMonitorPolling = startMcpMonitorPolling;
window.stopMcpMonitorPolling = stopMcpMonitorPolling;
