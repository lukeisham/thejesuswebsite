/**
 * challenge_popular_hero.js
 * 
 * Dynamically loads the hero content for the popular challenges page.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // START loadPopularHeroContent
    const container = document.getElementById('hero-placeholder');
    if (!container) return;

    try {
        const response = await fetch('/api/v1/challenge_popular_content');

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

        container.innerHTML = `
            <div style="text-align: center; width: 100%;">
                <p style="font-family: var(--font-sans); color: var(--accent-color); margin-bottom: 1rem;">
                    No popular challenges are currently available.
                </p>
            </div>
        `;
    }
    // END
});
