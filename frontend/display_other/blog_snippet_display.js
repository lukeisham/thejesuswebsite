// =============================================================================
//
//   THE JESUS WEBSITE — BLOG SNIPPET DISPLAY
//   File:    frontend/display_other/blog_snippet_display.js
//   Version: 1.0.0
//   Purpose: Fetches and renders a small list of latest blog posts.
//   Source:  guide_appearance.md §1.3
//
// =============================================================================

function injectBlogSnippets(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Placeholder data for now (Static Stage)
    const blogData = [
        { title: "The Significance of the Dead Sea Scrolls", date: "2026-03-20", summary: "Reflecting on how the Qumran findings transformed biblical studies." },
        { title: "Building the Jesus Website: Archival UX", date: "2026-04-05", summary: "Designing for high-density historical data presentation." }
    ];

    container.innerHTML = blogData.map(item => `
        <div class="blog-snippet mb-4" style="border-bottom: 1px dotted var(--color-border); padding-bottom: var(--space-2);">
            <p class="text-xs text-muted font-mono mb-1">${item.date}</p>
            <h3 class="text-base font-semibold mb-1">${item.title}</h3>
            <p class="text-sm">${item.summary}</p>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    injectBlogSnippets('latest-blog-content');
});
