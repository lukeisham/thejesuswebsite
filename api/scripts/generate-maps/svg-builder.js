/**
 * SVG builder module for the parchment-map generator.
 *
 * Assembles the layered SVG output: parchment background, double frame,
 * water/land/river layers from projected GeoJSON data, hills/ridges,
 * baked-in geographic labels, cartouche title box, compass rose.
 *
 * All colours are literal hex values from the agreed style palette.
 * SVGs are self-contained assets — no external CSS references.
 *
 * @module generate-maps/svg-builder
 */

// ── Style palette (agreed design, 2026-07-10) ─────────────────────────────────

const PALETTE = {
  parchmentLand: "#F1EDE4",
  parchmentBg: "#F8F5F0",
  waterLight: "#C9D4D8",
  waterDark: "#9FB0B6",
  strokeWarm: "#8B7D6B",
  strokeDark: "#5C4E3D",
  accentLight: "#B8A68E",
  cartoucheBg: "rgba(248,245,240,0.92)",
  cartoucheStroke: "#8B7D6B",
  compassStroke: "#8B7D6B",
  compassFill: "#F1EDE4",
  hillStroke: "#C4B5A3",
  hillFill: "rgba(196,181,163,0.12)",
  roadStroke: "#A89680",
  labelSea: "#6B7F8A",
  labelRegion: "#8B7D6B",
  labelDistrict: "#7A6B5D",
  labelValley: "#7A8B6D",
  labelHill: "#8B7A6D",
  labelRiver: "#6B8B9A",
};

// ── SVG escape ─────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Build helpers ──────────────────────────────────────────────────────────────

/**
 * Build a complete layered SVG string for one map.
 *
 * @param {Object} cfg - Map config from map-configs.js.
 * @param {Object} projected - { land, lakes, rivers } polyline strings.
 * @param {string} overlaySVG - Raw inner-SVG fragment for hand-drawn features.
 * @returns {string} Full SVG document.
 */
function buildSVG(cfg, projected, overlaySVG) {
  const vb = cfg.viewBox;
  const w = vb.width;
  const h = vb.height;

  const parts = [];

  // ── SVG wrapper ───────────────────────────────────────────────────────────
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${w} ${h}" width="${w}" height="${h}">`,
  );
  parts.push(`<defs>`);
  parts.push(`<filter id="parchment-texture">`);
  parts.push(
    `<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise"/>`,
  );
  parts.push(
    `<feColorMatrix type="matrix" values="0 0 0 0 0.95  0 0 0 0 0.93  0 0 0 0 0.89  0 0 0 0.04 0" in="noise" result="tint"/>`,
  );
  parts.push(`<feBlend in="SourceGraphic" in2="tint" mode="multiply"/>`);
  parts.push(`</filter>`);
  parts.push(`</defs>`);

  // ── Background ────────────────────────────────────────────────────────────
  parts.push(
    `<rect x="${vb.x}" y="${vb.y}" width="${w}" height="${h}" fill="${PALETTE.parchmentBg}"/>`,
  );

  // ── Land fill ─────────────────────────────────────────────────────────────
  // Each landmass/island is its own <polygon> so disjoint shapes don't get
  // drawn as if connected by a stray line.
  if (projected.land && projected.land.length) {
    for (const points of projected.land) {
      parts.push(
        `<polygon points="${esc(points)}" fill="${PALETTE.parchmentLand}" stroke="none"/>`,
      );
    }
  } else {
    // No coastline data → fill entire viewBox as land
    parts.push(
      `<rect x="${vb.x}" y="${vb.y}" width="${w}" height="${h}" fill="${PALETTE.parchmentLand}"/>`,
    );
  }

  // ── Water bodies (lakes) ──────────────────────────────────────────────────
  if (projected.lakes && projected.lakes.length) {
    for (const points of projected.lakes) {
      parts.push(
        `<polygon points="${esc(points)}" fill="${PALETTE.waterLight}" stroke="${PALETTE.waterDark}" stroke-width="1" stroke-linejoin="round"/>`,
      );
    }
  }

  // ── Rivers ────────────────────────────────────────────────────────────────
  if (projected.rivers && projected.rivers.length) {
    for (const points of projected.rivers) {
      parts.push(
        `<polyline points="${esc(points)}" fill="none" stroke="${PALETTE.waterDark}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`,
      );
    }
  }

  // ── Coastline stroke ──────────────────────────────────────────────────────
  if (projected.land && projected.land.length) {
    for (const points of projected.land) {
      parts.push(
        `<polygon points="${esc(points)}" fill="none" stroke="${PALETTE.strokeWarm}" stroke-width="1.5" stroke-linejoin="round"/>`,
      );
    }
  }

  // ── Hill shading arcs ─────────────────────────────────────────────────────
  if (cfg.hills) {
    for (const hill of cfg.hills) {
      parts.push(
        `<circle cx="${hill.cx}" cy="${hill.cy}" r="${hill.r}" fill="${PALETTE.hillFill}" stroke="${PALETTE.hillStroke}" stroke-width="0.8" stroke-dasharray="3,2"/>`,
      );
      if (hill.label) {
        parts.push(
          `<text x="${hill.cx}" y="${hill.cy - hill.r - 5}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="9" fill="${PALETTE.labelHill}">${esc(hill.label)}</text>`,
        );
      }
    }
  }

  // ── Hand-drawn overlays (ancient roads, walls, districts) ─────────────────
  if (overlaySVG) {
    parts.push(overlaySVG);
  }

  // ── Baked-in geographic labels ────────────────────────────────────────────
  if (cfg.labels) {
    for (const label of cfg.labels) {
      parts.push(buildLabelElement(label));
    }
  }

  // ── Double-line frame ─────────────────────────────────────────────────────
  const frameMargin = 12;
  parts.push(
    `<rect x="${vb.x + frameMargin}" y="${vb.y + frameMargin}" width="${w - frameMargin * 2}" height="${h - frameMargin * 2}" fill="none" stroke="${PALETTE.strokeDark}" stroke-width="2"/>`,
  );
  parts.push(
    `<rect x="${vb.x + frameMargin + 4}" y="${vb.y + frameMargin + 4}" width="${w - (frameMargin + 4) * 2}" height="${h - (frameMargin + 4) * 2}" fill="none" stroke="${PALETTE.strokeDark}" stroke-width="0.8"/>`,
  );

  // ── Cartouche title box ───────────────────────────────────────────────────
  parts.push(buildCartouche(cfg));

  // ── Compass rose ──────────────────────────────────────────────────────────
  parts.push(buildCompassRose(cfg));

  // ── Close SVG ─────────────────────────────────────────────────────────────
  parts.push(`</svg>`);

  return parts.join("\n");
}

/**
 * Build a single label <text> element with optional rotation.
 *
 * @param {Object} label - { text, x, y, cls, angle? }
 * @returns {string}
 */
function buildLabelElement(label) {
  let color = PALETTE.labelRegion;
  let fontSize = 12;
  let letterSpacing = "0.25em";
  let fontWeight = "normal";
  let fontStyle = "normal";

  switch (label.cls) {
    case "sea-label":
      color = PALETTE.labelSea;
      fontSize = 13;
      letterSpacing = "0.3em";
      fontStyle = "italic";
      break;
    case "region-label":
      color = PALETTE.labelRegion;
      fontSize = 11;
      letterSpacing = "0.2em";
      break;
    case "lake-label":
      color = PALETTE.labelRiver;
      fontSize = 10;
      letterSpacing = "0.15em";
      fontStyle = "italic";
      break;
    case "river-label":
      color = PALETTE.labelRiver;
      fontSize = 9;
      letterSpacing = "0.1em";
      fontStyle = "italic";
      break;
    case "district-label":
      color = PALETTE.labelDistrict;
      fontSize = 12;
      letterSpacing = "0.15em";
      fontWeight = "bold";
      break;
    case "valley-label":
      color = PALETTE.labelValley;
      fontSize = 10;
      letterSpacing = "0.1em";
      fontStyle = "italic";
      break;
    case "hill-label":
      color = PALETTE.labelHill;
      fontSize = 10;
      letterSpacing = "0.1em";
      fontStyle = "italic";
      break;
  }

  let transform = "";
  if (label.angle) {
    transform = ` transform="rotate(${label.angle}, ${label.x}, ${label.y})"`;
  }

  return `<text x="${label.x}" y="${label.y}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-style="${fontStyle}" font-weight="${fontWeight}" letter-spacing="${letterSpacing}" fill="${color}"${transform}>${esc(label.text)}</text>`;
}

/**
 * Build the cartouche title box (white rectangular panel with title and subtitle).
 *
 * @param {Object} cfg
 * @returns {string}
 */
function buildCartouche(cfg) {
  const vb = cfg.viewBox;
  const ct = cfg.cartouche;
  if (!ct) return "";

  const boxW = 380;
  const boxH = 50;
  const boxX = (vb.width - boxW) / 2;
  const boxY = vb.height - 70;

  let html = "";
  html += `<rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="4" fill="${PALETTE.cartoucheBg}" stroke="${PALETTE.cartoucheStroke}" stroke-width="1"/>`;
  html += `<text x="${vb.width / 2}" y="${boxY + 22}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="16" font-weight="bold" fill="${PALETTE.strokeDark}">${esc(ct.title)}</text>`;
  html += `<text x="${vb.width / 2}" y="${boxY + 40}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="9" font-style="italic" fill="${PALETTE.accentLight}">${esc(ct.subtitle)}</text>`;
  return html;
}

/**
 * Build a simple compass rose in the top-right corner.
 *
 * @param {Object} cfg
 * @returns {string}
 */
function buildCompassRose(cfg) {
  const vb = cfg.viewBox;
  const cx = vb.width - 55;
  const cy = 55;
  const r = 30;

  let html = "";
  // Outer circle
  html += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${PALETTE.compassFill}" stroke="${PALETTE.compassStroke}" stroke-width="1"/>`;
  // N arrow
  html += `<polygon points="${cx},${cy - r + 4} ${cx - 5},${cy} ${cx + 5},${cy}" fill="${PALETTE.compassStroke}"/>`;
  // S arrow
  html += `<polygon points="${cx},${cy + r - 4} ${cx - 5},${cy} ${cx + 5},${cy}" fill="${PALETTE.accentLight}"/>`;
  // N label
  html += `<text x="${cx}" y="${cy - r - 3}" text-anchor="middle" font-family="Georgia, serif" font-size="8" font-weight="bold" fill="${PALETTE.compassStroke}">N</text>`;

  return html;
}

module.exports = {
  buildSVG,
  PALETTE,
};
