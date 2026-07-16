// API server entry point. Wires global middleware and mounts every route module.
// SQLite is synchronous and in-process (see config.js), so there is no async DB
// connection step here — requiring a model opens the database on first use.

// Load .env into process.env BEFORE any module that reads it at load time.
// config.js reads DB_PATH; routes/passkey.js reads RP_ID into a const — if
// require("./config/load-env") comes after those, it's a silent no-op.
require("./config/load-env")();

const express = require("express");
const path = require("path");
const fs = require("fs");
const rateLimit = require("./middleware/rate-limit");
const ERRORS = require("./lib/error-codes");

const app = express();
const PORT = process.env.PORT || 3000;

// Trust the first proxy (e.g. Nginx) so req.ip returns the real client IP.
app.set("trust proxy", 1);

app.use(require("./middleware/security-headers"));

// Upload route mounted BEFORE the global body limit so it can apply its own
// 8 MB limit (base64 inflates payload size ~33%). If mounted after
// express.json({ limit: "1mb" }) below, the global parser would reject any
// upload over 1 MB before the route's own parser ever ran.
app.use("/uploads", require("./routes/uploads"));

app.use(express.json({ limit: "1mb" }));

// Shared per-IP rate limiter for all public read endpoints.
// 300 req/min is deliberately generous — a normal page visit fires only a
// handful of API calls. This stops casual hammering before it reaches SQLite.
// `/search` additionally carries its own tighter limit inside the route.
const publicReadLimit = rateLimit({ maxAttempts: 300, windowMs: 60_000 });

// --- Public + admin content routes ---
app.use("/evidence", publicReadLimit, require("./routes/evidence"));
app.use("/arbor", publicReadLimit, require("./routes/arbor"));
app.use("/identifiers", publicReadLimit, require("./routes/identifiers"));
app.use("/essays", publicReadLimit, require("./routes/essays"));
app.use(
  "/popular-challenges",
  publicReadLimit,
  require("./routes/popular-challenges"),
);
app.use(
  "/academic-challenges",
  publicReadLimit,
  require("./routes/academic-challenges"),
);
app.use("/historiography", publicReadLimit, require("./routes/historiography"));
app.use("/responses", publicReadLimit, require("./routes/responses"));
app.use("/wikipedia", publicReadLimit, require("./routes/wikipedia"));
app.use("/maps", publicReadLimit, require("./routes/maps"));
app.use("/blog-posts", publicReadLimit, require("./routes/blog-posts"));
app.use("/news-articles", publicReadLimit, require("./routes/news-articles"));
app.use("/collections", publicReadLimit, require("./routes/collections"));
app.use("/resources", publicReadLimit, require("./routes/resources"));
app.use("/timeline", publicReadLimit, require("./routes/timeline"));
app.use("/search", publicReadLimit, require("./routes/search"));
app.use("/sources", publicReadLimit, require("./routes/sources"));
app.use("/about", publicReadLimit, require("./routes/about"));
app.use("/esv", publicReadLimit, require("./routes/esv"));
app.use("/site-settings", publicReadLimit, require("./routes/site-settings"));

// --- Admin operations (already carry their own limiters or auth gates) ---
app.use("/drafts", require("./routes/drafts"));
app.use("/content", require("./routes/content"));
app.use("/publish", require("./routes/publish"));
app.use("/analytics", require("./routes/analytics"));
app.use("/auth", require("./routes/auth"));
app.use("/passkey", require("./routes/passkey"));
app.use("/api/spellcheck-dictionary", require("./routes/spellcheck-dictionary"));

// Dev-only auth bypass: only mount the route when the flag is explicitly set.
if (process.env.ADMIN_DEV_BYPASS === "1") {
  app.use("/auth", require("./routes/dev-bypass"));
}

// Static hosting for uploaded files (see project structure: public/uploads).
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "public", "uploads"), {
    maxAge: "7d",
  }),
);

// Apple passkey domain association — enables auto-fill on Safari / iOS.
app.get("/.well-known/apple-app-site-association", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.sendFile(
    path.join(
      __dirname,
      "..",
      "frontend",
      ".well-known",
      "apple-app-site-association",
    ),
  );
});

// Post-startup production validation — warns about stale SETUP_TOKEN when
// credentials already exist. Must run after models/routes are loaded because
// it depends on credentialModel.countAll(). (JS-2: fail loudly at startup.)
require("./config/load-env").validateProdEnv(
  require("./models/credential.model").countAll,
);

// Health check for the VPS / uptime monitor.
app.get("/health", (req, res) => res.json({ status: "ok" }));

// 404 for anything unmatched (JS-2: explicit, never a hanging request).
app.use((req, res) => res.status(404).json({ error: "Not found." }));

/**
 * Centralised error handler — last line of defence for anything a route missed.
 *
 * (JS-2: guards against headersSent so a double-error never crashes the process.
 * In production the stack trace is never leaked to the client — only the error
 * code, message, and HTTP status are returned.)
 *
 * Maps known Express / system errors to their canonical error codes from
 * lib/error-codes.js so logging and monitoring can rely on machine-readable
 * identifiers instead of parsing message strings.
 */
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, _next) => {
  // If headers are already flushed we can't send a structured error response.
  // Log and let the connection close naturally (JS-2: never crash on double-error).
  if (res.headersSent) {
    console.error(
      `[${ERRORS.HEADERS_ALREADY_SENT.code}]`,
      ERRORS.HEADERS_ALREADY_SENT.detail,
      error.stack || error.message,
    );
    return;
  }

  // Ensure every error response carries the correct Content-Type (JS-2).
  res.setHeader("Content-Type", "application/json");

  // Map known Express body-parser errors to their canonical codes.
  if (error.type === "entity.too.large") {
    return res.status(ERRORS.PAYLOAD_TOO_LARGE.httpStatus).json({
      code: ERRORS.PAYLOAD_TOO_LARGE.code,
      error: ERRORS.PAYLOAD_TOO_LARGE.message,
    });
  }

  if (error.type === "entity.parse.failed") {
    return res.status(ERRORS.INVALID_JSON.httpStatus).json({
      code: ERRORS.INVALID_JSON.code,
      error: ERRORS.INVALID_JSON.message,
    });
  }

  // Map known system / Node errors to their canonical codes.
  if (error.code === "EADDRINUSE") {
    console.error(
      `[${ERRORS.PORT_MISMATCH.code}]`,
      ERRORS.PORT_MISMATCH.detail,
      `Port ${PORT} is already in use.`,
    );
    // EADDRINUSE is fatal at startup — re-throw so the process exits.
    // (We still log with our code before re-throwing so it appears in logs.)
    throw error;
  }

  // Production: never leak stack traces. Only return the error code and
  // sanitised message. The full error is logged server-side.
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    console.error(
      `[${ERRORS.INFORMATION_LEAKAGE_SUPPRESSED.code}]`,
      ERRORS.INFORMATION_LEAKAGE_SUPPRESSED.detail,
    );
  }

  console.error("Unhandled error:", isProduction ? error.message : error);

  res.status(500).json({
    error: "Internal server error.",
    ...(isProduction
      ? {}
      : { detail: error.message, stack: error.stack?.split("\n") }),
  });
});

/**
 * Validate that the configured PORT matches the proxy_pass port in the nginx
 * configuration. Logs a warning on mismatch — the server still starts, but
 * the warning makes the misconfiguration visible in logs and at startup.
 *
 * Parses deploy/nginx.conf for `proxy_pass http://127.0.0.1:<port>` lines
 * and compares the extracted port against PORT. Only runs when NODE_ENV is
 * "production" because the proxy is only relevant behind nginx on the VPS.
 *
 * (JS-2: file-not-found is handled gracefully — the check is advisory, not
 * a hard gate, because nginx.conf may be absent during development or if the
 * deploy directory is not alongside the running process.)
 */
function validateProductionConfig() {
  if (process.env.NODE_ENV !== "production") return;

  const nginxConfPath = path.join(__dirname, "..", "deploy", "nginx.conf");

  let nginxContent;
  try {
    nginxContent = fs.readFileSync(nginxConfPath, "utf-8");
  } catch {
    console.warn(
      `[${ERRORS.STATIC_SERVING_MISCONFIGURED.code}]`,
      "Could not read nginx.conf for port validation — skipping.",
    );
    return;
  }

  // Extract the port from the proxy_pass directive for the /api/ location.
  // Matches: proxy_pass http://127.0.0.1:3000/;
  const proxyMatch = nginxContent.match(
    /location\s+\/api\/\s*\{[^}]*proxy_pass\s+http:\/\/127\.0\.0\.1:(\d+)/s,
  );

  if (!proxyMatch) {
    console.warn(
      `[${ERRORS.PORT_MISMATCH.code}]`,
      "Could not find proxy_pass port in nginx.conf for /api/ location.",
    );
    return;
  }

  const nginxPort = parseInt(proxyMatch[1], 10);
  const serverPort = parseInt(PORT, 10);

  if (nginxPort !== serverPort) {
    console.warn(
      `[${ERRORS.PORT_MISMATCH.code}]`,
      ERRORS.PORT_MISMATCH.detail,
      `nginx expects port ${nginxPort} but server is configured for port ${serverPort}.`,
    );
  }
}

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  validateProductionConfig();
});

module.exports = app;
