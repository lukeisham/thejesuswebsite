// Trigger:  window.loadModule("news-sources") → dashboard_app.js calls
//           window.renderNewsSources()
// Main:    renderNewsSources() — injects the HTML, sets layout columns,
//           initialises the news sources list display, sidebar handler,
//           and crawler trigger, wires the function bar buttons, and
//           loads the initial news sources list.
// Output:  Fully functional News Sources editor in the Providence work
//          canvas. Errors routed through window.surfaceError().

'use strict';

/* -----------------------------------------------------------------------------
   MODULE STATE — tracked globally so sub-modules can reference active state
----------------------------------------------------------------------------- */
window._newsSourcesModuleState = {
    activeRecordId: null,                 // currently selected record ID
    activeRecordTitle: '',                // currently selected record title
    activeRecordSlug: '',                 // currently selected record slug
    activeSourceUrl: '',                  // current record's news source URL
    activeSearchKeywords: [],             // current record's search keywords (array)
    activeSnippet: '',                    // current record's snippet
    activeMeta: '',                       // current record's metadata JSON
    activeCreatedAt: '',                  // current record's created_at
    activeUpdatedAt: '',                  // current record's updated_at
    newsSourcesRecords: [],               // full list of news source records
};

// Alias for shared tool compatibility (metadata_handler, snippet_generator)
Object.defineProperty(window, '_recordTitle', {
    get: function () { return window._newsSourcesModuleState.activeRecordTitle; },
    configurable: true
});
Object.defineProperty(window, '_recordSlug', {
    get: function () { return window._newsSourcesModuleState.activeRecordSlug; },
    configurable: true
});

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderNewsSources
   Called by dashboard_app.js when the user navigates to the News Sources module.
   1. Requests wider sidebar layout (360px sidebar + 2fr main).
   2. Fetches and injects the News Sources editor HTML into the main column.
   3. Initialises all sub-modules in dependency order.
   4. Wires the function bar action buttons.
   5. Loads the initial news sources list.
----------------------------------------------------------------------------- */
async function renderNewsSources() {

    /* -------------------------------------------------------------------------
       1. SET LAYOUT — Request wider sidebar for the content-heavy record detail
    ------------------------------------------------------------------------- */
    if (typeof window._setLayoutColumns === 'function') {
        window._setLayoutColumns('360px', '2fr');
    }

    /* -------------------------------------------------------------------------
       2. INJECT HTML — Fetch the News Sources editor template and inject it
          into the Providence main column.
    ------------------------------------------------------------------------- */
    try {
        const response = await fetch('/admin/frontend/dashboard_news_sources.html');
        if (!response.ok) {
            throw new Error('Failed to load News Sources editor template (HTTP ' + response.status + ')');
        }
        const html = await response.text();

        if (typeof window._setColumn === 'function') {
            window._setColumn('main', html);
        }
    } catch (err) {
        console.error('[dashboard_news_sources] Template load failed:', err);
        if (typeof window.surfaceError === 'function') {
            window.surfaceError('Error: Unable to load the News Sources editor. Please refresh and try again.');
        }
        return;
    }

    /* -------------------------------------------------------------------------
       3. INITIALISE SUB-MODULES
       Each sub-module exposes a function on window. We call them in dependency
       order after HTML injection so DOM elements are available.
    ------------------------------------------------------------------------- */

    // 3a. Reset module state
    _resetState();

    // 3b. Initialise the sidebar handler (wires keyword chips, URL save, metadata)
    if (typeof window.initNewsSourcesSidebar === 'function') {
        window.initNewsSourcesSidebar();
    }

    // 3c. Initialise the crawler trigger (wires Crawl button)
    if (typeof window.initNewsCrawler === 'function') {
        window.initNewsCrawler();
    }

    // 3d. Load the initial news sources list
    if (typeof window.displayNewsSourcesList === 'function') {
        await window.displayNewsSourcesList();
    }

    /* -------------------------------------------------------------------------
       4. WIRE FUNCTION BAR BUTTONS — Refresh, Publish
       Crawl button is wired by launch_news_crawler.js
    ------------------------------------------------------------------------- */
    _wireActionButtons();

    /* -------------------------------------------------------------------------
       5. INITIALISE SHARED TOOL — Metadata footer
       The metadata_handler.js is loaded globally via dashboard.html.
       We call it here to wire the auto-generate slug button and manage
       read-only display fields within the news-sources-metadata-footer section.
    ------------------------------------------------------------------------- */
    if (typeof window.renderMetadataFooter === 'function') {
        window.renderMetadataFooter('news-sources-metadata-footer', '');
    }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _resetState
   Resets the module state to defaults.
----------------------------------------------------------------------------- */
function _resetState() {
    window._newsSourcesModuleState.activeRecordId = null;
    window._newsSourcesModuleState.activeRecordTitle = '';
    window._newsSourcesModuleState.activeRecordSlug = '';
    window._newsSourcesModuleState.activeSourceUrl = '';
    window._newsSourcesModuleState.activeSearchKeywords = [];
    window._newsSourcesModuleState.activeSnippet = '';
    window._newsSourcesModuleState.activeMeta = '';
    window._newsSourcesModuleState.activeCreatedAt = '';
    window._newsSourcesModuleState.activeUpdatedAt = '';
    window._newsSourcesModuleState.newsSourcesRecords = [];
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireActionButtons
   Binds click handlers to Refresh and Publish buttons in the function bar.
----------------------------------------------------------------------------- */
function _wireActionButtons() {
    const btnRefresh = document.getElementById('btn-news-refresh');
    const btnPublish = document.getElementById('btn-news-publish');

    // Refresh — re-fetch the sources list and set affected records to draft
    if (btnRefresh && typeof window.displayNewsSourcesList === 'function') {
        btnRefresh.addEventListener('click', async function () {
            btnRefresh.disabled = true;
            btnRefresh.textContent = 'Refreshing...';
            try {
                await window.displayNewsSourcesList();
                if (typeof window.surfaceError === 'function') {
                    window.surfaceError('News sources list refreshed. Records set to draft.');
                }
            } catch (err) {
                console.error('[dashboard_news_sources] Refresh failed:', err);
                if (typeof window.surfaceError === 'function') {
                    window.surfaceError('Error: Unable to retrieve news sources list. Please refresh.');
                }
            } finally {
                btnRefresh.disabled = false;
                btnRefresh.textContent = 'Refresh';
            }
        });
    }

    // Publish — commit current source configuration to live
    if (btnPublish && typeof window.publishNewsSources === 'function') {
        btnPublish.addEventListener('click', async function () {
            btnPublish.disabled = true;
            btnPublish.textContent = 'Publishing...';
            try {
                await window.publishNewsSources();
            } finally {
                btnPublish.disabled = false;
                btnPublish.textContent = 'Publish';
            }
        });
    }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_app.js when routing to this module
----------------------------------------------------------------------------- */
window.renderNewsSources = renderNewsSources;
