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
    events = await Admin.api.get("/timeline");
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

  // Group events by period to handle clustering
  const byPeriod = {};
  for (let j = 0; j < events.length; j++) {
    const ev = events[j];
    const period = ev.timeline_period || "PreIncarnation";
    if (!byPeriod[period]) byPeriod[period] = [];
    byPeriod[period].push(ev);
  }

  const periodKeys = Object.keys(byPeriod);
  for (let p = 0; p < periodKeys.length; p++) {
    const period = periodKeys[p];
    const periodEvents = byPeriod[period];
    const baseX = window.AdminTimelineAxis.periodToX(
      period,
      pxPerPeriod,
      offsetX,
    );

    for (let k = 0; k < periodEvents.length; k++) {
      const ev = periodEvents[k];
      // Use shared stagger offsets matching the public timeline
      const offsets = window.AdminTimelineGeometry.STAGGER_OFFSETS;
      const staggerY = offsets[k % offsets.length];
      const y = 60 + staggerY;
      const el = Events.createEventElement(ev, baseX, y);
      axisEl.appendChild(el);
    }
  }
};

/**
 * Create a DOM element for a single timeline event marker.
 *
 * @param {Object} ev
 * @param {number} x   - x position on the axis
 * @param {number} y   - y position (staggered for clustering)
 * @returns {HTMLElement}
 */
Events.createEventElement = function (ev, x, y) {
  const el = document.createElement("button");
  el.className = "admin-timeline-event";
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

  // Label above the dot (truncated title)
  let labelText = ev.title || "";
  const offsets = window.AdminTimelineGeometry.STAGGER_OFFSETS;
  const staggerIdx = 0; // Always above for admin — stagger handled by y position
  if (labelText.length > 28) labelText = labelText.slice(0, 26) + "\u2026";
  if (labelText) {
    const label = document.createElement("span");
    label.className = "admin-timeline-event-label";
    label.style.position = "absolute";
    label.style.left = x - 50 + "px";
    label.style.top = y - 18 + "px";
    label.style.width = "100px";
    label.style.textAlign = "center";
    label.textContent = labelText;
    el.appendChild(label);
  }

  el.addEventListener("click", function (e) {
    e.stopPropagation();
    Events.selectEvent(ev.id);
  });

  // Drag
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

  events = events.filter(function (ev) {
    return ev.id !== selectedEventId;
  });
  Events.closeEditPanel();
  Events.renderEvents();
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
  dragState = null;

  if (newPeriod === ev.timeline_period) {
    Events.renderEvents();
    return;
  }

  // Determine the era for the new period
  const newEra = Events.eraForPeriod(newPeriod);

  // Update local state immediately
  ev.timeline_period = newPeriod;
  if (newEra) ev.timeline_era = newEra;

  // Persist
  UpdateRecord.saveEvent(ev.id, {
    timeline_period: newPeriod,
    timeline_era: newEra || ev.timeline_era,
  }).catch(function (err) {
    console.error("Failed to persist event position:", err);
    // Revert on failure
    ev.timeline_period = dragState ? dragState.origPeriod : ev.timeline_period;
  });

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
