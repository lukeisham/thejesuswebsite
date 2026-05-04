// Trigger:  Called by dashboard_wikipedia.js when the user clicks Refresh
//           or Publish in the function bar.
// Main:    Two functions:
//            refreshWikipediaRankings() — reads all records' current
//              wikipedia_rank, applies weight multipliers, re-sorts, and
//              sets all affected records to draft.
//            publishWikipediaRankings() — commits the current ranked order
//              to the live frontend data and sets all listed records to
//              published.
// Output:  Rankings refreshed or published; module state and list display
//          updated. Errors routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: refreshWikipediaRankings
   Called when the user clicks "Refresh" in the function bar.
   1. Reads all records with wikipedia_rank from module state.
   2. Applies each record's wikipedia_weight multiplier.
   3. Re-sorts by computed score.
   4. Updates each record's wikipedia_rank to the new position-based rank.
   5. Sets all affected records to draft.
   6. Reloads the list display.
----------------------------------------------------------------------------- */
async function refreshWikipediaRankings() {
    const state = window._wikipediaModuleState;
    const records = state.wikipediaRecords;

    if (!records || records.length === 0) {
        if (typeof window.surfaceError === "function") {
            window.surfaceError("No Wikipedia-ranked records to refresh.");
        }
        return;
    }

    try {
        // Compute new scores: score = base_rank × weight_multiplier
        const scoredRecords = records.map(function (record) {
            let weightMultiplier = 1.0;
            try {
                if (record.wikipedia_weight) {
                    const weightData = typeof record.wikipedia_weight === "string"
                        ? JSON.parse(record.wikipedia_weight)
                        : record.wikipedia_weight;
                    weightMultiplier = parseFloat(weightData.multiplier || weightData || 1.0);
                }
            } catch (e) {
                weightMultiplier = 1.0;
            }

            const baseRank = parseInt(record.wikipedia_rank, 10) || 0;
            const computedScore = Math.round(baseRank * weightMultiplier);

            return {
                record: record,
                score: computedScore
            };
        });

        // Sort by score ascending (lower score = higher rank position)
        scoredRecords.sort(function (a, b) {
            return a.score - b.score;
        });

        // Reassign wikipedia_rank based on new position (1-based)
        const updatePromises = scoredRecords.map(function (item, index) {
            const newRank = index + 1;
            const recordId = item.record.id;

            // Only update if the rank actually changed
            const currentRank = parseInt(item.record.wikipedia_rank, 10) || 0;
            if (currentRank === newRank) return Promise.resolve();

            return fetch("/api/admin/records/" + recordId, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    wikipedia_rank: String(newRank),
                    status: "draft"
                })
            });
        });

        await Promise.all(updatePromises);

        if (typeof window.surfaceError === "function") {
            window.surfaceError("Wikipedia rankings refreshed. All affected records set to draft.");
        }

        // Reload the list
        if (typeof window.displayWikipediaList === "function") {
            await window.displayWikipediaList();
        }

    } catch (err) {
        console.error("[wikipedia_ranking_calculator] Refresh failed:", err);
        if (typeof window.surfaceError === "function") {
            window.surfaceError("Error: Failed to refresh Wikipedia rankings. Please try again.");
        }
    }
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: publishWikipediaRankings
   Called when the user clicks "Publish" in the function bar.
   1. Reads all records with wikipedia_rank from module state.
   2. Updates the ranked list in resource_lists via PUT /api/admin/lists/wikipedia.
   3. Sets all listed records to published.
   4. Reloads the list display.
----------------------------------------------------------------------------- */
async function publishWikipediaRankings() {
    const state = window._wikipediaModuleState;
    const records = state.wikipediaRecords;

    if (!records || records.length === 0) {
        if (typeof window.surfaceError === "function") {
            window.surfaceError("No Wikipedia-ranked records to publish.");
        }
        return;
    }

    try {
        // Build the ranked list items for the resource_lists table
        const listItems = records.map(function (record, index) {
            return {
                record_slug: record.slug || "",
                position: index + 1
            };
        });

        // Step 1: Update the ranked list in resource_lists
        const listResponse = await fetch("/api/admin/lists/wikipedia", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(listItems)
        });

        if (!listResponse.ok) {
            throw new Error("List update failed with status " + listResponse.status);
        }

        // Step 2: Set all listed records to published
        const publishPromises = records.map(function (record) {
            return fetch("/api/admin/records/" + record.id, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "published"
                })
            });
        });

        await Promise.all(publishPromises);

        if (typeof window.surfaceError === "function") {
            window.surfaceError("Wikipedia rankings published. All records set to live.");
        }

        // Reload the list
        if (typeof window.displayWikipediaList === "function") {
            await window.displayWikipediaList();
        }

    } catch (err) {
        console.error("[wikipedia_ranking_calculator] Publish failed:", err);
        if (typeof window.surfaceError === "function") {
            window.surfaceError("Error: Failed to publish Wikipedia rankings. Please try again.");
        }
    }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_wikipedia.js action bar
----------------------------------------------------------------------------- */
window.refreshWikipediaRankings = refreshWikipediaRankings;
window.publishWikipediaRankings = publishWikipediaRankings;
