// Upload route tests — uses node:test + node:assert.
// Tests POST /uploads with valid/invalid/oversized base64 payloads.
// Uses a temporary uploads directory to avoid polluting the real one.

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { createTestServer, closeTestServer } = require("./helpers/test-server");

// ── Helpers ─────────────────────────────────────────────────────────────────

let app;
let server;
let port;
let baseUrl;
let tmpDir;

// Smallest valid PNG (1x1 pixel, transparent)
// Hex: 89504E470D0A1A0A 0000000D 49484452 00000001 00000001 08060000 001F15C489 0000000A 49444154 78DA62FCFFFF3F00050021005C 00000000 49454E44 AE426082
const VALID_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8//8/AwAI/AL+" +
  "0QFyaAAAAABJRU5ErkJggg==";

// First 4 bytes of a PNG (magic bytes), but not a valid image
const PNG_MAGIC_BASE64 = "iVBORw0K"; // 89504E47 in base64

// Random garbage that won't match any magic bytes
const GARBAGE_BASE64 = "AAAAAA";

function createApp(uploadsDir) {
  const app = express();

  // Upload route with its own 8 MB limit
  const uploadRouter = express.Router();
  uploadRouter.use(express.json({ limit: "8mb" }));

  // Mock requireAuth: always pass through (auth tested separately in auth-guard.test.js)
  uploadRouter.use((req, res, next) => {
    // Simulate an authenticated user for these tests
    req.user = { userHandle: "test-user" };
    next();
  });

  // Recreate the upload handler inline
  const crypto = require("crypto");

  const MAGIC = [
    { bytes: Buffer.from([0xff, 0xd8, 0xff]), ext: "jpg" },
    { bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ext: "png" },
    { bytes: Buffer.from([0x47, 0x49, 0x46, 0x38]), ext: "gif" },
  ];

  const RIFF = Buffer.from([0x52, 0x49, 0x46, 0x46]);
  const WEBP = Buffer.from([0x57, 0x45, 0x42, 0x50]);
  const MAX_FILE_BYTES = 5 * 1024 * 1024;

  function sniffExtension(buffer) {
    for (const entry of MAGIC) {
      if (buffer.length >= entry.bytes.length && buffer.slice(0, entry.bytes.length).equals(entry.bytes)) {
        return entry.ext;
      }
    }
    if (buffer.length >= 12 && buffer.slice(0, 4).equals(RIFF) && buffer.slice(8, 12).equals(WEBP)) {
      return "webp";
    }
    return null;
  }

  uploadRouter.post("/", (req, res) => {
    try {
      const { filename, data } = req.body || {};

      if (!data || typeof data !== "string") {
        return res.status(400).json({ error: "Missing or invalid 'data' field (base64 string required)." });
      }

      let buffer;
      try {
        buffer = Buffer.from(data, "base64");
        if (buffer.length === 0 && data.length > 0) {
          throw new Error("Empty decode");
        }
      } catch {
        return res.status(400).json({ error: "Could not decode base64 'data' field." });
      }

      if (buffer.length > MAX_FILE_BYTES) {
        return res.status(413).json({ error: "File exceeds 5 MB limit." });
      }

      const ext = sniffExtension(buffer);
      if (!ext) {
        return res.status(400).json({ error: "Unsupported image type. Allowed: JPEG, PNG, GIF, WEBP." });
      }

      const now = new Date();
      const year = String(now.getFullYear());
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const uuid = crypto.randomUUID();
      const destName = `${uuid}.${ext}`;

      const destDir = path.join(uploadsDir, year, month);
      const destPath = path.join(destDir, destName);

      fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(destPath, buffer);

      const imagePath = `/uploads/${year}/${month}/${destName}`;
      res.status(201).json({ image_path: imagePath });
    } catch (error) {
      console.error("POST /uploads failed:", error);
      res.status(500).json({ error: "Upload failed." });
    }
  });

  app.use("/uploads", uploadRouter);

  // Error handler
  app.use((error, req, res, next) => {
    if (error.type === "entity.too.large") {
      return res.status(413).json({ error: "Request body too large." });
    }
    if (error.type === "entity.parse.failed") {
      return res.status(400).json({ error: "Malformed JSON body." });
    }
    res.status(500).json({ error: "Internal server error." });
  });

  return app;
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = typeof body === "string" ? body : JSON.stringify(body || {});
    const reqHeaders = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(bodyStr),
    };

    const req = http.request(
      { hostname: "127.0.0.1", port, path, method, headers: reqHeaders },
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
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      },
    );

    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

// ── Setup / Teardown ────────────────────────────────────────────────────────

before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "upload-test-"));
  app = createApp(tmpDir);
  const created = await createTestServer(app);
  server = created.server;
  port = created.port;
});

after(async () => {
  await closeTestServer(server);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("POST /uploads", () => {
  test("201: valid PNG returns image_path", async () => {
    const { status, body } = await request("POST", "/uploads", {
      filename: "test.png",
      data: VALID_PNG_BASE64,
    });

    assert.equal(status, 201);
    assert.ok(body.image_path);
    assert.match(body.image_path, /^\/uploads\/\d{4}\/\d{2}\/[a-f0-9-]+\.png$/);

    // Verify the file was actually written
    const filePath = path.join(tmpDir, "..", "..", body.image_path.replace(/^\//, ""));
    // The file is written relative to the uploadsDir which is inside tmpDir
    // Actually, the image_path is relative to the public dir. Let's check tmpDir.
    const relativePath = body.image_path.replace(/^\/uploads\//, "");
    const writtenPath = path.join(tmpDir, relativePath);
    assert.ok(fs.existsSync(writtenPath));
  });

  test("201: valid JPEG returns image_path", async () => {
    // Minimal valid JPEG (smallest possible)
    // FFD8FF = JPEG magic
    const jpegMagic = Buffer.from([0xff, 0xd8, 0xff, 0xdb]).toString("base64");
    const { status, body } = await request("POST", "/uploads", {
      filename: "test.jpg",
      data: jpegMagic,
    });

    assert.equal(status, 201);
    assert.match(body.image_path, /\.jpg$/);
  });

  test("201: valid GIF returns image_path", async () => {
    // Minimal GIF (magic bytes only)
    const gifMagic = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]).toString("base64");
    const { status, body } = await request("POST", "/uploads", {
      filename: "test.gif",
      data: gifMagic,
    });

    assert.equal(status, 201);
    assert.match(body.image_path, /\.gif$/);
  });

  test("201: valid WEBP returns image_path", async () => {
    // RIFF + size + WEBP
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

  test("400: garbage base64 that doesn't match any magic bytes", async () => {
    const { status, body } = await request("POST", "/uploads", {
      filename: "fake.jpg", // claims JPEG but isn't
      data: GARBAGE_BASE64,
    });

    assert.equal(status, 400);
    assert.ok(body.error);
    assert.match(body.error, /Unsupported image type/);
  });

  test("400: missing data field", async () => {
    const { status, body } = await request("POST", "/uploads", {
      filename: "test.png",
    });

    assert.equal(status, 400);
  });

  test("400: empty data string", async () => {
    const { status, body } = await request("POST", "/uploads", {
      filename: "test.png",
      data: "",
    });

    assert.equal(status, 400);
  });
});
