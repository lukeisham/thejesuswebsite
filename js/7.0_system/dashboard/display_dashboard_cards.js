/* =============================================================================
   THE JESUS WEBSITE — DASHBOARD CARD RENDERING
   File:    js/7.0_system/dashboard/display_dashboard_cards.js
   Version: 1.0.0
   Trigger: Called by dashboard_orchestrator.js on initial page load.
   Main:    renderDashboardCards() — component-injects 10 module navigation
            cards into #admin-cards in a 3×3 + 1 centered grid layout.
            Each card has an icon, title, and description. Clicks route to
            the module via window.loadModule().
   Output:  Populated #admin-cards container with interactive module cards.
============================================================================= */

/* -----------------------------------------------------------------------------
   MODULE CARD DEFINITIONS
   Each card: { id, icon, title, desc }. The 'id' is the module name passed
   to loadModule(). The System card (index 9) is centered on the bottom row.
----------------------------------------------------------------------------- */
const MODULE_CARDS = [
  {
    id: "records-all",
    icon: "📋",
    title: "All Records",
    desc: "Browse, search, and manage all records in the database.",
  },
  {
    id: "records-single",
    icon: "📄",
    title: "Single Record",
    desc: "View, edit, and manage a single record in detail.",
  },
  {
    id: "arbor",
    icon: "🌳",
    title: "Arbor Diagram",
    desc: "Explore and edit the hierarchical tree of record relationships.",
  },
  {
    id: "wikipedia",
    icon: "📚",
    title: "Wikipedia",
    desc: "Import and manage Wikipedia-sourced reference articles.",
  },
  {
    id: "challenge",
    icon: "⚡",
    title: "Challenges",
    desc: "Create and manage historical Jesus challenge questions.",
  },
  {
    id: "essay-historiography",
    icon: "✍️",
    title: "Essay & Hist.",
    desc: "Write and manage essays and historiography entries.",
  },
  {
    id: "news-sources",
    icon: "📰",
    title: "News Sources",
    desc: "Curate and manage news source references and links.",
  },
  {
    id: "blog-posts",
    icon: "📝",
    title: "Blog Posts",
    desc: "Create, edit, and publish blog posts on the site.",
  },
  {
    id: "system",
    icon: "⚙️",
    title: "System",
    desc: "Monitor system health, agent activity, and manage configuration.",
  },
];

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderDashboardCards
   Clears #admin-cards and injects a card element for each module definition.
   The 10th card (System) gets the .admin-card--centered class.
----------------------------------------------------------------------------- */
function renderDashboardCards() {
  const cardsContainer = document.getElementById("admin-cards");
  if (!cardsContainer) {
    console.warn(
      "[display_dashboard_cards] #admin-cards not found — card rendering skipped.",
    );
    return;
  }

  // Clear existing content
  cardsContainer.innerHTML = "";

  MODULE_CARDS.forEach((card, index) => {
    const cardEl = buildCardElement(card, index);
    cardsContainer.appendChild(cardEl);
  });
}

/* -----------------------------------------------------------------------------
   BUILD: Construct a single card DOM element
----------------------------------------------------------------------------- */
function buildCardElement(card, index) {
  const cardEl = document.createElement("article");
  cardEl.className = "admin-card";

  // The last card (System) is centered on the bottom row
  if (index === MODULE_CARDS.length - 1) {
    cardEl.classList.add("admin-card--centered");
  }

  cardEl.setAttribute("tabindex", "0");
  cardEl.setAttribute("role", "button");
  cardEl.setAttribute("aria-label", `Open ${card.title} module`);

  cardEl.innerHTML = `
        <span class="admin-card__icon" aria-hidden="true">${card.icon}</span>
        <h3 class="admin-card__title">${card.title}</h3>
        <p class="admin-card__desc">${card.desc}</p>
    `;

  // Click handler — loads the module via dashboard_app.js
  cardEl.addEventListener("click", () => {
    if (typeof window.loadModule === "function") {
      window.loadModule(card.id);
    } else {
      console.warn(
        "[display_dashboard_cards] window.loadModule not available — card click ignored.",
      );
    }
  });

  // Keyboard accessibility — Enter key triggers the same action
  cardEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      cardEl.click();
    }
  });

  return cardEl;
}
