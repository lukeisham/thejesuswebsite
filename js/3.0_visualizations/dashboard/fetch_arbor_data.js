// =============================================================================
//   THE JESUS WEBSITE — FETCH ARBOR TREE DATA
//   File:    js/3.0_visualizations/dashboard/fetch_arbor_data.js
//   Version: 1.0.0
//   Trigger: Called by dashboard_arbor.js orchestrator on module load and
//            when the user clicks [Refresh].
//   Main:    fetchArborData() — sends GET /api/admin/diagram/tree, validates
//            the response, and returns a flat array of node objects
//            [{id, title, parent_id}].
//   Output:  Resolves with nodes array on success; rejects with an error
//            message routed through window.surfaceError(). On failure,
//            returns an empty array so the UI degrades gracefully.
// =============================================================================

async function fetchArborData() {
    try {
        const response = await fetch("/api/admin/diagram/tree", {
            method: "GET",
            credentials: "same-origin",
            headers: {
                "Accept": "application/json",
            },
        });

        // --- Tree Fetch Failed ---
        if (!response.ok) {
            const message =
                "Error: Unable to load the arbor diagram. Please refresh and try again.";
            if (typeof window.surfaceError === "function") {
                window.surfaceError(message);
            }
            console.error(
                "[fetch_arbor_data] GET /api/admin/diagram/tree returned",
                response.status,
                response.statusText,
            );
            return [];
        }

        const payload = await response.json();

        // --- Empty Tree ---
        if (!payload || !Array.isArray(payload.nodes)) {
            const message =
                "Error: No diagram data was returned. Check that records have parent relationships set.";
            if (typeof window.surfaceError === "function") {
                window.surfaceError(message);
            }
            console.warn(
                "[fetch_arbor_data] Payload missing or nodes not an array:",
                payload,
            );
            return [];
        }

        if (payload.nodes.length === 0) {
            // Not an error per se — just an empty tree. Surface as informational.
            if (typeof window.surfaceError === "function") {
                window.surfaceError(
                    "No records found in the database. Add records to build the arbor tree.",
                );
            }
        }

        return payload.nodes;

    } catch (err) {
        // --- Network / unexpected failure ---
        const message =
            "Error: Unable to load the arbor diagram. Please refresh and try again.";
        if (typeof window.surfaceError === "function") {
            window.surfaceError(message);
        }
        console.error("[fetch_arbor_data] Fetch exception:", err);
        return [];
    }
}

// =============================================================================
//   GLOBAL EXPOSURE
// =============================================================================
window.fetchArborData = fetchArborData;
