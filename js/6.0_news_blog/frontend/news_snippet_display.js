// =============================================================================
//
//   THE JESUS WEBSITE — NEWS SNIPPET DISPLAY
//   File:    js/6.0_news_blog/frontend/news_snippet_display.js
//   Version: 1.0.0
//   Purpose: Fetches and renders a small list of latest news items.
//   Source:  guide_appearance.md §1.3
//
// =============================================================================

function injectNewsSnippets(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Placeholder data for now (Static Stage)
    const newsData = [
        { title: "Archaeological Excavations in Capernaum", date: "2026-03-15", summary: "New findings relating to the 1st-century synagogue foundations." },
        { title: "Sitemap Expansion Complete", date: "2026-04-01", summary: "Phase 1 of the digital archive is now fully indexed for researchers." }
    ];

    container.innerHTML = newsData.map(item => `
        <div class="news-snippet mb-4" style="border-bottom: 1px dotted var(--color-border); padding-bottom: var(--space-2);">
            <p class="text-xs text-muted font-mono mb-1">${item.date}</p>
            <h3 class="text-base font-semibold mb-1">${item.title}</h3>
            <p class="text-sm">${item.summary}</p>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    injectNewsSnippets('latest-news-content');
});
