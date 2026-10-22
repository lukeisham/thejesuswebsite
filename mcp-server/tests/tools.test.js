// MCP tool tests — uses node:test + node:assert.
// Each tool's pure input-validation and request-URL/params building is tested
// by injecting a mock apiRequest that records the path rather than hitting the
// real API, so tests run offline and deterministically (JS-5 / JS-2).

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { get } from "node:http";
import { readFileSync } from "node:fs";

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
 * Creates an apiRequest fake that throws like server.js apiRequest does for a
 * non-2xx reply: a message plus the HTTP status on error.status.
 */
function failingApiRequest(status) {
  return async () => {
    const error = new Error(`Upstream API returned ${status}`);
    error.status = status;
    throw error;
  };
}

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

  it("turns an upstream 404 throw into a not-found result", async () => {
    const apiRequest = failingApiRequest(404);
    const result = await getBlogPostBySlug.handler({ slug: "gone" }, apiRequest);

    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Blog post not found/);
  });

  it("rethrows an upstream failure that is not a 404", async () => {
    const apiRequest = failingApiRequest(500);

    await assert.rejects(
      getBlogPostBySlug.handler({ slug: "x" }, apiRequest),
      /returned 500/,
    );
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
    await getTimelineEvents.handler({ era: "PreIncarnation" }, apiRequest);

    assert.equal(
      apiRequest.recordedPath(),
      "/timeline?timeline_era=PreIncarnation",
    );
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

// --- Upstream 404 handling ----------------------------------------------------
// server.js apiRequest throws on every non-2xx reply, so each tool must turn a
// status-404 error into its not-found result and rethrow anything else.

describe("upstream 404 handling", () => {
  const cases = [
    ["getItemBySlug", getItemBySlug, { slug: "gone" }, /Evidence not found/],
    ["getEssayBySlug", getEssayBySlug, { slug: "gone" }, /Essay not found/],
    ["getNewsArticleBySlug", getNewsArticleBySlug, { slug: "gone" }, /News article not found/],
    ["getMapData", getMapData, { mapKey: "gone" }, /Map not found/],
  ];

  for (const [toolName, tool, args, notFoundText] of cases) {
    it(`${toolName} returns not-found on a status-404 error`, async () => {
      const result = await tool.handler(args, failingApiRequest(404));

      assert.equal(result.isError, true);
      assert.match(result.content[0].text, notFoundText);
    });

    it(`${toolName} rethrows a status-500 error`, async () => {
      await assert.rejects(
        tool.handler(args, failingApiRequest(500)),
        /returned 500/,
      );
    });
  }
});

// --- Real apiRequest status ----------------------------------------------------
// Importing server.js would start its HTTP server, so this test evaluates the
// real apiRequest source text from server.js (TEST-9) against a stubbed fetch.
// The tools above depend on error.status, so a change to how apiRequest sets
// it must fail here.

describe("server.js apiRequest", () => {
  const source = readFileSync(new URL("../server.js", import.meta.url), "utf8");
  const start = source.indexOf("export async function apiRequest");
  const end = source.indexOf("\n}\n", start);
  const apiRequest = new Function(
    "API_BASE_URL",
    `${source.slice(start, end + 3).replace("export ", "")}\nreturn apiRequest;`,
  )("http://stub");

  it("throws an error carrying the HTTP status on a 404", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    try {
      await assert.rejects(apiRequest("/essays/x"), (err) => {
        assert.equal(err.status, 404);
        assert.match(err.message, /returned 404/);
        return true;
      });
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

// --- HTTP server integration test --------------------------------------------
// Spawns server.js in Streamable HTTP mode, waits for it to bind, then verifies
// the /health endpoint responds correctly. Uses a dedicated test port to avoid
// colliding with a running dev server. Requests go to 127.0.0.1 because that is
// the only address server.js binds (HOST in server.js).

const TEST_PORT = 3099;

describe("HTTP server", () => {
  let serverProcess;

  before(async () => {
    serverProcess = spawn("node", ["server.js"], {
      cwd: new URL("..", import.meta.url).pathname,
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        API_BASE_URL: "http://localhost:3000",
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
      const req = get(`http://127.0.0.1:${TEST_PORT}/health`, (res) => {
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

  // A POST with a real JSON-RPC message must reach the tool registry. The
  // server once passed the body as a string, so every POST failed to parse.
  function postMcp(rawBody) {
    return fetch(`http://127.0.0.1:${TEST_PORT}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: rawBody,
    });
  }

  // A stateless transport serves one request. When server.js reused one
  // transport, the first POST answered 200 and every later one answered 500.
  it("answers a second tools/list POST with 200", async () => {
    const body = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const first = await postMcp(body);
    await first.text();
    const second = await postMcp(body);
    const text = await second.text();

    assert.equal(second.status, 200);
    assert.match(text, /searchEvidence/);
  });

  it("answers a tools/list POST with the tool names", async () => {
    const res = await postMcp(
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    );
    const text = await res.text();

    assert.equal(res.status, 200);
    assert.match(text, /searchEvidence/);
    assert.match(text, /getMapData/);
  });

  it("rejects a POST body that is not JSON with 400", async () => {
    const res = await postMcp("{not json");
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.error.code, -32700);
  });
});
