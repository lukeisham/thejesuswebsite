// Smoke test for api/scripts/check-live-headers.js. It uses a hand-built fetch
// that answers from a table, so no request leaves the machine (TEST-4).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { checkLiveHeaders, cacheControlOf, NGINX_HTML, NGINX_ASSET_CODE, NGINX_ASSET_OTHER, NGINX_ASSET_MAPS } = require("../scripts/check-live-headers");

const SITE = "https://example.test";
const NGINX_TEXT = fs.readFileSync(path.resolve(__dirname, "..", "..", "deploy", "nginx.conf"), "utf8");

const HOME_HTML = [
  '<link rel="stylesheet" href="/assets/css/base/reset.css?v=abc1234">',
  '<img src="/assets/images/hero.jpg">',
  '<script type="module" src="/assets/js/main.js?v=abc1234"></script>',
].join("\n");

/** The responses of a healthy site, as the policy describes it. */
function healthySite() {
  const code = cacheControlOf(NGINX_TEXT, NGINX_ASSET_CODE)[0];
  return {
    [`${SITE}/`]: { body: HOME_HTML, headers: { "cache-control": cacheControlOf(NGINX_TEXT, NGINX_HTML)[0], "cf-cache-status": "HIT" } },
    [`${SITE}/assets/css/base/reset.css?v=abc1234`]: { body: "", headers: { "cache-control": code } },
    [`${SITE}/assets/js/main.js?v=abc1234`]: { body: "", headers: { "cache-control": code } },
    [`${SITE}/assets/images/hero.jpg`]: { body: "", headers: { "cache-control": cacheControlOf(NGINX_TEXT, NGINX_ASSET_OTHER)[0] } },
    [`${SITE}/api/maps`]: { body: JSON.stringify([{ image_path: "/assets/images/maps/galilee.svg?v=3" }]), headers: { "cache-control": "public, max-age=60" } },
    [`${SITE}/assets/images/maps/galilee.svg?v=3`]: { body: "", headers: { "cache-control": cacheControlOf(NGINX_TEXT, NGINX_ASSET_MAPS)[0] } },
  };
}

/** A fetch that answers from `table`, and returns 404 for a URL the table lacks. */
function fakeFetch(table) {
  return async (url) => {
    const entry = table[url];
    if (!entry) return new Response("", { status: 404 });
    return new Response(entry.body, { status: 200, headers: entry.headers });
  };
}

describe("check-live-headers", () => {
  test("cacheControlOf reads the value of each cache class from deploy/nginx.conf", () => {
    assert.deepEqual(cacheControlOf(NGINX_TEXT, NGINX_HTML), ["public, max-age=60"]);
    assert.match(cacheControlOf(NGINX_TEXT, NGINX_ASSET_CODE)[0], /immutable/);
    assert.deepEqual(cacheControlOf(NGINX_TEXT, "/no-such-location/"), []);
  });

  test("a site that follows the policy produces no failure", async () => {
    const failures = await checkLiveHeaders({ site: SITE, fetchImpl: fakeFetch(healthySite()), nginxText: NGINX_TEXT });
    assert.deepEqual(failures, []);
  });

  test("a maps header that repeats a directive still passes", async () => {
    const table = healthySite();
    table[`${SITE}/assets/images/maps/galilee.svg?v=3`].headers["cache-control"] = "max-age=3600, public, max-age=3600, must-revalidate";
    const failures = await checkLiveHeaders({ site: SITE, fetchImpl: fakeFetch(table), nginxText: NGINX_TEXT });
    assert.deepEqual(failures, []);
  });

  test("a JS file without immutable is reported with its URL", async () => {
    const table = healthySite();
    table[`${SITE}/assets/js/main.js?v=abc1234`].headers["cache-control"] = "public, max-age=60";
    const failures = await checkLiveHeaders({ site: SITE, fetchImpl: fakeFetch(table), nginxText: NGINX_TEXT });
    assert.equal(failures.length, 1);
    assert.match(failures[0], /JS: .*main\.js\?v=abc1234 sends Cache-Control "public, max-age=60"/);
  });
});
