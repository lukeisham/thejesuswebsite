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
    cartouche: {
      title: "Roman Empire",
      subtitle: "in the time of Jesus · c. AD\u00A030",
    },
    labels: [
      { text: "MEDITERRANEAN SEA", x: 480, y: 400, cls: "sea-label" },
      { text: "BLACK SEA", x: 950, y: 130, cls: "sea-label" },
      { text: "ITALIA", x: 180, y: 220, cls: "region-label" },
      { text: "GRAECIA", x: 370, y: 210, cls: "region-label" },
      { text: "ASIA MINOR", x: 650, y: 180, cls: "region-label" },
      { text: "SYRIA", x: 880, y: 280, cls: "region-label" },
      { text: "JUDAEA", x: 850, y: 360, cls: "region-label" },
      { text: "AEGYPTUS", x: 480, y: 490, cls: "region-label" },
      { text: "HISPANIA", x: 120, y: 310, cls: "region-label" },
      { text: "GALLIA", x: 140, y: 150, cls: "region-label" },
      { text: "AFRICA", x: 280, y: 430, cls: "region-label" },
    ],
    hills: [
      { cx: 350, cy: 195, r: 30, label: "Alps" },
      { cx: 450, cy: 250, r: 20, label: "Apennines" },
    ],
  },

  levant: {
    bbox: { lon_min: 32, lat_min: 29, lon_max: 38, lat_max: 37 },
    viewBox: { x: 0, y: 0, width: 900, height: 1000 },
    dataLayers: ["coastline", "lakes", "rivers"],
    cartouche: {
      title: "The Levant",
      subtitle: "in the time of Jesus · c. AD\u00A030",
    },
    labels: [
      { text: "MEDITERRANEAN SEA", x: 80, y: 500, cls: "sea-label" },
      { text: "GALILEE", x: 450, y: 200, cls: "region-label" },
      { text: "SAMARIA", x: 400, y: 320, cls: "region-label" },
      { text: "JUDEA", x: 400, y: 450, cls: "region-label" },
      { text: "IDUMEA", x: 350, y: 580, cls: "region-label" },
      { text: "DECAPOLIS", x: 600, y: 230, cls: "region-label" },
      { text: "PEREA", x: 600, y: 350, cls: "region-label" },
      { text: "NABATEA", x: 500, y: 720, cls: "region-label" },
      { text: "PHOENICIA", x: 350, y: 100, cls: "region-label" },
      { text: "ITUREA", x: 500, y: 90, cls: "region-label" },
    ],
    hills: [
      { cx: 420, cy: 260, r: 25, label: "Mt. Gerizim" },
      { cx: 420, cy: 230, r: 25, label: "Mt. Ebal" },
      { cx: 430, cy: 420, r: 20, label: "Mt. of Olives" },
    ],
  },

  judea: {
    bbox: { lon_min: 34.2, lat_min: 30.9, lon_max: 35.8, lat_max: 32.6 },
    viewBox: { x: 0, y: 0, width: 900, height: 1000 },
    dataLayers: ["coastline", "lakes", "rivers"],
    cartouche: {
      title: "Judea",
      subtitle: "in the time of Jesus · c. AD\u00A030",
    },
    labels: [
      { text: "MEDITERRANEAN SEA", x: 50, y: 450, cls: "sea-label" },
      { text: "DEAD SEA", x: 650, y: 550, cls: "sea-label" },
      { text: "JUDEA", x: 450, y: 400, cls: "region-label" },
      { text: "SAMARIA", x: 400, y: 250, cls: "region-label" },
      { text: "IDUMEA", x: 380, y: 650, cls: "region-label" },
      { text: "Jordan River", x: 700, y: 360, cls: "river-label", angle: -70 },
    ],
    hills: [
      { cx: 460, cy: 380, r: 22, label: "Mt. of Olives" },
      { cx: 470, cy: 340, r: 18, label: "Judean Hills" },
    ],
  },

  galilee: {
    bbox: { lon_min: 34.9, lat_min: 32.2, lon_max: 36.0, lat_max: 33.5 },
    viewBox: { x: 0, y: 0, width: 900, height: 1000 },
    dataLayers: ["coastline", "lakes", "rivers"],
    cartouche: {
      title: "Galilee",
      subtitle: "in the time of Jesus · c. AD\u00A030",
    },
    labels: [
      { text: "SEA OF GALILEE", x: 600, y: 480, cls: "lake-label" },
      { text: "UPPER GALILEE", x: 400, y: 180, cls: "region-label" },
      { text: "LOWER GALILEE", x: 380, y: 350, cls: "region-label" },
      { text: "Jordan River", x: 620, y: 310, cls: "river-label", angle: -80 },
      { text: "Lake Huleh", x: 570, y: 170, cls: "lake-label" },
      { text: "PHOENICIA", x: 200, y: 80, cls: "region-label" },
      { text: "GAULANITIS", x: 700, y: 300, cls: "region-label" },
      { text: "DECAPOLIS", x: 750, y: 550, cls: "region-label" },
    ],
    hills: [
      { cx: 380, cy: 220, r: 22, label: "Mt. Meron" },
      { cx: 500, cy: 280, r: 20, label: "Mt. Tabor" },
      { cx: 350, cy: 150, r: 18, label: "Upper Galilee hills" },
    ],
  },

  jerusalem: {
    bbox: { lon_min: 35.10, lat_min: 31.72, lon_max: 35.30, lat_max: 31.82 },
    viewBox: { x: 0, y: 0, width: 1000, height: 1000 },
    dataLayers: [], // Jerusalem is small; coastline/lakes/rivers not relevant
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
