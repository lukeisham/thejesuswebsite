/**
 * Admin maps era utilities.
 *
 * Shared helpers used across admin-maps modules. Currently exports the
 * `eraToKebab` function for converting CamelCase timeline era values to
 * kebab-case CSS class names.
 *
 * @module admin-maps/maps-era-utils
 */

window.AdminMapsEraUtils = {};

/**
 * Convert a CamelCase timeline_era value to kebab-case for CSS classes.
 * e.g. "GalileeMinistry" → "galilee-ministry"
 *
 * @param {string} era
 * @returns {string}
 */
window.AdminMapsEraUtils.eraToKebab = function (era) {
  return era
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
};
