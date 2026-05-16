// Trigger:  User clicks the "Gather" button (#btn-gather) in the
//           News Articles function bar, or a consumer module calls
//           window.triggerCrawl() directly.
// Main:    initNewsCrawler() — wires the Gather button to POST
//           /api/admin/news/crawl with source_url and search_terms
//           from the sidebar, and displays process status.
//           triggerCrawl() — programmatic API to start the crawler pipeline.
// Output:  News crawler pipeline triggered asynchronously. Status messages
//          routed through window.surfaceError(). On success, shows a
//          confirmation and schedules a list refresh after a short delay.
//          On failure, surfaces the error message to the Status Bar.

"use strict";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: initNewsCrawler
   Wires the Crawl button in the function bar. Called once when the module
   is initialised by dashboard_news_sources.js.
----------------------------------------------------------------------------- */
function initNewsCrawler() {
  var crawlBtn = document.getElementById("btn-gather");
  if (!crawlBtn) return;

  crawlBtn.addEventListener("click", async function () {
    crawlBtn.disabled = true;
    crawlBtn.textContent = "Gathering…";

    try {
      await triggerCrawl();
    } finally {
      crawlBtn.disabled = false;
      crawlBtn.textContent = "Gather";
    }
  });
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: triggerCrawl
   Reads source URL and search terms from the sidebar inputs, then sends
   POST /api/admin/news/crawl with the sidebar data to launch the backend
   news crawler pipeline. Displays the result via window.surfaceError().
   The sidebar is independent of article selection, so the Gather function
   always reads directly from the DOM inputs.

   Returns:
     Promise<boolean> — true if the crawl was triggered successfully, false
     on failure.
----------------------------------------------------------------------------- */
async function triggerCrawl() {
  try {
    // Read sidebar data directly from the DOM inputs
    var urlInput = document.getElementById("news-source-url-input");
    var termsInput = document.getElementById("news-search-terms-input");

    var sourceUrl = urlInput ? urlInput.value.trim() : "";
    var rawTerms = termsInput ? termsInput.value.trim() : "";

    // Parse search terms (split by newlines or commas)
    var searchTerms = rawTerms
      .split(/[\n,]+/)
      .map(function (t) {
        return t.trim();
      })
      .filter(function (t) {
        return t.length > 0;
      });

    // Surface that we are starting
    if (typeof window.surfaceError === "function") {
      window.surfaceError("News crawler starting...");
    }

    // Build request body with sidebar data
    var requestBody = {};
    if (sourceUrl) {
      requestBody.source_url = sourceUrl;
    }
    if (searchTerms.length > 0) {
      requestBody.search_terms = searchTerms;
    }

    var response = await fetch("/api/admin/news/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      var errDetail = "API responded with status " + response.status;
      try {
        var errBody = await response.json();
        if (errBody && errBody.detail) {
          errDetail = errBody.detail;
        }
        if (errBody && errBody.error) {
          errDetail = errBody.error;
        }
      } catch (_) {
        // Could not parse error body — use the status-based message
      }
      throw new Error(errDetail);
    }

    var data = await response.json();

    // On success, surface the confirmation message
    if (typeof window.surfaceError === "function") {
      var message =
        data.message || "News crawler pipeline triggered successfully.";
      window.surfaceError(message);
    }

    // Schedule a list refresh after a short delay for the pipeline
    // to start processing — news items populate in the anchor record
    setTimeout(async function () {
      if (typeof window.surfaceError === "function") {
        window.surfaceError(
          "News crawl in progress. Refresh to see new items.",
        );
      }
    }, 3000);

    return true;
  } catch (err) {
    console.error("[launch_news_crawler] Crawl trigger failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: News crawler did not respond. Pipeline may not have started.",
      );
    }
    return false;
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_news_sources.js and other modules
----------------------------------------------------------------------------- */
window.initNewsCrawler = initNewsCrawler;
window.triggerCrawl = triggerCrawl;
