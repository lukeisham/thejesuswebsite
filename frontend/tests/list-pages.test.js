// Smoke tests for the infinite-scroll list pages (blog-list, essays-list,
// historiography-list): each reads page and limit from the paginated API and
// restores its sessionStorage cache together with the paging state, so a
// reader who goes back keeps scrolling past the cached pages.
// The modules run at import time against document globals, so a small
// hand-built fake DOM stands in for the page (TEST-8). Each case imports a
// fresh copy of the module through a query string.

const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const realFetch = globalThis.fetch;
const GLOBAL_NAMES = ["document", "window", "sessionStorage", "IntersectionObserver", "requestAnimationFrame", "Element"];
const realGlobals = Object.fromEntries(GLOBAL_NAMES.map((name) => [name, globalThis[name]]));

class FakeElement {
  hidden = false;
  children = [];
  className = "";
  textContent = "";
  _html = "";
  appendChild(child) { this.children.push(child); return child; }
  setAttribute() {}
  addEventListener() {}
  removeEventListener() {}
  querySelector() { return null; }
  set innerHTML(value) { this._html = value; if (value === "") this.children = []; }
  get innerHTML() { return this._html; }
  get firstElementChild() { return this._html ? new FakeElement() : null; }
}

const makeElement = () => new FakeElement();

let elements;
let storage;
let observerCallback;
let fetchedUrls;

function installFakeBrowser() {
  elements = new Map();
  storage = new Map();
  observerCallback = null;
  fetchedUrls = [];
  const byId = (id) => {
    if (!elements.has(id)) elements.set(id, makeElement());
    return elements.get(id);
  };
  globalThis.document = {
    readyState: "complete",
    body: makeElement(),
    getElementById: byId,
    createElement: makeElement,
    createElementNS: makeElement,
    createTextNode: (text) => ({ textContent: text }),
    addEventListener() {},
  };
  globalThis.Element = FakeElement;
  globalThis.window = { scrollY: 0, scrollTo() {} };
  globalThis.sessionStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
  globalThis.IntersectionObserver = class {
    constructor(callback) { observerCallback = callback; }
    observe() {}
  };
  globalThis.requestAnimationFrame = (callback) => callback();
  globalThis.fetch = async (url) => {
    fetchedUrls.push(url);
    const body = { items: [SAMPLE_ITEM], total: 1, page: 1, limit: 20, totalPages: 1 };
    return { ok: true, status: 200, json: async () => body };
  };
}

const SAMPLE_ITEM = {
  slug: "a-post",
  title: "A",
  essay_title: "A",
  blog_title: "A",
  _title: "A",
  created_at: "2024-03-15T12:00:00Z",
};

const PAGES = [
  { name: "blog-list", file: "blog-list.js", key: "blog_list_items_v2", path: "/api/blog-posts" },
  { name: "essays-list", file: "essays-list.js", key: "essays_list_items", path: "/api/essays" },
  { name: "historiography-list", file: "historiography-list.js", key: "historiography_list_items", path: "/api/historiography" },
];

let importCount = 0;
const loadPage = (file) => import(`../assets/js/${file}?case=${importCount++}`);
const settle = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(installFakeBrowser);

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const name of GLOBAL_NAMES) {
    if (realGlobals[name] === undefined) delete globalThis[name];
    else globalThis[name] = realGlobals[name];
  }
});

for (const page of PAGES) {
  describe(page.name, () => {
    test("first load asks the API for page 1 with a limit and stores the paging state", async () => {
      await loadPage(page.file);
      await settle();
      assert.equal(fetchedUrls.length, 1);
      assert.ok(fetchedUrls[0].startsWith(`${page.path}?`), fetchedUrls[0]);
      const params = new URLSearchParams(fetchedUrls[0].split("?")[1]);
      assert.equal(params.get("page"), "1");
      assert.equal(params.get("limit"), "20");
      const saved = JSON.parse(storage.get(page.key));
      assert.equal(saved.items.length, 1);
      assert.equal(saved.hasMore, false);
    });

    test("a cache that has more pages restores the items and keeps the sentinel active", async () => {
      storage.set(page.key, JSON.stringify({ items: [SAMPLE_ITEM], currentPage: 2, hasMore: true }));
      await loadPage(page.file);
      assert.equal(fetchedUrls.length, 0);
      assert.equal(elements.get("card-grid").children.length, 1);
      assert.equal(elements.get("scroll-sentinel").hidden, false);
      assert.equal(elements.get("end-of-list").hidden, true);
    });

    test("scrolling after a restore fetches the page after the cached ones", async () => {
      storage.set(page.key, JSON.stringify({ items: [SAMPLE_ITEM], currentPage: 2, hasMore: true }));
      await loadPage(page.file);
      observerCallback([{ isIntersecting: true }]);
      await settle();
      assert.equal(fetchedUrls.length, 1);
      assert.equal(new URLSearchParams(fetchedUrls[0].split("?")[1]).get("page"), "2");
    });

    test("a cache that reached the last page restores the end state", async () => {
      storage.set(page.key, JSON.stringify({ items: [SAMPLE_ITEM], currentPage: 1, hasMore: false }));
      await loadPage(page.file);
      assert.equal(fetchedUrls.length, 0);
      assert.equal(elements.get("scroll-sentinel").hidden, true);
      assert.equal(elements.get("end-of-list").hidden, false);
    });

    test("an older cache without paging state is discarded and the list reloads", async () => {
      storage.set(page.key, JSON.stringify([SAMPLE_ITEM]));
      await loadPage(page.file);
      await settle();
      assert.equal(fetchedUrls.length, 1);
      assert.equal(JSON.parse(storage.get(page.key)).currentPage, 1);
    });
  });
}
