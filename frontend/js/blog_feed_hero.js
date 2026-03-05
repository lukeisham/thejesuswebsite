/**
 * blog_feed_hero.js
 * 
 * Dynamically loads the blog feed content for the blog feed page.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // START loadBlogFeedContent
    const container = document.getElementById('hero-placeholder');
    if (!container) return;

    try {
        const response = await fetch('/api/v1/blog_feed_content');

        if (!response.ok) {
            throw new Error(`Failed to fetch blog content: ${response.statusText}`);
        }

        const html = await response.text();

        // Success: Inject content and remove loading styles
        container.innerHTML = html;
        container.style.minHeight = 'auto';
        container.style.background = 'transparent';
        container.style.border = 'none';
        container.style.padding = '0';

    } catch (error) {
        console.error('Error loading dynamic blog content:', error);

        container.innerHTML = `
            <div style="text-align: center; width: 100%;">
                <p style="font-family: var(--font-sans); color: var(--accent-color); margin-bottom: 1rem;">
                    No blog posts are currently available.
                </p>
            </div>
        `;
    }
    // END
});
