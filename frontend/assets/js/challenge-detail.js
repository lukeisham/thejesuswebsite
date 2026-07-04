/**
 * Challenge detail page: fetch challenge by slug, render title, body,
 * category badge, and linked response cards at page bottom.
 * Supports both popular and academic challenge types.
 *
 * @module challenge-detail
 */

import { getChallengeBySlug, getAcademicChallengeBySlug } from "./api.js";
import { getSegment } from "./utils/router.js";
import { setSEO } from "./seo.js";
import { html } from "./utils/templates.js";
import { showToast } from "./utils/toasts.js";

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────

const $skeleton = document.getElementById("skeleton-state");
const $error = document.getElementById("error-state");
const $empty = document.getElementById("empty-state");
const $content = document.getElementById("challenge-content");
const $h1 = document.getElementById("page-h1");

const $title = document.getElementById("challenge-title");
const $category = document.getElementById("challenge-category");
const $body = document.getElementById("challenge-body");
const $responses = document.getElementById("challenge-responses");
const $responsesList = document.getElementById("challenge-responses-list");

// ─── Determine challenge type from URL ───────────────────────────────────────

function getChallengeType() {
  // URL pattern: /debate/{type}-challenges/{slug}
  // getSegment(1) is e.g. 'popular-challenges' or 'academic-challenges'
  const typeSegment = getSegment(1);
  if (typeSegment === "academic-challenges") return "academic";
  return "popular";
}

function getSlugFromUrl() {
  // getSegment(2) is the slug
  const segment = getSegment(2);
  if (!segment) {
    showError("No challenge specified.");
    return null;
  }
  return segment;
}

// ─── State helpers ───────────────────────────────────────────────────────────

function showSkeleton() {
  if ($skeleton) $skeleton.hidden = false;
  if ($error) $error.hidden = true;
  if ($empty) $empty.hidden = true;
  if ($content) $content.hidden = true;
}

function hideSkeleton() {
  if ($skeleton) $skeleton.hidden = true;
}

function showError(message) {
  hideSkeleton();
  if ($error) {
    $error.hidden = false;
    const msg = $error.querySelector(".error-state__message");
    if (msg) msg.textContent = message;
  }
  if ($empty) $empty.hidden = true;
  if ($content) $content.hidden = true;
}

function showEmpty() {
  hideSkeleton();
  if ($error) $error.hidden = true;
  if ($empty) $empty.hidden = false;
  if ($content) $content.hidden = true;
}

function showContent() {
  hideSkeleton();
  if ($error) $error.hidden = true;
  if ($empty) $empty.hidden = true;
  if ($content) $content.hidden = false;
}

// ─── Render functions ────────────────────────────────────────────────────────

function renderHeader(challenge) {
  if ($title) $title.textContent = challenge.title || "Untitled Challenge";

  if ($category) {
    if (challenge.category) {
      $category.textContent = challenge.category;
      $category.hidden = false;
    } else {
      $category.hidden = true;
    }
  }
}

function renderBodyContent(challenge) {
  if (!$body) return;

  if (!challenge.body) {
    $body.innerHTML = "";
    return;
  }

  const escaped = escapeHTML(challenge.body);
  const paragraphs = escaped
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
    .join("");

  $body.innerHTML = paragraphs;
}

function renderResponses(challenge) {
  if (
    !challenge.responses ||
    !Array.isArray(challenge.responses) ||
    challenge.responses.length === 0
  ) {
    if ($responses) $responses.hidden = true;
    return;
  }

  if ($responses) $responses.hidden = false;

  if ($responsesList) {
    $responsesList.innerHTML = challenge.responses
      .map((resp) => {
        const responseUrl = `/debate/responses/${encodeURIComponent(resp.slug || "")}`;
        const dateStr = resp.published_at || resp.created_at;
        const meta = dateStr
          ? new Date(dateStr).toLocaleDateString("en-GB", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "";

        return html`
          <div class="response-card">
            <a class="response-card-title" href="${responseUrl}"
              >${resp.title || "Untitled Response"}</a
            >
            ${meta ? html`<div class="response-card-meta">${meta}</div>` : ""}
            ${resp.author
              ? html`<div class="response-card-meta">${resp.author}</div>`
              : ""}
          </div>
        `;
      })
      .join("");
  }
}

// ─── SEO ─────────────────────────────────────────────────────────────────────

function applySEO(challenge) {
  const typeLabel =
    getChallengeType() === "academic"
      ? "Academic Challenge"
      : "Popular Challenge";
  const title = challenge.title
    ? `${challenge.title} — ${typeLabel} — The Jesus Website`
    : `${typeLabel} — The Jesus Website`;

  const description = challenge.summary
    ? truncateText(challenge.summary, 160)
    : `A ${typeLabel.toLowerCase()} from The Jesus Website.`;

  setSEO({ title, description });
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function escapeHTML(str) {
  if (typeof str !== "string") return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

function truncateText(text, maxLen) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).trimEnd() + "\u2026";
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function init() {
  const slug = getSlugFromUrl();
  if (!slug) return;

  const type = getChallengeType();

  showSkeleton();

  const fetchFn =
    type === "academic" ? getAcademicChallengeBySlug : getChallengeBySlug;
  const { data, error } = await fetchFn(slug);

  if (error) {
    if (error === "Slug is required" || error.includes("not found")) {
      showEmpty();
    } else {
      showError("Failed to load this challenge.");
      showToast("Failed to load challenge", "error");
    }
    return;
  }

  if (!data) {
    showEmpty();
    return;
  }

  if ($h1) $h1.textContent = data.title || "Challenge";

  renderHeader(data);
  renderBodyContent(data);
  renderResponses(data);

  applySEO(data);

  showContent();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
