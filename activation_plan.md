# Activation Plan
**Goal:** Confirm the agent model is functioning, system data is being reported, and the first news crawl has taken place.
**Method:** You run commands or visit URLs and report back. I verify each step before we move to the next.

---

## Part 1 — Activate the Agent

**What it is:** The agent is an AI orchestration layer inside your app. It receives a message, classifies intent, routes it to the right engine (Wiki, Challenge, etc.), and returns a structured response with a confidence score. This confirms the core brain of the app is alive.

### Step 1 — Confirm the app is running
SSH into the VPS and run:
```bash
docker compose -f ~/apps/thejesuswebsite/docker-compose.yml ps
```
**Expected:** Three containers showing as `Up` — `nginx`, `agentic_hub`, and `chroma`.
**Report back:** Paste the output.

### Step 2 — Send a test message to the agent
```bash
curl -s -X POST https://thejesuswebsite.org/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the status of the dashboard?", "interaction_mode": "Monitor"}' | jq .
```
**Expected:** A JSON response containing a `response` field, a `confidence` score, and a `metadata` block showing intent classification (likely `StatusReport`).
**Report back:** Paste the full JSON response.

### Step 3 — Check the work queue
```bash
curl -s https://thejesuswebsite.org/api/v1/agent/queue | jq .
```
**Expected:** A JSON array (may be empty on first run — that's fine, it confirms the endpoint is alive).
**Report back:** Paste the response.

**Part 1 is confirmed when:** Step 2 returns a valid JSON response with a confidence score.

---

## Part 2 — Turn On System Data

**What it is:** System data is a unified feed of 10 monitoring categories — including server health metrics (CPU %, RAM, disk, uptime) alongside app-level data like draft counts, security logs, and the work queue. The key endpoint aggregates all 10 in one call.

### Step 1 — Pull the unified system feed
```bash
curl -s https://thejesuswebsite.org/api/v1/system/feed | jq .
```
**Expected:** A JSON payload with 10 categories populated. The `server_metrics` block should show real values for CPU usage, memory used/total, disk usage %, and uptime.
**Report back:** Paste the full response (or at minimum the `server_metrics` block).

### Step 2 — Verify server metrics specifically
```bash
curl -s https://thejesuswebsite.org/api/v1/metrics/server | jq .
```
**Expected:** Something like:
```json
{
  "cpu_usage_percent": 12.4,
  "memory_used_mb": 340,
  "memory_total_mb": 1024,
  "disk_usage_percent": 38.1,
  "uptime": "2 days, 4 hours"
}
```
**Report back:** Paste the response.

### Step 3 — Browser check
Visit in your browser: `https://thejesuswebsite.org/api/v1/system/feed`
**Expected:** Raw JSON visible in the browser confirming the feed is publicly accessible.
**Report back:** Confirm you can see the JSON, or paste any error you see.

**Part 2 is confirmed when:** The `server_metrics` block returns real non-zero values for CPU, RAM, and disk.

---

## Part 3 — Trigger the First News Crawl

**What it is:** The news engine fetches articles from 4 biblical archaeology / theological sources (Biblical Archaeology Review, Society of Biblical Literature, Bible and Interpretation, ASOR). It tries RSS first, falls back to DOM scraping, validates each item through a security gatekeeper, and stores up to 25 articles in SQLite.

### Step 1 — Trigger the crawl
```bash
curl -s -X POST https://thejesuswebsite.org/api/v1/news_run | jq .
```
**Expected:** A JSON response showing how many articles were harvested and persisted, e.g.:
```json
{
  "harvested": 18,
  "persisted": 18,
  "summary": "Crawl complete"
}
```
This may take 30–60 seconds to respond while it fetches from external sources.
**Report back:** Paste the full response.

### Step 2 — Confirm articles are stored
```bash
curl -s "https://thejesuswebsite.org/api/v1/blog/news?limit=5" | jq .
```
**Expected:** A JSON array of up to 5 news articles, each with a `title`, `source_url`, `snippet`, and `harvested_at` timestamp.
**Report back:** Paste the response.

### Step 3 — Check the homepage hero renders
Visit in your browser: `https://thejesuswebsite.org/api/v1/news_feed_content`
**Expected:** An HTML grid of article cards — each showing a title, snippet, source link, and date.
**Report back:** Confirm cards are visible, or paste any error.

### Step 4 — Trigger via the agent (bonus confirmation)
```bash
curl -s -X POST https://thejesuswebsite.org/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "run news", "interaction_mode": "Execution"}' | jq .
```
**Expected:** The agent recognises "run news" as a light action and returns a `run_news_crawler` action in its response — confirming the agent-to-news pipeline is wired up.
**Report back:** Paste the response.

**Part 3 is confirmed when:** Step 2 returns at least one article with a valid `harvested_at` timestamp.

---

## Summary Checklist

| Part | Confirmed By |
|------|-------------|
| ✅ Agent active | `/api/v1/agent/chat` returns JSON with confidence score |
| ✅ System data live | `/api/v1/metrics/server` returns non-zero CPU/RAM/disk values |
| ✅ News crawl complete | `/api/v1/blog/news` returns at least 1 article |

Work through each part in order and report back after each step — I'll interpret the output and tell you what to do next.
