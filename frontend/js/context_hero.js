/**
 * context_hero.js
 * 
 * Dynamically loads the hero essay content for the context page.
 * The content is typically generated or managed via the dashboard.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('hero-placeholder');
    if (!container) return;

    // Use a slight delay or loading state if needed
    try {
        // This endpoint will be responsible for returning the HTML for the current hero essay.
        // For now, this is a placeholder URL that dashboard.html or the backend should fulfill.
        const response = await fetch('/api/v1/hero_content');

        if (!response.ok) {
            throw new Error(`Failed to fetch hero content: ${response.statusText}`);
        }

        const html = await response.text();

        // Success: Inject content and remove loading styles
        container.innerHTML = html;
        container.style.minHeight = 'auto';
        container.style.background = 'transparent';
        container.style.border = 'none';
        container.style.padding = '0';

    } catch (error) {
        console.error('Error loading dynamic hero content:', error);

        // Fallback or interactive state
        container.innerHTML = `
            <div style="text-align: center; width: 100%;">
                <p style="font-family: var(--font-sans); color: var(--accent-color); margin-bottom: 1rem;">
                    No featured essay is currently active.
                </p>
                <p style="font-size: 0.85rem; color: #999;">
                    Generated essays from the admin dashboard will appear here.
                </p>
            </div>
        `;
    }
});
