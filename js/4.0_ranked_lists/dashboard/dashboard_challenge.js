// Trigger:  window.loadModule("challenge") → dashboard_app.js calls
//           window.renderChallenge()
// Main:    renderChallenge() — injects the challenge editor HTML, sets the
//           Providence canvas layout, initialises the weighting handler, list
//           display, ranking calculator, and insert response handler, wires the
//           Academic/Popular toggle, and loads the initial challenge list.
// Output:  Fully functional Challenge dashboard editor in the Providence work
//          canvas. Errors routed through window.surfaceError().

'use strict';

/* -----------------------------------------------------------------------------
   MODULE STATE — tracked globally so sub-modules can reference active state
----------------------------------------------------------------------------- */
window._challengeModuleState = {
    mode: 'academic',                     // 'academic' | 'popular'
    activeRecordId: null,                 // currently selected record ID (slug)
    activeRecordTitle: '',                // currently selected record title
    activeRecordSlug: '',                 // currently selected record slug
    challenges: [],                       // full list of challenge records
    weightingCriteria: [],                // active weighting criteria
};

// Alias for shared tool compatibility (metadata_handler expects this)
Object.defineProperty(window, '_recordTitle', {
    get: function () { return window._challengeModuleState.activeRecordTitle; },
    configurable: true
});

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderChallenge
   Called by dashboard_app.js when the user navigates to the Challenge module.
   1. Sets the Providence canvas layout (full-width, no sidebar).
   2. Fetches and injects the challenge editor HTML into the main column.
   3. Initialises all sub-modules in dependency order.
   4. Wires the Academic/Popular toggle buttons and action bar.
   5. Loads the initial challenge list.
----------------------------------------------------------------------------- */
async function renderChallenge() {

    /* -------------------------------------------------------------------------
       1. SET LAYOUT — We use our own internal split-pane, so collapse the
          Providence sidebar and use the full main column.
    ------------------------------------------------------------------------- */
    if (typeof window._setLayoutColumns === 'function') {
        window._setLayoutColumns(false, '1fr');
    }

    /* -------------------------------------------------------------------------
       2. INJECT HTML — Fetch the challenge editor template and inject it
          into the Providence main column.
    ------------------------------------------------------------------------- */
    try {
        const response = await fetch('/admin/frontend/dashboard_challenge.html');
        if (!response.ok) {
            throw new Error('Failed to load challenge editor template (HTTP ' + response.status + ')');
        }
        const html = await response.text();

        if (typeof window._setColumn === 'function') {
            window._setColumn('main', html);
        }
    } catch (err) {
        console.error('[dashboard_challenge] Template load failed:', err);
        if (typeof window.surfaceError === 'function') {
            window.surfaceError('Error: Unable to load the Challenge editor. Please refresh and try again.');
        }
        return;
    }

    /* -------------------------------------------------------------------------
       3. INITIALISE SUB-MODULES
       Each sub-module exposes a function on window. We call them in dependency
       order after HTML injection so DOM elements are available.
    ------------------------------------------------------------------------- */

    // 3a. Set initial mode to academic
    window._challengeModuleState.mode = 'academic';
    window._challengeModuleState.activeRecordId = null;
    window._challengeModuleState.activeRecordTitle = '';
    window._challengeModuleState.activeRecordSlug = '';

    // 3b. Initialise the weighting handler (sidebar)
    if (typeof window.initChallengeWeighting === 'function') {
        window.initChallengeWeighting();
    }

    // 3c. Load the initial challenge list for the default mode
    if (typeof window.displayChallengeList === 'function') {
        await window.displayChallengeList('academic');
    }

    // 3d. Initialise insert response handler
    if (typeof window.initInsertChallengeResponse === 'function') {
        window.initInsertChallengeResponse();
    }

    /* -------------------------------------------------------------------------
       4. WIRE TOGGLE BUTTONS — Academic / Popular switch
    ------------------------------------------------------------------------- */
    _wireToggleButtons();

    /* -------------------------------------------------------------------------
       5. WIRE ACTION BAR BUTTONS — Refresh, Publish, Agent Search, Insert Response
    ------------------------------------------------------------------------- */
    _wireActionButtons();

    /* -------------------------------------------------------------------------
       6. INITIALISE SHARED TOOLS — Metadata footer
       The metadata_handler.js is loaded globally via dashboard.html.
    ------------------------------------------------------------------------- */
    if (typeof window.renderMetadataFooter === 'function') {
        window.renderMetadataFooter('challenge-metadata-container', '');
    }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireToggleButtons
   Binds click handlers to the Academic and Popular toggle buttons.
   Switches the active mode, reloads the challenge list, resets the weighting
   sidebar, and updates search term labels.
----------------------------------------------------------------------------- */
function _wireToggleButtons() {
    const btnAcademic = document.getElementById('btn-toggle-academic');
    const btnPopular = document.getElementById('btn-toggle-popular');

    if (!btnAcademic || !btnPopular) return;

    btnAcademic.addEventListener('click', async function () {
        if (window._challengeModuleState.mode === 'academic') return;

        window._challengeModuleState.mode = 'academic';
        window._challengeModuleState.activeRecordId = null;
        window._challengeModuleState.activeRecordTitle = '';
        window._challengeModuleState.activeRecordSlug = '';

        btnAcademic.classList.add('btn--toggle-active');
        btnAcademic.setAttribute('aria-pressed', 'true');
        btnPopular.classList.remove('btn--toggle-active');
        btnPopular.setAttribute('aria-pressed', 'false');

        // Update search terms label
        const labelEl = document.getElementById('challenge-search-terms-field-label');
        if (labelEl) labelEl.textContent = 'Academic';

        // Reload weighting criteria from the first record's weights
        if (typeof window.reloadChallengeWeighting === 'function') {
            window.reloadChallengeWeighting('academic');
        }

        // Reload challenge list
        if (typeof window.displayChallengeList === 'function') {
            await window.displayChallengeList('academic');
        }
    });

    btnPopular.addEventListener('click', async function () {
        if (window._challengeModuleState.mode === 'popular') return;

        window._challengeModuleState.mode = 'popular';
        window._challengeModuleState.activeRecordId = null;
        window._challengeModuleState.activeRecordTitle = '';
        window._challengeModuleState.activeRecordSlug = '';

        btnPopular.classList.add('btn--toggle-active');
        btnPopular.setAttribute('aria-pressed', 'true');
        btnAcademic.classList.remove('btn--toggle-active');
        btnAcademic.setAttribute('aria-pressed', 'false');

        // Update search terms label
        const labelEl = document.getElementById('challenge-search-terms-field-label');
        if (labelEl) labelEl.textContent = 'Popular';

        // Reload weighting criteria from the first record's weights
        if (typeof window.reloadChallengeWeighting === 'function') {
            window.reloadChallengeWeighting('popular');
        }

        // Reload challenge list
        if (typeof window.displayChallengeList === 'function') {
            await window.displayChallengeList('popular');
        }
    });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireActionButtons
   Binds click handlers to Refresh, Publish, Agent Search, and Insert Response
   buttons in the function bar.
----------------------------------------------------------------------------- */
function _wireActionButtons() {
    const btnRefresh = document.getElementById('btn-challenge-refresh');
    const btnPublish = document.getElementById('btn-challenge-publish');
    const btnAgentSearch = document.getElementById('btn-challenge-agent-search');
    const btnInsertResponse = document.getElementById('btn-challenge-insert-response');

    // Refresh — recalculate rankings
    if (btnRefresh && typeof window.refreshChallengeRankings === 'function') {
        btnRefresh.addEventListener('click', async function () {
            btnRefresh.disabled = true;
            btnRefresh.textContent = 'Refreshing...';
            try {
                await window.refreshChallengeRankings();
            } finally {
                btnRefresh.disabled = false;
                btnRefresh.textContent = 'Refresh';
            }
        });
    }

    // Publish — commit ranked order to live site
    if (btnPublish && typeof window.publishChallengeRankings === 'function') {
        btnPublish.addEventListener('click', async function () {
            btnPublish.disabled = true;
            btnPublish.textContent = 'Publishing...';
            try {
                await window.publishChallengeRankings();
            } finally {
                btnPublish.disabled = false;
                btnPublish.textContent = 'Publish';
            }
        });
    }

    // Agent Search — trigger pipeline for selected record
    if (btnAgentSearch && typeof window.triggerAgentSearch === 'function') {
        btnAgentSearch.addEventListener('click', async function () {
            btnAgentSearch.disabled = true;
            btnAgentSearch.textContent = 'Searching...';
            try {
                await window.triggerAgentSearch();
            } finally {
                btnAgentSearch.disabled = false;
                btnAgentSearch.textContent = 'Agent Search';
            }
        });
    }

    // Insert Response — create new response linked to selected challenge
    if (btnInsertResponse && typeof window.insertChallengeResponse === 'function') {
        btnInsertResponse.addEventListener('click', function () {
            window.insertChallengeResponse();
        });
    }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_app.js when routing to this module
----------------------------------------------------------------------------- */
window.renderChallenge = renderChallenge;
