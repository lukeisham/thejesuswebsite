/**
 * Era helper shared by the admin timeline and maps editors.
 *
 * Both editors tag dots and pins with `era--<kebab>`, and the era colours come
 * from the stylesheets that name the same class. Two editors with two
 * conversions would colour the same era differently. Loaded as a classic
 * script before admin-timeline/timeline-events.js and
 * admin-timeline/timeline-era-filter.js (admin/diagrams/timeline.html) and
 * before admin-maps/maps-pins.js and admin-maps/maps-holding-pen.js
 * (admin/diagrams/maps.html).
 *
 * @module admin-era-utils
 */

window.AdminEraUtils = {};

/**
 * Convert a timeline_era value to the suffix of its `era--<kebab>` CSS class.
 * e.g. "GalileeMinistry" becomes "galilee-ministry"; "Post-Passion" keeps its
 * hyphen. The public renderers (timeline-render.js, maps-render.js) hold their
 * own copies of this conversion because an ES module cannot be shared with a
 * classic script.
 *
 * @param {string} era
 * @returns {string}
 */
window.AdminEraUtils.eraToKebab = function (era) {
  return era
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
};
