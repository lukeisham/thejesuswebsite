/**
 * expand_verse.js
 * ───────────────
 * Finds elements with class 'primary-verse-display', reads their
 * 'data-verse' attribute, and performs an ESV API lookup to fetch
 * the text, placing it in italics directly under the verse reference.
 */

(function initExpandVerses() {
    "use strict";

    // A cache to avoid re-fetching identical verses
    const verseCache = {};

    window.expandVerses = async function () {
        // Find all verse elements that haven't been expanded yet
        const verseElements = document.querySelectorAll('.primary-verse-display:not(.expanded)');

        for (const el of verseElements) {
            const verseRef = el.getAttribute('data-verse');
            if (!verseRef) continue;

            // Mark as expanded so we don't process it again
            el.classList.add('expanded');

            try {
                let verseText = "";

                if (verseCache[verseRef]) {
                    verseText = verseCache[verseRef];
                } else {
                    // Call our internal backend proxy to safely fetch from ESV API
                    // so we don't expose our API key to the frontend.
                    // Endpoint must be implemented on the Rust side: /api/expand_verse?q=Matthew%201:1
                    // For now, if no proxy exists, we might need to handle failure gracefully.
                    // The instruction implies: "fetches... from the ESV API, caches results".

                    // We'll simulate the proxy call:
                    const res = await fetch("/api/v1/expand_verse?q=" + encodeURIComponent(verseRef));
                    if (!res.ok) {
                        // If endpoint not built yet, we just gracefully degrade
                        throw new Error("Proxy error or unavailable HTTP " + res.status);
                    }
                    const data = await res.json();

                    // ESV API v3 returns passages array
                    if (data && data.passages && data.passages.length > 0) {
                        verseText = data.passages[0].trim();
                        // Strip out unnecessary brackets or newlines if needed
                        verseText = verseText.replace(/\n\s*/g, ' ');
                        verseCache[verseRef] = verseText;
                    } else if (data && typeof data.text === "string") {
                        // Alternate mock fallback structure
                        verseText = data.text;
                        verseCache[verseRef] = verseText;
                    }
                }

                if (verseText) {
                    const textSpan = document.createElement("span");
                    textSpan.style.display = "block";
                    textSpan.style.marginTop = "0.25rem";
                    textSpan.style.color = "var(--text-color)";
                    textSpan.style.fontSize = "0.9rem";
                    // Display verses in italics as requested
                    textSpan.innerHTML = `<em>"${verseText}"</em>`;
                    el.appendChild(textSpan);
                }

            } catch (err) {
                console.warn(`Could not expand verse: ${verseRef}`, err);
            }
        }
    };

    // Ensure it runs once the DOM is loaded
    if (document.readyState === "loading") {
        document.addEventListener('DOMContentLoaded', window.expandVerses);
    } else {
        window.expandVerses();
    }
})();
