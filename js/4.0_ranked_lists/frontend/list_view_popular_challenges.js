// =============================================================================
//
//   THE JESUS WEBSITE — LIST VIEW POPULAR CHALLENGES
//   File:    js/4.0_ranked_lists/frontend/list_view_popular_challenges.js
//   Version: 1.0.0
//   Purpose: Renders a ranked list of popular challenges/queries.
//   Source:  guide_appearance.md
//
// =============================================================================

// Trigger: DOMContentLoaded -> document looks for 'popular-challenges-container'
// Function: renderPopularChallengesList takes the container ID, fetches/mocks data, and populates innerHTML
// Output: Injects a series of HTML row elements displaying popular challenges in ranked order

function renderPopularChallengesList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Mock data for Phase 2 - Ranked Popular Challenges
    const challenges = [
        { title: "Did Jesus really exist?", rank: 1, snippet: "The most common popular query regarding the historical figure...", thumb: "", link: "/debate/popular_challenge.html?id=1" },
        { title: "Did the resurrection happen?", rank: 2, snippet: "Examining the fundamental claim of early Christianity...", thumb: "", link: "/debate/popular_challenge.html?id=2" },
        { title: "Are the Gospels reliable?", rank: 3, snippet: "Questioning the historical accuracy of the four canonical gospels...", thumb: "", link: "/debate/popular_challenge.html?id=3" }
    ];

    container.innerHTML = challenges.map((challenge, index) => `
        <div class="list-row flex gap-4 py-4">
            <div class="list-rank text-lg font-bold text-muted w-8">${index + 1}.</div>
            <div class="list-thumb flex-shrink-0">
                ${typeof renderThumbnail === 'function' ? renderThumbnail(challenge.thumb, challenge.title, 'md') : '<div class="thumbnail thumbnail--md"></div>'}
            </div>
            <div class="list-content flex-1">
                <h2 class="text-lg font-semibold mb-1">
                    <a href="${challenge.link}" class="text-primary hover:text-accent">${challenge.title}</a>
                </h2>
                ${typeof renderSnippet === 'function' ? renderSnippet(challenge.snippet, 150) : `<p class="inline-snippet">${challenge.snippet}</p>`}
                <div class="mt-2">
                    <span class="badge badge--muted">Popular Rank ${challenge.rank}</span>
                    <a href="${challenge.link}" class="text-xs text-accent ml-2">Read Response →</a>
                </div>
            </div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    renderPopularChallengesList('popular-challenges-container');
});
