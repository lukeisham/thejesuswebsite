/**
 * Every frontend page script imports its data fetches from here; all raw `fetch()` calls live here (JS-5).
 * Helpers return an ApiResult and never throw.
 *
 * @module api
 */

const BASE = "/api";

/**
 * Result of every helper in this file. `data` is the parsed JSON body, or null on error and on 204.
 * `error` is null on success, a message string, or the structured `{ code, message, detail }` object
 * the API returns for registry errors (API-3).
 *
 * @typedef {{ data: *, error: string | { code: string, message: string, detail?: * } | null }} ApiResult
 */

/**
 * Internal fetch wrapper with JSON parsing and error normalisation.
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<ApiResult>}
 */
async function request(url, options = {}) {
  // `headers` is split out so `...rest` cannot overwrite the merged headers
  // and drop the default Content-Type.
  const { headers, ...rest } = options;
  try {
    const res = await fetch(BASE + url, {
      ...rest,
      headers: { "Content-Type": "application/json", ...headers },
    });

    if (res.status === 204) return { data: null, error: null };

    const data = await res.json();

    if (!res.ok) {
      // The structured object is passed through whole so callers can branch on `code`.
      const errPayload = data.error;
      let error = `Request failed (${res.status})`;
      if (typeof errPayload === "string" && errPayload) {
        error = errPayload;
      } else if (errPayload && typeof errPayload === "object") {
        error = errPayload;
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message || "Network error" };
  }
}

// ─── Evidence ────────────────────────────────────────────────────────────────

/**
 * @param {Object} [params] - Query filter params (e.g. { timeline_era, map_location }).
 * @returns {Promise<ApiResult>}
 */
export async function getEvidence(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/evidence${qs}`);
}

/**
 * @param {string} slug
 * @returns {Promise<ApiResult>}
 */
export async function getEvidenceBySlug(slug) {
  if (!slug) return { data: null, error: "Slug is required" };
  return request(`/evidence/${encodeURIComponent(slug)}`);
}

// ─── Essays / Contextual ─────────────────────────────────────────────────────

/**
 * @param {Object} [params]
 * @returns {Promise<ApiResult>}
 */
export async function getEssays(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/essays${qs}`);
}

/**
 * @param {string} slug
 * @returns {Promise<ApiResult>}
 */
export async function getEssayBySlug(slug) {
  if (!slug) return { data: null, error: "Slug is required" };
  return request(`/essays/${encodeURIComponent(slug)}`);
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

/**
 * @param {Object} [params]
 * @returns {Promise<ApiResult>}
 */
export async function getTimeline(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/timeline${qs}`);
}

// ─── Maps ─────────────────────────────────────────────────────────────────────

/**
 * @param {Object} [params]
 * @returns {Promise<ApiResult>}
 */
export async function getMaps(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/maps${qs}`);
}

/**
 * @param {string} mapKey
 * @returns {Promise<ApiResult>}
 */
export async function getMapByKey(mapKey) {
  if (!mapKey) return { data: null, error: "Map key is required" };
  return request(`/maps/${encodeURIComponent(mapKey)}`);
}

// ─── Arbor ────────────────────────────────────────────────────────────────────

/**
 * @param {Object} [params]
 * @returns {Promise<ApiResult>}
 */
export async function getArbor(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/arbor${qs}`);
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * @param {string} query
 * @param {string} [type] - Optional type filter (evidence, essays, responses, blog).
 * @returns {Promise<ApiResult>}
 */
export async function search(query, type) {
  if (!query) return { data: [], error: null };
  let url = `/search?q=${encodeURIComponent(query)}`;
  if (type) url += `&type=${encodeURIComponent(type)}`;
  return request(url);
}

// ─── Debate ───────────────────────────────────────────────────────────────────

/**
 * @param {Object} [params]
 * @returns {Promise<ApiResult>}
 */
export async function getPopularChallenges(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/popular-challenges${qs}`);
}

/**
 * @param {Object} [params]
 * @returns {Promise<ApiResult>}
 */
export async function getAcademicChallenges(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/academic-challenges${qs}`);
}

/**
 * @param {string} slug
 * @returns {Promise<ApiResult>}
 */
export async function getChallengeBySlug(slug) {
  if (!slug) return { data: null, error: "Slug is required" };
  return request(`/popular-challenges/${encodeURIComponent(slug)}`);
}

/**
 * @param {string} slug
 * @returns {Promise<ApiResult>}
 */
export async function getAcademicChallengeBySlug(slug) {
  if (!slug) return { data: null, error: "Slug is required" };
  return request(`/academic-challenges/${encodeURIComponent(slug)}`);
}

/**
 * @param {string} slug
 * @returns {Promise<ApiResult>}
 */
export async function getResponseBySlug(slug) {
  if (!slug) return { data: null, error: "Slug is required" };
  return request(`/responses/${encodeURIComponent(slug)}`);
}

/**
 * @param {Object} [params]
 * @returns {Promise<ApiResult>}
 */
export async function getResponses(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/responses${qs}`);
}

/**
 * @param {Object} [params]
 * @returns {Promise<ApiResult>}
 */
export async function getHistoriography(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/historiography${qs}`);
}

/**
 * @param {string} slug
 * @returns {Promise<ApiResult>}
 */
export async function getHistoriographyBySlug(slug) {
  if (!slug) return { data: null, error: "Slug is required" };
  return request(`/historiography/${encodeURIComponent(slug)}`);
}

// ─── Blog & News ──────────────────────────────────────────────────────────────

/**
 * @param {Object} [params]
 * @returns {Promise<ApiResult>}
 */
export async function getBlogPosts(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/blog-posts${qs}`);
}

/**
 * @param {string} slug
 * @returns {Promise<ApiResult>}
 */
export async function getBlogPostBySlug(slug) {
  if (!slug) return { data: null, error: "Slug is required" };
  return request(`/blog-posts/${encodeURIComponent(slug)}`);
}

/**
 * @param {Object} [params]
 * @returns {Promise<ApiResult>}
 */
export async function getNewsArticles(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/news-articles${qs}`);
}

/**
 * @param {string} slug
 * @returns {Promise<ApiResult>}
 */
export async function getNewsArticleBySlug(slug) {
  if (!slug) return { data: null, error: "Slug is required" };
  return request(`/news-articles/${encodeURIComponent(slug)}`);
}

// ─── Resources ────────────────────────────────────────────────────────────────

/**
 * @param {Object} [params]
 * @returns {Promise<ApiResult>}
 */
export async function getResources(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/resources${qs}`);
}

// ─── Site Settings ────────────────────────────────────────────────────────────

/**
 * Global site-branding metadata: title, description, og_image.
 *
 * @returns {Promise<ApiResult>}
 */
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

/**
 * @param {Object} [params]
 * @returns {Promise<ApiResult>}
 */
export async function getWikipediaArticles(params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/wikipedia${qs}`);
}

// ─── ESV passages ─────────────────────────────────────────────────────────────

/**
 * @param {string} reference - Bible reference, e.g. "Luke 1:1-3".
 * @returns {Promise<ApiResult>}
 */
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
 * @returns {Promise<void>} Resolves once the request settles; the result is not read.
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
