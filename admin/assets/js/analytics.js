// Admin analytics page logic — sparklines, tables, and stat cards.
// Pure vanilla JS (SR-2/SR-3).  Exported as global "AdminAnalytics".
// Depends on Admin.api.get() for data fetching.

window.AdminAnalytics = {};
const AdminAnalytics = window.AdminAnalytics;

// Current active days value, synced with the chip row.
AdminAnalytics._activeDays = 30;

/* ─────────────────────────────────────────────────────────────────────────────
   Pure helper: compute a sparkline polyline from an array of numeric values
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Compute SVG polyline `points` string from an array of values.
 * @param {number[]} values
 * @param {number} width   viewport width
 * @param {number} height  viewport height
 * @returns {string}  e.g. "0,18.0 25,10.0 50,14.0 75,3.0 100,5.0"
 */
AdminAnalytics.computeSparkline = function (values, width, height) {
  if (!values || values.length === 0) return "";

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = width / (values.length - 1 || 1);

  return values
    .map(function (v, i) {
      const x = (i * stepX).toFixed(1);
      const y = (height - ((v - min) / range) * height).toFixed(1);
      return x + "," + y;
    })
    .join(" ");
};

/* ─────────────────────────────────────────────────────────────────────────────
   Render helpers (internal)
   ───────────────────────────────────────────────────────────────────────────── */

function createSparklineSvg(values) {
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  const width = 120;
  const height = 32;

  svg.setAttribute("class", "analytics-sparkline");
  svg.setAttribute("viewBox", "0 0 " + width + " " + height);
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("aria-hidden", "true");

  const points = AdminAnalytics.computeSparkline(values, width, height);
  if (!points) return svg;

  const polyline = document.createElementNS(svgNs, "polyline");
  polyline.setAttribute("points", points);
  svg.appendChild(polyline);

  return svg;
}

function renderStats(stats, container) {
  if (!stats || !stats.length) {
    container.innerHTML = "";
    return;
  }

  const grid = document.createElement("div");
  grid.className = "analytics-stat-grid";

  stats.forEach(function (s) {
    const card = document.createElement("div");
    card.className = "admin-card admin-card--stat";

    const value = document.createElement("div");
    value.className = "admin-card__stat-value";
    value.textContent = Admin.formatNumber(s.value);

    const label = document.createElement("div");
    label.className = "admin-card__stat-label";
    label.textContent = s.label;

    card.appendChild(value);
    card.appendChild(label);
    grid.appendChild(card);
  });

  container.innerHTML = "";
  container.appendChild(grid);
}

function renderPageViews(rows, container) {
  if (!rows || !rows.length) {
    container.innerHTML =
      '<p class="admin-text--muted">No page-view data available.</p>';
    return;
  }

  // Section wrapper
  const section = document.createElement("div");
  section.className = "analytics-section";

  const title = document.createElement("h3");
  title.className = "analytics-section__title";
  title.textContent = "Page Views";
  section.appendChild(title);

  // Table wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "admin-table-wrapper analytics-table";

  const table = document.createElement("table");
  table.className = "admin-table";

  // Header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  ["Page", "Views", "Unique", "Trend"].forEach(function (label) {
    const th = document.createElement("th");
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");
  rows.forEach(function (row) {
    const tr = document.createElement("tr");

    // Page
    const tdPage = document.createElement("td");
    tdPage.textContent = row.page || row.path || "\u2014";
    tr.appendChild(tdPage);

    // Views
    const tdViews = document.createElement("td");
    tdViews.className = "analytics-table__cell--numeric";
    tdViews.textContent = Admin.formatNumber(row.views || 0);
    tr.appendChild(tdViews);

    // Unique
    const tdUnique = document.createElement("td");
    tdUnique.className = "analytics-table__cell--numeric";
    tdUnique.textContent = Admin.formatNumber(row.unique || row.uniques || 0);
    tr.appendChild(tdUnique);

    // Sparkline
    const tdSpark = document.createElement("td");
    if (row.trend && row.trend.length) {
      tdSpark.appendChild(createSparklineSvg(row.trend));
    } else {
      tdSpark.textContent = "\u2014";
    }
    tr.appendChild(tdSpark);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);
  section.appendChild(wrapper);

  container.innerHTML = "";
  container.appendChild(section);
}

function renderReferrers(rows, container, sectionTitle) {
  if (!rows || !rows.length) {
    container.innerHTML =
      '<p class="admin-text--muted">No referrer data available.</p>';
    return;
  }

  // Section wrapper
  const section = document.createElement("div");
  section.className = "analytics-section";

  const title = document.createElement("h3");
  title.className = "analytics-section__title";
  title.textContent = sectionTitle || "Top Referrers";
  section.appendChild(title);

  // Table wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "admin-table-wrapper analytics-table";

  const table = document.createElement("table");
  table.className = "admin-table";

  // Header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  ["Source", "Visits", "%"].forEach(function (label) {
    const th = document.createElement("th");
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");
  let total = 0;
  rows.forEach(function (r) {
    total += r.count || r.visits || 0;
  });

  rows.forEach(function (row) {
    const tr = document.createElement("tr");

    // Source
    const tdSource = document.createElement("td");
    tdSource.textContent = row.source || row.referrer || "\u2014";
    tr.appendChild(tdSource);

    // Visits
    const tdVisits = document.createElement("td");
    tdVisits.className = "analytics-table__cell--numeric";
    tdVisits.textContent = Admin.formatNumber(row.count || row.visits || 0);
    tr.appendChild(tdVisits);

    // Percentage
    const tdPct = document.createElement("td");
    tdPct.className = "analytics-table__cell--numeric";
    if (total > 0) {
      const pct = (((row.count || row.visits || 0) / total) * 100).toFixed(1);
      tdPct.textContent = pct + "%";
    } else {
      tdPct.textContent = "\u2014";
    }
    tr.appendChild(tdPct);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);
  section.appendChild(wrapper);

  container.innerHTML = "";
  container.appendChild(section);
}

function renderCountries(rows, container) {
  if (!rows || !rows.length) {
    container.innerHTML =
      '<p class="admin-text--muted">No country data available. Import the GeoLite2 Country database to enable geo reporting.</p>';
    return;
  }

  const section = document.createElement("div");
  section.className = "analytics-section";

  const title = document.createElement("h3");
  title.className = "analytics-section__title";
  title.textContent = "Top Countries";
  section.appendChild(title);

  const wrapper = document.createElement("div");
  wrapper.className = "admin-table-wrapper analytics-table";

  const table = document.createElement("table");
  table.className = "admin-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Country", "Views", "%"].forEach(function (label) {
    const th = document.createElement("th");
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  let total = 0;
  rows.forEach(function (r) {
    total += r.count || 0;
  });

  rows.forEach(function (row) {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = row.country || "Unknown";
    tr.appendChild(tdName);

    const tdCount = document.createElement("td");
    tdCount.className = "analytics-table__cell--numeric";
    tdCount.textContent = Admin.formatNumber(row.count || 0);
    tr.appendChild(tdCount);

    const tdPct = document.createElement("td");
    tdPct.className = "analytics-table__cell--numeric";
    if (total > 0) {
      tdPct.textContent = ((row.count / total) * 100).toFixed(1) + "%";
    } else {
      tdPct.textContent = "\u2014";
    }
    tr.appendChild(tdPct);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);
  section.appendChild(wrapper);

  container.innerHTML = "";
  container.appendChild(section);
}

function renderDeviceBreakdown(data, container) {
  if (!data) {
    container.innerHTML =
      '<p class="admin-text--muted">No device data available.</p>';
    return;
  }

  const section = document.createElement("div");
  section.className = "analytics-section";

  const title = document.createElement("h3");
  title.className = "analytics-section__title";
  title.textContent = "Devices";
  section.appendChild(title);

  const wrapper = document.createElement("div");
  wrapper.className = "admin-table-wrapper analytics-table";

  const table = document.createElement("table");
  table.className = "admin-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Category", "Value", "Count", "%"].forEach(function (label) {
    const th = document.createElement("th");
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Flatten all three groups into a single row list with category labels.
  const allRows = [];

  if (data.device_types && data.device_types.length) {
    allRows.push({ _group: "Device Type" });
    data.device_types.forEach(function (d) {
      allRows.push({
        category: "Device Type",
        value: d.type || "Unknown",
        count: d.count,
      });
    });
  }
  if (data.browsers && data.browsers.length) {
    allRows.push({ _group: "Browser" });
    data.browsers.forEach(function (d) {
      allRows.push({
        category: "Browser",
        value: d.name || "Unknown",
        count: d.count,
      });
    });
  }
  if (data.os && data.os.length) {
    allRows.push({ _group: "OS" });
    data.os.forEach(function (d) {
      allRows.push({
        category: "OS",
        value: d.name || "Unknown",
        count: d.count,
      });
    });
  }

  if (!allRows.length) {
    section.appendChild(wrapper);
    wrapper.appendChild(table);
    container.innerHTML = "";
    container.appendChild(section);
    return;
  }

  // Compute the total for percentage (sum of all data rows, not group headers).
  let total = 0;
  allRows.forEach(function (r) {
    if (!r._group) total += r.count || 0;
  });

  const tbody = document.createElement("tbody");
  allRows.forEach(function (row) {
    const tr = document.createElement("tr");

    if (row._group) {
      // Group header row
      const tdGroup = document.createElement("td");
      tdGroup.colSpan = 4;
      tdGroup.className = "analytics-table__group-header";
      tdGroup.textContent = row._group;
      tr.appendChild(tdGroup);
    } else {
      const tdCat = document.createElement("td");
      tdCat.textContent = "";
      tr.appendChild(tdCat);

      const tdVal = document.createElement("td");
      tdVal.textContent = row.value;
      tr.appendChild(tdVal);

      const tdCount = document.createElement("td");
      tdCount.className = "analytics-table__cell--numeric";
      tdCount.textContent = Admin.formatNumber(row.count || 0);
      tr.appendChild(tdCount);

      const tdPct = document.createElement("td");
      tdPct.className = "analytics-table__cell--numeric";
      if (total > 0) {
        tdPct.textContent = ((row.count / total) * 100).toFixed(1) + "%";
      } else {
        tdPct.textContent = "\u2014";
      }
      tr.appendChild(tdPct);
    }

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);
  section.appendChild(wrapper);

  container.innerHTML = "";
  container.appendChild(section);
}

/* ─────────────────────────────────────────────────────────────────────────────
   Public entry point
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Render a table of top search terms from search-engine referrers.
 * Same layout as renderCountries() — columns: Search Term, Visits, %.
 */
function renderSearchTerms(rows, container) {
  if (!rows || !rows.length) {
    container.innerHTML =
      '<p class="admin-text--muted">No search term data available.</p>';
    return;
  }

  const section = document.createElement("div");
  section.className = "analytics-section";

  const title = document.createElement("h3");
  title.className = "analytics-section__title";
  title.textContent = "Search Terms";
  section.appendChild(title);

  const wrapper = document.createElement("div");
  wrapper.className = "admin-table-wrapper analytics-table";

  const table = document.createElement("table");
  table.className = "admin-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Search Term", "Visits", "%"].forEach(function (label) {
    const th = document.createElement("th");
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  let total = 0;
  rows.forEach(function (r) {
    total += r.count || 0;
  });

  rows.forEach(function (row) {
    const tr = document.createElement("tr");

    const tdTerm = document.createElement("td");
    tdTerm.textContent = row.term || "Unknown";
    tr.appendChild(tdTerm);

    const tdCount = document.createElement("td");
    tdCount.className = "analytics-table__cell--numeric";
    tdCount.textContent = Admin.formatNumber(row.count || 0);
    tr.appendChild(tdCount);

    const tdPct = document.createElement("td");
    tdPct.className = "analytics-table__cell--numeric";
    if (total > 0) {
      tdPct.textContent = ((row.count / total) * 100).toFixed(1) + "%";
    } else {
      tdPct.textContent = "\u2014";
    }
    tr.appendChild(tdPct);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);
  section.appendChild(wrapper);

  container.innerHTML = "";
  container.appendChild(section);
}

/**
 * Render bot vs human stats — a compact stat row and a table of top bots.
 */
function renderBotStats(data, container) {
  if (!data) {
    container.innerHTML =
      '<p class="admin-text--muted">Bot stats unavailable.</p>';
    return;
  }

  const section = document.createElement("div");
  section.className = "analytics-section";

  const title = document.createElement("h3");
  title.className = "analytics-section__title";
  title.textContent = "Bot Traffic";
  section.appendChild(title);

  // Compact stat row using textContent (JS-6)
  const statRow = document.createElement("div");
  statRow.className = "analytics-bot-stats";

  const humanLabel = document.createElement("span");
  humanLabel.className = "analytics-bot-stats__label";
  humanLabel.textContent = "Human visits: ";
  statRow.appendChild(humanLabel);

  const humanValue = document.createElement("span");
  humanValue.className = "analytics-bot-stats__value";
  humanValue.textContent = Admin.formatNumber(data.human || 0);
  statRow.appendChild(humanValue);

  const sep = document.createElement("span");
  sep.textContent = "  |  ";
  statRow.appendChild(sep);

  const botLabel = document.createElement("span");
  botLabel.className = "analytics-bot-stats__label";
  botLabel.textContent = "Bot visits: ";
  statRow.appendChild(botLabel);

  const botValue = document.createElement("span");
  botValue.className = "analytics-bot-stats__value";
  botValue.textContent = Admin.formatNumber(data.bot || 0);
  statRow.appendChild(botValue);

  const sep2 = document.createElement("span");
  sep2.textContent = "  |  ";
  statRow.appendChild(sep2);

  const unknownLabel = document.createElement("span");
  unknownLabel.className = "analytics-bot-stats__label";
  unknownLabel.textContent = "Unknown visits: ";
  statRow.appendChild(unknownLabel);

  const unknownValue = document.createElement("span");
  unknownValue.className = "analytics-bot-stats__value";
  unknownValue.textContent = Admin.formatNumber(data.unknown || 0);
  statRow.appendChild(unknownValue);

  section.appendChild(statRow);

  // Bot breakdown table (only if there are bots)
  if (data.bot_breakdown && data.bot_breakdown.length) {
    const wrapper = document.createElement("div");
    wrapper.className = "admin-table-wrapper analytics-table";

    const table = document.createElement("table");
    table.className = "admin-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["Bot", "Visits", "%"].forEach(function (label) {
      const th = document.createElement("th");
      th.textContent = label;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const botTotal = data.bot || 1;
    data.bot_breakdown.forEach(function (row) {
      const tr = document.createElement("tr");

      const tdName = document.createElement("td");
      tdName.textContent = row.name || "Unknown";
      tr.appendChild(tdName);

      const tdCount = document.createElement("td");
      tdCount.className = "analytics-table__cell--numeric";
      tdCount.textContent = Admin.formatNumber(row.count || 0);
      tr.appendChild(tdCount);

      const tdPct = document.createElement("td");
      tdPct.className = "analytics-table__cell--numeric";
      tdPct.textContent = ((row.count / botTotal) * 100).toFixed(1) + "%";
      tr.appendChild(tdPct);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    wrapper.appendChild(table);
    section.appendChild(wrapper);
  }

  container.innerHTML = "";
  container.appendChild(section);
}

/**
 * Render the full analytics page into #analytics-content.
 * Handles loading/error states internally.
 * @param {number} [days]  date range: 7, 30, or 90 (defaults to activeDays)
 */
AdminAnalytics.render = async function (days) {
  days = days || AdminAnalytics._activeDays;

  const container = document.getElementById("analytics-content");
  if (!container) return;

  container.innerHTML =
    '<div class="admin-loading">Loading analytics\u2026</div>';

  try {
    const data = await Admin.api.get("/analytics?days=" + days);
    const since = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Build all sections
    let sectionContainer;

    // Stats cards
    sectionContainer = document.createElement("div");
    container.innerHTML = "";
    container.appendChild(sectionContainer);
    renderStats(data.stats, sectionContainer);

    // Page views
    sectionContainer = document.createElement("div");
    container.appendChild(sectionContainer);
    renderPageViews(data.pageViews, sectionContainer);

    // External referrers
    sectionContainer = document.createElement("div");
    container.appendChild(sectionContainer);
    try {
      const externalReferrers = await Admin.api.get(
        "/analytics/top-referrers?external=true&limit=20",
      );
      renderReferrers(
        externalReferrers,
        sectionContainer,
        "External Referrers",
      );
    } catch {
      sectionContainer.innerHTML =
        '<p class="admin-text--muted">Referrer data unavailable.</p>';
    }

    // Countries (fire-and-forget — renders independently of main payload)
    sectionContainer = document.createElement("div");
    container.appendChild(sectionContainer);
    try {
      const countries = await Admin.api.get(
        "/analytics/top-countries?since=" + encodeURIComponent(since),
      );
      renderCountries(countries, sectionContainer);
    } catch {
      sectionContainer.innerHTML =
        '<p class="admin-text--muted">Country data unavailable.</p>';
    }

    // Device breakdown
    sectionContainer = document.createElement("div");
    container.appendChild(sectionContainer);
    try {
      const devices = await Admin.api.get(
        "/analytics/device-breakdown?since=" + encodeURIComponent(since),
      );
      renderDeviceBreakdown(devices, sectionContainer);
    } catch {
      sectionContainer.innerHTML =
        '<p class="admin-text--muted">Device data unavailable.</p>';
    }

    // Search terms
    sectionContainer = document.createElement("div");
    container.appendChild(sectionContainer);
    try {
      const searchTerms = await Admin.api.get(
        "/analytics/search-terms?since=" + encodeURIComponent(since),
      );
      renderSearchTerms(searchTerms, sectionContainer);
    } catch {
      sectionContainer.innerHTML =
        '<p class="admin-text--muted">Search term data unavailable.</p>';
    }

    // Bot stats
    sectionContainer = document.createElement("div");
    container.appendChild(sectionContainer);
    try {
      const botStats = await Admin.api.get(
        "/analytics/bot-stats?since=" + encodeURIComponent(since),
      );
      renderBotStats(botStats, sectionContainer);
    } catch {
      sectionContainer.innerHTML =
        '<p class="admin-text--muted">Bot stats unavailable.</p>';
    }
  } catch (err) {
    container.innerHTML = "";
    var errorDiv = document.createElement("div");
    errorDiv.className = "admin-error";
    errorDiv.setAttribute("role", "alert");
    errorDiv.textContent = err.message;
    container.appendChild(errorDiv);
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   Chip event delegation
   ───────────────────────────────────────────────────────────────────────────── */

(function initChips() {
  var row = document.querySelector(".analytics-chip-row");
  if (!row) return;

  row.addEventListener("click", function (e) {
    var chip = e.target.closest(".analytics-chip");
    if (!chip) return;

    var days = parseInt(chip.getAttribute("data-days"), 10);
    if (!days) return;

    // Update active state
    var chips = row.querySelectorAll(".analytics-chip");
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.remove("analytics-chip--active");
    }
    chip.classList.add("analytics-chip--active");

    // Track and re-render
    AdminAnalytics._activeDays = days;
    AdminAnalytics.render(days);
  });
})();
