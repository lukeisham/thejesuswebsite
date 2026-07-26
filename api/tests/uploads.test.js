// Upload route tests — uses node:test + node:assert.
// Tests POST /uploads with valid/invalid/oversized base64 payloads.
//
// Mounts the REAL router (routes/uploads.js) rather than a hand-rolled
// stand-in — a prior version of this file reimplemented the handler
// inline, which meant it could never catch a regression in the real
// route (the same defect class logged as Issues.md #104/#110/#128). The
// route's upload destination (public/uploads/<yyyy>/<mm>/) is not
// injectable, so every file this suite writes is tracked and removed in
// `after()`.

const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const requireAuth = require("../middleware/auth");
const { createTestServer, closeTestServer } = require("./helpers/test-server");
const { clearAuthSessions } = require("./helpers/test-setup");

// ── Helpers ─────────────────────────────────────────────────────────────────

let app;
let server;
let port;

const UPLOADS_ROOT = path.resolve(__dirname, "..", "..", "public", "uploads");
const writtenPaths = [];

// Random garbage that won't match any magic bytes
const GARBAGE_BASE64 = "AAAAAA";

// A genuinely-decodable PNG, generated via sharp itself rather than a
// hand-copied byte literal — some minimal hand-written PNG fixtures pass a
// header-only metadata() read but fail libpng's stricter full pixel decode,
// which only matters once standardizeImage() actually re-encodes the file.
async function makeSmallPng() {
  return sharp({
    create: { width: 4, height: 4, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .png()
    .toBuffer();
}

function authCookie() {
  return `sid=${encodeURIComponent(requireAuth.createSession("test-user"))}`;
}

function createApp() {
  const app = express();
  app.use("/uploads", require("../routes/uploads"));
  return app;
}

function request(method, reqPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = typeof body === "string" ? body : JSON.stringify(body || {});
    const reqHeaders = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(bodyStr),
      cookie: authCookie(),
      ...headers,
    };

    const req = http.request(
      { hostname: "127.0.0.1", port, path: reqPath, method, headers: reqHeaders },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          if (parsed && parsed.image_path) {
            writtenPaths.push(path.join(UPLOADS_ROOT, parsed.image_path.replace(/^\/uploads\//, "")));
          }
          if (parsed && parsed.thumb_path) {
            writtenPaths.push(path.join(UPLOADS_ROOT, parsed.thumb_path.replace(/^\/uploads\//, "")));
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      },
    );

    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

async function makeOversizedJpeg() {
  return sharp({
    create: { width: 1600, height: 1200, channels: 3, background: { r: 200, g: 50, b: 50 } },
  })
    .jpeg()
    .toBuffer();
}

// ── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  clearAuthSessions();
});

before(async () => {
  app = createApp();
  const created = await createTestServer(app);
  server = created.server;
  port = created.port;
});

after(async () => {
  await closeTestServer(server);

  // Clean up every file this suite actually wrote, then prune any now-empty
  // year/month directories it created (best-effort — never touches
  // pre-existing content).
  const dirsToTry = new Set();
  for (const filePath of writtenPaths) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // already gone / never written (e.g. a failed request) — fine
    }
    dirsToTry.add(path.dirname(filePath));
  }
  for (const dir of dirsToTry) {
    try {
      fs.rmdirSync(dir);
      fs.rmdirSync(path.dirname(dir));
    } catch {
      // not empty (pre-existing files) or already removed — leave it
    }
  }
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("POST /uploads", () => {
  test("201: valid PNG returns image_path and dimensions", async () => {
    const png = await makeSmallPng();
    const { status, body } = await request("POST", "/uploads", {
      filename: "test.png",
      data: png.toString("base64"),
    });

    assert.equal(status, 201);
    assert.ok(body.image_path);
    assert.match(body.image_path, /^\/uploads\/\d{4}\/\d{2}\/[a-f0-9-]+\.png$/);
    assert.equal(body.width, 4);
    assert.equal(body.height, 4);

    const writtenPath = path.join(UPLOADS_ROOT, body.image_path.replace(/^\/uploads\//, ""));
    assert.ok(fs.existsSync(writtenPath));
  });

  test("201: valid JPEG returns image_path", async () => {
    const jpegMagic = Buffer.from([0xff, 0xd8, 0xff, 0xdb]).toString("base64");
    const { status, body } = await request("POST", "/uploads", {
      filename: "test.jpg",
      data: jpegMagic,
    });

    assert.equal(status, 201);
    assert.match(body.image_path, /\.jpg$/);
  });

  test("201: valid GIF returns image_path, standardisation skipped", async () => {
    const gifMagic = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]).toString("base64");
    const { status, body } = await request("POST", "/uploads", {
      filename: "test.gif",
      data: gifMagic,
    });

    assert.equal(status, 201);
    assert.match(body.image_path, /\.gif$/);
  });

  test("201: valid WEBP returns image_path", async () => {
    const riff = Buffer.from("RIFF");
    const size = Buffer.alloc(4, 0);
    const webp = Buffer.from("WEBP");
    const webpMagic = Buffer.concat([riff, size, webp]).toString("base64");
    const { status, body } = await request("POST", "/uploads", {
      filename: "test.webp",
      data: webpMagic,
    });

    assert.equal(status, 201);
    assert.match(body.image_path, /\.webp$/);
  });

  test("201: oversized JPEG is standardised to at most 1440x960 on disk", async () => {
    const oversized = await makeOversizedJpeg();
    const { status, body } = await request("POST", "/uploads", {
      filename: "big.jpg",
      data: oversized.toString("base64"),
    });

    assert.equal(status, 201);
    assert.equal(body.width, 1280);
    assert.equal(body.height, 960);
    assert.ok(body.width <= 1440 && body.height <= 960);

    const writtenPath = path.join(UPLOADS_ROOT, body.image_path.replace(/^\/uploads\//, ""));
    const onDisk = await sharp(fs.readFileSync(writtenPath)).metadata();
    assert.ok(onDisk.width <= 1440);
    assert.ok(onDisk.height <= 960);
  });

  test("400: garbage base64 that doesn't match any magic bytes", async () => {
    const { status, body } = await request("POST", "/uploads", {
      filename: "fake.jpg",
      data: GARBAGE_BASE64,
    });

    assert.equal(status, 400);
    assert.equal(body.error.code, "E-INPUT-009");
  });

  test("400: missing data field", async () => {
    const { status, body } = await request("POST", "/uploads", {
      filename: "test.png",
    });

    assert.equal(status, 400);
    assert.equal(body.error.code, "E-INPUT-001");
  });

  test("400: empty data string", async () => {
    const { status, body } = await request("POST", "/uploads", {
      filename: "test.png",
      data: "",
    });

    assert.equal(status, 400);
    assert.equal(body.error.code, "E-INPUT-001");
  });

  test("413: file exceeding the 5 MB limit", async () => {
    // Just over MAX_FILE_BYTES (5 MB) post-decode, but its base64 form stays
    // safely under the route's own 8 MB JSON body limit.
    const big = Buffer.alloc(5.05 * 1024 * 1024, 0xff);
    const { status, body } = await request("POST", "/uploads", {
      filename: "huge.jpg",
      data: big.toString("base64"),
    });

    assert.equal(status, 413);
    assert.equal(body.error.code, "E-INPUT-008");
  });

  test("401: no session cookie", async () => {
    const { status } = await request(
      "POST",
      "/uploads",
      { filename: "test.png", data: "AAAA" },
      { cookie: "" },
    );

    assert.equal(status, 401);
  });
});
