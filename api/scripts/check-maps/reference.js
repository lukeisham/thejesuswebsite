/**
 * Loads the AD 30 reference data and matches map text to it.
 *
 * Two sources feed the feature list: first-century-reference.json (this
 * folder) and api/scripts/generate-maps/reference/jerusalem-places.geojson.
 * The JSON comes first, so its entry wins when both name the same place.
 *
 * @module check-maps/reference
 */

const fs = require("fs");
const path = require("path");

const JERUSALEM_PLACES = path.resolve(
  __dirname,
  "..",
  "generate-maps",
  "reference",
  "jerusalem-places.geojson",
);

// Jerusalem sites are small, so their tolerance is in hundreds of metres.
const JERUSALEM_SITE_RADIUS_KM = 0.3;

/**
 * Lower-case a map label and remove the differences that do not change which
 * place it names: no-break spaces, apostrophes, "Mt." and trailing notes.
 *
 * @param {string} text
 * @returns {string}
 */
function normaliseName(text) {
  return text
    .replace(/ /g, " ")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\bmt\.?\s/g, "mount ")
    .replace(/\s*\(.*\)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Load the reference data.
 *
 * @returns {{features: Array, roads: Array, boundaries: Array, anachronisms: Array, nameVariants: Array}}
 */
function loadReference() {
  const reference = JSON.parse(
    fs.readFileSync(path.join(__dirname, "first-century-reference.json"), "utf8"),
  );
  const jerusalem = JSON.parse(fs.readFileSync(JERUSALEM_PLACES, "utf8"));
  const siteFeatures = jerusalem.features.map((f) => ({
    names: [f.properties.name],
    kind: "site",
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    radiusKm: JERUSALEM_SITE_RADIUS_KM,
  }));
  return { ...reference, features: [...reference.features, ...siteFeatures] };
}

/**
 * Find the reference feature that a label names. A label matches when it
 * equals a name, or when it is the first part of a longer name ("Antonia"
 * matches "Antonia Fortress").
 *
 * @param {Array} features - The features from loadReference().
 * @param {string} text - Label text from the map.
 * @returns {Object|undefined} The matching feature.
 */
function findFeature(features, text) {
  const wanted = normaliseName(text);
  const named = (f) => f.names.map(normaliseName);
  return (
    features.find((f) => named(f).includes(wanted)) ||
    features.find((f) => named(f).some((n) => n.startsWith(wanted + " ")))
  );
}

/**
 * Find a feature by its exact name. Used for road waypoints.
 *
 * @param {Array} features - The features from loadReference().
 * @param {string} name
 * @returns {Object|undefined}
 */
function getFeatureByName(features, name) {
  const wanted = normaliseName(name);
  return features.find((f) => f.names.map(normaliseName).includes(wanted));
}

module.exports = { loadReference, findFeature, getFeatureByName, normaliseName };
