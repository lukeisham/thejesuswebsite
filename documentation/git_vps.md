## Git Rules
- Never create branches. Always commit directly to `main`.
- Do not use `git checkout -b` or create worktrees.

# Push to GitHub

git add .
git commit -m "URL Slugs refactor"
git push origin main 

# Pulling from Github to server 

cd /var/www/thejesuswebsite

# Next actions

1. cooler / tighter dashboard setup
2. image upload
3. url tidyup 
4. add and modify record test
5. ESV expand feature 
6. bulk upload and picture upload test
7. Arbor and timeline test
8. Check that popular and Academic Challenges are seperated in practice and in documentatiopn 
9. Fill out donation portal
10. Function diagrams refinement 
11. Maps 
12. Ranking check
13. All discretionary text checked
14. Records filled out
15. Essays filled out
16. Promotion Bot (Social media)
17. SEO and Anyaltics 
18. Domain/Cloudflare 
19. Robot harvesting check
20. Documentation and Readme tidy up
21. Theology features

# Next project

---

## Clean Slug URL Architecture (v1.3.0)

The site uses a **two-layer URL rewriting system** (nginx → FastAPI) to serve clean, human-readable URLs instead of raw filesystem paths. This was implemented in `url_slug_restructure.md`.

### Layer 1 — Nginx Rewrites (primary)

All clean-slug mappings live in `nginx.conf` inside the `location /` block, **before** the `try_files` directive:

**Internal rewrites** (browser address bar stays clean):
```
rewrite ^/records$  /frontend/pages/records.html  last;
rewrite ^/record/(.+)$  /frontend/pages/record.html?slug=$1  last;
```

**301 redirects** (legacy paths → new slugs, 6-month backward compatibility):
```
rewrite ^/frontend/pages/records\.html$  /records  permanent;
rewrite ^/record\.html\?slug=(.+)$  /record/$1  permanent;
```

### Layer 2 — FastAPI Fallback

`serve_all.py` has explicit `@app.get("/records")` route handlers for every clean slug as a fallback when the static mount handles the request. The `/record/{slug}` path-parameter route passes the slug through so `single_view.js` reads `?slug=` from the query string.

### Deployment Steps

When updating `nginx.conf`, deploy via:

```bash
# 1. Push to GitHub (auto-deploys to VPS via GitHub Actions)
git add nginx.conf serve_all.py
git commit -m "Update nginx clean-slug rewrites"
git push origin main

# 2. On VPS — verify and reload
sudo nginx -t                  # test config syntax
sudo systemctl reload nginx    # apply without dropping connections

# 3. Verify clean slugs respond
curl -I https://www.thejesuswebsite.org/records
curl -I https://www.thejesuswebsite.org/record/jesus-baptism

# 4. Verify legacy redirects
curl -I https://www.thejesuswebsite.org/frontend/pages/records.html
# Expected: HTTP 301 → /records

curl -I "https://www.thejesuswebsite.org/record.html?slug=jesus-baptism"
# Expected: HTTP 301 → /record/jesus-baptism
```

### Key Design Decisions

1. **Path-based record slugs:** `/record/{slug}` instead of query params. Nginx named-capture rewrite maps `{slug}` → `?slug=` internally so `single_view.js` reads unchanged.
2. **`<base>` tag strategy:** Every HTML page has `<base href="/frontend/pages/">` so relative CSS/JS/font asset references resolve from their original directory even though the browser bar shows a different path.
3. **Two-layer fallback:** nginx rewrites handle the request first; if they don't match, the FastAPI Python routes serve as a fallback; finally the static file mount catches anything left.
4. **Six-month 301 redirect policy:** Old `/frontend/pages/...` paths and legacy query-param record URLs (`?slug=`, `?id=`) send 301 Moved Permanently to the new clean slugs. After six months these can be retired.

