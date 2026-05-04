// Trigger:  User clicks the "Crawl" button (#btn-news-crawl) in the
//           News Sources function bar, or a consumer module calls
//           window.triggerCrawl() directly.
// Main:    initNewsCrawler() — wires the Crawl button to POST
//           /api/admin/news/crawl and displays process status.
//           triggerCrawl() — programmatic API to start the crawler pipeline.
// Output:  News crawler pipeline triggered asynchronously. Status messages
//          routed through window.surfaceError(). On success, shows a
//          confirmation and schedules a list refresh after a short delay.
//          On failure, surfaces the error message to the Status Bar.

'use strict';

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: initNewsCrawler
   Wires the Crawl button in the function bar. Called once when the module
   is initialised by dashboard_news_sources.js.
----------------------------------------------------------------------------- */
function initNewsCrawler() {
    var crawlBtn = document.getElementById('btn-news-crawl');
    if (!crawlBtn) return;

    crawlBtn.addEventListener('click', async function () {
        crawlBtn.disabled = true;
        crawlBtn.textContent = 'Crawling...';

        try {
            await triggerCrawl();
        } finally {
            crawlBtn.disabled = false;
            crawlBtn.textContent = 'Crawl';
        }
    });
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: triggerCrawl
   Sends POST /api/admin/news/crawl to launch the backend news crawler
   pipeline. Displays the result via window.surfaceError().

   Returns:
     Promise<boolean> — true if the crawl was triggered successfully, false
     on failure.
----------------------------------------------------------------------------- */
async function triggerCrawl() {
    try {
        // Surface that we are starting
        if (typeof window.surfaceError === 'function') {
            window.surfaceError('News crawler starting...');
        }

        var response = await fetch('/api/admin/news/crawl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            var errDetail = 'API responded with status ' + response.status;
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
        if (typeof window.surfaceError === 'function') {
            var message = data.message || 'News crawler pipeline triggered successfully.';
            window.surfaceError(message);
        }

        // Schedule a list refresh after a short delay for the pipeline
        // to start processing — news items populate in the anchor record
        setTimeout(async function () {
            if (typeof window.surfaceError === 'function') {
                window.surfaceError('News crawl in progress. Refresh to see new items.');
            }
        }, 3000);

        return true;

    } catch (err) {
        console.error('[launch_news_crawler] Crawl trigger failed:', err);
        if (typeof window.surfaceError === 'function') {
            window.surfaceError(
                'Error: News crawler did not respond. Pipeline may not have started.'
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
