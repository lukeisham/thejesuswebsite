/**
 * Maps data module.
 *
 * Fetches map data from the API. All calls go through api.js (JS-5).
 *
 * @module maps/maps-data
 */

import { getMaps, getMapByKey } from "../api.js";

/**
 * Fetch all maps (with pin counts).
 *
 * @returns {Promise<{data: Array|null, error: string|null}>}
 */
export async function getAllMaps() {
  return getMaps();
}

/**
 * Fetch a single map by its unique key, including embedded pins.
 *
 * @param {string} mapKey - The map's unique key (e.g. 'galilee').
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export async function fetchMapByKey(mapKey) {
  return getMapByKey(mapKey);
}

/**
 * Get the default map key from the `data-map-key` attribute on `<body>`.
 *
 * Used by region and zoom-variant pages to determine which map to load
 * without relying on URL path segments.
 *
 * @returns {string|null} The map key, or null if not set.
 */
export function getDefaultMapKey() {
  return document.body?.dataset?.mapKey || null;
}
