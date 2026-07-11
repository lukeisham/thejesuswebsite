/**
 * Admin timeline era filter module.
 *
 * Renders a horizontal row of era chip buttons ("All Eras" + the 8 canonical
 * eras from AdminTimelineGeometry).  Clicking a chip sets the active filter
 * era and applies a visual opacity fade (0.3) to dots/labels that belong to
 * other eras.  This is purely a visual aid — it does not restrict editing.
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
 */
EraFilter.init = function () {
  var container = document.getElementById("timeline-era-filter");
  if (!container) return;

  var geom = window.AdminTimelineGeometry;
  if (!geom || !geom.ERA_ORDER || !geom.ERA_LABELS) return;

  container.innerHTML = "";

  /* ── "All Eras" chip ────────────────────────────────────────────────── */
  var allChip = document.createElement("button");
  allChip.className = "admin-timeline-era-filter__chip era-filter--active";
  allChip.textContent = "All Eras";
  allChip.type = "button";
  allChip.addEventListener("click", function () {
    activeEra = null;
    EraFilter.applyFilter(null);
    EraFilter._highlightChip(container, null);
  });
  container.appendChild(allChip);

  /* ── Era chips ──────────────────────────────────────────────────────── */
  var eraOrder = geom.ERA_ORDER;
  var eraLabels = geom.ERA_LABELS;

  for (var i = 0; i < eraOrder.length; i++) {
    var era = eraOrder[i];
    var label = eraLabels[era] || era;
    var eraKebab = era
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/\s+/g, "-")
      .toLowerCase();

    var chip = document.createElement("button");
    chip.className = "admin-timeline-era-filter__chip era--" + eraKebab;
    chip.textContent = label;
    chip.type = "button";

    chip.addEventListener("click", (function (e) {
      return function () {
        activeEra = e;
        EraFilter.applyFilter(e);
        EraFilter._highlightChip(container, e);
      };
    })(era));

    container.appendChild(chip);
  }
};

/**
 * Apply the era filter visually: matching dots/labels stay at full opacity;
 * non-matching ones fade to 0.3.  Pass `null` to show all dots at 1.0.
 *
 * @param {string|null} era
 */
EraFilter.applyFilter = function (era) {
  var dots = document.querySelectorAll(".admin-timeline-event");
  for (var i = 0; i < dots.length; i++) {
    var dot = dots[i];

    if (!era) {
      dot.style.opacity = "1";
    } else {
      var eraKebab = era
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/\s+/g, "-")
        .toLowerCase();
      dot.style.opacity = dot.classList.contains("era--" + eraKebab) ? "1" : "0.3";
    }

    // Also fade child labels to match
    var labels = dot.querySelectorAll(".admin-timeline-event-label");
    for (var j = 0; j < labels.length; j++) {
      if (!era) {
        labels[j].style.opacity = "1";
      } else {
        var eraKebab2 = era
          .replace(/([a-z])([A-Z])/g, "$1-$2")
          .replace(/\s+/g, "-")
          .toLowerCase();
        labels[j].style.opacity = dot.classList.contains("era--" + eraKebab2) ? "1" : "0.3";
      }
    }
  }
};

/**
 * Update which chip has the active highlight class.
 *
 * @param {HTMLElement} container
 * @param {string|null} era
 */
EraFilter._highlightChip = function (container, era) {
  var chips = container.querySelectorAll(".admin-timeline-era-filter__chip");
  for (var i = 0; i < chips.length; i++) {
    chips[i].classList.remove("era-filter--active");
  }
  if (!era) {
    // First chip is "All Eras"
    chips[0].classList.add("era-filter--active");
  } else {
    var eraKebab = era
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/\s+/g, "-")
      .toLowerCase();
    var target = container.querySelector(".era--" + eraKebab);
    if (target) target.classList.add("era-filter--active");
  }
};
