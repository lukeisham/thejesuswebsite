// Trigger:  Called by the orchestrator to set up an Intersection Observer on
//           the scroll sentinel element at the bottom of the records table.
// Main:    initEndlessScroll() — watches the sentinel. When it enters the
//           viewport, triggers fetchRecordsBatch() for the next page of records.
//           Pauses when the bulk review panel is visible.
// Output:  Automatic batch loading as the user scrolls near the bottom.

"use strict";

/* =============================================================================
   THE JESUS WEBSITE — ENDLESS SCROLL LOGIC
   File:    js/2.0_records/dashboard/endless_scroll.js
   Version: 1.0.0
   Module:  2.0 — Records
   Purpose: Provides performant endless scrolling for the All Records table
            via Intersection Observer. Automatically fetches the next batch
            of records when the sentinel element enters the viewport. Can be
            paused/resumed when the bulk review panel is shown/hidden.
============================================================================= */

/* -----------------------------------------------------------------------------
   STATE
----------------------------------------------------------------------------- */
let _scrollObserver = null;
let _scrollPaused = false;

/* -----------------------------------------------------------------------------
   PUBLIC: initEndlessScroll
   Creates an Intersection Observer on the scroll sentinel. When the sentinel
   enters the viewport AND there are more records AND no fetch is in progress,
   triggers the next batch load.
----------------------------------------------------------------------------- */
function initEndlessScroll() {
    const sentinel = document.getElementById("records-all-scroll-sentinel");
    if (!sentinel) {
        console.warn("[endless_scroll] Sentinel element not found");
        return;
    }

    // Destroy previous observer if re-initialising
    if (_scrollObserver) {
        _scrollObserver.disconnect();
        _scrollObserver = null;
    }

    _scrollObserver = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                if (_scrollPaused) return;

                // Check if we should load more
                if (
                    typeof window.hasMoreRecords === "function" &&
                    !window.hasMoreRecords()
                ) {
                    return;
                }

                if (
                    typeof window.isCurrentlyFetching === "function" &&
                    window.isCurrentlyFetching()
                ) {
                    return;
                }

                // Trigger next batch
                const sortKey =
                    typeof window.getActiveSort === "function"
                        ? window.getActiveSort()
                        : "created_at";
                const offset =
                    typeof window.getCurrentOffset === "function"
                        ? window.getCurrentOffset()
                        : 0;

                if (typeof window.fetchRecordsBatch === "function") {
                    window.fetchRecordsBatch(sortKey, offset).catch(function (
                        err
                    ) {
                        console.error(
                            "[endless_scroll] Batch load failed:",
                            err
                        );
                        if (typeof window.surfaceError === "function") {
                            window.surfaceError(
                                "Error: Failed to load the next batch of records. Scroll up and try again."
                            );
                        }
                        if (
                            typeof window.updateRecordsAllStatusBar ===
                            "function"
                        ) {
                            window.updateRecordsAllStatusBar(
                                "Error: Failed to load the next batch of records. Scroll up and try again.",
                                "is-error"
                            );
                        }
                    });
                }
            });
        },
        {
            root: document.getElementById("records-all-table-container"),
            rootMargin: "200px",
            threshold: 0.1,
        }
    );

    _scrollObserver.observe(sentinel);
}

/* -----------------------------------------------------------------------------
   PUBLIC: pauseEndlessScroll
   Temporarily stops the Intersection Observer from triggering loads.
   Called when the bulk review panel is shown.
----------------------------------------------------------------------------- */
function pauseEndlessScroll() {
    _scrollPaused = true;
}

/* -----------------------------------------------------------------------------
   PUBLIC: resumeEndlessScroll
   Re-enables the Intersection Observer to trigger loads.
   Called when the bulk review panel is hidden.
----------------------------------------------------------------------------- */
function resumeEndlessScroll() {
    _scrollPaused = false;
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.initEndlessScroll = initEndlessScroll;
window.pauseEndlessScroll = pauseEndlessScroll;
window.resumeEndlessScroll = resumeEndlessScroll;
