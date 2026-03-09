import { dispatchWidgetEvent } from './widget_event_bus.js';

const CARD_ID = 'wgt-page-metrics';

// Absorption model (agent_guide.yml §3):
// widget_spider.js dispatches CrawlSummaryEvent → we merge it into PageMetricsEvent.
// widget_spider.js itself does NOT call dispatchWidgetEvent.
let lastCrawlSummary = null;
window.addEventListener('CrawlSummaryEvent', (e) => {
    if (e.detail) lastCrawlSummary = e.detail;
});

// START initPageMetrics
export function initPageMetrics() {
    const card = document.getElementById(CARD_ID);
    if (!card || card.dataset.wgtInit) return;
    card.dataset.wgtInit = 'true';

    const trigger = card.querySelector('.wgt-trigger');
    const light = card.querySelector('.traffic-light');
    const label = card.querySelector('.wgt-status-label');
    const autoCheck = card.querySelector('.wgt-auto');
    let pollInterval = null;

    try {
        fetchMetrics(light, label);

        if (trigger) {
            trigger.addEventListener('click', () => triggerScrape(light, label));
        }

        if (autoCheck) {
            autoCheck.addEventListener('change', () => {
                if (autoCheck.checked) {
                    if (!pollInterval) {
                        pollInterval = setInterval(() => fetchMetrics(light, label), 30000);
                    }
                } else {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            });
            // Initial state
            if (autoCheck.checked) {
                pollInterval = setInterval(() => fetchMetrics(light, label), 30000);
            }
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Init Error');
        console.error(`[Page Metrics] Init failed: ${error.message}`);
    }
}
// END

// START fetchMetrics
async function fetchMetrics(light, label) {
    try {
        setStatus(light, label, 'active', 'Syncing');

        // Lean Passthrough: GET /api/v1/metrics/page
        const response = await fetch('/api/v1/metrics/page');
        if (response.ok) {
            const data = await response.json();
            setStatus(light, label, 'active', 'Tracking');

            // Dispatch event for Agent integration (§6 Priority 7).
            // Merge lastCrawlSummary (from absorbed widget_spider.js) when available.
            dispatchWidgetEvent(CARD_ID, 'PageMetricsEvent', {
                metrics: data,
                crawl_summary: lastCrawlSummary || null,
                priority: 7
            });
        } else {
            throw new Error('Metrics fetch failed');
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Fetch Error');
        console.error(`[Page Metrics] Fetch failed: ${error.message}`);
    }
}
// END

// START triggerScrape (absorbed from widget_spider.js)
async function triggerScrape(light, label) {
    try {
        setStatus(light, label, 'active', 'Scraping...');

        // Lean Passthrough: POST /api/v1/tools/scraper/run
        const response = await fetch('/api/v1/tools/scraper/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            setStatus(light, label, 'active', 'Tracking');
        } else {
            throw new Error('Scrape trigger failed');
        }
    } catch (error) {
        setStatus(light, label, 'error', 'Scrape Error');
        console.error(`[Page Metrics] Scrape failed: ${error.message}`);
    }
}
// END

function setStatus(light, label, status, text) {
    if (light) light.className = `traffic-light status-${status}`;
    if (label) label.textContent = text;
}

document.addEventListener('DOMContentLoaded', initPageMetrics);
