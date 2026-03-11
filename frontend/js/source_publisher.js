/**
 * source_publisher.js
 *
 * Stage 2 of the 3-stage source pipeline: PUBLISH
 *
 * Responsibilities:
 *   1. After a new source is created, links it to a content page via the
 *      page_sources junction table (if pageContext is provided).
 *   2. Fetches the updated source list for a page slug and renders it as
 *      an inline bibliography at the bottom of content pages.
 *   3. Refreshes the global sources list (list_sources.html) when called
 *      from the sources management page.
 *
 * Content pages that use this module:
 *   - Essays (pageType: 'essay')
 *   - Records (pageType: 'record')
 *   - Responses (pageType: 'response')
 *   - Historiography (pageType: 'historiography')
 *
 * Usage:
 *   import { publishSource, renderBibliography } from './source_publisher.js';
 *
 *   // After validation creates a source — link it to this page:
 *   await publishSource(sourceId, payload, { pageSlug: 'john-1', pageType: 'record' });
 *
 *   // On page load, render existing page bibliography:
 *   await renderBibliography('john-1', document.getElementById('bibliography'));
 */

// --- INTERNAL HELPERS ---

/**
 * Formats a single source object into an HTML citation string.
 * Mirrors the logic in list_sources_hero.js but extended with year + source_type.
 *
 * @param {object} source  - Source object from the Rust API.
 * @returns {string}       - HTML string.
 */
function formatCitation(source) {
  // Author
  let authorPart = '';
  if (source.author?.Name) {
    authorPart = source.author.Name;
  } else if (source.author?.Orcid) {
    const orcid = source.author.Orcid;
    authorPart = `<a href="https://orcid.org/${orcid}" target="_blank" rel="noopener">${orcid}</a>`;
  }

  // Title + identity link
  const titleText = source.title?.text ?? '(untitled)';
  let identityPart = `<i>${titleText}</i>`;
  let doiPart = '';

  if (source.title?.identity) {
    const id = source.title.identity;
    if (id.Isbn) {
      identityPart = `<i><a href="https://www.worldcat.org/search?q=isbn%3A${id.Isbn}" target="_blank" rel="noopener">${titleText}</a></i>`;
    } else if (id.NamedUrl) {
      identityPart = `<i><a href="${id.NamedUrl}" target="_blank" rel="noopener">${titleText}</a></i>`;
    } else if (id.AcademicArticleId) {
      identityPart = `<i>${titleText}</i>`;
      doiPart = ` <a href="https://doi.org/${id.AcademicArticleId}" target="_blank" rel="noopener">${id.AcademicArticleId}</a>`;
    }
  }

  // Year
  const yearPart = source.year ? ` (${source.year})` : '';

  // Source type badge
  const typePart = source.source_type
    ? ` <span class="source-type-badge">[${source.source_type}]</span>`
    : '';

  return `${authorPart}, ${identityPart}${yearPart}${doiPart}${typePart}`;
}

// --- PUBLIC API ---

/**
 * Links a newly created source to a content page and refreshes any visible
 * bibliography or sources list on the current page.
 *
 * @param {number} sourceId             - Row ID from the sources table.
 * @param {object} payload              - Original source payload (for optimistic UI).
 * @param {{ pageSlug?: string, pageType?: string }} pageContext
 */
export async function publishSource(sourceId, payload, pageContext = {}) {
  const { pageSlug, pageType } = pageContext;

  // 1. Link to page if context provided
  if (pageSlug && pageType) {
    try {
      await fetch('/api/v1/admin/sources/link', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ source_id: sourceId, page_slug: pageSlug, page_type: pageType }),
      });
    } catch (err) {
      console.warn('[source_publisher] Failed to link source to page:', err);
    }

    // 2a. Refresh inline bibliography for this page
    const bibContainer = document.getElementById('bibliography');
    if (bibContainer) {
      await renderBibliography(pageSlug, bibContainer);
    }
  } else {
    // 2b. Refresh global sources list (list_sources.html context)
    const listContainer = document.getElementById('hero-placeholder');
    if (listContainer) {
      await refreshGlobalSourcesList(listContainer);
    }
  }
}

/**
 * Fetches all sources linked to a page slug and renders them into a container.
 * Call this on content page load to populate the inline bibliography.
 *
 * @param {string}      pageSlug    - The page slug (e.g. "crucifixion").
 * @param {HTMLElement} container   - DOM element to render into.
 */
export async function renderBibliography(pageSlug, container) {
  if (!container) return;

  try {
    const resp = await fetch(`/api/v1/sources/page?slug=${encodeURIComponent(pageSlug)}`);
    const json = await resp.json();

    if (!resp.ok || json.status !== 'success' || !Array.isArray(json.data)) {
      container.innerHTML = '<p class="bib-empty">No sources cited on this page yet.</p>';
      return;
    }

    const sources = json.data;
    if (sources.length === 0) {
      container.innerHTML = '<p class="bib-empty">No sources cited on this page yet.</p>';
      return;
    }

    container.innerHTML = `
      <ol class="bibliography-list">
        ${sources.map(s => `<li>${formatCitation(s)}</li>`).join('\n')}
      </ol>
    `;
  } catch (err) {
    console.error('[source_publisher] Failed to render bibliography:', err);
    container.innerHTML = '<p class="bib-error">Could not load bibliography.</p>';
  }
}

/**
 * Refreshes the global sources list on list_sources.html.
 * @param {HTMLElement} container
 */
async function refreshGlobalSourcesList(container) {
  try {
    const resp = await fetch('/api/v1/sources');
    const json = await resp.json();

    if (!resp.ok || json.status !== 'success' || !Array.isArray(json.data)) {
      return;
    }

    const sources = json.data;
    if (sources.length === 0) {
      container.innerHTML = '<p>No sources have been added yet.</p>';
      return;
    }

    container.innerHTML = `
      <ul class="record-list">
        ${sources.map(s => `<li>${formatCitation(s)}</li>`).join('\n')}
      </ul>
    `;
  } catch (err) {
    console.error('[source_publisher] Failed to refresh global sources list:', err);
  }
}
