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

/** @param {string} query */
export async function search(query) {
  if (!query) return { data: [], error: null };
  return request(`/search?q=${encodeURIComponent(query)}`);
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
 * Record a page view. Fire and forget — never throws, never blocks the page.
 *
 * @param {string} page - The URL path.
 */
export async function recordPageView(page) {
  if (typeof page !== "string" || page.length === 0) return;
  try {
    await fetch(BASE + "/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page }),
    });
  } catch {
    // Page views must never break the user experience.
  }
}
