/**
 * zoom.js (Timeline)
 * ──────────────────
 * Zoom in/out on the timeline, scaling point spacing
 * so the user can either see a broad overview or focus
 * on a narrow date range.
 */
(function initTimelineZoom() {
    "use strict";

    var zoomInBtn = document.getElementById("zoom-in-timeline");
    var zoomOutBtn = document.getElementById("zoom-out-timeline");
    var timelineBar = document.getElementById("timeline-bar");
    var detailPanel = document.getElementById("period-detail");
    var periodRecords = document.getElementById("period-records");

    if (!timelineBar) return;

    var scale = 1;

    if (zoomInBtn) {
        zoomInBtn.addEventListener("click", function () {
            scale = Math.min(2.5, scale + 0.2);
            timelineBar.style.transform = "scaleX(" + scale + ")";
            timelineBar.style.transition = "transform 0.3s ease";
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener("click", function () {
            scale = Math.max(0.5, scale - 0.2);
            timelineBar.style.transform = "scaleX(" + scale + ")";
            timelineBar.style.transition = "transform 0.3s ease";
        });
    }

    // Handle period point clicks → show detail
    var points = timelineBar.querySelectorAll(".time-point");
    points.forEach(function (point) {
        point.addEventListener("click", function () {
            // Highlight the selected point
            points.forEach(function (p) { p.style.background = ""; });
            this.style.background = "rgba(91, 112, 101, 0.1)";

            var period = this.getAttribute("data-period") || "unknown";

            if (detailPanel) {
                detailPanel.innerHTML =
                    "<h3>" + this.textContent.trim() + "</h3>" +
                    '<p style="font-size:0.9rem;color:#666;">Loading records for the <strong>' +
                    period + "</strong> period…</p>";
            }

            // Fetch records for this period
            if (periodRecords) {
                fetch("/api/records?period=" + encodeURIComponent(period))
                    .then(function (res) { return res.json(); })
                    .then(function (records) {
                        periodRecords.innerHTML = "";
                        if (!records || records.length === 0) {
                            periodRecords.innerHTML = "<li>No records for this period.</li>";
                            return;
                        }
                        records.forEach(function (r) {
                            var li = document.createElement("li");
                            var a = document.createElement("a");
                            a.href = "#";
                            a.textContent = r.name || r.title || "Record";
                            li.appendChild(a);
                            periodRecords.appendChild(li);
                        });
                    })
                    .catch(function () {
                        periodRecords.innerHTML = "<li>Could not load records.</li>";
                    });
            }
        });
    });
})();
