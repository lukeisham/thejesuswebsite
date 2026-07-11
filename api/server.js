// API server entry point. Wires global middleware and mounts every route module.
// SQLite is synchronous and in-process (see config.js), so there is no async DB
// connection step here — requiring a model opens the database on first use.

// Load .env into process.env BEFORE any module that reads it at load time.
// config.js reads DB_PATH; routes/passkey.js reads RP_ID into a const — if
// require("./config/load-env") comes after those, it's a silent no-op.
require("./config/load-env")();

const express = require("express");
const path = require("path");
const rateLimit = require("./middleware/rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

// Trust the first proxy (e.g. Nginx) so req.ip returns the real client IP.
app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));
app.use(require("./middleware/security-headers"));

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

// --- Upload route (mounted before global body limit so it can use its own 8 MB limit) ---
app.use("/uploads", require("./routes/uploads"));

// --- Admin operations (already carry their own limiters or auth gates) ---
app.use("/drafts", require("./routes/drafts"));
app.use("/content", require("./routes/content"));
app.use("/publish", require("./routes/publish"));
app.use("/analytics", require("./routes/analytics"));
app.use("/auth", require("./routes/auth"));
app.use("/passkey", require("./routes/passkey"));

// Dev-only auth bypass: only mount the route when the flag is explicitly set.
// The module itself also gates every request, but not require()ing it at all
// means the code is never loaded into the running process on the VPS — even a
// bug in the gate logic cannot be reached because the route simply doesn't
// exist. (JS-4: explanatory comment so a future refactor doesn't remove this.)
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

// Centralised error handler — last line of defence for anything a route missed.
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  // Map body-parser errors to proper 4xx codes instead of generic 500.
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body too large." });
  }
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON body." });
  }
  console.error("Unhandled error:", error);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

module.exports = app;
