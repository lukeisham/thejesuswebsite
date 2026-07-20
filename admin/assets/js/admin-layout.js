// Shared admin-shell sidebar/topbar builder, extracted out of the five
// record editors (evidence, essays, blog, debate/responses, historiography)
// where the nav markup was duplicated verbatim except for which item is
// active. Built via DOM factories (JS-6) — no innerHTML with computed data.
//
// Used by: admin/{evidence,essays,blog,debate,historiography}/edit-[id].html

window.AdminLayout = {};

var AdminLayout = window.AdminLayout;

// Every editor this module serves lives at admin/<section>/edit-[id].html,
// i.e. the same directory depth, so a single relative-href table works for
// all of them. The two "popular/academic challenges" items are nested one
// level under admin/debate/, so their href changes depending on whether
// "debate" itself is the active section (see hrefFor below).
var NAV_ITEMS = [
  { key: "dashboard", icon: "📊", label: "Dashboard", href: "../index.html" },
  { key: "evidence", icon: "📋", label: "Evidence", self: true },
  {
    key: "collections",
    icon: "📁",
    label: "Collections",
    href: "../collections/index.html",
  },
  {
    key: "resources",
    icon: "📚",
    label: "Resources",
    href: "../resources/index.html",
  },
  {
    key: "wikipedia",
    icon: "📖",
    label: "Wikipedia",
    href: "../wikipedia/index.html",
  },
  { key: "essays", icon: "✍️", label: "Essays", self: true },
  { key: "debate", icon: "🗣️", label: "Responses", self: true },
  {
    key: "popular-challenges",
    icon: "📢",
    label: "Popular Challenges",
    underDebate: true,
    dir: "popular-challenges",
  },
  {
    key: "academic-challenges",
    icon: "🎓",
    label: "Academic Challenges",
    underDebate: true,
    dir: "academic-challenges",
  },
  { key: "historiography", icon: "🏛️", label: "Historiography", self: true },
  { key: "blog", icon: "📰", label: "Blog", self: true },
  { key: "news", icon: "📡", label: "News", href: "../news/index.html" },
  {
    key: "maps",
    icon: "🗺️",
    label: "Maps Editor",
    href: "../diagrams/maps.html",
  },
  {
    key: "arbor",
    icon: "🌳",
    label: "Arbor Editor",
    href: "../diagrams/arbor.html",
  },
  {
    key: "timeline",
    icon: "⏳",
    label: "Timeline Editor",
    href: "../diagrams/timeline.html",
  },
  {
    key: "analytics",
    icon: "📈",
    label: "Analytics",
    href: "../analytics.html",
  },
  {
    key: "settings",
    icon: "⚙️",
    label: "Settings",
    href: "../settings/index.html",
  },
];

function hrefFor(item, activeSection) {
  if (item.underDebate) {
    return activeSection === "debate"
      ? item.dir + "/index.html"
      : "../debate/" + item.dir + "/index.html";
  }
  if (item.self) {
    return item.key === activeSection
      ? "index.html"
      : "../" + item.key + "/index.html";
  }
  return item.href;
}

function buildLink(item, activeSection) {
  var a = document.createElement("a");
  var isActive = (item.self || item.key === "dashboard") &&
    item.key === activeSection;
  a.className =
    "admin-sidebar__link" + (isActive ? " admin-sidebar__link--active" : "");
  a.href = hrefFor(item, activeSection);

  var icon = document.createElement("span");
  icon.className = "admin-sidebar__icon";
  icon.textContent = item.icon;
  a.appendChild(icon);
  a.appendChild(document.createTextNode(" " + item.label));

  return a;
}

/**
 * Build and append the admin sidebar nav into `parentEl`.
 *
 * @param {HTMLElement} parentEl
 * @param {string} activeSection  one of the NAV_ITEMS `key` values, e.g.
 *   "evidence" | "essays" | "blog" | "debate" | "historiography"
 */
AdminLayout.injectSidebar = function (parentEl, activeSection) {
  if (!parentEl) {
    console.warn("AdminLayout.injectSidebar: parentEl is required.");
    return null;
  }

  var nav = document.createElement("nav");
  nav.className = "admin-sidebar";
  nav.setAttribute("aria-label", "Admin navigation");

  var brand = document.createElement("div");
  brand.className = "admin-sidebar__brand";
  brand.textContent = "⚡ Admin";
  nav.appendChild(brand);

  var navList = document.createElement("div");
  navList.className = "admin-sidebar__nav";
  NAV_ITEMS.forEach(function (item) {
    navList.appendChild(buildLink(item, activeSection));
  });
  nav.appendChild(navList);

  var bottom = document.createElement("div");
  bottom.className = "admin-sidebar__bottom";
  var logout = document.createElement("a");
  logout.className = "admin-sidebar__link";
  logout.href = "../auth/login.html";
  var logoutIcon = document.createElement("span");
  logoutIcon.className = "admin-sidebar__icon";
  logoutIcon.textContent = "🚪";
  logout.appendChild(logoutIcon);
  logout.appendChild(document.createTextNode(" Logout"));
  bottom.appendChild(logout);
  nav.appendChild(bottom);

  parentEl.appendChild(nav);
  return nav;
};

/**
 * Build and append the admin topbar (title + back link) into `parentEl`.
 *
 * @param {HTMLElement} parentEl
 * @param {string} title            e.g. "Edit Evidence"
 * @param {string} backLinkHref     e.g. "index.html"
 * @param {string} backLinkLabel    e.g. "Evidence" -> renders "← Back to Evidence"
 */
AdminLayout.injectTopbar = function (
  parentEl,
  title,
  backLinkHref,
  backLinkLabel,
) {
  if (!parentEl) {
    console.warn("AdminLayout.injectTopbar: parentEl is required.");
    return null;
  }

  var header = document.createElement("header");
  header.className = "admin-topbar";

  var h1 = document.createElement("h1");
  h1.className = "admin-topbar__title";
  h1.textContent = title;
  header.appendChild(h1);

  var actions = document.createElement("div");
  actions.className = "admin-topbar__actions";
  var backLink = document.createElement("a");
  backLink.className = "admin-btn admin-btn--sm admin-btn--ghost";
  backLink.href = backLinkHref;
  backLink.textContent = "← Back to " + backLinkLabel;
  actions.appendChild(backLink);
  header.appendChild(actions);

  parentEl.appendChild(header);
  return header;
};
