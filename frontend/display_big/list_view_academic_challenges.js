// =============================================================================
//
//   THE JESUS WEBSITE — LIST VIEW ACADEMIC CHALLENGES
//   File:    frontend/display_big/list_view_academic_challenges.js
//   Version: 1.0.0
//   Purpose: Renders a ranked list of academic historical challenges.
//   Source:  guide_appearance.md
//
// =============================================================================

// Trigger: DOMContentLoaded -> document looks for 'academic-challenges-container'
// Function: renderAcademicChallengesList takes the container ID, fetches/mocks data, and populates innerHTML
// Output: Injects a series of HTML row elements displaying academic challenges in ranked order

function renderAcademicChallengesList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Mock data for Phase 2 - Ranked Academic Challenges
    const challenges = [
        { title: "The Synoptic Problem", rank: 1, snippet: "Investigating the literary relationship between Matthew, Mark, and Luke...", thumb: "", link: "/debate/academic_challenge.html?id=1" },
        { title: "Q Source Debate", rank: 2, snippet: "The hypothetical written collection of Jesus's sayings...", thumb: "", link: "/debate/academic_challenge.html?id=2" },
        { title: "Criterion of Embarrassment", rank: 3, snippet: "Analyzing sayings or acts that would have been embarrassing for the early church...", thumb: "", link: "/debate/academic_challenge.html?id=3" }
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
                    <span class="badge badge--muted">Academic Rank ${challenge.rank}</span>
                    <a href="${challenge.link}" class="text-xs text-accent ml-2">Read Submissions →</a>
                </div>
            </div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    renderAcademicChallengesList('academic-challenges-container');
});
