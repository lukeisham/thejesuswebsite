/**
 * About page enhancement: fetches the deploy-time git-stamped Created/Edited
 * dates for the static about.html file and renders them via the shared
 * renderCreatedEditedLine util also used by the DB-backed detail pages.
 *
 * @module about
 */

import { renderCreatedEditedLine } from "./utils/date-format.js";

async function init() {
  let dates;
  try {
    const res = await fetch("/assets/data/about-dates.json");
    if (!res.ok) throw new Error(`Unexpected status ${res.status}`);
    dates = await res.json();
  } catch (err) {
    // Missing until the first deploy has run stamp-about-dates (e.g. local
    // dev) — the page must still render normally without the date line.
    console.warn("Could not load about-dates.json:", err);
    return;
  }

  renderCreatedEditedLine(dates.created, dates.edited);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
