// Security headers middleware — sets defensive HTTP response headers on every
// request (including public routes). HSTS is conditional on production to avoid
// breaking localhost development over plain HTTP.

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Public GET/HEAD responses are cacheable by default; mutating methods are not.
  // Individual middleware (e.g. requireAuth) may override this per-route.
  if (req.method === "GET" || req.method === "HEAD") {
    res.setHeader("Cache-Control", "public, max-age=60");
  } else {
    res.setHeader("Cache-Control", "no-store");
  }

  // Content-Security-Policy — protects direct API/JSON consumers.
  // 'unsafe-inline' for script-src and style-src is a deliberate allowance:
  // the site's page-boot <script> blocks and zoom-variant inline <style>
  // overrides across 40+ HTML files in frontend/ and admin/ require it;
  // tightening these would need a nonce-based migration that spans dozens
  // of files. The API server does not serve those HTML pages directly, so
  // this CSP only applies to direct API consumers — real page-level
  // protection requires a <meta> tag or reverse-proxy header on the HTML
  // documents themselves.
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
