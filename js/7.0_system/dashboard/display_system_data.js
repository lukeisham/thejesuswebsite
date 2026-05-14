// Trigger:  Called by dashboard_system.js (renderSystem) on module load, then
//           on a 10-second recurring interval while the System module is active.
// Main:    fetchSystemHealth() — polls GET /api/admin/health_check and
//           GET /api/admin/agent/logs?limit=1, parses the responses, and
//           renders health status into the five system health cards (API,
//           VPS, Security, DeepSeek, MCP placeholder).
// Output:  Health cards populated with live status, colour coding, resource
//           meter bars, and detail text. Errors routed via window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MODULE STATE — tracked for comparison between poll cycles
----------------------------------------------------------------------------- */
let _systemDataPollIntervalId = null;
let _systemDataActive = false;

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: fetchSystemHealth
   Fetches system health data from the backend and populates the health cards.
   Called once on module load and then on a recurring 10s interval.
----------------------------------------------------------------------------- */
async function fetchSystemHealth() {
  try {
    // --- 1. Fetch health check data ---
    const healthResponse = await fetch("/api/admin/health_check", {
      method: "GET",
      credentials: "same-origin",
    });

    if (!healthResponse.ok) {
      _setAllCardsError();
      if (typeof window.surfaceError === "function") {
        window.surfaceError(
          "Error: System health check failed. Backend may be unreachable.",
        );
      }
      return;
    }

    const healthData = await healthResponse.json();

    // --- 2. Parse and render each card ---
    _renderApiHealth(healthData);
    _renderVpsResources(healthData);
    _renderSecurity(healthData);
    _renderDeepSeek(healthData);

    // --- 3. Fetch DeepSeek token/run counts from agent logs ---
    await _fetchDeepSeekCounts();
  } catch (err) {
    console.error("[display_system_data] Health check failed:", err);
    _setAllCardsError();
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: System health check failed. Backend may be unreachable.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderApiHealth
   Updates the API Health card with overall service status.
----------------------------------------------------------------------------- */
function _renderApiHealth(data) {
  const statusEl = document.getElementById("api-health-status");
  const detailEl = document.getElementById("api-health-detail");

  if (!statusEl) return;

  const status = data.status || "unknown";
  const timestamp = data.timestamp || "";

  statusEl.classList.remove(
    "health-card__value--loading",
    "health-card__value--ok",
    "health-card__value--degraded",
    "health-card__value--error",
  );

  if (status === "ok") {
    statusEl.textContent = "OK";
    statusEl.classList.add("health-card__value--ok");
  } else if (status === "degraded") {
    statusEl.textContent = "Degraded";
    statusEl.classList.add("health-card__value--degraded");
  } else {
    statusEl.textContent = "Error";
    statusEl.classList.add("health-card__value--error");
  }

  if (detailEl) {
    const db = data.database || {};
    const dbStatus = db.status || "unknown";
    const recordCount = db.record_count !== undefined ? db.record_count : "--";
    let detail =
      `Service: ${data.service || "API"} | DB: ${dbStatus} | ` +
      `Records: ${recordCount} | ${_formatTimestamp(timestamp)}`;
    // Append database error message when DB check failed
    if (db.error) {
      detail += ` | DB error: ${db.error}`;
    }
    detailEl.textContent = detail;
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderVpsResources
   Updates the VPS Resources card with CPU, memory, and disk gauges.
----------------------------------------------------------------------------- */
function _renderVpsResources(data) {
  const cpuFillEl = document.getElementById("vps-cpu-fill");
  const cpuTextEl = document.getElementById("vps-cpu-text");
  const cpuBarEl = document.getElementById("vps-cpu-bar");
  const memFillEl = document.getElementById("vps-mem-fill");
  const memTextEl = document.getElementById("vps-mem-text");
  const memBarEl = document.getElementById("vps-mem-bar");
  const diskFillEl = document.getElementById("vps-disk-fill");
  const diskTextEl = document.getElementById("vps-disk-text");
  const diskBarEl = document.getElementById("vps-disk-bar");
  const detailEl = document.getElementById("vps-detail");

  const resources = data.resources || {};

  if (resources.status === "unavailable" || resources.status === "error") {
    if (cpuTextEl) cpuTextEl.textContent = "N/A";
    if (memTextEl) memTextEl.textContent = "N/A";
    if (diskTextEl) diskTextEl.textContent = "N/A";
    if (detailEl)
      detailEl.textContent = resources.error || "Resource data unavailable";
    return;
  }

  const cpuPercent = resources.cpu_percent;
  const mem = resources.memory || {};
  const memPercent = mem.percent;
  const disk = resources.disk || {};

  // CPU gauge
  if (cpuFillEl && cpuPercent !== undefined) {
    cpuFillEl.style.width = `${cpuPercent}%`;
    _setMeterColor(cpuFillEl, cpuPercent);
    if (cpuBarEl)
      cpuBarEl.setAttribute("aria-valuenow", String(Math.round(cpuPercent)));
  }
  if (cpuTextEl && cpuPercent !== undefined) {
    cpuTextEl.textContent = `${Math.round(cpuPercent)}%`;
  }

  // Memory gauge
  if (memFillEl && memPercent !== undefined) {
    memFillEl.style.width = `${memPercent}%`;
    _setMeterColor(memFillEl, memPercent);
    if (memBarEl)
      memBarEl.setAttribute("aria-valuenow", String(Math.round(memPercent)));
  }
  if (memTextEl && memPercent !== undefined) {
    memTextEl.textContent = `${Math.round(memPercent)}%`;
  }

  // Disk gauge
  const diskPercent = disk.percent;
  if (diskFillEl && diskPercent !== undefined) {
    diskFillEl.style.width = `${diskPercent}%`;
    _setMeterColor(diskFillEl, diskPercent);
    if (diskBarEl)
      diskBarEl.setAttribute("aria-valuenow", String(Math.round(diskPercent)));
  }
  if (diskTextEl && diskPercent !== undefined) {
    diskTextEl.textContent = `${Math.round(diskPercent)}%`;
  }

  // Detail line
  if (detailEl) {
    const memUsed = mem.used_gb !== undefined ? `${mem.used_gb} GB` : "--";
    const memTotal = mem.total_gb !== undefined ? `${mem.total_gb} GB` : "--";
    const diskUsed = disk.used_gb !== undefined ? `${disk.used_gb} GB` : "--";
    const diskTotal =
      disk.total_gb !== undefined ? `${disk.total_gb} GB` : "--";
    detailEl.textContent = `Memory: ${memUsed} / ${memTotal} | Disk: ${diskUsed} / ${diskTotal}`;
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _setMeterColor
   Applies warning/critical colour classes to a meter fill element based on
   the percentage value (> 75% = warning, > 90% = critical).
----------------------------------------------------------------------------- */
function _setMeterColor(fillEl, percent) {
  fillEl.classList.remove(
    "meter-bar__fill--warning",
    "meter-bar__fill--critical",
  );
  if (percent > 90) {
    fillEl.classList.add("meter-bar__fill--critical");
  } else if (percent > 75) {
    fillEl.classList.add("meter-bar__fill--warning");
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderSecurity
   Updates the Security card based on overall health status. Inspects each
   subsystem (database, DeepSeek, resources) and surfaces specific issues
   so the operator knows exactly what needs attention.
----------------------------------------------------------------------------- */
function _renderSecurity(data) {
  const statusEl = document.getElementById("security-status");
  const detailEl = document.getElementById("security-detail");

  if (!statusEl) return;

  statusEl.classList.remove(
    "health-card__value--loading",
    "health-card__value--ok",
    "health-card__value--degraded",
    "health-card__value--error",
  );

  // --- Collect specific issues from each subsystem ---
  var issues = [];

  if (data.database && data.database.status === "error") {
    issues.push("Database: " + (data.database.error || "connection failed"));
  }

  if (data.deepseek_api && data.deepseek_api.status === "unavailable") {
    issues.push(
      "DeepSeek AI: " + (data.deepseek_api.error || "not configured"),
    );
  }

  if (data.resources && data.resources.status === "error") {
    issues.push(
      "VPS resources: " + (data.resources.error || "monitoring error"),
    );
  }

  var overallStatus = data.status || "unknown";

  if (overallStatus === "ok") {
    statusEl.textContent = "OK";
    statusEl.classList.add("health-card__value--ok");
    if (detailEl) {
      detailEl.textContent = "All systems healthy";
    }
  } else if (overallStatus === "degraded") {
    statusEl.textContent = "Warning";
    statusEl.classList.add("health-card__value--degraded");
    if (detailEl) {
      detailEl.textContent =
        issues.length > 0
          ? issues.join(" — ")
          : "One or more subsystems not operating normally";
    }
  } else {
    statusEl.textContent = "Alert";
    statusEl.classList.add("health-card__value--error");
    if (detailEl) {
      detailEl.textContent =
        issues.length > 0 ? issues.join(" — ") : "System health check failed";
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderDeepSeek
   Updates the DeepSeek API card based on the health check's deepseek_api
   field. Token and run counts are updated separately by _fetchDeepSeekCounts().
----------------------------------------------------------------------------- */
function _renderDeepSeek(data) {
  const statusEl = document.getElementById("deepseek-status");
  const detailEl = document.getElementById("deepseek-detail");

  if (!statusEl) return;

  statusEl.classList.remove(
    "health-card__value--loading",
    "health-card__value--ok",
    "health-card__value--error",
    "health-card__value--offline",
  );

  const ds = data.deepseek_api || {};

  if (ds.status === "configured") {
    statusEl.textContent = "OK";
    statusEl.classList.add("health-card__value--ok");
  } else {
    statusEl.textContent = "Unavailable";
    statusEl.classList.add("health-card__value--error");
  }

  if (detailEl) {
    detailEl.textContent =
      ds.status === "configured"
        ? "API key verified"
        : ds.error || "API key not configured";
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _fetchDeepSeekCounts
   Fetches agent logs to get today's token total and run count, then updates
   the DeepSeek card detail line.
----------------------------------------------------------------------------- */
async function _fetchDeepSeekCounts() {
  try {
    const response = await fetch("/api/admin/agent/logs?limit=200", {
      method: "GET",
      credentials: "same-origin",
    });

    if (!response.ok) {
      if (typeof window.surfaceError === "function") {
        window.surfaceError(
          "Error: Unable to verify DeepSeek API connectivity. Check API key and network.",
        );
      }
      return;
    }

    const result = await response.json();
    const runs = result.data || [];

    // Filter for today's runs only
    const today = new Date().toISOString().substring(0, 10);
    const todayRuns = runs.filter(function (r) {
      return r.started_at && r.started_at.substring(0, 10) === today;
    });

    const runCount = todayRuns.length;
    const tokenTotal = todayRuns.reduce(function (sum, r) {
      return sum + (r.tokens_used || 0);
    }, 0);

    // Update the DeepSeek card detail
    const detailEl = document.getElementById("deepseek-detail");
    if (detailEl) {
      const currentText = detailEl.textContent || "";
      detailEl.textContent = `${currentText.split("|")[0].trim()} | Tokens Today: ${tokenTotal.toLocaleString()} | Runs Today: ${runCount}`;
    }
  } catch (err) {
    console.error("[display_system_data] DeepSeek count fetch failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to verify DeepSeek API connectivity. Check API key and network.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _setAllCardsError
   Sets all health cards to an error state when the health check fails.
----------------------------------------------------------------------------- */
function _setAllCardsError() {
  const cards = [
    {
      statusId: "api-health-status",
      detailId: "api-health-detail",
      label: "API Health",
    },
    {
      statusId: "security-status",
      detailId: "security-detail",
      label: "Security",
    },
    {
      statusId: "deepseek-status",
      detailId: "deepseek-detail",
      label: "DeepSeek API",
    },
  ];

  cards.forEach(function (card) {
    const statusEl = document.getElementById(card.statusId);
    const detailEl = document.getElementById(card.detailId);

    if (statusEl) {
      statusEl.classList.remove(
        "health-card__value--loading",
        "health-card__value--ok",
        "health-card__value--degraded",
        "health-card__value--error",
      );
      statusEl.textContent = "Unreachable";
      statusEl.classList.add("health-card__value--error");
    }
    if (detailEl) {
      detailEl.textContent = "Backend connection failed";
    }
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _formatTimestamp
   Formats an ISO8601 timestamp to a compact display format.
----------------------------------------------------------------------------- */
function _formatTimestamp(iso) {
  if (!iso) return "";
  try {
    const t = iso.substring(11, 19);
    return t;
  } catch (e) {
    return "";
  }
}

/* -----------------------------------------------------------------------------
   PUBLIC: startSystemDataPolling
   Called by dashboard_system.js when the System module is loaded.
   Starts a 10-second recurring poll of system health data.
----------------------------------------------------------------------------- */
function startSystemDataPolling() {
  if (_systemDataActive) return;
  _systemDataActive = true;

  // Fetch immediately on start
  fetchSystemHealth();

  // Then poll every 10 seconds
  _systemDataPollIntervalId = setInterval(fetchSystemHealth, 10000);
}

/* -----------------------------------------------------------------------------
   PUBLIC: stopSystemDataPolling
   Called by dashboard_system.js when the System module is unloaded or
   the user navigates away. Clears the polling interval.
----------------------------------------------------------------------------- */
function stopSystemDataPolling() {
  _systemDataActive = false;
  if (_systemDataPollIntervalId !== null) {
    clearInterval(_systemDataPollIntervalId);
    _systemDataPollIntervalId = null;
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.fetchSystemHealth = fetchSystemHealth;
window.startSystemDataPolling = startSystemDataPolling;
window.stopSystemDataPolling = stopSystemDataPolling;
