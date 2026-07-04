// Shared admin helpers — API wrappers, DOM factories, formatters, and publish
// shortcuts. Pure vanilla JS, no framework dependencies (SR-2/SR-3).
// All API helpers enforce 401 → login redirect and surface structured errors.
//
// Raw fetch stays here (JS-5); pages import just this module and call the
// friendly wrappers.

window.Admin = {};
const Admin = window.Admin;

/* ─────────────────────────────────────────────────────────────────────────────
   API helpers
   Every method:
   - Redirects to auth/login.html on 401
   - Throws with a human-readable message on 4xx/5xx
   - Returns the parsed JSON body (204 returns null for DELETE)
   ───────────────────────────────────────────────────────────────────────────── */

Admin.api = {
  BASE: "/api",

  /**
   * GET a JSON endpoint.
   * @param {string} url
   * @returns {Promise<any>}
   */
  async get(url) {
    const res = await fetch(this.BASE + url);
    if (res.status === 401) {
      window.location.href = "auth/login.html";
      throw new Error("Unauthorized");
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Request failed (" + res.status + ")");
    }
    return res.json();
  },

  /**
   * POST JSON to an endpoint.
   * @param {string} url
   * @param {*} data
   * @returns {Promise<any>}
   */
  async post(url, data) {
    const res = await fetch(this.BASE + url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.status === 401) {
      window.location.href = "auth/login.html";
      throw new Error("Unauthorized");
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Request failed (" + res.status + ")");
    }
    return res.json();
  },

  /**
   * PUT JSON to an endpoint.
   * @param {string} url
   * @param {*} data
   * @returns {Promise<any>}
   */
  async put(url, data) {
    const res = await fetch(this.BASE + url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.status === 401) {
      window.location.href = "auth/login.html";
      throw new Error("Unauthorized");
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Request failed (" + res.status + ")");
    }
    return res.json();
  },

  /**
   * DELETE an endpoint.
   * @param {string} url
   * @returns {Promise<any>}  null on 204, parsed JSON otherwise.
   */
  async del(url) {
    const res = await fetch(this.BASE + url, { method: "DELETE" });
    if (res.status === 401) {
      window.location.href = "auth/login.html";
      throw new Error("Unauthorized");
    }
    if (!res.ok && res.status !== 204) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Request failed (" + res.status + ")");
    }
    return res.status === 204 ? null : res.json();
  },
};

/* ─────────────────────────────────────────────────────────────────────────────
   DOM factories (JS-6: never innerHTML with API data; use element builders)
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Build a status badge element.
 * @param {number|boolean} publishedDraft  truthy = published, falsy = draft
 * @returns {HTMLSpanElement}
 */
Admin.statusBadge = function (publishedDraft) {
  const span = document.createElement("span");
  span.className =
    "admin-badge " +
    (publishedDraft ? "admin-badge--published" : "admin-badge--draft");
  span.textContent = publishedDraft ? "Published" : "Draft";
  return span;
};

/**
 * Build a type badge element (e.g. "evidence", "essays").
 * @param {string} type
 * @returns {HTMLSpanElement}
 */
Admin.typeBadge = function (type) {
  const span = document.createElement("span");
  span.className = "admin-badge admin-badge--type";
  span.textContent = type;
  return span;
};

/* ─────────────────────────────────────────────────────────────────────────────
   Pure formatters
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Format a number with locale-aware commas.
 * @param {number|string} n
 * @returns {string}
 */
Admin.formatNumber = function (n) {
  return Number(n).toLocaleString();
};

/**
 * Format an ISO date string to a readable short date.
 * @param {string|null|undefined} isoString
 * @returns {string}
 */
Admin.formatDate = function (isoString) {
  if (!isoString) return "\u2014";
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/* ─────────────────────────────────────────────────────────────────────────────
   Publish / unpublish shortcuts
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Publish (set published_draft=1) for a given type and id.
 * @param {string} type  one of: evidence, essays, responses, historiography,
 *                       blog-posts, news-articles, wikipedia, popular-challenges,
 *                       academic-challenges, collections
 * @param {number|string} id
 * @returns {Promise<any>}
 */
Admin.publishItem = async function (type, id) {
  return Admin.api.post("/publish/" + type + "/" + id);
};

/**
 * Unpublish (set published_draft=0) for a given type and id.
 * @param {string} type
 * @param {number|string} id
 * @returns {Promise<any>}
 */
Admin.unpublishItem = async function (type, id) {
  return Admin.api.del("/publish/" + type + "/" + id);
};
