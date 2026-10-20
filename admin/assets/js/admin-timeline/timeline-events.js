/**
 * Admin timeline events module.
 *
 * Loads timeline events from the API (GET /timeline/admin), renders them as
 * markers along the axis, and runs an edit panel for title and era. Positions
 * come from each event's timeline_period (AdminTimelineAxis) in fixed world
 * coordinates (AdminTimelineGeometry.BASE_PX_PER_PERIOD). Zoom is a CSS
 * transform on the wrapper, so every dot shares one coordinate system. The era
 * heading band sits in the canvas, outside that wrapper.
 *
 * Stored offsets (timeline_offset_x and timeline_offset_y) replace the cluster
 * position. The public page applies the same offsets in
 * frontend/assets/js/timeline/timeline-render.js, with the same two scales
 * (setup/ARCHITECTURE/timeline.md). A node must land on the same spot
 * in both places.
 *
 * Dragging is in timeline-node-drag.js (left drag past 4px, or right drag in
 * SPREAD density) and stages offsets in timeline-staged-changes.js. A click
 * below the drag threshold opens the edit panel. timeline-node-drag.js sets
 * `_timelineDragActive` on a dot at the end of a drag; the dot's click handler
 * here reads it, so the click that ends a drag does not select the event.
 *
 * Every render makes new dots, so the era fade that timeline-era-filter.js
 * applies is lost unless it is applied again: `renderEvents` calls
 * `AdminTimelineEraFilter.reapplyFilter`. The filter finds dots by the
 * `era--<kebab>` class that `createEventElement` sets, and finds labels by
 * `data-event-id`. Change either here and the fade stops matching.
 *
 * Reads the globals published by the timeline bridge
 * (cluster-logic-bridge/timeline-bridge.js: density, placement, labels, label
 * layout, offsets, era heading placement) and AdminTimelineGeometry. All of
 * them load before this file (admin/diagrams/timeline.html).
 * `UpdateRecord.saveEvent` (update-record.js) saves edits. The `era--<kebab>`
 * suffix comes from `AdminEraUtils.eraToKebab` (admin-era-utils.js), loaded
 * before this file; the era stylesheets name the same class.
 *
 * @module admin-timeline/timeline-events
 */

window.AdminTimelineEvents = {};
const Events = window.AdminTimelineEvents;

/* ── State ─────────────────────────────────────────────────────────────────── */

/** @type {Array<Object>} */
let events = [];

/** @type {number|null} */
let selectedEventId = null;

/* ── Initialisation ────────────────────────────────────────────────────────── */

/**
 * Wire the edit panel buttons and keep the era heading band in step with zoom.
 * Needs `AdminTimelineZoom.init` to have run first (timeline.html bootstrap).
 *
 * @returns {void}
 */
Events.init = function () {
  window.AdminTimelineZoom.onTransformChange(Events.syncEraBand);

  const saveBtn = document.getElementById("timeline-event-save-btn");
  if (saveBtn) saveBtn.addEventListener("click", Events.onSaveEvent);

  const cancelBtn = document.getElementById("timeline-event-cancel-btn");
  if (cancelBtn) cancelBtn.addEventListener("click", Events.closeEditPanel);

  const closeBtn = document.getElementById("timeline-event-panel-close");
  if (closeBtn) closeBtn.addEventListener("click", Events.closeEditPanel);
};

/* ── Event loading ─────────────────────────────────────────────────────────── */

/** The "Loading" or load-error line in the canvas. */
let loadStatusEl = null;

/**
 * Show a line of status text in the canvas, outside the zoomed world so that
 * `renderEvents` never removes it.
 *
 * @param {string} text
 * @param {boolean} isError - an error is announced at once; a loading line is not
 * @returns {void}
 */
function showLoadStatus(text, isError) {
  const canvasEl = document.getElementById("timeline-canvas");
  if (!canvasEl) {
    console.warn("timeline-events.js: #timeline-canvas is missing. Status not shown: " + text);
    return;
  }
  if (!loadStatusEl || !loadStatusEl.isConnected) {
    loadStatusEl = document.createElement("p");
    loadStatusEl.className = "admin-timeline-load-status";
    canvasEl.appendChild(loadStatusEl);
  }
  loadStatusEl.setAttribute("role", isError ? "alert" : "status");
  loadStatusEl.textContent = text;
}

/** @returns {void} */
function clearLoadStatus() {
  if (loadStatusEl) loadStatusEl.remove();
  loadStatusEl = null;
}

/**
 * Fetch all timeline events from the API and render them. Called by the
 * timeline.html bootstrap once the session is confirmed, and by
 * timeline-staged-changes.js after a save to show the stored positions.
 *
 * @returns {Promise<void>}
 */
Events.loadEvents = async function () {
  showLoadStatus("Loading\u2026", false);
  try {
    events = await Admin.api.get("/timeline/admin");
    clearLoadStatus();
  } catch (err) {
    console.error("Failed to load timeline events:", err);
    events = [];
    showLoadStatus("Failed to load the timeline. Please refresh the page.", true);
  }
  Events.renderEvents();
};

/**
 * Get an event by its evidence id.
 *
 * @param {number} id
 * @returns {Object|undefined}
 */
Events.getEventById = function (id) {
  for (let i = 0; i < events.length; i++) {
    if (events[i].id === id) return events[i];
  }
  return undefined;
};


/* ── Rendering ─────────────────────────────────────────────────────────────── */

/**
 * Render all event markers and labels onto the timeline axis, and make sure the
 * era heading band exists. Stored and staged offsets replace the
 * cluster-computed positions. Ends by applying the active era fade again,
 * because every render makes new dots.
 *
 * @returns {void}
 */
Events.renderEvents = function () {
  const axisEl = document.getElementById("timeline-axis");
  if (!axisEl) {
    console.warn("timeline-events.js: #timeline-axis is missing. Events are not drawn.");
    return;
  }

  axisEl
    .querySelectorAll(".admin-timeline-event, .admin-timeline-event-label, .admin-timeline-leaders")
    .forEach(function (el) { el.remove(); });

  // The same two scales convert a stored offset to pixels on the public page
  // (frontend/assets/js/timeline/timeline-render.js).
  const basePx = window.AdminTimelineGeometry.BASE_PX_PER_PERIOD;
  const { offsetXToPixels, offsetYToPixels, crossAxisToTopPercent } =
    window.AdminTimelineOffsets;

  // The canonical placement function takes and returns a Map (period -> events).
  const eventsByPeriod = new Map();
  for (const event of events) {
    const period = event.timeline_period || "PreIncarnation";
    if (!eventsByPeriod.has(period)) eventsByPeriod.set(period, []);
    eventsByPeriod.get(period).push(event);
  }

  // Density tiers compare against the effective px-per-period: the base scale
  // times the current zoom. Placement spacing uses the base scale.
  const effectivePx = window.AdminTimelineZoom
    ? window.AdminTimelineZoom.effectivePxPerPeriod()
    : basePx;

  const positionsByPeriod = window.AdminTimelineClusterPlacement.computeDotPositions(
    eventsByPeriod,
    basePx,
  );
  const densityTier = window.AdminTimelineClusterDensity.getClusterDensity(
    null,
    effectivePx,
  );

  const labelDescriptors = [];
  for (const [period, placedDots] of positionsByPeriod) {
    for (const placed of placedDots) {
      labelDescriptors.push({ event: placed.event, timeline_period: period });
    }
  }
  const labelModeByEventId = {};
  for (const { event, mode } of window.AdminTimelineClusterLabels.computeLabelModes(
    labelDescriptors,
    densityTier,
  )) {
    labelModeByEventId[event.id] = mode;
  }

  for (const [period, placedDots] of positionsByPeriod) {
    const slotX = window.AdminTimelineAxis.periodToX(period, basePx);

    for (const placed of placedDots) {
      const ev = placed.event;
      let dotX = slotX + (placed.xFan || 0);
      let dotY = placed.yOffset;

      // Offset precedence: staged (if present) > saved API offset > cluster placement
      let stagedOffset = null;
      if (window.AdminTimelineStaged && window.AdminTimelineStaged.getOffset) {
        stagedOffset = window.AdminTimelineStaged.getOffset(ev.id);
      }

      if (stagedOffset) {
        dotX = slotX + offsetXToPixels(stagedOffset.timeline_offset_x);
        dotY = offsetYToPixels(stagedOffset.timeline_offset_y);
      } else if (ev.timeline_offset_x != null || ev.timeline_offset_y != null) {
        dotX = slotX + offsetXToPixels(ev.timeline_offset_x != null ? ev.timeline_offset_x : 0);
        if (ev.timeline_offset_y != null) {
          dotY = offsetYToPixels(ev.timeline_offset_y);
        }
      }

      // The public renderer converts the cross-axis pixels to the same percentage
      // (crossAxisToTopPercent); a different mapping puts the dot elsewhere.
      const topPercent = crossAxisToTopPercent(dotY) + "%";
      const labelMode = labelModeByEventId[ev.id] || "full";
      axisEl.appendChild(Events.createEventElement(ev, dotX, topPercent));

      if (labelMode !== "hidden") {
        const labelEl = createLabelElement(ev, labelMode, dotX, topPercent);
        if (labelEl) axisEl.appendChild(labelEl);
      }
    }
  }

  // timeline-node-drag.js listens on #timeline-axis by delegation, so the new dots
  // need no listeners of their own. The call is idempotent and makes sure that
  // the two delegated listeners exist.
  if (window.AdminTimelineNodeDrag && window.AdminTimelineNodeDrag.attachDragListeners) {
    window.AdminTimelineNodeDrag.attachDragListeners();
  }

  Events.relayoutLabels(false);

  Events.renderEraBand();

  if (window.AdminTimelineEraFilter) window.AdminTimelineEraFilter.reapplyFilter();
};

/**
 * Create the title label for one dot. Labels are siblings of the dots in
 * #timeline-axis, the same DOM shape as the public page, and carry
 * `data-event-id` so `relayoutLabels` and the era filter can pair them with
 * their dot.
 *
 * @param {Object} ev
 * @param {string} labelMode - "full"|"truncated" ("hidden" has no label)
 * @param {number} x - the dot's x position, in world pixels
 * @param {string} topPercent - the dot's top as a CSS percentage string
 * @returns {HTMLElement|null} null when the event has no title
 */
function createLabelElement(ev, labelMode, x, topPercent) {
  let labelText = ev.title || "";
  if (labelMode === "truncated" && labelText.length > 28) {
    labelText = labelText.slice(0, 26) + "…";
  }
  if (!labelText) return null;

  const label = document.createElement("span");
  label.className = labelMode === "truncated"
    ? "admin-timeline-event-label label--truncated"
    : "admin-timeline-event-label";
  // Starts at the dot; relayoutLabels moves it beside the dot.
  label.style.left = x + "px";
  label.style.top = topPercent;
  label.textContent = labelText;
  label.dataset.eventId = String(ev.id);
  return label;
}

/**
 * Create a DOM element for a single timeline event marker.
 *
 * @param {Object} ev
 * @param {number} x - x position on the axis, in world pixels
 * @param {string} y - y position as a CSS percentage string, e.g. "62%"
 * @returns {HTMLElement}
 */
Events.createEventElement = function (ev, x, y) {
  const el = document.createElement("button");
  // timeline-era-filter.js and the dot CSS select on this class.
  const eraClass = AdminEraUtils.eraToKebab(ev.timeline_era || "");

  // Category class hook
  var cat = ev.gospel_category || "";
  var catClass = "";
  if (cat === "places") catClass = "dot-cat--place";
  else if (cat === "people") catClass = "dot-cat--person";
  else if (cat === "objects") catClass = "dot-cat--object";

  el.className = [
    "admin-timeline-event",
    eraClass ? "era--" + eraClass : "",
    catClass,
  ]
    .filter(Boolean)
    .join(" ");
  el.style.position = "absolute";
  el.style.left = x + "px";
  el.style.top = y;
  el.setAttribute("aria-label", ev.title || "Timeline event");
  el.title = ev.title || "";
  el.dataset.eventId = String(ev.id);
  el.type = "button";

  if (ev.id === selectedEventId) {
    el.classList.add("admin-timeline-event--selected");
  }

  el.addEventListener("click", function (e) {
    e.stopPropagation();
    // timeline-node-drag.js sets this flag at the end of a drag. That click
    // ends the drag; it is not a request to select the event.
    if (el._timelineDragActive) {
      delete el._timelineDragActive;
      return;
    }
    Events.selectEvent(ev.id);
  });

  return el;
};

const SVG_NS = "http://www.w3.org/2000/svg";

/** The leader-line layer and what it connects, kept for the animation frames. */
let leaderLayer = null;
let leaderTargets = [];
let leaderFrame = 0;

/**
 * Draw the leader lines from the start of each moved title to its dot. A label
 * that is gliding is read from its computed position, so the line and the title
 * stay joined for the whole move.
 */
function drawLeaders() {
  if (!leaderLayer) return;
  const layout = window.AdminTimelineClusterLabelLayout;
  leaderLayer.replaceChildren();

  for (const target of leaderTargets) {
    const style = window.getComputedStyle(target.label);
    const shown = {
      left: parseFloat(style.left),
      top: parseFloat(style.top),
      width: target.spot.width,
      height: target.spot.height,
      side: target.spot.side,
    };
    const line = layout.computeLeaderLine(target.node, layout.DOT_CLEARANCE_PX - 2, shown);
    const el = document.createElementNS(SVG_NS, "line");
    el.setAttribute("x1", String(line.x1));
    el.setAttribute("y1", String(line.y1));
    el.setAttribute("x2", String(line.x2));
    el.setAttribute("y2", String(line.y2));
    leaderLayer.appendChild(el);
  }
}

/**
 * Keep the leader lines in step with gliding labels. The window is twice the
 * label `left`/`top` transition (`--duration-fast`, 150ms, in timeline-dots.css);
 * lengthen the transition and the lines stop following before the label arrives.
 */
function followGlidingLabels() {
  cancelAnimationFrame(leaderFrame);
  const until = performance.now() + 300;
  const tick = function () {
    drawLeaders();
    if (performance.now() < until) leaderFrame = requestAnimationFrame(tick);
  };
  tick();
}

/**
 * Place every title beside its dot, and draw a leader line for each title that
 * had to move. The placement is `layoutLabelsBesideNodes`, the function that
 * the public timeline calls (cluster-logic-bridge/timeline-bridge.js),
 * so a title sits where the editor shows it. `renderEvents` calls this after it
 * attaches the labels; `timeline-node-drag.js` calls it while a node is dragged
 * and when it is dropped.
 *
 * With `glide` true the labels move from where they were to where they now go
 * (the `left` and `top` transition in timeline-dots.css) and the leader lines
 * follow them.
 *
 * @param {boolean} glide - animate the move
 * @returns {void}
 */
Events.relayoutLabels = function (glide) {
  const axisEl = document.getElementById("timeline-axis");
  if (!axisEl) {
    console.warn("timeline-events.js: #timeline-axis is missing. Labels are not placed.");
    return;
  }
  const layout = window.AdminTimelineClusterLabelLayout;
  if (!layout) {
    console.warn(
      "timeline-events.js: window.AdminTimelineClusterLabelLayout is missing. Labels are not placed.",
    );
    return;
  }

  const fieldHeight = window.AdminTimelineGeometry.CANVAS_HEIGHT_PX;
  const dots = [...axisEl.querySelectorAll(".admin-timeline-event")];
  const labelById = {};
  axisEl.querySelectorAll(".admin-timeline-event-label").forEach(function (label) {
    labelById[label.dataset.eventId] = label;
  });

  const nodes = dots.map(function (dot) {
    const label = labelById[dot.dataset.eventId];
    return {
      x: parseFloat(dot.style.left),
      y: (parseFloat(dot.style.top) / 100) * fieldHeight,
      width: label ? label.offsetWidth : 0,
      height: label ? label.offsetHeight : 0,
    };
  });
  const placed = layout.layoutLabelsBesideNodes(nodes, {
    width: axisEl.offsetWidth,
    height: fieldHeight,
  });

  if (!glide) {
    for (const label of Object.values(labelById)) label.style.transition = "none";
  }

  leaderTargets = [];
  dots.forEach(function (dot, i) {
    const label = labelById[dot.dataset.eventId];
    const spot = placed[i];
    // A height of 0 is a node without a visible label; it has nothing to place.
    if (!label || !spot || spot.height === 0) return;

    label.style.left = spot.left + "px";
    label.style.top = spot.top + "px";
    label.classList.toggle("admin-timeline-event-label--left", spot.side === "left");
    if (spot.leader) leaderTargets.push({ label: label, node: nodes[i], spot: spot });
  });

  if (!leaderLayer || !leaderLayer.isConnected) {
    leaderLayer = document.createElementNS(SVG_NS, "svg");
    leaderLayer.setAttribute("class", "admin-timeline-leaders");
    leaderLayer.setAttribute("aria-hidden", "true");
    axisEl.appendChild(leaderLayer);
  }
  leaderLayer.setAttribute("width", String(axisEl.offsetWidth));
  leaderLayer.setAttribute("height", String(fieldHeight));
  leaderLayer.setAttribute("viewBox", "0 0 " + axisEl.offsetWidth + " " + fieldHeight);

  if (glide) {
    followGlidingLabels();
    return;
  }

  void axisEl.offsetWidth; // apply the positions before the transition is back on
  for (const label of Object.values(labelById)) label.style.transition = "";
  drawLeaders();
};

/* ── Era heading band ──────────────────────────────────────────────────────── */

/** The band element, and the pieces of each era in it. */
let bandEl = null;
let bandTrackEl = null;
/** @type {Array<{era: string, heading: HTMLElement, bar: HTMLElement, leader: HTMLElement}>} */
let bandItems = [];
/** Heading widths in px by era key. The heading size does not change with zoom. */
let bandTextWidths = {};
/** Zoom scale that the band was last laid out for. */
let bandScale = null;

/**
 * Build the era heading band at the top of the canvas, outside the zoomed
 * world, and lay it out for the current zoom and pan. The placement comes from
 * `computeEraBandLayout`, the function that the public timeline uses
 * (cluster-logic-bridge/timeline-bridge.js). Called by
 * `renderEvents`; the band is built once and kept.
 *
 * @param {boolean} [rebuild] - build it again, for example after fonts load
 * @returns {void}
 */
Events.renderEraBand = function (rebuild) {
  const canvasEl = document.getElementById("timeline-canvas");
  if (!canvasEl) {
    console.warn("timeline-events.js: #timeline-canvas is missing. Era headings are not drawn.");
    return;
  }
  if (!window.AdminTimelineEraHeadingPlacement) {
    console.warn(
      "timeline-events.js: window.AdminTimelineEraHeadingPlacement is missing. Era headings are not drawn.",
    );
    return;
  }
  if (bandEl && bandEl.isConnected && !rebuild) return;

  const eraLabels = window.AdminTimelineGeometry.ERA_LABELS;
  const eras = Object.keys(window.AdminTimelineGeometry.ERA_BOUNDARIES);

  if (bandEl) bandEl.remove();
  bandEl = document.createElement("div");
  bandEl.className = "admin-timeline-heading-band";
  bandTrackEl = document.createElement("div");
  bandTrackEl.className = "admin-timeline-heading-band__track";
  bandItems = [];

  for (const era of eras) {
    const kebab = AdminEraUtils.eraToKebab(era);
    const heading = document.createElement("h3");
    heading.className = "admin-timeline-era-heading era--" + kebab;
    heading.textContent = eraLabels[era] || era;
    const bar = document.createElement("span");
    bar.className = "admin-timeline-era-bar era--" + kebab;
    const leader = document.createElement("span");
    leader.className = "admin-timeline-era-leader era--" + kebab;
    bandTrackEl.append(bar, leader, heading);
    bandItems.push({ era: era, heading: heading, bar: bar, leader: leader });
  }

  bandEl.appendChild(bandTrackEl);
  canvasEl.appendChild(bandEl);

  bandTextWidths = {};
  for (const item of bandItems) {
    bandTextWidths[item.era] = item.heading.offsetWidth;
  }

  bandScale = null;
  const pan = window.AdminTimelineZoom.getPan();
  Events.syncEraBand({ panX: pan.x, scale: window.AdminTimelineZoom.getScale() });

  // Fonts that load late change the heading widths; measure again once.
  if (!rebuild && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      Events.renderEraBand(true);
    });
  }
};

/**
 * Bring the band in step with the world transform. A zoom change lays the band
 * out again; a pan only shifts the track. Registered with
 * `AdminTimelineZoom.onTransformChange` in `Events.init`.
 *
 * @param {{panX: number, scale: number}} state
 * @returns {void}
 */
Events.syncEraBand = function (state) {
  if (!bandEl || !bandEl.isConnected) return;

  if (state.scale !== bandScale) {
    bandScale = state.scale;
    const layout = window.AdminTimelineEraHeadingPlacement.computeEraBandLayout(
      window.AdminTimelineGeometry.ERA_BOUNDARIES,
      window.AdminTimelineGeometry.BASE_PX_PER_PERIOD * state.scale,
      bandTextWidths,
    );
    for (const entry of layout) {
      const item = bandItems.find(function (i) { return i.era === entry.era; });
      if (!item) continue;
      item.heading.style.left = entry.textX + "px";
      item.heading.style.setProperty("--lane", String(entry.lane));
      item.bar.style.left = entry.x + 1 + "px";
      item.bar.style.width = Math.max(0, entry.width - 3) + "px";
      item.leader.style.left = entry.x + 1 + "px";
      item.leader.style.setProperty("--lane", String(entry.lane));
      item.leader.hidden = !entry.leader;
    }
  }

  bandTrackEl.style.transform = "translateX(" + Math.round(state.panX * 2) / 2 + "px)";
};

/* ── Selection & edit panel ────────────────────────────────────────────────── */

/**
 * Select an event and open the edit panel.
 *
 * @param {number} eventId
 * @returns {void}
 */
Events.selectEvent = function (eventId) {
  selectedEventId = eventId;
  Events.renderEvents();
  Events.openEditPanel(eventId);
};

/**
 * Open the slide-in event edit panel.
 *
 * @param {number} eventId
 * @returns {void}
 */
Events.openEditPanel = function (eventId) {
  const panel = document.getElementById("timeline-event-panel");
  if (!panel) return;

  const ev = Events.getEventById(eventId);
  if (!ev) return;

  document.getElementById("timeline-event-title-input").value = ev.title || "";
  document.getElementById("timeline-event-period-display").textContent = (
    ev.timeline_period || "Unknown"
  ).replace(/([a-z])([A-Z])/g, "$1 $2");
  document.getElementById("timeline-event-slug-display").textContent =
    ev.slug || "";

  // Era dropdown
  const eraSelect = document.getElementById("timeline-event-era-select");
  if (eraSelect) eraSelect.value = ev.timeline_era || "PreIncarnation";

  panel.classList.add("admin-timeline-panel--open");
};

/**
 * Close the event edit panel and clear the selection.
 *
 * @returns {void}
 */
Events.closeEditPanel = function () {
  const panel = document.getElementById("timeline-event-panel");
  if (panel) panel.classList.remove("admin-timeline-panel--open");
  selectedEventId = null;
  Events.renderEvents();
};

/* ── Save / Remove event ───────────────────────────────────────────────────── */

/**
 * Save the title and era from the edit panel. The save button is disabled while
 * the request runs, so a second click cannot send a second save.
 *
 * @returns {Promise<void>}
 */
Events.onSaveEvent = async function () {
  if (!selectedEventId) return;

  const title = document
    .getElementById("timeline-event-title-input")
    .value.trim();
  const eraSelect = document.getElementById("timeline-event-era-select");
  const era = eraSelect ? eraSelect.value : null;

  const errorEl = document.getElementById("timeline-event-error");
  if (errorEl) errorEl.textContent = "";

  if (!title) {
    if (errorEl) errorEl.textContent = "Title is required.";
    return;
  }

  const saveBtn = document.getElementById("timeline-event-save-btn");
  if (saveBtn) saveBtn.disabled = true;

  try {
    const payload = { title: title };
    if (era) payload.timeline_era = era;

    const updated = await UpdateRecord.saveEvent(selectedEventId, payload);

    for (let i = 0; i < events.length; i++) {
      if (events[i].id === selectedEventId) {
        events[i].title = updated.title;
        events[i].timeline_era = updated.timeline_era;
        break;
      }
    }

    Events.closeEditPanel();
  } catch (err) {
    console.error("Failed to save timeline event:", err);
    if (errorEl) errorEl.textContent = err.message;
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
};


/* ── Era mapping ───────────────────────────────────────────────────────────── */

/**
 * Determine which era a period belongs to, from the era boundaries in
 * AdminTimelineGeometry. A period that is not in the canonical order sorts
 * last, so it belongs to the final era.
 *
 * @param {string} period
 * @returns {string}
 */
Events.eraForPeriod = function (period) {
  const periodIndex = window.AdminTimelineAxis.periodOrdinal(period);
  const boundaries = window.AdminTimelineGeometry.ERA_BOUNDARIES;
  const eraKeys = Object.keys(boundaries);

  for (const era of eraKeys) {
    if (periodIndex <= boundaries[era].end) return era;
  }
  return eraKeys[eraKeys.length - 1];
};
