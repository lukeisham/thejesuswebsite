/**
 * footer_actions.js
 * Function: Agentic clipboard and print tools for the footer
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

// START initFooterActions
export function initFooterActions() {
    const footer = document.getElementById('nav-footer');
    if (!footer) return;

    if (footer.dataset.footerInit) return;
    footer.dataset.footerInit = "true";

    try {
        const toggleBtn = document.getElementById('btn-toggle-links');
        const urlBtn = document.getElementById('btn-copy-url');
        const textBtn = document.getElementById('btn-copy-text');
        const pdfBtn = document.getElementById('btn-save-pdf');
        const slideBtn = document.getElementById('btn-save-slide');

        if (toggleBtn) toggleBtn.addEventListener('click', toggleRecordLinks);
        if (urlBtn) urlBtn.addEventListener('click', copyPageUrl);
        if (textBtn) textBtn.addEventListener('click', copyMainText);
        if (pdfBtn) pdfBtn.addEventListener('click', saveAsPdf);
        if (slideBtn) slideBtn.addEventListener('click', saveAsSlide);
    } catch (error) {
        console.error(`[Footer] Initialization failed: ${error.message}`);
    }
}
// END

// START toggleRecordLinks
function toggleRecordLinks(event) {
    if (event) event.preventDefault();
    document.querySelectorAll('.record-link').forEach(link => link.classList.toggle('hidden'));
}
// END

// START copyPageUrl
async function copyPageUrl(event) {
    event.preventDefault();
    try {
        await navigator.clipboard.writeText(window.location.href);
        alert("URL copied to clipboard!");
    } catch (error) {
        alert(`Failed to copy URL: ${error.message}`);
    }
}
// END

// START copyMainText
async function copyMainText(event) {
    event.preventDefault();
    try {
        const mainContent = document.querySelector('main') || document.querySelector('.content');
        if (!mainContent) {
            alert("Could not find main content area.");
            return;
        }
        await navigator.clipboard.writeText(mainContent.innerText);
        alert("Main text copied to clipboard!");
    } catch (error) {
        alert(`Failed to copy text: ${error.message}`);
    }
}
// END

// START saveAsPdf
function saveAsPdf(event) {
    event.preventDefault();
    try {
        // The most robust way to trigger a PDF print for humans/agents
        window.print();
    } catch (error) {
        alert(`Failed to trigger PDF print: ${error.message}`);
    }
}
// END

// START saveAsSlide
async function saveAsSlide(event) {
    event.preventDefault();
    try {
        // Dynamically import the slide builder to keep this module lean
        const { buildSlideDeckPayload } = await import('./save_to_slide.js');
        const payload = buildSlideDeckPayload();

        const response = await fetch('/api/export/slide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server error ${response.status}: ${errText}`);
        }

        // Trigger browser file download of the returned .pptx binary
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${payload.deck_title || 'slides'}.pptx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (error) {
        alert(`Failed to export slides: ${error.message}`);
    }
}
// END saveAsSlide

// Auto-initialize when file is loaded directly as a script module
document.addEventListener('DOMContentLoaded', initFooterActions);
