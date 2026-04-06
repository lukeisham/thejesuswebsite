// =============================================================================
//
//   THE JESUS WEBSITE — NEWS FEED DISPLAY
//   File:    frontend/display_big/list_newsitem.js
//   Version: 1.0.0
//   Purpose: Fetches and renders full news items for the news feed.
//   Source:  guide_appearance.md §5.3
//
// =============================================================================

function renderNewsFeed() {
    const listEl = document.getElementById('news-feed-content');
    if (!listEl) return;

    // Placeholder data for now (Static Stage / Phase 2)
    const newsData = [
        { 
            title: "Archaeological Excavations in Capernaum", 
            date: "2026-03-15", 
            author: "The Jesus Website Team", 
            body: "New findings relating to the 1st-century synagogue foundations have sparked international interest. Teams are working around the clock to carefully extract pottery and other artifacts. Dr. Smith claims these artifacts give unprecedented insights into Galilean village life during the time of Christ." 
        },
        { 
            title: "Sitemap Expansion Complete", 
            date: "2026-04-01", 
            author: "Infrastructure Team", 
            body: "Phase 1 of the digital archive is now fully indexed for researchers. This is a monumental milestone for The Jesus Website project, providing streamlined access to thousands of canonical records and references." 
        }
    ];

    const html = newsData.map(item => `
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

document.addEventListener('DOMContentLoaded', renderNewsFeed);
