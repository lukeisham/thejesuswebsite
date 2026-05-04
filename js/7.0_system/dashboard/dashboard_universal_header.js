/* =============================================================================
   THE JESUS WEBSITE — UNIVERSAL HEADER LOGIC
   File:    js/7.0_system/dashboard/dashboard_universal_header.js
   Version: 1.0.0
   Trigger: Called by dashboard_orchestrator.js during dashboard initialisation.
   Main:    injectUniversalHeader() — component-injects the header DOM into
            #admin-header and wires up the Return to Frontend, Dashboard,
            and Logout navigation buttons.
   Output:  Populated #admin-header element. Logout destroys the HttpOnly
            session cookie via POST /api/admin/logout then redirects to the
            public-facing site. Return to Frontend preserves the session.
   Security: per guide_security.md §3 — only Logout destroys the session.
             Return to Frontend / Dashboard preserve the JWT cookie.
============================================================================= */

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: injectUniversalHeader
   Injects the universal header DOM into #admin-header and binds navigation
   event handlers.
----------------------------------------------------------------------------- */
function injectUniversalHeader() {
    const headerEl = document.getElementById("admin-header");
    if (!headerEl) {
        console.warn("[dashboard_universal_header] #admin-header not found — header injection skipped.");
        return;
    }

    // Build the header DOM
    headerEl.innerHTML = `
        <!-- Left: Branding -->
        <div class="header-brand">
            <span class="header-brand__accent" aria-hidden="true">✦✦</span>
            <img class="header-brand__logo"
                 src="../../assets/favicon.png"
                 alt="The Jesus Website"
                 width="32"
                 height="32">
            <span class="header-brand__title">Jesus Website Dashboard</span>
        </div>

        <!-- Right: Navigation -->
        <nav class="header-nav" aria-label="Dashboard navigation">
            <button class="header-nav__link"
                    id="nav-return-frontend"
                    title="Return to the public-facing site (session preserved)">
                Return to Frontend
            </button>

            <span class="header-nav__sep" aria-hidden="true"></span>

            <button class="header-nav__link is-active"
                    id="nav-dashboard-home"
                    title="Return to the dashboard landing cards">
                Dashboard
            </button>

            <span class="header-nav__sep" aria-hidden="true"></span>

            <button class="header-nav__link header-nav__link--logout"
                    id="nav-logout"
                    title="Log out and destroy session">
                Logout
            </button>
        </nav>
    `;

    // Wire up navigation handlers
    document.getElementById("nav-return-frontend").addEventListener("click", handleReturnToFrontend);
    document.getElementById("nav-dashboard-home").addEventListener("click", handleDashboardHome);
    document.getElementById("nav-logout").addEventListener("click", handleLogout);
}

/* -----------------------------------------------------------------------------
   HANDLER: Return to Frontend
   Navigates to the public-facing site. The session cookie is preserved so the
   user can return to the dashboard without re-authenticating.
----------------------------------------------------------------------------- */
function handleReturnToFrontend() {
    window.location.href = "/";
}

/* -----------------------------------------------------------------------------
   HANDLER: Dashboard Home
   Navigates back to the dashboard cards landing view. If a module is loaded,
   this reloads the page to reset to the clean landing state.
----------------------------------------------------------------------------- */
function handleDashboardHome() {
    window.location.href = "/admin/dashboard.html";
}

/* -----------------------------------------------------------------------------
   HANDLER: Logout
   Calls POST /api/admin/logout to destroy the HttpOnly session cookie,
   then redirects to the public-facing site.
----------------------------------------------------------------------------- */
async function handleLogout() {
    try {
        await fetch("/api/admin/logout", {
            method: "POST",
            credentials: "same-origin",
        });
    } catch (err) {
        // Even if the API call fails (e.g. network), still redirect.
        // The cookie may persist but the user navigates away.
        console.warn("[dashboard_universal_header] Logout API call failed:", err);
    }

    window.location.href = "/";
}
