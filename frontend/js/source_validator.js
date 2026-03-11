/**
 * source_validator.js
 *
 * Stage 1 of the 3-stage source pipeline: VALIDATE
 *
 * Validates a source form submission client-side before sending it to the
 * Rust API. On success, passes the validated payload to source_publisher.js
 * for Stage 2 (publish to list_sources.html) and optional bibliography linking.
 *
 * Future use: essays, records, responses, and historiography pages will also
 * call `validateAndPublishSource()` to build an inline bibliography at the
 * base of each content page. Pass `pageSlug` and `pageType` to enable this.
 *
 * Usage:
 *   import { validateAndPublishSource } from './source_validator.js';
 *
 *   // From a sources management page (no page context):
 *   await validateAndPublishSource(formElement);
 *
 *   // From a content page (attaches source to page bibliography):
 *   await validateAndPublishSource(formElement, {
 *     pageSlug: 'crucifixion',
 *     pageType: 'essay',   // 'essay' | 'record' | 'response' | 'historiography'
 *   });
 */

import { publishSource } from './source_publisher.js';

const VALID_SOURCE_TYPES = ['book', 'article', 'websource'];
const MIN_YEAR = 1000;
const MAX_YEAR = 2100;

/**
 * Validates and submits a source form.
 *
 * @param {HTMLFormElement|HTMLElement} formEl  - The form element containing source fields.
 * @param {{ pageSlug?: string, pageType?: string }} [pageContext] - Optional page context
 *        for attaching the source to a content page bibliography.
 * @returns {Promise<{ ok: boolean, sourceId?: number, error?: string }>}
 */
export async function validateAndPublishSource(formEl, pageContext = {}) {
  // --- 1. COLLECT FORM VALUES ---
  const getValue = (name) => {
    const el = formEl.querySelector(`[name="${name}"]`);
    return el ? el.value.trim() : '';
  };

  const authorName   = getValue('author_name');
  const authorOrcid  = getValue('author_orcid');
  const titleText    = getValue('title_text');
  const pubLink      = getValue('publication_link');
  const doiLink      = getValue('doi_link');
  const sourceType   = getValue('source_type_str');
  const yearRaw      = getValue('year');

  // --- 2. CLIENT-SIDE VALIDATION ---
  const errors = [];

  // Author: at least one identifier required
  if (!authorName && !authorOrcid) {
    errors.push('Author name or ORCID is required.');
  }

  // Title: required, max 140 chars
  if (!titleText) {
    errors.push('Source title is required.');
  } else if (titleText.length > 140) {
    errors.push(`Source title must be 140 characters or fewer (currently ${titleText.length}).`);
  }

  // Source type: must be a known value if provided
  if (sourceType && !VALID_SOURCE_TYPES.includes(sourceType.toLowerCase())) {
    errors.push(`Unknown source type "${sourceType}". Use: book, article, or websource.`);
  }

  // Year: must be a valid integer in range if provided
  let yearInt = null;
  if (yearRaw) {
    yearInt = parseInt(yearRaw, 10);
    if (isNaN(yearInt) || yearInt < MIN_YEAR || yearInt > MAX_YEAR) {
      errors.push(`Publication year must be between ${MIN_YEAR} and ${MAX_YEAR}.`);
    }
  }

  // DOI and URL: basic format guards
  if (doiLink && !doiLink.startsWith('10.')) {
    errors.push('DOI should start with "10." (e.g. 10.1000/xyz).');
  }
  if (pubLink && !/^https?:\/\//i.test(pubLink)) {
    errors.push('Publication link must be a full URL starting with http:// or https://.');
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join(' ') };
  }

  // --- 3. BUILD REQUEST PAYLOAD ---
  const payload = {
    title_text:    titleText,
    source_type_str: sourceType || '',
    ...(authorOrcid ? { author_orcid: authorOrcid } : { author_name: authorName }),
    ...(pubLink  ? { publication_link: pubLink }  : {}),
    ...(doiLink  ? { doi_link: doiLink }           : {}),
    ...(yearInt  ? { year: yearInt }               : {}),
  };

  // --- 4. SEND TO RUST API (create source in DB) ---
  let sourceId;
  try {
    const resp = await fetch('/api/v1/admin/sources', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const json = await resp.json();

    if (!resp.ok || json.status !== 'success') {
      return { ok: false, error: json.message || 'Server rejected the source.' };
    }

    sourceId = json.data; // i64 row ID returned by Rust
  } catch (err) {
    return { ok: false, error: `Network error: ${err.message}` };
  }

  // --- 5. STAGE 2: PUBLISH (update list + optional page bibliography) ---
  await publishSource(sourceId, payload, pageContext);

  return { ok: true, sourceId };
}
