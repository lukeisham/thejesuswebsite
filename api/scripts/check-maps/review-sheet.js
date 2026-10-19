/**
 * Builds one self-contained HTML page for a human to review the maps.
 *
 * For each map the page shows the generated SVG with an optional layer on
 * top: the AD 30 reference places, with their tolerance rings, and the
 * reference roads. A reader can then see by eye where the artwork and the
 * reference disagree, next to the list of findings.
 *
 * @module check-maps/review-sheet
 */

const { escapeHTML } = require("../../lib/escape-html");
const { lonLatToPx, pixelsPerKm } = require("./geo-units");
const { getFeatureByName } = require("./reference");

const SEVERITY_ORDER = ["error", "warn", "info"];

function referenceLayer(cfg, reference) {
  const { bbox, viewBox } = cfg;
  const inside = (f) => f.lng >= bbox.lon_min && f.lng <= bbox.lon_max && f.lat >= bbox.lat_min && f.lat <= bbox.lat_max;
  const parts = [];

  for (const road of reference.roads) {
    const stops = road.via.map((n) => getFeatureByName(reference.features, n)).filter((f) => f && inside(f));
    if (stops.length < 2) continue;
    const points = stops.map((s) => lonLatToPx(cfg, s.lng, s.lat)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    parts.push(`<polyline class="ref-road" points="${points.join(" ")}"><title>${escapeHTML(road.name)}</title></polyline>`);
  }

  for (const f of reference.features) {
    if (!inside(f)) continue;
    const p = lonLatToPx(cfg, f.lng, f.lat);
    const scale = pixelsPerKm(cfg, f.lat);
    // Draw the tolerance ring only when it is big enough to see and small enough to keep the map readable.
    const rx = f.radiusKm * scale.x;
    const ry = f.radiusKm * scale.y;
    if (rx >= 4 && rx < viewBox.width / 3) {
      parts.push(`<ellipse class="ref-ring ref-${escapeHTML(f.kind)}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}"/>`);
    }
    parts.push(`<circle class="ref-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3"/>`);
    parts.push(`<text class="ref-name" x="${(p.x + 5).toFixed(1)}" y="${(p.y - 4).toFixed(1)}">${escapeHTML(f.names[0])}</text>`);
  }

  const { x, y, width, height } = viewBox;
  return `<svg class="ref-layer" viewBox="${x} ${y} ${width} ${height}" aria-hidden="true">${parts.join("")}</svg>`;
}

function findingsList(findings) {
  if (!findings.length) return `<p class="clean">No findings.</p>`;
  const sorted = [...findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
  const rows = sorted
    .map(
      (f) =>
        `<li class="finding finding-${escapeHTML(f.severity)}"><span class="badge">${escapeHTML(f.severity)}</span> <span class="check">${escapeHTML(f.check)}</span> ${escapeHTML(f.message)}</li>`,
    )
    .join("");
  return `<ul class="findings">${rows}</ul>`;
}

/**
 * @param {Array<{mapKey: string, title: string, subtitle: string, svg: string, cfg: Object, findings: Array}>} maps
 * @param {Object} reference - From loadReference().
 * @returns {string} A full HTML document.
 */
function buildReviewSheet(maps, reference) {
  const sections = maps
    .map((m) => {
      const counts = SEVERITY_ORDER.map((s) => `${m.findings.filter((f) => f.severity === s).length} ${s}`).join(", ");
      return `<section>
  <h2>${escapeHTML(m.title)} <small>${escapeHTML(m.mapKey)} · ${escapeHTML(counts)}</small></h2>
  <label class="toggle"><input type="checkbox" checked data-target="${escapeHTML(m.mapKey)}"> Show AD 30 reference layer</label>
  <div class="stack" id="stack-${escapeHTML(m.mapKey)}">${m.svg}${referenceLayer(m.cfg, reference)}</div>
  ${findingsList(m.findings)}
</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Map review sheet</title>
<style>
:root {
  --page: #faf7f2; --text: #2d2620; --muted: #6b5f52; --line: #d8cfc2;
  --error: #b3261e; --warn: #9a6700; --info: #5c6b78; --ref: #1a6fb4; --road: #b3261e;
}
@media (prefers-color-scheme: dark) {
  :root { --page: #1c1915; --text: #ece5da; --muted: #a89c8c; --line: #3b352d; --error: #f2837b; --warn: #e0b04a; --info: #94a3b0; --ref: #6db3ee; --road: #f2837b; }
}
body { margin: 0; padding: 16px; background: var(--page); color: var(--text); font: 15px/1.5 system-ui, sans-serif; }
h1 { margin: 0 0 4px; font-size: 22px; }
.intro { color: var(--muted); max-width: 70ch; }
section { margin: 28px 0; padding-top: 16px; border-top: 1px solid var(--line); }
h2 { font-size: 18px; margin: 0 0 8px; }
h2 small { color: var(--muted); font-weight: normal; font-size: 13px; }
.stack { position: relative; max-width: 760px; }
.stack > svg { display: block; width: 100%; height: auto; }
.stack > .ref-layer { position: absolute; inset: 0; pointer-events: none; }
.ref-layer.hidden { display: none; }
.ref-dot { fill: var(--ref); }
.ref-ring { fill: none; stroke: var(--ref); stroke-width: 0.8; stroke-dasharray: 3 2; opacity: 0.7; }
.ref-sea, .ref-lake { stroke-dasharray: none; opacity: 0.35; }
.ref-name { fill: var(--ref); font: 9px system-ui, sans-serif; paint-order: stroke; stroke: var(--page); stroke-width: 2px; }
.ref-road { fill: none; stroke: var(--road); stroke-width: 1.6; opacity: 0.8; }
.toggle { display: inline-block; margin-bottom: 8px; color: var(--muted); font-size: 13px; }
.findings { padding-left: 0; list-style: none; max-width: 90ch; }
.finding { padding: 4px 0; border-bottom: 1px solid var(--line); }
.badge { display: inline-block; min-width: 3.2em; font-weight: 600; text-transform: uppercase; font-size: 11px; }
.finding-error .badge { color: var(--error); } .finding-warn .badge { color: var(--warn); } .finding-info .badge { color: var(--info); }
.check { color: var(--muted); font-size: 12px; margin-right: 6px; }
.clean { color: var(--muted); }
</style>
</head>
<body>
<h1>Map review sheet</h1>
<p class="intro">Each map is shown with the AD 30 reference on top: blue dots are reference places, dashed rings are the allowed miss, red lines are reference roads. A label that sits outside its ring, or a drawn road far from a red line, is a finding.</p>
${sections}
<script>
document.querySelectorAll("input[data-target]").forEach((box) => {
  box.addEventListener("change", () => {
    document.querySelector("#stack-" + box.dataset.target + " .ref-layer").classList.toggle("hidden", !box.checked);
  });
});
</script>
</body>
</html>
`;
}

module.exports = { buildReviewSheet };
