// Trigger:  Called by dashboard_system.js (renderSystem) on module load.
//           Polls GET /api/admin/mcp/health on a 10-second interval while
//           the System module is active.
// Main:    fetchMcpHealth() — fetches MCP server health, renders the MCP
//           status card with colour-coded Online/Offline/Degraded label,
//           displays tool count, error count, and last request timestamp.
//           Maintains a rolling error log of the last 20 MCP error events.
//           Detects state transitions and pushes status messages to the
//           shared Status Bar via window.surfaceError().
// Output:  Live MCP server status card + error log stream.
//           Errors routed via window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MODULE STATE
----------------------------------------------------------------------------- */
let _mcpPollIntervalId = null;
let _mcpActive = false;
let _previousState = null; // 'online' | 'offline' | 'degraded' | null
let _errorLog = []; // Rolling log of last 20 error events

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: fetchMcpHealth
   Fetches MCP server health data and renders the status card + error log.
   Called once on module load and then on a 10s interval.
----------------------------------------------------------------------------- */
async function fetchMcpHealth() {
  try {
    const response = await fetch("/api/admin/mcp/health", {
      method: "GET",
      credentials: "same-origin",
    });

    if (!response.ok) {
      _handleFetchError();
      return;
    }

    const data = await response.json();
    _renderMcpCard(data);
    _detectStateTransition(data);
    _updateErrorLog(data);
  } catch (err) {
    console.error("[mcp_monitor] Fetch failed:", err);
    _handleFetchError();
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderMcpCard
   Updates the MCP status card with connection state, tool count, error
   count, and last request timestamp.
----------------------------------------------------------------------------- */
function _renderMcpCard(data) {
  const statusEl = document.getElementById("mcp-status");
  const detailEl = document.getElementById("mcp-detail");

  if (!statusEl) return;

  const state = data.status || "offline";
  const mcp = data.mcp || {};

  // Clear existing state classes
  statusEl.classList.remove(
    "health-card__value--loading",
    "health-card__value--ok",
    "health-card__value--degraded",
    "health-card__value--error",
    "health-card__value--offline",
  );

  if (state === "online") {
    statusEl.textContent = "Online";
    statusEl.classList.add("health-card__value--ok");
  } else if (state === "degraded") {
    statusEl.textContent = "Degraded";
    statusEl.classList.add("health-card__value--degraded");
  } else {
    statusEl.textContent = "Offline";
    statusEl.classList.add("health-card__value--error");
  }

  // Build detail line
  if (detailEl) {
    const tools = mcp.tool_count !== undefined ? mcp.tool_count : "—";
    const errors = mcp.error_count !== undefined ? mcp.error_count : "0";
    const lastReq = mcp.last_request
      ? mcp.last_request.substring(11, 19)
      : data.checked_at
        ? data.checked_at.substring(11, 19)
        : "—";

    detailEl.textContent = `Tools: ${tools} | Errors Today: ${errors} | Last: ${lastReq}`;
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _detectStateTransition
   Compares current state to the previous state. If a transition occurred
   (online → offline, offline → online, etc.), pushes a status message to
   the shared Status Bar via window.surfaceError().
----------------------------------------------------------------------------- */
function _detectStateTransition(data) {
  const currentState = data.status || "offline";

  // First poll — just record state, no transition
  if (_previousState === null) {
    _previousState = currentState;
    return;
  }

  if (currentState === _previousState) return;

  // State has changed — push appropriate message
  if (currentState === "offline") {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: MCP Server is offline. Tool calls will fail until it is restarted.",
      );
    }
  } else if (currentState === "degraded") {
    const mcp = data.mcp || {};
    const errCount = mcp.error_count !== undefined ? mcp.error_count : "?";
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        `Warning: MCP Server is degraded. ${errCount} tool(s) reporting errors. Check the error log below.`,
      );
    }
  } else if (
    currentState === "online" &&
    (_previousState === "offline" || _previousState === "degraded")
  ) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError("MCP Server reconnected. Monitoring resumed.");
    }
  }

  _previousState = currentState;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _updateErrorLog
   Reads error events from the health response, appends new entries to the
   rolling error log (max 20), and renders the error log UI beneath the MCP
   status card.
----------------------------------------------------------------------------- */
function _updateErrorLog(data) {
  const mcp = data.mcp || {};
  const newErrors = mcp.errors || [];

  if (!Array.isArray(newErrors) || newErrors.length === 0) {
    // No new errors — if there are existing errors, keep displaying them
    _renderErrorLog();
    return;
  }

  // Append new errors (avoid duplicates by comparing timestamps)
  newErrors.forEach(function (err) {
    const exists = _errorLog.some(function (existing) {
      return (
        existing.timestamp === err.timestamp &&
        existing.tool_name === err.tool_name
      );
    });
    if (!exists) {
      _errorLog.push(err);

      // Surface individual tool error to Status Bar
      if (typeof window.surfaceError === "function") {
        const toolName = err.tool_name || "unknown";
        const errorType = err.error_type || "unknown";
        const ts = err.timestamp ? err.timestamp.substring(11, 19) : "—";
        window.surfaceError(
          `MCP Error: Tool '${toolName}' failed at ${ts}. Reason: ${errorType}.`,
        );
      }
    }
  });

  // Trim to last 20 entries
  if (_errorLog.length > 20) {
    _errorLog = _errorLog.slice(_errorLog.length - 20);
  }

  _renderErrorLog();
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderErrorLog
   Renders the MCP error log UI beneath the status card. Creates the error
   log element if it doesn't exist yet.
----------------------------------------------------------------------------- */
function _renderErrorLog() {
  const cardEl = document.getElementById("card-mcp");
  if (!cardEl) return;

  // Find or create the error log container
  let logEl = cardEl.querySelector(".mcp-error-log");

  if (_errorLog.length === 0) {
    if (logEl) {
      logEl.querySelector(".mcp-error-log__stream").innerHTML =
        '<p class="mcp-error-log__empty">No errors recorded</p>';
      logEl.querySelector(".mcp-error-log__count").textContent = "0";
    }
    return;
  }

  if (!logEl) {
    logEl = document.createElement("div");
    logEl.className = "mcp-error-log";

    const heading = document.createElement("div");
    heading.className = "mcp-error-log__heading";
    heading.innerHTML =
      'Error Log <span class="mcp-error-log__count">' +
      _errorLog.length +
      "</span>";

    const stream = document.createElement("pre");
    stream.className = "mcp-error-log__stream";

    logEl.appendChild(heading);
    logEl.appendChild(stream);
    cardEl.appendChild(logEl);
  }

  // Build error log text
  const streamEl = logEl.querySelector(".mcp-error-log__stream");
  const countEl = logEl.querySelector(".mcp-error-log__count");

  if (streamEl) {
    const lines = _errorLog.map(function (err) {
      const ts = err.timestamp ? err.timestamp.substring(11, 19) : "--:--:--";
      const tool = err.tool_name || "unknown";
      const type = err.error_type || "unknown";
      return `[${ts}] ${tool} — ${type}`;
    });
    streamEl.textContent = lines.join("\n");
  }
  if (countEl) {
    countEl.textContent = String(_errorLog.length);
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _handleFetchError
   Called when the MCP health endpoint is unreachable. Marks the card as
   Offline and pushes an error to the Status Bar.
----------------------------------------------------------------------------- */
function _handleFetchError() {
  const statusEl = document.getElementById("mcp-status");
  const detailEl = document.getElementById("mcp-detail");

  if (statusEl) {
    statusEl.classList.remove(
      "health-card__value--loading",
      "health-card__value--ok",
      "health-card__value--degraded",
      "health-card__value--error",
      "health-card__value--offline",
    );
    statusEl.textContent = "Offline";
    statusEl.classList.add("health-card__value--error");
  }
  if (detailEl) {
    detailEl.textContent = "Unable to reach MCP server";
  }

  if (typeof window.surfaceError === "function") {
    window.surfaceError(
      "Error: Unable to reach MCP server. Status unknown — polling paused.",
    );
  }

  // Detect transition to offline
  if (_previousState !== "offline" && _previousState !== null) {
    _previousState = "offline";
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: MCP Server is offline. Tool calls will fail until it is restarted.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   PUBLIC: startMcpMonitorPolling
   Called by dashboard_system.js when the System module is loaded.
   Starts a 10-second recurring poll of MCP server health.
----------------------------------------------------------------------------- */
function startMcpMonitorPolling() {
  if (_mcpActive) return;
  _mcpActive = true;

  // Fetch immediately on start
  fetchMcpHealth();

  // Then poll every 10 seconds
  _mcpPollIntervalId = setInterval(fetchMcpHealth, 10000);
}

/* -----------------------------------------------------------------------------
   PUBLIC: stopMcpMonitorPolling
   Called by dashboard_system.js when the System module is unloaded.
   Clears the polling interval.
----------------------------------------------------------------------------- */
function stopMcpMonitorPolling() {
  _mcpActive = false;
  if (_mcpPollIntervalId !== null) {
    clearInterval(_mcpPollIntervalId);
    _mcpPollIntervalId = null;
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.fetchMcpHealth = fetchMcpHealth;
window.startMcpMonitorPolling = startMcpMonitorPolling;
window.stopMcpMonitorPolling = stopMcpMonitorPolling;
