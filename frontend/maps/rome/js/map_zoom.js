/**
 * map_zoom.js (Rome)
 * ──────────────────
 * Provides zoom controls (+, −, reset) and drag-to-pan
 * for the Rome map container. Placeholder ready
 * for a mapping library (Leaflet/MapLibre).
 */
(function initRomeMapZoom() {
    "use strict";

    var canvas = document.getElementById("map-canvas");
    var zoomInBtn = document.getElementById("zoom-in");
    var zoomOutBtn = document.getElementById("zoom-out");
    var resetBtn = document.getElementById("zoom-reset");

    if (!canvas) return;

    var scale = 1;
    var translateX = 0;
    var translateY = 0;
    var isDragging = false;
    var startX = 0;
    var startY = 0;

    function applyTransform() {
        canvas.style.transform =
            "translate(" + translateX + "px, " + translateY + "px) scale(" + scale + ")";
    }

    function reset() {
        scale = 1; translateX = 0; translateY = 0;
        applyTransform();
    }

    if (zoomInBtn) zoomInBtn.addEventListener("click", function () { scale = Math.min(4, scale + 0.25); applyTransform(); });
    if (zoomOutBtn) zoomOutBtn.addEventListener("click", function () { scale = Math.max(0.5, scale - 0.25); applyTransform(); });
    if (resetBtn) resetBtn.addEventListener("click", reset);

    canvas.addEventListener("wheel", function (e) { e.preventDefault(); scale = Math.max(0.5, Math.min(4, scale + (e.deltaY > 0 ? -0.1 : 0.1))); applyTransform(); });

    canvas.addEventListener("mousedown", function (e) { isDragging = true; startX = e.clientX - translateX; startY = e.clientY - translateY; canvas.style.cursor = "grabbing"; });
    document.addEventListener("mousemove", function (e) { if (!isDragging) return; translateX = e.clientX - startX; translateY = e.clientY - startY; applyTransform(); });
    document.addEventListener("mouseup", function () { isDragging = false; if (canvas) canvas.style.cursor = "grab"; });

    var locationLinks = document.querySelectorAll("#location-list a");
    locationLinks.forEach(function (link) {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            console.log("Navigate to location:", this.getAttribute("data-loc"));
        });
    });
})();
