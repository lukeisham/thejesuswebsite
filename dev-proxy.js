// Throwaway local dev proxy — serves admin/ as static files and forwards
// /api/* paths to the Express API server, stripping the /api prefix (exactly
// what deploy/nginx.conf does). This means the admin frontend uses the same
// /api/passkey/... URL shape locally as in production — no path-mismatch bugs
// can hide in local dev.
// Not for production use; don't wire this into deploy.sh.
const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.join(__dirname, "admin");
const API_TARGET = {
  host: "127.0.0.1",
  port: Number(process.env.API_PORT || 3000),
};
const PROXY_PORT = Number(process.env.PROXY_PORT || 4174);

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const server = http.createServer((req, res) => {
  // Mirror nginx: requests to /api/* are proxied to the Express server with
  // the /api prefix stripped, so Express sees its bare routes (/passkey/...,
  // /auth/..., etc.) just as in production (see deploy/nginx.conf).
  if (req.url.startsWith("/api/")) {
    const strippedPath = req.url.slice(4); // remove "/api" prefix (4 chars)
    const proxyReq = http.request(
      {
        ...API_TARGET,
        method: req.method,
        path: strippedPath,
        headers: req.headers,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );
    proxyReq.on("error", (err) => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Proxy could not reach API: " + err.message,
        }),
      );
    });
    req.pipe(proxyReq);
    return;
  }

  let filePath = path.join(
    STATIC_ROOT,
    decodeURIComponent(req.url.split("?")[0]),
  );
  if (filePath.endsWith("/")) filePath = path.join(filePath, "index.html");
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type":
        MIME[path.extname(filePath)] || "application/octet-stream",
    });
    res.end(data);
  });
});

server.listen(PROXY_PORT, () => {
  console.log(
    "Dev proxy on http://localhost:" +
      PROXY_PORT +
      " -> API on :" +
      API_TARGET.port,
  );
});
