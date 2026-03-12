document.addEventListener("DOMContentLoaded", () => {
    const btnZoomIn = document.getElementById("zoom-in-timeline");
    const btnZoomOut = document.getElementById("zoom-out-timeline");
    const timelineBar = document.getElementById("timeline-bar");
    
    if (!btnZoomIn || !btnZoomOut || !timelineBar) return;

    let currentZoom = 1;
    const ZOOM_STEP = 0.2;
    const MAX_ZOOM = 2.0;
    const MIN_ZOOM = 0.8;

    btnZoomIn.addEventListener("click", () => {
        if (currentZoom < MAX_ZOOM) {
            currentZoom += ZOOM_STEP;
            applyZoom();
        }
    });

    btnZoomOut.addEventListener("click", () => {
        if (currentZoom > MIN_ZOOM) {
            currentZoom -= ZOOM_STEP;
            applyZoom();
        }
    });

    function applyZoom() {
        timelineBar.style.transform = `scale(${currentZoom})`;
        timelineBar.style.transformOrigin = "left center";
        timelineBar.style.transition = "transform 0.3s ease-in-out";
        
        // Handle necessary overflow depending on zoom
        if (currentZoom > 1) {
            timelineBar.parentElement.style.overflowX = 'auto';
            timelineBar.parentElement.style.overflowY = 'hidden';
            timelineBar.style.width = `${100 * currentZoom}%`;
        } else {
            timelineBar.parentElement.style.overflowX = 'visible';
            timelineBar.style.width = '100%';
        }
    }
});
