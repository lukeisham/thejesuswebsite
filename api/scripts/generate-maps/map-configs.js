/**
 * Per-map configuration for the SVG map generator.
 *
 * Each map_key has a bounding box (lon_min, lat_min, lon_max, lat_max),
 * an SVG viewBox, and lists of data layers, baked-in labels, and the
 * cartouche title/subtitle.
 *
 * Bounding boxes are in WGS84 degrees for equirectangular projection.
 *
 * @module generate-maps/map-configs
 */

const MAP_CONFIGS = {
  "roman-empire": {
    bbox: { lon_min: -10, lat_min: 25, lon_max: 45, lat_max: 52 },
    viewBox: { x: 0, y: 0, width: 1200, height: 700 },
    dataLayers: ["coastline", "lakes", "rivers"],
    // Continent-scale view — coarse tolerance keeps the SVG small without
    // losing shapes visible at this zoom.
    simplifyTolerance: 0.08,
    cartouche: {
      title: "Roman Empire",
      subtitle: "in the time of Jesus · c. AD\u00A030",
    },
    // Label positions are projections of each place's real-world lon/lat
    // (see api/scripts/generate-maps/fetch-data.js for the base geography
    // they're calibrated against) — not hand-eyeballed against artwork.
    labels: [
      { text: "MEDITERRANEAN SEA", x: 611, y: 467, cls: "sea-label" },
      { text: "BLACK SEA", x: 982, y: 233, cls: "sea-label" },
      { text: "ITALIA", x: 491, y: 233, cls: "region-label" },
      { text: "GRAECIA", x: 698, y: 337, cls: "region-label" },
      { text: "ASIA MINOR", x: 938, y: 337, cls: "region-label" },
      { text: "SYRIA", x: 1025, y: 441, cls: "region-label" },
      { text: "JUDAEA", x: 988, y: 521, cls: "region-label" },
      { text: "AEGYPTUS", x: 895, y: 583, cls: "region-label" },
      { text: "HISPANIA", x: 137, y: 311, cls: "region-label" },
      { text: "GALLIA", x: 268, y: 130, cls: "region-label" },
      { text: "AFRICA", x: 436, y: 454, cls: "region-label" },
    ],
    hills: [
      { cx: 393, cy: 156, r: 30, label: "Alps" },
      { cx: 502, cy: 246, r: 20, label: "Apennines" },
    ],
  },

  levant: {
    bbox: { lon_min: 32, lat_min: 29, lon_max: 38, lat_max: 37 },
    viewBox: { x: 0, y: 0, width: 900, height: 1000 },
    dataLayers: ["coastline", "lakes", "rivers"],
    simplifyTolerance: 0.01,
    cartouche: {
      title: "The Levant",
      subtitle: "in the time of Jesus · c. AD\u00A030",
    },
    labels: [
      { text: "MEDITERRANEAN SEA", x: 150, y: 500, cls: "sea-label" },
      { text: "GALILEE", x: 503, y: 531, cls: "region-label" },
      { text: "SAMARIA", x: 400, y: 600, cls: "region-label" },
      { text: "JUDEA", x: 400, y: 675, cls: "region-label" },
      { text: "IDUMEA", x: 450, y: 737, cls: "region-label" },
      { text: "DECAPOLIS", x: 585, y: 590, cls: "region-label" },
      { text: "PEREA", x: 555, y: 638, cls: "region-label" },
      { text: "NABATEA", x: 540, y: 813, cls: "region-label" },
      { text: "PHOENICIA", x: 480, y: 425, cls: "region-label" },
      { text: "ITUREA", x: 578, y: 450, cls: "region-label" },
    ],
    hills: [
      { cx: 491, cy: 600, r: 25, label: "Mt. Gerizim" },
      { cx: 492, cy: 596, r: 25, label: "Mt. Ebal" },
      { cx: 486, cy: 652, r: 20, label: "Mt. of Olives" },
    ],
  },

  judea: {
    bbox: { lon_min: 34.2, lat_min: 30.9, lon_max: 35.8, lat_max: 32.6 },
    viewBox: { x: 0, y: 0, width: 900, height: 1000 },
    dataLayers: ["coastline", "lakes", "rivers"],
    // Regional-scale — near-zero tolerance so the Dead Sea shoreline stays recognisable.
    simplifyTolerance: 0.002,
    cartouche: {
      title: "Judea",
      subtitle: "in the time of Jesus · c. AD\u00A030",
    },
    labels: [
      { text: "MEDITERRANEAN SEA", x: 112, y: 412, cls: "sea-label" },
      { text: "DEAD SEA", x: 731, y: 647, cls: "sea-label" },
      { text: "JUDEA", x: 534, y: 618, cls: "region-label" },
      { text: "SAMARIA", x: 563, y: 206, cls: "region-label" },
      { text: "IDUMEA", x: 450, y: 853, cls: "region-label" },
      { text: "Jordan River", x: 759, y: 412, cls: "river-label", angle: -70 },
    ],
    hills: [
      { cx: 585, cy: 482, r: 22, label: "Mt. of Olives" },
      { cx: 506, cy: 559, r: 18, label: "Judean Hills" },
    ],
  },

  galilee: {
    bbox: { lon_min: 34.9, lat_min: 32.2, lon_max: 36.0, lat_max: 33.5 },
    viewBox: { x: 0, y: 0, width: 900, height: 1000 },
    dataLayers: ["coastline", "lakes", "rivers"],
    // City/lake-scale — near-zero tolerance so the Sea of Galilee shoreline stays recognisable.
    simplifyTolerance: 0.001,
    cartouche: {
      title: "Galilee",
      subtitle: "in the time of Jesus · c. AD\u00A030",
    },
    labels: [
      { text: "SEA OF GALILEE", x: 565, y: 515, cls: "lake-label" },
      { text: "UPPER GALILEE", x: 327, y: 346, cls: "region-label" },
      { text: "LOWER GALILEE", x: 368, y: 577, cls: "region-label" },
      { text: "Jordan River", x: 548, y: 423, cls: "river-label", angle: -80 },
      { text: "Lake Huleh", x: 573, y: 315, cls: "lake-label" },
      { text: "PHOENICIA", x: 205, y: 231, cls: "region-label" },
      { text: "GAULANITIS", x: 695, y: 462, cls: "region-label" },
      { text: "DECAPOLIS", x: 695, y: 808, cls: "region-label" },
    ],
    hills: [
      { cx: 417, cy: 392, r: 22, label: "Mt. Meron" },
      { cx: 401, cy: 631, r: 20, label: "Mt. Tabor" },
      { cx: 286, cy: 308, r: 18, label: "Upper Galilee hills" },
    ],
  },

  jerusalem: {
    bbox: { lon_min: 35.10, lat_min: 31.72, lon_max: 35.30, lat_max: 31.82 },
    viewBox: { x: 0, y: 0, width: 1000, height: 1000 },
    dataLayers: [], // Jerusalem is small; coastline/lakes/rivers not relevant
    simplifyTolerance: 0,
    cartouche: {
      title: "Jerusalem",
      subtitle: "in the time of Jesus · c. AD\u00A030",
    },
    labels: [
      { text: "TEMPLE MOUNT", x: 500, y: 350, cls: "district-label" },
      { text: "UPPER CITY", x: 350, y: 480, cls: "district-label" },
      { text: "LOWER CITY", x: 550, y: 580, cls: "district-label" },
      { text: "KIDRON VALLEY", x: 750, y: 520, cls: "valley-label", angle: 20 },
      { text: "HINNOM VALLEY", x: 350, y: 720, cls: "valley-label", angle: -30 },
      { text: "MOUNT OF OLIVES", x: 800, y: 320, cls: "hill-label" },
    ],
    hills: [
      { cx: 800, cy: 330, r: 25, label: "Mt. of Olives" },
      { cx: 500, cy: 350, r: 20, label: "Temple Mount" },
    ],
  },
};

/**
 * Get the configuration for a single map by key.
 *
 * @param {string} mapKey - One of: roman-empire, levant, judea, galilee, jerusalem
 * @returns {Object} The map config object.
 * @throws {Error} If the key is unknown.
 */
function getConfig(mapKey) {
  const cfg = MAP_CONFIGS[mapKey];
  if (!cfg) {
    throw new Error(
      `Unknown map_key "${mapKey}". Valid keys: ${Object.keys(MAP_CONFIGS).join(", ")}`,
    );
  }
  return cfg;
}

module.exports = { MAP_CONFIGS, getConfig };
