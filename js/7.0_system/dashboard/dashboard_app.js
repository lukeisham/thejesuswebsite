/* =============================================================================
   THE JESUS WEBSITE — DASHBOARD APP CORE (Module Router)
   File:    js/7.0_system/dashboard/dashboard_app.js
   Version: 1.1.0
   Trigger: window.loadModule(moduleName) is called by card clicks, tab clicks,
            and the dashboard orchestrator's default module load.
   Main:    loadModule(moduleName) — hides the card grid, shows the Providence
            2-column canvas (sidebar + main), clears columns, resets widths,
            updates the module tab bar, and routes to the correct module
            render function.
   Output:  Active module rendered in the Providence canvas. _setLayoutColumns()
            exposed globally so all edit modules can set per-module sidebar
            and main-area widths. _setColumn() lets modules populate individual
            columns without destroying the column element.
============================================================================= */

/* -----------------------------------------------------------------------------
   MODULE REGISTRY — maps module name to canonical render function name.
   Render functions are defined in each module's own edit JS file and must
   be globally accessible (on window). If a render function is not found,
   a placeholder "Module not yet implemented" message is shown.
----------------------------------------------------------------------------- */
const MODULE_RENDERERS = {
  "records-all": "renderRecordsAll",
  "records-single": "renderRecordsSingle",
  arbor: "renderArbor",
  wikipedia: "renderWikipedia",
  challenge: "renderChallenge",
  "challenge-response": "renderChallengeResponse",
  "essay-historiography": "renderEssayHistoriography",
  "news-sources": "renderNewsSources",
  "blog-posts": "renderBlogPosts",
  system: "renderSystem",
};

/* Human-readable names for the tab bar */
const MODULE_LABELS = {
  "records-all": "All Records",
  "records-single": "Single Record",
  arbor: "Arbor",
  wikipedia: "Wikipedia",
  challenge: "Challenges",
  "challenge-response": "Challenge Resp.",
  "essay-historiography": "Essay & Hist.",
  "news-sources": "News Sources",
  "blog-posts": "Blog Posts",
  system: "System",
};

/* Track which modules have open tabs */
let _openTabs = [];

/* Currently active module */
let _activeModule = null;

/* =============================================================================
   PUBLIC: loadModule
   Entry point for all module navigation. Called by card clicks, tab clicks,
   and the orchestrator's default load.
============================================================================= */
function loadModule(moduleName) {
  if (!MODULE_RENDERERS.hasOwnProperty(moduleName)) {
    console.warn(`[dashboard_app] Unknown module: "${moduleName}"`);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(`Unknown module: ${moduleName}`);
    }
    return;
  }

  // Switch from cards view to canvas view
  _showCanvas();

  // Clear all columns and reset grid widths to defaults
  _clearColumns();

  // Add tab if not already open
  _addTab(moduleName);

  // Set active tab
  _setActiveTab(moduleName);
  _activeModule = moduleName;

  // Route to the module render function
  const renderFnName = MODULE_RENDERERS[moduleName];
  const renderFn = window[renderFnName];

  if (typeof renderFn === "function") {
    try {
      renderFn();
    } catch (err) {
      console.error(
        `[dashboard_app] Error rendering module "${moduleName}":`,
        err,
      );
      if (typeof window.surfaceError === "function") {
        window.surfaceError(`Failed to load module: ${moduleName}`);
      }
      _setColumn(
        "main",
        `<p class="state-error">Error loading ${MODULE_LABELS[moduleName]}. See console for details.</p>`,
      );
    }
  } else {
    // Module not yet implemented — show placeholder in the main area
    _setColumn(
      "main",
      `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: var(--space-3);">
                <p style="font-family: var(--font-heading); font-size: var(--text-lg); color: var(--color-text-secondary);">
                    ${MODULE_LABELS[moduleName]}
                </p>
                <p style="font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-muted);">
                    Module not yet implemented
                </p>
            </div>
        `,
    );
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        `Module "${MODULE_LABELS[moduleName]}" is not yet implemented`,
      );
    }
  }
}

/* =============================================================================
   PUBLIC: _setLayoutColumns
   Overrides the Providence grid column widths for the currently loaded module.
   Called by individual module render functions at the top of their render.
   Exposed globally as window._setLayoutColumns.

   Two call signatures:

   1. Positional (two strings):
        _setLayoutColumns('360px', '2fr')   // wider sidebar + wider main
        _setLayoutColumns('280px', '1fr')   // explicit defaults
        _setLayoutColumns()                  // reset to defaults

   2. No-sidebar shortcut (first arg is false/null):
        _setLayoutColumns(false, '1fr')     // no sidebar, full-width main
        _setLayoutColumns(false)             // no sidebar, main = default 1fr
        _setLayoutColumns(null)              // same - no sidebar
        _setLayoutColumns('0px', '1fr')      // also works (legacy)

   Defaults on reset: sidebar 280px, main 1fr.
============================================================================= */
function _setLayoutColumns(sidebarWidth, mainWidth) {
  const canvas = document.getElementById("admin-canvas");
  if (!canvas) return;

  const divider = document.getElementById("providence-divider");

  // Detect 'no sidebar' request: false, null, '0px', or '0'
  const noSidebar =
    sidebarWidth !== undefined &&
    sidebarWidth !== null &&
    (sidebarWidth === false || sidebarWidth === "0px" || sidebarWidth === "0");

  if (noSidebar) {
    // Collapse sidebar, divider, and gap - main area goes full width
    canvas.style.setProperty("--sidebar-width", "0px");
    canvas.style.setProperty("--main-width", mainWidth || "1fr");
    canvas.style.gridTemplateColumns = "0px 0px 0px " + (mainWidth || "1fr");
    if (divider) divider.style.display = "none";
    canvas.classList.add("no-sidebar");
    return;
  }

  // Normal sidebar case - apply overrides or remove for defaults
  canvas.classList.remove("no-sidebar");
  if (divider) divider.style.display = "";
  canvas.style.gridTemplateColumns = "";

  if (sidebarWidth !== undefined && sidebarWidth !== null) {
    canvas.style.setProperty("--sidebar-width", sidebarWidth);
  } else {
    canvas.style.removeProperty("--sidebar-width");
  }

  if (mainWidth !== undefined && mainWidth !== null) {
    canvas.style.setProperty("--main-width", mainWidth);
  } else {
    canvas.style.removeProperty("--main-width");
  }
}

/* =============================================================================
   PUBLIC: _setColumn
   Injects HTML content into a named Providence column. Uses insertAdjacentHTML
   so the column element itself is never destroyed or replaced.

   Parameters:
     colName — one of 'sidebar', 'main'
     html    — HTML string to inject
============================================================================= */
function _setColumn(colName, html) {
  const columnMap = {
    sidebar: "providence-col-sidebar",
    main: "providence-col-main",
  };

  const colId = columnMap[colName];
  if (!colId) {
    console.warn(`[dashboard_app] _setColumn: unknown column "${colName}"`);
    return;
  }

  const colEl = document.getElementById(colId);
  if (!colEl) {
    console.warn(
      `[dashboard_app] _setColumn: column element #${colId} not found`,
    );
    return;
  }

  // Clear and inject — column element persists
  colEl.innerHTML = "";
  colEl.insertAdjacentHTML("beforeend", html);
}

/* =============================================================================
   INTERNAL: _clearColumns
   Resets both Providence columns to empty content and restores default
   grid widths (sidebar 280px, main 1fr). Also unhides the divider if it
   was hidden by a previous no-sidebar module.
============================================================================= */
function _clearColumns() {
  const canvas = document.getElementById("admin-canvas");
  if (canvas) {
    canvas.style.removeProperty("--sidebar-width");
    canvas.style.removeProperty("--main-width");
    // Restore default grid template
    canvas.style.gridTemplateColumns = "";
  }

  // Unhide divider if a previous module collapsed it
  const divider = document.getElementById("providence-divider");
  if (divider) {
    divider.style.display = "";
  }

  // Clear column content
  _setColumn("sidebar", "");
  _setColumn("main", "");

  // Clear any loading state
  if (canvas) {
    canvas.classList.remove("is-loading");
  }
}

/* =============================================================================
   INTERNAL: _showCanvas
   Hides the card grid and reveals the Providence 2-column work canvas.
============================================================================= */
function _showCanvas() {
  const cardsEl = document.getElementById("admin-cards");
  const canvasEl = document.getElementById("admin-canvas");

  if (cardsEl) {
    cardsEl.classList.add("is-hidden");
  }
  if (canvasEl) {
    canvasEl.style.display = "grid";
  }
}

/* =============================================================================
   INTERNAL: _showCards
   Hides the canvas and reveals the card grid — used when returning to the
   dashboard landing view (e.g. clicking the Dashboard tab).
============================================================================= */
function _showCards() {
  const cardsEl = document.getElementById("admin-cards");
  const canvasEl = document.getElementById("admin-canvas");

  if (canvasEl) {
    canvasEl.style.display = "none";
  }
  if (cardsEl) {
    cardsEl.classList.remove("is-hidden");
  }

  // Clear all tabs
  _openTabs = [];
  _activeModule = null;
  _renderTabBar();
}

/* =============================================================================
   INTERNAL: Tab management
============================================================================= */

function _addTab(moduleName) {
  if (!_openTabs.includes(moduleName)) {
    _openTabs.push(moduleName);
  }
  _renderTabBar();
}

function _setActiveTab(moduleName) {
  _activeModule = moduleName;
  _renderTabBar();
}

function _closeTab(moduleName) {
  _openTabs = _openTabs.filter((t) => t !== moduleName);

  // If closing the active tab, activate the last remaining tab
  if (_activeModule === moduleName) {
    if (_openTabs.length > 0) {
      loadModule(_openTabs[_openTabs.length - 1]);
    } else {
      _showCards();
    }
  } else {
    _renderTabBar();
  }
}

function _renderTabBar() {
  const tabBar = document.getElementById("module-tab-bar");
  if (!tabBar) return;

  tabBar.innerHTML = "";

  _openTabs.forEach((moduleName) => {
    const label = MODULE_LABELS[moduleName] || moduleName;
    const isActive = moduleName === _activeModule;

    const tabEl = document.createElement("button");
    tabEl.className = "module-tab" + (isActive ? " is-active" : "");
    tabEl.setAttribute("role", "tab");
    tabEl.setAttribute("aria-selected", isActive ? "true" : "false");
    tabEl.setAttribute("title", `Switch to ${label}`);

    tabEl.innerHTML = `
            <span class="module-tab__label">${label}</span>
            <span class="module-tab__close" title="Close ${label}">×</span>
        `;

    // Tab click — switch to this module
    tabEl.querySelector(".module-tab__label").addEventListener("click", (e) => {
      e.stopPropagation();
      loadModule(moduleName);
    });

    // Close button — remove tab
    tabEl.querySelector(".module-tab__close").addEventListener("click", (e) => {
      e.stopPropagation();
      _closeTab(moduleName);
    });

    tabBar.appendChild(tabEl);
  });
}

/* =============================================================================
   GLOBAL EXPOSURE
   Expose public API on window so all dashboard modules and card components
   can access without importing.

   API surface:
     window.loadModule(moduleName)
     window._setLayoutColumns(sidebarWidth, mainWidth)
     window._setColumn(colName, html)
       — colName: 'sidebar' | 'main'
============================================================================= */
window.loadModule = loadModule;
window._setLayoutColumns = _setLayoutColumns;
window._setColumn = _setColumn;
