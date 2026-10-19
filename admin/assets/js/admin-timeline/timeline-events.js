/**
 * Admin timeline events module.
 *
 * Loads timeline events from the API, renders them as markers along the axis,
 * and runs an edit panel for title and era. Positions come from each event's
 * timeline_period (AdminTimelineAxis) in fixed world coordinates
 * (AdminTimelineGeometry.BASE_PX_PER_PERIOD). Zoom is a CSS transform on the
 * wrapper, so every dot shares one coordinate system. The era heading band sits
 * in the canvas, outside that wrapper.
 *
 * Stored offsets (timeline_offset_x and timeline_offset_y) replace the cluster
 * position. The public page applies the same offsets in
 * frontend/assets/js/timeline/timeline-render.js, with the same two scales
 * (setup/ARCHITECTURE/node-cluster-logic.md). A node must land on the same spot
 * in both places.
 *
 * Dragging is in timeline-node-drag.js (left drag past 4px, or right drag in
 * SPREAD density) and stages offsets in timeline-staged-changes.js. A click
 * below the drag threshold opens the edit panel.
 *
 * Reads the globals published by the cluster-logic bridges, the label-collision
 * adapter (timeline-label-collision.js) and AdminTimelineGeometry. All of them
 * load before this file (admin/diagrams/timeline.html). UpdateRecord saves edits.
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

/** @type {Object|null}  Event currently being dragged. */
let dragState = null;

/* ── Initialisation ────────────────────────────────────────────────────────── */

/**
 * Wire DOM events for the event edit panel.
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

/**
 * Fetch all timeline events from the API.
 *
 * @returns {Promise<void>}
 */
Events.loadEvents = async function () {
  try {
    events = await Admin.api.get("/timeline/admin");
  } catch (err) {
    console.error("Failed to load timeline events:", err);
    events = [];
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
 * cluster-computed positions.
 */
Events.renderEvents = function () {
  const axisEl = document.getElementById("timeline-axis");
  if (!axisEl) return;

  // Remove existing event markers
  const existing = axisEl.querySelectorAll(".admin-timeline-event");
  for (let i = 0; i < existing.length; i++) {
    existing[i].remove();
  }

  // The same two scales convert a stored offset to pixels on the public page
  // (frontend/assets/js/timeline/timeline-render.js).
  const basePx = window.AdminTimelineGeometry.BASE_PX_PER_PERIOD;
  const { LABEL_CLEARANCE_PCT } = window.AdminTimelineClusterLabelCollision;
  const { offsetXToPixels, offsetYToPixels, crossAxisToTopPercent } =
    window.AdminTimelineOffsets;

  // Group events by period for clustering. The canonical placement function
  // takes and returns a Map (period -> events).
  const byPeriod = new Map();
  for (let j = 0; j < events.length; j++) {
    const evGroup = events[j];
    const periodGroup = evGroup.timeline_period || "PreIncarnation";
    if (!byPeriod.has(periodGroup)) byPeriod.set(periodGroup, []);
    byPeriod.get(periodGroup).push(evGroup);
  }

  // Density tiers compare against the effective px-per-period: the base scale
  // times the current zoom. Placement spacing uses the base scale.
  const effectivePx = window.AdminTimelineZoom
    ? window.AdminTimelineZoom.effectivePxPerPeriod()
    : basePx;

  const positions = window.AdminTimelineClusterPlacement.computeDotPositions(
    byPeriod,
    basePx,
  );
  const densityTier = window.AdminTimelineClusterDensity.getClusterDensity(
    null,
    effectivePx,
  );

  // Build flat descriptor list for label modes
  const flatDescs = [];
  for (const [period, periodPositions] of positions) {
    for (const placed of periodPositions) {
      flatDescs.push({ event: placed.event, timeline_period: period });
    }
  }
  const labelModes = window.AdminTimelineClusterLabels.computeLabelModes(
    flatDescs,
    densityTier,
  );
  const modeByEventId = {};
  for (let lm = 0; lm < labelModes.length; lm++) {
    modeByEventId[labelModes[lm].event.id] = labelModes[lm].mode;
  }

  for (const [period2, periodPositions2] of positions) {
    const baseX = window.AdminTimelineAxis.periodToX(period2, basePx);

    for (let pi2 = 0; pi2 < periodPositions2.length; pi2++) {
      const pos = periodPositions2[pi2];
      const ev2 = pos.event;
      const xFan = pos.xFan || 0;

      let finalX = baseX + xFan;
      let finalY = pos.yOffset;

      // Offset precedence: staged (if present) > saved API offset > cluster placement
      let stagedOffset = null;
      if (window.AdminTimelineStaged && window.AdminTimelineStaged.getOffset) {
        stagedOffset = window.AdminTimelineStaged.getOffset(ev2.id);
      }

      if (stagedOffset) {
        finalX = baseX + offsetXToPixels(stagedOffset.timeline_offset_x);
        finalY = offsetYToPixels(stagedOffset.timeline_offset_y);
      } else if (
        ev2.timeline_offset_x != null ||
        ev2.timeline_offset_y != null
      ) {
        finalX = baseX + offsetXToPixels(ev2.timeline_offset_x != null ? ev2.timeline_offset_x : 0);
        if (ev2.timeline_offset_y != null) {
          finalY = offsetYToPixels(ev2.timeline_offset_y);
        }
      }

      // The public renderer places dots at the same percentage.
      const y = crossAxisToTopPercent(finalY) + "%";
      const mode = modeByEventId[ev2.id] || "full";
      const el2 = Events.createEventElement(ev2, finalX, y, finalY, mode);
      axisEl.appendChild(el2);

      // Labels are siblings of the dots, the same DOM shape as the public page.
      if (mode !== "hidden") {
        let labelText = ev2.title || "";
        if (mode === "truncated" && labelText.length > 28) {
          labelText = labelText.slice(0, 26) + "…";
        }
        if (labelText) {
          // The side follows the final position, as on the public page.
          const labelTop = finalY <= 0
            ? crossAxisToTopPercent(finalY) - LABEL_CLEARANCE_PCT
            : crossAxisToTopPercent(finalY) + LABEL_CLEARANCE_PCT;
          const label = document.createElement("span");
          const labelClasses = ["admin-timeline-event-label"];
          if (mode === "truncated") labelClasses.push("label--truncated");
          label.className = labelClasses.join(" ");
          label.style.position = "absolute";
          label.style.left = finalX + "px";
          label.style.top = labelTop + "%";
          label.style.transform = "translateX(-50%)";
          label.style.maxWidth = "100px";
          label.style.textAlign = "center";
          label.style.fontSize = "var(--text-2xs)";
          label.style.fontFamily = "var(--font-sans)";
          label.style.color = "var(--text-primary)";
          label.style.whiteSpace = "nowrap";
          label.style.pointerEvents = "none";
          label.style.userSelect = "none";
          label.style.lineHeight = "var(--leading-small)";
          label.textContent = labelText;
          label.dataset.eventId = String(ev2.id);
          label.dataset.tierIndex = "0";
          // Read back by timeline-label-collision.js when it applies a tier.
          label.dataset.originalTop = labelTop + "%";
          axisEl.appendChild(label);
        }
      }
    }
  }

  // Attach left- and right-click drag listeners to all dots
  if (window.AdminTimelineNodeDrag && window.AdminTimelineNodeDrag.attachDragListeners) {
    window.AdminTimelineNodeDrag.attachDragListeners();
  }

  Events.relayoutLabels(false);

  Events.renderEraBand();
};

/**
 * Create a DOM element for a single timeline event marker.
 *
 * @param {Object} ev
 * @param {number} x        - x position on the axis, in world pixels
 * @param {string} y        - y position as a CSS percentage string, e.g. "62%"
 * @param {number} yOffset  - stagger offset from cluster placement
 * @param {string} labelMode - "full"|"truncated"|"hidden"
 * @returns {HTMLElement}
 */
Events.createEventElement = function (ev, x, y, yOffset, labelMode) {
  const el = document.createElement("button");
  // Era class hook (kebab-case)
  var eraStr = ev.timeline_era || "";
  var eraKebab = eraStr
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();

  // Category class hook
  var cat = ev.gospel_category || "";
  var catClass = "";
  if (cat === "places") catClass = "dot-cat--place";
  else if (cat === "people") catClass = "dot-cat--person";
  else if (cat === "objects") catClass = "dot-cat--object";

  el.className = [
    "admin-timeline-event",
    eraKebab ? "era--" + eraKebab : "",
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

/**
 * Resolve label overlaps again for the labels that are on the axis now.
 *
 * Every label goes back to its base position (`data-original-top`, tier 0) and
 * the collision adapter (timeline-label-collision.js) works out the tiers. This
 * is also how `renderEvents` places labels, so a drag and a full render give the
 * same result. `timeline-node-drag.js` calls it while a node is dragged and when
 * it is dropped, after it has moved the dragged label's `data-original-top`.
 *
 * With `glide` true, each label moves from where it was to where it now goes
 * instead of jumping (the `top` transition in timeline-dots.css). The
 * transition is off while the adapter measures, because the adapter reads the
 * labels' current rectangles.
 *
 * @param {boolean} glide - animate the move
 * @returns {void}
 */
Events.relayoutLabels = function (glide) {
  const axisEl = document.getElementById("timeline-axis");
  if (!axisEl) return;
  if (!window.AdminTimelineLabelCollision) {
    console.warn(
      "timeline-events.js: window.AdminTimelineLabelCollision is missing. Labels are not collision-resolved.",
    );
    return;
  }

  const labels = Array.prototype.slice.call(
    axisEl.querySelectorAll(".admin-timeline-event-label"),
  );
  const before = labels.map(function (label) { return label.style.top; });

  for (const label of labels) {
    label.style.transition = "none";
    label.style.top = label.dataset.originalTop;
    label.dataset.tierIndex = "0";
  }
  window.AdminTimelineLabelCollision.resolve(
    labels,
    "x",
    window.AdminTimelineClusterLabelCollision.TIER_STEP_PCT,
  );

  if (!glide) {
    for (const label of labels) label.style.transition = "";
    return;
  }

  const after = labels.map(function (label) { return label.style.top; });
  labels.forEach(function (label, i) { label.style.top = before[i] || after[i]; });
  void axisEl.offsetWidth; // flush the start position before the transition is back on
  labels.forEach(function (label, i) {
    label.style.transition = "";
    label.style.top = after[i];
  });
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
 * Class suffix for an era key: "GalileeMinistry" becomes "galilee-ministry".
 *
 * @param {string} era
 * @returns {string}
 */
function eraKebab(era) {
  return era
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

/**
 * Build the era heading band at the top of the canvas, outside the zoomed
 * world, and lay it out for the current zoom and pan. The placement comes from
 * `computeEraBandLayout`, the function that the public timeline uses
 * (cluster-logic-bridge/timeline-era-heading-placement-bridge.js). Called by
 * `renderEvents`; the band is built once and kept.
 *
 * @param {boolean} [rebuild] - build it again, for example after fonts load
 * @returns {void}
 */
Events.renderEraBand = function (rebuild) {
  const canvasEl = document.getElementById("timeline-canvas");
  if (!canvasEl) return;
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
    const kebab = eraKebab(era);
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
 * Close the event edit panel.
 */
Events.closeEditPanel = function () {
  const panel = document.getElementById("timeline-event-panel");
  if (panel) panel.classList.remove("admin-timeline-panel--open");
  selectedEventId = null;
  Events.renderEvents();
};

/* ── Save / Remove event ───────────────────────────────────────────────────── */

/**
 * Save event edits.
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

  try {
    const payload = { title: title };
    if (era) payload.timeline_era = era;

    const updated = await UpdateRecord.saveEvent(selectedEventId, payload);

    // Update local state
    for (let i = 0; i < events.length; i++) {
      if (events[i].id === selectedEventId) {
        events[i].title = updated.title;
        events[i].timeline_era = updated.timeline_era;
        break;
      }
    }

    Events.closeEditPanel();
    Events.renderEvents();
  } catch (err) {
    if (errorEl) errorEl.textContent = err.message;
  }
};


/* ── Era mapping ───────────────────────────────────────────────────────────── */

/**
 * Determine which era a period belongs to.
 *
 * @param {string} period
 * @returns {string}
 */
Events.eraForPeriod = function (period) {
  const ord = window.AdminTimelineAxis.periodOrdinal(period);

  if (ord <= 0) return "PreIncarnation";
  if (ord <= 1) return "OldTestament";
  if (ord <= 5) return "EarlyLife";
  if (ord <= 8) return "Life";
  if (ord <= 12) return "GalileeMinistry";
  if (ord <= 17) return "JudeanMinistry";
  if (ord <= 33) return "PassionWeek";
  return "Post-Passion";
};
