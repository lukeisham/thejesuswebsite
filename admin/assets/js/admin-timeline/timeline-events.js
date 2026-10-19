/**
 * Admin timeline events module.
 *
 * Loads timeline events from the API, renders them as markers along the axis,
 * and runs an edit panel for title and era. Positions come from each event's
 * timeline_period (AdminTimelineAxis) in fixed world coordinates
 * (AdminTimelineGeometry.BASE_PX_PER_PERIOD). Zoom is a CSS transform on the
 * wrapper, so every dot and heading shares one coordinate system.
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
 * Render all event markers, labels and era headings onto the timeline axis.
 * Stored and staged offsets replace the cluster-computed positions.
 */
Events.renderEvents = function () {
  const axisEl = document.getElementById("timeline-axis");
  if (!axisEl) return;

  // Remove existing event markers and era headings
  const existing = axisEl.querySelectorAll(".admin-timeline-event");
  for (let i = 0; i < existing.length; i++) {
    existing[i].remove();
  }
  const existingHeadings = axisEl.querySelectorAll(".admin-timeline-era-heading");
  for (let i = 0; i < existingHeadings.length; i++) {
    existingHeadings[i].remove();
  }

  // The same two scales convert a stored offset to pixels on the public page
  // (frontend/assets/js/timeline/timeline-render.js).
  const basePx = window.AdminTimelineGeometry.BASE_PX_PER_PERIOD;
  const canvasHeightPx = window.AdminTimelineGeometry.CANVAS_HEIGHT_PX;
  const { LABEL_CLEARANCE_PCT, TIER_STEP_PCT } =
    window.AdminTimelineClusterLabelCollision;
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

  // Event bounding boxes in world coordinates, so era headings avoid the dots
  // (the public renderer collects the same boxes).
  const eventBounds = [];

  for (const [period2, periodPositions2] of positions) {
    const baseX = window.AdminTimelineAxis.periodToX(period2, basePx);

    for (let pi2 = 0; pi2 < periodPositions2.length; pi2++) {
      const pos = periodPositions2[pi2];
      const ev2 = pos.event;
      const yOffset = pos.yOffset;
      const xFan = pos.xFan || 0;

      let finalX = baseX + xFan;
      let finalY = yOffset;

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

      eventBounds.push({
        era: ev2.timeline_era || "",
        x: finalX,
        y: 0,
        width: 10,
        height: 10,
      });

      // Labels are siblings of the dots, the same DOM shape as the public page.
      if (mode !== "hidden") {
        let labelText = ev2.title || "";
        if (mode === "truncated" && labelText.length > 28) {
          labelText = labelText.slice(0, 26) + "…";
        }
        if (labelText) {
          const labelTop = yOffset <= 0
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

  // Resolve label overlaps once, after every label is attached.
  if (window.AdminTimelineLabelCollision) {
    const labelEls = axisEl.querySelectorAll(".admin-timeline-event-label");
    window.AdminTimelineLabelCollision.resolve(
      Array.prototype.slice.call(labelEls),
      "x",
      TIER_STEP_PCT,
    );
  } else {
    console.warn(
      "timeline-events.js: window.AdminTimelineLabelCollision is missing. Labels are not collision-resolved.",
    );
  }

  // Era headings use the placement module that the public page uses
  // (cluster-logic-bridge/timeline-era-heading-placement-bridge.js). The editor
  // is desktop only, so the mobile flag is false. Headings are placed after
  // label collision so they avoid the final label positions, not only the dots.
  if (
    window.AdminTimelineEraHeadingPlacement &&
    window.AdminTimelineEraHeadingPlacement.computeEraHeadingPositions
  ) {
    const eraBoundaries = window.AdminTimelineGeometry.ERA_BOUNDARIES;
    const eraScale = window.AdminTimelineZoom ? window.AdminTimelineZoom.getScale() : 1.0;
    const canvasWidth = window.AdminTimelineAxis.totalWidth(basePx);

    const allBounds = eventBounds.concat(Events.measureLabelBounds(axisEl));

    const headings = window.AdminTimelineEraHeadingPlacement.computeEraHeadingPositions(
      eraBoundaries,
      allBounds,
      eraScale,
      canvasWidth,
      canvasHeightPx,
      false,
    );

    for (let hi = 0; hi < (headings || []).length; hi++) {
      const h = headings[hi];
      const eraKebab = h.era
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/\s+/g, "-")
        .toLowerCase();
      const headingEl = document.createElement("h3");
      headingEl.className = "admin-timeline-era-heading era--" + eraKebab + " tier-" + h.tier;
      headingEl.style.position = "absolute";
      headingEl.style.left = h.x + "px";
      headingEl.style.top = h.y + "px";
      headingEl.textContent = window.AdminTimelineGeometry.ERA_LABELS[h.era] || h.era;
      axisEl.appendChild(headingEl);
    }
  } else {
    console.warn(
      "timeline-events.js: window.AdminTimelineEraHeadingPlacement is missing. Era headings are not drawn.",
    );
  }
};

/**
 * Measure each visible event label in world coordinates (the space of the
 * axis element), so era headings can avoid label text. Labels must already
 * be attached and their collision shifts applied.
 *
 * @param {HTMLElement} axisEl
 * @returns {Array<{era:string,x:number,y:number,width:number,height:number}>}
 */
Events.measureLabelBounds = function (axisEl) {
  var axisRect = axisEl.getBoundingClientRect();
  // Screen size divided by layout size gives the current zoom scale.
  var scale = axisEl.offsetWidth > 0 ? axisRect.width / axisEl.offsetWidth : 0;
  if (!isFinite(scale) || scale <= 0) return [];

  var bounds = [];
  var labelEls = axisEl.querySelectorAll(".admin-timeline-event-label");
  for (var i = 0; i < labelEls.length; i++) {
    var rect = labelEls[i].getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    bounds.push({
      era: "",
      kind: "label",
      x: (rect.left - axisRect.left) / scale,
      y: (rect.top - axisRect.top) / scale,
      width: rect.width / scale,
      height: rect.height / scale,
    });
  }
  return bounds;
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
