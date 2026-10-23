// Reads the cache headers that the live PUBLIC site sends and fails when one
// differs from the policy in setup/ARCHITECTURE/performance-and-caching.md.
// Run by the "Check live cache headers" step of .github/workflows/deploy.yml,
// after the purge. It sends only anonymous GET requests: /admin/ is not read,
// because it sits behind a login. Its no-cache rule is pinned as text by
// api/tests/guide-performance-and-caching.test.js.
//
// The expected Cache-Control values are not copied here. They are read from
// deploy/nginx.conf, so that this check and the nginx rule cannot drift. The
// deploy workflow checks out the repo first, for that reason.
//
// What it can see that no repo test can: the Cloudflare Cache Rule (D-070). A
// page is a cache HIT on a repeat request only while that rule is on, because
// Cloudflare does not cache HTML by default. Smart Tiered Cache (D-071) leaves
// no header, so this check cannot see it.

const fs = require("fs");
const path = require("path");

const SITE_ORIGIN = "https://thejesuswebsite.org";
const NGINX_PATH = path.resolve(__dirname, "..", "..", "deploy", "nginx.conf");

// A repeat request is a HIT only once the edge holds the page. The first
// request after a purge fills it, and a second location may need a third try.
const EDGE_ATTEMPTS = 3;

// nginx location headers, exactly as deploy/nginx.conf writes them.
const NGINX_HTML = "/";
const NGINX_ASSET_CODE = "~* ^/assets/(?:js|css)/";
const NGINX_ASSET_OTHER = "/assets/";
const NGINX_ASSET_MAPS = "~* ^/assets/images/maps/";

/** Replace each comment line with an empty line, so line numbers stay the same. */
function withoutHashComments(text) {
  return text
    .split("\n")
    .map((line) => (/^\s*#/.test(line) ? "" : line))
    .join("\n");
}

/**
 * Every top-level `location` block of the server, in file order.
 * @param {string} nginxText - Contents of deploy/nginx.conf.
 * @returns {{ header: string, body: string, start: number }[]} The text between
 *   `location` and `{` (trimmed), the block body, and the index where it starts.
 */
function locationBlocks(nginxText) {
  const text = withoutHashComments(nginxText);
  const blocks = [];
  for (const match of text.matchAll(/^ {4}location\s+(.+?)\s*\{/gm)) {
    const end = text.indexOf("\n    }", match.index);
    blocks.push({ header: match[1], body: text.slice(match.index, end), start: match.index });
  }
  return blocks;
}

/**
 * The Cache-Control values that one nginx location sets.
 * @param {string} nginxText - Contents of deploy/nginx.conf.
 * @param {string} header - The location header, for example "~* ^/assets/(?:js|css)/".
 * @returns {string[]} Every value of an add_header Cache-Control line in the block.
 *   Empty when the block is missing or sets none.
 */
function cacheControlOf(nginxText, header) {
  const block = locationBlocks(nginxText).find((candidate) => candidate.header === header);
  if (!block) return [];
  return [...block.body.matchAll(/add_header\s+Cache-Control\s+"([^"]*)"/g)].map((match) => match[1]);
}

// Compared as a set of directives: the maps location uses nginx `expires`, which
// adds its own max-age in front of the add_header value, so the live header
// repeats a directive that the nginx line writes once. Both mean the same.
const normalize = (value) =>
  [...new Set((value ?? "").toLowerCase().split(",").map((directive) => directive.trim()).filter(Boolean))].sort().join(", ");

/** Every URL that `html` loads from /assets/, as written in the page. */
function assetUrls(html) {
  return [...html.matchAll(/(?:src|href)="(\/assets\/[^"#]+)/g)].map((match) => match[1]);
}

/**
 * Fetch one URL and compare its Cache-Control with the expected value.
 * @param {Function} fetchImpl - Same signature as global fetch.
 * @param {string} label - What the URL stands for, for the failure message.
 * @param {string} url - Absolute URL.
 * @param {string} expected - The Cache-Control value that nginx sets for it.
 * @returns {Promise<string[]>} Failure messages. Empty when the header matches.
 */
async function checkCacheControl(fetchImpl, label, url, expected) {
  const response = await fetchImpl(url);
  if (response.status !== 200) return [`${label}: ${url} returned status ${response.status}, not 200.`];
  const actual = response.headers.get("cache-control");
  if (normalize(actual) !== normalize(expected)) {
    return [`${label}: ${url} sends Cache-Control "${actual}", but deploy/nginx.conf sets "${expected}".`];
  }
  return [];
}

/**
 * Read the one Cache-Control value that a location sets, or report why not.
 * @param {string} nginxText - Contents of deploy/nginx.conf.
 * @param {string} header - The location header.
 * @param {string[]} failures - Receives a message when the block is wrong.
 * @returns {string | null} The value, or null when it cannot be read.
 */
function expectedValue(nginxText, header, failures) {
  const values = cacheControlOf(nginxText, header);
  if (values.length === 1) return values[0];
  failures.push(`deploy/nginx.conf: "location ${header}" must set Cache-Control once, and it sets it ${values.length} times.`);
  return null;
}

/**
 * Check the live public site against the cache policy.
 * @param {{ site: string, fetchImpl: Function, nginxText: string }} options
 *   `site` is the origin without a trailing slash. `fetchImpl` has the signature of global fetch.
 * @returns {Promise<string[]>} One message per broken rule. Empty when the site matches.
 */
async function checkLiveHeaders({ site, fetchImpl, nginxText }) {
  const failures = [];
  const home = await fetchImpl(`${site}/`);
  const homeHtml = await home.text();

  // HTML: browser time from the origin header, and a repeat request served by the edge.
  const htmlExpected = expectedValue(nginxText, NGINX_HTML, failures);
  if (htmlExpected) failures.push(...(await checkCacheControl(fetchImpl, "HTML", `${site}/`, htmlExpected)));

  let hit = false;
  for (let attempt = 0; attempt < EDGE_ATTEMPTS && !hit; attempt++) {
    const repeat = await fetchImpl(`${site}/`);
    hit = repeat.headers.get("cf-cache-status") === "HIT";
  }
  if (!hit) {
    failures.push(
      `Edge: ${site}/ was not a Cloudflare cache HIT in ${EDGE_ATTEMPTS} repeat requests. The Cache Rule for HTML in the Cloudflare dashboard (D-070) is off or does not match.`
    );
  }

  // JS and CSS: the deploy must have stamped the URL, and nginx caches it for a year.
  const urls = assetUrls(homeHtml);
  const codeExpected = expectedValue(nginxText, NGINX_ASSET_CODE, failures);
  for (const [label, folder] of [["JS", "/assets/js/"], ["CSS", "/assets/css/"]]) {
    const url = urls.find((candidate) => candidate.startsWith(folder));
    if (!url) {
      failures.push(`${label}: the home page loads nothing from ${folder}, so its cache header cannot be checked.`);
      continue;
    }
    if (!/\?v=[^&"]+/.test(url)) {
      failures.push(`${label}: ${url} has no ?v= stamp. The deploy skipped api/scripts/version-assets.js, so browsers keep old code for a year.`);
    }
    if (codeExpected) failures.push(...(await checkCacheControl(fetchImpl, label, `${site}${url}`, codeExpected)));
  }

  // Other assets: a stable URL, cached for a year.
  const image = urls.find((candidate) => /^\/assets\/images\/(?!maps\/).+\.(?:jpe?g|png|webp|avif)$/i.test(candidate));
  const otherExpected = expectedValue(nginxText, NGINX_ASSET_OTHER, failures);
  if (!image) {
    failures.push("Image: the home page loads no picture from /assets/images/, so its cache header cannot be checked.");
  } else if (otherExpected) {
    failures.push(...(await checkCacheControl(fetchImpl, "Image", `${site}${image}`, otherExpected)));
  }

  // Maps: stable filename, so the short revalidating rule and a ?v= in the stored path.
  const mapsResponse = await fetchImpl(`${site}/api/maps`);
  const maps = mapsResponse.status === 200 ? await mapsResponse.json() : [];
  const mapPath = maps.map((map) => map.image_path).find(Boolean);
  const mapsExpected = expectedValue(nginxText, NGINX_ASSET_MAPS, failures);
  if (!mapPath) {
    failures.push(`Maps: ${site}/api/maps returned no image_path, so the map header cannot be checked.`);
  } else {
    if (!/\?v=\d+/.test(mapPath)) failures.push(`Maps: image_path "${mapPath}" has no ?v= value.`);
    if (mapsExpected) failures.push(...(await checkCacheControl(fetchImpl, "Maps", `${site}${mapPath}`, mapsExpected)));
  }

  // Public API read: cacheable, never a private or no-store value. The exact value is set in
  // api/middleware/security-headers.js and is pinned by api/tests/security-headers.test.js.
  const apiCacheControl = normalize(mapsResponse.headers.get("cache-control"));
  if (!/\bpublic\b/.test(apiCacheControl) || !/max-age=\d+/.test(apiCacheControl)) {
    failures.push(`API: ${site}/api/maps sends Cache-Control "${apiCacheControl}", not a public max-age value.`);
  }

  return failures;
}

async function main() {
  const nginxText = fs.readFileSync(NGINX_PATH, "utf8");
  const failures = await checkLiveHeaders({ site: SITE_ORIGIN, fetchImpl: fetch, nginxText });
  if (failures.length > 0) {
    console.error(`Live cache headers break the policy in setup/ARCHITECTURE/performance-and-caching.md:\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log("Live cache headers match the policy.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("check-live-headers failed:", error);
    process.exit(1);
  });
}

module.exports = { checkLiveHeaders, cacheControlOf, locationBlocks, NGINX_HTML, NGINX_ASSET_CODE, NGINX_ASSET_OTHER, NGINX_ASSET_MAPS };
