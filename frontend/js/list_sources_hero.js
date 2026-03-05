/**
 * list_sources_hero.js
 * 
 * Dynamically loads and formats source materials based on the Source type.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // START loadSourceContent
    const container = document.getElementById('hero-placeholder');
    if (!container) return;

    try {
        const response = await fetch('/api/v1/list_sources_content');

        if (!response.ok) {
            throw new Error(`Failed to fetch sources: ${response.statusText}`);
        }

        const data = await response.json(); // Expected to be an array of Source objects or grouped categories

        // If data is just a flat list of sources, we wrap it in a container
        // If data is grouped (e.g., by category), we handle that structure

        let html = '';

        if (Array.isArray(data)) {
            html = renderSourceList(data);
        } else {
            // Support for grouped categories if returned by the backend
            for (const [category, sources] of Object.entries(data)) {
                html += `
                    <div class="feed-container" style="border: 1px solid var(--border-color); margin-bottom: 1.5rem;">
                        <h2 style="margin-top: 0;">${category}</h2>
                        ${renderSourceList(sources)}
                    </div>
                `;
            }
        }

        container.innerHTML = html;
        container.style.minHeight = 'auto';
        container.style.background = 'transparent';
        container.style.border = 'none';
        container.style.padding = '0';

    } catch (error) {
        console.error('Error loading dynamic sources:', error);
        container.innerHTML = `
            <div style="text-align: center; width: 100%;">
                <p style="font-family: var(--font-sans); color: var(--accent-color); margin-bottom: 1rem;">
                    No source materials are currently available.
                </p>
            </div>
        `;
    }

    function renderSourceList(sources) {
        if (!sources || sources.length === 0) return '<p>No sources in this category.</p>';

        let listHtml = '<ul class="record-list">';
        for (const source of sources) {
            listHtml += `<li>${formatSource(source)}</li>`;
        }
        listHtml += '</ul>';
        return listHtml;
    }

    function formatSource(source) {
        // Author handling
        let authorPart = '';
        if (source.author.Name) {
            authorPart = source.author.Name;
        } else if (source.author.Orcid) {
            const orcid = source.author.Orcid;
            authorPart = `<a href="https://orcid.org/${orcid}" target="_blank" rel="noopener">${orcid}</a>`;
        }

        // Title handling
        const titleText = source.title.text;

        // Identity handling (ISBN, URL, DOI)
        let identityPart = '';
        let doiPart = '';

        if (source.title.identity) {
            if (source.title.identity.Isbn) {
                const isbn = source.title.identity.Isbn;
                identityPart = `<i><a href="https://www.worldcat.org/search?q=isbn%3A${isbn}" target="_blank" rel="noopener">${titleText}</a></i>`;
            } else if (source.title.identity.NamedUrl) {
                const url = source.title.identity.NamedUrl;
                identityPart = `<i><a href="${url}" target="_blank" rel="noopener">${titleText}</a></i>`;
            } else if (source.title.identity.AcademicArticleId) {
                const doi = source.title.identity.AcademicArticleId;
                identityPart = `<i>${titleText}</i>`;
                doiPart = ` <a href="https://doi.org/${doi}" target="_blank" rel="noopener">${doi}</a>`;
            }
        } else {
            identityPart = `<i>${titleText}</i>`;
        }

        // Year extraction attempt (e.g., from title text or a theoretical year field if added later)
        // For now, looking for (YYYY) pattern or similar in the text
        const yearMatch = titleText.match(/\((\d{4})\)/);
        const yearString = yearMatch ? ` [${yearMatch[1]}]` : "";

        // Final assembly: Author, 'article', publication (italics), year, DOI
        // Note: The 'article' part is requested as a separate string. 
        // We'll assume for this prototype that the title.text contains the publication/site
        // and we might need an 'article' field which isn't in the base Source struct yet.
        // For now, we'll render: Author, Publication (Identity), Year, DOI

        return `${authorPart}, ${identityPart}${yearString}${doiPart}`;
    }
    // END
});
