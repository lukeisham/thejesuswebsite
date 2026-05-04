// Trigger:  Called by dashboard_essay_historiography.js when the module loads,
//           and whenever the Essay/Historiography toggle is switched.
// Main:    displayEssayHistoriographyList(mode) — fetches the document list
//           from GET /api/admin/essays or GET /api/admin/historiography and
//           populates the sidebar Published/Drafts lists. Each list item is
//           clickable, loading the document content into the editor via
//           loadDocumentContent(recordId, title).
// Output:  Populated sidebar document lists. Document content loaded into the
//           editor (title, markdown, snippet, bibliography, context links,
//           metadata) when a list item is clicked. Errors routed via
//           window.surfaceError().

'use strict';

/* -----------------------------------------------------------------------------
   CONSTANTS
----------------------------------------------------------------------------- */
const API_BASE_URL = '/api/admin';

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: displayEssayHistoriographyList
   Fetches the document list for the given mode ('essay' or 'historiography')
   and populates the sidebar Published and Drafts lists.

   Parameters:
     mode (string) — 'essay' or 'historiography'
----------------------------------------------------------------------------- */
async function displayEssayHistoriographyList(mode) {
  const endpoint = (mode === 'historiography')
    ? API_BASE_URL + '/historiography'
    : API_BASE_URL + '/essays';

  try {
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error('API responded with status ' + response.status);
    }

    const data = await response.json();

    // Separate into published and drafts
    const documents = Array.isArray(data) ? data : (data.records || data.essays || data.results || []);

    const published = documents.filter(function (doc) {
      return doc.status === 'published';
    });
    const drafts = documents.filter(function (doc) {
      return doc.status !== 'published';
    });

    // Populate the sidebar lists
    _populateSidebarList('essay-published-list', published);
    _populateSidebarList('essay-drafts-list', drafts);

  } catch (err) {
    console.error('[essay_historiography_data_display] Failed to load document list:', err);
    if (typeof window.surfaceError === 'function') {
      window.surfaceError('Error: Unable to load document list. Please refresh and try again.');
    }
  }
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: loadDocumentContent
   Fetches a single document by its record ID and populates the editor
   fields (title, markdown content, snippet, bibliography, context links,
   metadata). Called when a sidebar list item is clicked.

   Parameters:
     recordId (string) — The record slug/ID to fetch.
     title    (string) — The document title (for error messages).
----------------------------------------------------------------------------- */
async function loadDocumentContent(recordId, title) {
  if (!recordId) return;

  try {
    const response = await fetch(API_BASE_URL + '/records/' + encodeURIComponent(recordId));

    if (!response.ok) {
      throw new Error('API responded with status ' + response.status);
    }

    const doc = await response.json();

    // Update module state
    window._essayModuleState.activeRecordId = recordId;
    window._essayModuleState.activeRecordTitle = doc.title || title || '';
    window._essayModuleState.isDirty = false;

    // Populate title
    const titleInput = document.getElementById('essay-title-input');
    if (titleInput) {
      titleInput.value = doc.title || '';
    }

    // Populate markdown content
    if (typeof window.setMarkdownContent === 'function') {
      window.setMarkdownContent(doc.markdown_content || doc.content || '');
    }

    // Populate snippet
    const snippetInput = document.getElementById('essay-snippet-input');
    if (snippetInput) {
      snippetInput.value = doc.snippet || '';
    }

    // Populate slug
    const slugInput = document.getElementById('record-slug');
    if (slugInput) {
      slugInput.value = doc.slug || '';
    }

    // Populate metadata display fields
    const metadataJson = document.getElementById('record-metadata-json');
    const createdAt = document.getElementById('record-created-at');
    const updatedAt = document.getElementById('record-updated-at');

    if (metadataJson) {
      metadataJson.value = doc.metadata_json
        ? (typeof doc.metadata_json === 'string' ? doc.metadata_json : JSON.stringify(doc.metadata_json, null, 2))
        : '';
    }
    if (createdAt) {
      createdAt.value = doc.created_at || '';
    }
    if (updatedAt) {
      updatedAt.value = doc.updated_at || '';
    }

    // Populate bibliography via shared tool
    if (typeof window.loadEditBibliography === 'function') {
      try {
        window.loadEditBibliography(doc.bibliography || []);
      } catch (err) {
        console.warn('[essay_historiography_data_display] Failed to load bibliography:', err);
      }
    }

    // Populate context links via shared tool
    if (typeof window.renderEditLinks === 'function') {
      try {
        window.renderEditLinks('essay-context-links-container', doc.context_links || []);
      } catch (err) {
        console.warn('[essay_historiography_data_display] Failed to load context links:', err);
      }
    }

    // Update picture handler with the record ID
    if (typeof window.renderEditPicture === 'function') {
      try {
        window.renderEditPicture('essay-picture-container', recordId);
      } catch (err) {
        console.warn('[essay_historiography_data_display] Failed to wire picture handler:', err);
      }
    }

    // Update metadata footer with the record ID
    if (typeof window.renderMetadataFooter === 'function') {
      try {
        window.renderMetadataFooter('essay-metadata-container', recordId);
      } catch (err) {
        console.warn('[essay_historiography_data_display] Failed to wire metadata footer:', err);
      }
    }

    // Highlight the active item in the sidebar
    _highlightActiveItem(recordId);

  } catch (err) {
    console.error('[essay_historiography_data_display] Failed to load document:', err);
    if (typeof window.surfaceError === 'function') {
      window.surfaceError("Error: Unable to load '" + (title || recordId) + "'. Please try again.");
    }
  }
}

/* =============================================================================
   INTERNAL HELPERS
============================================================================= */

/* -----------------------------------------------------------------------------
   INTERNAL: _populateSidebarList
   Populates a sidebar <ul> element with list items for each document.

   Parameters:
     listId    (string) — The ID of the <ul> element to populate.
     documents (array)  — Array of document objects (each with slug/id and title).
----------------------------------------------------------------------------- */
function _populateSidebarList(listId, documents) {
  const listEl = document.getElementById(listId);
  if (!listEl) return;

  listEl.innerHTML = '';

  if (!documents || !documents.length) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'essay-sidebar-list__item';
    emptyItem.textContent = 'No documents';
    emptyItem.style.color = 'var(--color-text-muted)';
    emptyItem.style.fontStyle = 'italic';
    emptyItem.style.cursor = 'default';
    listEl.appendChild(emptyItem);
    return;
  }

  documents.forEach(function (doc) {
    const item = document.createElement('li');
    item.className = 'essay-sidebar-list__item';
    item.textContent = doc.title || doc.slug || doc.id || 'Untitled';
    item.setAttribute('data-record-id', doc.slug || doc.id || '');
    item.setAttribute('data-record-title', doc.title || '');

    item.addEventListener('click', function () {
      const recordId = item.getAttribute('data-record-id');
      const title = item.getAttribute('data-record-title');
      if (recordId) {
        loadDocumentContent(recordId, title);
      }
    });

    listEl.appendChild(item);
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _highlightActiveItem
   Adds the --active class to the currently selected sidebar item and
   removes it from all others.

   Parameters:
     recordId (string) — The record ID of the active document.
----------------------------------------------------------------------------- */
function _highlightActiveItem(recordId) {
  // Remove active class from all items
  const allItems = document.querySelectorAll('.essay-sidebar-list__item--active');
  allItems.forEach(function (item) {
    item.classList.remove('essay-sidebar-list__item--active');
  });

  // Add active class to the matching item
  if (recordId) {
    const activeItem = document.querySelector('.essay-sidebar-list__item[data-record-id="' + CSS.escape(recordId) + '"]');
    if (activeItem) {
      activeItem.classList.add('essay-sidebar-list__item--active');
    }
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.displayEssayHistoriographyList = displayEssayHistoriographyList;
window.loadDocumentContent = loadDocumentContent;
