/**
 * Background revalidation for deploy-time embedded first-paint data.
 *
 * Pages render an embedded `<script type="application/json">` snapshot
 * immediately for fast first paint (SR-3), then use this helper to fetch
 * the live data in the background and re-render only if it actually
 * changed. Without this, a page that has any embedded data at all never
 * reflects a later admin edit until the next deploy regenerates the
 * snapshot (Issues.md #64).
 *
 * @module utils/data-revalidation
 */

/**
 * Fetch live data and call `onFresh` only if it differs from what's
 * already rendered. Never throws and never surfaces an error to the
 * caller — a failed background revalidation is silent by design (JS-2):
 * the page already has valid content, so there is nothing actionable
 * for the user.
 *
 * @param {Object} options
 * @param {*} options.embeddedData - the data currently rendered (may be undefined)
 * @param {function(): Promise<{data: *, error: string|null}>} options.fetchLive
 * @param {function(*): void} options.onFresh - called with the live data, only if it differs from `embeddedData`
 * @returns {Promise<void>}
 */
export async function revalidateInBackground({
  embeddedData,
  fetchLive,
  onFresh,
}) {
  let data;
  try {
    ({ data } = await fetchLive());
  } catch {
    return;
  }

  if (data === undefined || data === null) return;
  if (JSON.stringify(data) === JSON.stringify(embeddedData)) return;

  onFresh(data);
}
