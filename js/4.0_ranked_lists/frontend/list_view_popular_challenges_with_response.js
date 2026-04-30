// =============================================================================
//
//   THE JESUS WEBSITE — LIST VIEW POPULAR CHALLENGES (WITH RESPONSE)
//   File:    js/4.0_ranked_lists/frontend/list_view_popular_challenges_with_response.js
//   Version: 1.1.0
//   Purpose: Renders a ranked list of Popular Challenges with verified responses
//            inserted hierarchically below the challenge.
//   Source:  guide_appearance.md §4.2
//
// =============================================================================

function renderPopularChallengesWithResponses(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Mock data for Phase 2 - Ranked Challenges with Responses
    const challenges = [
        { 
            challenge: { title: "The 'Swoon' Theory", rank: 1, snippet: "The hypothesis that Jesus did not die on the cross but merely fainted.", thumb: "" },
            response: { title: "Medical Analysis of Crucifixion", snippet: "Modern medical consensus confirms death via asphyxiation.", thumb: "", slug: "response-crucifixion-medical" }
        },
        { 
            challenge: { title: "The 'Stolen Body' Theory", rank: 2, snippet: "The initial claim circulating that the disciples stole the body.", thumb: "" },
            response: { title: "Roman Guard & Grave Robbery Laws", snippet: "Historical context regarding the guarding of the tomb.", thumb: "", slug: "response-stolen-body" }
        }
    ];

    container.innerHTML = challenges.map((item, index) => `
        <div class="list-card-group mb-6">
            <!-- 1. The Challenge -->
            <div class="list-row flex gap-4 py-4" style="border-bottom: 1px dashed var(--color-border);">
                <div class="list-rank text-lg font-bold text-muted w-8">${index + 1}.</div>
                <div class="list-thumb flex-shrink-0">
                    ${typeof renderThumbnail === 'function' ? renderThumbnail(item.challenge.thumb, item.challenge.title, 'md') : '<div class="thumbnail thumbnail--md"></div>'}
                </div>
                <div class="list-content flex-1">
                    <h2 class="text-lg font-semibold mb-1">
                        <span class="text-primary">${item.challenge.title}</span>
                    </h2>
                    ${typeof renderSnippet === 'function' ? renderSnippet(item.challenge.snippet, 150) : `<p class="inline-snippet">${item.challenge.snippet}</p>`}
                    <div class="mt-2">
                        <span class="badge badge--muted">Challenge Rank ${item.challenge.rank}</span>
                    </div>
                </div>
            </div>

            <!-- 2. The Inserted Response -->
            <div class="list-row flex gap-4 py-4 pl-12 bg-secondary" style="border-bottom: 1px solid var(--color-border); border-left: 4px solid var(--color-dash-accent);">
                <div class="list-thumb flex-shrink-0">
                    ${typeof renderThumbnail === 'function' ? renderThumbnail(item.response.thumb, item.response.title, 'md') : '<div class="thumbnail thumbnail--md"></div>'}
                </div>
                <div class="list-content flex-1">
                    <h3 class="text-base font-semibold mb-1">
                        <a href="../response.html?id=${item.response.slug}" class="text-accent hover:underline">Response: ${item.response.title}</a>
                    </h3>
                    ${typeof renderSnippet === 'function' ? renderSnippet(item.response.snippet, 150) : `<p class="inline-snippet">${item.response.snippet}</p>`}
                    <div class="mt-2 text-xs">
                        <a href="../response.html?id=${item.response.slug}" class="btn-primary">Read Full Response →</a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    renderPopularChallengesWithResponses('popular-challenge-list-container');
});
