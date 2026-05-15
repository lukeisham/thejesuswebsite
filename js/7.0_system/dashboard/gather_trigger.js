// Trigger:  Called by any Gather button handler in dashboard_wikipedia.js,
//           dashboard_challenge_academic.js, dashboard_challenge_popular.js,
//           or dashboard_news_sources.js.
// Main:    triggerGather(pipelineName, recordSlug) — POSTs to the appropriate
//           backend endpoint, polls for completion, surfaces the count of new
//           items found (or "No new results" if zero), and auto-refreshes
//           the relevant list.
// Output:  Pipeline triggered; results surfaced via window.surfaceError().
//          If zero new items, a clean "no new results" message is shown and
//          no list refresh is triggered.

"use strict";

/* -----------------------------------------------------------------------------
   POLLING CONFIGURATION
----------------------------------------------------------------------------- */
var GATHER_POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
var GATHER_POLL_TIMEOUT_MS = 120000; // Timeout after 2 minutes

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
   INTERNAL: _getPipelineEndpoint
   Returns the correct backend endpoint for a given pipeline name.
   Wikipedia pipeline runs its own dedicated pipeline script.
   News crawl runs its own dedicated pipeline script.
   Challenge pipelines use /api/admin/agent/run (DeepSeek-powered).
----------------------------------------------------------------------------- */
function _getPipelineEndpoint(pipelineName) {
  if (pipelineName === "news_crawl") {
    return "/api/admin/news/crawl";
  }
  if (pipelineName === "wikipedia_pipeline") {
    return "/api/admin/wikipedia/run";
  }
  return "/api/admin/agent/run";
}

/* -----------------------------------------------------------------------------
   INTERNAL: _getPipelineBody
   Returns the POST body for a given pipeline and slug.
----------------------------------------------------------------------------- */
function _getPipelineBody(pipelineName, recordSlug) {
  if (pipelineName === "news_crawl") {
    return JSON.stringify({});
  }
  if (pipelineName === "wikipedia_pipeline") {
    return JSON.stringify({ slug: recordSlug || "" });
  }
  return JSON.stringify({
    pipeline: pipelineName,
    slug: recordSlug || "",
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _pollForCompletion
   Polls the agent logs endpoint (or uses a delay for news crawl) until the
   run completes or times out. Returns the number of new items found.
----------------------------------------------------------------------------- */
async function _pollForCompletion(pipelineName, runId) {
  var startTime = Date.now();

  // For news crawl and wikipedia pipeline, use a simple delay
  // (no agent log polling available — they run their own pipeline scripts)
  if (pipelineName === "news_crawl" || pipelineName === "wikipedia_pipeline") {
    await _sleep(5000);
    return null;
  }

  while (Date.now() - startTime < GATHER_POLL_TIMEOUT_MS) {
    await _sleep(GATHER_POLL_INTERVAL_MS);

    try {
      var logsResponse = await fetch(
        "/api/admin/agent/logs?limit=50&pipeline=" +
          encodeURIComponent(pipelineName),
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
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
          if (runLog.status === "failed") {
            return { error: runLog.error_message || "Pipeline failed" };
          }
          // Return new_items_added (articles_found is the old name)
          var newItems = runLog.new_items_added;
          if (newItems === undefined || newItems === null) {
            newItems = runLog.articles_found || 0;
          }
          return { new_items: newItems };
        }
      }
    } catch (pollErr) {
      console.warn("[gather_trigger] Poll error:", pollErr);
    }
  }

  return { error: "Timed out waiting for pipeline to complete." };
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: triggerGather
   Triggers a pipeline run and polls for completion. Surfaces the count of
   new items found, or a clean "no new results" message if zero.

   Parameters:
     pipelineName (string) — e.g. "wikipedia_pipeline", "academic_challenges",
                             "popular_challenges", "news_crawl"
     recordSlug (string)   — the record slug to scope the pipeline to (optional)

   Returns:
     Promise<Object> — { new_items: number } or { error: string }
----------------------------------------------------------------------------- */
async function triggerGather(pipelineName, recordSlug) {
  try {
    // 1. Trigger the pipeline
    var endpoint = _getPipelineEndpoint(pipelineName);
    var body = _getPipelineBody(pipelineName, recordSlug);

    var csrfToken = (typeof window.getCSRFToken === "function")
      ? window.getCSRFToken()
      : "";
    var triggerResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      credentials: "same-origin",
      body: body,
    });

    if (!triggerResponse.ok) {
      var errData = await triggerResponse.json().catch(function () {
        return {};
      });
      throw new Error(
        errData.error ||
          "Pipeline trigger failed with status " + triggerResponse.status,
      );
    }

    var triggerData;
    try {
      triggerData = await triggerResponse.json();
    } catch (e) {
      triggerData = {};
    }

    // Check if the response already contains new_items (news crawl returns this directly)
    if (triggerData.new_items !== undefined) {
      var newItems = triggerData.new_items;
      _surfaceGatherResult(newItems, pipelineName);
      return { new_items: newItems };
    }

    // 2. Poll for completion using run_id
    var runId = triggerData.run_id;
    if (!runId) {
      // No run_id means no polling possible — assume success
      if (typeof window.surfaceError === "function") {
        window.surfaceError(
          "Pipeline triggered. Check results after processing.",
        );
      }
      return { new_items: null };
    }

    if (typeof window.surfaceError === "function") {
      window.surfaceError("Pipeline started. Gathering data...");
    }

    // 3. Poll until done
    var result = await _pollForCompletion(pipelineName, runId);

    if (result.error) {
      if (typeof window.surfaceError === "function") {
        window.surfaceError("Error: " + result.error);
      }
      return result;
    }

    // 4. Surface the result
    _surfaceGatherResult(result.new_items, pipelineName);
    return result;
  } catch (err) {
    console.error("[gather_trigger] Gather failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to run gather pipeline. Please try again.",
      );
    }
    return { error: err.message };
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _surfaceGatherResult
   Surfaces the gather result count via window.surfaceError().
   If zero new items, shows "No new results — everything is already in the
   database." and does NOT trigger a list refresh.
   If new items found, shows "Gathered N new items" and auto-refreshes the
   relevant list after a short delay.

   Parameters:
     newItems (number)     — count of new items discovered
     pipelineName (string) — used to determine which list to refresh
----------------------------------------------------------------------------- */
function _surfaceGatherResult(newItems, pipelineName) {
  if (newItems === 0 || newItems === "0") {
    // No new results — no-op signal
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "No new results — everything is already in the database.",
      );
    }
    return;
  }

  if (newItems > 0) {
    var label = newItems === 1 ? "item" : "items";
    if (typeof window.surfaceError === "function") {
      window.surfaceError("Gathered " + newItems + " new " + label + ".");
    }
  } else {
    if (typeof window.surfaceError === "function") {
      window.surfaceError("Gather complete.");
    }
  }

  // Auto-refresh the relevant list after a short delay
  setTimeout(function () {
    _refreshList(pipelineName);
  }, 2000);
}

/* -----------------------------------------------------------------------------
   INTERNAL: _refreshList
   Refreshes the relevant list display based on the pipeline name.
----------------------------------------------------------------------------- */
function _refreshList(pipelineName) {
  switch (pipelineName) {
    case "wikipedia_pipeline":
      if (typeof window.displayWikipediaList === "function") {
        window.displayWikipediaList();
      }
      break;
    case "academic_challenges":
    case "popular_challenges":
      if (typeof window.displayChallengeList === "function") {
        var mode =
          pipelineName === "academic_challenges" ? "academic" : "popular";
        window.displayChallengeList(mode);
      }
      break;
    case "news_crawl":
      if (typeof window.displayNewsSourcesList === "function") {
        window.displayNewsSourcesList();
      }
      break;
    default:
      break;
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.triggerGather = triggerGather;
