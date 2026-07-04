/**
 * Analytics utility: records page views via POST /analytics.
 * Delegates to the centralised api.js.
 *
 * @module utils/analytics
 */

import { recordPageView as apiRecord } from "../api.js";

/**
 * Record a page view. Fires on every page load and client-side navigation.
 *
 * @param {string} page - The URL path (e.g. '/evidence/some-slug').
 * @returns {Promise<void>}
 */
export async function recordPageView(page) {
  if (typeof page !== "string" || page.length === 0) return;
  await apiRecord(page);
}
