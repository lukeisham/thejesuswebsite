/**
 * current_item_highligh.js
 * ────────────────────────
 * Highlights the navigation link that matches the current page URL.
 * Adds the 'active' CSS class to the matching <a> element so
 * the sidebar visually indicates which page the user is on.
 */
(function highlightCurrentNavItem() {
    "use strict";

    var currentPath = window.location.pathname;

    var links = document.querySelectorAll("#nav-main-links .nav-link");

    links.forEach(function (link) {
        var href = link.getAttribute("href") || "";

        // Match if the current path ends with the link's href,
        // or if the page attribute matches a segment of the URL.
        var page = link.getAttribute("data-page") || "";
        var isMatch =
            currentPath.indexOf(href) !== -1 ||
            (page && currentPath.indexOf("/" + page + "/") !== -1);

        if (isMatch) {
            link.classList.add("active");
            link.style.fontWeight = "bold";
            link.style.borderLeft = "3px solid var(--accent-color)";
            link.style.paddingLeft = "8px";
        }
    });
})();
