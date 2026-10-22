// Security headers middleware — sets defensive HTTP response headers on every
// request (including public routes). HSTS is conditional on production to avoid
// breaking localhost development over plain HTTP. Rules that span this file and
// others (the CSP below, shared with nginx) are in setup/ARCHITECTURE/security.md.

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Public GET/HEAD responses are cacheable by default; mutating methods are not.
  // Individual middleware (e.g. requireAuth) may override this per-route.
  if (req.method === "GET" || req.method === "HEAD") {
    res.setHeader("Cache-Control", "public, max-age=60");

    // A shared cache (Cloudflare) must not store an error for 60 seconds, or
    // one visitor's 429 or 500 would be served to every visitor. 404 stays
    // cacheable: bots that probe random slugs would otherwise reach Node each time.
    const writeHead = res.writeHead;
    res.writeHead = function (statusCode, ...args) {
      if (statusCode >= 400 && statusCode !== 404) {
        res.setHeader("Cache-Control", "no-store");
      }
      return writeHead.call(this, statusCode, ...args);
    };
  } else {
    res.setHeader("Cache-Control", "no-store");
  }

  // Content-Security-Policy — protects direct API/JSON consumers.
  // This string must equal the `$page_csp` map in deploy/nginx-http.conf, which
  // sends the policy for the HTML pages that this server never serves; a guide
  // test compares the two (setup/ARCHITECTURE/security.md, row 1).
  // 'unsafe-inline' stays in script-src and style-src because pages carry inline
  // <script> and <style> blocks and style attributes that a stricter policy
  // would block.
  // img-src 'self' data: means every image must be same-origin
  // (frontend/assets/images/ or public/uploads/) — this directive is what
  // blocks remote images, so one silently fails in production while appearing
  // to work in a permissive local setup.
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  );

  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains",
    );
  }

  next();
}

module.exports = securityHeaders;
