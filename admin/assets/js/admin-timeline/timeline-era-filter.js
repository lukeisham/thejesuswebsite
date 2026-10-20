/**
 * Admin timeline era filter module.
 *
 * Renders a horizontal row of era chip buttons ("All Eras" + the eras in
 * AdminTimelineGeometry.ERA_ORDER). Clicking a chip sets the active filter era,
 * fades the dots and labels of other eras to 0.3, and moves the view to that era
 * with `AdminTimelineNav.jumpToEra`. This is purely a visual aid; it does not
 * restrict editing.
 *
 * A dot belongs to an era by its `era--<kebab>` class, which
 * timeline-events.js sets in `createEventElement`; the chips carry the same
 * class. Both build the suffix with `AdminEraUtils.eraToKebab`
 * (admin-era-utils.js, loaded earlier), so the two always match. A label
 * belongs to the dot with the same `data-event-id`. Labels are siblings of the
 * dots in #timeline-axis, not children.
 *
 * Every `AdminTimelineEvents.renderEvents` makes new dots, so it calls
 * `reapplyFilter` at its end. Without that call the fade is lost while the chip
 * stays highlighted.
 *
 * @module admin-timeline/timeline-era-filter
 */

window.AdminTimelineEraFilter = {};
const EraFilter = window.AdminTimelineEraFilter;

/** @type {string|null}  Active era key, or null when "All Eras" is selected. */
let activeEra = null;

/**
 * Build the chip row from AdminTimelineGeometry.ERA_ORDER / ERA_LABELS
 * and wire click handlers.  "All Eras" is the default selection.
 *
 * @returns {void}
 */
EraFilter.init = function () {
  var container = document.getElementById("timeline-era-filter");
  if (!container) return;

  var geom = window.AdminTimelineGeometry;
  if (!geom || !geom.ERA_ORDER || !geom.ERA_LABELS) {
    console.warn(
      "timeline-era-filter.js: AdminTimelineGeometry.ERA_ORDER or ERA_LABELS is missing. The era chips are not built.",
    );
    return;
  }

  container.innerHTML = "";

  /* ── "All Eras" chip ────────────────────────────────────────────────── */
  var allChip = document.createElement("button");
  allChip.className = "admin-timeline-era-filter__chip admin-timeline-era-filter__chip--active";
  allChip.textContent = "All Eras";
  allChip.type = "button";
  allChip.addEventListener("click", function () {
    activeEra = null;
    EraFilter.applyFilter(null);
    EraFilter._highlightChip(container, null);
    if (
      window.AdminTimelineNav &&
      typeof window.AdminTimelineNav.jumpToEra === "function"
    ) {
      window.AdminTimelineNav.jumpToEra("all");
    }
  });
  container.appendChild(allChip);

  /* ── Era chips ──────────────────────────────────────────────────────── */
  var eraOrder = geom.ERA_ORDER;
  var eraLabels = geom.ERA_LABELS;

  for (var i = 0; i < eraOrder.length; i++) {
    var era = eraOrder[i];
    var label = eraLabels[era] || era;
    var eraKebab = AdminEraUtils.eraToKebab(era);

    var chip = document.createElement("button");
    chip.className = "admin-timeline-era-filter__chip era--" + eraKebab;
    chip.textContent = label;
    chip.type = "button";

    chip.addEventListener("click", (function (eraKey) {
      return function () {
        activeEra = eraKey;
        EraFilter.applyFilter(eraKey);
        EraFilter._highlightChip(container, eraKey);
        if (
          window.AdminTimelineNav &&
          typeof window.AdminTimelineNav.jumpToEra === "function"
        ) {
          window.AdminTimelineNav.jumpToEra(eraKey);
        }
      };
    })(era));

    container.appendChild(chip);
  }
};

/**
 * Apply the era filter visually: matching dots and their labels stay at full
 * opacity; non-matching ones fade to 0.3.  Pass `null` to show all at 1.0.
 *
 * @param {string|null} era
 * @returns {void}
 */
EraFilter.applyFilter = function (era) {
  const eraClass = era
    ? "era--" + AdminEraUtils.eraToKebab(era)
    : null;

  const labelByEventId = new Map();
  for (const label of document.querySelectorAll(".admin-timeline-event-label")) {
    labelByEventId.set(label.dataset.eventId, label);
  }

  for (const dot of document.querySelectorAll(".admin-timeline-event")) {
    const opacity = !eraClass || dot.classList.contains(eraClass) ? "1" : "0.3";
    dot.style.opacity = opacity;
    const label = labelByEventId.get(dot.dataset.eventId);
    if (label) label.style.opacity = opacity;
  }
};

/**
 * Apply the era that the chips last selected to the dots and labels now on the
 * page. Called by `AdminTimelineEvents.renderEvents` after it draws new dots.
 *
 * @returns {void}
 */
EraFilter.reapplyFilter = function () {
  EraFilter.applyFilter(activeEra);
};

/**
 * Update which chip has the active highlight class.
 *
 * @param {HTMLElement} container
 * @param {string|null} era
 * @returns {void}
 */
EraFilter._highlightChip = function (container, era) {
  var chips = container.querySelectorAll(".admin-timeline-era-filter__chip");
  for (var i = 0; i < chips.length; i++) {
    chips[i].classList.remove("admin-timeline-era-filter__chip--active");
  }
  if (!era) {
    // The first chip is "All Eras" (built first in init).
    chips[0].classList.add("admin-timeline-era-filter__chip--active");
  } else {
    var eraKebab = AdminEraUtils.eraToKebab(era);
    var target = container.querySelector(".era--" + eraKebab);
    if (target) target.classList.add("admin-timeline-era-filter__chip--active");
  }
};
