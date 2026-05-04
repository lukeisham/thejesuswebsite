// Trigger:  Called by dashboard_records_single.js orchestrator to load and
//           hydrate the full single-record edit form.
// Main:    fetchAndDisplaySingleRecord(recordId) — GET /api/admin/records/{id},
//           then hydrates every form field across all 7 sections.
// Output:  Fully populated single-record edit form in the Providence main area.

'use strict';

/* =============================================================================
   THE JESUS WEBSITE — DISPLAY SINGLE RECORD DATA
   File:    js/2.0_records/dashboard/display_single_record_data.js
   Version: 1.2.0
   Module:  2.0 — Records
   Purpose: Fetches a single record from GET /api/admin/records/{id} and
            hydrates every field in the single-record editor form across all
            7 sections (Core IDs, Images, Description, Taxonomy, Verses,
            External Refs, Metadata & Status).
============================================================================= */

/* -----------------------------------------------------------------------------
   PUBLIC: fetchAndDisplaySingleRecord
   Fetches the full record data from the API, populates all form fields,
   and initialises all sub-editor components.
----------------------------------------------------------------------------- */
async function fetchAndDisplaySingleRecord(recordId) {
    if (!recordId) {
        _surfaceError('Error: No record ID provided. Unable to load record data.');
        return null;
    }

    try {
        const response = await fetch(`/api/admin/records/${recordId}`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            _surfaceError('Error: Unable to load record data. Please refresh and try again.');
            return null;
        }

        const record = await response.json();

        // --- Hydrate all form sections ---

        // Section 1: Core Identifiers
        _setFieldValue('record-id', record.id || '');
        _setFieldValue('record-title', record.title || '');
        _setFieldValue('record-slug', record.slug || '');

        // Section 2: Images
        _setFieldValue('record-picture-name', record.picture_name || '');
        _hydratePicturePreviews(record.picture_bytes, record.picture_thumbnail);

        // Section 3: Description
        _hydrateDescriptionEditor('description-editor-container', record.description);
        _hydrateDescriptionEditor('snippet-editor-container', record.snippet);

        // Section 4: Taxonomy
        if (typeof window.setTaxonomyValues === 'function') {
            window.setTaxonomyValues({
                era: record.era || '',
                timeline: record.timeline || '',
                gospel_category: record.gospel_category || ''
            });
        }

        // Map fields
        if (typeof window.setMapFieldValues === 'function') {
            window.setMapFieldValues({
                map_label: record.map_label || '',
                geo_id: record.geo_id || ''
            });
        }

        // Section 5: Verses
        if (typeof window.renderVerseBuilder === 'function') {
            window.renderVerseBuilder('primary-verse-container', record.primary_verse);
            window.renderVerseBuilder('secondary-verse-container', record.secondary_verse);
        }

        // Section 6: External References
        if (typeof window.loadEditBibliography === 'function') {
            window.loadEditBibliography(record.bibliography);
        }

        if (typeof window.renderEditLinks === 'function') {
            window.renderEditLinks('context-links-container', record.context_links);
        }

        _setFieldValue('record-parent-id', record.parent_id || '');

        if (typeof window.setExternalRefValues === 'function') {
            window.setExternalRefValues({
                iaa: record.iaa || '',
                pledius: record.pledius || '',
                manuscript: record.manuscript || ''
            });
        }

        if (typeof window.setUrlArrayData === 'function') {
            window.setUrlArrayData(record.url);
        }

        // Section 7: Metadata & Status
        _setFieldValue('record-metadata-json', _formatJson(record.metadata_json));
        _setFieldValue('record-created-at', record.created_at || '');
        _setFieldValue('record-updated-at', record.updated_at || '');

        _setStatusRadio(record.status || 'draft');

        // Store the loaded record data for dirty-checking
        if (typeof window._loadedRecordData !== 'undefined') {
            window._loadedRecordData = record;
        }

        return record;
    } catch (err) {
        console.error('[display_single_record_data] Fetch failed:', err);
        _surfaceError('Error: Unable to load record data. Please refresh and try again.');
        return null;
    }
}

/* -----------------------------------------------------------------------------
   INTERNAL: Set a form field value by element ID
----------------------------------------------------------------------------- */
function _setFieldValue(elementId, value) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (value === null || value === undefined) {
        value = '';
    }

    el.value = value;
}

/* -----------------------------------------------------------------------------
   INTERNAL: Hydrate picture preview containers from base64/blob data
----------------------------------------------------------------------------- */
function _hydratePicturePreviews(pictureBytes, pictureThumbnail) {
    // Full preview
    if (pictureBytes) {
        const fullEl = document.getElementById('picture-preview-full');
        if (fullEl) {
            const dataUrl = _bytesToDataUrl(pictureBytes);
            if (dataUrl) {
                fullEl.innerHTML = `<img src="${_escapeAttr(dataUrl)}" alt="Record picture preview" style="max-width:100%;max-height:100%;object-fit:contain;" />`;
            }
        }
    }

    // Thumbnail preview
    if (pictureThumbnail) {
        const thumbEl = document.getElementById('picture-preview-thumb');
        if (thumbEl) {
            const dataUrl = _bytesToDataUrl(pictureThumbnail);
            if (dataUrl) {
                thumbEl.innerHTML = `<img src="${_escapeAttr(dataUrl)}" alt="Thumbnail preview" style="max-width:100%;max-height:100%;object-fit:contain;" />`;
            }
        }
    }
}

/* -----------------------------------------------------------------------------
   INTERNAL: Convert raw bytes (base64 string or array) to a data URL
----------------------------------------------------------------------------- */
function _bytesToDataUrl(bytes) {
    if (!bytes) return null;

    // If already a data URL or base64 string
    if (typeof bytes === 'string') {
        if (bytes.startsWith('data:image/png')) {
            return bytes;
        }
        return `data:image/png;base64,${bytes}`;
    }

    // If it's an array of byte values (from SQLite BLOB)
    if (Array.isArray(bytes)) {
        try {
            const byteArray = new Uint8Array(bytes);
            let binary = '';
            for (let i = 0; i < byteArray.length; i++) {
                binary += String.fromCharCode(byteArray[i]);
            }
            const base64 = btoa(binary);
            return `data:image/png;base64,${base64}`;
        } catch (e) {
            console.warn('[display_single_record_data] Failed to convert bytes array:', e);
            return null;
        }
    }

    return null;
}

/* -----------------------------------------------------------------------------
   INTERNAL: Hydrate description/snippet paragraph editors
----------------------------------------------------------------------------- */
function _hydrateDescriptionEditor(containerId, data) {
    if (typeof window.renderDescriptionEditor !== 'function') return;

    let paragraphs = [];

    if (typeof data === 'string') {
        try {
            paragraphs = JSON.parse(data);
        } catch (e) {
            // If not valid JSON, treat as single paragraph
            paragraphs = data ? [data] : [];
        }
    } else if (Array.isArray(data)) {
        paragraphs = data;
    }

    window.renderDescriptionEditor(containerId, paragraphs);
}

/* -----------------------------------------------------------------------------
   INTERNAL: Set the status radio button
----------------------------------------------------------------------------- */
function _setStatusRadio(status) {
    const draftRadio = document.getElementById('record-status-draft');
    const publishedRadio = document.getElementById('record-status-published');

    if (draftRadio && status === 'draft') {
        draftRadio.checked = true;
    } else if (publishedRadio && status === 'published') {
        publishedRadio.checked = true;
    }
}

/* -----------------------------------------------------------------------------
   INTERNAL: Format JSON for display
----------------------------------------------------------------------------- */
function _formatJson(value) {
    if (!value) return '';
    if (typeof value === 'string') {
        try {
            return JSON.stringify(JSON.parse(value), null, 2);
        } catch (e) {
            return value;
        }
    }
    try {
        return JSON.stringify(value, null, 2);
    } catch (e) {
        return String(value);
    }
}

/* -----------------------------------------------------------------------------
   INTERNAL: Escape HTML attribute value
----------------------------------------------------------------------------- */
function _escapeAttr(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/* -----------------------------------------------------------------------------
   INTERNAL: Surface an error through the shared error handler
----------------------------------------------------------------------------- */
function _surfaceError(message) {
    if (typeof window.surfaceError === 'function') {
        window.surfaceError(message);
    } else {
        console.error('[display_single_record_data]', message);
    }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.fetchAndDisplaySingleRecord = fetchAndDisplaySingleRecord;
