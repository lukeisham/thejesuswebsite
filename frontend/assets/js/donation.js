/**
 * Donation portal stub: lazy-loads third-party donation widget only
 * when the user interacts with the portal container. No third-party
 * scripts are loaded eagerly (SR-3).
 *
 * @module donation
 */

const PORTAL_ID = 'donation-portal';

/**
 * Placeholder: initialise donation portal when the donation widget
 * provider is ready. Currently shows a friendly message until the
 * actual widget is integrated.
 */
function initDonationPortal() {
  const portal = document.getElementById(PORTAL_ID);
  if (!portal) return;

  // Show a placeholder message until the real widget is provided
  portal.innerHTML = `
    <div class="donation-container">
      <h2 style="font-family: var(--font-heading); font-size: var(--text-h2); color: var(--text-primary); margin-bottom: var(--space-md); text-align: center;">Support This Project</h2>
      <p style="font-size: var(--text-body); color: var(--text-secondary); text-align: center; line-height: var(--leading-body);">
        The Jesus Website is an independent, open-source project. Your support
        helps keep it online, ad-free, and freely accessible to everyone.
      </p>
      <p style="font-size: var(--text-small); color: var(--text-muted); text-align: center; margin-top: var(--space-lg);">
        The donation portal will be available soon. Thank you for your patience.
      </p>
    </div>
  `;

  // Mark as initialised to avoid re-running
  portal.dataset.initialised = 'true';
}

// ─── Lazy initialisation: only run when the portal enters the viewport
//     or the user interacts with it. ────────────────────────────────────

function init() {
  const portal = document.getElementById(PORTAL_ID);
  if (!portal) return;

  // Use IntersectionObserver to detect when portal is near the viewport
  if (typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !portal.dataset.initialised) {
            initDonationPortal();
            observer.unobserve(portal);
          }
        });
      },
      { rootMargin: '200px' }
    );

    observer.observe(portal);
  } else {
    // Fallback: initialise immediately if no IntersectionObserver support
    if (!portal.dataset.initialised) {
      initDonationPortal();
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
