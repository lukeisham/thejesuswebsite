# Nginx Rate Limiting — Flood Protection for thejesuswebsite

The API-level rate limiters in `server.js` and `routes/search.js` stop casual hammering but still cost a Node request cycle per hit and reset on deploy.
The **nginx layer** is what actually absorbs a determined flood before it
reaches the app. These directives complement — not replace — the in-app limits.

## Shared rate-limit zone

Define this in the `http` block of your nginx config (typically
`/etc/nginx/nginx.conf`):

```nginx
# $binary_remote_addr uses 4 bytes per IP vs ~15 for $remote_addr
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=conn_per_ip:10m;
```

## Apply in the server block

Add these inside the `location /api/` block in your site's server config:

```nginx
location /api/ {
    # Rate limit: 10 requests/s with a burst of 20 (queued, no delay)
    limit_req zone=api burst=20 nodelay;

    # Connection limit: max 10 concurrent connections per IP
    limit_conn conn_per_ip 10;

    # Return 429 with a JSON body matching the app-level limiter
    limit_req_status 429;

    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Tuning notes

- **10 req/s with burst 20** means one client can briefly spike to 20
  concurrent requests before the queue drains at 10/s. This is generous enough
  for a normal page load (which fires a handful of API calls) but absorbs
  scripted scraping.
- **`nodelay`** rejects excess requests immediately instead of queueing them.
  Without it, slow clients can tie up connection slots for seconds.
- **`limit_req_status 429`** returns the same HTTP status the app-level limiter
  uses, so client-side error handling doesn't need to distinguish layers.
- **10 concurrent connections** prevents one IP from exhausting all worker
  connections; real visitors rarely need more than 5–6.
- The `10m` zone size supports roughly 160,000 unique IPs before the LRU
  eviction kicks in — more than enough for a single-VPS site.

## Why both nginx + app-level limits?

| Layer       | What it stops                          | Weakness                                    |
|-------------|----------------------------------------|---------------------------------------------|
| nginx       | Floods before they reach Node          | Can't differentiate /search from /about     |
| App (shared)| Per-endpoint budget, search tighter    | Still costs a Node cycle per hit            |
| App (search)| Protects the expensive FTS query       | Only after nginx + shared limit pass        |

All three are complementary. Tune the numbers to real traffic after launch.
