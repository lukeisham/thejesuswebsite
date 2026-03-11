/**
 * source_auditor.js
 *
 * Stage 3 of the 3-stage source pipeline: AUDIT
 *
 * Fetches a SourceAuditReport from the Rust backend and renders it
 * on the sources architecture page or any admin dashboard that includes
 * an element with id="audit-report-container".
 *
 * The audit compares:
 *   - Total sources in the sources table
 *   - Sources cited on at least one content page (via page_sources junction)
 *   - Uncited / orphaned sources with no page connection
 *
 * Usage:
 *   import { runAudit } from './source_auditor.js';
 *
 *   // Triggered by an audit button:
 *   document.getElementById('run-audit-btn')?.addEventListener('click', runAudit);
 *
 *   // Or called automatically on page load:
 *   await runAudit();
 */

const AUDIT_ENDPOINT = '/api/v1/admin/sources/audit';
const CONTAINER_ID   = 'audit-report-container';

/**
 * Fetches the audit report from the server and renders it into the container.
 * @returns {Promise<void>}
 */
export async function runAudit() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) {
    console.warn(`[source_auditor] No element with id="${CONTAINER_ID}" found.`);
    return;
  }

  container.innerHTML = '<p class="audit-loading">Running audit...</p>';

  try {
    const resp = await fetch(AUDIT_ENDPOINT);
    const json = await resp.json();

    if (!resp.ok || json.status !== 'success' || !json.data) {
      container.innerHTML = `<p class="audit-error">Audit failed: ${json.message || 'Unknown error'}</p>`;
      return;
    }

    renderReport(container, json.data);
  } catch (err) {
    container.innerHTML = `<p class="audit-error">Network error: ${err.message}</p>`;
    console.error('[source_auditor] Audit request failed:', err);
  }
}

/**
 * Renders the SourceAuditReport into the container element.
 *
 * @param {HTMLElement} container
 * @param {object}      report     - SourceAuditReport from the Rust API.
 */
function renderReport(container, report) {
  const { total_sources, cited_sources, uncited_sources, citations, audited_at } = report;

  // --- Summary stats ---
  const summaryHtml = `
    <div class="audit-summary">
      <table class="audit-table">
        <tr>
          <th>Total Sources</th>
          <th>Cited on Pages</th>
          <th>Uncited (Orphans)</th>
          <th>Audited At</th>
        </tr>
        <tr>
          <td>${total_sources}</td>
          <td>${cited_sources}</td>
          <td class="${uncited_sources > 0 ? 'audit-warn' : ''}">${uncited_sources}</td>
          <td>${formatTimestamp(audited_at)}</td>
        </tr>
      </table>
    </div>
  `;

  // --- Citation detail table ---
  let citationsHtml = '';
  if (citations && citations.length > 0) {
    const rows = citations.map(c => `
      <tr>
        <td>${c.source_id}</td>
        <td>${escapeHtml(c.title)}</td>
        <td><code>${escapeHtml(c.page_slug)}</code></td>
        <td>${c.page_type}</td>
      </tr>
    `).join('');

    citationsHtml = `
      <details class="audit-details" open>
        <summary>Citations (${citations.length})</summary>
        <table class="audit-table audit-citations">
          <thead>
            <tr>
              <th>ID</th>
              <th>Source Title</th>
              <th>Page Slug</th>
              <th>Page Type</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </details>
    `;
  } else {
    citationsHtml = '<p class="audit-empty">No page citations recorded yet.</p>';
  }

  // --- Orphan warning ---
  const orphanWarning = uncited_sources > 0
    ? `<p class="audit-warn">⚠ ${uncited_sources} source(s) are not cited on any content page. Consider linking or removing them.</p>`
    : `<p class="audit-ok">✓ All sources are cited on at least one content page.</p>`;

  container.innerHTML = summaryHtml + orphanWarning + citationsHtml;
}

// --- UTILITIES ---

function formatTimestamp(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
