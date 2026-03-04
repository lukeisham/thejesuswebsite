/**
 * current_item_highlight.js
 * Function: Highlights the navigation link that matches the current page URL.
 * Rules: Strict Interface, Error Translation, Lean Passthrough, Idempotency
 */

// START initHighlighting
export function initHighlighting() {
    const navContainer = document.getElementById('nav-sidebar');
    if (!navContainer) return;

    if (navContainer.dataset.highlightInit) return;
    navContainer.dataset.highlightInit = "true";

    try {
        const currentPath = window.location.pathname;
        const links = document.querySelectorAll("#nav-main-links .nav-link");

        links.forEach(link => {
            const href = link.getAttribute("href") || "";
            const page = link.getAttribute("data-page") || "";

            const isMatch = currentPath.includes(href) || (page && currentPath.includes(`/${page}/`));

            if (isMatch) {
                link.classList.add("active");
                // Applying inline styles for now as requested by original logic, 
                // though ideally these reside purely in CSS classes.
                link.style.fontWeight = "bold";
                link.style.borderLeft = "3px solid var(--accent-color)";
                link.style.paddingLeft = "8px";
            }
        });
    } catch (error) {
        console.error(`[Sidebar Highlighting] Failed: ${error.message}`);
    }
}
// END

// Auto-initialize
document.addEventListener('DOMContentLoaded', initHighlighting);
