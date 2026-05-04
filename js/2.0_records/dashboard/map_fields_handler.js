// Trigger: Called by the single-record dashboard orchestrator after the record form is rendered.
// Main:    renderMapFields(containerId) — populates the map_label <select> and wires geo_id integer input.
// Output:  Populated map_label select and geo_id input; setMapFieldValues(data) / collectMapFields() for read/write.

'use strict';

/* =============================================================================
   MAP FIELDS HANDLER
   File:    js/2.0_records/dashboard/map_fields_handler.js
   Version: 1.0.0
   Owner:   plan_dashboard_records_single (2.0 Records Module)
   Trigger: Consumer dashboard pages call window.renderMapFields(containerId)
            to populate the map_label dropdown and configure the geo_id input.
   Main:    renderMapFields(containerId) — injects <option> elements into
            #record-map-label and ensures #record-geo-id is an integer input.
   Output:  Configured map label select and geo_id integer input;
            setMapFieldValues(data) for hydration and collectMapFields() for reading.
============================================================================= */

/* -----------------------------------------------------------------------------
   CONSTANTS — valid map label values
----------------------------------------------------------------------------- */

const MAP_LABEL_VALUES = [
    'Overview',
    'Empire',
    'Levant',
    'Judea',
    'Galilee',
    'Jerusalem'
];

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderMapFields
   Populates the #record-map-label select with map label options and ensures
   #record-geo-id is configured as an integer input.

   Parameters:
     containerId (string) — DOM element ID of the container wrapping the fields.
----------------------------------------------------------------------------- */
function renderMapFields(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        _mapFieldsError('map fields container not found');
        return;
    }

    /* -------------------------------------------------------------------------
       1. POPULATE MAP LABEL SELECT
    ------------------------------------------------------------------------- */
    const mapLabelSelect = document.getElementById('record-map-label');
    if (mapLabelSelect) {
        _populateSelect(mapLabelSelect, MAP_LABEL_VALUES);
    }

    /* -------------------------------------------------------------------------
       2. ENSURE GEO ID IS CONFIGURED AS INTEGER INPUT
       The input is expected to already exist in the HTML with id="record-geo-id".
       We enforce type="number" and step="1" for integer-only entry.
    ------------------------------------------------------------------------- */
    const geoIdInput = document.getElementById('record-geo-id');
    if (geoIdInput) {
        geoIdInput.type = 'number';
        geoIdInput.step = '1';
        geoIdInput.min  = '0';
        geoIdInput.setAttribute('inputmode', 'numeric');
    }
}

/* -----------------------------------------------------------------------------
   PUBLIC FUNCTION: setMapFieldValues
   Sets the values of the map label select and geo_id input.

   Parameters:
     data (object) — { map_label: string, geo_id: (number|string) }
----------------------------------------------------------------------------- */
function setMapFieldValues(data) {
    if (!data) { return; }

    if (data.map_label !== undefined) {
        const mapLabelSelect = document.getElementById('record-map-label');
        if (mapLabelSelect) { mapLabelSelect.value = data.map_label; }
    }

    if (data.geo_id !== undefined) {
        const geoIdInput = document.getElementById('record-geo-id');
        if (geoIdInput) { geoIdInput.value = data.geo_id; }
    }
}

/* -----------------------------------------------------------------------------
   PUBLIC FUNCTION: collectMapFields
   Reads the current values of the map label select and geo_id input.

   Returns:
     { map_label: string, geo_id: number|null }
----------------------------------------------------------------------------- */
function collectMapFields() {
    const mapLabelSelect = document.getElementById('record-map-label');
    const geoIdInput     = document.getElementById('record-geo-id');

    const geoIdRaw = geoIdInput ? geoIdInput.value.trim() : '';
    const geoId    = (geoIdRaw !== '') ? parseInt(geoIdRaw, 10) : null;

    return {
        map_label: mapLabelSelect ? mapLabelSelect.value : '',
        geo_id:    (geoId !== null && !isNaN(geoId)) ? geoId : null
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
    selectEl.innerHTML = '';

    values.forEach(function (val) {
        const option = document.createElement('option');
        option.value = val;
        option.textContent = val;
        selectEl.appendChild(option);
    });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _mapFieldsError
   Routes any error through window.surfaceError().

   Parameters:
     context (string) — short description of what failed
----------------------------------------------------------------------------- */
function _mapFieldsError(context) {
    if (typeof window.surfaceError !== 'function') {
        console.error(`[map_fields_handler] ${context}`);
        return;
    }

    window.surfaceError(context);
}

/* =============================================================================
   GLOBAL EXPOSURE — public API contract for orchestration
============================================================================= */
window.renderMapFields    = renderMapFields;
window.setMapFieldValues  = setMapFieldValues;
window.collectMapFields   = collectMapFields;
