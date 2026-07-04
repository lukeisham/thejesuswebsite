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

function renderReferrers(rows, container) {
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
  title.textContent = "Top Referrers";
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

/* ─────────────────────────────────────────────────────────────────────────────
   Public entry point
   ───────────────────────────────────────────────────────────────────────────── */

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

    // Build all three sections
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

    // Referrers
    sectionContainer = document.createElement("div");
    container.appendChild(sectionContainer);
    renderReferrers(data.referrers, sectionContainer);
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
