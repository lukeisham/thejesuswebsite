/**
 * Site metadata patcher — swaps hardcoded site-branding defaults (title,
 * description, OG image) for the admin-configured values from
 * GET /api/site-settings, on every hand-written page that includes this
 * module.
 *
 * Only literal matches of the known hardcoded defaults are replaced, so a
 * page's own custom title/description text is never touched — only the
 * shared branding substrings within it (e.g. the "— The Jesus Website"
 * suffix, or the exact "The Jesus Website" nav-brand text).
 *
 * @module site-meta
 */

import { getSiteSettings } from "../api.js";

const DEFAULT_TITLE = "The Jesus Website";
const DEFAULT_DESCRIPTION =
  "A comprehensive survey of the historical evidence for Jesus the Messiah, presenting about 300 historical data points from the four gospels.";
const DEFAULT_OG_IMAGE =
  "https://thejesuswebsite.org/assets/images/jesus_walking_on_water.jpg";

/** Replace every literal occurrence of `from` in `str` with `to`. No-op if absent. */
function swap(str, from, to) {
  if (typeof str !== "string" || !from || !str.includes(from)) return str;
  return str.split(from).join(to);
}

function patchTitle(newTitle) {
  const swapped = swap(document.title, DEFAULT_TITLE, newTitle);
  if (swapped !== document.title) document.title = swapped;
}

function patchMetaContent(selector, from, to) {
  const el = document.querySelector(selector);
  if (!el) return;
  const current = el.getAttribute("content");
  const swapped = swap(current, from, to);
  if (swapped !== current) el.setAttribute("content", swapped);
}

/** Full-value equality replace — used for URLs, which are never substrings of other text. */
function patchMetaContentExact(selector, from, to) {
  const el = document.querySelector(selector);
  if (!el) return;
  if (el.getAttribute("content") === from) el.setAttribute("content", to);
}

function patchTextExact(selector, from, to) {
  const el = document.querySelector(selector);
  if (!el || el.textContent.trim() !== from) return;
  el.textContent = to;
}

function patchHeading(newTitle) {
  const h1 = document.querySelector("header.sr-only h1");
  if (!h1) return;
  const swapped = swap(h1.textContent, DEFAULT_TITLE, newTitle);
  if (swapped !== h1.textContent) h1.textContent = swapped;
}

function patchJsonLd(newTitle, newDescription) {
  const script = document.querySelector(
    'script[type="application/ld+json"]',
  );
  if (!script) return;

  let data;
  try {
    data = JSON.parse(script.textContent);
  } catch {
    return;
  }
  if (data["@type"] !== "WebSite") return;

  let changed = false;
  const swappedName = swap(data.name, DEFAULT_TITLE, newTitle);
  if (swappedName !== data.name) {
    data.name = swappedName;
    changed = true;
  }
  if (data.description === DEFAULT_DESCRIPTION && newDescription) {
    data.description = newDescription;
    changed = true;
  }
  if (changed) script.textContent = JSON.stringify(data);
}

async function patchSiteMeta() {
  const { data: settings, error } = await getSiteSettings();
  if (error || !settings) return;

  const { title, description, og_image: ogImage } = settings;

  if (title) {
    patchTitle(title);
    patchMetaContent('meta[property="og:title"]', DEFAULT_TITLE, title);
    patchMetaContent('meta[name="twitter:title"]', DEFAULT_TITLE, title);
    patchMetaContentExact('meta[property="og:site_name"]', DEFAULT_TITLE, title);
    patchHeading(title);
    patchTextExact(".nav-item--home a", DEFAULT_TITLE, title);
    patchTextExact(".home-title", DEFAULT_TITLE, title);
  }

  if (description) {
    patchMetaContentExact('meta[name="description"]', DEFAULT_DESCRIPTION, description);
    patchMetaContentExact('meta[property="og:description"]', DEFAULT_DESCRIPTION, description);
    patchMetaContentExact('meta[name="twitter:description"]', DEFAULT_DESCRIPTION, description);
  }

  if (ogImage) {
    patchMetaContentExact('meta[property="og:image"]', DEFAULT_OG_IMAGE, ogImage);
    patchMetaContentExact('meta[name="twitter:image"]', DEFAULT_OG_IMAGE, ogImage);
  }

  patchJsonLd(title, description);
}

document.addEventListener("DOMContentLoaded", patchSiteMeta);
