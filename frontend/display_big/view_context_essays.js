// =============================================================================
//
//   THE JESUS WEBSITE — CONTEXT ESSAY DISPLAY
//   File:    frontend/display_big/view_context_essays.js
//   Version: 1.0.0
//   Purpose: Renders a single long-form context essay.
//   Source:  guide_appearance.md §5.1, module_sitemap.md
//
// =============================================================================

function renderContextEssay(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Mock payload representing HTML generated from Admin Markdown DB payload
    const mockContent = `
        <header class="essay-header mb-8 pb-6 border-b border-[var(--color-border)]">
            <h1 class="font-serif text-4xl font-bold leading-tight mb-2">First-Century Judean Society</h1>
            <h2 class="font-serif text-2xl text-muted italic mb-4">The socio-political backdrop of the Gospels</h2>
            <div class="mt-4 text-sm text-secondary font-mono uppercase tracking-wide">
                By The Jesus Website Historical Board, 2026
            </div>
            
            <div class="essay-abstract mt-6 p-4 bg-secondary border border-[var(--color-border)] rounded-sm text-sm" style="border-left: 4px solid var(--color-accent-primary);">
                <strong>Abstract:</strong> This essay details the complex web of Roman occupation, Jewish sects (Pharisees, Sadducees, Essenes, Zealots), and the economic realities of Galilean agrarian life that formed the precise historical moment of Jesus of Nazareth.
            </div>
        </header>

        <div class="essay-body font-serif text-lg leading-relaxed text-primary max-w-prose">
            <h3 id="roman-occupation" class="text-2xl font-bold mt-8 mb-4">1. The Roman Occupation</h3>
            <p class="mb-4">
                The Romans, under Pompey the Great, captured Jerusalem in 63 BC. This action ended a century of independent Hasmonean rule and folded Judea into the broader Roman Republic as a client state. 
                <span class="inline-mla-marker">[1]</span>
            </p>
            <p class="mb-4">
                By the time of Jesus' birth, Augustus Caesar was the first Roman Emperor, and the region was ruled by the Herodian dynasty under Roman auspices.
            </p>
        </div>
    `;

    container.innerHTML = mockContent;

    // Mock TOC generation
    const toc = document.getElementById('essay-toc');
    if (toc) {
        toc.innerHTML = `
            <li><a href="#roman-occupation" class="text-sm text-secondary hover:text-primary">1. The Roman Occupation</a></li>
            <li><a href="#" class="text-sm text-secondary hover:text-primary">2. The Jewish Sects</a></li>
            <li><a href="#" class="text-sm text-secondary hover:text-primary">3. Galilean Economy</a></li>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderContextEssay('context-essay-container');
});
