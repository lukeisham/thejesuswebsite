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
    const res = await AdminHttp.request(this.BASE + url);
    if (res.status === 401) {
      window.location.href = "/admin/auth/login.html";
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
    const res = await AdminHttp.request(this.BASE + url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.status === 401) {
      window.location.href = "/admin/auth/login.html";
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
    const res = await AdminHttp.request(this.BASE + url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.status === 401) {
      window.location.href = "/admin/auth/login.html";
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
    const res = await AdminHttp.request(this.BASE + url, { method: "DELETE" });
    if (res.status === 401) {
      window.location.href = "/admin/auth/login.html";
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
   String helpers
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Convert arbitrary text into a URL-safe slug.
 * Lowercase, strip non-alphanumeric, collapse whitespace to hyphens,
 * deduplicate hyphens, trim leading/trailing hyphens.
 * @param {string} text
 * @returns {string}
 */
Admin.slugify = function (text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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

/* ─────────────────────────────────────────────────────────────────────────────
   Cross-type challenge helpers (used by Response forms/list to resolve
   challenge_id → title + type when a response can reference either kind)
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Merge two challenge arrays, tagging each item with its type.
 * Pure function — no side effects, returns a new array.
 * @param {Array} popularItems
 * @param {Array} academicItems
 * @returns {Array} merged array with `type` property added to each item
 */
function mergeChallenges(popularItems, academicItems) {
  var merged = [];
  if (Array.isArray(popularItems)) {
    for (var i = 0; i < popularItems.length; i++) {
      var item = popularItems[i];
      item.type = "popular";
      merged.push(item);
    }
  }
  if (Array.isArray(academicItems)) {
    for (var j = 0; j < academicItems.length; j++) {
      var aItem = academicItems[j];
      aItem.type = "academic";
      merged.push(aItem);
    }
  }
  return merged;
}

/**
 * Fetch all challenges from both kinds and return a merged array.
 * Each item has `type: 'popular'` or `type: 'academic'`.
 * @returns {Promise<Array>}
 */
Admin.getAllChallenges = async function () {
  var popularData = await Admin.api.get("/popular-challenges");
  var academicData = await Admin.api.get("/academic-challenges");
  var popularItems = popularData && popularData.items ? popularData.items : [];
  var academicItems =
    academicData && academicData.items ? academicData.items : [];
  return mergeChallenges(popularItems, academicItems);
};

/* ─────────────────────────────────────────────────────────────────────────────
   Image upload helper
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Upload an image file to the server. Client-side size guard (reject > 5 MB
 * before encoding), reads the File via FileReader to base64, POSTs to /uploads.
 * Returns { image_path }.
 * @param {File} file
 * @returns {Promise<{ image_path: string }>}
 */
Admin.uploadImage = async function (file) {
  if (!(file instanceof File)) {
    throw new Error("Expected a File object.");
  }

  var MAX_BYTES = 5 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    throw new Error(
      "File is too large (" +
        (file.size / (1024 * 1024)).toFixed(1) +
        " MB). Maximum is 5 MB.",
    );
  }

  var data = await new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () {
      // result is "data:image/png;base64,xxxxx" — strip the prefix
      var base64 = reader.result;
      if (typeof base64 === "string") {
        var commaIdx = base64.indexOf(",");
        if (commaIdx !== -1) base64 = base64.slice(commaIdx + 1);
      }
      resolve(base64);
    };
    reader.onerror = function () {
      reject(new Error("Failed to read file."));
    };
    reader.readAsDataURL(file);
  });

  return Admin.api.post("/uploads", { filename: file.name, data: data });
};
