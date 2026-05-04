// Trigger: Called by the single-record dashboard orchestrator after the record form is rendered.
// Main:    renderTaxonomySelectors(containerId) — populates three taxonomy <select> dropdowns.
// Output:  Populated select elements; setTaxonomyValues(data) / collectTaxonomy() for read/write.

'use strict';

/* =============================================================================
   TAXONOMY SELECTOR
   File:    js/2.0_records/dashboard/taxonomy_selector.js
   Version: 1.0.0
   Owner:   plan_dashboard_records_single (2.0 Records Module)
   Trigger: Consumer dashboard pages call window.renderTaxonomySelectors(containerId)
            to populate the era, timeline, and gospel_category select fields.
   Main:    renderTaxonomySelectors(containerId) — injects <option> elements into
            #record-era, #record-timeline, #record-gospel-category.
   Output:  Three populated <select> elements; setTaxonomyValues(data) for hydration
            and collectTaxonomy() for reading current selections.
============================================================================= */

/* -----------------------------------------------------------------------------
   CONSTANTS — valid taxonomy values
----------------------------------------------------------------------------- */

const ERA_VALUES = [
    'PreIncarnation',
    'OldTestament',
    'EarlyLife',
    'Life',
    'GalileeMinistry',
    'JudeanMinistry',
    'PassionWeek',
    'Post-Passion'
];

const TIMELINE_VALUES = [
    'PreIncarnation',
    'OldTestament',
    'EarlyLifeUnborn',
    'EarlyLifeBirth',
    'EarlyLifeInfancy',
    'EarlyLifeChildhood',
    'LifeTradie',
    'LifeBaptism',
    'LifeTemptation',
    'GalileeCallingTwelve',
    'GalileeSermonMount',
    'GalileeMiraclesSea',
    'GalileeTransfiguration',
    'JudeanOutsideJudea',
    'JudeanMissionSeventy',
    'JudeanTeachingTemple',
    'JudeanRaisingLazarus',
    'JudeanFinalJourney',
    'PassionPalmSunday',
    'PassionMondayCleansing',
    'PassionTuesdayTeaching',
    'PassionWednesdaySilent',
    'PassionMaundyThursday',
    'PassionMaundyLastSupper',
    'PassionMaundyGethsemane',
    'PassionMaundyBetrayal',
    'PassionFridaySanhedrin',
    'PassionFridayCivilTrials',
    'PassionFridayCrucifixionBegins',
    'PassionFridayDarkness',
    'PassionFridayDeath',
    'PassionFridayBurial',
    'PassionSaturdayWatch',
    'PassionSundayResurrection',
    'PostResurrectionAppearances',
    'Ascension',
    'OurResponse',
    'ReturnOfJesus'
];

const GOSPEL_CATEGORY_VALUES = [
    'event',
    'location',
    'person',
    'theme',
    'object'
];

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderTaxonomySelectors
   Injects <option> elements into the three taxonomy select dropdowns.

   Parameters:
     containerId (string) — DOM element ID of the container wrapping the selects.
----------------------------------------------------------------------------- */
function renderTaxonomySelectors(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        _taxonomyError('taxonomy container not found');
        return;
    }

    const eraSelect    = document.getElementById('record-era');
    const timelineSelect = document.getElementById('record-timeline');
    const gospelSelect = document.getElementById('record-gospel-category');

    if (eraSelect) {
        _populateSelect(eraSelect, ERA_VALUES);
    }

    if (timelineSelect) {
        _populateSelect(timelineSelect, TIMELINE_VALUES);
    }

    if (gospelSelect) {
        _populateSelect(gospelSelect, GOSPEL_CATEGORY_VALUES);
    }
}

/* -----------------------------------------------------------------------------
   PUBLIC FUNCTION: setTaxonomyValues
   Sets the selected values on all three taxonomy select dropdowns.

   Parameters:
     data (object) — { era: string, timeline: string, gospel_category: string }
----------------------------------------------------------------------------- */
function setTaxonomyValues(data) {
    if (!data) { return; }

    if (data.era !== undefined) {
        const eraSelect = document.getElementById('record-era');
        if (eraSelect) { eraSelect.value = data.era; }
    }

    if (data.timeline !== undefined) {
        const timelineSelect = document.getElementById('record-timeline');
        if (timelineSelect) { timelineSelect.value = data.timeline; }
    }

    if (data.gospel_category !== undefined) {
        const gospelSelect = document.getElementById('record-gospel-category');
        if (gospelSelect) { gospelSelect.value = data.gospel_category; }
    }
}

/* -----------------------------------------------------------------------------
   PUBLIC FUNCTION: collectTaxonomy
   Reads the current selected values from all three taxonomy selects.

   Returns:
     { era: string, timeline: string, gospel_category: string }
----------------------------------------------------------------------------- */
function collectTaxonomy() {
    const eraSelect    = document.getElementById('record-era');
    const timelineSelect = document.getElementById('record-timeline');
    const gospelSelect = document.getElementById('record-gospel-category');

    return {
        era:             eraSelect ? eraSelect.value : '',
        timeline:        timelineSelect ? timelineSelect.value : '',
        gospel_category: gospelSelect ? gospelSelect.value : ''
    };
}

/* =============================================================================
   INTERNAL HELPERS
============================================================================= */

/* -----------------------------------------------------------------------------
   INTERNAL: _populateSelect
   Clears and repopulates a <select> element with an array of option values.
   Each value is used as both the option value and its display label.

   Parameters:
     selectEl (HTMLElement) — the <select> element to populate
     values   (Array)       — array of string values for the <option> elements
----------------------------------------------------------------------------- */
function _populateSelect(selectEl, values) {
    // Preserve any existing non-option children (e.g. a default placeholder)
    selectEl.innerHTML = '';

    values.forEach(function (val) {
        const option = document.createElement('option');
        option.value = val;
        option.textContent = val;
        selectEl.appendChild(option);
    });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _taxonomyError
   Routes an error message through window.surfaceError(), interpolating the
   current record title from window._recordTitle.

   Parameters:
     context (string) — short description of what failed
----------------------------------------------------------------------------- */
function _taxonomyError(context) {
    if (typeof window.surfaceError !== 'function') {
        console.error(`[taxonomy_selector] ${context}`);
        return;
    }

    const title = (typeof window._recordTitle !== 'undefined')
        ? window._recordTitle
        : '';

    window.surfaceError(
        `Error: Failed to save taxonomy fields for '${title}'.`
    );
}

/* =============================================================================
   GLOBAL EXPOSURE — public API contract for orchestration
============================================================================= */
window.renderTaxonomySelectors = renderTaxonomySelectors;
window.setTaxonomyValues      = setTaxonomyValues;
window.collectTaxonomy        = collectTaxonomy;
