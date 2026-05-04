// Trigger:  Called by dashboard_challenge.js action bar buttons:
//           - window.refreshChallengeRankings() → "Refresh" button
//           - window.triggerAgentSearch()       → "Agent Search" button
//           - window.publishChallengeRankings() → "Publish" button
// Main:    Three core ranking operations:
//           1. refreshChallengeRankings — re-sorts challenges by weight-adjusted
//              scores, sets all records to draft, updates ranks in the database.
//           2. triggerAgentSearch — POSTs to /api/admin/agent/run with the
//              active pipeline and selected record slug, polls for completion,
//              then auto-refreshes the list.
//           3. publishChallengeRankings — commits the current ranked order to
//              the live frontend data and sets all listed records to published.
// Output:  Updated database rows via API. UI updated via displayChallengeList().
//          Errors routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   AGENT POLLING CONFIGURATION
----------------------------------------------------------------------------- */
var AGENT_POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
var AGENT_POLL_TIMEOUT_MS = 120000; // Timeout after 2 minutes

/* -----------------------------------------------------------------------------
   FUNCTION: refreshChallengeRankings
   Recalculates the ranking for all challenges in the active mode.
   1. Applies admin weight multipliers from the sidebar to compute scores.
   2. Re-sorts the challenge list by computed score.
   3. Updates each record's rank in the database and sets status to draft.
----------------------------------------------------------------------------- */
async function refreshChallengeRankings() {
  var mode = window._challengeModuleState.mode;
  var challenges = window._challengeModuleState.challenges || [];

  if (challenges.length === 0) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "No challenges loaded. Please select a category first.",
      );
    }
    return;
  }

  var rankCol =
    mode === "academic" ? "academic_challenge_rank" : "popular_challenge_rank";
  var weightCol =
    mode === "academic"
      ? "academic_challenge_weight"
      : "popular_challenge_weight";

  // Compute scores for each challenge using the active weighting criteria
  var criteria = window._challengeModuleState.weightingCriteria || [];

  var scored = challenges.map(function (challenge) {
    var weightRaw = challenge[weightCol] || "{}";
    var score = 0;
    try {
      var weights =
        typeof weightRaw === "string" ? JSON.parse(weightRaw) : weightRaw;
      if (weights && typeof weights === "object") {
        criteria.forEach(function (criterion) {
          var weightVal = parseFloat(weights[criterion.name]);
          if (!isNaN(weightVal)) {
            score += weightVal * criterion.value;
          }
        });
      }
    } catch (e) {
      // Use existing rank as fallback score
      score = parseInt(challenge[rankCol], 10) || 0;
    }

    return {
      record: challenge,
      score: Math.round(score),
    };
  });

  // Sort by score descending
  scored.sort(function (a, b) {
    return b.score - a.score;
  });

  // Assign new ranks and save
  var savePromises = [];
  var newChallenges = [];

  scored.forEach(function (item, index) {
    var challenge = item.record;
    var newRank = index + 1;
    newChallenges.push(challenge);

    var payload = {};
    payload[rankCol] = String(newRank);
    payload["status"] = "draft"; // Set to draft — rankings not live until published

    savePromises.push(
      fetch("/api/admin/records/" + encodeURIComponent(challenge.slug), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(function (resp) {
        if (!resp.ok) {
          throw new Error("Failed to update rank for " + challenge.slug);
        }
        return resp.json();
      }),
    );
  });

  try {
    await Promise.all(savePromises);

    // Update module state
    window._challengeModuleState.challenges = newChallenges;

    // Refresh the list display
    if (typeof window.displayChallengeList === "function") {
      await window.displayChallengeList(mode);
    }

    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Challenge rankings recalculated. All records set to draft.",
      );
    }
  } catch (err) {
    console.error("[challenge_ranking_calculator] Rank refresh failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to refresh challenge rankings. Please try again.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   FUNCTION: triggerAgentSearch
   Triggers a DeepSeek agent pipeline run for the selected challenge.
   1. Sends POST to /api/admin/agent/run with the active pipeline name and
      the selected record's slug.
   2. Displays a loading indicator on the selected row.
   3. Polls the agent logs endpoint until the run completes or times out.
   4. On completion, auto-refreshes the challenge list.
----------------------------------------------------------------------------- */
async function triggerAgentSearch() {
  var mode = window._challengeModuleState.mode;
  var slug = window._challengeModuleState.activeRecordSlug;
  var title = window._challengeModuleState.activeRecordTitle;

  if (!slug) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Please select a challenge before running the agent search.",
      );
    }
    return;
  }

  var pipeline =
    mode === "academic" ? "academic_challenges" : "popular_challenges";

  // Show loading on selected row
  _setRowLoading(slug, true);

  try {
    // 1. Trigger the agent run
    var triggerResponse = await fetch("/api/admin/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pipeline: pipeline,
        slug: slug,
      }),
    });

    if (!triggerResponse.ok) {
      if (typeof window.surfaceError === "function") {
        window.surfaceError(
          "Error: Challenge pipeline did not respond. Rankings may not be current.",
        );
      }
      throw new Error(
        "Agent run trigger failed with status " + triggerResponse.status,
      );
    }

    var triggerData = await triggerResponse.json();
    var runId = triggerData.run_id;

    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        'Agent search started for "' + title + '". Discovering articles...',
      );
    }

    // 2. Poll for completion
    var startTime = Date.now();
    var completed = false;

    while (!completed && Date.now() - startTime < AGENT_POLL_TIMEOUT_MS) {
      await _sleep(AGENT_POLL_INTERVAL_MS);

      try {
        var logsResponse = await fetch(
          "/api/admin/agent/logs?limit=5&pipeline=" +
            encodeURIComponent(pipeline),
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          },
        );

        if (!logsResponse.ok) continue;

        var logsData = await logsResponse.json();
        var logs = logsData.data || [];

        // Find the log entry for this run
        var runLog = null;
        for (var i = 0; i < logs.length; i++) {
          if (logs[i].id === runId) {
            runLog = logs[i];
            break;
          }
        }

        if (runLog) {
          if (runLog.status === "completed" || runLog.status === "failed") {
            completed = true;

            if (runLog.status === "failed") {
              if (typeof window.surfaceError === "function") {
                window.surfaceError(
                  "Error: Agent search failed for '" +
                    title +
                    "'. " +
                    (runLog.error_message || "Check search terms and API key."),
                );
              }
            } else {
              var found = runLog.articles_found || 0;
              if (typeof window.surfaceError === "function") {
                window.surfaceError(
                  'Agent search completed for "' +
                    title +
                    '". ' +
                    found +
                    " articles discovered.",
                );
              }
            }
          }
        }
      } catch (pollErr) {
        console.warn("[challenge_ranking_calculator] Poll error:", pollErr);
      }
    }

    if (!completed) {
      if (typeof window.surfaceError === "function") {
        window.surfaceError(
          "Error: Agent search timed out for '" +
            title +
            "'. Partial results may have been saved.",
        );
      }
    }
  } catch (err) {
    console.error("[challenge_ranking_calculator] Agent search failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Agent search failed for '" +
          title +
          "'. Check search terms and API key.",
      );
    }
  } finally {
    // Hide loading on row
    _setRowLoading(slug, false);

    // Auto-refresh the list to show any updated data
    if (typeof window.displayChallengeList === "function") {
      await window.displayChallengeList(mode);
    }
  }
}

/* -----------------------------------------------------------------------------
   FUNCTION: publishChallengeRankings
   Commits the current ranked order to the live frontend data.
   1. Builds the ordered list of slugs from the current displayed order.
   2. PUTs the ordered list to /api/admin/lists/{list_name}.
   3. Sets all listed records' status to published.
----------------------------------------------------------------------------- */
async function publishChallengeRankings() {
  var mode = window._challengeModuleState.mode;
  var challenges = window._challengeModuleState.challenges || [];

  if (challenges.length === 0) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "No challenges to publish. Please refresh rankings first.",
      );
    }
    return;
  }

  var listName =
    mode === "academic" ? "academic_challenges" : "popular_challenges";

  // Build ordered list items
  var listItems = challenges.map(function (challenge, index) {
    return {
      record_slug: challenge.slug,
      position: index,
    };
  });

  try {
    // 1. Update the resource list
    var listResponse = await fetch(
      "/api/admin/lists/" + encodeURIComponent(listName),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(listItems),
      },
    );

    if (!listResponse.ok) {
      throw new Error(
        "Failed to update list (HTTP " + listResponse.status + ")",
      );
    }

    // 2. Set all listed records to published
    var publishPromises = challenges.map(function (challenge) {
      return fetch("/api/admin/records/" + encodeURIComponent(challenge.slug), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      }).then(function (resp) {
        if (!resp.ok) {
          throw new Error("Failed to publish " + challenge.slug);
        }
        return resp.json();
      });
    });

    await Promise.all(publishPromises);

    // Refresh display
    if (typeof window.displayChallengeList === "function") {
      await window.displayChallengeList(mode);
    }

    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Published " +
          challenges.length +
          " challenges to " +
          (mode === "academic" ? "Academic" : "Popular") +
          " list.",
      );
    }
  } catch (err) {
    console.error("[challenge_ranking_calculator] Publish failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to publish challenge rankings. Please try again.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _setRowLoading
   Adds or removes the loading class on the challenge row for the given slug.

   Parameters:
     slug (string)     — the record slug to find
     isLoading (bool)  — true to add loading, false to remove
----------------------------------------------------------------------------- */
function _setRowLoading(slug, isLoading) {
  var rowEl = document.querySelector(
    '.challenge-row[data-record-slug="' + CSS.escape(slug) + '"]',
  );
  if (!rowEl) return;

  if (isLoading) {
    rowEl.classList.add("challenge-row--loading");
  } else {
    rowEl.classList.remove("challenge-row--loading");
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _sleep
   Returns a promise that resolves after the given milliseconds.
----------------------------------------------------------------------------- */
function _sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.refreshChallengeRankings = refreshChallengeRankings;
window.triggerAgentSearch = triggerAgentSearch;
window.publishChallengeRankings = publishChallengeRankings;
