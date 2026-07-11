/**
 * Admin timeline events module.
 *
 * Loads timeline events from the API, renders them as draggable markers along
 * the axis, supports an edit panel for title/date/era, and search-to-add.
 * Positions are derived from each event's timeline_period via AdminTimelineAxis.
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

/** @type {boolean} */
let addingMode = false;

/** @type {string} */
let searchQuery = "";

/* ── Initialisation ────────────────────────────────────────────────────────── */

/**
 * Wire DOM events for the event edit panel, add/search dialog, and zoom controls.
 */
Events.init = function () {
  const saveBtn = document.getElementById("timeline-event-save-btn");
  if (saveBtn) saveBtn.addEventListener("click", Events.onSaveEvent);

  const cancelBtn = document.getElementById("timeline-event-cancel-btn");
  if (cancelBtn) cancelBtn.addEventListener("click", Events.closeEditPanel);

  const closeBtn = document.getElementById("timeline-event-panel-close");
  if (closeBtn) closeBtn.addEventListener("click", Events.closeEditPanel);

  const deleteBtn = document.getElementById("timeline-event-delete-btn");
  if (deleteBtn) deleteBtn.addEventListener("click", Events.onRemoveEvent);

  const addBtn = document.getElementById("add-timeline-event-btn");
  if (addBtn) addBtn.addEventListener("click", Events.toggleAddMode);

  const searchInput = document.getElementById("timeline-event-search");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      searchQuery = searchInput.value.trim();
      Events.renderSearchResults();
    });
  }

  const searchClose = document.getElementById("timeline-search-close");
  if (searchClose)
    searchClose.addEventListener("click", Events.closeSearchDialog);
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

/**
 * Remove an event from the local events array by its evidence id.
 * Used by the context menu and holding-pen drop-to-unassign.
 *
 * @param {number} id
 */
Events.removeEventById = function (id) {
  events = events.filter(function (ev) {
    return ev.id !== id;
  });
  if (selectedEventId === id) {
    selectedEventId = null;
  }
};

/* ── Rendering ─────────────────────────────────────────────────────────────── */

/**
 * Render all event markers onto the timeline axis.
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
      // Match the frontend's vertical positioning: dots sit at
      // top: ${50 + yOffset / 2}% of the timeline container, which
      // has min-height: 280px (see frontend/assets/js/timeline/timeline-render.js
      // buildHorizontalLayout). Convert percentage to absolute px for the
      // admin's fixed-height canvas.
      var y = (280 * (50 + yOffset / 2)) / 100;
      var mode = modeByEventId[ev2.id] || "full";
      var el2 = Events.createEventElement(ev2, baseX + xFan, y, yOffset, mode);
      axisEl.appendChild(el2);
    }
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
  el.style.left = x - 6 + "px";
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
      label.style.left = x - 50 + "px";
      label.style.width = "100px";
      label.style.textAlign = "center";
      // Position the label relative to the dot using the same stagger
      // tier (yOffset) from cluster placement — matching the frontend's
      // behaviour where labels sit at the same relative offset from their
      // dot rather than in a fixed box.
      if (yOffset <= 0) {
        label.style.top = y - 22 + "px";
      } else {
        label.style.top = y + 8 + "px";
      }
      label.textContent = labelText;
      el.appendChild(label);
    }
  }

  el.addEventListener("click", function (e) {
    e.stopPropagation();
    Events.selectEvent(ev.id);
  });

  // Context menu (right-click)
  if (window.AdminTimelineContextMenu && window.AdminTimelineContextMenu.show) {
    el.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      e.stopPropagation();
      window.AdminTimelineContextMenu.show(e.clientX, e.clientY, ev.id);
    });
  }

  // Drag (axis repositioning via mousedown)
  el.addEventListener("mousedown", function (e) {
    Events.onEventMouseDown(e, ev);
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

/**
 * Remove an event from the timeline (does not delete the evidence record).
 */
Events.onRemoveEvent = function () {
  if (!selectedEventId) return;

  if (
    !confirm(
      "Remove this event from the timeline? The evidence record will not be deleted.",
    )
  )
    return;

  // Stage the unassign (will be saved when the user clicks Save Changes)
  if (window.AdminTimelineStaged && window.AdminTimelineStaged.stageUnassign) {
    window.AdminTimelineStaged.stageUnassign(selectedEventId);
  }

  // Optimistic removal from local array
  Events.removeEventById(selectedEventId);
  Events.closeEditPanel();
  Events.renderEvents();

  // Refresh holding pen so the chip appears
  if (
    window.AdminTimelineHoldingPen &&
    window.AdminTimelineHoldingPen.refresh
  ) {
    window.AdminTimelineHoldingPen.refresh();
  }
};

/* ── Drag-to-reposition ────────────────────────────────────────────────────── */

/**
 * Mouse-down on an event marker — begin drag.
 *
 * @param {MouseEvent} e
 * @param {Object} ev
 */
Events.onEventMouseDown = function (e, ev) {
  if (addingMode) return;
  e.preventDefault();
  e.stopPropagation();

  dragState = {
    event: ev,
    startX: e.clientX,
    origPeriod: ev.timeline_period,
  };

  document.addEventListener("mousemove", Events.onEventMouseMove);
  document.addEventListener("mouseup", Events.onEventMouseUp);
};

/**
 * Mouse-move during event drag — update position visually.
 *
 * @param {MouseEvent} e
 */
Events.onEventMouseMove = function (e) {
  if (!dragState) return;

  const el = document.querySelector(
    '[data-event-id="' + dragState.event.id + '"]',
  );
  if (!el) return;

  const dx = e.clientX - dragState.startX;
  const pxPerPeriod = window.AdminTimelineAxis.getPxPerPeriod();
  const offsetX = window.AdminTimelineZoom
    ? window.AdminTimelineZoom.getPanOffset()
    : 0;

  const origX = window.AdminTimelineAxis.periodToX(
    dragState.origPeriod,
    pxPerPeriod,
    offsetX,
  );
  const newX = origX + dx;

  el.style.left = newX - 8 + "px";

  // Show a visual indicator of which period the event would snap to
  const snapPeriod = window.AdminTimelineAxis.xToPeriod(
    newX,
    pxPerPeriod,
    offsetX,
  );
  el.title =
    dragState.event.title +
    " \u2192 " +
    snapPeriod.replace(/([a-z])([A-Z])/g, "$1 $2");
};

/**
 * Mouse-up during event drag — persist the new period.
 *
 * @param {MouseEvent} e
 */
Events.onEventMouseUp = function (e) {
  document.removeEventListener("mousemove", Events.onEventMouseMove);
  document.removeEventListener("mouseup", Events.onEventMouseUp);

  if (!dragState) return;

  const dx = e.clientX - dragState.startX;
  const pxPerPeriod = window.AdminTimelineAxis.getPxPerPeriod();
  const offsetX = window.AdminTimelineZoom
    ? window.AdminTimelineZoom.getPanOffset()
    : 0;

  const origX = window.AdminTimelineAxis.periodToX(
    dragState.origPeriod,
    pxPerPeriod,
    offsetX,
  );
  const newX = origX + dx;
  const newPeriod = window.AdminTimelineAxis.xToPeriod(
    newX,
    pxPerPeriod,
    offsetX,
  );

  const ev = dragState.event;
  const origPeriod = ev.timeline_period;
  const origEra = ev.timeline_era;
  dragState = null;

  if (newPeriod === ev.timeline_period) {
    Events.renderEvents();
    return;
  }

  // Determine the era for the new period
  const newEra = Events.eraForPeriod(newPeriod);

  // Stage the move (will be saved when the user clicks Save Changes)
  try {
    if (window.AdminTimelineStaged && window.AdminTimelineStaged.stageMove) {
      window.AdminTimelineStaged.stageMove(
        ev.id,
        newPeriod,
        newEra || ev.timeline_era,
      );
    }

    // Update local state immediately (optimistic)
    ev.timeline_period = newPeriod;
    if (newEra) ev.timeline_era = newEra;
  } catch (err) {
    // Revert on failure
    console.error("Failed to stage event move:", err);
    ev.timeline_period = origPeriod;
    ev.timeline_era = origEra;
  }

  Events.renderEvents();
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

/* ── Search-to-add ─────────────────────────────────────────────────────────── */

/**
 * Toggle "Add Event" mode — opens the evidence search dialog.
 */
Events.toggleAddMode = function () {
  addingMode = !addingMode;
  const dialog = document.getElementById("timeline-search-dialog");
  const btn = document.getElementById("add-timeline-event-btn");

  if (dialog) dialog.hidden = !addingMode;
  if (btn) {
    btn.classList.toggle("admin-timeline-toolbar__btn--active", addingMode);
    btn.textContent = addingMode ? "Cancel" : "Add Event";
  }

  if (addingMode) {
    searchQuery = "";
    const input = document.getElementById("timeline-event-search");
    if (input) {
      input.value = "";
      input.focus();
    }
    Events.renderSearchResults();
  }
};

/**
 * Close the search dialog.
 */
Events.closeSearchDialog = function () {
  addingMode = false;
  const dialog = document.getElementById("timeline-search-dialog");
  const btn = document.getElementById("add-timeline-event-btn");
  if (dialog) dialog.hidden = true;
  if (btn) {
    btn.classList.remove("admin-timeline-toolbar__btn--active");
    btn.textContent = "Add Event";
  }
};

/**
 * Search evidence and render result list for adding to the timeline.
 */
Events.renderSearchResults = async function () {
  const list = document.getElementById("timeline-search-results");
  if (!list) return;

  if (searchQuery.length < 2) {
    list.innerHTML = "";
    const empty = document.createElement("p");
    empty.className = "admin-timeline-search-empty";
    empty.textContent = "Type at least 2 characters to search evidence.";
    list.appendChild(empty);
    return;
  }

  list.innerHTML = "";
  const loading = document.createElement("p");
  loading.className = "admin-timeline-search-loading";
  loading.textContent = "Searching\u2026";
  list.appendChild(loading);

  try {
    const results = await Admin.api.get(
      "/search?q=" +
        encodeURIComponent(searchQuery) +
        "&type=evidence&limit=15",
    );
    list.innerHTML = "";

    if (!results || results.length === 0) {
      const none = document.createElement("p");
      none.className = "admin-timeline-search-empty";
      none.textContent = "No evidence found.";
      list.appendChild(none);
      return;
    }

    for (let i = 0; i < results.length; i++) {
      const item = results[i];
      const row = document.createElement("button");
      row.className = "admin-timeline-search-item";
      row.type = "button";
      row.textContent = item.title || "(untitled)";

      const alreadyAdded = Events.getEventById(item.id);
      if (alreadyAdded) {
        row.disabled = true;
        row.textContent += " (already on timeline)";
      }

      row.addEventListener(
        "click",
        (function (it) {
          return function () {
            Events.addEventToTimeline(it);
          };
        })(item),
      );

      list.appendChild(row);
    }
  } catch (err) {
    list.innerHTML = "";
    const errEl = document.createElement("p");
    errEl.className = "admin-timeline-search-error";
    errEl.textContent = "Search failed: " + err.message;
    list.appendChild(errEl);
  }
};

/**
 * Add an evidence record as an event on the timeline.
 *
 * @param {Object} evidence
 */
Events.addEventToTimeline = function (evidence) {
  if (Events.getEventById(evidence.id)) return;

  const ev = {
    id: evidence.id,
    title: evidence.title,
    slug: evidence.slug,
    timeline_era: evidence.timeline_era || "PreIncarnation",
    timeline_period: evidence.timeline_period || "PreIncarnation",
    primary_verse: evidence.primary_verse,
    description: evidence.description,
  };

  events.push(ev);

  // If the evidence doesn't have a timeline_period yet, set one
  if (!evidence.timeline_period) {
    UpdateRecord.saveEvent(ev.id, {
      timeline_period: "PreIncarnation",
      timeline_era: "PreIncarnation",
    }).catch(function (err) {
      console.error("Failed to set initial timeline period:", err);
    });
  }

  Events.closeSearchDialog();
  Events.renderEvents();
};

/**
 * Add an event staged from the holding pen (already has period assignment).
 * Called by AdminTimelineHoldingPen when a chip is dropped on the canvas.
 *
 * @param {Object} stagedEv - event object with timeline_period and timeline_era set
 */
Events.addStagedEvent = function (stagedEv) {
  if (Events.getEventById(stagedEv.id)) return;

  events.push({
    id: stagedEv.id,
    title: stagedEv.title,
    slug: stagedEv.slug,
    timeline_era: stagedEv.timeline_era,
    timeline_period: stagedEv.timeline_period,
    primary_verse: stagedEv.primary_verse,
    description: stagedEv.description,
    gospel_category: stagedEv.gospel_category,
  });

  Events.renderEvents();
};
