/**
 * suffle_right.js
 * ───────────────
 * Shifts the visible timeline window to show
 * later historical periods when the user clicks
 * the "Later →" button.
 */
(function initShuffleRight() {
    "use strict";

    var btn = document.getElementById("shuffle-right");
    var timelineBar = document.getElementById("timeline-bar");

    if (!btn || !timelineBar) return;

    var offset = 0;
    var shiftAmount = 200; // pixels

    btn.addEventListener("click", function () {
        offset -= shiftAmount;
        timelineBar.style.transform = "translateX(" + offset + "px)";
        timelineBar.style.transition = "transform 0.3s ease";
    });
})();
