# Deployment Guide — The Jesus Website

## Architecture

The site uses a **split serving model**:

```
Browser
  │
  ▼
nginx (port 443)
  │
  ├── /api/*     ──► Node/Express (port 3000) — JSON API + admin auth
  ├── /uploads/* ──► Static files (public/uploads/)
  ├── /assets/*  ──► Hashed assets (long cache)
  └── /*         ──► Static HTML (frontend/) via try_files
```

- **nginx** terminates TLS, serves static files directly, and proxies only
  `/api/` to the Node process. Rate/connection limiting absorbs floods before
  they reach Node.
- **The Node server** (`api/server.js`) mounts routes at their bare paths
  (`/evidence`, `/search`, etc.). nginx strips the `/api` prefix via the
  trailing slash in `proxy_pass http://127.0.0.1:3000/;`, so the server code
  and its test suite are unchanged.
- **The frontend** is static HTML/CSS/JS in `frontend/`. Detail pages at
  extensionless URLs (e.g. `/evidence/single/pilate-stone`) resolve via nginx
  `try_files`: it tries `$uri.html` first, then `$uri/index.html`, then 404.
  Generated detail pages from `template-page-generation.md` are placed as
  `{directory}/{slug}.html` to match this resolution.

## Local development

Because the frontend JS now calls `/api/*` (same-origin), and the API server
mounts routes at bare paths, you need a **reverse proxy** in local dev.
Two options:

### Option A: nginx locally (recommended, matches production)

1. Install nginx: `brew install nginx` (macOS) or `apt install nginx` (Linux).
2. Copy `deploy/nginx.conf` to your nginx sites directory, adjusting `root`
   and `proxy_pass` for your local paths.
3. Edit `/etc/hosts` to point `thejesuswebsite.local` at `127.0.0.1`.
4. Start the API: `cd api && node server.js` (listens on :3000).
5. Reload nginx: `sudo nginx -s reload`.
6. Open `https://thejesuswebsite.local` (accept the self-signed cert warning).

### Option B: Tiny Node proxy (lightweight, no nginx install)

1. Create a `dev-proxy.js` in the project root:

```js
const http = require("http");
const httpProxy = require("http-proxy");

const proxy = httpProxy.createProxyServer({});
const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    req.url = req.url.slice(4); // strip /api
    proxy.web(req, res, { target: "http://localhost:3000" });
  } else {
    proxy.web(req, res, { target: "http://localhost:8000" });
  }
});
server.listen(8080);
console.log("Dev proxy on http://localhost:8080");
```

2. `npm install http-proxy` (dev only, don't commit to api/package.json).
3. Start the API on :3000 and a static server (e.g. `npx serve frontend`) on :8000.
4. Open `http://localhost:8080`.

### Option C: Direct (breaks API calls, quick-and-dirty)

If you just need to view pages without API data:

```bash
cd frontend && npx serve .
```

API calls will fail (they target same-origin `/api/` which serve doesn't
proxy), but static HTML/CSS still renders.

## Production deploy

See `deploy.sh` at the project root. It:

1. Installs API dependencies (`npm install --production`).
2. Applies database schema and migrations.
3. Generates the sitemap (`npm run sitemap` in `api/`).
4. Starts/restarts the Node process via pm2/systemd.

### TLS certificates

Use Let's Encrypt with certbot:

```bash
sudo certbot certonly --webroot -w /home/deploy/thejesuswebsite/frontend \
  -d thejesuswebsite.org -d www.thejesuswebsite.org
```

Then update the cert paths in `deploy/nginx.conf` and reload nginx.

### First-time server setup

1. Clone the repo to `/home/deploy/thejesuswebsite`.
2. Copy `deploy/nginx.conf` to `/etc/nginx/sites-available/thejesuswebsite`
   and symlink to `sites-enabled`.
3. Include the http-context snippet from the nginx `http {}` block:
   ```nginx
   http {
       include /home/deploy/thejesuswebsite/deploy/nginx-http.conf;
       # ... rest of your http block
   }
   ```
   Or copy the directives (`limit_req_zone`, `limit_conn_zone`, `map`) directly
   into your main `nginx.conf` inside the `http {}` block.
4. Adjust `root` and `alias` paths in the nginx config to match the actual
   deploy directory.
5. Validate: `sudo nginx -t && sudo systemctl reload nginx`.
6. Run certbot to get TLS certs (see above).
7. **Populate `.env`** in the project root:
   ```
   NODE_ENV=production
   PORT=3000
   RP_ID=thejesuswebsite.org
   ORIGIN=https://www.thejesuswebsite.org
   SETUP_TOKEN=<generated-value>
   ```
   - `RP_ID` must match the production domain (the WebAuthn RP ID).
   - `ORIGIN` is the full `https://` origin for the WebAuthn origin check.
   - `SETUP_TOKEN` — generate with:
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - The app self-loads `.env` at boot (`api/config/load-env.js`), so no shell
     `export` is needed.
8. **Clear stale credentials** (first deploy only):
   ```bash
   node api/scripts/reset-credentials.js --confirm
   ```
   This removes any test credentials that shipped with the database so you can
   enrol a fresh passkey. The script refuses to run without `--confirm` as a
   safety guard. Back up the database file first:
   ```bash
   cp database/thejesuswebsite.db database/thejesuswebsite.db.bak
   ```
9. Run `./deploy.sh` to install deps, migrate the DB, and start the app.
10. Visit `/admin/` and enrol your first real passkey.

## URL routing reference

| Request | Resolves to |
|---|---|
| `/` | `frontend/index.html` |
| `/evidence/` | `frontend/evidence/index.html` |
| `/evidence/single/pilate-stone` | `frontend/evidence/single/pilate-stone.html` (generated) |
| `/news-and-blog/blog/easter-apologetics` | `frontend/news-and-blog/blog/easter-apologetics.html` (generated) |
| `/assets/css/base/variables.css` | `frontend/assets/css/base/variables.css` (long cache) |
| `/api/evidence` | Node → `/evidence` route |
| `/api/search?q=jesus` | Node → `/search` route |
| `/api/analytics` (POST) | Node → `/analytics` route |

## Rejected alternatives

### Enumerating bare API prefixes in nginx

Instead of the single `/api/` location, each API prefix could be its own
nginx `location` block (`location /evidence`, `location /essays`, etc.)
with `proxy_pass` and the static directory as fallback. This was rejected
because:

- It requires listing every content type in nginx, introducing a fragile
  dependency between the API route list and the nginx config.
- Page paths like `/evidence/` (the list page) and API paths like
  `/evidence` (the data endpoint) collide — distinguishing them requires
  ugly exact-match gymnastics.
- Adding a new content type silently 404s or shadows a static page until
  someone remembers to update nginx.

The single `/api` prefix is standard practice, survives content-type
additions without config changes, and costs a one-line `BASE` change in
the JS client (which was already centralised as JS-5 requires).
