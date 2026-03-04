/**
 * shuffle_left.js
 * ───────────────
 * Shifts the visible timeline window to show
 * earlier historical periods when the user clicks
 * the "← Earlier" button.
 */
(function initShuffleLeft() {
    "use strict";

    var btn = document.getElementById("shuffle-left");
    var timelineBar = document.getElementById("timeline-bar");

    if (!btn || !timelineBar) return;

    var offset = 0;
    var shiftAmount = 200; // pixels

    btn.addEventListener("click", function () {
        offset += shiftAmount;
        timelineBar.style.transform = "translateX(" + offset + "px)";
        timelineBar.style.transition = "transform 0.3s ease";
    });
})();
