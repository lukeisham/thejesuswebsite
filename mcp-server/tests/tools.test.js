// MCP tool tests — uses node:test + node:assert.
// Each tool's pure input-validation and request-URL/params building is tested
// by injecting a mock apiRequest that records the path rather than hitting the
// real API, so tests run offline and deterministically (JS-5 / JS-2).

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { get } from "node:http";

// --- Tool imports ------------------------------------------------------------

import * as searchEvidence from "../tools/searchEvidence.js";
import * as getItemBySlug from "../tools/getItemBySlug.js";
import * as getEssayBySlug from "../tools/getEssayBySlug.js";
import * as getBlogPostBySlug from "../tools/getBlogPostBySlug.js";
import * as getNewsArticleBySlug from "../tools/getNewsArticleBySlug.js";
import * as getTimelineEvents from "../tools/getTimelineEvents.js";
import * as getMapData from "../tools/getMapData.js";

// --- Mock helper -------------------------------------------------------------

/**
 * Creates a mock apiRequest that records the called path and returns the given
 * data (or the provided fake). Useful for asserting the constructed URL.
 */
function mockApiRequest(expectedData) {
  let recordedPath = null;

  const fn = async (path) => {
    recordedPath = path;
    return expectedData;
  };
  fn.recordedPath = () => recordedPath;

  return fn;
}

// --- searchEvidence ----------------------------------------------------------

describe("searchEvidence", () => {
  it("builds correct URL with query only", async () => {
    const apiRequest = mockApiRequest([{ title: "Result" }]);
    const result = await searchEvidence.handler({ query: "jesus" }, apiRequest);

    assert.equal(apiRequest.recordedPath(), "/search?q=jesus");
    assert.equal(result.isError, undefined);
  });

  it("includes optional type and limit params", async () => {
    const apiRequest = mockApiRequest([]);
    await searchEvidence.handler(
      { query: "baptism", type: "evidence", limit: 10 },
      apiRequest,
    );

    assert.equal(
      apiRequest.recordedPath(),
      "/search?q=baptism&type=evidence&limit=10",
    );
  });

  it("clamps limit to 1–100 range", async () => {
    const apiRequest = mockApiRequest([]);

    await searchEvidence.handler({ query: "x", limit: 0 }, apiRequest);
    assert.equal(apiRequest.recordedPath(), "/search?q=x&limit=1");

    await searchEvidence.handler({ query: "x", limit: 200 }, apiRequest);
    assert.equal(apiRequest.recordedPath(), "/search?q=x&limit=100");
  });

  it("returns error for empty query", async () => {
    const apiRequest = mockApiRequest(null);
    const result = await searchEvidence.handler({ query: "   " }, apiRequest);

    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Error: query must be/);
  });
});

// --- getItemBySlug -----------------------------------------------------------

describe("getItemBySlug", () => {
  it("builds correct URL with slug", async () => {
    const apiRequest = mockApiRequest({ title: "Baptism", slug: "baptism" });
    const result = await getItemBySlug.handler(
      { slug: "baptism-of-jesus" },
      apiRequest,
    );

    assert.equal(apiRequest.recordedPath(), "/evidence/baptism-of-jesus");
    assert.equal(
      result.content[0].text,
      JSON.stringify({ title: "Baptism", slug: "baptism" }, null, 2),
    );
  });

  it("returns error for empty slug", async () => {
    const apiRequest = mockApiRequest(null);
    const result = await getItemBySlug.handler({ slug: "" }, apiRequest);

    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Error: slug must be/);
  });

  it("returns error when API responds with error", async () => {
    const apiRequest = mockApiRequest({ error: "Evidence not found." });
    const result = await getItemBySlug.handler(
      { slug: "nonexistent" },
      apiRequest,
    );

    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Evidence not found/);
  });
});

// --- getEssayBySlug ----------------------------------------------------------

describe("getEssayBySlug", () => {
  it("builds correct URL with slug", async () => {
    const apiRequest = mockApiRequest({ slug: "messianic-expectations" });
    const result = await getEssayBySlug.handler(
      { slug: "messianic-expectations" },
      apiRequest,
    );

    assert.equal(apiRequest.recordedPath(), "/essays/messianic-expectations");
    assert.ok(result.content[0].text.includes("messianic-expectations"));
  });

  it("returns error for empty slug", async () => {
    const apiRequest = mockApiRequest(null);
    const result = await getEssayBySlug.handler({ slug: "  " }, apiRequest);

    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Error: slug must be/);
  });
});

// --- getBlogPostBySlug -------------------------------------------------------

describe("getBlogPostBySlug", () => {
  it("builds correct URL with slug", async () => {
    const apiRequest = mockApiRequest({ slug: "debate-update" });
    await getBlogPostBySlug.handler({ slug: "debate-update" }, apiRequest);

    assert.equal(apiRequest.recordedPath(), "/blog-posts/debate-update");
  });

  it("returns error for empty slug", async () => {
    const apiRequest = mockApiRequest(null);
    const result = await getBlogPostBySlug.handler({ slug: "" }, apiRequest);

    assert.equal(result.isError, true);
  });
});

// --- getNewsArticleBySlug ----------------------------------------------------

describe("getNewsArticleBySlug", () => {
  it("builds correct URL with slug", async () => {
    const apiRequest = mockApiRequest({ slug: "qumran-discovery" });
    await getNewsArticleBySlug.handler(
      { slug: "qumran-discovery" },
      apiRequest,
    );

    assert.equal(apiRequest.recordedPath(), "/news-articles/qumran-discovery");
  });

  it("returns error for empty slug", async () => {
    const apiRequest = mockApiRequest(null);
    const result = await getNewsArticleBySlug.handler({ slug: "" }, apiRequest);

    assert.equal(result.isError, true);
  });
});

// --- getTimelineEvents -------------------------------------------------------

describe("getTimelineEvents", () => {
  it("requests full timeline when no era given", async () => {
    const apiRequest = mockApiRequest([{ title: "Event 1" }]);
    const result = await getTimelineEvents.handler({}, apiRequest);

    assert.equal(apiRequest.recordedPath(), "/timeline");
    assert.equal(result.isError, undefined);
  });

  it("appends timeline_era query param for valid era", async () => {
    const apiRequest = mockApiRequest([]);
    await getTimelineEvents.handler({ era: "beginning" }, apiRequest);

    assert.equal(apiRequest.recordedPath(), "/timeline?timeline_era=beginning");
  });

  it("returns error for invalid era", async () => {
    const apiRequest = mockApiRequest(null);
    const result = await getTimelineEvents.handler(
      { era: "medieval" },
      apiRequest,
    );

    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Error: era must be/);
  });

  it("treats empty-era string same as no era", async () => {
    const apiRequest = mockApiRequest([]);
    await getTimelineEvents.handler({ era: "  " }, apiRequest);

    assert.equal(apiRequest.recordedPath(), "/timeline");
  });
});

// --- getMapData --------------------------------------------------------------

describe("getMapData", () => {
  it("builds correct URL with map key", async () => {
    const apiRequest = mockApiRequest({
      map_key: "galilee",
      map_name: "Galilee",
    });
    const result = await getMapData.handler({ mapKey: "galilee" }, apiRequest);

    assert.equal(apiRequest.recordedPath(), "/maps/galilee");
    assert.ok(result.content[0].text.includes("Galilee"));
  });

  it("returns error for empty mapKey", async () => {
    const apiRequest = mockApiRequest(null);
    const result = await getMapData.handler({ mapKey: "" }, apiRequest);

    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Error: mapKey must be/);
  });

  it("returns error when API responds with error", async () => {
    const apiRequest = mockApiRequest({ error: "Map not found." });
    const result = await getMapData.handler(
      { mapKey: "nonexistent" },
      apiRequest,
    );

    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Map not found/);
  });
});

// --- HTTP server integration test --------------------------------------------
// Spawns server.js in Streamable HTTP mode, waits for it to bind, then verifies
// the /health endpoint responds correctly. Uses a dedicated test port to avoid
// colliding with a running dev server.

const TEST_PORT = 3099;

describe("HTTP server", () => {
  let serverProcess;

  before(async () => {
    serverProcess = spawn("node", ["server.js"], {
      cwd: new URL("..", import.meta.url).pathname,
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        API_BASE_URL: "http://localhost:3000/api",
      },
      stdio: "pipe",
    });

    // Wait for the server to print its listening message.
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Server start timed out after 5 s")),
        5000,
      );

      const onData = (data) => {
        const msg = data.toString();
        if (msg.includes("MCP server listening")) {
          clearTimeout(timeout);
          resolve();
        }
      };

      serverProcess.stdout.on("data", onData);
      serverProcess.stderr.on("data", onData);
      serverProcess.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  });

  after(() => {
    if (serverProcess) {
      serverProcess.kill("SIGTERM");
    }
  });

  it("responds to /health with 200 and status ok", async () => {
    const response = await new Promise((resolve, reject) => {
      const req = get(`http://localhost:${TEST_PORT}/health`, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () =>
          resolve({ status: res.statusCode, headers: res.headers, body }),
        );
      });
      req.on("error", reject);
      req.end();
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers["content-type"], "application/json");
    assert.deepEqual(JSON.parse(response.body), { status: "ok" });
  });
});
