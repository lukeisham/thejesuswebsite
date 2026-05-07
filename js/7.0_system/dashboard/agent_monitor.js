// Trigger:  Called by dashboard_system.js (renderSystem) on module load.
//           Polls GET /api/admin/agent/logs?limit=50 on a 5-second interval
//           while the System module is active.
// Main:    fetchAgentLogs() — fetches recent agent run history, renders the
//           activity table with colour-coded statuses, updates the summary bar
//           (total runs, tokens, success rate), and displays trace reasoning
//           on row click.
// Output:  Live agent activity table with auto-scroll, running-row pulse,
//           summary statistics, and chain-of-thought trace reasoning panel.
//           Errors routed via window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MODULE STATE
----------------------------------------------------------------------------- */
let _pollIntervalId = null;
let _agentActive = false;
let _selectedRunId = null;
let _allRuns = [];

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: fetchAgentLogs
   Fetches agent run history from the backend and renders the activity table
   and summary bar. Called once on module load and then on a 5s interval.
----------------------------------------------------------------------------- */
async function fetchAgentLogs() {
  try {
    const response = await fetch("/api/admin/agent/logs?limit=50", {
      method: "GET",
      credentials: "same-origin",
    });

    if (!response.ok) {
      if (typeof window.surfaceError === "function") {
        window.surfaceError(
          "Error: Unable to retrieve agent run history. Polling paused — will retry.",
        );
      }
      return;
    }

    const result = await response.json();
    const runs = result.data || [];

    _allRuns = runs;

    if (runs.length === 0) {
      _renderEmptyState();
      if (typeof window.surfaceError === "function") {
        window.surfaceError(
          "Notice: No agent runs recorded yet. Trigger a search from the Challenge dashboard.",
        );
      }
      return;
    }

    _renderSummaryBar(runs);
    _renderTable(runs);

    // If the previously selected run still exists, re-select it
    if (_selectedRunId !== null) {
      const stillExists = runs.some(function (r) {
        return r.id === _selectedRunId;
      });
      if (!stillExists) {
        _selectedRunId = null;
        _clearTraceReasoning();
      }
    }
  } catch (err) {
    console.error("[agent_monitor] Fetch failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to retrieve agent run history. Polling paused — will retry.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderSummaryBar
   Calculates and displays today's run count, token total, and success rate.
----------------------------------------------------------------------------- */
function _renderSummaryBar(runs) {
  const today = new Date().toISOString().substring(0, 10);

  const todayRuns = runs.filter(function (r) {
    return r.started_at && r.started_at.substring(0, 10) === today;
  });

  const runCount = todayRuns.length;
  const tokenTotal = todayRuns.reduce(function (sum, r) {
    return sum + (r.tokens_used || 0);
  }, 0);

  const completedRuns = todayRuns.filter(function (r) {
    return r.status === "completed";
  });
  const successRate =
    todayRuns.length > 0
      ? Math.round((completedRuns.length / todayRuns.length) * 100)
      : 0;

  const runsEl = document.getElementById("agent-summary-runs");
  const tokensEl = document.getElementById("agent-summary-tokens");
  const rateEl = document.getElementById("agent-summary-rate");

  if (runsEl) runsEl.textContent = `Runs Today: ${runCount}`;
  if (tokensEl)
    tokensEl.textContent = `Tokens Today: ${tokenTotal.toLocaleString()}`;
  if (rateEl) rateEl.textContent = `Success Rate: ${successRate}%`;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderTable
   Renders the agent activity table with all runs. Handles running-row
   pulsing, status colour coding, and row click for trace reasoning.
----------------------------------------------------------------------------- */
function _renderTable(runs) {
  const tbody = document.getElementById("agent-activity-tbody");
  const emptyEl = document.getElementById("agent-table-empty");

  if (!tbody) return;

  // Show table, hide empty message
  if (emptyEl) emptyEl.classList.remove("is-visible");

  tbody.innerHTML = "";

  runs.forEach(function (run) {
    const tr = document.createElement("tr");
    tr.setAttribute("data-run-id", run.id || "");

    // Highlight selected row
    if (run.id === _selectedRunId) {
      tr.classList.add("is-selected");
    }

    // Pulse running rows
    if (run.status === "running") {
      tr.classList.add("is-running");
    }

    // Started column
    const tdStarted = document.createElement("td");
    tdStarted.textContent = _formatTime(run.started_at);
    tr.appendChild(tdStarted);

    // Pipeline column
    const tdPipeline = document.createElement("td");
    tdPipeline.textContent = run.pipeline || "—";
    tr.appendChild(tdPipeline);

    // Record column
    const tdRecord = document.createElement("td");
    tdRecord.textContent = run.record_slug || "—";
    tr.appendChild(tdRecord);

    // Status column (with colour coding)
    const tdStatus = document.createElement("td");
    tdStatus.textContent = run.status || "unknown";
    tdStatus.classList.add("status--" + (run.status || "unknown"));

    // Add spinner for running status
    if (run.status === "running") {
      const spinner = document.createElement("span");
      spinner.className = "status-spinner";
      spinner.setAttribute("aria-hidden", "true");
      tdStatus.insertBefore(spinner, tdStatus.firstChild);
    }
    tr.appendChild(tdStatus);

    // Tokens column
    const tdTokens = document.createElement("td");
    tdTokens.textContent =
      run.tokens_used !== null && run.tokens_used !== undefined
        ? Number(run.tokens_used).toLocaleString()
        : "—";
    tr.appendChild(tdTokens);

    // Row click → show trace reasoning
    tr.addEventListener("click", function () {
      _selectRun(run);
    });

    tbody.appendChild(tr);
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _selectRun
   Marks a run as selected, highlights its row, and displays its trace
   reasoning in the panel below.
----------------------------------------------------------------------------- */
function _selectRun(run) {
  _selectedRunId = run.id;

  // Update row highlighting
  const allRows = document.querySelectorAll("#agent-activity-tbody tr");
  allRows.forEach(function (row) {
    const rowId = row.getAttribute("data-run-id");
    if (rowId === String(run.id)) {
      row.classList.add("is-selected");
    } else {
      row.classList.remove("is-selected");
    }
  });

  // Update trace run label
  const labelEl = document.getElementById("trace-run-label");
  if (labelEl) {
    labelEl.textContent =
      "(" +
      (run.record_slug || "unknown") +
      " @ " +
      _formatTime(run.started_at) +
      ")";
  }

  // Display trace reasoning
  const contentEl = document.getElementById("trace-reasoning-content");
  if (!contentEl) return;

  const trace = run.trace_reasoning;

  if (!trace || trace.trim() === "") {
    contentEl.textContent = "";
    contentEl.style.fontStyle = "italic";
    contentEl.style.color = "var(--color-text-muted)";
    contentEl.textContent =
      "No trace reasoning recorded for this run. The agent may have failed before analysis began.";

    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Notice: No trace reasoning recorded for this run. The agent may have failed before analysis began.",
      );
    }
    return;
  }

  contentEl.style.fontStyle = "";
  contentEl.style.color = "";
  contentEl.textContent = trace;

  // Ensure the details panel is open
  const panel = document.getElementById("trace-reasoning-panel");
  if (panel && !panel.open) {
    panel.open = true;
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _clearTraceReasoning
   Resets the trace reasoning panel to its default empty state.
----------------------------------------------------------------------------- */
function _clearTraceReasoning() {
  const contentEl = document.getElementById("trace-reasoning-content");
  const labelEl = document.getElementById("trace-run-label");

  if (contentEl) {
    contentEl.style.fontStyle = "";
    contentEl.style.color = "";
    contentEl.textContent =
      "Select an agent run above to view its chain-of-thought reasoning.";
  }
  if (labelEl) {
    labelEl.textContent = "(select a run)";
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderEmptyState
   Shows the empty state message when no agent runs are recorded.
----------------------------------------------------------------------------- */
function _renderEmptyState() {
  const tbody = document.getElementById("agent-activity-tbody");
  const emptyEl = document.getElementById("agent-table-empty");

  if (tbody) tbody.innerHTML = "";
  if (emptyEl) emptyEl.classList.add("is-visible");

  // Reset summary
  const runsEl = document.getElementById("agent-summary-runs");
  const tokensEl = document.getElementById("agent-summary-tokens");
  const rateEl = document.getElementById("agent-summary-rate");

  if (runsEl) runsEl.textContent = "Runs Today: 0";
  if (tokensEl) tokensEl.textContent = "Tokens Today: 0";
  if (rateEl) rateEl.textContent = "Success Rate: —";
}

/* -----------------------------------------------------------------------------
   INTERNAL: _formatTime
   Formats an ISO8601 timestamp to HH:MM:SS display format.
----------------------------------------------------------------------------- */
function _formatTime(iso) {
  if (!iso) return "—";
  try {
    return iso.substring(11, 19);
  } catch (e) {
    return "—";
  }
}

/* -----------------------------------------------------------------------------
   PUBLIC: startAgentMonitorPolling
   Called by dashboard_system.js when the System module is loaded.
   Starts a 5-second recurring poll of agent run history.
----------------------------------------------------------------------------- */
function startAgentMonitorPolling() {
  if (_agentActive) return;
  _agentActive = true;

  // Fetch immediately on start
  fetchAgentLogs();

  // Then poll every 5 seconds
  _pollIntervalId = setInterval(fetchAgentLogs, 5000);
}

/* -----------------------------------------------------------------------------
   PUBLIC: stopAgentMonitorPolling
   Called by dashboard_system.js when the System module is unloaded.
   Clears the polling interval.
----------------------------------------------------------------------------- */
function stopAgentMonitorPolling() {
  _agentActive = false;
  if (_pollIntervalId !== null) {
    clearInterval(_pollIntervalId);
    _pollIntervalId = null;
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.fetchAgentLogs = fetchAgentLogs;
window.startAgentMonitorPolling = startAgentMonitorPolling;
window.stopAgentMonitorPolling = stopAgentMonitorPolling;
