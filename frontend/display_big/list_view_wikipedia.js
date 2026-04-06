// =============================================================================
//
//   THE JESUS WEBSITE — LIST VIEW WIKIPEDIA
//   File:    frontend/display_big/list_view_wikipedia.js
//   Version: 1.0.0
//   Purpose: Renders a ranked list of Wikipedia articles.
//   Source:  guide_appearance.md §4.1
//
// =============================================================================

function renderWikipediaList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Mock data for Phase 2 - Ranked Wikipedia Articles
    const articles = [
        { title: "Jesus", rank: 1, snippet: "Jesus, also referred to as Jesus Christ, was a first-century Jewish preacher and religious leader.", thumb: "", link: "https://en.wikipedia.org/wiki/Jesus" },
        { title: "Historicity of Jesus", rank: 2, snippet: "The historicity of Jesus is the question of whether or not Jesus of Nazareth historically existed.", thumb: "", link: "https://en.wikipedia.org/wiki/Historicity_of_Jesus" },
        { title: "Historical Jesus", rank: 3, snippet: "The term 'historical Jesus' refers to the life and teachings of Jesus as reconstructed by critical historical methods.", thumb: "", link: "https://en.wikipedia.org/wiki/Historical_Jesus" }
    ];

    container.innerHTML = articles.map((article, index) => `
        <div class="list-row flex gap-4 py-4" style="border-bottom: 1px solid var(--color-border);">
            <div class="list-rank text-lg font-bold text-muted w-8">${index + 1}.</div>
            <div class="list-thumb flex-shrink-0">
                ${typeof renderThumbnail === 'function' ? renderThumbnail(article.thumb, article.title, 'md') : '<div class="thumbnail thumbnail--md"></div>'}
            </div>
            <div class="list-content flex-1">
                <h2 class="text-lg font-semibold mb-1">
                    <a href="${article.link}" target="_blank" class="text-primary hover:text-accent">${article.title}</a>
                </h2>
                ${typeof renderSnippet === 'function' ? renderSnippet(article.snippet, 150) : `<p class="inline-snippet">${article.snippet}</p>`}
                <div class="mt-2">
                    <span class="badge badge--muted">Rank ${article.rank}</span>
                    <a href="${article.link}" target="_blank" class="text-xs text-accent ml-2">External Link ↗</a>
                </div>
            </div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    renderWikipediaList('wikipedia-list-container');
});
