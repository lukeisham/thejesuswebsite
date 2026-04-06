// =============================================================================
//
//   THE JESUS WEBSITE — CHALLENGE RESPONSE DISPLAY
//   File:    frontend/display_big/response_display.js
//   Version: 1.0.0
//   Purpose: Renders a single long-form challenge response essay.
//   Source:  guide_appearance.md §5.2, module_sitemap.md
//
// =============================================================================

function renderResponse(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Determine target from URL parameter for demo purposes
    const urlParams = new URLSearchParams(window.location.search);
    let targetId = urlParams.get('id') || 'default-challenge';
    
    const targetEl = document.getElementById('challenge-target');
    if (targetEl) {
        targetEl.textContent = `Challenge ID: ${targetId}`;
    }

    // Mock payload representing HTML generated from Admin Markdown DB payload
    const mockContent = `
        <header class="essay-header mb-8 pb-6 border-b border-[var(--color-border)]">
            <h1 class="font-serif text-4xl font-bold leading-tight mb-2">Medical Analysis of Crucifixion</h1>
            <div class="mt-4 text-sm text-secondary font-mono uppercase tracking-wide">
                By The Jesus Website Historical Board, 2026
            </div>
            
            <div class="essay-abstract mt-6 p-4 bg-[var(--color-bg-primary)] border border-[var(--color-border-strong)] rounded-sm text-sm" style="border-left: 4px solid var(--color-dash-accent);">
                <strong>Response Summary:</strong> Modern medical and historical consensus rules out the 'Swoon Theory'. Roman crucifixion procedures were meticulously designed to ensure death.
            </div>
        </header>

        <div class="essay-body font-serif text-lg leading-relaxed text-primary max-w-prose">
            <h3 id="roman-methods" class="text-2xl font-bold mt-8 mb-4">Roman Execution Methods</h3>
            <p class="mb-4">
                The Romans were professional executioners. A team of four legionnaires (a quaternion) under the command of an exactor or centurion carried out the sentence, and it was their duty to ensure that the victim was dead before the body could be released.
                <span class="inline-mla-marker">[1]</span>
            </p>
        </div>
    `;

    container.innerHTML = mockContent;

    // Mock TOC generation
    const toc = document.getElementById('essay-toc');
    if (toc) {
        toc.innerHTML = `
            <li><a href="#roman-methods" class="text-sm text-secondary hover:text-primary">1. Roman Execution Methods</a></li>
            <li><a href="#" class="text-sm text-secondary hover:text-primary">2. Medical Mechanisms of Death</a></li>
            <li><a href="#" class="text-sm text-secondary hover:text-primary">3. The Spear Thrust</a></li>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderResponse('response-container');
});
