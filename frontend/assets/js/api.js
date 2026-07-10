/**
 * Centralised API fetch helpers. All raw `fetch()` calls live here (SR-3, JS-5).
 * Every helper returns `{ data, error }` — never throws.
 *
 * @module api
 */

const BASE = "/api";

/**
 * Internal fetch wrapper with JSON parsing and error normalisation.
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<{data: *, error: string|null}>}
 */
async function request(url, options = {}) {
  try {
    const res = await fetch(BASE + url, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });

    if (res.status === 204) return { data: null, error: null };

    const data = await res.json();

    if (!res.ok) {
      return {
        data: null,
        error: data.error || `Request failed (${res.status})`,
      };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message || "Network error" };
  }
}

// ─── Evidence ────────────────────────────────────────────────────────────────

/** @param {Object} [params] - Query filter params (e.g. { timeline_era, map_location }). */
export async function getEvidence(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/evidence${qs}`);
}

/** @param {string} slug */
export async function getEvidenceBySlug(slug) {
  if (!slug) return { data: null, error: "Slug is required" };
  return request(`/evidence/${encodeURIComponent(slug)}`);
}

// ─── Essays / Contextual ─────────────────────────────────────────────────────

/** @param {Object} [params] */
export async function getEssays(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/essays${qs}`);
}

/** @param {string} slug */
export async function getEssayBySlug(slug) {
  if (!slug) return { data: null, error: "Slug is required" };
  return request(`/essays/${encodeURIComponent(slug)}`);
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

/** @param {Object} [params] */
export async function getTimeline(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/timeline${qs}`);
}

// ─── Maps ─────────────────────────────────────────────────────────────────────

/** @param {Object} [params] */
export async function getMaps(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/maps${qs}`);
}

/** @param {string} mapKey */
export async function getMapByKey(mapKey) {
  if (!mapKey) return { data: null, error: "Map key is required" };
  return request(`/maps/${encodeURIComponent(mapKey)}`);
}

// ─── Arbor ────────────────────────────────────────────────────────────────────

/** @param {Object} [params] */
export async function getArbor(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/arbor${qs}`);
}

// ─── Search ───────────────────────────────────────────────────────────────────

/** @param {string} query
 * @param {string} [type] - Optional type filter (evidence, essays, responses, blog) */
export async function search(query, type) {
  if (!query) return { data: [], error: null };
  let url = `/search?q=${encodeURIComponent(query)}`;
  if (type) url += `&type=${encodeURIComponent(type)}`;
  return request(url);
}

// ─── Debate ───────────────────────────────────────────────────────────────────

/** @param {Object} [params] */
export async function getPopularChallenges(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/popular-challenges${qs}`);
}

/** @param {Object} [params] */
export async function getAcademicChallenges(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/academic-challenges${qs}`);
}

/** @param {string} slug */
export async function getChallengeBySlug(slug) {
  if (!slug) return { data: null, error: "Slug is required" };
  return request(`/popular-challenges/${encodeURIComponent(slug)}`);
}

/** @param {string} slug */
export async function getAcademicChallengeBySlug(slug) {
  if (!slug) return { data: null, error: "Slug is required" };
  return request(`/academic-challenges/${encodeURIComponent(slug)}`);
}

/** @param {string} slug */
export async function getResponseBySlug(slug) {
  if (!slug) return { data: null, error: "Slug is required" };
  return request(`/responses/${encodeURIComponent(slug)}`);
}

/** @param {Object} [params] */
export async function getHistoriography(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/historiography${qs}`);
}

/** @param {string} slug */
export async function getHistoriographyBySlug(slug) {
  if (!slug) return { data: null, error: "Slug is required" };
  return request(`/historiography/${encodeURIComponent(slug)}`);
}

// ─── Blog & News ──────────────────────────────────────────────────────────────

/** @param {Object} [params] */
export async function getBlogPosts(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/blog-posts${qs}`);
}

/** @param {string} slug */
export async function getBlogPostBySlug(slug) {
  if (!slug) return { data: null, error: "Slug is required" };
  return request(`/blog-posts/${encodeURIComponent(slug)}`);
}

/** @param {Object} [params] */
export async function getNewsArticles(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/news-articles${qs}`);
}

/** @param {string} slug */
export async function getNewsArticleBySlug(slug) {
  if (!slug) return { data: null, error: "Slug is required" };
  return request(`/news-articles/${encodeURIComponent(slug)}`);
}

// ─── Resources ────────────────────────────────────────────────────────────────

/** @param {Object} [params] */
export async function getResources(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/resources${qs}`);
}

// ─── About ────────────────────────────────────────────────────────────────────

export async function getAbout() {
  return request("/about");
}

// ─── Site Settings ────────────────────────────────────────────────────────────

/** Global site-branding metadata: title, description, og_image. */
export async function getSiteSettings() {
  return request("/site-settings");
}

// ─── Embedded Data (SR-3: first-paint content) ───────────────────────────────

/**
 * Read deploy-time embedded data from a <script type="application/json"> block.
 * Returns the parsed object or null if the block is missing, empty, or malformed.
 * Used by list/visual pages to render first-paint content immediately without
 * waiting for a network round-trip (SR-3).
 *
 * @param {string} scriptId - The id attribute of the script element.
 * @returns {Object|Array|null}
 */
export function readEmbeddedData(scriptId) {
  try {
    const el = document.getElementById(scriptId);
    if (!el || !el.textContent || !el.textContent.trim()) return null;
    return JSON.parse(el.textContent);
  } catch {
    return null;
  }
}

// ─── Wikipedia ────────────────────────────────────────────────────────────────

/** @param {Object} [params] */
export async function getWikipediaArticles(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/wikipedia${qs}`);
}

// ─── ESV passages ─────────────────────────────────────────────────────────────

/** @param {string} reference - Bible reference, e.g. "Luke 1:1-3". */
export async function getEsvPassage(reference) {
  if (!reference) return { data: null, error: "Reference is required" };
  return request(`/esv/passage?q=${encodeURIComponent(reference)}`);
}

// ─── Analytics (record only — admin reads handled in admin JS) ────────────────

/**
 * Return (or create and store) a persistent session identifier for this visitor
 * across page loads. Lives in sessionStorage so it survives a single browsing
 * session but resets when the tab/window is closed.
 *
 * @returns {string} 16-character hex session ID
 */
function getOrCreateSessionId() {
  const KEY = "_ajs_session_id";
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // sessionStorage unavailable (e.g. privacy mode in some browsers)
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
}

/**
 * Record a page view. Fire and forget — never throws, never blocks the page.
 *
 * Sends page path, referrer, and a persistent session_id to the analytics
 * endpoint. The server enriches the record with geo and device data from
 * the request headers — the client never sends its own location or user-agent.
 *
 * @param {string} page - The URL path.
 */
export async function recordPageView(page) {
  if (typeof page !== "string" || page.length === 0) return;
  try {
    const referrer =
      typeof document !== "undefined"
        ? (document.referrer || "").slice(0, 500)
        : "";
    const sessionId = getOrCreateSessionId();

    await fetch(BASE + "/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page,
        referrer: referrer || null,
        session_id: sessionId,
      }),
    });
  } catch {
    // Page views must never break the user experience.
  }
}
