/**
 * Admin timeline events module.
 *
 * Loads timeline events from the API, renders them as draggable markers along
 * the axis, and supports an edit panel for title/date/era.
 * Positions are derived from each event's timeline_period via AdminTimelineAxis.
 *
 * Right-click drag (within SPREAD density) repositions dots via AdminTimelineNodeDrag.
 * Left-click opens the edit panel; left-drag (period moves) has been removed.
 *
 * Depends on AdminTimelineAxis for positioning and UpdateRecord for persistence.
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
 * Render all event markers onto the timeline axis.
 * Applies stored/staged offsets on top of cluster-computed positions.
 */
Events.renderEvents = function () {
  const axisEl = document.getElementById("timeline-axis");
  if (!axisEl) return;

  // Remove existing event markers
  const existing = axisEl.querySelectorAll(".admin-timeline-event");
  for (let i = 0; i < existing.length; i++) {
    existing[i].remove();
  }

  const pxPerPeriod = window.AdminTimelineAxis.getPxPerPeriod();
  const offsetX = window.AdminTimelineZoom
    ? window.AdminTimelineZoom.getPanOffset()
    : 0;

  // Group events by period for clustering
  var byPeriod = {};
  for (var j = 0; j < events.length; j++) {
    var evGroup = events[j];
    var periodGroup = evGroup.timeline_period || "PreIncarnation";
    if (!byPeriod[periodGroup]) byPeriod[periodGroup] = [];
    byPeriod[periodGroup].push(evGroup);
  }

  // Use clustering modules for placement and label modes
  var positions = window.AdminTimelineClusterPlacement.computeDotPositions(
    byPeriod,
    pxPerPeriod,
  );
  var densityTier = window.AdminTimelineClusterDensity.getClusterDensity(
    null,
    pxPerPeriod,
  );

  // Build flat descriptor list for label modes
  var flatDescs = [];
  var periodPosKeys = Object.keys(positions);
  for (var pk = 0; pk < periodPosKeys.length; pk++) {
    var pp = periodPosKeys[pk];
    var ppPositions = positions[pp];
    for (var pi = 0; pi < ppPositions.length; pi++) {
      flatDescs.push({ event: ppPositions[pi].event, timeline_period: pp });
    }
  }
  var labelModes = window.AdminTimelineClusterLabels.computeLabelModes(
    flatDescs,
    densityTier,
  );
  var modeByEventId = {};
  for (var lm = 0; lm < labelModes.length; lm++) {
    modeByEventId[labelModes[lm].event.id] = labelModes[lm].mode;
  }

  for (var pk2 = 0; pk2 < periodPosKeys.length; pk2++) {
    var period2 = periodPosKeys[pk2];
    var periodPositions2 = positions[period2];
    var baseX = window.AdminTimelineAxis.periodToX(
      period2,
      pxPerPeriod,
      offsetX,
    );

    for (var pi2 = 0; pi2 < periodPositions2.length; pi2++) {
      var pos = periodPositions2[pi2];
      var ev2 = pos.event;
      var yOffset = pos.yOffset;
      var xFan = pos.xFan || 0;

      // Apply stored/staged offsets if present
      var finalX = baseX + xFan;
      var finalY = yOffset;

      // Offset precedence: staged (if present) > saved API offset > cluster placement
      var stagedOffset = null;
      if (window.AdminTimelineStaged && window.AdminTimelineStaged.getOffset) {
        stagedOffset = window.AdminTimelineStaged.getOffset(ev2.id);
      }

      if (stagedOffset) {
        // Staged offsets override cluster placement
        var offsetXPixels = window.AdminTimelineNodeBounds
          ? window.AdminTimelineNodeBounds.offsetXToPixel(
              stagedOffset.timeline_offset_x,
              pxPerPeriod,
            )
          : 0;
        finalX = baseX + offsetXPixels;
        finalY = stagedOffset.timeline_offset_y * 280; // canvas height * offset fraction
      } else if (
        ev2.timeline_offset_x != null ||
        ev2.timeline_offset_y != null
      ) {
        // API offsets (no staged override) — use != null to handle offset of 0
        var apiOffsetXPixels = window.AdminTimelineNodeBounds
          ? window.AdminTimelineNodeBounds.offsetXToPixel(
              ev2.timeline_offset_x != null ? ev2.timeline_offset_x : 0,
              pxPerPeriod,
            )
          : 0;
        finalX = baseX + apiOffsetXPixels;
        if (ev2.timeline_offset_y != null) {
          finalY = ev2.timeline_offset_y * 280;
        }
      }

      // Match the frontend's vertical positioning: dots sit at
      // top: ${50 + finalY / 2}% of the timeline container, which
      // has min-height: 280px (see frontend/assets/js/timeline/timeline-render.js
      // buildHorizontalLayout). Convert percentage to absolute px for the
      // admin's fixed-height canvas.
      var y = (280 * (50 + finalY / 2)) / 100;
      var mode = modeByEventId[ev2.id] || "full";
      var el2 = Events.createEventElement(ev2, finalX, y, finalY, mode);
      axisEl.appendChild(el2);
    }
  }

  // Attach right-click drag listeners to all dots
  if (window.AdminTimelineNodeDrag && window.AdminTimelineNodeDrag.attachDragListeners) {
    window.AdminTimelineNodeDrag.attachDragListeners();
  }
};

/**
 * Create a DOM element for a single timeline event marker.
 *
 * @param {Object} ev
 * @param {number} x        - x position on the axis
 * @param {number} y        - y position (percentage-converted, see renderEvents)
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
  el.style.top = y + "px";
  el.setAttribute("aria-label", ev.title || "Timeline event");
  el.title = ev.title || "";
  el.dataset.eventId = String(ev.id);
  el.type = "button";

  if (ev.id === selectedEventId) {
    el.classList.add("admin-timeline-event--selected");
  }

  // Label above the dot (truncated title) — respects clustering labelMode
  var mode = labelMode || "full";
  if (mode !== "hidden") {
    var labelText = ev.title || "";
    if (mode === "truncated" && labelText.length > 28) {
      labelText = labelText.slice(0, 26) + "\u2026";
    }
    if (labelText) {
      var label = document.createElement("span");
      label.className = [
        "admin-timeline-event-label",
        mode === "truncated" ? "label--truncated" : "",
      ]
        .filter(Boolean)
        .join(" ");
      label.style.position = "absolute";
      // Centre the label horizontally over the dot.
      label.style.left = "-50px";
      label.style.width = "100px";
      label.style.textAlign = "center";
      // Label is a child of the absolutely-positioned dot, so its
      // left/top are relative offsets from the dot’s origin, not
      // canvas coordinates.
      if (yOffset <= 0) {
        label.style.top = "-22px";
      } else {
        label.style.top = "8px";
      }
      label.textContent = labelText;
      el.appendChild(label);
    }
  }

  el.addEventListener("click", function (e) {
    e.stopPropagation();
    Events.selectEvent(ev.id);
  });

  // Left-drag (period moves) has been removed; right-click drag is now handled
  // by AdminTimelineNodeDrag (see attachDragListeners in renderEvents).

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


/* ── Left-drag repositioning removed ───────────────────────────────────────────
   Left-click drag (onEventMouseDown, onEventMouseMove, onEventMouseUp) has been
   removed. Use the edit panel (left-click opens it) to change the period via the
   Era dropdown. Right-click drag (AdminTimelineNodeDrag) repositions within the
   period slot in SPREAD density. ────────────────────────────────────────────── */

/* ── Era mapping ───────────────────────────────────────────────────────────── */

/**
 * Determine which era a period belongs to.
 *
 * @param {string} period
 * @returns {string}
 */
Events.eraForPeriod = function (period) {
  const ord = window.AdminTimelineAxis.periodOrdinal(period);

  // Map period ordinal ranges to the eight new eras
  // PreIncarnation: index 0
  // OldTestament: index 1
  // EarlyLife: indices 2-5
  // Life: indices 6-8
  // GalileeMinistry: indices 9-12
  // JudeanMinistry: indices 13-17
  // PassionWeek: indices 18-33
  // Post-Passion: indices 34+
  if (ord <= 0) return "PreIncarnation";
  if (ord <= 1) return "OldTestament";
  if (ord <= 5) return "EarlyLife";
  if (ord <= 8) return "Life";
  if (ord <= 12) return "GalileeMinistry";
  if (ord <= 17) return "JudeanMinistry";
  if (ord <= 33) return "PassionWeek";
  return "Post-Passion";
};





