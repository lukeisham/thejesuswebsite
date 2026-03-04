/**
 * map_zoom.js (maps index)
 * ────────────────────────
 * Provides basic pan and zoom interaction for the
 * overview map container on the Maps index page.
 * This is a placeholder for a future mapping library
 * (e.g. Leaflet or MapLibre).
 */
(function initMapZoom() {
    "use strict";

    var canvas = document.querySelector(".map-container");
    if (!canvas) return;

    var scale = 1;
    var translateX = 0;
    var translateY = 0;
    var isDragging = false;
    var startX = 0;
    var startY = 0;

    /** Apply the current transform. */
    function applyTransform() {
        canvas.style.transform =
            "translate(" + translateX + "px, " + translateY + "px) scale(" + scale + ")";
    }

    // Wheel zoom
    canvas.addEventListener("wheel", function (e) {
        e.preventDefault();
        var delta = e.deltaY > 0 ? -0.1 : 0.1;
        scale = Math.max(0.5, Math.min(3, scale + delta));
        applyTransform();
    });

    // Drag to pan
    canvas.addEventListener("mousedown", function (e) {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        canvas.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", function (e) {
        if (!isDragging) return;
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        applyTransform();
    });

    document.addEventListener("mouseup", function () {
        isDragging = false;
        canvas.style.cursor = "grab";
    });
})();
