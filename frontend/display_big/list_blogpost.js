// =============================================================================
//
//   THE JESUS WEBSITE — BLOG FEED DISPLAY
//   File:    frontend/display_big/list_blogpost.js
//   Version: 1.0.0
//   Purpose: Fetches and renders full blog posts for the blog feed.
//   Source:  guide_appearance.md §5.3
//
// =============================================================================

function renderBlogFeed() {
    const listEl = document.getElementById('blog-feed-content');
    if (!listEl) return;

    // Placeholder data for now (Static Stage / Phase 2)
    const blogData = [
        { 
            title: "Navigating the New Archive", 
            date: "2026-03-20", 
            author: "Editor in Chief", 
            body: "Welcome to the new digital archive interface. In this post, we’ll explore the recent updates to our Multi-Page WebAssembly architecture that have allowed us to present a sprawling network of historical facts and references directly in your browser. " 
        },
        { 
            title: "Behind the Scenes: Digitizing the Texts", 
            date: "2026-02-15", 
            author: "Archives Department", 
            body: "A look into the methodological rigour used for mapping out 1st-century geographical and textual boundaries. It took a dedicated team nearly two years to establish the initial dataset." 
        }
    ];

    const html = blogData.map(item => `
        <article class="essay-container mb-8" style="padding-bottom: var(--space-6); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-6);">
            <h2 class="text-2xl font-bold mb-2 font-serif text-primary">${item.title}</h2>
            <div class="text-sm font-mono text-muted mb-4">By ${item.author} | ${item.date}</div>
            <div class="text-base text-body" style="line-height: var(--line-height-relaxed);">
                <p>${item.body}</p>
            </div>
        </article>
    `).join('');

    listEl.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', renderBlogFeed);
