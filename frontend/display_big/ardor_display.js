// =============================================================================
//
//   THE JESUS WEBSITE — ARDOR (EVIDENCE) DIAGRAM DISPLAY
//   File:    frontend/display_big/ardor_display.js
//   Version: 1.0.0
//   Purpose: Injects and manages the interactive SVG evidence graph.
//   Source:  guide_function.md §3.0, guide_appearance.md §3.1
//
// =============================================================================

function renderMockArdorDiagram(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // This is a static mock-up of the recursive relationship tree.
    // In Phase 3, this will intercept `parent_id` from the WASM Output 
    // and dynamically plot nodes using D3.js or a similar library.

    const svgHTML = `
    <svg class="ardor-svg" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
        
        <defs>
            <marker id="arrow" viewBox="0 -5 10 10" refX="28" refY="0" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,-5L10,0L0,5" fill="var(--color-border-strong)"></path>
            </marker>
        </defs>

        <!-- Edges (Relationships) -->
        <g class="ardor-edges">
            <path class="ardor-edge" d="M 200 400 C 350 400, 350 200, 500 200" marker-end="url(#arrow)" />
            <path class="ardor-edge" d="M 200 400 C 350 400, 350 600, 500 600" marker-end="url(#arrow)" />
            
            <path class="ardor-edge" d="M 500 200 C 650 200, 650 100, 800 100" marker-end="url(#arrow)" />
            <path class="ardor-edge" d="M 500 200 C 650 200, 650 300, 800 300" marker-end="url(#arrow)" />
        </g>

        <!-- Nodes (Evidence Records) -->
        <g class="ardor-nodes">
            
            <!-- Root Node -->
            <g class="ardor-node active" transform="translate(100, 375)">
                <rect width="200" height="50"></rect>
                <text class="title" x="100" y="25" text-anchor="middle" dominant-baseline="middle">The Resurrection</text>
                <text class="meta" x="100" y="40" text-anchor="middle">ROOT NODE</text>
            </g>

            <!-- Branch A -->
            <g class="ardor-node" transform="translate(400, 175)">
                <rect width="200" height="50"></rect>
                <text class="title" x="100" y="25" text-anchor="middle" dominant-baseline="middle">Empty Tomb</text>
                <text class="meta" x="100" y="40" text-anchor="middle">Historical Claim</text>
            </g>

            <!-- Branch B -->
            <g class="ardor-node" transform="translate(400, 575)">
                <rect width="200" height="50"></rect>
                <text class="title" x="100" y="25" text-anchor="middle" dominant-baseline="middle">Post-mortem Appearances</text>
                <text class="meta" x="100" y="40" text-anchor="middle">Witness Accounts</text>
            </g>
            
            <!-- Leaf A1 -->
            <g class="ardor-node" transform="translate(700, 75)">
                <rect width="200" height="50"></rect>
                <text class="title" x="100" y="20" text-anchor="middle" dominant-baseline="middle">Jerusalem Burial</text>
                <text class="meta" x="100" y="40" text-anchor="middle">Archaeology</text>
            </g>

            <!-- Leaf A2 -->
            <g class="ardor-node" transform="translate(700, 275)">
                <rect width="200" height="50"></rect>
                <text class="title" x="100" y="20" text-anchor="middle" dominant-baseline="middle">Women Witnesses</text>
                <text class="meta" x="100" y="40" text-anchor="middle">Source Criticism</text>
            </g>
            
        </g>
    </svg>
    `;

    container.innerHTML = svgHTML;
}

document.addEventListener('DOMContentLoaded', () => {
    renderMockArdorDiagram('ardor-canvas-area');
});
