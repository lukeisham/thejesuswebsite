// =============================================================================
//
//   THE JESUS WEBSITE — HISTORIOGRAPHY DISPLAY
//   File:    frontend/display_big/view_historiography.js
//   Version: 1.0.0
//   Purpose: Renders the long-form historiography essay.
//   Source:  guide_appearance.md §5.1, module_sitemap.md
//
// =============================================================================

function renderHistoriography(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Mock payload representing HTML generated from Admin Markdown DB payload
    const mockContent = `
        <header class="essay-header mb-8 pb-6 border-b border-[var(--color-border)]">
            <h1 class="font-serif text-4xl font-bold leading-tight mb-2">The Quests for the Historical Jesus</h1>
            <h2 class="font-serif text-2xl text-muted italic mb-4">A critical review of 300 years of scholarship</h2>
            <div class="mt-4 text-sm text-secondary font-mono uppercase tracking-wide">
                By The Jesus Website Historical Board, 2026
            </div>
            
            <div class="essay-abstract mt-6 p-4 bg-secondary border border-[var(--color-border)] rounded-sm text-sm" style="border-left: 4px solid var(--color-accent-primary);">
                <strong>Abstract:</strong> This essay traces the major paradigm shifts in the academic study of Jesus, from the skepticism of the Old Quest (Reimarus, Schweitzer) through the Bultmannian No-Quest, into the New Quest (Käsemann) and the ongoing Third Quest emphasizing his Jewish context.
            </div>
        </header>

        <div class="essay-body font-serif text-lg leading-relaxed text-primary max-w-prose">
            <h3 id="the-old-quest" class="text-2xl font-bold mt-8 mb-4">1. The Old Quest (1778–1906)</h3>
            <p class="mb-4">
                Initiated by the posthumous publication of Hermann Samuel Reimarus's fragments by G.E. Lessing, the Old Quest sought to separate the "historical Jesus" from the "Christ of faith" dogmas of the early church. 
                <span class="inline-mla-marker">[1]</span>
            </p>
        </div>
    `;

    container.innerHTML = mockContent;

    // Mock TOC generation
    const toc = document.getElementById('essay-toc');
    if (toc) {
        toc.innerHTML = `
            <li><a href="#the-old-quest" class="text-sm text-secondary hover:text-primary">1. The Old Quest (1778-1906)</a></li>
            <li><a href="#" class="text-sm text-secondary hover:text-primary">2. The No Quest (1906-1953)</a></li>
            <li><a href="#" class="text-sm text-secondary hover:text-primary">3. The New Quest (1953-1980)</a></li>
            <li><a href="#" class="text-sm text-secondary hover:text-primary">4. The Third Quest (1980-Present)</a></li>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderHistoriography('historiography-container');
});
