// Throwaway local dev proxy — serves admin/ as static files and forwards
// API-shaped paths to the Express API server. Mirrors what nginx does in
// production (see setup/DEPLOYMENT.md). Not for production use; don't wire
// this into deploy.sh.
const http = require("http");
const httpProxy = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.join(__dirname, "admin");
const API_TARGET = { host: "127.0.0.1", port: Number(process.env.API_PORT || 3199) };
const PROXY_PORT = Number(process.env.PROXY_PORT || 4174);

const API_PREFIXES = [
  "/passkey", "/drafts", "/publish", "/analytics", "/evidence", "/arbor",
  "/identifiers", "/essays", "/popular-challenges", "/academic-challenges",
  "/historiography", "/responses", "/wikipedia", "/maps", "/blog-posts",
  "/news-articles", "/collections", "/resources", "/timeline", "/search",
  "/sources", "/about", "/esv",
];

const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
};

const server = http.createServer((req, res) => {
  if (API_PREFIXES.some((p) => req.url === p || req.url.startsWith(p + "/") || req.url.startsWith(p + "?"))) {
    const proxyReq = http.request(
      { ...API_TARGET, method: req.method, path: req.url, headers: req.headers },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );
    proxyReq.on("error", (err) => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Proxy could not reach API: " + err.message }));
    });
    req.pipe(proxyReq);
    return;
  }

  let filePath = path.join(STATIC_ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (filePath.endsWith("/")) filePath = path.join(filePath, "index.html");
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PROXY_PORT, () => {
  console.log(`Dev proxy on http://localhost:${PROXY_PORT} -> API on :${API_TARGET.port}`);
});
